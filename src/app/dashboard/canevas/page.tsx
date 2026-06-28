"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Download,
  Droplets,
  FileSpreadsheet,
  GitCompareArrows,
  GraduationCap,
  Lightbulb,
  Plus,
  Printer,
  ShieldCheck,
  School,
  Upload,
  Users,
  UserRoundCheck,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiData {
  label: string;
  value: string;
  sub: string;
  icon: any;
  color: string;
}

// Mock data representing different academic years to simulate dynamic loading
const academicYearsData: Record<string, { kpis: KpiData[]; publicValue: number; privateValue: number }> = {
  "2025 - 2026": {
    publicValue: 612,
    privateValue: 194,
    kpis: [
      { label: "Établissements", value: "806", sub: "Toutes structures", icon: School, color: "indigo" },
      { label: "Écoles publiques", value: "612", sub: "Secteur public", icon: Building2, color: "emerald" },
      { label: "Écoles privées", value: "194", sub: "Secteur privé", icon: Building2, color: "violet" },
      { label: "Total élèves", value: "142 416", sub: "Primaire + préscolaire", icon: GraduationCap, color: "blue" },
      { label: "Total filles", value: "70 258", sub: "49,3% des effectifs", icon: Users, color: "pink" },
      { label: "Total garçons", value: "72 158", sub: "50,7% des effectifs", icon: Users, color: "cyan" },
      { label: "Enseignants", value: "4 382", sub: "Tous statuts", icon: UserRoundCheck, color: "amber" },
      { label: "Salles de classe", value: "3 946", sub: "Toutes catégories", icon: Building2, color: "slate" },
      { label: "Salles utilisées", value: "3 621", sub: "91,8% exploitées", icon: BarChart3, color: "emerald" },
      { label: "Sans point d’eau", value: "83", sub: "Alerte infrastructure", icon: Droplets, color: "rose" },
      { label: "Sans électricité", value: "126", sub: "Besoin prioritaire", icon: Lightbulb, color: "orange" },
      { label: "Besoins critiques", value: "214", sub: "À traiter", icon: AlertTriangle, color: "rose" },
      { label: "Complétude", value: "87%", sub: "Données validées", icon: BarChart3, color: "indigo" },
    ]
  },
  "2024 - 2025": {
    publicValue: 590,
    privateValue: 182,
    kpis: [
      { label: "Établissements", value: "772", sub: "Toutes structures", icon: School, color: "indigo" },
      { label: "Écoles publiques", value: "590", sub: "Secteur public", icon: Building2, color: "emerald" },
      { label: "Écoles privées", value: "182", sub: "Secteur privé", icon: Building2, color: "violet" },
      { label: "Total élèves", value: "135 120", sub: "Primaire + préscolaire", icon: GraduationCap, color: "blue" },
      { label: "Total filles", value: "66 210", sub: "49,0% des effectifs", icon: Users, color: "pink" },
      { label: "Total garçons", value: "68 910", sub: "51,0% des effectifs", icon: Users, color: "cyan" },
      { label: "Enseignants", value: "4 120", sub: "Tous statuts", icon: UserRoundCheck, color: "amber" },
      { label: "Salles de classe", value: "3 810", sub: "Toutes catégories", icon: Building2, color: "slate" },
      { label: "Salles utilisées", value: "3 502", sub: "91,9% exploitées", icon: BarChart3, color: "emerald" },
      { label: "Sans point d’eau", value: "95", sub: "Alerte infrastructure", icon: Droplets, color: "rose" },
      { label: "Sans électricité", value: "140", sub: "Besoin prioritaire", icon: Lightbulb, color: "orange" },
      { label: "Besoins critiques", value: "245", sub: "À traiter", icon: AlertTriangle, color: "rose" },
      { label: "Complétude", value: "100%", sub: "Données validées", icon: BarChart3, color: "indigo" },
    ]
  }
};

const communeData = [
  { name: "NY I", value: 236 },
  { name: "NY II", value: 158 },
  { name: "NY III", value: 118 },
  { name: "NY IV", value: 185 },
  { name: "NY V", value: 109 },
];

const levels = [
  { name: "CI", total: 24645, girls: 11403 },
  { name: "CP", total: 26672, girls: 11740 },
  { name: "CE1", total: 21319, girls: 10846 },
  { name: "CE2", total: 20587, girls: 10293 },
  { name: "CM1", total: 19036, girls: 9893 },
  { name: "CM2", total: 17157, girls: 9083 },
];

const alerts = [
  { title: "Écoles sans point d’eau", count: 83, level: "Critique", color: "rose" },
  { title: "Écoles sans électricité", count: 126, level: "Élevé", color: "amber" },
  { title: "Données incomplètes", count: 57, level: "À corriger", color: "indigo" },
  { title: "Besoins critiques", count: 214, level: "Prioritaire", color: "rose" },
  { title: "Incohérences effectifs", count: 19, level: "Contrôle", color: "orange" },
];

function colorClasses(color: string) {
  const map: Record<string, string> = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    violet: "border-violet-100 bg-violet-50 text-violet-600",
    blue: "border-blue-100 bg-blue-50 text-blue-600",
    pink: "border-pink-100 bg-pink-50 text-pink-600",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
    slate: "border-slate-100 bg-slate-50 text-slate-600",
    rose: "border-rose-100 bg-rose-50 text-rose-600",
    orange: "border-orange-100 bg-orange-50 text-orange-600",
  };
  return map[color] || map.slate;
}

function BarMiniChart() {
  const max = Math.max(...communeData.map((d) => d.value));
  return (
    <div className="space-y-3">
      {communeData.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-black text-slate-700">{item.name}</span>
            <span className="text-xs font-black text-indigo-600">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({ publicValue, privateValue }: { publicValue: number; privateValue: number }) {
  const total = publicValue + privateValue;
  const publicPct = total ? publicValue / total : 0;
  const circle = 2 * Math.PI * 42;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 110 110" className="h-28 w-28 shrink-0">
        <circle cx="55" cy="55" r="42" fill="none" stroke="#f1f5f9" strokeWidth="16" />
        <circle cx="55" cy="55" r="42" fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray={`${circle * publicPct} ${circle}`} strokeDashoffset={circle / 4} strokeLinecap="round" />
        <circle cx="55" cy="55" r="42" fill="none" stroke="#7c3aed" strokeWidth="16" strokeDasharray={`${circle * (1 - publicPct)} ${circle}`} strokeDashoffset={circle / 4 - circle * publicPct} strokeLinecap="round" />
        <text x="55" y="52" textAnchor="middle" className="fill-slate-900 text-lg font-black">{total}</text>
        <text x="55" y="67" textAnchor="middle" className="fill-slate-400 text-[9px] font-bold">écoles</text>
      </svg>
      <div className="flex-1 space-y-3">
        <LegendDot color="bg-emerald-500" label="Public" value={publicValue} />
        <LegendDot color="bg-violet-500" label="Privé" value={privateValue} />
      </div>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className="text-xs font-black text-slate-600">{label}</span>
      <span className="ml-auto text-xs font-black text-slate-900">{value}</span>
    </div>
  );
}

function LevelChart() {
  const max = Math.max(...levels.map((d) => d.total));
  return (
    <div className="grid h-full grid-cols-6 items-end gap-3 pt-6">
      {levels.map((level) => (
        <div key={level.name} className="flex h-64 flex-col items-center justify-end gap-2">
          <div className="flex w-full flex-1 items-end justify-center gap-1">
            <div className="w-5 rounded-t-lg bg-indigo-500" style={{ height: `${Math.max(8, (level.total / max) * 100)}%` }} />
            <div className="w-5 rounded-t-lg bg-pink-400" style={{ height: `${Math.max(8, (level.girls / max) * 100)}%` }} />
          </div>
          <span className="text-xs font-black text-slate-600">{level.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function CanevasDashboardPage() {
  const [selectedYear, setSelectedYear] = useState("2025 - 2026");
  
  // Modal for new canevas
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCycle, setNewCycle] = useState("Primaire");
  const [newDesc, setNewDesc] = useState("");

  const activeData = academicYearsData[selectedYear] || academicYearsData["2025 - 2026"];

  const handleCreateCanevas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    toast.success(`Canevas "${newName}" (${newCycle}) créé avec succès !`);
    setIsNewOpen(false);
    setNewName("");
    setNewDesc("");
  };

  const handleExportKPIs = () => {
    toast.success("Génération du rapport d'exportation en cours...");
    let csv = "Indicateur,Valeur,Description\n";
    activeData.kpis.forEach((k) => {
      csv += `"${k.label}","${k.value}","${k.sub}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `canevas_kpis_${selectedYear.replace(/\s+/g, "")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Tableau de bord</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Vue globale des données importées ou saisies</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="2025 - 2026">Année scolaire 2025 - 2026</option>
              <option value="2024 - 2025">Année scolaire 2024 - 2025</option>
            </select>
            <Link href="/dashboard/canevas/import" className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors">
              <Upload size={16} /> Importer Excel
            </Link>
            <Link href="/dashboard/canevas/etablissements" className="flex h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-100 transition-colors">
              <School size={16} /> Établissements
            </Link>
            <button 
              onClick={() => setIsNewOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Plus size={16} /> Nouveau Canevas
            </button>
            <button 
              onClick={handleExportKPIs}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Download size={16} /> Exporter
            </button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* KPI Section */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {activeData.kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link href={kpi.label.includes("tablissements") ? "/dashboard/canevas/etablissements" : "/dashboard/canevas"} key={kpi.label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", colorClasses(kpi.color))}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{kpi.value}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{kpi.sub}</p>
            </Link>
          );
        })}
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Accès rapide aux nouvelles interfaces</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Fiche établissement, saisies détaillées, mapping Excel et contrôle qualité</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001" className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white">
              <School size={16} /> Fiche ERP
            </Link>
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001/identification" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <FileSpreadsheet size={16} /> Identification
            </Link>
            <Link href="/dashboard/canevas/excel-preview" className="flex h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700">
              <Upload size={16} /> Excel brut
            </Link>
            <Link href="/dashboard/canevas/mapping-excel" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <GitCompareArrows size={16} /> Mapping
            </Link>
            <Link href="/dashboard/canevas/controle-qualite" className="flex h-11 items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 text-xs font-black uppercase tracking-widest text-amber-700">
              <ShieldCheck size={16} /> Qualité
            </Link>
          </div>
        </div>
      </section>

      {/* Graphs and Alert Panels */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Établissements par commune</h2>
              <p className="mb-5 mt-1 text-xs font-bold text-slate-500">Répartition géographique</p>
              <BarMiniChart />
            </div>
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Public vs Privé</h2>
              <p className="mb-4 mt-1 text-xs font-bold text-slate-500">Répartition des statuts</p>
              <Donut publicValue={activeData.publicValue} privateValue={activeData.privateValue} />
            </div>
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Filles / Garçons</h2>
              <p className="mb-4 mt-1 text-xs font-bold text-slate-500">Composition globale</p>
              <Donut publicValue={70258} privateValue={72158} />
            </div>
          </div>
          <div className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900">Effectifs par niveau</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">Barres indigo: total, barres roses: filles</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-black text-slate-500">
                <LegendDot color="bg-indigo-500" label="Total" value={142416} />
                <LegendDot color="bg-pink-400" label="Filles" value={70258} />
              </div>
            </div>
            <LevelChart />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Besoins par type</h2>
              <div className="mt-5 space-y-3">
                {[
                  ["Salles de classe", 74, "bg-rose-500"],
                  ["Tables bancs", 62, "bg-amber-500"],
                  ["Enseignants", 48, "bg-indigo-500"],
                  ["Armoires", 30, "bg-emerald-500"],
                ].map(([label, value, color]) => (
                  <div key={String(label)}>
                    <div className="mb-1 flex justify-between text-xs font-black">
                      <span>{label}</span><span>{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100"><div className={cn("h-2 rounded-full", String(color))} style={{ width: `${Number(value)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">Infrastructures par état</h2>
              <div className="mt-5 space-y-3">
                {[
                  ["Fonctionnelles", 78, "bg-emerald-500"],
                  ["À réparer", 14, "bg-amber-500"],
                  ["Critiques", 8, "bg-rose-500"],
                ].map(([label, value, color]) => (
                  <div key={String(label)}>
                    <div className="mb-1 flex justify-between text-xs font-black">
                      <span>{label}</span><span>{value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100"><div className={cn("h-2 rounded-full", String(color))} style={{ width: `${Number(value)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900">Alertes</h2>
              <AlertTriangle className="text-amber-500" size={18} />
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.title} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", alert.color === "rose" && "bg-rose-500", alert.color === "amber" && "bg-amber-500", alert.color === "indigo" && "bg-indigo-500", alert.color === "orange" && "bg-orange-500")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-900">{alert.title}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500">{alert.count} établissements concernés</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">{alert.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[26px] border border-indigo-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">Qualité des données</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Complétude globale des canevas</p>
            <div className="mt-5 flex items-end justify-between">
              <span className="text-5xl font-black text-indigo-600">{selectedYear === "2024 - 2025" ? "100%" : "87%"}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Bon niveau</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: selectedYear === "2024 - 2025" ? "100%" : "87%" }} />
            </div>
          </div>
        </aside>
      </section>

      {/* ─── MODAL: NEW CANEVAS TEMPLATE ─── */}
      {isNewOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setIsNewOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-2xl font-black text-slate-950 mb-6">Nouveau Canevas</h3>
            
            <form onSubmit={handleCreateCanevas} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Désignation du canevas *</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Canevas Lycée 2025-2026" className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Cycle scolaire</label>
                <select value={newCycle} onChange={e => setNewCycle(e.target.value)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 text-xs">
                  <option value="Prescolaire">Prescolaire</option>
                  <option value="Primaire">Primaire</option>
                  <option value="College">College</option>
                  <option value="Lycee">Lycee</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Description / Notes</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Données d'infrastructure de Niamey" rows={3} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsNewOpen(false)} className="h-12 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm">Annuler</button>
                <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-100">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
