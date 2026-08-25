"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Layers, Plus, Trash2, Edit3, BookOpen, Clock, 
  User, CheckCircle2, AlertTriangle, ChevronRight, 
  Sparkles, Award, ArrowLeft, RefreshCw, Filter, HelpCircle,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getMaquettePedagogique,
  saveUniteEnseignement,
  deleteUniteEnseignement,
  saveElementConstitutif,
  deleteElementConstitutif,
  saveUniversityProgram,
} from "@/domains/academics/actions/lmd.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  initialPrograms: any[];
  initialFaculties: any[];
  subjects: any[];
  teachers: any[];
};

export default function MaquetteClient({
  initialPrograms,
  initialFaculties,
  subjects,
  teachers,
}: Props) {
  const [programs, setPrograms] = useState(initialPrograms);
  const [selectedCycle, setSelectedCycle] = useState<string>("Tous");

  const filteredPrograms = useMemo(() => {
    if (!selectedCycle || selectedCycle === "Tous") return programs;
    return programs.filter((p) => {
      const level = (p.degreeLevel || "Licence").toLowerCase();
      return level.includes(selectedCycle.toLowerCase());
    });
  }, [programs, selectedCycle]);

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    filteredPrograms.length > 0 ? filteredPrograms[0].id : null
  );

  useEffect(() => {
    if (filteredPrograms.length > 0) {
      const exists = filteredPrograms.some((p) => p.id === selectedProgramId);
      if (!exists) {
        setSelectedProgramId(filteredPrograms[0].id);
      }
    } else {
      setSelectedProgramId(null);
    }
  }, [filteredPrograms]);

  const [selectedSemester, setSelectedSemester] = useState<string>("S1");

  const [maquette, setMaquette] = useState<{
    ues: any[];
    totalCredits: number;
    isCompliant30Credits: boolean;
  }>({ ues: [], totalCredits: 0, isCompliant30Credits: false });

  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isUeModalOpen, setIsUeModalOpen] = useState(false);
  const [selectedUe, setSelectedUe] = useState<any>(null);
  const [ueFormData, setUeFormData] = useState({
    codeUe: "",
    nameUe: "",
    typeUe: "Fondamentale",
    creditsEcts: 6,
    totalHours: 60,
    minPassingGrade: 10.0,
    isEliminatory: false,
  });

  const [isEcuModalOpen, setIsEcuModalOpen] = useState(false);
  const [selectedEcu, setSelectedEcu] = useState<any>(null);
  const [targetUeId, setTargetUeId] = useState<number | null>(null);
  const [ecuFormData, setEcuFormData] = useState({
    subjectId: "",
    codeEcu: "",
    nameEcu: "",
    creditsEcts: 3,
    coefficient: 1,
    hoursCm: 24,
    hoursTd: 12,
    hoursTp: 0,
    hoursTpe: 24,
    teacherEmployeeId: "",
    eliminatoryGrade: 7.0,
  });

  // Load Maquette whenever Program or Semester changes
  const loadMaquetteData = async () => {
    if (!selectedProgramId) return;
    setIsLoading(true);
    try {
      const res = await getMaquettePedagogique(selectedProgramId, selectedSemester);
      if (res.success && res.data) {
        setMaquette(res.data);
      }
    } catch (e: any) {
      toast.error("Erreur de chargement de la maquette");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaquetteData();
  }, [selectedProgramId, selectedSemester]);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const semesters = selectedProgram?.degreeLevel === "Master"
    ? ["S1", "S2", "S3", "S4"]
    : ["S1", "S2", "S3", "S4", "S5", "S6"];

  // ─── UE Handlers ───────────────────────────────────────────────────────────
  const handleOpenUeModal = (ue: any = null) => {
    if (ue) {
      setSelectedUe(ue);
      setUeFormData({
        codeUe: ue.codeUe,
        nameUe: ue.nameUe,
        typeUe: ue.typeUe || "Fondamentale",
        creditsEcts: Number(ue.creditsEcts) || 6,
        totalHours: Number(ue.totalHours) || 60,
        minPassingGrade: Number(ue.minPassingGrade) || 10.0,
        isEliminatory: Boolean(ue.isEliminatory),
      });
    } else {
      setSelectedUe(null);
      setUeFormData({
        codeUe: `UE-${selectedSemester}-0${maquette.ues.length + 1}`,
        nameUe: "",
        typeUe: "Fondamentale",
        creditsEcts: 6,
        totalHours: 60,
        minPassingGrade: 10.0,
        isEliminatory: false,
      });
    }
    setIsUeModalOpen(true);
  };

  const handleSaveUe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramId) return;
    if (!ueFormData.codeUe.trim() || !ueFormData.nameUe.trim()) {
      toast.error("Le code et l'intitulé de l'UE sont obligatoires");
      return;
    }

    startTransition(async () => {
      const res = await saveUniteEnseignement({
        id: selectedUe?.id,
        programId: selectedProgramId,
        semester: selectedSemester,
        codeUe: ueFormData.codeUe.trim(),
        nameUe: ueFormData.nameUe.trim(),
        typeUe: ueFormData.typeUe as any,
        creditsEcts: Number(ueFormData.creditsEcts) || 6,
        totalHours: Number(ueFormData.totalHours) || 60,
        minPassingGrade: Number(ueFormData.minPassingGrade) || 10.0,
        isEliminatory: ueFormData.isEliminatory,
      });

      if (res.success) {
        toast.success(selectedUe ? "UE modifiée avec succès" : "Nouvelle UE créée");
        setIsUeModalOpen(false);
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement de l'UE");
      }
    });
  };

  const handleDeleteUe = async (id: number) => {
    if (!confirm("Supprimer cette Unité d'Enseignement et tous ses éléments constitutifs ?")) return;
    startTransition(async () => {
      const res = await deleteUniteEnseignement(id);
      if (res.success) {
        toast.success("UE supprimée");
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur de suppression");
      }
    });
  };

  // ─── ECU Handlers ──────────────────────────────────────────────────────────
  const handleOpenEcuModal = (ueId: number, ecu: any = null) => {
    setTargetUeId(ueId);
    if (ecu) {
      setSelectedEcu(ecu);
      setEcuFormData({
        subjectId: ecu.subjectId ? String(ecu.subjectId) : "",
        codeEcu: ecu.codeEcu || "",
        nameEcu: ecu.nameEcu,
        creditsEcts: Number(ecu.creditsEcts) || 3,
        coefficient: Number(ecu.coefficient) || 1,
        hoursCm: Number(ecu.hoursCm) || 24,
        hoursTd: Number(ecu.hoursTd) || 12,
        hoursTp: Number(ecu.hoursTp) || 0,
        hoursTpe: Number(ecu.hoursTpe) || 24,
        teacherEmployeeId: ecu.teacherEmployeeId ? String(ecu.teacherEmployeeId) : "",
        eliminatoryGrade: Number(ecu.eliminatoryGrade) || 7.0,
      });
    } else {
      setSelectedEcu(null);
      setEcuFormData({
        subjectId: "",
        codeEcu: "",
        nameEcu: "",
        creditsEcts: 3,
        coefficient: 1,
        hoursCm: 24,
        hoursTd: 12,
        hoursTp: 0,
        hoursTpe: 24,
        teacherEmployeeId: "",
        eliminatoryGrade: 7.0,
      });
    }
    setIsEcuModalOpen(true);
  };

  const handleSaveEcu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUeId) return;
    if (!ecuFormData.nameEcu.trim()) {
      toast.error("L'intitulé de l'élément constitutif (ECU) est obligatoire");
      return;
    }

    startTransition(async () => {
      const res = await saveElementConstitutif({
        id: selectedEcu?.id,
        ueId: targetUeId,
        subjectId: ecuFormData.subjectId ? Number(ecuFormData.subjectId) : undefined,
        codeEcu: ecuFormData.codeEcu.trim(),
        nameEcu: ecuFormData.nameEcu.trim(),
        creditsEcts: Number(ecuFormData.creditsEcts) || 3,
        coefficient: Number(ecuFormData.coefficient) || 1,
        hoursCm: Number(ecuFormData.hoursCm) || 24,
        hoursTd: Number(ecuFormData.hoursTd) || 12,
        hoursTp: Number(ecuFormData.hoursTp) || 0,
        hoursTpe: Number(ecuFormData.hoursTpe) || 24,
        teacherEmployeeId: ecuFormData.teacherEmployeeId ? Number(ecuFormData.teacherEmployeeId) : undefined,
        eliminatoryGrade: Number(ecuFormData.eliminatoryGrade) || 7.0,
      });

      if (res.success) {
        toast.success(selectedEcu ? "ECU modifié avec succès" : "Nouvel ECU ajouté");
        setIsEcuModalOpen(false);
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement de l'ECU");
      }
    });
  };

  const handleDeleteEcu = async (id: number) => {
    if (!confirm("Supprimer cet élément constitutif (ECU) ?")) return;
    startTransition(async () => {
      const res = await deleteElementConstitutif(id);
      if (res.success) {
        toast.success("ECU supprimé");
        loadMaquetteData();
      } else {
        toast.error(res.error || "Erreur de suppression");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/academics/lmd"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Maquette Pédagogique Universitaire
            </h1>
            <p className="text-xs text-slate-500">
              Organisation modulaire par Semestres, Unités d’Enseignement (UE) et Crédits ECTS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleOpenUeModal()}
            disabled={!selectedProgramId}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs"
          >
            <Plus className="h-4 w-4" /> Ajouter une UE
          </Button>
        </div>
      </div>

      {/* Program Selector & Semester Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Cycle / Diplôme */}
            <div className="w-full sm:w-48">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Cycle / Diplôme
              </label>
              <Select value={selectedCycle} onValueChange={(val) => setSelectedCycle(val || "Tous")}>
                <SelectTrigger className="w-full text-xs font-medium bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Cycle LMD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous" className="text-xs">Tous les cycles</SelectItem>
                  <SelectItem value="Licence" className="text-xs">Licence (L1 - L3)</SelectItem>
                  <SelectItem value="Master" className="text-xs">Master (M1 - M2)</SelectItem>
                  <SelectItem value="Doctorat" className="text-xs">Doctorat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filière LMD */}
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Filière / Parcours LMD ({filteredPrograms.length})
              </label>
              <Select
                value={selectedProgramId ? String(selectedProgramId) : ""}
                onValueChange={(val) => setSelectedProgramId(Number(val))}
              >
                <SelectTrigger className="w-full text-xs font-medium bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Choisir la filière" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPrograms.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.name} ({p.degreeLevel || "Licence"} • {p.totalCredits} ECTS)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 30 ECTS Balance Bar */}
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 ${
              maquette.isCompliant30Credits
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              {maquette.isCompliant30Credits ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Équilibre ECTS Semestre
                </div>
                <div className="text-sm font-black">
                  {maquette.totalCredits} / 30 Crédits ECTS
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Semesters Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4 overflow-x-auto">
          {semesters.map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedSemester === sem
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semestre {sem}
            </button>
          ))}
        </div>
      </div>

      {/* Maquette Tree View (UEs and ECUs) */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-medium text-xs">
            Chargement de la maquette pédagogique...
          </div>
        ) : maquette.ues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="mt-3 text-sm font-bold text-slate-700">Aucune UE configurée pour le {selectedSemester}</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              Ajoutez les Unités d’Enseignement fondamentales, méthodologiques ou transversales pour atteindre les 30 ECTS requis.
            </p>
            <Button
              onClick={() => handleOpenUeModal()}
              className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs"
            >
              <Plus className="h-4 w-4" /> Créer la 1ère UE du {selectedSemester}
            </Button>
          </div>
        ) : (
          maquette.ues.map((ue) => (
            <div
              key={ue.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* UE Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {ue.codeUe}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{ue.nameUe}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
                      <span className="text-indigo-300 font-semibold">{ue.typeUe}</span>
                      <span>•</span>
                      <span>{ue.totalHours}h Volume global</span>
                      <span>•</span>
                      <span>Seuil validation : {ue.minPassingGrade}/20</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-lg bg-white/10 text-xs font-black text-white">
                    {ue.creditsEcts} ECTS
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenUeModal(ue)}
                    className="h-8 w-8 p-0 text-slate-300 hover:text-white hover:bg-white/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteUe(ue.id)}
                    className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* ECUs List inside UE */}
              <div className="p-4 space-y-3 bg-slate-50/30">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-2">
                  <span>Éléments Constitutifs (ECU / Matières)</span>
                  <button
                    onClick={() => handleOpenEcuModal(ue.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un ECU
                  </button>
                </div>

                {ue.elementsConstitutifs?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-white">
                    Aucun élément constitutif rattaché à cette UE.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {ue.elementsConstitutifs.map((ecu: any) => (
                      <div
                        key={ecu.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-100 transition-colors gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {ecu.codeEcu && (
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {ecu.codeEcu}
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-900">{ecu.nameEcu}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>Coeff : <strong className="text-slate-700">{ecu.coefficient}</strong></span>
                            <span>•</span>
                            <span>ECTS : <strong className="text-indigo-600">{ecu.creditsEcts}</strong></span>
                            <span>•</span>
                            <span>CM: {ecu.hoursCm}h | TD: {ecu.hoursTd}h | TP: {ecu.hoursTp}h</span>
                            <span>•</span>
                            <span>Éliminatoire : &lt; {ecu.eliminatoryGrade}/20</span>
                            {ecu.teacher && (
                              <>
                                <span>•</span>
                                <span className="text-slate-700 font-medium">
                                  Prof. {ecu.teacher.firstName} {ecu.teacher.lastName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEcuModal(ue.id, ecu)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEcu(ecu.id)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── MODAL ADD/EDIT UE ────────────────────────────────────────────── */}
      <Dialog open={isUeModalOpen} onOpenChange={setIsUeModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveUe}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {selectedUe ? "Modifier l'Unité d'Enseignement" : `Nouvelle UE — ${selectedSemester}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Définissez les paramètres de la composante UE et son volume d’heures.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Code UE</label>
                  <Input
                    value={ueFormData.codeUe}
                    onChange={(e) => setUeFormData({ ...ueFormData, codeUe: e.target.value })}
                    placeholder="Ex: INF1101"
                    className="text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Crédits ECTS</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={ueFormData.creditsEcts}
                    onChange={(e) => setUeFormData({ ...ueFormData, creditsEcts: Number(e.target.value) })}
                    className="text-xs mt-1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Intitulé de l'UE</label>
                <Input
                  value={ueFormData.nameUe}
                  onChange={(e) => setUeFormData({ ...ueFormData, nameUe: e.target.value })}
                  placeholder="Ex: Algorithmique et Structures de Données"
                  className="text-xs mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Type d'UE</label>
                  <select
                    value={ueFormData.typeUe}
                    onChange={(e) => setUeFormData({ ...ueFormData, typeUe: e.target.value })}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 mt-1"
                  >
                    <option value="Fondamentale">Fondamentale</option>
                    <option value="Méthodologique">Méthodologique</option>
                    <option value="Transversale">Transversale</option>
                    <option value="Optionnelle">Optionnelle</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Volume global (heures)</label>
                  <Input
                    type="number"
                    value={ueFormData.totalHours}
                    onChange={(e) => setUeFormData({ ...ueFormData, totalHours: Number(e.target.value) })}
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUeModalOpen(false)}
                className="text-xs font-bold"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700">
                {isPending ? "Enregistrement..." : "Enregistrer l'UE"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL ADD/EDIT ECU ───────────────────────────────────────────── */}
      <Dialog open={isEcuModalOpen} onOpenChange={setIsEcuModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={handleSaveEcu}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {selectedEcu ? "Modifier l'Élément Constitutif" : "Ajouter un ECU / Matière"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Volume horaire CM/TD/TP, coefficients et enseignant responsable.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Code ECU (Optionnel)</label>
                  <Input
                    value={ecuFormData.codeEcu}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, codeEcu: e.target.value })}
                    placeholder="Ex: ALGO-1"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Intitulé de l'ECU</label>
                  <Input
                    value={ecuFormData.nameEcu}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, nameEcu: e.target.value })}
                    placeholder="Ex: Programmation C avancée"
                    className="text-xs mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Crédits ECTS</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={ecuFormData.creditsEcts}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, creditsEcts: Number(e.target.value) })}
                    className="text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Coefficient</label>
                  <Input
                    type="number"
                    value={ecuFormData.coefficient}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, coefficient: Number(e.target.value) })}
                    className="text-xs mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Note Éliminatoire</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={ecuFormData.eliminatoryGrade}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, eliminatoryGrade: Number(e.target.value) })}
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              {/* Hours CM TD TP */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Cours (CM)</label>
                  <Input
                    type="number"
                    value={ecuFormData.hoursCm}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, hoursCm: Number(e.target.value) })}
                    className="text-xs mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Dirigés (TD)</label>
                  <Input
                    type="number"
                    value={ecuFormData.hoursTd}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, hoursTd: Number(e.target.value) })}
                    className="text-xs mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Pratiques (TP)</label>
                  <Input
                    type="number"
                    value={ecuFormData.hoursTp}
                    onChange={(e) => setEcuFormData({ ...ecuFormData, hoursTp: Number(e.target.value) })}
                    className="text-xs mt-1 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Enseignant Responsable</label>
                <select
                  value={ecuFormData.teacherEmployeeId}
                  onChange={(e) => setEcuFormData({ ...ecuFormData, teacherEmployeeId: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 mt-1"
                >
                  <option value="">Sélectionner un enseignant...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom} ({t.poste || "Enseignant"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEcuModalOpen(false)}
                className="text-xs font-bold"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700">
                {isPending ? "Enregistrement..." : "Enregistrer l'ECU"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
