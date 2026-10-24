"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Download, GraduationCap, Moon, Plus, Printer, RotateCcw, Save, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "@/app/dashboard/canevas/etablissements/canevas-pdf-export";

type Row = { niveau: string; redoublants: number | ""; filles: number | ""; effectif: number | ""; observations: string };

const initialRows: Row[] = [
  { niveau: "Section 1", redoublants: 1, filles: 0, effectif: 52, observations: "" },
  { niveau: "Section 2", redoublants: 1, filles: 1, effectif: 58, observations: "" },
  { niveau: "CI", redoublants: 4, filles: 2, effectif: 104, observations: "" },
  { niveau: "CP", redoublants: 6, filles: 3, effectif: 118, observations: "" },
  { niveau: "CE1", redoublants: 5, filles: 2, effectif: 111, observations: "" },
  { niveau: "CE2", redoublants: 3, filles: 1, effectif: 105, observations: "" },
  { niveau: "CM1", redoublants: 4, filles: 2, effectif: 98, observations: "" },
  { niveau: "CM2", redoublants: 2, filles: 1, effectif: 106, observations: "" },
];

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);
const STORAGE_KEY = "edut_canevas_data_redoublants";

export default function RedoublantsPage() {
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
      toast.success("Données des redoublants enregistrées avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser les données aux valeurs initiales ?")) {
      setRows(initialRows);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Données réinitialisées.");
    }
  };

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    redoublants: acc.redoublants + n(row.redoublants),
    filles: acc.filles + n(row.filles),
    effectif: acc.effectif + n(row.effectif),
  }), { redoublants: 0, filles: 0, effectif: 0 }), [rows]);

  const invalid = rows.filter((row) => n(row.redoublants) > n(row.effectif) || n(row.filles) > n(row.redoublants) || row.redoublants === "" || row.filles === "" || row.effectif === "");

  const updateRow = (index: number, key: keyof Row, value: string) => {
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
      redoublants: 0,
      filles: 0,
      effectif: 50,
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

  const rate = totals.effectif ? Math.round((totals.redoublants / totals.effectif) * 100) : 0;

  const handleExportPdf = () => {
    exportCanevasTableToPdf({
      title: "Statistiques des Redoublants",
      subtitle: "Saisie des redoublants par niveau avec contrôles automatiques",
      schoolName: "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI",
      schoolCode: "ETB-2026-001",
      headers: ["Niveau", "Total Redoublants", "Filles", "Garçons", "Effectif Total", "Taux Red.", "Observations"],
      rows: [
        ...rows.map((row) => {
          const garcons = Math.max(0, n(row.redoublants) - n(row.filles));
          const rowRate = n(row.effectif) ? `${Math.round((n(row.redoublants) / n(row.effectif)) * 100)}%` : "0%";
          return [row.niveau, row.redoublants === "" ? 0 : row.redoublants, row.filles === "" ? 0 : row.filles, garcons, row.effectif === "" ? 0 : row.effectif, rowRate, row.observations || "-"];
        }),
        ["TOTAL GÉNÉRAL", totals.redoublants, totals.filles, Math.max(0, totals.redoublants - totals.filles), totals.effectif, `${rate}%`, "Calcul automatique"],
      ],
      summaryNotes: [
        { label: "Total Redoublants", value: `${totals.redoublants}` },
        { label: "Filles", value: `${totals.filles}` },
        { label: "Garçons", value: `${Math.max(0, totals.redoublants - totals.filles)}` },
        { label: "Taux Moyen", value: `${rate}%` },
      ],
      filename: "redoublants_par_niveau",
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
              <GraduationCap size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Redoublants</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Saisie des redoublants par niveau avec controles automatiques</p>
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
          ["Total redoublants", totals.redoublants, isDarkMode ? "bg-violet-950/40 text-violet-300 border-violet-800/60" : "bg-violet-50 text-violet-700 border-violet-100"],
          ["Filles redoublantes", totals.filles, isDarkMode ? "bg-pink-950/40 text-pink-300 border-pink-800/60" : "bg-pink-50 text-pink-700 border-pink-100"],
          ["Garcons redoublants", Math.max(0, totals.redoublants - totals.filles), isDarkMode ? "bg-blue-950/40 text-blue-300 border-blue-800/60" : "bg-blue-50 text-blue-700 border-blue-100"],
          ["Taux redoublement", `${rate}%`, isDarkMode ? "bg-amber-950/40 text-amber-300 border-amber-800/60" : "bg-amber-50 text-amber-700 border-amber-100"],
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

      {invalid.length > 0 && (
        <div className={cn(
          "flex items-start gap-3 rounded-[24px] border p-5 transition-colors",
          isDarkMode ? "border-rose-900/60 bg-rose-950/30 text-rose-300" : "border-rose-100 bg-rose-50 text-rose-800"
        )}>
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black">Anomalies de saisie detectees</p>
            <p className="mt-1 text-xs font-bold">Les redoublants ne peuvent pas depasser l'effectif, et les filles ne peuvent pas depasser le total des redoublants.</p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <section className={cn(
        "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
        isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
      )}>
        <div className={cn("flex items-center justify-between border-b p-5", isDarkMode ? "border-slate-800" : "border-slate-100")}>
          <div>
            <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Grille des Redoublants par Niveau</h2>
            <p className={cn("text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Contrôles automatiques des ratios et calculs dynamiques</p>
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
              "text-[10px] font-black uppercase tracking-widest border-b",
              isDarkMode ? "bg-slate-900/70 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Niveau</th>
                <th className="px-5 py-4">Total redoublants</th>
                <th className="px-5 py-4">Filles redoublantes</th>
                <th className="px-5 py-4">Garcons redoublants</th>
                <th className="px-5 py-4">Effectif total</th>
                <th className="px-5 py-4">Taux redoublement</th>
                <th className="px-5 py-4">Observations</th>
                <th className="px-5 py-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
              {rows.map((row, index) => {
                const garcons = Math.max(0, n(row.redoublants) - n(row.filles));
                const rowRate = n(row.effectif) ? `${Math.round((n(row.redoublants) / n(row.effectif)) * 100)}%` : "0%";
                const rowInvalid = n(row.redoublants) > n(row.effectif) || n(row.filles) > n(row.redoublants) || row.redoublants === "" || row.filles === "" || row.effectif === "";

                return (
                  <tr
                    key={`${row.niveau}-${index}`}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      rowInvalid
                        ? (isDarkMode ? "bg-rose-950/20 text-rose-300" : "bg-rose-50/50 text-slate-800")
                        : (isDarkMode ? "text-slate-200 hover:bg-slate-800/40" : "text-slate-700 hover:bg-slate-50")
                    )}
                  >
                    <td className="px-5 py-4">
                      <input
                        value={row.niveau}
                        onChange={(e) => updateRow(index, "niveau", e.target.value)}
                        className={cn(
                          "h-11 w-36 rounded-2xl border px-4 font-bold outline-none transition",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        value={row.redoublants}
                        onChange={(e) => updateRow(index, "redoublants", e.target.value)}
                        className={cn(
                          "h-11 w-28 rounded-2xl border px-4 text-sm font-black outline-none transition",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                            : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        max={n(row.redoublants)}
                        value={row.filles}
                        onChange={(e) => updateRow(index, "filles", e.target.value)}
                        className={cn(
                          "h-11 w-28 rounded-2xl border px-4 text-sm font-black outline-none transition",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                            : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4 font-black text-blue-500">{garcons}</td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        value={row.effectif}
                        onChange={(e) => updateRow(index, "effectif", e.target.value)}
                        className={cn(
                          "h-11 w-28 rounded-2xl border px-4 text-sm font-black outline-none transition",
                          isDarkMode
                            ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                            : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4 font-black text-amber-500">{rowRate}</td>
                    <td className="px-5 py-4">
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
                    </td>
                    <td className="px-5 py-4 text-center print:hidden">
                      <button
                        onClick={() => deleteRow(index)}
                        title="Supprimer la ligne"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      >
                        <Trash2 size={16} />
                      </button>
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
