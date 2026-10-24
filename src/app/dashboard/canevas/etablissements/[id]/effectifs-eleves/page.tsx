"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Download, GraduationCap, Moon, Plus, Printer, RotateCcw, Save, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "../canevas-pdf-export";

type Row = { niveau: string; total: number | ""; filles: number | ""; observations: string; cycle: "Prescolaire" | "Primaire" | "Total"; totalRow?: boolean };

const initialRows: Row[] = [
  { niveau: "Section 1", total: 52, filles: 25, observations: "", cycle: "Prescolaire" },
  { niveau: "Section 2", total: 58, filles: 28, observations: "", cycle: "Prescolaire" },
  { niveau: "CI", total: 104, filles: 50, observations: "", cycle: "Primaire" },
  { niveau: "CP", total: 118, filles: 58, observations: "", cycle: "Primaire" },
  { niveau: "CE1", total: 111, filles: 55, observations: "", cycle: "Primaire" },
  { niveau: "CE2", total: 105, filles: 52, observations: "", cycle: "Primaire" },
  { niveau: "CM1", total: 98, filles: 49, observations: "", cycle: "Primaire" },
  { niveau: "CM2", total: 106, filles: 54, observations: "", cycle: "Primaire" },
];

function n(value: number | "") {
  return typeof value === "number" && value >= 0 ? value : 0;
}

function sumRows(rows: Row[], cycle: "Prescolaire" | "Primaire") {
  const selected = rows.filter((r) => r.cycle === cycle);
  return {
    total: selected.reduce((s, r) => s + n(r.total), 0),
    filles: selected.reduce((s, r) => s + n(r.filles), 0),
  };
}

const STORAGE_KEY = "edut_canevas_data_effectifs_eleves";

export default function EffectifsElevesPage() {
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
      toast.success("Effectifs des élèves enregistrés avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser les données aux effectifs initiaux ?")) {
      setRows(initialRows);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Données réinitialisées.");
    }
  };

  const totals = useMemo(() => {
    const prescolaire = sumRows(rows, "Prescolaire");
    const primaire = sumRows(rows, "Primaire");
    return {
      prescolaire,
      primaire,
      general: { total: prescolaire.total + primaire.total, filles: prescolaire.filles + primaire.filles },
    };
  }, [rows]);

  const invalid = rows.filter((r) => n(r.filles) > n(r.total) || r.total === "" || r.filles === "");

  const updateRow = (index: number, key: "niveau" | "total" | "filles" | "observations", value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "niveau") return { ...row, niveau: value };
      if (key === "observations") return { ...row, observations: value };
      return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
    }));
  };

  const addRow = () => {
    const newRow: Row = {
      niveau: `Classe ${rows.length + 1}`,
      total: 50,
      filles: 25,
      observations: "",
      cycle: "Primaire",
    };
    setRows((current) => [...current, newRow]);
    toast.success("Nouveau niveau / classe ajouté.");
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error("Vous devez conserver au moins une classe.");
      return;
    }
    setRows((current) => current.filter((_, i) => i !== index));
    toast.info("Ligne supprimée.");
  };

  const displayRows: Row[] = [
    ...rows,
    { niveau: "Total prescolaire", total: totals.prescolaire.total, filles: totals.prescolaire.filles, observations: "Calcul automatique", cycle: "Total", totalRow: true },
    { niveau: "Total primaire", total: totals.primaire.total, filles: totals.primaire.filles, observations: "Calcul automatique", cycle: "Total", totalRow: true },
    { niveau: "Total general", total: totals.general.total, filles: totals.general.filles, observations: "Calcul automatique", cycle: "Total", totalRow: true },
  ];

  const handleExportPdf = () => {
    exportCanevasTableToPdf({
      title: "Effectifs des Élèves par Niveau et Genre",
      subtitle: "Répartition par niveau scolaire, nombre de filles et garçons avec contrôles",
      schoolName: "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI",
      schoolCode: "ETB-2026-001",
      headers: ["Niveau", "Total Élèves", "Filles", "Garçons", "% Filles", "Observations"],
      rows: displayRows.map((r) => {
        const garcons = Math.max(0, n(r.total) - n(r.filles));
        const pct = n(r.total) ? `${Math.round((n(r.filles) / n(r.total)) * 100)}%` : "0%";
        return [r.niveau, r.total === "" ? 0 : r.total, r.filles === "" ? 0 : r.filles, garcons, pct, r.observations || "-"];
      }),
      summaryNotes: [
        { label: "Total Général", value: totals.general.total },
        { label: "Filles", value: totals.general.filles },
        { label: "Garçons", value: totals.general.total - totals.general.filles },
        { label: "Parité Filles", value: `${totals.general.total ? Math.round((totals.general.filles / totals.general.total) * 100) : 0}%` },
      ],
      filename: "effectifs_eleves",
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
              <GraduationCap size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Effectifs Eleves</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Effectifs par niveau, sexe et controles automatiques</p>
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
          ["Total eleves", totals.general.total, isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40" : "bg-indigo-50 text-indigo-700"],
          ["Filles", totals.general.filles, isDarkMode ? "bg-pink-950/60 text-pink-400 border border-pink-800/40" : "bg-pink-50 text-pink-700"],
          ["Garcons", totals.general.total - totals.general.filles, isDarkMode ? "bg-blue-950/60 text-blue-400 border border-blue-800/40" : "bg-blue-50 text-blue-700"],
          ["% Filles", `${totals.general.total ? Math.round((totals.general.filles / totals.general.total) * 100) : 0}%`, isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700"],
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

      {invalid.length > 0 && (
        <div className={cn(
          "flex items-start gap-3 rounded-[24px] border p-5 transition-colors duration-300",
          isDarkMode ? "border-rose-900/40 bg-rose-950/40 text-rose-300" : "border-rose-100 bg-rose-50 text-rose-800"
        )}>
          <AlertTriangle size={20} className="mt-0.5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-black">Validation requise</p>
            <p className="mt-1 text-xs font-bold">Les filles ne doivent pas depasser le total, et les valeurs ne peuvent pas etre vides ou negatives.</p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <section className={cn(
        "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
        isDarkMode ? "border-slate-800 bg-[#111827]/90 shadow-xl shadow-black/20" : "border-slate-100 bg-white"
      )}>
        <div className={cn("flex items-center justify-between border-b p-5", isDarkMode ? "border-slate-800" : "border-slate-100")}>
          <div>
            <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Tableau Détaillé des Effectifs</h2>
            <p className={cn("text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Saisissez ou modifiez les effectifs par niveau</p>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition active:scale-95 print:hidden"
          >
            <Plus size={15} /> Ajouter une ligne
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isDarkMode ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Niveau</th>
                <th className="px-5 py-4">Total eleves</th>
                <th className="px-5 py-4">Filles</th>
                <th className="px-5 py-4">Garcons automatique</th>
                <th className="px-5 py-4">% Filles</th>
                <th className="px-5 py-4">Observations</th>
                <th className="px-5 py-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
              {displayRows.map((row, index) => {
                const isRealRow = !row.totalRow;
                const garcons = Math.max(0, n(row.total) - n(row.filles));
                const pct = n(row.total) ? Math.round((n(row.filles) / n(row.total)) * 100) : 0;
                const rowInvalid = !row.totalRow && (n(row.filles) > n(row.total) || row.total === "" || row.filles === "");

                return (
                  <tr
                    key={`${row.niveau}-${index}`}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      row.totalRow
                        ? isDarkMode ? "bg-slate-900/60 text-white font-black" : "bg-slate-50 text-slate-950 font-black"
                        : rowInvalid
                          ? isDarkMode ? "bg-rose-950/20 text-slate-200" : "bg-rose-50/40 text-slate-700"
                          : isDarkMode ? "text-slate-200 hover:bg-slate-800/40" : "text-slate-700 hover:bg-slate-50/60"
                    )}
                  >
                    <td className="px-5 py-4">
                      {row.totalRow ? (
                        <span className="font-black">{row.niveau}</span>
                      ) : (
                        <input
                          value={row.niveau}
                          onChange={(e) => updateRow(index, "niveau", e.target.value)}
                          className={cn(
                            "h-11 w-44 rounded-2xl border px-4 text-sm font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {row.totalRow ? (
                        <span className="text-lg font-black text-indigo-500">{row.total}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.total}
                          onChange={(e) => updateRow(index, "total", e.target.value)}
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
                      {row.totalRow ? (
                        <span className="text-lg font-black text-pink-500">{row.filles}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={n(row.total)}
                          value={row.filles}
                          onChange={(e) => updateRow(index, "filles", e.target.value)}
                          className={cn(
                            "h-11 w-32 rounded-2xl border px-4 text-sm font-black outline-none transition",
                            isDarkMode
                              ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                              : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-blue-500">{garcons}</td>
                    <td className="px-5 py-4 font-black text-emerald-500">{pct}%</td>
                    <td className="px-5 py-4">
                      {row.totalRow ? (
                        <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{row.observations}</span>
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
