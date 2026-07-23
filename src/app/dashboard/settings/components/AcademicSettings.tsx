"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, GraduationCap, Bookmark, BookOpen, Link as LinkIcon, Loader2, Bell, FileUp, Search, Pencil, Building2, Layers, MapPin, Plus, Check, Sparkles, Filter, CheckCircle2, X, AlertTriangle, ChevronRight, Hash } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  createSession, deleteSession, 
  createClass, updateClass, deleteClass, 
  createSection, updateSection, deleteSection, 
  createSubject, deleteSubject, importSubjects,
  linkSubjectToSection, updateSectionSubjectLink, deleteSectionSubjectLink,
  addClassSubjectLink, updateClassSubjectLink, deleteClassSubjectLink,
  createGradingAppreciation, deleteGradingAppreciation,
  createSchoolRemark, deleteSchoolRemark,
  createPeriod, deletePeriod, updatePeriod,
  createEducationalLevel, deleteEducationalLevel, createCanevasReferenceItem, deleteCanevasReferenceItem
} from "@/domains/academics/actions/academics.actions";

export function AcademicSettings({ 
  initialSessions, 
  initialClasses, 
  initialSections, 
  initialSubjects, 
  initialSectionSubjects,
  initialClassSubjects,
  initialGradingAppreciations,
  initialSchoolRemarks,
  initialPeriods,
  initialEducationalLevels,
  initialCanevasReferences,
  canEdit = true
}: any) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Form states
  const [sessionName, setSessionName] = useState("");
  const [className, setClassName] = useState("");
  const [classSectionId, setClassSectionId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [scolarite, setScolarite] = useState("");
  const [inscription, setInscription] = useState("");
  const [coges, setCoges] = useState("");
  const [transport, setTransport] = useState("");
  const [ancienSolde, setAncienSolde] = useState("");
  const [statutInitial, setStatutInitial] = useState("");
  
  // Edit class states
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassSectionId, setEditClassSectionId] = useState("");
  const [editRoomName, setEditRoomName] = useState("");
  const [editScolarite, setEditScolarite] = useState("");
  const [editInscription, setEditInscription] = useState("");
  const [editCoges, setEditCoges] = useState("");
  const [editTransport, setEditTransport] = useState("");
  const [editAncienSolde, setEditAncienSolde] = useState("");
  const [editStatutInitial, setEditStatutInitial] = useState("");
  
  // Period states
  const [periodName, setPeriodName] = useState("");
  const [periodType, setPeriodType] = useState("Trimestre");
  const [periodSessionId, setPeriodSessionId] = useState("");
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);

  const [sectionName, setSectionName] = useState("");
  const [sectionLevel, setSectionLevel] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [levelName, setLevelName] = useState("");
  const [canevasTypeName, setCanevasTypeName] = useState("");
  const [canevasCycleName, setCanevasCycleName] = useState("");
  const [canevasCommuneName, setCanevasCommuneName] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectNiveau, setSubjectNiveau] = useState("");
  const [subjectSectionId, setSubjectSectionId] = useState("");
  
  // Link states
  const [linkSectionId, setLinkSectionId] = useState("");
  const [linkPeriod, setLinkPeriod] = useState("Tous");
  const [linkSubjectId, setLinkSubjectId] = useState("");
  const [linkCoef, setLinkCoef] = useState("1");
  const [linkEliminatory, setLinkEliminatory] = useState(false);
  const [sectionSubjectSearch, setSectionSubjectSearch] = useState("");
  const [sectionSubjectFilterSection, setSectionSubjectFilterSection] = useState("all");
  const [showSectionLinkBuilder, setShowSectionLinkBuilder] = useState(false);

  // Plan d'études states
  const [planClassId, setPlanClassId] = useState("");
  const [planSubjectId, setPlanSubjectId] = useState("");
  const [planCoef, setPlanCoef] = useState("1");
  const [classPlanSearch, setClassPlanSearch] = useState("");
  const [selectedClassForModal, setSelectedClassForModal] = useState<any | null>(null);

  // Edit section-subject link states
  const [editingSectionLink, setEditingSectionLink] = useState<any | null>(null);
  const [editLinkSectionId, setEditLinkSectionId] = useState("");
  const [editLinkPeriod, setEditLinkPeriod] = useState("Tous");
  const [editLinkSubjectId, setEditLinkSubjectId] = useState("");
  const [editLinkCoef, setEditLinkCoef] = useState("1");
  const [editLinkEliminatory, setEditLinkEliminatory] = useState(false);

  // Edit class-subject link states
  const [editingClassSubject, setEditingClassSubject] = useState<any | null>(null);
  const [editClassCoef, setEditClassCoef] = useState("1");
  const [editClassSubjectId, setEditClassSubjectId] = useState("");

  // Grading states
  const [gradingName, setGradingName] = useState("");
  const [gradingScore, setGradingScore] = useState("10");

  // Remark states
  const [remarkCategory, setRemarkCategory] = useState("Conduite");
  const [remarkContent, setRemarkContent] = useState("");
  const [remarkSectionId, setRemarkSectionId] = useState("");

  const handleCreateSession = () => {
    if (!sessionName) return;
    startTransition(async () => {
      const res = await createSession(sessionName);
      if (res.success) {
        toast.success(`Année scolaire "${sessionName}" ajoutée avec succès`);
        setSessionName("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'ajout de l'année scolaire");
      }
    });
  };

  const handleCreatePeriod = () => {
    if (!periodName || !periodType) return;
    startTransition(async () => {
      if (editingPeriodId) {
        const res = await updatePeriod(editingPeriodId, {
          name: periodName,
          periodType: periodType,
          sessionId: periodSessionId ? Number(periodSessionId) : null,
          isActive: true
        });
        if (res.success) {
          toast.success("Période mise à jour avec succès");
          setEditingPeriodId(null);
          setPeriodName("");
          router.refresh();
        } else {
          toast.error(res.error || "Erreur lors de la modification de la période");
        }
      } else {
        const res = await createPeriod({ 
          name: periodName, 
          periodType: periodType, 
          sessionId: periodSessionId ? Number(periodSessionId) : null,
          isActive: true
        });
        if (res.success) {
          toast.success(`Période "${periodName}" créée avec succès`);
          setPeriodName("");
          router.refresh();
        } else {
          toast.error(res.error || "Erreur lors de la création de la période");
        }
      }
    });
  };

  const handleGeneratePresetPeriods = (type: "Primaire" | "CollegeLycee" | "Superior") => {
    startTransition(async () => {
      let periodsToCreate: { name: string; periodType: string }[] = [];
      if (type === "Primaire") {
        periodsToCreate = [
          { name: "1er Trimestre", periodType: "Trimestre" },
          { name: "2ème Trimestre", periodType: "Trimestre" },
          { name: "3ème Trimestre", periodType: "Trimestre" },
        ];
      } else if (type === "CollegeLycee") {
        periodsToCreate = [
          { name: "1er Semestre", periodType: "Semestre" },
          { name: "2ème Semestre", periodType: "Semestre" },
        ];
      } else if (type === "Superior") {
        periodsToCreate = Array.from({ length: 14 }, (_, i) => {
          const num = i + 1;
          return {
            name: `${num === 1 ? "1er" : `${num}ème`} Semestre (S${num})`,
            periodType: "Semestre",
          };
        });
      }

      const sid = periodSessionId ? Number(periodSessionId) : null;
      let count = 0;
      for (const p of periodsToCreate) {
        const exists = initialPeriods?.some((ip: any) => ip.name === p.name && (sid === null || ip.sessionId === sid));
        if (!exists) {
          await createPeriod({
            name: p.name,
            periodType: p.periodType,
            sessionId: sid,
            isActive: true,
          });
          count++;
        }
      }
      toast.success(`${count} période(s) générée(s) avec succès !`);
      router.refresh();
    });
  };

  const startEditPeriod = (p: any) => {
    setEditingPeriodId(p.id);
    setPeriodName(p.name);
    setPeriodType(p.periodType);
    setPeriodSessionId(p.sessionId?.toString() || "");
  };

  const handleCreateClass = () => {
    if (!className || !classSectionId) return;
    startTransition(async () => {
      const res = await createClass({ 
        className, 
        sectionId: Number(classSectionId),
        roomName,
        scolariteMensuelle: scolarite ? Number(scolarite) : 0,
        droitsInscription: inscription ? Number(inscription) : 0,
        cogesCarteId: coges ? Number(coges) : 0,
        transportInternat: transport ? Number(transport) : 0,
        ancienSolde: ancienSolde ? Number(ancienSolde) : 0,
        statutInitial
      });
      if (res.success) {
        toast.success(`Classe "${className}" créée avec succès`);
        setClassName("");
        setRoomName("");
        setScolarite("");
        setInscription("");
        setCoges("");
        setTransport("");
        setAncienSolde("");
        setStatutInitial("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la création de la classe");
      }
    });
  };

  const startEditClass = (c: any) => {
    setEditingClassId(c.id);
    setEditClassName(c.className);
    setEditClassSectionId(c.sectionId?.toString() || "");
    setEditRoomName(c.roomName || "");
    setEditScolarite(c.scolariteMensuelle?.toString() || "");
    setEditInscription(c.droitsInscription?.toString() || "");
    setEditCoges(c.cogesCarteId?.toString() || "");
    setEditTransport(c.transportInternat?.toString() || "");
    setEditAncienSolde(c.ancienSolde?.toString() || "");
    setEditStatutInitial(c.statutInitial || "");
  };

  const handleUpdateClass = (id: number) => {
    if (!editClassName || !editClassSectionId) return;
    startTransition(async () => {
      const res = await updateClass(id, {
        className: editClassName,
        sectionId: Number(editClassSectionId),
        roomName: editRoomName,
        scolariteMensuelle: editScolarite ? Number(editScolarite) : 0,
        droitsInscription: editInscription ? Number(editInscription) : 0,
        cogesCarteId: editCoges ? Number(editCoges) : 0,
        transportInternat: editTransport ? Number(editTransport) : 0,
        ancienSolde: editAncienSolde ? Number(editAncienSolde) : 0,
        statutInitial: editStatutInitial,
      });
      if (res.success) {
        toast.success(`Classe "${editClassName}" mise à jour avec succès`);
        setEditingClassId(null);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la mise à jour de la classe");
      }
    });
  };

  const handleCreateLevel = () => {
    if (!levelName) return;
    startTransition(async () => {
      const res = await createEducationalLevel(levelName);
      if (res.success) {
        toast.success(`Niveau "${levelName}" ajouté avec succès`);
        setLevelName("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'ajout du niveau");
      }
    });
  };

  const handleCreateCanevasReference = (category: "type" | "cycle" | "commune", value: string, reset: () => void) => {
    if (!value.trim()) return;
    startTransition(async () => {
      const res = await createCanevasReferenceItem(category, value);
      if (res.success) {
        toast.success("R?f?rence canevas ajout?e avec succ?s");
        reset();
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'ajout de la r?f?rence");
      }
    });
  };

  const handleCreateSection = () => {
    if (!sectionName) return;
    startTransition(async () => {
      const res = await createSection({ sectionName, educationalLevel: sectionLevel });
      if (res.success) {
        toast.success(`Section "${sectionName}" créée avec succès`);
        setSectionName("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la création de la section");
      }
    });
  };

  const handleCreateSubject = () => {
    if (!subjectName) return;
    startTransition(async () => {
      const res = await createSubject({ 
        subjectName, 
        sectionId: subjectSectionId ? Number(subjectSectionId) : undefined 
      });
      if (res.success) {
        toast.success(`Matière "${subjectName}" créée avec succès`);
        setSubjectName("");
        setSubjectSectionId("");
        setSubjectNiveau("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la création de la matière");
      }
    });
  };

  const handleLinkSubject = (targetSecId?: string, targetSubId?: string, targetTerm?: string, targetCoef?: string, targetElim?: boolean) => {
    const secId = targetSecId || linkSectionId;
    const subId = targetSubId || linkSubjectId;
    const term = targetTerm || linkPeriod;
    const coef = targetCoef || linkCoef;
    const elim = targetElim !== undefined ? targetElim : linkEliminatory;

    if (!secId || !subId) {
      toast.error("Veuillez sélectionner une section et une matière");
      return;
    }
    startTransition(async () => {
      const res = await linkSubjectToSection({
        sectionId: Number(secId),
        subjectId: Number(subId),
        term: term,
        defaultCoef: Number(coef),
        isEliminatory: elim
      });
      if (res.success) {
        toast.success("Matière asociada avec succès à la section");
        setLinkSubjectId("");
        setShowSectionLinkBuilder(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la liaison de la matière");
      }
    });
  };

  const handleAddPlanLink = (targetClassId?: string, targetSubjectId?: string, targetCoef?: string) => {
    const clsId = targetClassId || planClassId;
    const subId = targetSubjectId || planSubjectId;
    const coef = targetCoef || planCoef;

    if (!clsId || !subId) {
      toast.error("Veuillez sélectionner une classe et une matière");
      return;
    }
    startTransition(async () => {
      const res = await addClassSubjectLink({
        classId: Number(clsId),
        subjectId: Number(subId),
        coefficient: Number(coef)
      });
      if (res.success) {
        toast.success("Matière ajoutée au plan d'études avec succès");
        setPlanSubjectId("");
        setPlanCoef("1");
        setSelectedClassForModal(null);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la liaison de la matière");
      }
    });
  };

  const handleUpdateSectionLink = () => {
    if (!editingSectionLink) return;
    startTransition(async () => {
      const res = await updateSectionSubjectLink(editingSectionLink.id, {
        sectionId: Number(editLinkSectionId),
        subjectId: Number(editLinkSubjectId),
        term: editLinkPeriod,
        defaultCoef: Number(editLinkCoef),
        isEliminatory: editLinkEliminatory,
      });
      if (res.success) {
        toast.success("Carte de section mise à jour avec succès");
        setEditingSectionLink(null);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la modification");
      }
    });
  };

  const handleUpdateClassSubjectLink = () => {
    if (!editingClassSubject) return;
    startTransition(async () => {
      const res = await updateClassSubjectLink(editingClassSubject.id, {
        coefficient: Number(editClassCoef),
        subjectId: Number(editClassSubjectId),
      });
      if (res.success) {
        toast.success("Matière de classe mise à jour avec succès");
        setEditingClassSubject(null);
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la modification");
      }
    });
  };

  const handleCreateGrading = () => {
    if (!gradingName) return;
    startTransition(async () => {
      const res = await createGradingAppreciation(gradingName, Number(gradingScore));
      if (res.success) {
        toast.success("Appréciation ajoutée avec succès");
        setGradingName("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'ajout de l'appréciation");
      }
    });
  };

  const handleCreateRemark = () => {
    if (!remarkContent) return;
    startTransition(async () => {
      const res = await createSchoolRemark({
        category: remarkCategory,
        content: remarkContent,
        sectionId: remarkSectionId ? Number(remarkSectionId) : undefined
      });
      if (res.success) {
        toast.success("Mention ajoutée avec succès");
        setRemarkContent("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de l'ajout de la remarque");
      }
    });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Sessions */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="text-blue-500" />
          <h2 className="text-xl font-bold text-white">Années Scolaires (Sessions)</h2>
        </div>
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Ex: 2025-2026"
            value={sessionName}
            disabled={!canEdit}
            onChange={(e) => setSessionName(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <Button onClick={handleCreateSession} disabled={isPending || !sessionName || !canEdit} className="h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 disabled:opacity-50">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {initialSessions.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <span className="text-slate-300 font-medium">{s.sessionName} {s.isActive && <span className="text-xs ml-2 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">Active</span>}</span>
              <button 
                onClick={() => {
                  if (confirm(`Supprimer l'année scolaire "${s.sessionName}" ?`)) {
                    startTransition(async () => {
                      const res = await deleteSession(s.id);
                      if (res.success) {
                        toast.success("Année scolaire supprimée avec succès");
                        router.refresh();
                      } else {
                        toast.error(res.error || "Erreur lors de la suppression");
                      }
                    });
                  }
                }}
                disabled={isPending || !canEdit}
                className="text-rose-500/70 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 1.5 Périodes */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-teal-500" />
            <h2 className="text-xl font-bold text-white">Périodes (Trimestres / Semestres)</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Génération rapide :</span>
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("Primaire")}
              className="text-xs bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ Primaire (3 Trimestres)
            </button>
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("CollegeLycee")}
              className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ Collège / Lycée (2 Semestres)
            </button>
            <button
              type="button"
              disabled={isPending || !canEdit}
              onClick={() => handleGeneratePresetPeriods("Superior")}
              className="text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/30 transition-all font-semibold disabled:opacity-40"
            >
              ⚡ Licence/Master/Doctorat (S1 - S14)
            </button>
          </div>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom (ex: 1er Trimestre)"
            value={periodName}
            disabled={!canEdit}
            onChange={(e) => setPeriodName(e.target.value)}
            className="flex-[2] bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-teal-500 disabled:opacity-50"
          />
          <select 
            value={periodType}
            disabled={!canEdit}
            onChange={(e) => setPeriodType(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none disabled:opacity-50"
          >
            <option value="Trimestre">Trimestre</option>
            <option value="Semestre">Semestre</option>
          </select>
          <select 
            value={periodSessionId}
            disabled={!canEdit}
            onChange={(e) => setPeriodSessionId(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none disabled:opacity-50"
          >
            <option value="">-- Année Scolaire --</option>
            {initialSessions.map((s: any) => (
              <option key={s.id} value={s.id}>{s.sessionName}</option>
            ))}
          </select>
          <Button onClick={handleCreatePeriod} disabled={isPending || !periodName || !canEdit} className="h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 disabled:opacity-50">
            {editingPeriodId ? "Modifier" : "+ Ajouter"}
          </Button>
          {editingPeriodId && (
             <Button variant="ghost" onClick={() => { setEditingPeriodId(null); setPeriodName(""); }} className="h-12 text-slate-400">Annuler</Button>
          )}
        </div>
        <div className="space-y-2">
          {initialPeriods?.map((p: any) => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${editingPeriodId === p.id ? 'bg-teal-500/10 border-teal-500/50' : 'bg-[#181924] border-slate-800/50'}`}>
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-bold">{p.name}</span>
                <span className="text-[10px] uppercase font-black tracking-widest text-teal-500 bg-teal-500/10 px-2 py-1 rounded-md">{p.periodType}</span>
                {p.session && <span className="text-[10px] text-slate-500 uppercase tracking-widest">{p.session.sessionName}</span>}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startEditPeriod(p)}
                  disabled={isPending || !canEdit}
                  className="text-slate-500 hover:text-teal-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Supprimer la période "${p.name}" ?`)) {
                      startTransition(async () => {
                        const res = await deletePeriod(p.id);
                        if (res.success) {
                          toast.success("Période supprimée avec succès");
                        } else {
                          toast.error(res.error || "Erreur lors de la suppression");
                        }
                      });
                    }
                  }}
                  disabled={isPending || !canEdit}
                  className="text-rose-500/70 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {(!initialPeriods || initialPeriods.length === 0) && (
            <div className="text-center p-4 text-slate-500 text-sm">Aucune période définie.</div>
          )}
        </div>
      </div>

      {/* 1.7 Niveaux */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="text-purple-500" />
          <h2 className="text-xl font-bold text-white">Niveaux d'Étude</h2>
        </div>
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom (ex: Lycée, Supérieur)"
            value={levelName}
            disabled={!canEdit}
            onChange={(e) => setLevelName(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <Button onClick={handleCreateLevel} disabled={isPending || !levelName || !canEdit} className="h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6 disabled:opacity-50">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {initialEducationalLevels?.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <span className="text-slate-300 font-medium">{l.levelName}</span>
              <button 
                onClick={() => {
                  if (confirm(`Supprimer le niveau "${l.levelName}" ?`)) {
                    startTransition(async () => {
                      const res = await deleteEducationalLevel(l.id);
                      if (res.success) {
                        toast.success("Niveau supprimé avec succès");
                      } else {
                        toast.error(res.error || "Erreur lors de la suppression");
                      }
                    });
                  }
                }}
                disabled={isPending || !canEdit}
                className="text-rose-500/70 hover:text-rose-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!initialEducationalLevels || initialEducationalLevels.length === 0) && (
            <div className="text-center p-4 text-slate-500 text-sm">Aucun niveau défini.</div>
          )}
        </div>
      </div>

      {/* 2. Sections / Filières */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Bookmark className="text-amber-500" />
          <h2 className="text-xl font-bold text-white">Sections / Filières</h2>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom de la section (ex: Littéraire)"
            value={sectionName}
            disabled={!canEdit}
            onChange={(e) => setSectionName(e.target.value)}
            className="flex-[2] bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
          <select 
            value={sectionLevel}
            disabled={!canEdit}
            onChange={(e) => setSectionLevel(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none disabled:opacity-50"
          >
            <option value="">Sélectionner un niveau</option>
            {initialEducationalLevels?.map((l: any) => (
              <option key={l.id} value={l.levelName}>{l.levelName}</option>
            ))}
          </select>
          <Button onClick={handleCreateSection} disabled={isPending || !sectionName || !canEdit} className="h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 disabled:opacity-50">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-4">
          {initialSections.map((s: any) => (
            <div key={s.id} className="p-6 rounded-3xl bg-[#181924] border border-slate-800/50 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-white">{s.sectionName}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">{s.educationalLevel}</span>
                </div>
                <button 
                  onClick={() => startTransition(() => { deleteSection(s.id); })}
                  disabled={isPending || !canEdit}
                  className="text-rose-500/70 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-4 border-t border-slate-800/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Passage</label>
                  <input 
                    type="number" 
                    step="0.1"
                    defaultValue={s.minPassingGrade}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        startTransition(() => { updateSection(s.id, { minPassingGrade: val }); });
                      }
                    }}
                    className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Redoubl.</label>
                  <input 
                    type="number" 
                    step="0.1"
                    defaultValue={s.redoublementThreshold}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        startTransition(() => { updateSection(s.id, { redoublementThreshold: val }); });
                      }
                    }}
                    className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Exclusion</label>
                  <input 
                    type="number" 
                    step="0.1"
                    defaultValue={s.exclusionThreshold}
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        startTransition(() => { updateSection(s.id, { exclusionThreshold: val }); });
                      }
                    }}
                    className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Périodes</label>
                  <select 
                    defaultValue={s.numTerms}
                    onChange={(e) => startTransition(() => { updateSection(s.id, { numTerms: parseInt(e.target.value) }); })}
                    className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none font-bold"
                  >
                    <option value={2}>2 (Semestres)</option>
                    <option value={3}>3 (Trimestres)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Libellés (comma separated)</label>
                  <input 
                    type="text" 
                    defaultValue={s.termLabels}
                    onBlur={(e) => startTransition(() => { updateSection(s.id, { termLabels: e.target.value }); })}
                    className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl h-12 px-4 focus:outline-none focus:border-amber-500 font-bold text-xs"
                    placeholder="T1, T2, T3"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Classes / Niveaux */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="text-emerald-500" />
          <h2 className="text-xl font-bold text-white">Classes / Niveaux</h2>
        </div>
        
        {/* New Class Form */}
        <div className="space-y-4 mb-8 bg-[#181924] border border-slate-800/80 p-5 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">NOM DE LA CLASSE</label>
              <input 
                type="text" 
                placeholder="Ex: 6ème A"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">SECTION</label>
              <select 
                value={classSectionId}
                onChange={(e) => setClassSectionId(e.target.value)}
                className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-12 focus:outline-none"
              >
                <option value="">Sélectionner une Section</option>
                {initialSections.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.sectionName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">SALLE</label>
              <input 
                type="text" 
                placeholder="Ex: Salle 10"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-800/60 my-4 pt-4">
            <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-4">PLANIFICATION DES FRAIS (FCFA)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">SCOLARITÉ MENSUELLE</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={scolarite}
                  onChange={(e) => setScolarite(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">DROITS D'INSCRIPTION</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={inscription}
                  onChange={(e) => setInscription(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">COGES & CARTE ID</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={coges}
                  onChange={(e) => setCoges(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">TRANSPORT & INTERNAT</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">ANCIEN SOLDE</label>
                <input 
                  type="number" 
                  placeholder="0 FCFA"
                  value={ancienSolde}
                  onChange={(e) => setAncienSolde(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">STATUT INITIAL</label>
                <input 
                  type="text" 
                  placeholder="Ex: Actif"
                  value={statutInitial}
                  onChange={(e) => setStatutInitial(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl px-4 h-11 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleCreateClass} disabled={isPending || !className || !classSectionId} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-bold">
              + Ajouter la classe
            </Button>
          </div>
        </div>

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialClasses.map((c: any) => {
            const isEditing = editingClassId === c.id;
            
            if (isEditing) {
              return (
                <div key={c.id} className="flex flex-col p-5 rounded-2xl bg-[#181924] border border-emerald-500/50 gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 font-bold text-sm">Modifier la classe</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateClass(c.id)}
                        disabled={isPending}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 font-semibold transition-all disabled:opacity-50"
                      >
                        Enregistrer
                      </button>
                      <button 
                        onClick={() => setEditingClassId(null)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg px-3 py-1 font-semibold transition-all"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Nom de la classe</label>
                      <input 
                        type="text" 
                        value={editClassName}
                        onChange={(e) => setEditClassName(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Salle</label>
                      <input 
                        type="text" 
                        value={editRoomName}
                        onChange={(e) => setEditRoomName(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-1">Section</label>
                      <select 
                        value={editClassSectionId}
                        onChange={(e) => setEditClassSectionId(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="">Sélectionner une Section</option>
                        {initialSections.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.sectionName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px]">
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Scolarité</label>
                      <input 
                        type="number" 
                        value={editScolarite}
                        onChange={(e) => setEditScolarite(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Inscription</label>
                      <input 
                        type="number" 
                        value={editInscription}
                        onChange={(e) => setEditInscription(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Coges & ID</label>
                      <input 
                        type="number" 
                        value={editCoges}
                        onChange={(e) => setEditCoges(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Transport</label>
                      <input 
                        type="number" 
                        value={editTransport}
                        onChange={(e) => setEditTransport(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Ancien Solde</label>
                      <input 
                        type="number" 
                        value={editAncienSolde}
                        onChange={(e) => setEditAncienSolde(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] text-slate-500 uppercase font-black mb-0.5">Statut Initial</label>
                      <input 
                        type="text" 
                        value={editStatutInitial}
                        onChange={(e) => setEditStatutInitial(e.target.value)}
                        className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={c.id} className="flex flex-col p-4 rounded-2xl bg-[#181924] border border-slate-800/80 gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-black text-base">{c.className}</span>
                    {c.section && <span className="text-[10px] bg-slate-800/60 text-slate-400 px-2 py-1 rounded-md uppercase font-bold tracking-wider">{c.section.sectionName}</span>}
                    {c.roomName && <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-1 rounded-md uppercase font-bold tracking-wider">Salle: {c.roomName}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => startEditClass(c)}
                      className="text-slate-400 hover:text-emerald-500 transition-colors p-1"
                    >
                      <Pencil size={15} />
                    </button>
                    <button 
                      onClick={() => startTransition(() => { deleteClass(c.id); })}
                      disabled={isPending}
                      className="text-rose-500/70 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-3 gap-x-2 pt-3 border-t border-slate-800/50 text-[10px] text-slate-400">
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Scolarité</span>
                    <span className="font-mono text-slate-200 font-bold">{c.scolariteMensuelle || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Inscription</span>
                    <span className="font-mono text-slate-200 font-bold">{c.droitsInscription || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Coges & ID</span>
                    <span className="font-mono text-slate-200 font-bold">{c.cogesCarteId || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Transport</span>
                    <span className="font-mono text-slate-200 font-bold">{c.transportInternat || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Ancien Solde</span>
                    <span className="font-mono text-slate-200 font-bold">{c.ancienSolde || 0} FCFA</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-500 uppercase font-black tracking-wider mb-0.5">Statut Initial</span>
                    <span className="text-slate-200 font-bold">{c.statutInitial || 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Matières d'Enseignement */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-[2.5rem] p-8 shadow-sm group">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shadow-inner">
              <BookOpen size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Matières d'Enseignement</h2>
              <p className="text-sm text-slate-500 font-medium italic">Base de données globale des disciplines</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Button 
                variant="outline" 
                disabled={isPending || !canEdit}
                onClick={() => {
                   const input = prompt("Importer des matières (Séparez par des virgules) :\nEx: Mathématiques, Physique, Arabe");
                   if (input && input.trim()) {
                      const list = input.split(",").map(s => s.trim()).filter(Boolean);
                      startTransition(async () => {
                         await importSubjects(list, subjectSectionId ? Number(subjectSectionId) : undefined);
                      });
                   }
                }}
                className="h-12 rounded-xl border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 px-6 font-bold disabled:opacity-50"
             >
                <FileUp size={18} /> Importer
             </Button>
             <Button 
                onClick={handleCreateSubject} 
                disabled={isPending || !subjectName || !canEdit} 
                className="h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl px-8 font-black shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
             >
                {isPending ? <Loader2 size={18} className="animate-spin" /> : "+ Ajouter"}
             </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-[#181924]/50 p-6 rounded-3xl border border-slate-800/30">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Niveau d'Étude</label>
            <select 
              value={subjectNiveau}
              onChange={(e) => {
                setSubjectNiveau(e.target.value);
                setSubjectSectionId("");
              }}
              className="w-full bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-purple-500"
            >
              <option value="">Tous les niveaux</option>
              {initialEducationalLevels?.map((l: any) => (
                <option key={l.id} value={l.levelName}>{l.levelName}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Section / Filière spécifique</label>
            <select 
              value={subjectSectionId}
              onChange={(e) => setSubjectSectionId(e.target.value)}
              className="w-full bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-purple-500"
            >
              <option value="">Global (Toutes les sections)</option>
              {initialSections
                ?.filter((s: any) => !subjectNiveau || s.educationalLevel === subjectNiveau)
                .map((s: any) => (
                  <option key={s.id} value={s.id}>{s.sectionName}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="relative mb-8">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-500 transition-colors" size={20} />
           <input 
              type="text" 
              placeholder="Rechercher une matière par son nom..."
              value={subjectName || subjectSearch}
              onChange={(e) => {
                 setSubjectName(e.target.value);
                 setSubjectSearch(e.target.value);
              }}
              className="w-full bg-[#181924] border border-slate-800 text-white rounded-[1.25rem] pl-14 pr-4 h-16 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-lg placeholder:text-slate-600 shadow-inner"
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
          {initialSubjects
            .filter((s: any) => s.subjectName.toLowerCase().includes(subjectSearch.toLowerCase()))
            .map((s: any) => (
            <div key={s.id} className="flex flex-col gap-4 p-6 rounded-[2rem] bg-[#181924] border border-slate-800/50 hover:border-purple-500/40 transition-all hover:bg-[#1c1d29] group/item relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl -mr-12 -mt-12 group-hover/item:bg-purple-500/10 transition-colors"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-slate-800/50 border border-slate-700/50 text-purple-400 flex items-center justify-center text-sm font-black shadow-sm group-hover/item:bg-purple-500 group-hover/item:text-white transition-all">
                      {s.subjectName.substring(0, 2).toUpperCase()}
                   </div>
                   <span className="text-slate-200 font-black text-xl tracking-tight">{s.subjectName}</span>
                </div>
                <button 
                  onClick={() => {
                    if(confirm(`Supprimer la matière "${s.subjectName}" ?`)) {
                      startTransition(() => { deleteSubject(s.id); });
                    }
                  }}
                  disabled={isPending}
                  className="text-slate-600 hover:text-rose-500 transition-all p-2.5 hover:bg-rose-500/10 rounded-2xl opacity-0 group-hover/item:opacity-100"
                >
                  <Trash2 size={20} />
                </button>
              </div>
              
              {/* Classes and Sections links */}
              <div className="flex flex-wrap gap-2 mt-auto relative z-10">
                 {s.classLinks && s.classLinks.length > 0 ? (
                    s.classLinks.map((link: any) => (
                       <div key={link.id} className="group/tag flex items-center gap-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 px-3 py-1.5 rounded-xl transition-all cursor-default">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                          <span className="text-[11px] text-indigo-400 font-black uppercase tracking-wider">
                             {link.class?.section?.sectionName} {link.class?.className}
                          </span>
                       </div>
                    ))
                 ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/30 border border-slate-800/50">
                       <span className="text-[10px] text-slate-600 font-bold italic">Aucune assignation active</span>
                    </div>
                 )}
              </div>
            </div>
          ))}
          
          {(initialSubjects.length === 0 || initialSubjects.filter((s: any) => s.subjectName.toLowerCase().includes(subjectSearch.toLowerCase())).length === 0) && (
             <div className="col-span-full py-20 text-center space-y-4 bg-[#181924]/50 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                <div className="w-20 h-20 rounded-3xl bg-slate-800/50 mx-auto flex items-center justify-center text-slate-700 shadow-inner">
                   <BookOpen size={40} />
                </div>
                <div>
                   <p className="text-slate-400 text-lg font-bold">Aucune matière trouvée</p>
                   <p className="text-slate-600 text-sm font-medium">Commencez par ajouter ou importer des matières</p>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* 5. Lien Matières ↔ Sections (Propagation Intelligente) - CARDS DESIGN */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shadow-inner">
              <LinkIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Lien Matières ↔ Sections
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Propagation Intelligente
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Définissez les matières, coefficients et périodes associées par section sous forme de بطاقات (Cartes interactives)</p>
            </div>
          </div>

          <Button 
            onClick={() => setShowSectionLinkBuilder(!showSectionLinkBuilder)}
            className="h-11 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl px-5 font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/30"
          >
            {showSectionLinkBuilder ? <X size={16} /> : <Plus size={16} />}
            <span>{showSectionLinkBuilder ? "Fermer le constructeur" : "+ Nouvelle Association (Carte)"}</span>
          </Button>
        </div>

        {/* Builder Panel / Card Form */}
        {showSectionLinkBuilder && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-cyan-500/30 shadow-2xl space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <Sparkles size={16} /> Constructeur d'Association par Cartes
              </span>
              <button onClick={() => setShowSectionLinkBuilder(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Step 1: Section */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">1. Section Cible</label>
                <select 
                  value={linkSectionId}
                  onChange={(e) => setLinkSectionId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="">-- Choisir une Section --</option>
                  {initialSections.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.sectionName} ({s.educationalLevel || 'Tous'})</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Period */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">2. Période</label>
                <select 
                  value={linkPeriod}
                  onChange={(e) => setLinkPeriod(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="Tous">Toutes les Périodes (Tous)</option>
                  {initialPeriods?.map((p: any) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  {(!initialPeriods || initialPeriods.length === 0) && (
                    <>
                      <option value="1er Trimestre">1er Trimestre</option>
                      <option value="2ème Trimestre">2ème Trimestre</option>
                      <option value="3ème Trimestre">3ème Trimestre</option>
                      <option value="1er Semestre">1er Semestre</option>
                      <option value="2ème Semestre">2ème Semestre</option>
                    </>
                  )}
                </select>
              </div>

              {/* Step 3: Subject */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">3. Matière</label>
                <select 
                  value={linkSubjectId}
                  onChange={(e) => setLinkSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="">-- Choisir une Matière --</option>
                  {initialSubjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              {/* Step 4: Coef & Éliminatoire */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">4. Coef & Option</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      min="1"
                      value={linkCoef}
                      onChange={(e) => setLinkCoef(e.target.value)}
                      className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 text-center font-black text-lg"
                      placeholder="Coef"
                    />
                  </div>
                  <label className="flex items-center gap-2 h-12 px-3 rounded-xl bg-[#1F222B] border border-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={linkEliminatory}
                      onChange={(e) => setLinkEliminatory(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 accent-rose-500"
                    />
                    <span className="text-xs font-bold text-rose-400">Éliminatoire</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Presets Coef Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Presets Coef:</span>
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLinkCoef(num.toString())}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${linkCoef === num.toString() ? 'bg-cyan-500 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <Button 
                onClick={() => handleLinkSubject()} 
                disabled={isPending || !linkSectionId || !linkSubjectId} 
                className="h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl px-8 font-black shadow-lg shadow-cyan-900/30"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Valider et Propager la Carte</span>
              </Button>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-2xl bg-[#161822] border border-slate-800/60">
          {/* Section Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setSectionSubjectFilterSection("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${sectionSubjectFilterSection === "all" ? "bg-cyan-500 text-white shadow-md" : "bg-[#1F222B] text-slate-400 hover:text-white border border-slate-800"}`}
            >
              Toutes les Sections ({initialSectionSubjects.length})
            </button>
            {initialSections.map((sec: any) => {
              const count = initialSectionSubjects.filter((ss: any) => ss.sectionId === sec.id).length;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSectionSubjectFilterSection(sec.id.toString())}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${sectionSubjectFilterSection === sec.id.toString() ? "bg-cyan-500 text-white shadow-md" : "bg-[#1F222B] text-slate-400 hover:text-white border border-slate-800"}`}
                >
                  {sec.sectionName} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Filtrer les cartes..."
              value={sectionSubjectSearch}
              onChange={(e) => setSectionSubjectSearch(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-800 text-white rounded-xl pl-9 pr-3 h-9 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Section Subjects Cards Grid */}
        {(() => {
          const filteredLinks = initialSectionSubjects.filter((ss: any) => {
            const matchSec = sectionSubjectFilterSection === "all" || ss.sectionId?.toString() === sectionSubjectFilterSection;
            const q = sectionSubjectSearch.toLowerCase();
            const matchSearch = !q || (ss.subject?.subjectName?.toLowerCase().includes(q) || ss.section?.sectionName?.toLowerCase().includes(q) || ss.term?.toLowerCase().includes(q));
            return matchSec && matchSearch;
          });

          if (filteredLinks.length === 0) {
            return (
              <div className="py-12 text-center bg-[#161822]/60 rounded-2xl border border-dashed border-slate-800">
                <BookOpen className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-400 text-sm font-bold">Aucune carte d'association trouvée</p>
                <p className="text-slate-600 text-xs mt-1">Utilisez "+ Nouvelle Association" pour lier des matières aux sections</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLinks.map((ss: any) => (
                <div 
                  key={ss.id} 
                  className="group bg-[#161822] hover:bg-[#1a1c29] border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-4 transition-all duration-300 shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Layers size={11} /> {ss.section?.sectionName || 'Section'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[10px] font-bold">
                      📅 {ss.term || 'Tous'}
                    </span>
                  </div>

                  {/* Body Subject */}
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm shrink-0">
                      {ss.subject?.subjectName?.charAt(0)?.toUpperCase() || 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-white text-base truncate leading-tight group-hover:text-cyan-300 transition-colors">
                        {ss.subject?.subjectName}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">Propagation par Section</p>
                    </div>
                  </div>

                  {/* Footer Coef & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-black">
                        Coef {ss.defaultCoef}
                      </span>
                      {ss.isEliminatory && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black">
                          Éliminatoire
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingSectionLink(ss);
                          setEditLinkSectionId(ss.sectionId?.toString() || "");
                          setEditLinkPeriod(ss.term || "Tous");
                          setEditLinkSubjectId(ss.subjectId?.toString() || "");
                          setEditLinkCoef((ss.defaultCoef || 1).toString());
                          setEditLinkEliminatory(!!ss.isEliminatory);
                        }}
                        disabled={isPending}
                        title="Modifier la carte"
                        className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 border border-slate-700/50 hover:border-cyan-500/40 flex items-center justify-center transition-all"
                      >
                        <Pencil size={13} />
                      </button>
                      <button 
                        onClick={() => startTransition(() => { deleteSectionSubjectLink(ss.id); })}
                        disabled={isPending}
                        title="Supprimer la carte"
                        className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/40 flex items-center justify-center transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Edit Modal Panel for Section Link */}
        {editingSectionLink && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-cyan-500/50 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                <Pencil size={16} /> Modifier la Carte : <span className="text-white underline">{editingSectionLink.subject?.subjectName}</span>
              </span>
              <button onClick={() => setEditingSectionLink(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Section</label>
                <select 
                  value={editLinkSectionId}
                  onChange={(e) => setEditLinkSectionId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  {initialSections.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.sectionName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Période</label>
                <select 
                  value={editLinkPeriod}
                  onChange={(e) => setEditLinkPeriod(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  <option value="Tous">Toutes les Périodes (Tous)</option>
                  {initialPeriods?.map((p: any) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                  {(!initialPeriods || initialPeriods.length === 0) && (
                    <>
                      <option value="1er Trimestre">1er Trimestre</option>
                      <option value="2ème Trimestre">2ème Trimestre</option>
                      <option value="3ème Trimestre">3ème Trimestre</option>
                      <option value="1er Semestre">1er Semestre</option>
                      <option value="2ème Semestre">2ème Semestre</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Matière</label>
                <select 
                  value={editLinkSubjectId}
                  onChange={(e) => setEditLinkSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 font-bold text-sm"
                >
                  {initialSubjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Coef & Option</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1"
                    value={editLinkCoef}
                    onChange={(e) => setEditLinkCoef(e.target.value)}
                    className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-cyan-500 text-center font-black text-lg"
                  />
                  <label className="flex items-center gap-2 h-12 px-3 rounded-xl bg-[#1F222B] border border-slate-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={editLinkEliminatory}
                      onChange={(e) => setEditLinkEliminatory(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 accent-rose-500"
                    />
                    <span className="text-xs font-bold text-rose-400">Éliminatoire</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setEditingSectionLink(null)} variant="outline" className="h-11 border-slate-800 text-slate-400 rounded-xl px-5">
                Annuler
              </Button>
              <Button 
                onClick={handleUpdateSectionLink}
                disabled={isPending}
                className="h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl px-7 font-black shadow-lg shadow-cyan-900/30 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Enregistrer la modification</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Plan d'Études (Lien Classe-Matière) - CARDS DESIGN */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Plan d'Études (Lien Classe-Matière)
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cartes de Classes
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">Gérez le plan d'études sous forme de بطاقات (Cartes de classes) avec leurs matières et coefficients</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text"
                placeholder="Rechercher classe ou matière..."
                value={classPlanSearch}
                onChange={(e) => setClassPlanSearch(e.target.value)}
                className="w-full bg-[#161822] border border-slate-800 text-white rounded-xl pl-9 pr-3 h-11 text-xs focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Modal / Quick Add Drawer for a Specific Class Card */}
        {selectedClassForModal && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-emerald-500/40 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <Plus size={16} /> Assigner une Matière à la classe : <span className="text-white underline">{selectedClassForModal.className}</span>
              </span>
              <button onClick={() => setSelectedClassForModal(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Choisir la Matière</label>
                <select 
                  value={planSubjectId}
                  onChange={(e) => setPlanSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 font-bold text-sm"
                >
                  <option value="">-- Sélectionner --</option>
                  {initialSubjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Coefficient de la Classe</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={planCoef}
                    onChange={(e) => setPlanCoef(e.target.value)}
                    className="flex-1 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 text-center font-black text-lg"
                  />
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlanCoef(n.toString())}
                      className={`w-9 h-12 rounded-xl text-xs font-black transition-all ${planCoef === n.toString() ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setSelectedClassForModal(null)} variant="outline" className="h-11 border-slate-800 text-slate-400 rounded-xl px-5">
                Annuler
              </Button>
              <Button 
                onClick={() => handleAddPlanLink(selectedClassForModal.id.toString())}
                disabled={isPending || !planSubjectId}
                className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-7 font-black shadow-lg shadow-emerald-900/30 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Confirmer l'assignation</span>
              </Button>
            </div>
          </div>
        )}

        {/* Edit Modal Panel for Class Subject Link */}
        {editingClassSubject && (
          <div className="p-6 rounded-2xl bg-[#161822] border-2 border-emerald-500/50 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <Pencil size={16} /> Modifier le Coefficient de la Matière : <span className="text-white underline">{editingClassSubject.subject?.subjectName}</span> ({editingClassSubject.class?.className})
              </span>
              <button onClick={() => setEditingClassSubject(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Matière</label>
                <select 
                  value={editClassSubjectId}
                  onChange={(e) => setEditClassSubjectId(e.target.value)}
                  className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 font-bold text-sm"
                >
                  {initialSubjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-black uppercase tracking-wider block">Nouveau Coefficient</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={editClassCoef}
                    onChange={(e) => setEditClassCoef(e.target.value)}
                    className="flex-1 bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500 text-center font-black text-lg"
                  />
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEditClassCoef(n.toString())}
                      className={`w-9 h-12 rounded-xl text-xs font-black transition-all ${editClassCoef === n.toString() ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button onClick={() => setEditingClassSubject(null)} variant="outline" className="h-11 border-slate-800 text-slate-400 rounded-xl px-5">
                Annuler
              </Button>
              <Button 
                onClick={handleUpdateClassSubjectLink}
                disabled={isPending}
                className="h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-7 font-black shadow-lg shadow-emerald-900/30 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                <span>Enregistrer la modification</span>
              </Button>
            </div>
          </div>
        )}

        {/* Master Class Cards Grid */}
        {(() => {
          const q = classPlanSearch.toLowerCase();
          const filteredClasses = initialClasses.filter((c: any) => {
            if (!q) return true;
            const matchClassName = c.className?.toLowerCase().includes(q);
            const matchSectionName = c.section?.sectionName?.toLowerCase().includes(q);
            const assignedSubs = initialClassSubjects.filter((cs: any) => cs.classId === c.id);
            const matchSubjectName = assignedSubs.some((cs: any) => cs.subject?.subjectName?.toLowerCase().includes(q));
            return matchClassName || matchSectionName || matchSubjectName;
          });

          if (filteredClasses.length === 0) {
            return (
              <div className="py-12 text-center bg-[#161822]/60 rounded-2xl border border-dashed border-slate-800">
                <GraduationCap className="mx-auto text-slate-600 mb-2" size={32} />
                <p className="text-slate-400 text-sm font-bold">Aucune classe trouvée</p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredClasses.map((cls: any) => {
                const clsSubjects = initialClassSubjects.filter((cs: any) => cs.classId === cls.id);
                const totalCoefSum = clsSubjects.reduce((acc: number, cs: any) => acc + Number(cs.coefficient || 1), 0);

                return (
                  <div 
                    key={cls.id}
                    className="bg-[#161822] border border-slate-800/90 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg space-y-4 transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Class Card Header */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-lg">
                          {cls.className?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight flex items-center gap-2">
                            {cls.className}
                            {cls.section?.sectionName && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                                {cls.section.sectionName}
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {clsSubjects.length} Matière{clsSubjects.length !== 1 ? 's' : ''} • Total Coef: <span className="text-emerald-400 font-bold">{totalCoefSum}</span>
                          </p>
                        </div>
                      </div>

                      <Button 
                        onClick={() => setSelectedClassForModal(cls)}
                        size="sm"
                        className="h-9 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl px-3 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Plus size={14} />
                        <span>+ Assigner</span>
                      </Button>
                    </div>

                    {/* Class Card Body - Subject Mini Cards */}
                    <div className="flex-1">
                      {clsSubjects.length === 0 ? (
                        <div className="py-6 text-center rounded-xl bg-[#1F222B]/40 border border-dashed border-slate-800/80">
                          <p className="text-xs text-slate-500 font-medium mb-2">Aucune matière dans cette classe</p>
                          <button 
                            onClick={() => setSelectedClassForModal(cls)}
                            className="text-xs text-emerald-400 font-bold hover:underline"
                          >
                            + Assigner une matière maintenant
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {clsSubjects.map((cs: any) => (
                            <div 
                              key={cs.id}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-[#1F222B] border border-slate-800/60 hover:border-slate-700 transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <BookOpen size={14} className="text-emerald-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-200 truncate" title={cs.subject?.subjectName}>
                                  {cs.subject?.subjectName}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 text-[11px] font-black">
                                  Coef {cs.coefficient}
                                </span>
                                <button 
                                  onClick={() => {
                                    setEditingClassSubject(cs);
                                    setEditClassCoef((cs.coefficient || 1).toString());
                                    setEditClassSubjectId(cs.subjectId?.toString() || "");
                                  }}
                                  disabled={isPending}
                                  title="Modifier le coefficient"
                                  className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button 
                                  onClick={() => startTransition(() => { deleteClassSubjectLink(cs.id); })}
                                  disabled={isPending}
                                  title="Supprimer"
                                  className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 7. Grille de Notation (Barème) */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="text-indigo-500" />
          <h2 className="text-xl font-bold text-white">Grille de Notation (Barème)</h2>
        </div>
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Nom (ex: Excellent)"
            value={gradingName}
            onChange={(e) => setGradingName(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500"
          />
          <input 
            type="number" 
            placeholder="Score min (ex: 18)"
            value={gradingScore}
            onChange={(e) => setGradingScore(e.target.value)}
            className="w-32 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-indigo-500"
          />
          <Button onClick={handleCreateGrading} disabled={isPending || !gradingName} className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {initialGradingAppreciations.map((ga: any) => (
            <div key={ga.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <div className="flex items-center gap-4">
                <span className="text-slate-300 font-medium">{ga.name}</span>
                <span className="text-xs bg-indigo-900/30 text-indigo-400 border border-indigo-800/50 px-2 py-1 rounded-full font-bold">Min: {ga.baseScore}</span>
              </div>
              <button 
                onClick={() => startTransition(() => { deleteGradingAppreciation(ga.id); })}
                disabled={isPending}
                className="text-rose-500/70 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Appréciations de Conduite */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="text-rose-500" />
          <h2 className="text-xl font-bold text-white">Appréciations de Conduite / Travail</h2>
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-4 mb-6">
          <select 
            value={remarkCategory}
            onChange={(e) => setRemarkCategory(e.target.value)}
            className="w-40 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
          >
            <option value="Conduite">Conduite</option>
            <option value="Travail">Travail</option>
            <option value="Assiduité">Assiduité</option>
            <option value="Honneur">Tableau d'Honneur</option>
          </select>
          <input 
            type="text" 
            placeholder="Contenu (ex: BIEN, AVERTISSEMENT)"
            value={remarkContent}
            onChange={(e) => setRemarkContent(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-rose-500"
          />
          <select 
            value={remarkSectionId}
            onChange={(e) => setRemarkSectionId(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
          >
            <option value="">Toutes Sections</option>
            {initialSections.map((s: any) => (
              <option key={s.id} value={s.id}>{s.sectionName}</option>
            ))}
          </select>
          <Button onClick={handleCreateRemark} disabled={isPending || !remarkContent} className="h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-6">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {initialSchoolRemarks.map((sr: any) => (
            <div key={sr.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <div className="flex items-center gap-4">
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{sr.category}</span>
                <span className="text-slate-300 font-medium">{sr.content}</span>
                {sr.section && <span className="text-xs text-slate-500">Section: {sr.section.sectionName}</span>}
              </div>
              <button 
                onClick={() => startTransition(() => { deleteSchoolRemark(sr.id); })}
                disabled={isPending}
                className="text-rose-500/70 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
