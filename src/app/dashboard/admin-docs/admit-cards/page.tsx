"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Columns3,
  Copy,
  Download,
  Edit3,
  Eye,
  FileArchive,
  FileSpreadsheet,
  FileText,
  IdCard,
  Mail,
  MoreVertical,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const templates = [
  {
    id: "ADM-2026-001",
    name: "Certificate Style (DND Ready)",
    type: "Carte d’admission",
    format: "A4",
    orientation: "Portrait",
    size: "210mm x 297mm",
    background: "Image école",
    status: "Actif",
    generated: 128,
    createdAt: "15 Juin 2026",
    createdBy: "Admin",
  },
  {
    id: "ADM-2026-002",
    name: "Examen Final - Primaire",
    type: "Convocation examen",
    format: "A5",
    orientation: "Paysage",
    size: "210mm x 148mm",
    background: "Sans fond",
    status: "Brouillon",
    generated: 0,
    createdAt: "20 Juin 2026",
    createdBy: "Direction",
  },
  {
    id: "ADM-2026-003",
    name: "Concours entrée sixième",
    type: "Carte concours",
    format: "A4",
    orientation: "Portrait",
    size: "210mm x 297mm",
    background: "Motif officiel",
    status: "Archivé",
    generated: 84,
    createdAt: "02 Mai 2026",
    createdBy: "Secrétariat",
  },
];

const gallery = [
  "Classique officiel",
  "Moderne indigo",
  "Examen national",
  "Concours bilingue",
  "Minimal administratif",
  "Carte avec QR",
];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Actif: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Brouillon: "bg-amber-50 text-amber-700 border-amber-100",
    Archivé: "bg-slate-50 text-slate-600 border-slate-100",
  };
  return <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", styles[status])}>{status}</span>;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("mt-2 text-3xl font-black", color)}>{value}</p>
    </div>
  );
}

export default function AdmitCardsPage() {
  const [activeTab, setActiveTab] = useState("Liste des cartes");
  const [query, setQuery] = useState("");

  const filteredTemplates = useMemo(() => {
    return templates.filter((item) =>
      [item.name, item.type, item.status, item.createdBy].some((value) => value.toLowerCase().includes(query.toLowerCase()))
    );
  }, [query]);

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          .print-card { box-shadow: none !important; border-color: #cbd5e1 !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/admin-docs" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <IdCard size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Administration & Attestations</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Cartes d’admission</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Modèles, génération, impression et suivi des cartes administratives</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100">
              <Plus size={16} /> Nouveau modèle
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

      <section className="hidden print:block">
        <div className="border-b border-slate-300 pb-4 text-center">
          <p className="text-sm font-black uppercase">République du Niger - Ministère de l’Éducation Nationale</p>
          <h1 className="mt-2 text-2xl font-black">Cartes d’admission - Modèles administratifs</h1>
          <p className="mt-1 text-xs font-bold">École Excellence · Année scolaire 2025 - 2026 · Date impression: 30/06/2026 · Utilisateur: Admin</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
        <StatCard label="Total modèles" value="3" color="text-indigo-600" />
        <StatCard label="Modèles actifs" value="1" color="text-emerald-600" />
        <StatCard label="Cartes générées" value="212" color="text-blue-600" />
        <StatCard label="Dernière impression" value="Aujourd’hui" color="text-amber-600" />
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white shadow-sm print-card">
        <div className="border-b border-slate-100 p-4 print:hidden">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {["Liste des cartes", "Galerie des modèles", "Ajouter une carte"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn("rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest transition", activeTab === tab ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100")}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex h-12 min-w-[280px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <Search size={18} className="text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un modèle..." className="w-full bg-transparent text-sm font-bold outline-none" />
            </div>
          </div>
        </div>

        {activeTab === "Galerie des modèles" ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {gallery.map((item, index) => (
              <div key={item} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                <div className="flex aspect-[1.42] items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-white text-indigo-500">
                  <IdCard size={44} />
                </div>
                <p className="mt-4 text-sm font-black text-slate-950">{item}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">Format {index % 2 === 0 ? "A4 portrait" : "A5 paysage"} avec zone QR et signature.</p>
                <button className="mt-4 h-10 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white">Utiliser</button>
              </div>
            ))}
          </div>
        ) : activeTab === "Ajouter une carte" ? (
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Nom du modèle", "Carte admission examen final"],
                ["Type document", "Carte d’admission"],
                ["Format page", "A4"],
                ["Orientation", "Portrait"],
                ["Image de fond", "Choisir une image"],
                ["Créé par", "Admin"],
              ].map(([label, placeholder]) => (
                <label key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                  <input placeholder={placeholder} className="mt-2 w-full bg-transparent text-sm font-black text-slate-900 outline-none" />
                </label>
              ))}
            </div>
            <div className="rounded-[24px] border border-indigo-100 bg-indigo-50 p-5">
              <p className="text-sm font-black text-indigo-900">Aperçu du modèle</p>
              <div className="mt-4 flex aspect-[0.7] items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm">
                <IdCard size={56} />
              </div>
              <button className="mt-4 h-11 w-full rounded-xl bg-indigo-600 text-xs font-black uppercase tracking-widest text-white">Créer le modèle</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4 print:hidden">
              {[
                [Copy, "Copier"],
                [FileSpreadsheet, "Excel"],
                [FileArchive, "CSV"],
                [FileText, "PDF"],
                [Printer, "Imprimer"],
                [Columns3, "Colonnes"],
              ].map(([Icon, label]: any) => (
                <button key={label} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-widest text-slate-700">
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-5 py-4">N°</th>
                    <th className="px-5 py-4">Nom du modèle</th>
                    <th className="px-5 py-4">Type document</th>
                    <th className="px-5 py-4">Format page</th>
                    <th className="px-5 py-4">Orientation</th>
                    <th className="px-5 py-4">Image de fond</th>
                    <th className="px-5 py-4">Statut</th>
                    <th className="px-5 py-4">Créé le</th>
                    <th className="px-5 py-4">Créé par</th>
                    <th className="px-5 py-4 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTemplates.map((template, index) => (
                    <tr key={template.id} className="text-sm font-bold text-slate-700">
                      <td className="px-5 py-4 text-slate-400">{index + 1}</td>
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-950">{template.name}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{template.id} · {template.generated} cartes générées</p>
                      </td>
                      <td className="px-5 py-4">{template.type}</td>
                      <td className="px-5 py-4">{template.format} · {template.size}</td>
                      <td className="px-5 py-4">{template.orientation}</td>
                      <td className="px-5 py-4">
                        <div className="flex h-11 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-indigo-500">
                          <IdCard size={22} />
                        </div>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={template.status} /></td>
                      <td className="px-5 py-4">{template.createdAt}</td>
                      <td className="px-5 py-4">{template.createdBy}</td>
                      <td className="px-5 py-4 print:hidden">
                        <div className="flex items-center gap-2">
                          <button title="Aperçu" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-indigo-600"><Eye size={16} /></button>
                          <button title="Modifier" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-amber-600"><Edit3 size={16} /></button>
                          <button title="Dupliquer" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600"><Copy size={16} /></button>
                          <button title="Générer cartes" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-emerald-600"><IdCard size={16} /></button>
                          <button title="Envoyer email" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-blue-600"><Mail size={16} /></button>
                          <button title="Supprimer" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-rose-600"><Trash2 size={16} /></button>
                          <button title="Plus" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"><MoreVertical size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 p-5 text-xs font-bold text-slate-500 md:flex-row md:items-center md:justify-between print:hidden">
              <span>Affichage de 1 à {filteredTemplates.length} sur {templates.length} modèles</span>
              <div className="flex items-center gap-2">
                <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-400">Précédent</button>
                <button className="h-9 rounded-xl bg-indigo-600 px-3 font-black text-white">1</button>
                <button className="h-9 rounded-xl border border-slate-200 px-3 font-black text-slate-600">Suivant</button>
              </div>
            </div>
          </>
        )}
      </section>

      <footer className="hidden print:block pt-8">
        <div className="grid grid-cols-4 gap-4 text-center text-xs font-bold text-slate-700">
          <div>Signature directeur</div>
          <div>Cachet établissement</div>
          <div>Signature inspection</div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center border border-slate-400">QR</div>
        </div>
      </footer>
    </div>
  );
}
