"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Eye, ShieldAlert, Wrench, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const kpis = [
  ["Erreurs bloquantes", "7", "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50"],
  ["Avertissements", "14", "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"],
  ["Champs manquants", "9", "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50"],
  ["Totaux incohérents", "4", "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"],
  ["Données non mappées", "22", "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-900/50"],
  ["Taux de complétude", "91%", "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"],
];

const issues = [
  { gravity: "Bloquant", school: "Ecole Excellence", section: "Effectifs", field: "Filles", value: "380 > 342", problem: "filles > total", correction: "Limiter filles au total déclaré", status: "Ouvert" },
  { gravity: "Bloquant", school: "Ecole Bobiel", section: "Effectifs", field: "Total général", value: "642 / 638", problem: "total niveaux ≠ total général", correction: "Recalculer total général", status: "Ouvert" },
  { gravity: "Avertissement", school: "Ecole Excellence", section: "Mobilier", field: "Mauvais état", value: "45 > 40", problem: "mobilier mauvais > total", correction: "Corriger total ou mauvais état", status: "À vérifier" },
  { gravity: "Bloquant", school: "Ecole Lazaret", section: "Infrastructures", field: "Salles utilisées", value: "14 > 12", problem: "salles utilisées > salles total", correction: "Réduire salles utilisées", status: "Ouvert" },
  { gravity: "Avertissement", school: "Ecole Sahel", section: "Services", field: "Latrines", value: "10 > 8", problem: "latrines fonctionnelles > total", correction: "Corriger latrines fonctionnelles", status: "À vérifier" },
  { gravity: "Bloquant", school: "-", section: "Identification", field: "Code école", value: "-", problem: "code école manquant", correction: "Générer ou saisir code école", status: "Ouvert" },
  { gravity: "Avertissement", school: "Ecole Excellence", section: "Contact", field: "Téléphone", value: "9000", problem: "contact invalide", correction: "Saisir numéro complet", status: "Corrigé" },
];

export default function ControleQualitePage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

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

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-200",
      isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#fcfdff] text-slate-950"
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
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition",
                isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <ClipboardCheck size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Import Excel</p>
              <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Contrôle Qualité
              </h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Détection des erreurs avant adoption des données
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
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
            <button 
              onClick={() => toast.success("Toutes les corrections ont été validées et recalculées.")}
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
            >
              <CheckCircle2 size={16} /> Valider les corrections
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([label, value, style]) => (
          <div 
            key={label} 
            className={cn(
              "rounded-[24px] border p-5 shadow-sm transition-colors",
              isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className={cn("mt-2 inline-flex rounded-2xl px-4 py-2 text-2xl font-black border", style)}>{value}</p>
          </div>
        ))}
      </section>

      <section className={cn(
        "overflow-hidden rounded-[30px] border shadow-sm transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left">
            <thead className={cn(
              "text-[10px] font-black uppercase tracking-widest border-b",
              isDarkMode ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-400"
            )}>
              <tr>
                <th className="px-5 py-4">Niveau gravité</th>
                <th className="px-5 py-4">Établissement</th>
                <th className="px-5 py-4">Section</th>
                <th className="px-5 py-4">Champ</th>
                <th className="px-5 py-4">Valeur</th>
                <th className="px-5 py-4">Problème</th>
                <th className="px-5 py-4">Correction proposée</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/80" : "divide-slate-100")}>
              {issues.map((issue) => (
                <tr 
                  key={`${issue.school}-${issue.field}-${issue.problem}`} 
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isDarkMode ? "hover:bg-slate-900/40 text-slate-300" : "hover:bg-slate-50/40 text-slate-700"
                  )}
                >
                  <td className="px-5 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                      issue.gravity === "Bloquant" 
                        ? (isDarkMode ? "bg-rose-950/50 border-rose-800/50 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-700")
                        : (isDarkMode ? "bg-amber-950/50 border-amber-800/50 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-700")
                    )}>
                      {issue.gravity === "Bloquant" ? <ShieldAlert size={13} /> : <AlertTriangle size={13} />}
                      {issue.gravity}
                    </span>
                  </td>
                  <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>{issue.school}</td>
                  <td className="px-5 py-4">{issue.section}</td>
                  <td className="px-5 py-4 text-slate-400">{issue.field}</td>
                  <td className="px-5 py-4 font-black text-indigo-400">{issue.value}</td>
                  <td className="px-5 py-4">{issue.problem}</td>
                  <td className="px-5 py-4 text-xs font-normal text-slate-400">{issue.correction}</td>
                  <td className="px-5 py-4">{issue.status}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toast.info(`Détail du problème: ${issue.problem}`)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-indigo-400 hover:bg-slate-800" : "border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => toast.success(`Correction appliquée: ${issue.correction}`)}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-emerald-400 hover:bg-slate-800" : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                        )}
                      >
                        <Wrench size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
