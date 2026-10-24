"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  GitCompareArrows,
  PlayCircle,
  Search,
  ShieldOff,
  Wand2,
  Sun,
  Moon,
  Sparkles,
  X,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MappingRow {
  sheet: string;
  column: string;
  header: string;
  section: string;
  table: string;
  field: string;
  type: string;
  required: string;
  status: "Mappé" | "À tester" | "Non mappé";
}

const initialRows: MappingRow[] = [
  { sheet: "Identification", column: "B", header: "Nom école", section: "Identification", table: "etablissements", field: "nom", type: "Texte", required: "Oui", status: "Mappé" },
  { sheet: "Identification", column: "E", header: "Commune", section: "Localisation", table: "etablissements", field: "commune", type: "Texte", required: "Oui", status: "Mappé" },
  { sheet: "Effectifs", column: "C", header: "Filles", section: "Effectifs", table: "effectifs_eleves", field: "filles", type: "Nombre", required: "Oui", status: "Mappé" },
  { sheet: "Mobilier", column: "H", header: "Observation mobilier", section: "Mobilier", table: "mobilier", field: "observations", type: "Texte", required: "Non", status: "À tester" },
  { sheet: "Besoins", column: "F", header: "Priorité", section: "Besoins", table: "besoins", field: "priorite", type: "Enum", required: "Oui", status: "Non mappé" },
];

export default function MappingExcelPage() {
  const [rows, setRows] = useState<MappingRow[]>(initialRows);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "Mappé" | "À tester" | "Non mappé">("all");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_theme") || localStorage.getItem("edut_mapping_dark_mode");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setIsDarkMode(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem("edut_theme", next ? "dark" : "light");
        localStorage.setItem("edut_mapping_dark_mode", next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = searchQuery
        ? r.sheet.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.header.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.column.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchStatus = statusTab === "all" || r.status === statusTab;
      return matchSearch && matchStatus;
    });
  }, [rows, searchQuery, statusTab]);

  const handleQuickMap = (column: string) => {
    setRows(prev => prev.map(r => r.column === column ? { ...r, status: "Mappé" } : r));
    toast.success(`Champ de la colonne ${column} validé comme Mappé.`);
  };

  const handleIgnore = (column: string) => {
    setRows(prev => prev.map(r => r.column === column ? { ...r, status: "Non mappé" } : r));
    toast.info(`Colonne ${column} marquée à ignorer.`);
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-200",
      isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#fcfdff] text-slate-950"
    )}>
      {/* ─── HEADER ─── */}
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/canevas/import" 
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition",
                isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <GitCompareArrows size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Import Excel</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black text-indigo-400 border border-indigo-500/20">
                  <Sparkles size={10} /> Schéma Structuré
                </span>
              </div>
              <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Mapping Excel
              </h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Relier les colonnes Excel aux tables et champs de l’application
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black transition",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800" 
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              <span className="hidden sm:inline">{isDarkMode ? "Clair" : "Sombre"}</span>
            </button>

            <Link 
              href="/dashboard/canevas/controle-qualite" 
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
            >
              <PlayCircle size={16} /> Contrôle qualité
            </Link>
          </div>
        </div>
      </header>

      {/* ─── CONTROLS: SEARCH & STATUS TABS ─── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className={cn(
          "flex h-12 flex-1 items-center gap-3 rounded-2xl border px-4 shadow-sm transition-colors",
          isDarkMode ? "bg-[#111827] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
        )}>
          <Search size={18} className="text-slate-400" />
          <input 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher sheet, colonne, champ cible..." 
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400" 
          />
          {searchQuery && (
            <X size={15} className="text-slate-400 hover:text-white cursor-pointer" onClick={() => setSearchQuery("")} />
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className={cn(
          "flex items-center gap-1.5 p-1 rounded-2xl border",
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100 border-slate-200"
        )}>
          {[
            { id: "all" as const, label: "Tous", count: rows.length },
            { id: "Mappé" as const, label: "Mappés", count: rows.filter(r => r.status === "Mappé").length },
            { id: "À tester" as const, label: "À tester", count: rows.filter(r => r.status === "À tester").length },
            { id: "Non mappé" as const, label: "Non mappés", count: rows.filter(r => r.status === "Non mappé").length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition",
                statusTab === tab.id
                  ? (isDarkMode ? "bg-indigo-600 text-white shadow" : "bg-white text-slate-900 shadow-sm")
                  : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded text-[10px]",
                statusTab === tab.id ? (isDarkMode ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-800") : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── TABLE ─── */}
      <section className={cn(
        "overflow-hidden rounded-[30px] border shadow-sm transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left">
            <thead className={cn(
              "text-[10px] font-black uppercase tracking-widest border-b",
              isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Sheet name</th>
                <th className="px-5 py-4">Excel column</th>
                <th className="px-5 py-4">Excel header</th>
                <th className="px-5 py-4">Section</th>
                <th className="px-5 py-4">Table cible</th>
                <th className="px-5 py-4">Champ cible</th>
                <th className="px-5 py-4">Type donnée</th>
                <th className="px-5 py-4">Obligatoire</th>
                <th className="px-5 py-4">Statut mapping</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/80" : "divide-slate-100")}>
              {filteredRows.map((row) => (
                <tr 
                  key={`${row.sheet}-${row.column}`} 
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isDarkMode ? "hover:bg-slate-900/40 text-slate-300" : "hover:bg-slate-50/40 text-slate-700"
                  )}
                >
                  <td className="px-5 py-4">{row.sheet}</td>
                  <td className="px-5 py-4 font-black text-indigo-400">{row.column}</td>
                  <td className="px-5 py-4">{row.header}</td>
                  <td className="px-5 py-4">{row.section}</td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-400">{row.table}</td>
                  <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>{row.field}</td>
                  <td className="px-5 py-4">{row.type}</td>
                  <td className="px-5 py-4">{row.required}</td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                      row.status === "Mappé" && (isDarkMode ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"),
                      row.status === "Non mappé" && (isDarkMode ? "bg-rose-950/50 border-rose-800/50 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-700"),
                      row.status === "À tester" && (isDarkMode ? "bg-amber-950/50 border-amber-800/50 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-700")
                    )}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleQuickMap(row.column)}
                        title="Valider mapping" 
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-indigo-400 hover:bg-slate-800" : "border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        <Wand2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleIgnore(row.column)}
                        title="Ignorer sans suppression" 
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        <ShieldOff size={16} />
                      </button>
                      <button 
                        onClick={() => toast.success(`Test du mapping sur ${row.sheet}.${row.column} : OK`)}
                        title="Tester mapping" 
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-emerald-400 hover:bg-slate-800" : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                        )}
                      >
                        <PlayCircle size={16} />
                      </button>
                      <button 
                        onClick={() => toast.info(`Exemple: Valeur brute lue dans colonne ${row.column} -> assignée au champ ${row.field}`)}
                        title="Voir exemples" 
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-slate-400">
                    Aucun champ correspondant aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
