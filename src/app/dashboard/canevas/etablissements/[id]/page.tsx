"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Droplets,
  Edit3,
  FileText,
  GraduationCap,
  Home,
  Lightbulb,
  MapPin,
  Phone,
  Printer,
  ShieldCheck,
  Table2,
  UserRoundCheck,
  Users,
  X,
  Clock,
  ArrowUpRight,
  Shield,
  Check,
  Activity,
  FileCheck2,
  AlertCircle,
  FolderLock,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { exportFullFicheDossierPdf } from "@/app/dashboard/canevas/etablissements/canevas-pdf-export";

const establishmentInfo = {
  code: "ETB-2026-001",
  name: "Ecole Excellence",
  type: "Prive",
  cycle: "Primaire",
  ministereId: "MEN-NE-NY4-0001",
  autorisation: "AR-2024-1187",
  region: "Niamey",
  departement: "Niamey",
  commune: "Niamey IV",
  quartier: "Yantala",
  adresse: "Avenue des Ecoles, Yantala Haut",
  telephone: "+227 90 00 00 00",
  email: "contact@ecole-excellence.ne",
  directeur: "Salissou Salha Hassan",
  annee: "2025 - 2026",
  updatedAt: "27/06/2026",
  completion: 98,
};

const kpis = [
  { label: "Total eleves", value: "642", icon: GraduationCap, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-950/50" },
  { label: "Filles", value: "318", icon: Users, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950/50" },
  { label: "Garcons", value: "324", icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/50" },
  { label: "Enseignants", value: "24", icon: UserRoundCheck, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/50" },
  { label: "Salles", value: "18", icon: Building2, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/50" },
  { label: "Completion", value: "98%", icon: CheckCircle2, color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-950/50" },
];

const levels = [
  { niveau: "CI", total: 104, filles: 50, garcons: 54, redoublants: 4 },
  { niveau: "CP", total: 118, filles: 58, garcons: 60, redoublants: 6 },
  { niveau: "CE1", total: 111, filles: 55, garcons: 56, redoublants: 5 },
  { niveau: "CE2", total: 105, filles: 52, garcons: 53, redoublants: 3 },
  { niveau: "CM1", total: 98, filles: 49, garcons: 49, redoublants: 4 },
  { niveau: "CM2", total: 106, filles: 54, garcons: 52, redoublants: 2 },
];

const infrastructure = [
  { label: "Point d'eau", value: "Disponible", icon: Droplets, status: "ok" },
  { label: "Electricite", value: "Disponible", icon: Lightbulb, status: "ok" },
  { label: "Latrines fonctionnelles", value: "12 blocs", icon: Home, status: "ok" },
  { label: "Clôture", value: "Partielle", icon: ShieldCheck, status: "warn" },
];

const needs = [
  { label: "Tables bancs", quantity: 42, priority: "Elevee" },
  { label: "Armoires pedagogiques", quantity: 8, priority: "Moyenne" },
  { label: "Rehabilitation salles", quantity: 2, priority: "Critique" },
];

function InfoLine({ label, value, isDarkMode }: { label: string; value: string; isDarkMode?: boolean }) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-colors",
      isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70"
    )}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("mt-1 text-sm font-black", isDarkMode ? "text-slate-100" : "text-slate-900")}>{value}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle, isDarkMode }: { title: string; subtitle: string; isDarkMode?: boolean }) {
  return (
    <div>
      <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>{title}</h2>
      <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>{subtitle}</p>
    </div>
  );
}

type CanevasStatus = 
  | "Brouillon"
  | "En correction"
  | "Validé école"
  | "Rejeté inspection"
  | "Validé inspection"
  | "Validé DREN"
  | "Transmis ministère"
  | "Archivé";

export default function FicheEtablissementPage() {
  const [status, setStatus] = useState<CanevasStatus>("Brouillon");
  const [rejectionObservation, setRejectionObservation] = useState<string>("");
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [tempObservation, setTempObservation] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync dark mode preference with localStorage
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

  // Handler for state progression
  const handleTransition = (nextStatus: CanevasStatus, successMessage: string) => {
    setStatus(nextStatus);
    toast.success(successMessage);
  };

  const handleRejectSubmit = () => {
    if (!tempObservation.trim()) {
      toast.error("Veuillez saisir une observation pour expliquer le rejet.");
      return;
    }
    setRejectionObservation(tempObservation);
    setStatus("Rejeté inspection");
    setShowRejectModal(false);
    toast.warning("Dossier canevas rejeté avec observation.");
  };

  // Status Badge classes helper
  const getStatusBadgeStyle = (currentStatus: CanevasStatus) => {
    if (isDarkMode) {
      const darkStyles: Record<CanevasStatus, string> = {
        Brouillon: "border-slate-700 bg-slate-800 text-slate-300",
        "En correction": "border-amber-500/30 bg-amber-950/40 text-amber-400",
        "Validé école": "border-blue-500/30 bg-blue-950/40 text-blue-400",
        "Rejeté inspection": "border-rose-500/30 bg-rose-950/40 text-rose-400",
        "Validé inspection": "border-cyan-500/30 bg-cyan-950/40 text-cyan-400",
        "Validé DREN": "border-violet-500/30 bg-violet-950/40 text-violet-400",
        "Transmis ministère": "border-emerald-500/30 bg-emerald-950/40 text-emerald-400",
        Archivé: "border-slate-700 bg-slate-800 text-slate-400",
      };
      return darkStyles[currentStatus] || "bg-slate-800 text-slate-300";
    }

    const lightStyles: Record<CanevasStatus, string> = {
      Brouillon: "border-slate-200 bg-slate-50 text-slate-500",
      "En correction": "border-amber-150 bg-amber-50 text-amber-600",
      "Validé école": "border-blue-150 bg-blue-50 text-blue-700",
      "Rejeté inspection": "border-rose-150 bg-rose-50 text-rose-700",
      "Validé inspection": "border-cyan-150 bg-cyan-50 text-cyan-700",
      "Validé DREN": "border-violet-150 bg-violet-50 text-violet-700",
      "Transmis ministère": "border-emerald-150 bg-emerald-50 text-emerald-600",
      Archivé: "border-slate-300 bg-slate-100 text-slate-700",
    };
    return lightStyles[currentStatus] || "bg-slate-100 text-slate-700";
  };

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-300 print:bg-white print:p-0",
      isDarkMode ? "bg-[#090D16] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-950"
    )}>
      
      {/* Top Header */}
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm print:border-b print:shadow-none transition-colors duration-300",
        isDarkMode
          ? "bg-[#111827]/95 border-slate-800 text-white shadow-xl shadow-black/40 backdrop-blur-md"
          : "bg-white border-slate-200 text-slate-950"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/canevas/etablissements"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border transition print:hidden",
                isDarkMode
                  ? "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Building2 size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Gestion des Canevas Scolaires</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Fiche Etablissement
              </h1>
              <p className={cn("mt-1 text-xs md:text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Dossier complet, contrôle et workflow d'homologation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleDarkMode}
              title={isDarkMode ? "Passer en mode clair" : "Activer le mode sombre"}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all shadow-xs active:scale-95",
                isDarkMode
                  ? "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 hover:border-amber-500/50"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
              <span className="hidden sm:inline font-bold">{isDarkMode ? "Clair" : "Sombre"}</span>
            </button>

            {/* Subpage Nav Links */}
            <Link
              href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/identification`}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode
                  ? "border-indigo-500/40 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/70"
                  : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              )}
            >
              <FileText size={16} /> Identification
            </Link>
            <Link
              href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/groupes-pedagogiques`}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode
                  ? "border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Table2 size={16} /> Groupes
            </Link>
            <Link
              href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/effectifs-eleves`}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode
                  ? "border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Users size={16} /> Effectifs
            </Link>
            <Link
              href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/redoublants`}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode
                  ? "border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <GraduationCap size={16} /> Redoublants
            </Link>
            <Link
              href={`/dashboard/canevas/etablissements/${establishmentInfo.code}/personnel-enseignant`}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode
                  ? "border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <UserRoundCheck size={16} /> Personnel
            </Link>
            <button
              onClick={() => exportFullFicheDossierPdf({
                code: establishmentInfo.code,
                nom: establishmentInfo.name,
                commune: establishmentInfo.commune,
                region: establishmentInfo.region,
                statut: status,
                directeur: establishmentInfo.directeur,
                telephone: establishmentInfo.telephone,
                totalEleves: 642,
                totalEnseignants: 47,
                totalClasses: 20
              })}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition shadow-xs",
                isDarkMode
                  ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              )}
            >
              <Download size={16} /> Exporter Dossier PDF
            </button>
            <button
              onClick={() => window.print()}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isDarkMode
                  ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        
        {/* Left Pane: Detailed school content */}
        <div className="space-y-5">
          
          {/* Main Info Card */}
          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode
              ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/40"
              : "bg-white border-slate-100 text-slate-950"
          )}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-[28px] shrink-0",
                  isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/60" : "bg-indigo-50 text-indigo-600"
                )}>
                  <Building2 size={34} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                      {establishmentInfo.name}
                    </h2>
                    <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", getStatusBadgeStyle(status))}>
                      {status}
                    </span>
                  </div>
                  <p className={cn("mt-2 text-xs md:text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {establishmentInfo.code} · {establishmentInfo.type} · {establishmentInfo.cycle} · {establishmentInfo.annee}
                  </p>
                  <p className={cn("mt-3 flex items-center gap-2 text-xs md:text-sm font-bold", isDarkMode ? "text-slate-300" : "text-slate-600")}>
                    <MapPin size={16} className="text-indigo-500 shrink-0" /> {establishmentInfo.adresse}, {establishmentInfo.commune}
                  </p>
                </div>
              </div>

              <div className={cn(
                "rounded-2xl border p-4 lg:w-64 transition-colors",
                isDarkMode ? "border-indigo-900/60 bg-indigo-950/30 text-indigo-300" : "border-indigo-100 bg-indigo-50/50"
              )}>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Complétude canevas</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className={cn("h-3 flex-1 rounded-full overflow-hidden", isDarkMode ? "bg-slate-800" : "bg-white")}>
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" ? 100 : establishmentInfo.completion}%` }}
                    />
                  </div>
                  <span className={cn("text-sm font-black", isDarkMode ? "text-indigo-300" : "text-indigo-700")}>
                    {status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" ? 100 : establishmentInfo.completion}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection observation warning banner */}
          {status === "Rejeté inspection" && rejectionObservation && (
            <div className={cn(
              "rounded-2xl border p-5 flex items-start gap-3 transition-colors",
              isDarkMode
                ? "border-rose-900/60 bg-rose-950/30 text-rose-300"
                : "border-rose-100 bg-rose-50 text-rose-800"
            )}>
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className={cn("text-sm font-black", isDarkMode ? "text-rose-200" : "text-rose-950")}>
                  Déclaration rejetée par l'inspection
                </h4>
                <p className={cn("text-xs font-bold mt-1", isDarkMode ? "text-rose-300" : "text-rose-800")}>
                  Observation obligatoire : {rejectionObservation}
                </p>
              </div>
            </div>
          )}

          {/* KPIs Section */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-[24px] border p-5 shadow-sm transition-all duration-300",
                    isDarkMode
                      ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20"
                      : "bg-white border-slate-100 text-slate-950"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    isDarkMode ? "bg-slate-800/80" : item.bg,
                    item.color
                  )}>
                    <Icon size={22} />
                  </div>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className={cn("mt-1 text-2xl font-black", isDarkMode ? "text-white" : "text-slate-950")}>{item.value}</p>
                </div>
              );
            })}
          </section>

          {/* Levels distribution */}
          <section className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode
              ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20"
              : "bg-white border-slate-100 text-slate-950"
          )}>
            <SectionTitle title="Effectifs par niveau" subtitle="Répartition filles, garçons et redoublants" isDarkMode={isDarkMode} />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className={cn(
                    "border-b text-[10px] font-black uppercase tracking-widest",
                    isDarkMode ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-400"
                  )}>
                    <th className="py-3">Niveau</th>
                    <th className="py-3">Total</th>
                    <th className="py-3">Filles</th>
                    <th className="py-3">Garçons</th>
                    <th className="py-3">Redoublants</th>
                    <th className="py-3">Taux filles</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800" : "divide-slate-100")}>
                  {levels.map((level) => (
                    <tr
                      key={level.niveau}
                      className={cn(
                        "text-sm font-bold transition-colors",
                        isDarkMode ? "hover:bg-slate-800/40 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <td className="py-4 font-black text-indigo-500">{level.niveau}</td>
                      <td className={cn("py-4 font-black", isDarkMode ? "text-white" : "text-slate-950")}>{level.total}</td>
                      <td className="py-4 text-pink-500">{level.filles}</td>
                      <td className="py-4 text-blue-500">{level.garcons}</td>
                      <td className="py-4">{level.redoublants}</td>
                      <td className="py-4">{Math.round((level.filles / level.total) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Infrastructures and Needs grid */}
          <section className="grid gap-5 lg:grid-cols-2">
            <div className={cn(
              "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
              isDarkMode
                ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20"
                : "bg-white border-slate-100 text-slate-950"
            )}>
              <SectionTitle title="Infrastructures" subtitle="État des équipements principaux" isDarkMode={isDarkMode} />
              <div className="mt-5 grid gap-3">
                {infrastructure.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-4 transition-colors",
                        isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"
                      )}
                    >
                      <div className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-2xl",
                        item.status === "ok"
                          ? (isDarkMode ? "bg-emerald-950/60 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                          : (isDarkMode ? "bg-amber-950/60 text-amber-400" : "bg-amber-50 text-amber-600")
                      )}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className={cn("text-xs font-black", isDarkMode ? "text-white" : "text-slate-950")}>{item.label}</p>
                        <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className={cn(
              "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
              isDarkMode
                ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20"
                : "bg-white border-slate-100 text-slate-950"
            )}>
              <SectionTitle title="Besoins déclarés" subtitle="Demandes et priorités issues du canevas" isDarkMode={isDarkMode} />
              <div className="mt-5 space-y-3">
                {needs.map((need) => (
                  <div
                    key={need.label}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors",
                      isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"
                    )}
                  >
                    <div>
                      <p className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-950")}>{need.label}</p>
                      <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Quantité: {need.quantity}</p>
                    </div>
                    <span className={cn(
                      "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border",
                      need.priority === "Critique"
                        ? (isDarkMode ? "bg-rose-950/40 text-rose-300 border-rose-800/60" : "bg-rose-50 text-rose-700 border-rose-200")
                        : need.priority === "Elevee"
                        ? (isDarkMode ? "bg-amber-950/40 text-amber-300 border-amber-800/60" : "bg-amber-50 text-amber-700 border-amber-200")
                        : (isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-50 text-slate-600 border-slate-200")
                    )}>
                      {need.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Pane: Timeline workflow controls & identity details */}
        <div className="space-y-6">

          {/* Validation workflow timeline card */}
          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm space-y-6 transition-colors duration-300",
            isDarkMode
              ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/40"
              : "bg-white border-slate-100 text-slate-900"
          )}>
            <div>
              <h3 className={cn("text-sm font-black uppercase tracking-wider", isDarkMode ? "text-white" : "text-slate-900")}>
                Workflow d'Homologation
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Suivi de la certification nationale</p>
            </div>

            {/* Timeline components */}
            <div className={cn("relative border-l pl-6 space-y-5", isDarkMode ? "border-slate-800" : "border-slate-100")}>
              {[
                { 
                  title: "Création Canevas", 
                  user: "Directeur Ets", 
                  date: "24/06/2026 09:12", 
                  completed: true 
                },
                { 
                  title: "Correction / Brouillon", 
                  user: "Directeur Ets", 
                  date: status === "Brouillon" ? "En cours" : "25/06/2026 10:14", 
                  completed: status !== "Brouillon" 
                },
                { 
                  title: "Validation École", 
                  user: "Directeur Ets", 
                  date: (status === "Brouillon" || status === "En correction" || status === "Rejeté inspection") 
                    ? "En attente" 
                    : "26/06/2026 14:02", 
                  completed: status !== "Brouillon" && status !== "En correction" && status !== "Rejeté inspection" 
                },
                { 
                  title: "Validation Inspection", 
                  user: "Inspecteur Niamey IV", 
                  date: (status === "Brouillon" || status === "En correction" || status === "Rejeté inspection" || status === "Validé école") 
                    ? "En attente" 
                    : "27/06/2026 11:30", 
                  completed: status === "Validé inspection" || status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" 
                },
                { 
                  title: "Validation DREN", 
                  user: "Direction DREN", 
                  date: (status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé") 
                    ? "28/06/2026 16:45" 
                    : "En attente", 
                  completed: status === "Validé DREN" || status === "Transmis ministère" || status === "Archivé" 
                },
                { 
                  title: "Transmission Ministère", 
                  user: "Division MEN", 
                  date: (status === "Transmis ministère" || status === "Archivé") 
                    ? "29/06/2026 08:00" 
                    : "En attente", 
                  completed: status === "Transmis ministère" || status === "Archivé" 
                },
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Circle indicator */}
                  <span className={cn(
                    "absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border transition-all",
                    step.completed
                      ? (isDarkMode ? "border-emerald-500 bg-emerald-950 text-emerald-400" : "border-emerald-500 bg-emerald-50 text-emerald-500")
                      : (isDarkMode ? "border-slate-700 bg-slate-900 text-slate-500" : "border-slate-200 bg-slate-50 text-slate-400")
                  )}>
                    {step.completed ? <Check size={8} className="stroke-[4px]" /> : <div className={cn("h-1.5 w-1.5 rounded-full", isDarkMode ? "bg-slate-600" : "bg-slate-300")} />}
                  </span>

                  <div>
                    <h5 className={cn(
                      "text-xs font-black",
                      step.completed
                        ? (isDarkMode ? "text-slate-100" : "text-slate-800")
                        : (isDarkMode ? "text-slate-500" : "text-slate-400")
                    )}>
                      {step.title}
                    </h5>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                      {step.user} {step.date && `· ${step.date}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Workflow actions */}
            <div className={cn("pt-4 border-t space-y-3", isDarkMode ? "border-slate-800" : "border-slate-50")}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Actions de workflow</p>
              
              <div className="flex flex-col gap-2">
                {/* Brouillon / En correction */}
                {(status === "Brouillon" || status === "En correction") && (
                  <button
                    onClick={() => handleTransition("Validé école", "Dossier canevas soumis avec succès par l'école.")}
                    className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition active:scale-95"
                  >
                    Soumettre au contrôle
                  </button>
                )}

                {/* Validé école */}
                {status === "Validé école" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTransition("Validé inspection", "Canevas validé et certifié par l'inspection.")}
                      className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 transition active:scale-95"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-600/30 transition active:scale-95"
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Rejeté inspection */}
                {status === "Rejeté inspection" && (
                  <button
                    onClick={() => handleTransition("En correction", "Dossier remis en correction.")}
                    className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/30 transition active:scale-95"
                  >
                    Corriger les anomalies
                  </button>
                )}

                {/* Validé inspection */}
                {status === "Validé inspection" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTransition("Validé DREN", "Canevas validé et visé par la DREN.")}
                      className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition active:scale-95"
                    >
                      Valider DREN
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-600/30 transition active:scale-95"
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Validé DREN */}
                {status === "Validé DREN" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleTransition("Transmis ministère", "Dossier transmis officiellement au Ministère.")}
                      className="h-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-600/30 transition active:scale-95"
                    >
                      Transmettre
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-600/30 transition active:scale-95"
                    >
                      Rejeter
                    </button>
                  </div>
                )}

                {/* Transmis ministère */}
                {status === "Transmis ministère" && (
                  <button
                    onClick={() => handleTransition("Archivé", "Dossier archivé et finalisé.")}
                    className={cn(
                      "w-full h-11 rounded-xl text-white text-xs font-black uppercase tracking-widest transition active:scale-95",
                      isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-900 hover:bg-slate-800"
                    )}
                  >
                    Archiver le dossier
                  </button>
                )}

                {/* Archivé */}
                {status === "Archivé" && (
                  <div className={cn(
                    "p-4 border rounded-xl text-center space-y-2",
                    isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-slate-50 border-slate-100"
                  )}>
                    <FolderLock className="mx-auto size-6 text-slate-400" />
                    <p className={cn("text-xs font-black", isDarkMode ? "text-slate-200" : "text-slate-700")}>Dossier archivé</p>
                    <p className="text-[10px] font-bold text-slate-400">Toutes les modifications et transitions sont verrouillées.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Identity details */}
          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode
              ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20"
              : "bg-white border-slate-100 text-slate-900"
          )}>
            <SectionTitle title="Identité administrative" subtitle="Informations officielles" isDarkMode={isDarkMode} />
            <div className="mt-5 grid gap-3">
              <InfoLine label="Code établissement" value={establishmentInfo.code} isDarkMode={isDarkMode} />
              <InfoLine label="Identifiant ministère" value={establishmentInfo.ministereId} isDarkMode={isDarkMode} />
              <InfoLine label="Autorisation" value={establishmentInfo.autorisation} isDarkMode={isDarkMode} />
              <InfoLine label="Directeur" value={establishmentInfo.directeur} isDarkMode={isDarkMode} />
            </div>
          </div>

          {/* Location details */}
          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode
              ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20"
              : "bg-white border-slate-100 text-slate-900"
          )}>
            <SectionTitle title="Localisation" subtitle="Adresse et contacts" isDarkMode={isDarkMode} />
            <div className="mt-5 grid gap-3">
              <InfoLine label="Région" value={establishmentInfo.region} isDarkMode={isDarkMode} />
              <InfoLine label="Département" value={establishmentInfo.departement} isDarkMode={isDarkMode} />
              <InfoLine label="Commune" value={establishmentInfo.commune} isDarkMode={isDarkMode} />
              <InfoLine label="Quartier" value={establishmentInfo.quartier} isDarkMode={isDarkMode} />
              <div className={cn(
                "rounded-2xl border p-4 transition-colors",
                isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70"
              )}>
                <p className={cn("flex items-center gap-2 text-sm font-black", isDarkMode ? "text-slate-100" : "text-slate-900")}>
                  <Phone size={16} className="text-indigo-500 shrink-0" /> {establishmentInfo.telephone}
                </p>
                <p className="mt-2 text-xs font-bold text-slate-400">{establishmentInfo.email}</p>
              </div>
            </div>
          </div>

          {/* Documents lists */}
          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode
              ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20"
              : "bg-white border-slate-100 text-slate-900"
          )}>
            <SectionTitle title="Pièces et historique" subtitle="Traçabilité du dossier" isDarkMode={isDarkMode} />
            <div className="mt-5 space-y-3">
              {["Canevas Excel original", "Rapport de validation", "Fiche imprimée", "Historique modifications"].map((item) => (
                <button
                  key={item}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm font-black transition",
                    isDarkMode
                      ? "border-slate-800 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white"
                      : "border-slate-100 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <FileText size={18} className="text-indigo-500 font-sans shrink-0" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reject Dialog Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className={cn(
            "w-full max-w-md rounded-[2.5rem] border shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8 transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-900"
          )}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                  isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-900/50" : "bg-rose-50 text-rose-600"
                )}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className={cn("text-lg font-black", isDarkMode ? "text-white" : "text-slate-900")}>Rejeter le Canevas</h3>
                  <p className="text-xs font-bold text-slate-400">{establishmentInfo.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)}
                className={cn(
                  "h-8 w-8 rounded-full border flex items-center justify-center transition",
                  isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white" : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                )}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Observation de rejet * (Obligatoire)</Label>
              <textarea
                value={tempObservation}
                onChange={e => setTempObservation(e.target.value)}
                placeholder="Indiquez clairement les motifs de non-conformité de ce canevas..."
                rows={4}
                className={cn(
                  "w-full rounded-2xl border p-4 text-xs font-bold outline-none transition",
                  isDarkMode
                    ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                    : "bg-slate-50/50 border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-indigo-500"
                )}
              />
            </div>

            <div className={cn("pt-4 border-t flex justify-end gap-3", isDarkMode ? "border-slate-800" : "border-slate-50")}>
              <button 
                onClick={() => setShowRejectModal(false)}
                className={cn(
                  "px-5 h-11 rounded-xl text-xs font-black uppercase tracking-widest transition",
                  isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                )}
              >
                Annuler
              </button>
              <button 
                onClick={handleRejectSubmit}
                className="px-5 h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-500 text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-600/30 transition active:scale-95"
              >
                Confirmer Rejet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
