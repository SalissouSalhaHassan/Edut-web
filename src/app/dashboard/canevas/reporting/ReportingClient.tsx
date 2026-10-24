"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  FileText,
  ArrowLeft,
  Building2,
  Users,
  CheckCircle2,
  Filter,
  Sun,
  Moon,
  Search,
  MoreVertical,
  Copy,
  Share2,
  Printer,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import UniversalReport from "@/components/reporting/universal-report";

// List of 16 required reports with categories
interface ReportItem {
  id: string;
  label: string;
  desc: string;
  category: "direction" | "eleves" | "personnel" | "infra" | "territoire";
}

const reportTypes: ReportItem[] = [
  { id: "global", label: "Rapport global des établissements", desc: "Synthèse générale de toutes les structures scolaires", category: "direction" },
  { id: "identification", label: "Rapport identification", desc: "Informations d'identification administrative des écoles", category: "direction" },
  { id: "public_prive", label: "Rapport public/privé", desc: "Comparatif sectoriel public et privé", category: "direction" },
  
  { id: "effectifs", label: "Rapport effectifs élèves", desc: "Nombre d'élèves par niveau et par cycle", category: "eleves" },
  { id: "filles_garcons", label: "Rapport filles/garçons", desc: "Indice de parité et répartition par genre", category: "eleves" },
  { id: "redoublants", label: "Rapport redoublants", desc: "Statistiques de redoublement par classe et genre", category: "eleves" },
  
  { id: "personnel", label: "Rapport personnel", desc: "Nombre d'enseignants, directeurs et statuts professionnels", category: "personnel" },
  { id: "guides", label: "Rapport guides pédagogiques", desc: "Disponibilité des guides pédagogiques pour enseignants", category: "personnel" },
  
  { id: "infrastructures", label: "Rapport infrastructures", desc: "État des salles de classe, bureaux et équipements", category: "infra" },
  { id: "mobilier", label: "Rapport mobilier", desc: "Disponibilité des tables-bancs, armoires et chaises", category: "infra" },
  { id: "manuels", label: "Rapport manuels", desc: "Ratio de manuels scolaires par élève et discipline", category: "infra" },
  { id: "besoins", label: "Rapport besoins", desc: "Synthèse des besoins prioritaires formulés par les écoles", category: "infra" },
  
  { id: "commune", label: "Rapport par commune", desc: "Répartition géographique et synthèse par commune", category: "territoire" },
  { id: "inspection", label: "Rapport par inspection", desc: "Synthèse par Inspection de l'Enseignement (IEFA)", category: "territoire" },
  { id: "qualite", label: "Rapport contrôle qualité", desc: "Taux de complétude et détection des anomalies de saisie", category: "territoire" },
  { id: "non_mappe", label: "Rapport données non mappées", desc: "Champs bruts conservés lors des imports Excel", category: "territoire" },
];

type CategoryTab = "all" | "direction" | "eleves" | "personnel" | "infra" | "territoire";

interface ReportingClientProps {
  sessions?: any[];
  activeSessionName?: string;
  headerConfig?: any | null;
  initialCanevasReferences?: {
    type?: any[];
    cycle?: any[];
    commune?: any[];
  };
  educationalLevels?: any[];
}

export default function ReportingClient({
  sessions = [],
  activeSessionName,
  headerConfig,
  initialCanevasReferences,
  educationalLevels = []
}: ReportingClientProps) {
  const [selectedReport, setSelectedReport] = useState("global");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [reportSearch, setReportSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryTab>("all");
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize Dark Mode & Close options on outside click
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_theme") || localStorage.getItem("edut_reporting_dark_mode");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setIsDarkMode(true);
      }
    } catch {
      // ignore
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem("edut_theme", next ? "dark" : "light");
        localStorage.setItem("edut_reporting_dark_mode", next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Dynamic References
  const communesList = Array.from(new Set([
    "Niamey I", "Niamey II", "Niamey III", "Niamey IV", "Niamey V",
    ...(initialCanevasReferences?.commune || []).map((c: any) => c.value || c)
  ]));

  // Filters state
  const defaultSession = activeSessionName || "2026-2027";
  const [year, setYear] = useState(defaultSession);
  const [region, setRegion] = useState("Niamey");
  const [commune, setCommune] = useState("Toutes");
  const [inspection, setInspection] = useState("Toutes");
  const [establishment, setEstablishment] = useState("");

  const activeReport = reportTypes.find((r) => r.id === selectedReport) || reportTypes[0];

  // Filtered reports for sidebar
  const filteredReportTypes = useMemo(() => {
    return reportTypes.filter(r => {
      const matchCategory = activeCategory === "all" || r.category === activeCategory;
      const matchSearch = reportSearch
        ? r.label.toLowerCase().includes(reportSearch.toLowerCase()) || r.desc.toLowerCase().includes(reportSearch.toLowerCase())
        : true;
      return matchCategory && matchSearch;
    });
  }, [activeCategory, reportSearch]);

  // Helper to generate dynamic mock data for each report type
  const getReportData = (id: string) => {
    switch (id) {
      case "identification":
        return {
          title: "RAPPORT D'IDENTIFICATION",
          subtitle: "Données administratives et géographiques des structures",
          description: "Ce rapport répertorie les coordonnées géographiques, codes officiels, contacts et types d'accès de tous les établissements.",
          kpis: [
            { label: "Total Écoles", value: "5", subtext: "100% gérées", icon: <Building2 />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Mise à jour", value: "100%", subtext: "Aucun retard", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          ],
          table: {
            headers: ["Code", "Établissement", "Statut Légal", "Région", "Commune", "Quartier", "Contact"],
            rows: [
              ["ETB-001", "Ecole Excellence", "Privé Agréé", "Niamey", "Commune IV", "Yantala", "+227 96 00 11 22"],
              ["ETB-018", "Ecole Primaire Bobiel", "Public Officiel", "Niamey", "Commune I", "Bobiel", "+227 90 33 44 55"],
              ["ETB-043", "Complexe Scolaire Sahel", "Privé Agréé", "Niamey", "Commune II", "Plateau", "+227 89 22 33 44"],
              ["ETB-067", "Ecole Publique Lazaret", "Public Officiel", "Niamey", "Commune III", "Lazaret", "+227 94 44 55 66"],
              ["ETB-104", "Lycee Municipal Est", "Public Officiel", "Niamey", "Commune V", "Aeroport", "+227 91 55 66 77"],
            ],
            summary: [
              { label: "Écoles Publiques", value: "3", color: "text-indigo-600" },
              { label: "Écoles Privées", value: "2", color: "text-violet-600" }
            ]
          }
        };

      case "effectifs":
        return {
          title: "RAPPORT DES EFFECTIFS ÉLÈVES",
          subtitle: "Répartition des inscriptions scolaires par cycle",
          description: "Indicateurs détaillés sur le nombre d'élèves par cycle et par classe dans l'ensemble des établissements d'inspection.",
          kpis: [
            { label: "Total Élèves", value: "3 663", subtext: "Inscrits validés", icon: <Users />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Filles Inscrites", value: "1 789", subtext: "48.8% de l'effectif", icon: <Users />, color: "text-pink-600", bgColor: "bg-pink-50" },
            { label: "Garçons Inscrits", value: "1 874", subtext: "51.2% de l'effectif", icon: <Users />, color: "text-blue-600", bgColor: "bg-blue-50" },
          ],
          table: {
            headers: ["Code", "Établissement", "Cycle", "Garçons", "Filles", "Total Éléves"],
            rows: [
              ["ETB-001", "Ecole Excellence", "Primaire", "324", "318", "642"],
              ["ETB-018", "Ecole Primaire Bobiel", "Primaire", "245", "236", "481"],
              ["ETB-043", "Complexe Scolaire Sahel", "Collège", "482", "452", "934"],
              ["ETB-067", "Ecole Publique Lazaret", "Primaire", "198", "190", "388"],
              ["ETB-104", "Lycee Municipal Est", "Lycée", "625", "593", "1 218"],
            ],
            summary: [
              { label: "Cumul Garçons", value: "1 874", color: "text-blue-600" },
              { label: "Cumul Filles", value: "1 789", color: "text-pink-600" },
              { label: "Cumul Général", value: "3 663", color: "text-indigo-600" }
            ]
          }
        };

      case "filles_garcons":
        return {
          title: "RAPPORT FILLES / GARÇONS",
          subtitle: "Indice de parité de genre par établissement",
          description: "Analyse comparative du taux de scolarisation des filles par rapport aux garçons pour identifier les écarts régionaux.",
          kpis: [
            { label: "Indice Parité", value: "0.95", subtext: "Objectif national 1.00", icon: <Users />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Taux Scolarité Filles", value: "48.8%", subtext: "+1.2% vs l'an dernier", icon: <Users />, color: "text-pink-600", bgColor: "bg-pink-50" },
          ],
          table: {
            headers: ["Établissement", "Effectif Filles", "Taux Filles (%)", "Effectif Garçons", "Taux Garçons (%)", "Indice Parité"],
            rows: [
              ["Ecole Excellence", "318", "49.5%", "324", "50.5%", "0.98"],
              ["Ecole Primaire Bobiel", "236", "49.0%", "245", "51.0%", "0.96"],
              ["Complexe Scolaire Sahel", "452", "48.4%", "482", "51.6%", "0.94"],
              ["Ecole Publique Lazaret", "190", "49.0%", "198", "51.0%", "0.96"],
              ["Lycee Municipal Est", "593", "48.7%", "625", "51.3%", "0.95"],
            ],
            summary: [
              { label: "Moyenne Indice Parité", value: "0.95", color: "text-emerald-600" }
            ]
          }
        };

      case "personnel":
        return {
          title: "RAPPORT DU PERSONNEL ENSEIGNANT",
          subtitle: "Répartition et encadrement pédagogique",
          description: "Synthèse des ressources humaines enseignantes, taux de qualification et ratios élèves par enseignant.",
          kpis: [
            { label: "Total Staff", value: "151", subtext: "Enseignants actifs", icon: <Users />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Ratio Élèves/Prof", value: "24", subtext: "Moyenne nationale : 35", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          ],
          table: {
            headers: ["Établissement", "Directeur", "Profs Titulaires", "Profs Contractuels", "Total Personnel", "Ratio Élèves/Prof"],
            rows: [
              ["Ecole Excellence", "M. Kazi", "18", "6", "24", "27"],
              ["Ecole Primaire Bobiel", "Mme Sani", "10", "6", "16", "30"],
              ["Complexe Scolaire Sahel", "M. Issa", "28", "13", "41", "23"],
              ["Ecole Publique Lazaret", "Mme Ouma", "8", "5", "13", "30"],
              ["Lycee Municipal Est", "M. Bako", "42", "16", "58", "21"],
            ],
            summary: [
              { label: "Titulaires", value: "106", color: "text-indigo-600" },
              { label: "Contractuels", value: "46", color: "text-violet-600" }
            ]
          }
        };

      case "infrastructures":
        return {
          title: "RAPPORT DES INFRASTRUCTURES",
          subtitle: "État des locaux et équipements scolaires",
          description: "Diagnostic de la structure matérielle des écoles : salles de classe disponibles, alimentation eau/électricité.",
          kpis: [
            { label: "Total Salles", value: "94", subtext: "Salles de classe", icon: <Building2 />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Accès Eau", value: "80%", subtext: "4/5 Établissements", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
            { label: "Accès Électricité", value: "80%", subtext: "4/5 Établissements", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          ],
          table: {
            headers: ["Établissement", "Salles de classe", "État général", "Point d'eau", "Électricité", "Latrines"],
            rows: [
              ["Ecole Excellence", "18", "Excellent", "Oui", "Oui", "Disponible (12)"],
              ["Ecole Primaire Bobiel", "12", "Bon", "Non", "Oui", "Disponible (6)"],
              ["Complexe Scolaire Sahel", "26", "Très Bon", "Oui", "Oui", "Disponible (18)"],
              ["Ecole Publique Lazaret", "9", "À rénover", "Oui", "Non", "Inexistant"],
              ["Lycee Municipal Est", "34", "Excellent", "Oui", "Oui", "Disponible (24)"],
            ],
            summary: [
              { label: "Total Salles", value: "94", color: "text-indigo-600" }
            ]
          }
        };

      default:
        return {
          title: "RAPPORT GLOBAL DES ÉTABLISSEMENTS",
          subtitle: "Synthèse générale des canevas scolaires",
          description: "Ce rapport récapitule l'ensemble des données clés des écoles pour l'inspection académique active.",
          kpis: [
            { label: "Établissements", value: "5", subtext: "Registre actif", icon: <Building2 />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
            { label: "Publics", value: "3", subtext: "Secteur d'État", icon: <CheckCircle2 />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
            { label: "Privés", value: "2", subtext: "Secteur Libre", icon: <Building2 />, color: "text-violet-600", bgColor: "bg-violet-50" },
            { label: "Total Élèves", value: "3 663", subtext: "Effectif global", icon: <Users />, color: "text-blue-600", bgColor: "bg-blue-50" },
          ],
          table: {
            headers: ["Code", "Établissement", "Type", "Cycle", "Région", "Commune", "Élèves", "Statut"],
            rows: [
              ["ETB-2026-001", "Ecole Excellence", "Prive", "Primaire", "Niamey", "Niamey IV", "642", "Valide"],
              ["ETB-2026-018", "Ecole Primaire Bobiel", "Public", "Primaire", "Niamey", "Niamey I", "481", "A verifier"],
              ["ETB-2026-043", "Complexe Scolaire Sahel", "Prive", "College", "Niamey", "Niamey II", "934", "Valide"],
              ["ETB-2026-067", "Ecole Publique Lazaret", "Public", "Primaire", "Niamey", "Niamey III", "388", "Incomplet"],
              ["ETB-2026-104", "Lycee Municipal Est", "Public", "Lycee", "Niamey", "Niamey V", "1218", "Valide"],
            ],
            summary: [
              { label: "Nombre d'établissements", value: "5", color: "text-slate-500" },
              { label: "Effectif cumulé", value: "3 663", color: "text-indigo-600" }
            ]
          }
        };
    }
  };

  const reportData = getReportData(selectedReport);

  const handleSendEmailDone = (email: string) => {
    toast.success(`Rapport envoyé par email à : ${email}`);
    return true;
  };

  const handleCopySummary = () => {
    const text = `=== ${reportData.title} ===
Sous-titre: ${reportData.subtitle}
Année Scolaire: ${year} | Région: ${region} | Commune: ${commune}
${reportData.kpis.map(k => `${k.label}: ${k.value} (${k.subtext || ''})`).join(' | ')}
Extrait le: ${new Date().toLocaleDateString('fr-FR')}`;

    navigator.clipboard.writeText(text);
    toast.success("Résumé du rapport copié dans le presse-papiers !");
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `📊 *${reportData.title}* (${year})\n` +
      `🏛️ ${reportData.subtitle}\n` +
      `📍 Région: ${region} - Commune: ${commune}\n` +
      `📈 ${reportData.kpis.map(k => `${k.label}: *${k.value}*`).join(' • ')}\n` +
      `_Généré via Edut Pro Canevas Reporting_`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleResetFilters = () => {
    setYear(defaultSession);
    setRegion("Niamey");
    setCommune("Toutes");
    setInspection("Toutes");
    setEstablishment("");
    setReportSearch("");
    setActiveCategory("all");
    toast.info("Tous les filtres ont été réinitialisés.");
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-200",
      isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#fcfdff] text-slate-950",
      "print:bg-white print:p-0 print:m-0 print:w-full print:min-h-0"
    )}>
      
      {/* ─── WEB HEADER (Hidden on print) ─── */}
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
              <FileText size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Gestion des Canevas Scolaires</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black text-indigo-400 border border-indigo-500/20">
                  <Sparkles size={10} /> 16 Rapports Officiels
                </span>
              </div>
              <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Centre de Reporting
              </h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Générez et exportez des rapports administratifs d'impression A4
              </p>
            </div>
          </div>

          {/* Header Right Actions */}
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

            {/* Advanced Options Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOptionsOpen(prev => !prev);
                }}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-wider transition",
                  isDarkMode 
                    ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" 
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <MoreVertical size={16} className="text-indigo-500" />
                <span>Options & Actions</span>
                <ChevronDown size={14} className={cn("transition-transform duration-200", isOptionsOpen && "rotate-180")} />
              </button>

              {isOptionsOpen && (
                <div className={cn(
                  "absolute right-0 mt-2 w-64 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95",
                  isDarkMode ? "bg-[#111827] border-slate-800 text-slate-200 shadow-black/70" : "bg-white border-slate-100 text-slate-800 shadow-slate-200/50"
                )}>
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions Rapides</p>
                  </div>
                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        handleCopySummary();
                        setIsOptionsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition",
                        isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <Copy size={15} className="text-indigo-500" />
                      <span>Copier le résumé du rapport</span>
                    </button>
                    <button
                      onClick={() => {
                        handleShareWhatsApp();
                        setIsOptionsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition text-emerald-500",
                        isDarkMode ? "hover:bg-slate-800" : "hover:bg-emerald-50"
                      )}
                    >
                      <Share2 size={15} />
                      <span>Partager par WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        window.print();
                        setIsOptionsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition",
                        isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <Printer size={15} className="text-cyan-500" />
                      <span>Imprimer le document</span>
                    </button>
                    <button
                      onClick={() => {
                        handleResetFilters();
                        setIsOptionsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition text-slate-400",
                        isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                      )}
                    >
                      <RotateCcw size={15} />
                      <span>Réinitialiser les filtres</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── FILTERS PANEL (Hidden on print) ─── */}
      <section className={cn(
        "rounded-[28px] border p-5 shadow-sm print:hidden transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        <div className="flex items-center gap-2 mb-4">
          <Filter size={17} className="text-indigo-500" />
          <h2 className={cn("text-sm font-black", isDarkMode ? "text-slate-100" : "text-slate-900")}>
            Filtres Généraux
          </h2>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Année Scolaire</span>
            <select 
              value={year} 
              onChange={(e) => setYear(e.target.value)} 
              className={cn(
                "w-full h-11 px-3 border rounded-xl outline-none font-semibold text-xs transition cursor-pointer",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-white border-slate-200 text-slate-700"
              )}
            >
              {sessions.map((s: any) => (
                <option key={s.id} value={s.sessionName}>{s.sessionName}</option>
              ))}
              {sessions.length === 0 && (
                <>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                </>
              )}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Région</span>
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)} 
              className={cn(
                "w-full h-11 px-3 border rounded-xl outline-none font-semibold text-xs transition cursor-pointer",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-white border-slate-200 text-slate-700"
              )}
            >
              <option value="Niamey">Niamey</option>
              <option value="Maradi">Maradi</option>
              <option value="Zinder">Zinder</option>
              <option value="Tahoua">Tahoua</option>
              <option value="Dosso">Dosso</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Commune</span>
            <select 
              value={commune} 
              onChange={(e) => setCommune(e.target.value)} 
              className={cn(
                "w-full h-11 px-3 border rounded-xl outline-none font-semibold text-xs transition cursor-pointer",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-white border-slate-200 text-slate-700"
              )}
            >
              <option value="Toutes">Toutes</option>
              {communesList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Inspection</span>
            <select 
              value={inspection} 
              onChange={(e) => setInspection(e.target.value)} 
              className={cn(
                "w-full h-11 px-3 border rounded-xl outline-none font-semibold text-xs transition cursor-pointer",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200" 
                  : "bg-white border-slate-200 text-slate-700"
              )}
            >
              <option value="Toutes">Toutes</option>
              <option value="IEFA I">IEFA I</option>
              <option value="IEFA II">IEFA II</option>
              <option value="Niamey IV">Niamey IV</option>
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase block">Établissement</span>
            <input 
              value={establishment} 
              onChange={(e) => setEstablishment(e.target.value)} 
              placeholder="Ex: Excellence" 
              className={cn(
                "w-full h-11 px-3 border rounded-xl outline-none font-semibold text-xs transition placeholder:text-slate-400",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500" 
                  : "bg-white border-slate-200 text-slate-700 focus:border-indigo-400"
              )}
            />
          </div>
        </div>
      </section>

      {/* ─── MAIN LAYOUT ─── */}
      <section className="grid gap-5 xl:grid-cols-[300px_1fr]">
        
        {/* Left pane: Report selector (Hidden on print) */}
        <div className={cn(
          "rounded-[28px] border p-4 shadow-sm print:hidden flex flex-col gap-3 transition-colors",
          isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
        )}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Types de Rapports</h2>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-bold",
              isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
            )}>
              {filteredReportTypes.length} / {reportTypes.length}
            </span>
          </div>

          {/* Search box for reports */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              placeholder="Chercher un rapport..."
              className={cn(
                "w-full h-9 pl-8 pr-7 rounded-xl border text-xs font-medium outline-none transition placeholder:text-slate-400",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500" 
                  : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-400"
              )}
            />
            {reportSearch && (
              <X 
                size={13} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer" 
                onClick={() => setReportSearch("")} 
              />
            )}
          </div>

          {/* Category Tabs */}
          <div className={cn(
            "flex flex-wrap gap-1 p-1 rounded-xl border",
            isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-slate-100/70 border-slate-200/50"
          )}>
            {[
              { id: "all" as CategoryTab, label: "Tous" },
              { id: "direction" as CategoryTab, label: "Direction" },
              { id: "eleves" as CategoryTab, label: "Élèves" },
              { id: "personnel" as CategoryTab, label: "Staff" },
              { id: "infra" as CategoryTab, label: "Infras" },
              { id: "territoire" as CategoryTab, label: "Territoire" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold transition",
                  activeCategory === tab.id
                    ? (isDarkMode ? "bg-indigo-600 text-white" : "bg-white text-slate-900 shadow-sm")
                    : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List of reports */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-0.5">
            {filteredReportTypes.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl transition text-xs font-bold leading-normal cursor-pointer",
                  selectedReport === r.id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                    : (isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-700")
                )}
              >
                <p className="font-black truncate">{r.label}</p>
                <p className={cn(
                  "text-[10px] mt-0.5 font-medium truncate",
                  selectedReport === r.id ? "text-indigo-100" : "text-slate-400"
                )}>
                  {r.desc}
                </p>
              </button>
            ))}
            {filteredReportTypes.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                Aucun rapport ne correspond.
              </div>
            )}
          </div>
        </div>

        {/* Right pane: UniversalReport component */}
        <div className="w-full">
          <UniversalReport
            metadata={{
              title: reportData.title,
              subtitle: reportData.subtitle,
              moduleName: "GESTION DES CANEVAS SCOLAIRES",
              reportId: `RPT-${selectedReport.toUpperCase()}-2026-0001`,
              academicYear: year,
              editorName: "Admin Super",
              description: reportData.description,
              isLandscape: true,
              documentHeaderConfig: headerConfig,
            }}
            kpis={reportData.kpis}
            table={reportData.table}
            onSendEmail={handleSendEmailDone}
          />
        </div>
        
      </section>

    </div>
  );
}
