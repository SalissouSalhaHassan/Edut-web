"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  Calendar,
  User,
  School,
  CheckCircle2,
  Loader2,
  XCircle,
  Printer,
  ChevronRight,
  Info,
  Sun,
  Moon,
  Search,
  Sparkles,
  RotateCcw,
  Layers,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportHistoryRow {
  id: string;
  date: string;
  type: string;
  user: string;
  schools: number;
  sections: string;
  status: "success" | "pending" | "error";
  fileName: string;
}

const initialHistory: ExportHistoryRow[] = [
  {
    id: "EXP-001",
    date: "28/06/2026 11:20",
    type: "Excel Clean Format",
    user: "Administrateur",
    schools: 806,
    sections: "Primaire, Préscolaire",
    status: "success",
    fileName: "Canevas_National_Clean_2026.xlsx",
  },
  {
    id: "EXP-002",
    date: "27/06/2026 15:45",
    type: "PDF Administratif",
    user: "Direction Directe",
    schools: 612,
    sections: "Public uniquement",
    status: "success",
    fileName: "Rapport_Administratif_IEFA_2026.pdf",
  },
  {
    id: "EXP-003",
    date: "26/06/2026 09:12",
    type: "Excel Original Format",
    user: "Administrateur",
    schools: 806,
    sections: "Toutes sections",
    status: "pending",
    fileName: "Canevas_Raw_Backup_2026.xlsx",
  },
  {
    id: "EXP-004",
    date: "24/06/2026 16:30",
    type: "JSON Backup",
    user: "Système (Auto)",
    schools: 806,
    sections: "Base de données brute",
    status: "error",
    fileName: "Database_Dump_Failed.json",
  },
];

export default function CanevasExportPage() {
  const [history, setHistory] = useState<ExportHistoryRow[]>(initialHistory);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_theme") || localStorage.getItem("edut_export_dark_mode");
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
        localStorage.setItem("edut_export_dark_mode", next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredHistory = useMemo(() => {
    return history.filter(row => {
      const matchSearch = searchFilter
        ? row.type.toLowerCase().includes(searchFilter.toLowerCase()) ||
          row.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
          row.user.toLowerCase().includes(searchFilter.toLowerCase()) ||
          row.sections.toLowerCase().includes(searchFilter.toLowerCase())
        : true;
      const matchStatus = statusFilter === "all" || row.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [history, searchFilter, statusFilter]);

  const triggerExport = (typeId: string, typeName: string, format: string) => {
    setIsExporting(typeId);
    toast.info(`Préparation du fichier de type ${typeName}...`);

    setTimeout(() => {
      setIsExporting(null);
      
      const newExport: ExportHistoryRow = {
        id: `EXP-00${history.length + 1}`,
        date: new Date().toLocaleDateString("fr-FR") + " " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
        type: typeName,
        user: "Administrateur",
        schools: 806,
        sections: "Toutes sections",
        status: "success",
        fileName: `Canevas_Export_${Date.now()}.${format}`,
      };

      setHistory([newExport, ...history]);
      toast.success(`${typeName} exporté avec succès !`);

      generateAndDownloadFile(newExport.fileName, typeName);
    }, 1200);
  };

  const generateAndDownloadFile = (fileName: string, typeName: string) => {
    const format = fileName.split('.').pop() || "txt";
    let blob: Blob;

    if (format === "xlsx" || format === "xls") {
      const worksheet = XLSX.utils.json_to_sheet([
        { "ID Export": fileName.split('_')[2]?.split('.')[0] || "1", "Nom du Document": typeName, "Date": new Date().toLocaleDateString(), "Structures Concernees": 806 }
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Export Info");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    } else if (format === "pdf") {
      const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 210 >>\nstream\nBT\n/F1 16 Tf\n70 780 Td\n(Edut Pro - Canevas Export) Tj\nET\nBT\n/F1 12 Tf\n70 740 Td\n(Fichier: ${fileName}) Tj\nET\nBT\n/F2 11 Tf\n70 715 Td\n(Exportation: ${typeName}) Tj\nET\nBT\n/F2 10 Tf\n70 690 Td\n(Date: ${new Date().toLocaleDateString()}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000305 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n565\n%%EOF`;
      blob = new Blob([pdfContent], { type: "application/pdf" });
    } else if (format === "csv") {
      const csvContent = "CODE,NOM,REGION,COMMUNE,EFFECTIFS,ENSEIGNANTS,STATUS\nETB-001,Ecole Excellence,Niamey,Niamey IV,642,24,Valide\nETB-018,Ecole Primaire Bobiel,Niamey,Niamey I,481,16,En attente\nETB-043,Complexe Scolaire Sahel,Niamey,Niamey II,934,41,Valide\n";
      blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    } else {
      const jsonContent = JSON.stringify({
        metadata: {
          exportId: fileName,
          type: typeName,
          date: new Date().toISOString(),
          version: "1.0",
        },
        stats: {
          totalSchools: 806,
          validated: 750,
        }
      }, null, 2);
      blob = new Blob([jsonContent], { type: "application/json" });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const deleteHistory = (id: string) => {
    setHistory(history.filter(item => item.id !== id));
    toast.success("Enregistrement supprimé");
  };

  const downloadHistoryFile = (fileName: string, typeName: string) => {
    generateAndDownloadFile(fileName, typeName);
    toast.success(`Téléchargement de ${fileName}...`);
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-200",
      isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#fcfdff] text-slate-950",
      "print:bg-white print:p-0 print:text-black"
    )}>
      
      {/* ─── WEB HEADER ─── */}
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm print:hidden transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/canevas" 
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white" 
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Download size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Gestion des Canevas Scolaires</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black text-indigo-400 border border-indigo-500/20">
                  <Sparkles size={10} /> Hub d'Exportation
                </span>
              </div>
              <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Export des Canevas
              </h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Exportez vos données brutes ou propres dans divers formats normalisés
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

            <button 
              onClick={() => window.print()} 
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition active:scale-95",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" 
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Printer size={15} /> Imprimer registre
            </button>
          </div>
        </div>
      </header>

      {/* ─── EXPORT OPTIONS CARDS ─── */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 print:hidden">
        {[
          {
            id: "excel_raw",
            name: "Excel Format Original",
            desc: "Format identique au canevas brut importé, fiches conservées.",
            icon: FileSpreadsheet,
            colorLight: "text-emerald-600",
            colorDark: "text-emerald-400",
            bgLight: "bg-emerald-50",
            bgDark: "dark:bg-emerald-950/40",
            borderLight: "border-emerald-100",
            borderDark: "dark:border-emerald-900/40",
            format: "xlsx",
          },
          {
            id: "excel_clean",
            name: "Excel Tableau Propre",
            desc: "Tableau plat, structuré, prêt pour traitement informatique.",
            icon: FileSpreadsheet,
            colorLight: "text-indigo-600",
            colorDark: "text-indigo-400",
            bgLight: "bg-indigo-50",
            bgDark: "dark:bg-indigo-950/40",
            borderLight: "border-indigo-100",
            borderDark: "dark:border-indigo-900/40",
            format: "xlsx",
          },
          {
            id: "pdf_admin",
            name: "PDF Administratif",
            desc: "Rapport officiel mis en page sous format A4 normalisé.",
            icon: FileText,
            colorLight: "text-rose-600",
            colorDark: "text-rose-400",
            bgLight: "bg-rose-50",
            bgDark: "dark:bg-rose-950/40",
            borderLight: "border-rose-100",
            borderDark: "dark:border-rose-900/40",
            format: "pdf",
          },
          {
            id: "csv_flat",
            name: "Format CSV",
            desc: "Fichier délimité par des virgules pour import de bases de données.",
            icon: Download,
            colorLight: "text-blue-600",
            colorDark: "text-blue-400",
            bgLight: "bg-blue-50",
            bgDark: "dark:bg-blue-950/40",
            borderLight: "border-blue-100",
            borderDark: "dark:border-blue-900/40",
            format: "csv",
          },
          {
            id: "json_dump",
            name: "Format JSON Backup",
            desc: "Export complet structuré de l'arbre de données canevas.",
            icon: FileJson,
            colorLight: "text-violet-600",
            colorDark: "text-violet-400",
            bgLight: "bg-violet-50",
            bgDark: "dark:bg-violet-950/40",
            borderLight: "border-violet-100",
            borderDark: "dark:border-violet-900/40",
            format: "json",
          },
        ].map((card) => {
          const Icon = card.icon;
          const loading = isExporting === card.id;
          return (
            <div 
              key={card.id} 
              className={cn(
                "rounded-[26px] border p-5 shadow-sm transition hover:shadow-lg flex flex-col justify-between min-h-[220px]",
                isDarkMode 
                  ? cn("bg-[#111827]", card.borderDark, "hover:border-slate-700") 
                  : cn("bg-white", card.borderLight)
              )}
            >
              <div>
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl",
                  card.bgLight, card.bgDark, isDarkMode ? card.colorDark : card.colorLight
                )}>
                  <Icon size={20} />
                </div>
                <h3 className={cn("mt-4 text-sm font-black leading-snug", isDarkMode ? "text-white" : "text-slate-900")}>
                  {card.name}
                </h3>
                <p className="mt-2 text-xs font-semibold text-slate-400 leading-normal">{card.desc}</p>
              </div>

              <button 
                onClick={() => triggerExport(card.id, card.name, card.format)}
                disabled={isExporting !== null}
                className={cn(
                  "mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer disabled:opacity-40",
                  card.bgLight, card.bgDark, isDarkMode ? card.colorDark : card.colorLight
                )}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    Générer <ChevronRight size={14} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </section>

      {/* ─── HISTORICAL EXPORTS TABLE ─── */}
      <section className={cn(
        "rounded-[30px] border shadow-sm transition-colors overflow-hidden",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        <div className={cn(
          "flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-center lg:justify-between print:hidden",
          isDarkMode ? "border-slate-800" : "border-slate-100"
        )}>
          <div>
            <h2 className={cn("text-lg font-black", isDarkMode ? "text-white" : "text-slate-950")}>
              Historique des exportations
            </h2>
            <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              Registre et téléchargement de toutes les sauvegardes exportées ({filteredHistory.length} exports)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filtrer l'historique..."
                className={cn(
                  "w-full h-10 pl-9 pr-3 rounded-xl border text-xs font-bold outline-none transition placeholder:text-slate-400",
                  isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-slate-50/50 border-slate-200 text-slate-800"
                )}
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={cn(
                "h-10 px-3 rounded-xl border text-xs font-bold outline-none cursor-pointer transition",
                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50/50 border-slate-200 text-slate-700"
              )}
            >
              <option value="all">Tous statuts</option>
              <option value="success">Succès</option>
              <option value="pending">En cours</option>
              <option value="error">Erreurs</option>
            </select>

            <div className={cn(
              "flex items-center gap-2 text-xs font-bold p-2 px-3 rounded-xl border",
              isDarkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
            )}>
              <Info size={14} className="text-indigo-500" />
              <span>Conservés 30 jours</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm print:border print:border-slate-300">
            <thead>
              <tr className={cn(
                "border-b text-[10px] font-black uppercase tracking-widest",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900/60 text-slate-400" 
                  : "border-slate-100 bg-slate-50/80 text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-black"
              )}>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Date export</th>
                <th className="px-5 py-4">Type export</th>
                <th className="px-5 py-4">Utilisateur</th>
                <th className="px-5 py-4">Nombre d'écoles</th>
                <th className="px-5 py-4">Sections incluses</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/80" : "divide-slate-100 print:divide-slate-300")}>
              {filteredHistory.map((row) => (
                <tr 
                  key={row.id} 
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isDarkMode ? "hover:bg-slate-900/40 text-slate-300" : "hover:bg-slate-50/40 text-slate-700 print:text-black"
                  )}
                >
                  <td className="px-5 py-4 text-indigo-500 font-black">{row.id}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-normal print:text-black">
                      <Calendar size={13} className="print:hidden" /> {row.date}
                    </span>
                  </td>
                  <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>{row.type}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-normal print:text-black">
                      <User size={13} className="print:hidden" /> {row.user}
                    </span>
                  </td>
                  <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                    <span className="flex items-center gap-1.5">
                      <School size={13} className="text-slate-400 print:hidden" /> {row.schools}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-normal text-slate-400 print:text-black">{row.sections}</td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      row.status === "success" && (isDarkMode ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"),
                      row.status === "pending" && (isDarkMode ? "bg-amber-950/50 border-amber-800/50 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-700"),
                      row.status === "error" && (isDarkMode ? "bg-rose-950/50 border-rose-800/50 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-700")
                    )}>
                      {row.status === "success" && <CheckCircle2 size={10} className="print:hidden" />}
                      {row.status === "pending" && <Loader2 size={10} className="animate-spin print:hidden" />}
                      {row.status === "error" && <XCircle size={10} className="print:hidden" />}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 print:hidden">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => downloadHistoryFile(row.fileName, row.type)}
                        disabled={row.status !== "success"}
                        title="Télécharger"
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:opacity-30",
                          isDarkMode 
                            ? "border-slate-800 bg-slate-900 text-indigo-400 hover:bg-slate-800" 
                            : "border-slate-200 text-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        <Download size={14} />
                      </button>
                      <button 
                        onClick={() => deleteHistory(row.id)}
                        title="Supprimer"
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                          isDarkMode 
                            ? "border-slate-800 bg-slate-900 text-rose-400 hover:bg-slate-800" 
                            : "border-slate-200 text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                    Aucun export correspondant trouvé.
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
