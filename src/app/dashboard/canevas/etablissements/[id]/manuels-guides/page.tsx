"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Download, Moon, Plus, Printer, RotateCcw, Save, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "../canevas-pdf-export";

type Row = { niveau: string; matiere: string; type: string; available: number | ""; students: number | ""; observations: string };

const tabs = ["Manuels eleves", "Guides maitres", "Synthese"];
const subjects = ["Lecture arabe", "Lecture francais", "Maths", "Etude du milieu arabe", "Etude du milieu francais", "Sciences", "Histoire-Geo"];
const initialData: Record<string, Row[]> = {
  "Manuels eleves": [
    { niveau: "CI", matiere: "Lecture francais", type: "Manuel eleve", available: 82, students: 104, observations: "" },
    { niveau: "CP", matiere: "Maths", type: "Manuel eleve", available: 91, students: 118, observations: "" },
    { niveau: "CE1", matiere: "Lecture arabe", type: "Manuel eleve", available: 78, students: 111, observations: "" },
    { niveau: "CE2", matiere: "Etude du milieu francais", type: "Manuel eleve", available: 88, students: 105, observations: "" },
    { niveau: "CM1", matiere: "Etude du milieu arabe", type: "Manuel eleve", available: 70, students: 98, observations: "" },
  ],
  "Guides maitres": [
    { niveau: "CI", matiere: "Lecture francais", type: "Guide maitre", available: 4, students: 3, observations: "" },
    { niveau: "CP", matiere: "Maths", type: "Guide maitre", available: 3, students: 3, observations: "" },
    { niveau: "CE1", matiere: "Lecture arabe", type: "Guide maitre", available: 2, students: 3, observations: "" },
    { niveau: "CE2", matiere: "Etude du milieu francais", type: "Guide maitre", available: 3, students: 3, observations: "" },
  ],
  Synthese: [],
};

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);
const STORAGE_KEY = "edut_canevas_data_manuels_guides";

export default function ManuelsGuidesPage() {
  const [activeTab, setActiveTab] = useState("Manuels eleves");
  const [rowsByTab, setRowsByTab] = useState(initialData);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_theme") || localStorage.getItem("edut_canevas_dark_mode");
      if (savedTheme === "dark" || savedTheme === "true" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDarkMode(true);
      }
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && typeof parsed === "object") {
          setRowsByTab(parsed);
        }
      }
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("edut_canevas_dark_mode", String(next));
        localStorage.setItem("edut_theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rowsByTab));
      toast.success("Manuels et guides enregistrés avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser les manuels aux valeurs initiales ?")) {
      setRowsByTab(initialData);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Données réinitialisées.");
    }
  };

  const allRows = Object.entries(rowsByTab).filter(([key]) => key !== "Synthese").flatMap(([, rows]) => rows);
  const rows = activeTab === "Synthese" ? allRows : (rowsByTab[activeTab] || []);
  const totals = useMemo(() => {
    const available = allRows.reduce((sum, row) => sum + n(row.available), 0);
    const expected = allRows.reduce((sum, row) => sum + n(row.students), 0);
    return { available, expected, need: Math.max(0, expected - available), ratio: expected ? available / expected : 0 };
  }, [allRows]);

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRowsByTab((current) => ({
      ...current,
      [activeTab]: current[activeTab].map((row, i) => {
        if (i !== index) return row;
        if (key === "available" || key === "students") return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
        return { ...row, [key]: value };
      }),
    }));
  };

  const addRow = () => {
    if (activeTab === "Synthese") {
      toast.info("Sélectionnez l'onglet Manuels élèves ou Guides maîtres pour ajouter.");
      return;
    }
    const newRow: Row = {
      niveau: "CI",
      matiere: subjects[0],
      type: activeTab === "Manuels eleves" ? "Manuel eleve" : "Guide maitre",
      available: 10,
      students: 50,
      observations: "",
    };
    setRowsByTab((current) => ({
      ...current,
      [activeTab]: [...(current[activeTab] || []), newRow],
    }));
    toast.success("Nouveau document ajouté à " + activeTab);
  };

  const deleteRow = (index: number) => {
    if (activeTab === "Synthese") return;
    setRowsByTab((current) => ({
      ...current,
      [activeTab]: (current[activeTab] || []).filter((_, i) => i !== index),
    }));
    toast.info("Ligne supprimée.");
  };

  const handleExportPdf = () => {
    exportCanevasTableToPdf({
      title: "Gestion des Manuels Scolaires et Guides Maîtres",
      subtitle: `Disponibilité pédagogique, ratios et besoins recensés (${activeTab})`,
      schoolName: "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI",
      schoolCode: "ETB-2026-001",
      headers: ["Niveau", "Matière", "Type", "Disponible", "Effectif Réf.", "Ratio livre/élève", "Besoin", "Observations"],
      rows: rows.map((r) => {
        const ratio = n(r.students) ? (n(r.available) / n(r.students)).toFixed(2) : "0.00";
        const need = Math.max(0, n(r.students) - n(r.available));
        return [r.niveau, r.matiere, r.type, n(r.available), n(r.students), ratio, need, r.observations || "-"];
      }),
      summaryNotes: [
        { label: "Total Livres", value: totals.available },
        { label: "Besoins Estimés", value: totals.need },
        { label: "Ratio Moyen", value: totals.ratio.toFixed(2) },
      ],
      filename: "manuels_et_guides",
      orientation: "landscape",
    });
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-300 print:bg-white print:p-0",
      isDarkMode ? "bg-[#090D16] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-950"
    )}>
      {/* Header */}
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm print:border-b print:shadow-none transition-colors duration-300",
        isDarkMode ? "bg-[#111827]/95 border-slate-800 text-white shadow-xl shadow-black/40" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/canevas/etablissements/ETB-2026-001"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition print:hidden",
                isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <BookOpen size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Manuels & Guides</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Suivi des livres scolaires et guides maitres</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={toggleDarkMode}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all shadow-xs active:scale-95",
                isDarkMode
                  ? "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
              <span className="hidden sm:inline font-bold">{isDarkMode ? "Clair" : "Sombre"}</span>
            </button>

            <button
              onClick={handleSave}
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/30 transition active:scale-95"
            >
              <Save size={16} /> Enregistrer
            </button>

            <button
              onClick={handleExportPdf}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition shadow-xs",
                isDarkMode ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              )}
            >
              <Download size={16} /> Exporter PDF
            </button>

            <button
              onClick={() => window.print()}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Printer size={16} /> Imprimer
            </button>

            <button
              onClick={handleReset}
              title="Réinitialiser"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border transition",
                isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
              )}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Documents disponibles", totals.available, isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40" : "bg-indigo-50 text-indigo-700"],
          ["Besoin reference", totals.expected, isDarkMode ? "bg-blue-950/60 text-blue-400 border border-blue-800/40" : "bg-blue-50 text-blue-700"],
          ["Besoin estime", totals.need, isDarkMode ? "bg-amber-950/60 text-amber-400 border border-amber-800/40" : "bg-amber-50 text-amber-700"],
          ["Ratio livre/eleve", totals.ratio.toFixed(2), isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700"],
        ].map(([label, value, style]) => (
          <div
            key={String(label)}
            className={cn(
              "rounded-[24px] border p-5 shadow-sm transition-colors duration-300",
              isDarkMode ? "border-slate-800 bg-[#111827]/90 text-white shadow-xl shadow-black/20" : "border-slate-100 bg-white text-slate-950"
            )}
          >
            <p className={cn("text-[10px] font-black uppercase tracking-widest", isDarkMode ? "text-slate-400" : "text-slate-400")}>{label}</p>
            <p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black", String(style))}>{value}</p>
          </div>
        ))}
      </section>

      {/* Tabs */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-[24px] border p-3 shadow-sm print:hidden transition-colors duration-300",
        isDarkMode ? "bg-[#111827]/90 border-slate-800" : "border-slate-100 bg-white"
      )}>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition",
                activeTab === tab
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : isDarkMode
                    ? "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab !== "Synthese" && (
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2.5 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition active:scale-95"
          >
            <Plus size={15} /> Ajouter un document
          </button>
        )}
      </div>

      {/* Main Table */}
      <section className={cn(
        "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
        isDarkMode ? "border-slate-800 bg-[#111827]/90 shadow-xl shadow-black/20" : "border-slate-100 bg-white"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isDarkMode ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Niveau</th>
                <th className="px-5 py-4">Matiere</th>
                <th className="px-5 py-4">Type document</th>
                <th className="px-5 py-4">Quantite disponible</th>
                <th className="px-5 py-4">Effectif eleves</th>
                <th className="px-5 py-4">Ratio livre/eleve</th>
                <th className="px-5 py-4">Besoin estime</th>
                <th className="px-5 py-4">Observations</th>
                {activeTab !== "Synthese" && <th className="px-5 py-4 text-center print:hidden">Action</th>}
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800 text-slate-200" : "divide-slate-100 text-slate-700")}>
              {rows.map((row, index) => {
                const ratio = n(row.students) ? n(row.available) / n(row.students) : 0;
                const need = Math.max(0, n(row.students) - n(row.available));
                const readOnly = activeTab === "Synthese";

                return (
                  <tr key={`${row.niveau}-${row.matiere}-${index}`} className="text-sm font-bold">
                    <td className="px-5 py-4">
                      {readOnly ? (
                        <span className={cn(isDarkMode ? "text-white" : "text-slate-950")}>{row.niveau}</span>
                      ) : (
                        <input
                          value={row.niveau}
                          onChange={(e) => updateRow(index, "niveau", e.target.value)}
                          className={cn(
                            "h-11 w-28 rounded-2xl border px-4 font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {readOnly ? (
                        row.matiere
                      ) : (
                        <select
                          value={row.matiere}
                          onChange={(e) => updateRow(index, "matiere", e.target.value)}
                          className={cn(
                            "h-11 w-52 rounded-2xl border px-4 font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        >
                          {subjects.map((s) => (
                            <option key={s} className={isDarkMode ? "bg-slate-900 text-white" : ""}>{s}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>{row.type}</td>
                    <td className="px-5 py-4">
                      {readOnly ? (
                        n(row.available)
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.available}
                          onChange={(e) => updateRow(index, "available", e.target.value)}
                          className={cn(
                            "h-11 w-24 rounded-2xl border px-4 font-black outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {readOnly ? (
                        n(row.students)
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.students}
                          onChange={(e) => updateRow(index, "students", e.target.value)}
                          className={cn(
                            "h-11 w-24 rounded-2xl border px-4 font-black outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-emerald-500">{ratio.toFixed(2)}</td>
                    <td className="px-5 py-4 font-black text-amber-500">{need}</td>
                    <td className="px-5 py-4">
                      {readOnly ? (
                        <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{row.observations || "-"}</span>
                      ) : (
                        <input
                          value={row.observations}
                          onChange={(e) => updateRow(index, "observations", e.target.value)}
                          placeholder="Observation..."
                          className={cn(
                            "h-11 w-full rounded-2xl border px-4 font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    {activeTab !== "Synthese" && (
                      <td className="px-5 py-4 text-center print:hidden">
                        <button
                          onClick={() => deleteRow(index)}
                          title="Supprimer la ligne"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
