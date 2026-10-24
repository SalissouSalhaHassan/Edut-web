"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, BarChart3, Building2, Download, Moon, Plus, Printer, RotateCcw, Save, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "@/app/dashboard/canevas/etablissements/canevas-pdf-export";

type Row = { niveau: string; type: string; total: number | ""; good: number | ""; bad: number | ""; estimatedNeed: number; observations: string };

const initialRows: Row[] = [
  { niveau: "Prescolaire", type: "Petites tables", total: 38, good: 30, bad: 8, estimatedNeed: 45, observations: "" },
  { niveau: "Prescolaire", type: "Tabourets", total: 70, good: 58, bad: 12, estimatedNeed: 90, observations: "" },
  { niveau: "CI", type: "Tables bancs", total: 42, good: 31, bad: 11, estimatedNeed: 52, observations: "" },
  { niveau: "CP", type: "Tables bancs", total: 46, good: 38, bad: 8, estimatedNeed: 59, observations: "" },
  { niveau: "CE1", type: "Bancs", total: 40, good: 34, bad: 6, estimatedNeed: 56, observations: "" },
  { niveau: "CE2", type: "Tables individuelles", total: 30, good: 24, bad: 6, estimatedNeed: 40, observations: "" },
  { niveau: "CM1", type: "Chaises individuelles", total: 34, good: 29, bad: 5, estimatedNeed: 40, observations: "" },
  { niveau: "CM2", type: "Armoires", total: 8, good: 5, bad: 3, estimatedNeed: 12, observations: "" },
  { niveau: "Tous niveaux", type: "Tableaux", total: 18, good: 15, bad: 3, estimatedNeed: 18, observations: "" },
];

const furnitureTypes = ["Tables bancs", "Bancs", "Tables individuelles", "Chaises individuelles", "Petites tables", "Tabourets", "Armoires", "Tableaux", "Bureaux maîtres", "Étagères"];
const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);
const STORAGE_KEY = "edut_canevas_data_mobilier";

export default function MobilierPage() {
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
      toast.success("Mobilier scolaire enregistré avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser le mobilier aux valeurs initiales ?")) {
      setRows(initialRows);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Données réinitialisées.");
    }
  };

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    total: acc.total + n(row.total),
    good: acc.good + n(row.good),
    bad: acc.bad + n(row.bad),
    shortage: acc.shortage + Math.max(0, row.estimatedNeed - n(row.good)),
  }), { total: 0, good: 0, bad: 0, shortage: 0 }), [rows]);

  const highBad = rows.filter((row) => n(row.total) > 0 && n(row.bad) / n(row.total) >= 0.25);
  const maxShortage = Math.max(1, ...rows.map((row) => Math.max(0, row.estimatedNeed - n(row.good))));

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (["total", "good", "bad"].includes(key)) return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
      if (key === "estimatedNeed") return { ...row, estimatedNeed: Math.max(0, Number(value)) };
      return { ...row, [key]: value };
    }));
  };

  const addRow = () => {
    const newRow: Row = {
      niveau: "Tous niveaux",
      type: furnitureTypes[0],
      total: 10,
      good: 8,
      bad: 2,
      estimatedNeed: 15,
      observations: "",
    };
    setRows((current) => [...current, newRow]);
    toast.success("Nouveau mobilier ajouté.");
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error("Vous devez conserver au moins une ligne de mobilier.");
      return;
    }
    setRows((current) => current.filter((_, i) => i !== index));
    toast.info("Ligne supprimée.");
  };

  const handleExportPdf = () => {
    exportCanevasTableToPdf({
      title: "Gestion du Mobilier Scolaire",
      subtitle: "État d'usage, besoins estimés et déficit en mobilier par cycle",
      schoolName: "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI",
      schoolCode: "ETB-2026-001",
      headers: ["Niveau", "Type de mobilier", "Total", "Bon état", "Mauvais état", "Besoin estimé", "Manque", "Observations"],
      rows: rows.map((r) => [
        r.niveau,
        r.type,
        r.total === "" ? 0 : r.total,
        r.good === "" ? 0 : r.good,
        r.bad === "" ? 0 : r.bad,
        r.estimatedNeed,
        Math.max(0, r.estimatedNeed - n(r.good)),
        r.observations || "-",
      ]),
      summaryNotes: [
        { label: "Total Mobilier", value: totals.total },
        { label: "En Bon État", value: totals.good },
        { label: "En Mauvais État", value: totals.bad },
        { label: "Déficit Total", value: totals.shortage },
      ],
      filename: "mobilier_scolaire",
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
              <Building2 size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Mobilier</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Gestion du mobilier par niveau, type et etat</p>
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
          ["Total mobilier", totals.total, isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40" : "bg-indigo-50 text-indigo-700"],
          ["Bon etat", totals.good, isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700"],
          ["Mauvais etat", totals.bad, isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-800/40" : "bg-rose-50 text-rose-700"],
          ["Besoin estime", totals.shortage, isDarkMode ? "bg-amber-950/60 text-amber-400 border border-amber-800/40" : "bg-amber-50 text-amber-700"],
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

      {highBad.length > 0 && (
        <div className={cn(
          "flex items-start gap-3 rounded-[24px] border p-5 transition-colors duration-300",
          isDarkMode ? "border-amber-900/40 bg-amber-950/40 text-amber-300" : "border-amber-100 bg-amber-50 text-amber-800"
        )}>
          <AlertTriangle size={20} className="mt-0.5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-black">Mauvais etat eleve</p>
            <p className="mt-1 text-xs font-bold">Certains mobiliers ont au moins 25% en mauvais etat: {highBad.map((r) => `${r.niveau} - ${r.type}`).join(", ")}.</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={cn(
          "overflow-hidden rounded-[30px] border shadow-sm transition-colors duration-300",
          isDarkMode ? "border-slate-800 bg-[#111827]/90 shadow-xl shadow-black/20" : "border-slate-100 bg-white"
        )}>
          <div className={cn("flex items-center justify-between border-b p-5", isDarkMode ? "border-slate-800" : "border-slate-100")}>
            <div>
              <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Inventaire du Mobilier</h2>
              <p className={cn("text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>État fonctionnel et calcul des manques par rapport aux besoins</p>
            </div>
            <button
              onClick={addRow}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition active:scale-95 print:hidden"
            >
              <Plus size={15} /> Ajouter mobilier
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isDarkMode ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-400"
              )}>
                <tr>
                  <th className="px-5 py-4">Niveau</th>
                  <th className="px-5 py-4">Type mobilier</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Bon etat</th>
                  <th className="px-5 py-4">Mauvais etat</th>
                  <th className="px-5 py-4">Besoin estime</th>
                  <th className="px-5 py-4">Observations</th>
                  <th className="px-5 py-4 text-center print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800 text-slate-200" : "divide-slate-100 text-slate-700")}>
                {rows.map((row, index) => {
                  const shortage = Math.max(0, row.estimatedNeed - n(row.good));
                  return (
                    <tr key={`${row.niveau}-${row.type}-${index}`} className="text-sm font-bold">
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
                        <select
                          value={row.type}
                          onChange={(e) => updateRow(index, "type", e.target.value)}
                          className={cn(
                            "h-11 w-48 rounded-2xl border px-4 font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        >
                          {furnitureTypes.map((type) => (
                            <option key={type} className={isDarkMode ? "bg-slate-900 text-white" : ""}>{type}</option>
                          ))}
                        </select>
                      </td>
                      {(["total", "good", "bad"] as const).map((key) => (
                        <td key={key} className="px-5 py-4">
                          <input
                            type="number"
                            min={0}
                            value={row[key]}
                            onChange={(e) => updateRow(index, key, e.target.value)}
                            className={cn(
                              "h-11 w-24 rounded-2xl border px-4 font-black outline-none transition",
                              isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                            )}
                          />
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="font-black text-amber-500">{shortage}</div>
                        <input
                          type="number"
                          min={0}
                          value={row.estimatedNeed}
                          onChange={(e) => updateRow(index, "estimatedNeed", e.target.value)}
                          className={cn(
                            "mt-1 h-9 w-24 rounded-xl border px-3 text-xs font-black outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                          )}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <input
                          value={row.observations}
                          onChange={(e) => updateRow(index, "observations", e.target.value)}
                          placeholder="Observation..."
                          className={cn(
                            "h-11 w-full rounded-2xl border px-4 font-bold outline-none transition",
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300"
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

        <aside className={cn(
          "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
          isDarkMode ? "border-slate-800 bg-[#111827]/90 text-white shadow-xl shadow-black/20" : "border-slate-100 bg-white"
        )}>
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-indigo-500" />
            <div>
              <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Mobilier manquant</h2>
              <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Bar chart des besoins estimes</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {rows.map((row, i) => {
              const shortage = Math.max(0, row.estimatedNeed - n(row.good));
              return (
                <div key={`${row.niveau}-${row.type}-${i}`}>
                  <div className="mb-1 flex justify-between text-xs font-black">
                    <span className={cn("truncate max-w-[180px]", isDarkMode ? "text-slate-300" : "text-slate-800")}>{row.type} ({row.niveau})</span>
                    <span className="text-amber-500 font-bold">{shortage}</span>
                  </div>
                  <div className={cn("h-3 rounded-full overflow-hidden", isDarkMode ? "bg-slate-800" : "bg-slate-100")}>
                    <div className="h-3 rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${(shortage / maxShortage) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}
