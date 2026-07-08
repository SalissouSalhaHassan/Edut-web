"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarDays, GraduationCap, Bookmark, BookOpen, Link as LinkIcon, Loader2, Bell, FileUp, Search, Pencil, Building2, Layers, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  createSession, deleteSession, 
  createClass, deleteClass, 
  createSection, updateSection, deleteSection, 
  createSubject, deleteSubject, importSubjects,
  linkSubjectToSection, deleteSectionSubjectLink,
  addClassSubjectLink, deleteClassSubjectLink,
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

  // Plan d'études states
  const [planClassId, setPlanClassId] = useState("");
  const [planSubjectId, setPlanSubjectId] = useState("");
  const [planCoef, setPlanCoef] = useState("1");

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

  const startEditPeriod = (p: any) => {
    setEditingPeriodId(p.id);
    setPeriodName(p.name);
    setPeriodType(p.periodType);
    setPeriodSessionId(p.sessionId?.toString() || "");
  };

  const handleCreateClass = () => {
    if (!className || !classSectionId) return;
    startTransition(async () => {
      const res = await createClass({ className, sectionId: Number(classSectionId) });
      if (res.success) {
        toast.success(`Classe "${className}" créée avec succès`);
        setClassName("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la création de la classe");
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

  const handleLinkSubject = () => {
    if (!linkSectionId || !linkSubjectId) return;
    startTransition(async () => {
      const res = await linkSubjectToSection({
        sectionId: Number(linkSectionId),
        subjectId: Number(linkSubjectId),
        term: linkPeriod,
        defaultCoef: Number(linkCoef),
        isEliminatory: linkEliminatory
      });
      if (res.success) {
        toast.success("Matière associée avec succès");
        setLinkSubjectId("");
        setLinkSectionId("");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la liaison de la matière");
      }
    });
  };

  const handleAddPlanLink = () => {
    if (!planClassId || !planSubjectId) return;
    startTransition(async () => {
      const res = await addClassSubjectLink({
        classId: Number(planClassId),
        subjectId: Number(planSubjectId),
        coefficient: Number(planCoef)
      });
      if (res.success) {
        toast.success("Matière ajoutée au plan d'études avec succès");
        setPlanSubjectId("");
        setPlanCoef("1");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la liaison de la matière");
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
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="text-teal-500" />
          <h2 className="text-xl font-bold text-white">Périodes (Trimestres / Semestres)</h2>
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
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Ex: 6ème A"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none focus:border-emerald-500"
          />
          <select 
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value)}
            className="flex-1 bg-[#181924] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
          >
            <option value="">Sélectionner une Section</option>
            {initialSections.map((s: any) => (
              <option key={s.id} value={s.id}>{s.sectionName}</option>
            ))}
          </select>
          <Button onClick={handleCreateClass} disabled={isPending || !className || !classSectionId} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6">
            + Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {initialClasses.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
              <div className="flex items-center gap-4">
                <span className="text-slate-300 font-medium">{c.className}</span>
                {c.section && <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded-full uppercase font-bold tracking-wider">{c.section.sectionName}</span>}
              </div>
              <button 
                onClick={() => startTransition(() => { deleteClass(c.id); })}
                disabled={isPending}
                className="text-rose-500/70 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
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

      {/* 5. Lien Matières ↔ Sections (Propagation) */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <LinkIcon className="text-cyan-500" />
          <h2 className="text-xl font-bold text-white">Lien Matières ↔ Sections (Propagation Intelligente)</h2>
        </div>
        
        <div className="flex flex-wrap items-end gap-4 mb-6 p-4 rounded-2xl bg-[#181924] border border-slate-800/50">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Section</label>
            <select 
              value={linkSectionId}
              onChange={(e) => setLinkSectionId(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
            >
              <option value="">-- Choisir --</option>
              {initialSections.map((s: any) => (
                <option key={s.id} value={s.id}>{s.sectionName}</option>
              ))}
            </select>
          </div>
          <div className="w-[120px]">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Période</label>
            <select 
              value={linkPeriod}
              onChange={(e) => setLinkPeriod(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
            >
              <option value="Tous">Tous</option>
              {initialPeriods?.map((p: any) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
              {(!initialPeriods || initialPeriods.length === 0) && (
                <>
                  <option value="1er Trimestre">1er Trimestre</option>
                  <option value="2ème Trimestre">2ème Trimestre</option>
                  <option value="3ème Trimestre">3ème Trimestre</option>
                </>
              )}
            </select>
          </div>
          <div className="flex-[1.5] min-w-[200px]">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Matière</label>
            <select 
              value={linkSubjectId}
              onChange={(e) => setLinkSubjectId(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
            >
              <option value="">-- Choisir --</option>
              {initialSubjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.subjectName}</option>
              ))}
            </select>
          </div>
          <div className="w-[80px]">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Coef</label>
            <input 
              type="number" 
              min="1"
              value={linkCoef}
              onChange={(e) => setLinkCoef(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none text-center"
            />
          </div>
          <div className="flex items-center gap-2 h-12 pb-3">
            <input 
              type="checkbox" 
              id="eliminatory"
              checked={linkEliminatory}
              onChange={(e) => setLinkEliminatory(e.target.checked)}
              className="w-5 h-5 rounded border-slate-700 bg-[#1F222B] accent-cyan-500"
            />
            <label htmlFor="eliminatory" className="text-sm font-medium text-slate-300 cursor-pointer">Éliminatoire</label>
          </div>
          <Button onClick={handleLinkSubject} disabled={isPending || !linkSectionId || !linkSubjectId} className="h-12 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-6">
            Lier
          </Button>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
          {initialSectionSubjects.length === 0 ? (
            <p className="text-center text-slate-500 py-4 text-sm font-medium">Aucun lien configuré.</p>
          ) : (
            initialSectionSubjects.map((ss: any) => (
              <div key={ss.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
                <div className="flex items-center gap-4">
                  <span className="text-slate-300 font-medium">{ss.subject?.subjectName}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{ss.section?.sectionName} ({ss.term})</span>
                  <span className="text-xs bg-cyan-900/30 text-cyan-400 border border-cyan-800/50 px-2 py-1 rounded-full font-bold">Coef {ss.defaultCoef}</span>
                  {ss.isEliminatory && <span className="text-xs bg-rose-900/30 text-rose-400 border border-rose-800/50 px-2 py-1 rounded-full font-bold">Éliminatoire</span>}
                </div>
                <button 
                onClick={() => startTransition(() => { deleteSectionSubjectLink(ss.id); })}
                  disabled={isPending}
                  className="text-rose-500/70 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 6. Plan d'études (Class-Subject Links) */}
      <div className="bg-[#1F222B] border border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <LinkIcon className="text-emerald-500" />
          <h2 className="text-xl font-bold text-white">Plan d'Études (Lien Classe-Matière)</h2>
        </div>
        
        <div className="flex flex-wrap items-end gap-4 mb-6 p-4 rounded-2xl bg-[#181924] border border-slate-800/50">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Classe</label>
            <select 
              value={planClassId}
              onChange={(e) => setPlanClassId(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
            >
              <option value="">-- Choisir --</option>
              {initialClasses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>
          <div className="flex-[1.5] min-w-[200px]">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Matière</label>
            <select 
              value={planSubjectId}
              onChange={(e) => setPlanSubjectId(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none"
            >
              <option value="">-- Choisir --</option>
              {initialSubjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.subjectName}</option>
              ))}
            </select>
          </div>
          <div className="w-[80px]">
            <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 block">Coef</label>
            <input 
              type="number" 
              min="1"
              value={planCoef}
              onChange={(e) => setPlanCoef(e.target.value)}
              className="w-full bg-[#1F222B] border border-slate-700 text-white rounded-xl px-4 h-12 focus:outline-none text-center"
            />
          </div>
          <Button onClick={handleAddPlanLink} disabled={isPending || !planClassId || !planSubjectId} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6">
            Assigner
          </Button>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
          {initialClassSubjects.length === 0 ? (
            <p className="text-center text-slate-500 py-4 text-sm font-medium">Aucune matière assignée.</p>
          ) : (
            initialClassSubjects.map((cs: any) => (
              <div key={cs.id} className="flex items-center justify-between p-3 rounded-xl bg-[#181924] border border-slate-800/50">
                <div className="flex items-center gap-4">
                  <span className="text-slate-300 font-medium">{cs.subject?.subjectName}</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{cs.class?.className}</span>
                  <span className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 px-2 py-1 rounded-full font-bold">Coef {cs.coefficient}</span>
                </div>
                <button 
                  onClick={() => startTransition(() => { deleteClassSubjectLink(cs.id); })}
                  disabled={isPending}
                  className="text-rose-500/70 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
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
