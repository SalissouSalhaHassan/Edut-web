"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const schools = [
  {
    code: "ETB-2026-001",
    name: "Ecole Excellence",
    type: "Prive",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey IV",
    quartier: "Yantala",
    statut: "Valide",
    eleves: 642,
    filles: 318,
    garcons: 324,
    enseignants: 24,
    salles: 18,
    eau: "Oui",
    electricite: "Oui",
    completion: 98,
    lastUpdate: "27/06/2026",
  },
  {
    code: "ETB-2026-018",
    name: "Ecole Primaire Bobiel",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey I",
    quartier: "Bobiel",
    statut: "A verifier",
    eleves: 481,
    filles: 236,
    garcons: 245,
    enseignants: 16,
    salles: 12,
    eau: "Non",
    electricite: "Oui",
    completion: 76,
    lastUpdate: "26/06/2026",
  },
  {
    code: "ETB-2026-043",
    name: "Complexe Scolaire Sahel",
    type: "Prive",
    cycle: "College",
    region: "Niamey",
    commune: "Niamey II",
    quartier: "Plateau",
    statut: "Valide",
    eleves: 934,
    filles: 452,
    garcons: 482,
    enseignants: 41,
    salles: 26,
    eau: "Oui",
    electricite: "Oui",
    completion: 94,
    lastUpdate: "25/06/2026",
  },
  {
    code: "ETB-2026-067",
    name: "Ecole Publique Lazaret",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    commune: "Niamey III",
    quartier: "Lazaret",
    statut: "Incomplet",
    eleves: 388,
    filles: 190,
    garcons: 198,
    enseignants: 13,
    salles: 9,
    eau: "Oui",
    electricite: "Non",
    completion: 61,
    lastUpdate: "24/06/2026",
  },
  {
    code: "ETB-2026-104",
    name: "Lycee Municipal Est",
    type: "Public",
    cycle: "Lycee",
    region: "Niamey",
    commune: "Niamey V",
    quartier: "Aeroport",
    statut: "Valide",
    eleves: 1218,
    filles: 593,
    garcons: 625,
    enseignants: 58,
    salles: 34,
    eau: "Oui",
    electricite: "Oui",
    completion: 91,
    lastUpdate: "22/06/2026",
  },
];

const stats = [
  { label: "Etablissements", value: "806", icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Publics", value: "612", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Prives", value: "194", icon: Building2, color: "text-violet-600", bg: "bg-violet-50" },
  { label: "Total eleves", value: "142 416", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Valide: "border-emerald-100 bg-emerald-50 text-emerald-700",
    "A verifier": "border-amber-100 bg-amber-50 text-amber-700",
    Incomplet: "border-rose-100 bg-rose-50 text-rose-700",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", styles[status])}>
      {status}
    </span>
  );
}

function BooleanBadge({ value }: { value: string }) {
  const ok = value === "Oui";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-black", ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>
      {value}
    </span>
  );
}

export default function EtablissementsPage() {
  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Building2 size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Liste des Etablissements</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Registre central des ecoles, colleges et lycees</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Link href="/dashboard/canevas/import" className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Upload size={16} /> Import Excel
            </Link>
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100">
              <Plus size={16} /> Nouvel etablissement
            </button>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Download size={16} /> Exporter
            </button>
            <button onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Printer size={16} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", item.bg, item.color)}>
                  <Icon size={22} />
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">2025-2026</span>
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 print:hidden">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_150px_150px_150px_150px_auto]">
            <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <Search size={18} className="text-slate-400" />
              <input className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-400" placeholder="Rechercher par nom, code, commune, quartier..." />
            </div>
            <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none">
              <option>Type: tous</option>
              <option>Public</option>
              <option>Prive</option>
            </select>
            <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none">
              <option>Cycle: tous</option>
              <option>Prescolaire</option>
              <option>Primaire</option>
              <option>College</option>
              <option>Lycee</option>
            </select>
            <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none">
              <option>Commune</option>
              <option>Niamey I</option>
              <option>Niamey II</option>
              <option>Niamey III</option>
              <option>Niamey IV</option>
              <option>Niamey V</option>
            </select>
            <select className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none">
              <option>Statut: tous</option>
              <option>Valide</option>
              <option>A verifier</option>
              <option>Incomplet</option>
            </select>
            <button className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white">
              <Filter size={16} /> Filtrer
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-4">N</th>
                <th className="px-5 py-4">Code</th>
                <th className="px-5 py-4">Etablissement</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Cycle</th>
                <th className="px-5 py-4">Region</th>
                <th className="px-5 py-4">Commune</th>
                <th className="px-5 py-4">Quartier</th>
                <th className="px-5 py-4">Eleves</th>
                <th className="px-5 py-4">Filles</th>
                <th className="px-5 py-4">Garcons</th>
                <th className="px-5 py-4">Enseignants</th>
                <th className="px-5 py-4">Salles</th>
                <th className="px-5 py-4">Eau</th>
                <th className="px-5 py-4">Electricite</th>
                <th className="px-5 py-4">Completion</th>
                <th className="px-5 py-4">Statut</th>
                <th className="px-5 py-4">Mise a jour</th>
                <th className="px-5 py-4 print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((school, index) => (
                <tr key={school.code} className="text-sm font-bold text-slate-700 transition hover:bg-indigo-50/30">
                  <td className="px-5 py-4 text-slate-400">{index + 1}</td>
                  <td className="px-5 py-4 font-black text-indigo-600">{school.code}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-950">{school.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-slate-400"><MapPin size={12} /> {school.quartier}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">{school.type}</td>
                  <td className="px-5 py-4">{school.cycle}</td>
                  <td className="px-5 py-4">{school.region}</td>
                  <td className="px-5 py-4">{school.commune}</td>
                  <td className="px-5 py-4">{school.quartier}</td>
                  <td className="px-5 py-4 font-black text-slate-950">{school.eleves.toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-4 text-pink-600">{school.filles.toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-4 text-blue-600">{school.garcons.toLocaleString("fr-FR")}</td>
                  <td className="px-5 py-4">{school.enseignants}</td>
                  <td className="px-5 py-4">{school.salles}</td>
                  <td className="px-5 py-4"><BooleanBadge value={school.eau} /></td>
                  <td className="px-5 py-4"><BooleanBadge value={school.electricite} /></td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-28 items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className={cn("h-2 rounded-full", school.completion > 90 ? "bg-emerald-500" : school.completion > 70 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${school.completion}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-500">{school.completion}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={school.statut} /></td>
                  <td className="px-5 py-4">{school.lastUpdate}</td>
                  <td className="px-5 py-4 print:hidden">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/canevas/etablissements/${school.code}`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-indigo-600"><Eye size={16} /></Link>
                      <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-amber-600"><Edit3 size={16} /></button>
                      <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-emerald-600"><CheckCircle2 size={16} /></button>
                      <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 p-5 text-xs font-bold text-slate-500 md:flex-row md:items-center md:justify-between print:hidden">
          <span>Affichage de 1 a 5 sur 806 etablissements</span>
          <div className="flex items-center gap-2">
            <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-400">Precedent</button>
            <button className="h-9 rounded-xl bg-indigo-600 px-3 font-black text-white">1</button>
            <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-600">2</button>
            <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-600">3</button>
            <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-600">Suivant</button>
          </div>
        </div>
      </section>
    </div>
  );
}
