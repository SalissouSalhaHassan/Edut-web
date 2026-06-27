"use client";

import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const importRows = [
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

const statusStyle: Record<string, string> = {
  "Validé": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "À vérifier": "bg-amber-50 text-amber-700 border-amber-100",
  "Erreur": "bg-rose-50 text-rose-700 border-rose-100",
};

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-black", color)}>{value}</p>
    </div>
  );
}

export default function CanevasImportPage() {
  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-950 md:p-6 xl:p-8 print:bg-white print:p-0">
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:border-b print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/canevas" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 print:hidden">
              <ArrowLeft size={19} />
            </Link>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Gestion des Canevas Scolaires</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Import Excel</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">Importer les canevas sans perte de données</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 outline-none">
              <option>Année scolaire 2025 - 2026</option>
              <option>Année scolaire 2024 - 2025</option>
            </select>
            <button className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700">
              <Download size={16} /> Modèle Excel
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-[30px] border-2 border-dashed border-indigo-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-indigo-50 text-indigo-600">
                <UploadCloud size={34} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">Glisser-déposer un fichier Excel</h2>
              <p className="mt-2 max-w-xl text-sm font-bold leading-6 text-slate-500">
                Formats acceptés: .xls, .xlsx. Toutes les feuilles et cellules sont conservées dans la couche brute avant normalisation.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <label className="flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100">
                  <UploadCloud size={17} />
                  Choisir un fichier
                  <input type="file" accept=".xls,.xlsx" className="hidden" />
                </label>
                <button className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-xs font-black uppercase tracking-widest text-slate-700">
                  <ShieldCheck size={17} /> Vérifier avant import
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">Progression de l’import</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">Lecture feuilles, sauvegarde brute, mapping, normalisation</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">72%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: "72%" }} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ["Lecture fichier", "Terminé", CheckCircle2, "text-emerald-600"],
                ["Cellules brutes", "Terminé", CheckCircle2, "text-emerald-600"],
                ["Normalisation", "En cours", Loader2, "text-indigo-600"],
                ["Contrôle erreurs", "À venir", AlertTriangle, "text-amber-600"],
              ].map(([label, status, Icon, color]: any) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={cn(color, status === "En cours" && "animate-spin")} />
                    <span className="text-xs font-black text-slate-800">{label}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
              <div>
                <p className="text-sm font-black text-emerald-800">Import prêt à être validé</p>
                <p className="mt-1 text-xs font-bold text-emerald-700">18 feuilles détectées, 32 684 cellules sauvegardées, 3 266 données non mappées conservées sans suppression.</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <Stat label="Feuilles détectées" value="18" color="text-indigo-600" />
          <Stat label="Cellules importées" value="32 684" color="text-emerald-600" />
          <Stat label="Écoles détectées" value="806" color="text-blue-600" />
          <Stat label="Données non mappées" value="3 266" color="text-amber-600" />
          <div className="rounded-[24px] border border-rose-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <XCircle size={17} className="text-rose-600" />
              <p className="text-sm font-black text-slate-900">Erreurs à surveiller</p>
            </div>
            <ul className="mt-3 space-y-2 text-xs font-bold text-slate-600">
              <li>• 19 incohérences effectifs</li>
              <li>• 8 codes établissements manquants</li>
              <li>• 37 champs obligatoires vides</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="rounded-[30px] border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Résultat des imports</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">Historique des fichiers importés et statut de traitement</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50">
                {[
                  "Nom fichier",
                  "Année scolaire",
                  "Nombre de feuilles",
                  "Nombre de lignes",
                  "Nombre de cellules importées",
                  "Écoles détectées",
                  "Données normalisées",
                  "Données non mappées",
                  "Statut",
                  "Date import",
                  "Utilisateur",
                  "Actions",
                ].map((head) => (
                  <th key={head} className="border-b border-slate-100 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {importRows.map((row) => (
                <tr key={row.file} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-xs font-black text-slate-900">{row.file}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-600">{row.year}</td>
                  <td className="px-4 py-4 text-xs font-black text-indigo-600">{row.sheets}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.lines.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.cells.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4 text-xs font-black text-blue-600">{row.schools}</td>
                  <td className="px-4 py-4 text-xs font-black text-emerald-600">{row.normalized.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4 text-xs font-black text-amber-600">{row.unmapped.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-4">
                    <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", statusStyle[row.status])}>{row.status}</span>
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-600">{row.date}</td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-600">{row.user}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <button title="Voir détails" className="rounded-lg p-2 text-indigo-500 hover:bg-indigo-50"><Eye size={15} /></button>
                      <button title="Réimporter" className="rounded-lg p-2 text-blue-500 hover:bg-blue-50"><RefreshCw size={15} /></button>
                      <button title="Télécharger rapport erreurs" className="rounded-lg p-2 text-amber-500 hover:bg-amber-50"><Download size={15} /></button>
                      <button title="Annuler import" className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><RotateCcw size={15} /></button>
                      <button title="Valider import" className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50"><ShieldCheck size={15} /></button>
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
