"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Save,
  ShieldCheck,
  Table2,
  UserRound,
  Users,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fields = {
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

function FieldCard({ label, value, isDarkMode }: { label: string; value: string; isDarkMode?: boolean }) {
  return (
    <label className={cn(
      "block rounded-2xl border p-4 transition-colors",
      isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/70"
    )}>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <input
        value={value}
        readOnly
        className={cn(
          "mt-2 w-full bg-transparent text-sm font-black outline-none",
          isDarkMode ? "text-slate-100" : "text-slate-900"
        )}
      />
    </label>
  );
}

function Section({ title, subtitle, icon: Icon, isDarkMode, children }: { title: string; subtitle: string; icon: any; isDarkMode?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn(
      "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
      isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl shrink-0",
          isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-900/50" : "bg-indigo-50 text-indigo-600"
        )}>
          <Icon size={20} />
        </div>
        <div>
          <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>{title}</h2>
          <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

export default function IdentificationPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  return (
    <div className={cn(
      "min-h-screen space-y-6 p-4 md:p-6 xl:p-8 transition-colors duration-300 print:bg-white print:p-0",
      isDarkMode ? "bg-[#090D16] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-950"
    )}>
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
              <FileText size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Fiche Etablissement</p>
              <h1 className={cn("text-2xl md:text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-950")}>
                Identification
              </h1>
              <p className={cn("mt-1 text-xs md:text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                Informations officielles, administratives et géographiques
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {/* Dark Mode Toggle */}
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

            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/30 transition">
              <Save size={16} /> Enregistrer
            </button>
            <button className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}>
              <Edit3 size={16} /> Modifier
            </button>
            <button className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}>
              <Download size={16} /> Exporter
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
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
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
                  <h2 className={cn("text-2xl font-black", isDarkMode ? "text-white" : "text-slate-950")}>Ecole Excellence</h2>
                  <p className={cn("mt-1 text-sm font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    ETB-2026-001 · Prive · Primaire · Niamey IV
                  </p>
                </div>
              </div>
              <div className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-black transition-colors",
                isDarkMode ? "border-emerald-800/60 bg-emerald-950/40 text-emerald-300" : "border-emerald-100 bg-emerald-50 text-emerald-700"
              )}>
                Identification complete a 96%
              </div>
            </div>
          </section>

          <Section title="Identification generale" subtitle="Noms, classification et statut de l'etablissement" icon={Hash} isDarkMode={isDarkMode}>
            {fields.general.map(([label, value]) => <FieldCard key={label} label={label} value={value} isDarkMode={isDarkMode} />)}
          </Section>

          <Section title="Informations administratives" subtitle="References officielles et rattachements administratifs" icon={ShieldCheck} isDarkMode={isDarkMode}>
            {fields.administrative.map(([label, value]) => <FieldCard key={label} label={label} value={value} isDarkMode={isDarkMode} />)}
          </Section>

          <Section title="Localisation" subtitle="Situation geographique, commune et coordonnees GPS" icon={MapPin} isDarkMode={isDarkMode}>
            {fields.localisation.map(([label, value]) => <FieldCard key={label} label={label} value={value} isDarkMode={isDarkMode} />)}
          </Section>

          <Section title="Contact et responsables" subtitle="Direction, promoteur et moyens de contact" icon={Phone} isDarkMode={isDarkMode}>
            {fields.contact.map(([label, value]) => <FieldCard key={label} label={label} value={value} isDarkMode={isDarkMode} />)}
          </Section>
        </div>

        <aside className="space-y-5">
          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
          )}>
            <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Controle identification</h2>
            <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>Qualite des donnees avant validation</p>
            <div className="mt-5 space-y-3">
              {checks.map((check) => (
                <div
                  key={check.label}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 transition-colors",
                    isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl shrink-0",
                    check.color === "emerald"
                      ? (isDarkMode ? "bg-emerald-950/60 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                      : (isDarkMode ? "bg-amber-950/60 text-amber-400" : "bg-amber-50 text-amber-600")
                  )}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-black", isDarkMode ? "text-white" : "text-slate-950")}>{check.label}</p>
                    <p className={cn("mt-1 text-xs font-black", check.color === "emerald" ? "text-emerald-500" : "text-amber-500")}>
                      {check.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(
            "rounded-[30px] border p-6 shadow-sm transition-colors duration-300",
            isDarkMode ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/20" : "bg-white border-slate-100 text-slate-950"
          )}>
            <h2 className={cn("text-base font-black", isDarkMode ? "text-white" : "text-slate-950")}>Navigation fiche</h2>
            <div className="mt-5 space-y-2">
              {[
                ["Fiche complete", "/dashboard/canevas/etablissements/ETB-2026-001", Building2],
                ["Identification", "/dashboard/canevas/etablissements/ETB-2026-001/identification", FileText],
                ["Groupes pedagogiques", "/dashboard/canevas/etablissements/ETB-2026-001/groupes-pedagogiques", Table2],
                ["Effectifs eleves", "/dashboard/canevas/etablissements/ETB-2026-001/effectifs-eleves", Users],
                ["Redoublants", "/dashboard/canevas/etablissements/ETB-2026-001/redoublants", Users],
                ["Personnel enseignant", "/dashboard/canevas/etablissements/ETB-2026-001/personnel-enseignant", UserRound],
                ["Infrastructures", "/dashboard/canevas/etablissements/ETB-2026-001/infrastructures", Home],
                ["Mobilier", "/dashboard/canevas/etablissements/ETB-2026-001/mobilier", Building2],
                ["Manuels & guides", "/dashboard/canevas/etablissements/ETB-2026-001/manuels-guides", FileText],
                ["Besoins", "/dashboard/canevas/etablissements/ETB-2026-001/besoins", ShieldCheck],
              ].map(([label, href, Icon]: any) => (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
                    label === "Identification"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : isDarkMode
                      ? "border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "border border-slate-100 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
