"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Download, Moon, Plus, Printer, RotateCcw, Save, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "../canevas-pdf-export";

type Row = { niveau: string; classes: number | ""; cycle: "Prescolaire" | "Primaire" | "Secondaire" | "Total"; observations: string; total?: boolean };

const initialRows: Row[] = [
  { niveau: "Prescolaire Section 1", classes: 2, cycle: "Prescolaire", observations: "" },
  { niveau: "Prescolaire Section 2", classes: 2, cycle: "Prescolaire", observations: "" },
  { niveau: "CI", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CP", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CE1", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CE2", classes: 3, cycle: "Primaire", observations: "" },
  { niveau: "CM1", classes: 2, cycle: "Primaire", observations: "" },
  { niveau: "CM2", classes: 2, cycle: "Primaire", observations: "" },
];

function numberValue(value: number | "") {
  return typeof value === "number" && value >= 0 ? value : 0;
}

const STORAGE_KEY = "edut_canevas_data_groupes_pedagogiques";

export default function GroupesPedagogiquesPage() {
  const [rows, setRows] = useState(initialRows);
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      toast.success("Données des groupes pédagogiques enregistrées avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser les données aux valeurs par défaut ?")) {
      setRows(initialRows);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Données réinitialisées aux valeurs initiales.");
    }
  };

  const totals = useMemo(() => {
    const prescolaire = rows.filter((r) => r.cycle === "Prescolaire").reduce((sum, r) => sum + numberValue(r.classes), 0);
    const primaire = rows.filter((r) => r.cycle === "Primaire").reduce((sum, r) => sum + numberValue(r.classes), 0);
    return { prescolaire, primaire, general: prescolaire + primaire };
  }, [rows]);

  const missing = rows.filter((r) => r.classes === "" || numberValue(r.classes) === 0);

  const updateRow = (index: number, key: keyof Row, value: any) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "classes") return { ...row, classes: value === "" ? "" : Math.max(0, Number(value)) };
      return { ...row, [key]: value };
    }));
  };

  const addRow = () => {
    const newRow: Row = {
      niveau: `Nouvelle classe ${rows.length + 1}`,
      classes: 1,
      cycle: "Primaire",
      observations: "",
    };
    setRows((current) => [...current, newRow]);
    toast.success("Nouvelle ligne ajoutée.");
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error("Vous devez conserver au moins une ligne.");
      return;
    }
    setRows((current) => current.filter((_, i) => i !== index));
    toast.info("Ligne supprimée.");
  };

  const displayRows: Row[] = [
    ...rows,
    { niveau: "Total prescolaire", classes: totals.prescolaire, cycle: "Total", observations: "Calcul automatique", total: true },
    { niveau: "Total primaire", classes: totals.primaire, cycle: "Total", observations: "Calcul automatique", total: true },
    { niveau: "Total general", classes: totals.general, cycle: "Total", observations: "Calcul automatique", total: true },
  ];

  const handleExportPdf = () => {
    exportCanevasTableToPdf({
      title: "Groupes Pédagogiques",
      subtitle: "Nombre de classes par niveau avec total automatique",
      schoolName: "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI",
      schoolCode: "ETB-2026-001",
      headers: ["Niveau", "Nombre de classes", "Cycle", "Observations"],
      rows: displayRows.map((r) => [r.niveau, r.classes === "" ? 0 : r.classes, r.cycle, r.observations || "-"]),
      summaryNotes: [
        { label: "Total Général", value: `${totals.general} classes` },
        { label: "Primaire", value: `${totals.primaire}` },
        { label: "Préscolaire", value: `${totals.prescolaire}` },
      ],
      filename: "groupes_pedagogiques",
    });
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-300 print:bg-white print:p-0",
      isDarkMode ? "bg-[#090D16] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-950"
    )}>
      {/* Top Header */}
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
              <span className="text-xl font-black">GP</span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Groupes Pedagogiques</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Nombre de classes par niveau avec total automatique</p>
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
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Total prescolaire", totals.prescolaire, isDarkMode ? "bg-violet-950/40 text-violet-300 border-violet-800/60" : "bg-violet-50 text-violet-700 border-violet-100"],
          ["Total primaire", totals.primaire, isDarkMode ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/60" : "bg-indigo-50 text-indigo-700 border-indigo-100"],
          ["Total general", totals.general, isDarkMode ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60" : "bg-emerald-50 text-emerald-700 border-emerald-100"],
        ].map(([label, value, style]) => (
          <div
            key={String(label)}
            className={cn(
              "rounded-[24px] border p-5 shadow-sm transition-all duration-300",
              isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-3xl font-black border", String(style))}>
              {value}
            </p>
          </div>
        ))}
      </section>

      {missing.length > 0 && (
        <div className={cn(
          "flex items-start gap-3 rounded-[24px] border p-5 transition-colors",
          isDarkMode ? "border-amber-900/60 bg-amber-950/30 text-amber-300" : "border-amber-100 bg-amber-50 text-amber-800"
        )}>
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black">Valeurs manquantes detectees</p>
            <p className="mt-1 text-xs font-bold">Veuillez renseigner le nombre de classes pour: {missing.map((r) => r.niveau).join(", ")}.</p>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <section className={cn(
        "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
        isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
      )}>
        <div className={cn("flex items-center justify-between border-b p-5", isDarkMode ? "border-slate-800" : "border-slate-100")}>
          <div>
            <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Grille des Groupes Pédagogiques</h2>
            <p className={cn("text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Modifiez les valeurs ou ajoutez de nouvelles lignes dynamiques</p>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition active:scale-95 print:hidden"
          >
            <Plus size={15} /> Ajouter une ligne
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className={cn(
              "text-[10px] font-black uppercase tracking-widest border-b",
              isDarkMode ? "bg-slate-900/70 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Niveau</th>
                <th className="px-5 py-4">Nombre de classes</th>
                <th className="px-5 py-4">Cycle</th>
                <th className="px-5 py-4">Observations</th>
                <th className="px-5 py-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
              {displayRows.map((row, index) => {
                const isRealRow = !row.total;
                return (
                  <tr
                    key={`${row.niveau}-${index}`}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      row.total
                        ? (isDarkMode ? "bg-slate-900/90 text-white font-black" : "bg-slate-50 text-slate-950 font-black")
                        : (isDarkMode ? "text-slate-200 hover:bg-slate-800/40" : "text-slate-700 hover:bg-slate-50")
                    )}
                  >
                    <td className="px-5 py-4">
                      {row.total ? (
                        <span className="font-black">{row.niveau}</span>
                      ) : (
                        <input
                          value={row.niveau}
                          onChange={(e) => updateRow(index, "niveau", e.target.value)}
                          className={cn(
                            "h-11 w-48 rounded-2xl border px-4 text-sm font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {row.total ? (
                        <span className="text-lg font-black text-indigo-500">{row.classes}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.classes}
                          onChange={(e) => updateRow(index, "classes", e.target.value)}
                          className={cn(
                            "h-11 w-32 rounded-2xl border px-4 text-sm font-black outline-none transition",
                            isDarkMode
                              ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                              : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {row.total ? (
                        <span>{row.cycle}</span>
                      ) : (
                        <select
                          value={row.cycle}
                          onChange={(e) => updateRow(index, "cycle", e.target.value)}
                          className={cn(
                            "h-11 w-36 rounded-2xl border px-3 text-xs font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        >
                          <option value="Prescolaire">Prescolaire</option>
                          <option value="Primaire">Primaire</option>
                          <option value="Secondaire">Secondaire</option>
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {row.total ? (
                        <span className="text-slate-400">{row.observations}</span>
                      ) : (
                        <input
                          value={row.observations}
                          onChange={(e) => updateRow(index, "observations", e.target.value)}
                          placeholder="Observation..."
                          className={cn(
                            "h-11 w-full rounded-2xl border px-4 text-sm font-bold outline-none transition",
                            isDarkMode
                              ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                              : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 text-center print:hidden">
                      {isRealRow && (
                        <button
                          onClick={() => deleteRow(index)}
                          title="Supprimer la ligne"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
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
