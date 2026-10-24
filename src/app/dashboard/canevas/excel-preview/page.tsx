"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Search, Eye, GitCompareArrows, AlertTriangle, Download, Sun, Moon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const sheets = ["Identification", "Effectifs", "Personnel", "Infrastructures", "Mobilier", "Besoins"];
const cells = [
  { sheet: "Identification", cell: "B4", row: 4, col: "B", raw: "Ecole Excellence", formula: "-", field: "etablissements.nom", status: "Mappé", system: "Ecole Excellence" },
  { sheet: "Identification", cell: "E8", row: 8, col: "E", raw: "Niamey IV", formula: "-", field: "etablissements.commune", status: "Mappé", system: "Niamey IV" },
  { sheet: "Effectifs", cell: "C14", row: 14, col: "C", raw: "318", formula: "=SUM(C8:C13)", field: "effectifs.filles", status: "Mappé", system: "318" },
  { sheet: "Effectifs", cell: "D14", row: 14, col: "D", raw: "642", formula: "=SUM(D8:D13)", field: "effectifs.total", status: "Mappé", system: "642" },
  { sheet: "Mobilier", cell: "H22", row: 22, col: "H", raw: "Tableau fissuré", formula: "-", field: "-", status: "Non mappé", system: "-" },
  { sheet: "Besoins", cell: "F11", row: 11, col: "F", raw: "Critique", formula: "-", field: "besoins.priorite", status: "À vérifier", system: "Haute" },
];

export default function ExcelPreviewPage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_theme");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
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
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredCells = cells.filter(c => {
    const matchSheet = c.sheet === sheets[activeSheetIndex];
    const matchSearch = search 
      ? c.raw.toLowerCase().includes(search.toLowerCase()) || 
        c.cell.toLowerCase().includes(search.toLowerCase()) ||
        c.field.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchSheet && matchSearch;
  });

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-200",
      isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#fcfdff] text-slate-950",
      "print:bg-white print:p-0"
    )}>
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/canevas/import" 
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition print:hidden",
                isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Import Excel</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black text-indigo-400 border border-indigo-500/20">
                  <Sparkles size={10} /> Aperçu Cellulaire
                </span>
              </div>
              <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Aperçu Excel Brut
              </h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Vision cellule par cellule pour garantir aucune perte de données
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              onClick={toggleDarkMode}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black transition",
                isDarkMode ? "border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              <span className="hidden sm:inline">{isDarkMode ? "Clair" : "Sombre"}</span>
            </button>
            <Link 
              href="/dashboard/canevas/mapping-excel" 
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
            >
              <GitCompareArrows size={16} /> Mapping Excel
            </Link>
            <button 
              onClick={() => toast.success("Exportation brute lancée...")}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Download size={16} /> Export brut
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={cn(
          "rounded-[28px] border p-4 shadow-sm transition-colors",
          isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
        )}>
          <h2 className={cn("px-2 text-sm font-black", isDarkMode ? "text-white" : "text-slate-950")}>
            Feuilles Excel
          </h2>
          <div className="mt-4 space-y-2">
            {sheets.map((sheet, index) => (
              <button 
                key={sheet} 
                onClick={() => setActiveSheetIndex(index)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black transition",
                  activeSheetIndex === index 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                    : (isDarkMode ? "bg-slate-900/60 text-slate-300 hover:bg-slate-800" : "bg-slate-50 text-slate-700 hover:bg-slate-100")
                )}
              >
                <span>{sheet}</span>
                <span className="text-xs opacity-70">#{index + 1}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-5">
          <div className={cn(
            "flex flex-col gap-3 rounded-[28px] border p-4 shadow-sm md:flex-row md:items-center transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
          )}>
            <div className={cn(
              "flex h-12 flex-1 items-center gap-3 rounded-2xl border px-4 transition",
              isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-800"
            )}>
              <Search size={18} className="text-slate-400" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher valeur, cellule, champ lié..." 
                className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400" 
              />
            </div>
            <button 
              onClick={() => toast.info("Affichage filtré sur les cellules non mappées.")}
              className={cn(
                "h-12 rounded-2xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode ? "border-amber-900/50 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60" : "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              Cellules non mappées
            </button>
            <button 
              onClick={() => toast.info("Comparaison avec les valeurs du système effectuée.")}
              className={cn(
                "h-12 rounded-2xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode ? "border-indigo-900/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60" : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              )}
            >
              Comparer système
            </button>
          </div>

          <section className={cn(
            "overflow-hidden rounded-[30px] border shadow-sm transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className={cn(
                  "text-[10px] font-black uppercase tracking-widest border-b",
                  isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-400"
                )}>
                  <tr>
                    <th className="px-5 py-4">Sheet</th>
                    <th className="px-5 py-4">Cellule</th>
                    <th className="px-5 py-4">Ligne</th>
                    <th className="px-5 py-4">Colonne</th>
                    <th className="px-5 py-4">Valeur brute</th>
                    <th className="px-5 py-4">Formule</th>
                    <th className="px-5 py-4">Champ lié</th>
                    <th className="px-5 py-4">Statut mapping</th>
                    <th className="px-5 py-4">Valeur système</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/80" : "divide-slate-100")}>
                  {filteredCells.map((item) => (
                    <tr 
                      key={`${item.sheet}-${item.cell}`} 
                      className={cn(
                        "text-sm font-bold transition-colors",
                        isDarkMode ? "hover:bg-slate-900/40 text-slate-300" : "hover:bg-slate-50/40 text-slate-700"
                      )}
                    >
                      <td className="px-5 py-4">{item.sheet}</td>
                      <td className="px-5 py-4 font-black text-indigo-400">{item.cell}</td>
                      <td className="px-5 py-4 text-slate-400">{item.row}</td>
                      <td className="px-5 py-4 text-slate-400">{item.col}</td>
                      <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>{item.raw}</td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-400">{item.formula}</td>
                      <td className="px-5 py-4 text-slate-300">{item.field}</td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                          item.status === "Mappé" && (isDarkMode ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"),
                          item.status === "Non mappé" && (isDarkMode ? "bg-rose-950/50 border-rose-800/50 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-700"),
                          item.status === "À vérifier" && (isDarkMode ? "bg-amber-950/50 border-amber-800/50 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-700")
                        )}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-400">{item.system}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className={cn(
            "rounded-[24px] border p-5 transition-colors",
            isDarkMode ? "bg-amber-950/30 border-amber-900/40 text-amber-300" : "bg-amber-50 border-amber-100 text-amber-800"
          )}>
            <AlertTriangle size={20} className="text-amber-500" />
            <p className="mt-2 text-sm font-black">Aucune suppression de données brutes</p>
            <p className="mt-1 text-xs font-bold opacity-80">
              Toutes les cellules non mappées restent conservées pour audit, contrôle et mapping ultérieur.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
