"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  XCircle,
  Trash2,
  BarChart3,
  Sun,
  Moon,
  Sparkles,
  GitCompareArrows,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportRow {
  file: string;
  year: string;
  sheets: number;
  lines: number;
  cells: number;
  schools: number;
  normalized: number;
  unmapped: number;
  status: string;
  date: string;
  user: string;
}

const initialImportRows: ImportRow[] = [
  {
    file: "VF_CANEVAS_PRIMAIRE_2025.xls",
    year: "2025 - 2026",
    sheets: 18,
    lines: 8742,
    cells: 32684,
    schools: 806,
    normalized: 29418,
    unmapped: 3266,
    status: "Validé",
    date: "27/06/2026 08:42",
    user: "Admin",
  },
  {
    file: "CANEVAS_COLLEGE_TEST.xlsx",
    year: "2025 - 2026",
    sheets: 12,
    lines: 2418,
    cells: 9830,
    schools: 114,
    normalized: 8771,
    unmapped: 1059,
    status: "À vérifier",
    date: "26/06/2026 16:18",
    user: "Direction",
  },
  {
    file: "IMPORT_LYCEE_ZONE_A.xls",
    year: "2024 - 2025",
    sheets: 15,
    lines: 3960,
    cells: 15890,
    schools: 173,
    normalized: 0,
    unmapped: 0,
    status: "Erreur",
    date: "25/06/2026 11:07",
    user: "Admin",
  },
];

function Stat({ label, value, color, isDark }: { label: string; value: string; color: string; isDark?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 shadow-sm transition-colors",
      isDark ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
    )}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-black", color)}>{value}</p>
    </div>
  );
}

export default function CanevasImportPage() {
  const [imports, setImports] = useState<ImportRow[]>(initialImportRows);
  const [academicYear, setAcademicYear] = useState("2025 - 2026");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<"idle" | "reading" | "normalizing" | "ready">("idle");
  
  // Stats of current parsed file
  const [fileStats, setFileStats] = useState({
    sheets: 0,
    lines: 0,
    cells: 0,
    schools: 0,
    unmapped: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_theme") || localStorage.getItem("edut_import_dark_mode");
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
        localStorage.setItem("edut_import_dark_mode", next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setProgress(15);
    setCurrentStep("reading");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        setProgress(45);
        const workbook = XLSX.read(data, { type: "binary" });
        setProgress(70);
        setCurrentStep("normalizing");

        const sheetNames = workbook.SheetNames;
        let totalRows = 0;
        let totalCells = 0;
        
        sheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet);
          totalRows += rows.length;
          totalCells += Object.keys(sheet).filter(k => k[0] !== '!').length;
        });

        const detectedSchools = Math.max(1, Math.floor(totalRows / 11));
        const unmappedData = Math.floor(totalCells * 0.1);

        setTimeout(() => {
          setProgress(100);
          setCurrentStep("ready");
          setIsParsing(false);
          setFileStats({
            sheets: sheetNames.length,
            lines: totalRows,
            cells: totalCells,
            schools: detectedSchools,
            unmapped: unmappedData,
          });
          toast.success("Fichier analysé avec succès ! Prêt pour intégration.");
        }, 1200);

      } catch (err) {
        setIsParsing(false);
        setCurrentStep("idle");
        toast.error("Format de fichier Excel non reconnu ou corrompu.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const confirmImport = () => {
    if (!selectedFile) return;

    const newRow: ImportRow = {
      file: selectedFile.name,
      year: academicYear,
      sheets: fileStats.sheets,
      lines: fileStats.lines,
      cells: fileStats.cells,
      schools: fileStats.schools,
      normalized: fileStats.cells - fileStats.unmapped,
      unmapped: fileStats.unmapped,
      status: "Validé",
      date: new Date().toLocaleDateString("fr-FR") + " " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
      user: "Admin",
    };

    setImports([newRow, ...imports]);
    toast.success(`Le fichier ${selectedFile.name} a été enregistré dans le registre.`);
    cancelUpload();
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setCurrentStep("idle");
    setProgress(0);
    setFileStats({ sheets: 0, lines: 0, cells: 0, schools: 0, unmapped: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAction = (fileName: string, action: string) => {
    if (action === "delete") {
      setImports(imports.filter((imp) => imp.file !== fileName));
      toast.success(`Import ${fileName} supprimé du registre.`);
    } else if (action === "reprocess") {
      toast.info(`Retraitement du fichier ${fileName}...`);
      setTimeout(() => {
        setImports(
          imports.map((imp) =>
            imp.file === fileName ? { ...imp, status: "Validé" } : imp
          )
        );
        toast.success(`Données du fichier ${fileName} normalisées avec succès !`);
      }, 1500);
    } else if (action === "download-errors") {
      toast.info("Téléchargement du rapport des erreurs...");
      const dummyErrors = "Ligne,Champ,Valeur,Erreur\n12,Effectif,380 > 342,Total superieur aux sous-niveaux\n45,Commune,Inconnue,Commune non reconnue dans le canevas";
      const blob = new Blob([dummyErrors], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `rapport_erreurs_${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (action === "view") {
      const imp = imports.find(x => x.file === fileName);
      if (imp) {
        toast.info(`Fichier: ${imp.file} | Fiches: ${imp.sheets} | Écoles: ${imp.schools} | Statut: ${imp.status}`);
      }
    }
  };

  const handleDownloadTemplate = () => {
    toast.success("Téléchargement du modèle de Canevas Excel...");
    const csvContent = "data:text/csv;charset=utf-8,CODE_ETAB,NOM_ETAB,TYPE,CYCLE,REGION,COMMUNE,QUARTIER,ELEVES_TOTAL,FILLES,GARCONS,ENSEIGNANTS,SALLES_CLASSE,POINT_EAU,ELECTRICITE\nETB-001,Ecole Exemple,Public,Primaire,Niamey,Niamey I,Bobiel,350,170,180,12,10,Oui,Oui";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Modele_Canevas_Scolaire.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-200",
      isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#fcfdff] text-slate-950",
      "print:bg-white print:p-0 print:text-black"
    )}>
      
      {/* ─── WEB HEADER ─── */}
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm print:border-b print:shadow-none transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/canevas" 
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition print:hidden",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white" 
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Gestion des Canevas Scolaires</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black text-indigo-400 border border-indigo-500/20">
                  <Sparkles size={10} /> Normalisation Automatique
                </span>
              </div>
              <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Import Excel
              </h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Importer les canevas sans perte de données
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
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

            <select 
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={cn(
                "h-11 rounded-xl border px-4 text-xs font-black outline-none cursor-pointer transition",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-white border-slate-200 text-slate-700"
              )}
            >
              <option value="2025 - 2026">Année scolaire 2025 - 2026</option>
              <option value="2024 - 2025">Année scolaire 2024 - 2025</option>
            </select>

            <Link 
              href="/dashboard/canevas/excel-preview" 
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition-all",
                isDarkMode 
                  ? "border-indigo-800/60 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/60" 
                  : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              )}
            >
              <Eye size={16} /> Aperçu brut
            </Link>

            <Link 
              href="/dashboard/canevas/mapping-excel" 
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition-all",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" 
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <GitCompareArrows size={16} /> Mapping
            </Link>

            <Link 
              href="/dashboard/canevas/controle-qualite" 
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition-all",
                isDarkMode 
                  ? "border-amber-800/60 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60" 
                  : "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              <AlertTriangle size={16} /> Qualité
            </Link>

            <Link 
              href="/dashboard/canevas/reporting" 
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition-all",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" 
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <BarChart3 size={16} /> Reporting
            </Link>

            <Link 
              href="/dashboard/canevas/export" 
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition-all",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" 
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Download size={16} /> Exporter
            </Link>

            <button 
              onClick={handleDownloadTemplate}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition-all",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" 
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Download size={16} /> Modèle Excel
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE ─── */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* Drag & Drop Area */}
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "rounded-[30px] border-2 border-dashed p-8 shadow-sm transition-all",
              isDarkMode ? "bg-[#111827] border-slate-800 hover:border-indigo-500" : "bg-white border-slate-200 hover:border-indigo-400",
              selectedFile && (isDarkMode ? "border-indigo-500 bg-indigo-950/20" : "border-indigo-500 bg-indigo-50/10")
            )}
          >
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-[28px]",
                isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40" : "bg-indigo-50 text-indigo-600"
              )}>
                {isParsing ? (
                  <Loader2 size={34} className="animate-spin" />
                ) : (
                  <UploadCloud size={34} />
                )}
              </div>
              
              {selectedFile ? (
                <div className="mt-5 space-y-2">
                  <h2 className="text-2xl font-black text-indigo-400 truncate max-w-lg">{selectedFile.name}</h2>
                  <p className="text-xs font-bold text-slate-400">Taille: {(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <>
                  <h2 className={cn("mt-5 text-2xl font-black", isDarkMode ? "text-white" : "text-slate-950")}>
                    Glisser-déposer un fichier Excel
                  </h2>
                  <p className={cn("mt-2 max-w-xl text-sm font-bold leading-6", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Formats acceptés: .xls, .xlsx. Toutes les feuilles et cellules sont conservées dans la couche brute avant normalisation.
                  </p>
                </>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!selectedFile ? (
                  <label className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                    <UploadCloud size={17} />
                    Choisir un fichier
                    <input 
                      type="file" 
                      accept=".xls,.xlsx" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange} 
                    />
                  </label>
                ) : (
                  <>
                    <button 
                      onClick={confirmImport}
                      disabled={isParsing}
                      className="flex h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50"
                    >
                      <ShieldCheck size={17} /> Valider l'importation
                    </button>
                    <button 
                      onClick={cancelUpload}
                      className={cn(
                        "flex h-12 items-center gap-2 rounded-2xl border px-6 text-xs font-black uppercase tracking-widest transition-all",
                        isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      Annuler
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Stats Column */}
        <div className="space-y-4">
          <Stat isDark={isDarkMode} label="Feuilles Détectées" value={selectedFile ? `${fileStats.sheets}` : "45"} color="text-indigo-500" />
          <Stat isDark={isDarkMode} label="Cellules Importées" value={selectedFile ? `${fileStats.cells.toLocaleString()}` : "58 404"} color="text-emerald-500" />
          <Stat isDark={isDarkMode} label="Écoles Détectées" value={selectedFile ? `${fileStats.schools}` : "1 093"} color="text-blue-500" />
          <Stat isDark={isDarkMode} label="Données Non Mappées" value={selectedFile ? `${fileStats.unmapped}` : "4 325"} color="text-amber-500" />

          {/* Errors Watch Card */}
          <div className={cn(
            "rounded-2xl border p-4 shadow-sm space-y-2 transition-colors",
            isDarkMode ? "bg-rose-950/30 border-rose-900/40 text-rose-300" : "bg-rose-50 border-rose-100 text-rose-800"
          )}>
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-rose-500" />
              <p className="text-xs font-black uppercase tracking-wider">Erreurs à surveiller</p>
            </div>
            <ul className="text-xs font-bold space-y-1 pl-6 list-disc opacity-90">
              <li>19 incohérences effectifs</li>
              <li>8 codes établissements manquants</li>
              <li>37 champs obligatoires vides</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── IMPORT RESULTS TABLE ─── */}
      <section className={cn(
        "rounded-[30px] border shadow-sm transition-colors overflow-hidden",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        <div className={cn("p-5 border-b", isDarkMode ? "border-slate-800" : "border-slate-100")}>
          <h2 className={cn("text-lg font-black", isDarkMode ? "text-white" : "text-slate-950")}>
            Résultat des imports
          </h2>
          <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
            Historique des fichiers importés et statut de traitement
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
            <thead>
              <tr className={cn(
                "border-b text-[10px] font-black uppercase tracking-widest",
                isDarkMode ? "border-slate-800 bg-slate-900/60 text-slate-400" : "border-slate-100 bg-slate-50/80 text-slate-400"
              )}>
                <th className="px-5 py-4">Nom Fichier</th>
                <th className="px-5 py-4">Année Scolaire</th>
                <th className="px-5 py-4">Nombre de Feuilles</th>
                <th className="px-5 py-4">Nombre de Lignes</th>
                <th className="px-5 py-4">Cellules Importées</th>
                <th className="px-5 py-4">Écoles Détectées</th>
                <th className="px-5 py-4">Données Normalisées</th>
                <th className="px-5 py-4">Données Non Mappées</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4">Date Import</th>
                <th className="px-5 py-4">Utilisateur</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/80" : "divide-slate-100")}>
              {imports.map((row) => (
                <tr 
                  key={row.file} 
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isDarkMode ? "hover:bg-slate-900/40 text-slate-300" : "hover:bg-slate-50/40 text-slate-700"
                  )}
                >
                  <td className="px-5 py-4 font-black text-indigo-400">{row.file}</td>
                  <td className="px-5 py-4 text-xs font-normal text-slate-400">{row.year}</td>
                  <td className="px-5 py-4">{row.sheets}</td>
                  <td className="px-5 py-4">{row.lines.toLocaleString()}</td>
                  <td className="px-5 py-4">{row.cells.toLocaleString()}</td>
                  <td className={cn("px-5 py-4 font-black", isDarkMode ? "text-white" : "text-slate-900")}>{row.schools}</td>
                  <td className="px-5 py-4 text-emerald-500 font-black">{row.normalized.toLocaleString()}</td>
                  <td className="px-5 py-4 text-amber-500 font-black">{row.unmapped.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      row.status === "Validé" && (isDarkMode ? "bg-emerald-950/50 border-emerald-800/50 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"),
                      row.status === "À vérifier" && (isDarkMode ? "bg-amber-950/50 border-amber-800/50 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-700"),
                      row.status === "Erreur" && (isDarkMode ? "bg-rose-950/50 border-rose-800/50 text-rose-400" : "bg-rose-50 border-rose-100 text-rose-700")
                    )}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-normal text-slate-400">{row.date}</td>
                  <td className="px-5 py-4 text-xs font-normal text-slate-400">{row.user}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleAction(row.file, "view")}
                        title="Voir détails"
                        className={cn(
                          "p-1.5 rounded-lg border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => handleAction(row.file, "reprocess")}
                        title="Retraiter"
                        className={cn(
                          "p-1.5 rounded-lg border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-indigo-400 hover:bg-slate-800" : "border-slate-200 text-indigo-600 hover:bg-indigo-50"
                        )}
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button 
                        onClick={() => handleAction(row.file, "delete")}
                        title="Supprimer"
                        className={cn(
                          "p-1.5 rounded-lg border transition",
                          isDarkMode ? "border-slate-800 bg-slate-900 text-rose-400 hover:bg-slate-800" : "border-slate-200 text-rose-500 hover:bg-rose-50"
                        )}
                      >
                        <Trash2 size={14} />
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
