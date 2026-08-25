"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { 
  GraduationCap, Layers, Scale, Award, ArrowRight, 
  Sparkles, ShieldCheck, Building2, ListTree, RefreshCw, 
  Plus, CheckCircle2, BookOpen, Users, School
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  syncAcademicSettingsToLmd, 
  saveFaculty, 
  saveUniversityProgram 
} from "@/domains/academics/actions/lmd.actions";

type Props = {
  initialFaculties: any[];
  initialPrograms: any[];
  realSectionsCount: number;
  realClassesCount: number;
  realSessionsCount: number;
};

export default function LmdHubClient({
  initialFaculties,
  initialPrograms,
  realSectionsCount,
  realClassesCount,
  realSessionsCount,
}: Props) {
  const [faculties, setFaculties] = useState(initialFaculties);
  const [programs, setPrograms] = useState(initialPrograms);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState({ name: "", code: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncAcademicSettingsToLmd(1);
      if (res.success) {
        toast.success(res.message || "Synchronisation LMD réussie !");
        window.location.reload();
      } else {
        toast.error("Erreur de synchronisation : " + res.error);
      }
    } catch (e: any) {
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyForm.name) {
      toast.error("Le nom de la faculté est obligatoire");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await saveFaculty({
        schoolId: 1,
        name: facultyForm.name,
        code: facultyForm.code,
        description: facultyForm.description,
      });
      if (res.success) {
        toast.success("Faculté enregistrée avec succès !");
        setIsFacultyModalOpen(false);
        setFacultyForm({ name: "", code: "", description: "" });
        window.location.reload();
      } else {
        toast.error(res.error || "Erreur d'enregistrement");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
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

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-900/30"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Synchronisation en cours..." : "Synchroniser depuis Paramètres Académiques"}
            </Button>

            <Button
              onClick={() => setIsFacultyModalOpen(true)}
              variant="outline"
              className="gap-2 border-white/20 text-slate-200 hover:bg-white/10 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" /> Nouvelle Faculté / Institut
            </Button>
          </div>
        </div>

        {/* Decorative background blur */}
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

        {/* Card 3: Relevés & Diplômes */}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Structure des Établissements & Filières LMD</h2>
            <p className="text-xs text-slate-500">Cartographie des composantes universitaires synchronisées avec vos paramètres réels</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg">
              <Building2 className="h-3.5 w-3.5" /> {faculties.length} Faculté(s)
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg">
              <GraduationCap className="h-3.5 w-3.5" /> {programs.length} Filière(s) LMD
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
              <School className="h-3.5 w-3.5" /> {realClassesCount} Classe(s) rattachée(s)
            </span>
          </div>
        </div>

        {faculties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-700">Aucune faculté enregistrée</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Synchronisez vos filières existantes en un clic ou créez manuellement vos facultés.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                Synchroniser Maintenant
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faculties.map((fac) => (
              <div key={fac.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3 hover:border-indigo-100 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900">{fac.name}</span>
                  </div>
                  {fac.code && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold">
                      {fac.code}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Doyen : <span className="font-semibold text-slate-700">{fac.dean ? fac.dean.nom : "Non assigné"}</span>
                </p>

                {/* Departments & Programs */}
                {fac.departments && fac.departments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Filières & Parcours rattachés :
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {programs
                        .filter((p) => p.department?.facultyId === fac.id || !p.department)
                        .map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs"
                          >
                            <GraduationCap className="h-3 w-3 text-indigo-600" />
                            {p.name}
                            <span className="text-[10px] text-slate-400 font-normal">({p.degreeLevel || "Licence"})</span>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Créer Faculté */}
      {isFacultyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Nouvelle Faculté / Institut</h3>
            <form onSubmit={handleCreateFaculty} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nom de la Faculté *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Faculté des Sciences & Technologies"
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Code / Sigle</label>
                <input
                  type="text"
                  placeholder="ex: FST"
                  value={facultyForm.code}
                  onChange={(e) => setFacultyForm({ ...facultyForm, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  placeholder="Description ou mission académique..."
                  rows={3}
                  value={facultyForm.description}
                  onChange={(e) => setFacultyForm({ ...facultyForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFacultyModalOpen(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  {isSubmitting ? "Enregistrement..." : "Créer la Faculté"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
