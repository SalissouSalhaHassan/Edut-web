"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Moon, Plus, Printer, RotateCcw, Save, Sun, Trash2, UserRoundCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "../canevas-pdf-export";

type Row = { category: string; niveau: string; hommes: number | ""; femmes: number | ""; statut: string; observations: string };

const tabs = ["Public titulaires", "Public contractuels", "Prive", "Autres personnels", "Synthese"];
const initialData: Record<string, Row[]> = {
  "Public titulaires": [
    { category: "Instituteurs titulaires", niveau: "CI - CP", hommes: 5, femmes: 4, statut: "Actif", observations: "" },
    { category: "Instituteurs titulaires", niveau: "CE1 - CE2", hommes: 4, femmes: 3, statut: "Actif", observations: "" },
    { category: "Instituteurs adjoints", niveau: "CM1 - CM2", hommes: 3, femmes: 2, statut: "Actif", observations: "" },
  ],
  "Public contractuels": [
    { category: "Contractuels", niveau: "Primaire", hommes: 2, femmes: 1, statut: "Contrat", observations: "" },
    { category: "Contractuels", niveau: "Prescolaire", hommes: 0, femmes: 2, statut: "Contrat", observations: "" },
  ],
  Prive: [
    { category: "Enseignants prives", niveau: "Primaire", hommes: 7, femmes: 5, statut: "Actif", observations: "" },
    { category: "Enseignants prives", niveau: "Prescolaire", hommes: 1, femmes: 3, statut: "Actif", observations: "" },
  ],
  "Autres personnels": [
    { category: "Directeur", niveau: "Administration", hommes: 1, femmes: 0, statut: "Actif", observations: "" },
    { category: "Personnel administratif", niveau: "Administration", hommes: 2, femmes: 2, statut: "Actif", observations: "" },
  ],
  Synthese: [],
};

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);
const STORAGE_KEY = "edut_canevas_data_personnel_enseignant";

export default function PersonnelEnseignantPage() {
  const [activeTab, setActiveTab] = useState("Public titulaires");
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
      toast.success("Personnel enseignant enregistré avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser les données aux valeurs d'origine ?")) {
      setRowsByTab(initialData);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Données réinitialisées.");
    }
  };

  const allRows = Object.entries(rowsByTab).filter(([key]) => key !== "Synthese").flatMap(([, rows]) => rows);
  const totals = useMemo(() => {
    const hommes = allRows.reduce((sum, row) => sum + n(row.hommes), 0);
    const femmes = allRows.reduce((sum, row) => sum + n(row.femmes), 0);
    const total = hommes + femmes;
    return { hommes, femmes, total, ratio: total ? Math.round(642 / total) : 0, besoin: Math.max(0, Math.ceil(642 / 35) - total) };
  }, [allRows]);
  const visibleRows = activeTab === "Synthese" ? allRows : (rowsByTab[activeTab] || []);

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRowsByTab((current) => ({
      ...current,
      [activeTab]: current[activeTab].map((row, i) => {
        if (i !== index) return row;
        if (key === "hommes" || key === "femmes") return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
        return { ...row, [key]: value };
      }),
    }));
  };

  const addRow = () => {
    if (activeTab === "Synthese") {
      toast.info("Veuillez sélectionner un statut (Public, Privé ou Autres) pour ajouter un enseignant.");
      return;
    }
    const newRow: Row = {
      category: "Nouvel enseignant",
      niveau: "Primaire",
      hommes: 1,
      femmes: 0,
      statut: "Actif",
      observations: "",
    };
    setRowsByTab((current) => ({
      ...current,
      [activeTab]: [...(current[activeTab] || []), newRow],
    }));
    toast.success("Nouvel enseignant ajouté dans " + activeTab);
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
      title: "Personnel Enseignant et Administratif",
      subtitle: `Gestion des enseignants par statut, niveau et genre (${activeTab})`,
      schoolName: "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI",
      schoolCode: "ETB-2026-001",
      headers: ["Catégorie", "Niveau", "Hommes", "Femmes", "Total", "Statut", "Observations"],
      rows: [
        ...visibleRows.map((r) => [r.category, r.niveau, n(r.hommes), n(r.femmes), n(r.hommes) + n(r.femmes), r.statut, r.observations || "-"]),
        ["TOTAL RÉCAPITULATIF", "-", totals.hommes, totals.femmes, totals.total, "Global", "Calcul automatique"],
      ],
      summaryNotes: [
        { label: "Total Enseignants", value: totals.total },
        { label: "Femmes", value: totals.femmes },
        { label: "Hommes", value: totals.hommes },
        { label: "Ratio Élèves/Enseignant", value: `1/${totals.ratio}` },
        { label: "Besoin Estimé", value: `${totals.besoin}` },
      ],
      filename: "personnel_enseignant",
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
              <UserRoundCheck size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Personnel Enseignant</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Gestion des enseignants par statut, niveau et genre</p>
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

      {/* Main Grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {/* Tabs bar */}
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
                <Plus size={15} /> Ajouter un enseignant
              </button>
            )}
          </div>

          {/* Table Container */}
          <section className={cn(
            "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
            isDarkMode ? "border-slate-800 bg-[#111827]/90 shadow-xl shadow-black/20" : "border-slate-100 bg-white"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isDarkMode ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-400"
                )}>
                  <tr>
                    <th className="px-5 py-4">Categorie personnel</th>
                    <th className="px-5 py-4">Niveau</th>
                    <th className="px-5 py-4">Hommes</th>
                    <th className="px-5 py-4">Femmes</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Observations</th>
                    {activeTab !== "Synthese" && <th className="px-5 py-4 text-center print:hidden">Action</th>}
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800 text-slate-200" : "divide-slate-100 text-slate-700")}>
                  {visibleRows.map((row, index) => (
                    <tr key={`${row.category}-${index}`} className="text-sm font-bold">
                      <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>
                        {activeTab === "Synthese" ? (
                          row.category
                        ) : (
                          <input
                            value={row.category}
                            onChange={(e) => updateRow(index, "category", e.target.value)}
                            className={cn(
                              "h-11 w-52 rounded-2xl border px-4 font-bold outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {activeTab === "Synthese" ? row.niveau : (
                          <input
                            value={row.niveau}
                            onChange={(e) => updateRow(index, "niveau", e.target.value)}
                            className={cn(
                              "h-11 w-36 rounded-2xl border px-4 font-bold outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {activeTab === "Synthese" ? n(row.hommes) : (
                          <input
                            type="number"
                            min={0}
                            value={row.hommes}
                            onChange={(e) => updateRow(index, "hommes", e.target.value)}
                            className={cn(
                              "h-11 w-24 rounded-2xl border px-4 font-black outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {activeTab === "Synthese" ? n(row.femmes) : (
                          <input
                            type="number"
                            min={0}
                            value={row.femmes}
                            onChange={(e) => updateRow(index, "femmes", e.target.value)}
                            className={cn(
                              "h-11 w-24 rounded-2xl border px-4 font-black outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        )}
                      </td>
                      <td className="px-5 py-4 font-black text-indigo-500">{n(row.hommes) + n(row.femmes)}</td>
                      <td className="px-5 py-4">
                        {activeTab === "Synthese" ? row.statut : (
                          <input
                            value={row.statut}
                            onChange={(e) => updateRow(index, "statut", e.target.value)}
                            className={cn(
                              "h-11 w-28 rounded-2xl border px-4 font-bold outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {activeTab === "Synthese" ? row.observations || "-" : (
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
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar KPI Stats */}
        <aside className="space-y-4">
          {[
            ["Total enseignants", totals.total, isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40" : "bg-indigo-50 text-indigo-700"],
            ["Femmes", totals.femmes, isDarkMode ? "bg-pink-950/60 text-pink-400 border border-pink-800/40" : "bg-pink-50 text-pink-700"],
            ["Hommes", totals.hommes, isDarkMode ? "bg-blue-950/60 text-blue-400 border border-blue-800/40" : "bg-blue-50 text-blue-700"],
            ["Ratio eleves/enseignant", `1/${totals.ratio}`, isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700"],
            ["Besoin enseignants", totals.besoin, isDarkMode ? "bg-amber-950/60 text-amber-400 border border-amber-800/40" : "bg-amber-50 text-amber-700"],
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

          <div className={cn(
            "rounded-[24px] border p-5 transition-colors duration-300",
            isDarkMode ? "border-indigo-900/40 bg-indigo-950/40 text-indigo-200" : "border-indigo-100 bg-indigo-50 text-indigo-900"
          )}>
            <Users size={20} className="text-indigo-400" />
            <p className="mt-3 text-sm font-black">Synthese automatique</p>
            <p className={cn("mt-2 text-xs font-bold leading-5", isDarkMode ? "text-indigo-300/80" : "text-indigo-800/80")}>
              Les totaux sont recalculés automatiquement à partir des onglets public, privé et autres personnels.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
