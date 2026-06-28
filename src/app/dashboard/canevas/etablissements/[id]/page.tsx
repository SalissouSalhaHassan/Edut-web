"use client";

import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const establishment = {
  code: "ETB-2026-001",
  name: "Ecole Excellence",
  type: "Prive",
  cycle: "Primaire",
  statut: "Valide",
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
  { label: "Total eleves", value: "642", icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Filles", value: "318", icon: Users, color: "text-pink-600", bg: "bg-pink-50" },
  { label: "Garcons", value: "324", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Enseignants", value: "24", icon: UserRoundCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Salles", value: "18", icon: Building2, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Completion", value: "98%", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50" },
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
  { label: "Latines fonctionnelles", value: "12 blocs", icon: Home, status: "ok" },
  { label: "Cloture", value: "Partielle", icon: ShieldCheck, status: "warn" },
];

const needs = [
  { label: "Tables bancs", quantity: 42, priority: "Elevee" },
  { label: "Armoires pedagogiques", quantity: 8, priority: "Moyenne" },
  { label: "Rehabilitation salles", quantity: 2, priority: "Critique" },
];

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-base font-black text-slate-950">{title}</h2>
      <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
    </div>
  );
}

export default function FicheEtablissementPage() {
  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas/etablissements" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Building2 size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Fiche Etablissement</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Dossier complet, controle et impression administrative</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001/identification" className="flex h-11 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700">
              <FileText size={16} /> Identification
            </Link>
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001/groupes-pedagogiques" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Table2 size={16} /> Groupes
            </Link>
            <Link href="/dashboard/canevas/etablissements/ETB-2026-001/effectifs-eleves" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Users size={16} /> Effectifs
            </Link>
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100">
              <Edit3 size={16} /> Modifier
            </button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Download size={16} /> Exporter PDF
            </button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-indigo-50 text-indigo-600">
                  <Building2 size={34} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-950">{establishment.name}</h2>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">{establishment.statut}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">{establishment.code} · {establishment.type} · {establishment.cycle} · {establishment.annee}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600"><MapPin size={16} className="text-indigo-500" /> {establishment.adresse}, {establishment.commune}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 lg:w-64">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Completion dossier</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-white">
                    <div className="h-3 rounded-full bg-indigo-600" style={{ width: `${establishment.completion}%` }} />
                  </div>
                  <span className="text-sm font-black text-indigo-700">{establishment.completion}%</span>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", item.bg, item.color)}>
                    <Icon size={22} />
                  </div>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                </div>
              );
            })}
          </section>

          <section className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Effectifs par niveau" subtitle="Repartition filles, garcons et redoublants" />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="py-3">Niveau</th>
                    <th className="py-3">Total</th>
                    <th className="py-3">Filles</th>
                    <th className="py-3">Garcons</th>
                    <th className="py-3">Redoublants</th>
                    <th className="py-3">Taux filles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {levels.map((level) => (
                    <tr key={level.niveau} className="text-sm font-bold text-slate-700">
                      <td className="py-4 font-black text-indigo-600">{level.niveau}</td>
                      <td className="py-4 font-black text-slate-950">{level.total}</td>
                      <td className="py-4 text-pink-600">{level.filles}</td>
                      <td className="py-4 text-blue-600">{level.garcons}</td>
                      <td className="py-4">{level.redoublants}</td>
                      <td className="py-4">{Math.round((level.filles / level.total) * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
              <SectionTitle title="Infrastructures" subtitle="Etat des equipements principaux" />
              <div className="mt-5 grid gap-3">
                {infrastructure.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", item.status === "ok" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-950">{item.label}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
              <SectionTitle title="Besoins declares" subtitle="Demandes et priorites issues du canevas" />
              <div className="mt-5 space-y-3">
                {needs.map((need) => (
                  <div key={need.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4">
                    <div>
                      <p className="text-sm font-black text-slate-950">{need.label}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">Quantite: {need.quantity}</p>
                    </div>
                    <span className={cn("rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest", need.priority === "Critique" ? "bg-rose-50 text-rose-700" : need.priority === "Elevee" ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600")}>
                      {need.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Identite administrative" subtitle="Informations officielles" />
            <div className="mt-5 grid gap-3">
              <InfoLine label="Code etablissement" value={establishment.code} />
              <InfoLine label="Identifiant ministere" value={establishment.ministereId} />
              <InfoLine label="Autorisation" value={establishment.autorisation} />
              <InfoLine label="Directeur" value={establishment.directeur} />
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Localisation" subtitle="Adresse et contacts" />
            <div className="mt-5 grid gap-3">
              <InfoLine label="Region" value={establishment.region} />
              <InfoLine label="Departement" value={establishment.departement} />
              <InfoLine label="Commune" value={establishment.commune} />
              <InfoLine label="Quartier" value={establishment.quartier} />
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Phone size={16} className="text-indigo-500" /> {establishment.telephone}</p>
                <p className="mt-2 text-xs font-bold text-slate-500">{establishment.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-amber-100 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 text-amber-600" size={20} />
              <div>
                <h3 className="text-sm font-black text-amber-900">Controle qualite</h3>
                <p className="mt-2 text-xs font-bold leading-5 text-amber-800">Les donnees sont coherentes. La cloture partielle et deux salles a rehabiliter restent a suivre.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-100 bg-white p-6 shadow-sm">
            <SectionTitle title="Pieces et historique" subtitle="Tracabilite du dossier" />
            <div className="mt-5 space-y-3">
              {["Canevas Excel original", "Rapport de validation", "Fiche imprimee", "Historique modifications"].map((item) => (
                <button key={item} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-4 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50">
                  <FileText size={18} className="text-indigo-500" />
                  {item}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
