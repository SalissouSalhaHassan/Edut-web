"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Download, GraduationCap, Printer, Save, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function RedoublantsPage() {
  const [rows, setRows] = useState(initialRows);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edut_theme") || localStorage.getItem("edut_canevas_dark_mode");
      if (saved === "dark" || saved === "true" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDarkMode(true);
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

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    redoublants: acc.redoublants + n(row.redoublants),
    filles: acc.filles + n(row.filles),
    effectif: acc.effectif + n(row.effectif),
  }), { redoublants: 0, filles: 0, effectif: 0 }), [rows]);
  const invalid = rows.filter((row) => n(row.redoublants) > n(row.effectif) || n(row.filles) > n(row.redoublants) || row.redoublants === "" || row.filles === "" || row.effectif === "");

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "niveau") return row;
      if (key === "observations") return { ...row, observations: value };
      return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
    }));
  };

  const displayRows = [...rows, { niveau: "Total general", redoublants: totals.redoublants, filles: totals.filles, effectif: totals.effectif, observations: "Calcul automatique" }];

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-300 print:bg-white print:p-0",
      isDarkMode ? "bg-[#090D16] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-950"
    )}>
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
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Redoublants
              </h1>
              <p className={cn("mt-1 text-xs md:text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Saisie des redoublants par niveau avec contrôles automatiques
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              title={isDarkMode ? "Passer en mode clair" : "Activer le mode sombre"}
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

            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/30 transition">
              <Save size={16} /> Enregistrer
            </button>
            <button className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}>
              <Download size={16} /> Exporter
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
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Total redoublants", totals.redoublants, isDarkMode ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/60" : "bg-indigo-50 text-indigo-700 border-indigo-100"],
          ["Filles redoublantes", totals.filles, isDarkMode ? "bg-pink-950/40 text-pink-300 border-pink-800/60" : "bg-pink-50 text-pink-700 border-pink-100"],
          ["Garçons redoublants", totals.redoublants - totals.filles, isDarkMode ? "bg-blue-950/40 text-blue-300 border-blue-800/60" : "bg-blue-50 text-blue-700 border-blue-100"],
          ["Taux redoublement", `${totals.effectif ? Math.round((totals.redoublants / totals.effectif) * 100) : 0}%`, isDarkMode ? "bg-amber-950/40 text-amber-300 border-amber-800/60" : "bg-amber-50 text-amber-700 border-amber-100"],
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
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black">Validation requise</p>
            <p className="mt-1 text-xs font-bold">Les redoublants ne doivent pas dépasser l'effectif total et les filles redoublantes ne doivent pas dépasser le total redoublants.</p>
          </div>
        </div>
      )}

      {/* Main Table */}
      <section className={cn(
        "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
        isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left">
            <thead className={cn(
              "text-[10px] font-black uppercase tracking-widest border-b",
              isDarkMode ? "bg-slate-900/70 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Niveau</th>
                <th className="px-5 py-4">Total redoublants</th>
                <th className="px-5 py-4">Filles redoublantes</th>
                <th className="px-5 py-4">Garçons redoublants</th>
                <th className="px-5 py-4">Effectif total</th>
                <th className="px-5 py-4">Taux redoublement</th>
                <th className="px-5 py-4">Observations</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
              {displayRows.map((row, index) => {
                const totalRow = row.niveau === "Total general";
                const garcons = Math.max(0, n(row.redoublants) - n(row.filles));
                const taux = n(row.effectif) ? Math.round((n(row.redoublants) / n(row.effectif)) * 100) : 0;
                const rowInvalid = !totalRow && (n(row.redoublants) > n(row.effectif) || n(row.filles) > n(row.redoublants) || row.redoublants === "" || row.filles === "" || row.effectif === "");
                return (
                  <tr
                    key={row.niveau}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      totalRow
                        ? (isDarkMode ? "bg-slate-900/90 text-white" : "bg-slate-50 text-slate-950")
                        : rowInvalid
                        ? (isDarkMode ? "bg-rose-950/20 text-rose-300" : "bg-rose-50/50 text-slate-700")
                        : (isDarkMode ? "text-slate-200 hover:bg-slate-800/40" : "text-slate-700 hover:bg-slate-50")
                    )}
                  >
                    <td className="px-5 py-4 font-black">{row.niveau}</td>
                    <td className="px-5 py-4">
                      {totalRow ? (
                        <span className="text-lg font-black text-indigo-500">{row.redoublants}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.redoublants}
                          onChange={(e) => updateRow(index, "redoublants", e.target.value)}
                          className={cn(
                            "h-11 w-32 rounded-2xl border px-4 font-black outline-none transition",
                            isDarkMode
                              ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                              : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {totalRow ? (
                        <span className="text-lg font-black text-pink-500">{row.filles}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={n(row.redoublants)}
                          value={row.filles}
                          onChange={(e) => updateRow(index, "filles", e.target.value)}
                          className={cn(
                            "h-11 w-32 rounded-2xl border px-4 font-black outline-none transition",
                            isDarkMode
                              ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                              : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-blue-500">{garcons}</td>
                    <td className="px-5 py-4">
                      {totalRow ? (
                        <span className="font-black">{row.effectif}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.effectif}
                          onChange={(e) => updateRow(index, "effectif", e.target.value)}
                          className={cn(
                            "h-11 w-32 rounded-2xl border px-4 font-black outline-none transition",
                            isDarkMode
                              ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                              : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-amber-500">{taux}%</td>
                    <td className="px-5 py-4">
                      {totalRow ? (
                        <span className="text-slate-400">{row.observations}</span>
                      ) : (
                        <input
                          value={row.observations}
                          onChange={(e) => updateRow(index, "observations", e.target.value)}
                          placeholder="Observation..."
                          className={cn(
                            "h-11 w-full rounded-2xl border px-4 font-bold outline-none transition",
                            isDarkMode
                              ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                              : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-300 focus:border-indigo-300"
                          )}
                        />
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
