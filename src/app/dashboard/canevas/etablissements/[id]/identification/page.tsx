"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  Globe2,
  Hash,
  Home,
  Mail,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Table2,
  UserRound,
  Users,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCanevasTableToPdf } from "../canevas-pdf-export";

const initialFieldsData: Record<string, [string, string][]> = {
  general: [
    ["Code etablissement", "ETB-2026-001"],
    ["Nom officiel", "Ecole Excellence"],
    ["Nom usuel", "Ecole Excellence"],
    ["Type", "Prive"],
    ["Cycle principal", "Primaire"],
    ["Statut fonctionnement", "Ouvert"],
    ["Annee scolaire", "2025 - 2026"],
    ["Date creation", "12/09/2018"],
  ],
  administrative: [
    ["Identifiant ministere", "MEN-NE-NY4-0001"],
    ["Numero autorisation", "AR-2024-1187"],
    ["Tutelle", "Ministere de l'Education Nationale"],
    ["Inspection", "Inspection Niamey IV"],
    ["Secteur pedagogique", "Secteur Yantala"],
    ["Regime", "Mixte"],
    ["Langue enseignement", "Francais"],
    ["Reconnaissance", "Validee"],
  ],
  localisation: [
    ["Region", "Niamey"],
    ["Departement", "Niamey"],
    ["Commune", "Niamey IV"],
    ["Quartier / Village", "Yantala Haut"],
    ["Adresse", "Avenue des Ecoles, Yantala Haut"],
    ["Latitude", "13.5248"],
    ["Longitude", "2.1098"],
    ["Zone", "Urbaine"],
  ],
  contact: [
    ["Directeur", "Salissou Salha Hassan"],
    ["Telephone", "+227 90 00 00 00"],
    ["Email", "contact@ecole-excellence.ne"],
    ["Boite postale", "BP 1120 Niamey"],
    ["Promoteur", "Fondation Excellence"],
    ["Telephone promoteur", "+227 91 00 00 00"],
  ],
};

const checks = [
  { label: "Code unique", status: "Valide", color: "emerald" },
  { label: "Localisation complete", status: "Valide", color: "emerald" },
  { label: "Autorisation administrative", status: "Valide", color: "emerald" },
  { label: "Contact directeur", status: "Valide", color: "emerald" },
  { label: "Coordonnees GPS", status: "A verifier", color: "amber" },
];

const STORAGE_KEY = "edut_canevas_data_identification";

export default function IdentificationPage() {
  const [formData, setFormData] = useState(initialFieldsData);
  const [isEditing, setIsEditing] = useState(false);
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
        if (parsed && typeof parsed === "object") {
          setFormData(parsed);
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

  const updateField = (sectionKey: string, fieldIndex: number, newValue: string) => {
    setFormData((prev) => {
      const section = [...prev[sectionKey]];
      section[fieldIndex] = [section[fieldIndex][0], newValue];
      return { ...prev, [sectionKey]: section };
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      setIsEditing(false);
      toast.success("Fiche d'identification enregistrée avec succès !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement local.");
    }
  };

  const handleReset = () => {
    if (confirm("Voulez-vous réinitialiser les informations aux valeurs initiales ?")) {
      setFormData(initialFieldsData);
      localStorage.removeItem(STORAGE_KEY);
      toast.info("Données réinitialisées.");
    }
  };

  const handleExportPdf = () => {
    const rows = [
      ...formData.general.map(([lbl, val]) => ["Général", lbl, val]),
      ...formData.administrative.map(([lbl, val]) => ["Administratif", lbl, val]),
      ...formData.localisation.map(([lbl, val]) => ["Localisation", lbl, val]),
      ...formData.contact.map(([lbl, val]) => ["Contact", lbl, val]),
    ];

    exportCanevasTableToPdf({
      title: "Fiche d'Identification de l'Établissement",
      subtitle: "Renseignements généraux, statut juridique, tutelle administrative et localisation",
      schoolName: formData.general[1][1] || "ÉCOLE EXCELLENCE",
      schoolCode: formData.general[0][1] || "ETB-2026-001",
      headers: ["Catégorie", "Rubrique", "Valeur / Renseignement"],
      rows,
      summaryNotes: [
        { label: "Nom", value: formData.general[1][1] },
        { label: "Directeur", value: formData.contact[0][1] },
        { label: "Commune", value: formData.localisation[2][1] },
      ],
      filename: "fiche_identification",
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
        isDarkMode
          ? "bg-[#111827]/95 border-slate-800 text-white shadow-xl shadow-black/40"
          : "bg-white border-slate-200 text-slate-950"
      )}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/canevas/etablissements/ETB-2026-001"
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
              <FileText size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Identification & Signaletique
              </h1>
              <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Donnees signaletiques, administratives, geographiques et contacts
              </p>
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
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
                isEditing
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : isDarkMode
                    ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <Edit3 size={16} /> {isEditing ? "Mode Édition Actif" : "Modifier"}
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

      {/* Main Grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {/* Identity Header Card */}
          <section className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
          )}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-[24px] shrink-0",
                  isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/50" : "bg-indigo-50 text-indigo-600"
                )}>
                  <Building2 size={28} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={cn("text-2xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                      {formData.general[1][1]}
                    </h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-emerald-700">
                      {formData.general[5][1]}
                    </span>
                  </div>
                  <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    {formData.localisation[4][1]} • Code MEN : {formData.general[0][1]}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 1. General Info */}
          <section className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl shrink-0", isDarkMode ? "bg-indigo-950/60 text-indigo-400" : "bg-indigo-50 text-indigo-600")}>
                <Building2 size={20} />
              </div>
              <div>
                <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>1. Renseignements generaux</h2>
                <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Statut, type et cycle de l'etablissement</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {formData.general.map(([lbl, val], idx) => (
                <label key={lbl} className={cn("block rounded-2xl border p-4 transition-colors", isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70")}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lbl}</span>
                  <input
                    value={val}
                    readOnly={!isEditing}
                    onChange={(e) => updateField("general", idx, e.target.value)}
                    className={cn(
                      "mt-2 w-full bg-transparent text-sm font-black outline-none transition",
                      isEditing ? "border-b border-indigo-500 pb-1" : "",
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    )}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* 2. Administrative Info */}
          <section className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl shrink-0", isDarkMode ? "bg-indigo-950/60 text-indigo-400" : "bg-indigo-50 text-indigo-600")}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>2. Tutelle et administration</h2>
                <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Autorisations et rattachements institutionnels</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {formData.administrative.map(([lbl, val], idx) => (
                <label key={lbl} className={cn("block rounded-2xl border p-4 transition-colors", isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70")}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lbl}</span>
                  <input
                    value={val}
                    readOnly={!isEditing}
                    onChange={(e) => updateField("administrative", idx, e.target.value)}
                    className={cn(
                      "mt-2 w-full bg-transparent text-sm font-black outline-none transition",
                      isEditing ? "border-b border-indigo-500 pb-1" : "",
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    )}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* 3. Geographic Location */}
          <section className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl shrink-0", isDarkMode ? "bg-indigo-950/60 text-indigo-400" : "bg-indigo-50 text-indigo-600")}>
                <MapPin size={20} />
              </div>
              <div>
                <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>3. Localisation geographique</h2>
                <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Decoupage territorial et coordonnees SIG</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {formData.localisation.map(([lbl, val], idx) => (
                <label key={lbl} className={cn("block rounded-2xl border p-4 transition-colors", isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70")}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lbl}</span>
                  <input
                    value={val}
                    readOnly={!isEditing}
                    onChange={(e) => updateField("localisation", idx, e.target.value)}
                    className={cn(
                      "mt-2 w-full bg-transparent text-sm font-black outline-none transition",
                      isEditing ? "border-b border-indigo-500 pb-1" : "",
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    )}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* 4. Contacts */}
          <section className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl shrink-0", isDarkMode ? "bg-indigo-950/60 text-indigo-400" : "bg-indigo-50 text-indigo-600")}>
                <Phone size={20} />
              </div>
              <div>
                <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>4. Contacts et gestionnaires</h2>
                <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Responsables, coordonnees directes et promoteur</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {formData.contact.map(([lbl, val], idx) => (
                <label key={lbl} className={cn("block rounded-2xl border p-4 transition-colors", isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70")}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lbl}</span>
                  <input
                    value={val}
                    readOnly={!isEditing}
                    onChange={(e) => updateField("contact", idx, e.target.value)}
                    className={cn(
                      "mt-2 w-full bg-transparent text-sm font-black outline-none transition",
                      isEditing ? "border-b border-indigo-500 pb-1" : "",
                      isDarkMode ? "text-slate-100" : "text-slate-900"
                    )}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100"
          )}>
            <h3 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Controles de conformite</h3>
            <div className="mt-4 space-y-3">
              {checks.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border p-3.5 transition-colors",
                    isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/70"
                  )}
                >
                  <span className={cn("text-xs font-bold", isDarkMode ? "text-slate-300" : "text-slate-700")}>{item.label}</span>
                  <span className={cn(
                    "rounded-xl px-2.5 py-1 text-[10px] font-black uppercase",
                    item.color === "emerald"
                      ? isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700"
                      : isDarkMode ? "bg-amber-950/60 text-amber-400 border border-amber-800/40" : "bg-amber-50 text-amber-700"
                  )}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100"
          )}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                <Globe2 size={18} />
              </div>
              <div>
                <h3 className={cn("text-sm font-black", isDarkMode ? "text-white" : "text-slate-950")}>Positionnement Carte SIG</h3>
                <p className="text-[11px] font-bold text-slate-400">Coordonnées géographiques</p>
              </div>
            </div>
            <div className={cn("mt-4 rounded-2xl p-4 text-xs font-bold", isDarkMode ? "bg-slate-900/80 text-slate-300" : "bg-slate-50 text-slate-600")}>
              Lat: {formData.localisation[5][1]}, Long: {formData.localisation[6][1]}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
