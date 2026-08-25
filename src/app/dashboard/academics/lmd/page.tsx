import React from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  Layers, 
  Scale, 
  FileSpreadsheet, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  ListTree
} from "lucide-react";
import { getFaculties, getUniversityPrograms } from "@/domains/academics/actions/lmd.actions";

export const dynamic = "force-dynamic";

export default async function UniversityLmdHubPage() {
  const facultiesRes = await getFaculties(1);
  const programsRes = await getUniversityPrograms(1);

  const faculties = facultiesRes.success ? (facultiesRes.data || []) : [];
  const programs = programsRes.success ? (programsRes.data || []) : [];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md border border-indigo-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            Standards Internationaux REESAO • CAMES • ECTS
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Système Universitaire LMD & Crédits ECTS
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed sm:text-base">
            Gestion complète des cursus universitaires (Licence, Master, Doctorat), maquettes pédagogiques par unités d’enseignement (UE), compensation semestrielle et délibérations des jurys.
          </p>
        </div>

        {/* Decorative background grid */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card 1: Maquette Pédagogique */}
        <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-indigo-200">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Maquette Pédagogique</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Arborescence des Semestres (S1-S6), Unités d’Enseignement (UE) et Éléments Constitutifs (ECU) avec équilibre strict de 30 Crédits ECTS.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/academics/lmd/maquette"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Gérer les maquettes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Card 2: Salle de Délibération */}
        <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Scale className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Salle de Délibération du Jury</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Moteur de calcul automatique de compensation inter-UE, gestion des notes éliminatoires, points de rachat et procès-verbal officiel.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/academics/lmd/deliberation"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              Ouvrir la délibération <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Card 3: Relevés & Diploma Supplement */}
        <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-purple-200">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Relevés LMD & Diplômes</h3>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Édition et génération officielle des relevés semestriels, cumul des 180 crédits (Licence) / 120 crédits (Master) et attestation internationale.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard/academics/lmd/deliberation"
              className="inline-flex items-center gap-2 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors"
            >
              Consulter les relevés <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Overview Stats & Structure summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Structure des Établissements & Facultés</h2>
            <p className="text-xs text-slate-500">Cartographie des composantes universitaires actives</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-indigo-600" /> {faculties.length} Faculté(s) / Institut(s)
            </span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-emerald-600" /> {programs.length} Filière(s) LMD
            </span>
          </div>
        </div>

        {faculties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-700">Aucune faculté enregistrée</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Commencez par structurer vos maquettes pédagogiques et filières pour activer les calculs LMD.
            </p>
            <Link
              href="/dashboard/academics/lmd/maquette"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              <ListTree className="h-4 w-4" /> Configurer une maquette
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faculties.map((fac) => (
              <div key={fac.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{fac.name}</span>
                  {fac.code && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono font-bold">
                      {fac.code}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Doyen : {fac.dean ? fac.dean.nom : "Non assigné"}
                </p>
                <div className="text-xs text-slate-600 font-medium">
                  {fac.departments?.length || 0} Département(s) rattaché(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
