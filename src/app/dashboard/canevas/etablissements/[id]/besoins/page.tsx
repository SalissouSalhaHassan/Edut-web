"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Download, Moon, Plus, Printer, RotateCcw, Save, Sun, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "../canevas-pdf-export";

type Row = { type: string; requested: number | ""; available: number | ""; priority: string; justification: string; status: string; observations: string };

const needTypes = ["Enseignant francisant", "Enseignant arabisant", "Salle de classe", "Table banc", "Petite table", "Petite chaise", "Tabouret", "Armoire", "Tableau a chevalet", "Manuels scolaires", "Kits didactiques"];
const priorities = ["Critique", "Haute", "Moyenne", "Faible"];
const statuses = ["Non traite", "En cours", "Valide", "Rejete", "Satisfait"];
const initialRows: Row[] = [
  { type: "Enseignant francisant", requested: 3, available: 1, priority: "Critique", justification: "Ratio eleves/enseignant eleve", status: "En cours", observations: "" },
  { type: "Enseignant arabisant", requested: 2, available: 1, priority: "Haute", justification: "Renforcement bilingue", status: "Non traite", observations: "" },
  { type: "Salle de classe", requested: 4, available: 1, priority: "Critique", justification: "Classes surchargees", status: "Valide", observations: "" },
  { type: "Table banc", requested: 120, available: 78, priority: "Haute", justification: "Mobilier insuffisant", status: "En cours", observations: "" },
  { type: "Petite table", requested: 45, available: 30, priority: "Moyenne", justification: "Prescolaire", status: "Non traite", observations: "" },
  { type: "Armoire", requested: 12, available: 5, priority: "Moyenne", justification: "Stockage pedagogique", status: "Non traite", observations: "" },
];

const n = (value: number | "") => (typeof value === "number" && value >= 0 ? value : 0);
const STORAGE_KEY = "edut_canevas_data_besoins";

export default function BesoinsPage() {
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
      toast.success("Besoins de l'établissement enregistrés avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser les besoins aux valeurs initiales ?")) {
      setRows(initialRows);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Besoins réinitialisés.");
    }
  };

  const totals = useMemo(() => ({
    requested: rows.reduce((sum, row) => sum + n(row.requested), 0),
    available: rows.reduce((sum, row) => sum + n(row.available), 0),
    critical: rows.filter((row) => row.priority === "Critique").length,
    pending: rows.filter((row) => row.status === "Non traite" || row.status === "En cours").length,
  }), [rows]);

  const updateRow = (index: number, key: keyof Row, value: string) => {
    setRows((current) => current.map((row, i) => {
      if (i !== index) return row;
      if (key === "requested" || key === "available") return { ...row, [key]: value === "" ? "" : Math.max(0, Number(value)) };
      return { ...row, [key]: value };
    }));
  };

  const addRow = () => {
    const newRow: Row = {
      type: needTypes[0],
      requested: 10,
      available: 0,
      priority: "Haute",
      justification: "Nouveau besoin identifié",
      status: "Non traite",
      observations: "",
    };
    setRows((current) => [...current, newRow]);
    toast.success("Nouveau besoin ajouté à la liste.");
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error("Vous devez conserver au moins un besoin.");
      return;
    }
    setRows((current) => current.filter((_, i) => i !== index));
    toast.info("Ligne supprimée.");
  };

  const handleExportPdf = () => {
    exportCanevasTableToPdf({
      title: "Planification des Besoins de l'Établissement",
      subtitle: "Suivi des demandes en personnel, infrastructures, mobilier et matériel didactique",
      schoolName: "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI",
      schoolCode: "ETB-2026-001",
      headers: ["Type de besoin", "Demandé", "Disponible", "Manque", "Priorité", "Justification", "Statut", "Observations"],
      rows: rows.map((r) => [
        r.type,
        r.requested === "" ? 0 : r.requested,
        r.available === "" ? 0 : r.available,
        Math.max(0, n(r.requested) - n(r.available)),
        r.priority,
        r.justification || "-",
        r.status,
        r.observations || "-",
      ]),
      summaryNotes: [
        { label: "Total Demandé", value: totals.requested },
        { label: "Total Disponible", value: totals.available },
        { label: "Manque Cumulé", value: Math.max(0, totals.requested - totals.available) },
        { label: "Besoins Critiques", value: totals.critical },
        { label: "En Attente", value: totals.pending },
      ],
      filename: "besoins_etablissement",
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
              <AlertTriangle size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>Besoins</h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Enregistrement et suivi des besoins de l'etablissement</p>
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
          ["Quantite demandee", totals.requested, isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40" : "bg-indigo-50 text-indigo-700"],
          ["Disponible", totals.available, isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700"],
          ["Manque total", Math.max(0, totals.requested - totals.available), isDarkMode ? "bg-amber-950/60 text-amber-400 border border-amber-800/40" : "bg-amber-50 text-amber-700"],
          ["Critiques", totals.critical, isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-800/40" : "bg-rose-50 text-rose-700"],
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

      {totals.critical > 0 && (
        <div className={cn(
          "flex items-start gap-3 rounded-[24px] border p-5 transition-colors duration-300",
          isDarkMode ? "border-rose-900/40 bg-rose-950/40 text-rose-300" : "border-rose-100 bg-rose-50 text-rose-800"
        )}>
          <AlertTriangle size={20} className="mt-0.5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-black">Besoins critiques detectes</p>
            <p className="mt-1 text-xs font-bold">{totals.critical} besoin(s) critique(s) et {totals.pending} demande(s) a traiter.</p>
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
            <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Inventaire des Besoins Recensés</h2>
            <p className={cn("text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Priorisez les requêtes et justifiez les demandes d'affectation</p>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-black text-white shadow-md shadow-indigo-600/20 transition active:scale-95 print:hidden"
          >
            <Plus size={15} /> Ajouter un besoin
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isDarkMode ? "bg-slate-900/80 text-slate-400 border-b border-slate-800" : "bg-slate-50 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Type besoin</th>
                <th className="px-5 py-4">Quantite demandee</th>
                <th className="px-5 py-4">Quantite disponible</th>
                <th className="px-5 py-4">Manque</th>
                <th className="px-5 py-4">Priorite</th>
                <th className="px-5 py-4">Justification</th>
                <th className="px-5 py-4">Statut traitement</th>
                <th className="px-5 py-4">Observations</th>
                <th className="px-5 py-4 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800 text-slate-200" : "divide-slate-100 text-slate-700")}>
              {rows.map((row, index) => {
                const lack = Math.max(0, n(row.requested) - n(row.available));
                return (
                  <tr key={`${row.type}-${index}`} className="text-sm font-bold">
                    <td className="px-5 py-4">
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(index, "type", e.target.value)}
                        className={cn(
                          "h-11 w-52 rounded-2xl border px-4 font-bold outline-none transition",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      >
                        {needTypes.map((type) => (
                          <option key={type} className={isDarkMode ? "bg-slate-900 text-white" : ""}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        value={row.requested}
                        onChange={(e) => updateRow(index, "requested", e.target.value)}
                        className={cn(
                          "h-11 w-28 rounded-2xl border px-4 font-black outline-none transition",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min={0}
                        value={row.available}
                        onChange={(e) => updateRow(index, "available", e.target.value)}
                        className={cn(
                          "h-11 w-28 rounded-2xl border px-4 font-black outline-none transition",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4 font-black text-amber-500">{lack}</td>
                    <td className="px-5 py-4">
                      <select
                        value={row.priority}
                        onChange={(e) => updateRow(index, "priority", e.target.value)}
                        className={cn(
                          "h-11 w-36 rounded-2xl border px-4 font-black outline-none transition",
                          row.priority === "Critique"
                            ? isDarkMode ? "border-rose-800/60 bg-rose-950/60 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700"
                            : row.priority === "Haute"
                              ? isDarkMode ? "border-amber-800/60 bg-amber-950/60 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"
                              : isDarkMode ? "border-slate-700 bg-slate-900 text-slate-200" : "border-slate-200 bg-white text-slate-700"
                        )}
                      >
                        {priorities.map((p) => (
                          <option key={p} className={isDarkMode ? "bg-slate-900 text-white" : ""}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        value={row.justification}
                        onChange={(e) => updateRow(index, "justification", e.target.value)}
                        className={cn(
                          "h-11 w-64 rounded-2xl border px-4 font-bold outline-none transition",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={row.status}
                        onChange={(e) => updateRow(index, "status", e.target.value)}
                        className={cn(
                          "h-11 w-36 rounded-2xl border px-4 font-bold outline-none transition",
                          isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-300"
                        )}
                      >
                        {statuses.map((s) => (
                          <option key={s} className={isDarkMode ? "bg-slate-900 text-white" : ""}>{s}</option>
                        ))}
                      </select>
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
                        title="Supprimer le besoin"
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
