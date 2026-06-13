"use client";

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { 
  getClassAssignments,
  saveClassAssignment,
  deleteClassAssignment,
  getTeacherWorkloads,
  aiSyncCursus,
  getTeacherConstraints, 
  saveTeacherConstraints,
  getTimetableSettings,
  saveTimetableSettings,
  getAllSubjects,
  addSubjectsToClass
} from '@/domains/academics/actions/timetable.actions';
import { 
  Loader2, Save, Trash2, Plus, Users, Clock, 
  Settings2, BookOpen, UserCheck, Search, 
  Sparkles, Zap, BrainCircuit, Activity, 
  ChevronRight, Filter, GraduationCap,
  FileText, LayoutGrid, Printer, AlertCircle, Check
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getClassDisplayName } from '@/domains/academics/utils/class-name';

// --- 3. Assignments Dialog (🔗 Affectations & Plan d'Études) ---
export function AssignmentsDialog({ open, onOpenChange, classes, teachers: initialTeachers, subjects }: { open: boolean, onOpenChange: (open: boolean) => void, classes: any[], teachers: any[], subjects: any[] }) {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(classes[0]?.id || null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [teacherWorkloads, setTeacherWorkloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("Sélectionnez une matière pour recevoir des suggestions.");
  const [showAddSubjects, setShowAddSubjects] = useState(false);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Load Data
  const loadData = async () => {
    if (selectedClassId) {
      setLoading(true);
      const [assignRes, workloadRes] = await Promise.all([
        getClassAssignments(selectedClassId),
        getTeacherWorkloads()
      ]);
      if (assignRes.success) setAssignments(assignRes.data || []);
      if (workloadRes.success) setTeacherWorkloads(workloadRes.data || []);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open, selectedClassId]);

  const completionRate = useMemo(() => {
    if (assignments.length === 0) return 0;
    const assigned = assignments.filter(a => a.employeeId).length;
    return Math.round((assigned / assignments.length) * 100);
  }, [assignments]);

  const handleUpdateAssignment = (assignmentId: number, data: any) => {
    startTransition(() => {
       saveClassAssignment(assignmentId, data).then(res => {
         if (res.success) loadData();
       });
    });
  };

  const handleSyncCursus = async () => {
    if (!selectedClassId) return;
    if (!confirm("Synchroniser avec le cursus officiel ?")) return;
    setLoading(true);
    const res = await aiSyncCursus(selectedClassId);
    if (res.success) {
      loadData();
    }
    setLoading(false);
  };

  const handleAutoSuggest = () => {
    if (!selectedAssignmentId) return;
    const assignment = assignments.find(a => a.id === selectedAssignmentId);
    if (!assignment) return;
    const bestTeacher = [...teacherWorkloads].sort((a, b) => (a.workload || 0) - (b.workload || 0))[0];
    if (bestTeacher) {
      setAiInsight(`Suggestion IA : ${bestTeacher.nom} (Charge : ${bestTeacher.workload}h)`);
      handleUpdateAssignment(selectedAssignmentId, { employeeId: bestTeacher.id });
    }
  };

  const handleDeleteAssignment = (id: number) => {
    if (!confirm("Supprimer cette affectation ?")) return;
    startTransition(() => {
      deleteClassAssignment(id).then(res => {
        if (res.success) loadData();
      });
    });
  };

  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1450px] h-[95vh] bg-[#05060B] border-white/5 text-slate-200 rounded-[2.5rem] overflow-hidden p-0 shadow-2xl flex flex-col">
        
        {/* 1. Slimmer Header */}
        <div className="px-8 py-5 bg-white/[0.02] backdrop-blur-3xl border-b border-white/[0.05] flex items-center justify-between shrink-0">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-xl shadow-indigo-500/10">
                 <BrainCircuit className="text-indigo-400" size={30} />
              </div>
              <div>
                 <h2 className="text-2xl font-black text-white tracking-tight">Assignation <span className="text-indigo-400">Intelligente</span></h2>
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity size={12} className="text-indigo-400" /> Optimisation de la Charge Horaire
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-8">
              <div className="text-right space-y-1">
                 <div className="flex justify-between items-end text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                    <span>Progrès</span>
                    <span className="text-indigo-400">{completionRate}%</span>
                 </div>
                 <div className="w-48 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.4)]" style={{ width: `${completionRate}%` }} />
                 </div>
              </div>
              <button onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 text-slate-400 transition-all">
                 <Plus size={20} className="rotate-45" />
              </button>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
           {/* 2. Sidebar */}
           <aside className="w-[320px] bg-black/20 border-r border-white/5 flex flex-col shrink-0">
              <Tabs defaultValue="classes" className="flex-1 flex flex-col">
                 <div className="p-5 bg-black/10 space-y-4">
                    <TabsList className="w-full h-10 bg-white/5 p-1 rounded-xl border border-white/5">
                       <TabsTrigger value="classes" className="flex-1 rounded-lg text-[9px] font-black uppercase">Classes</TabsTrigger>
                       <TabsTrigger value="profs" className="flex-1 rounded-lg text-[9px] font-black uppercase">Profs</TabsTrigger>
                    </TabsList>
                    
                    <div className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                       <input 
                         placeholder="Rechercher..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full h-10 bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 text-xs font-bold text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500/20"
                       />
                    </div>
                 </div>

                 <TabsContent value="classes" className="flex-1 overflow-auto p-4 m-0 space-y-1 custom-scrollbar">
                     {classes.filter(c => getClassDisplayName(c, "").toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                       <button
                        key={c.id} 
                        onClick={() => setSelectedClassId(c.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                          selectedClassId === c.id ? "bg-indigo-500/10 border border-indigo-500/30 text-white" : "hover:bg-white/5 border border-transparent text-slate-500"
                        )}
                      >
                          <span className="text-xs font-black uppercase tracking-widest">{getClassDisplayName(c)}</span>
                         <ChevronRight size={14} className={selectedClassId === c.id ? "text-indigo-400" : "text-slate-700"} />
                      </button>
                    ))}
                 </TabsContent>

                 <TabsContent value="profs" className="flex-1 overflow-auto p-5 m-0 space-y-3 custom-scrollbar">
                    {teacherWorkloads.filter(t => t.nom.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                      <div key={t.id} className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-slate-300">{t.nom}</span>
                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md", t.workload > 22 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400")}>{t.workload}h</span>
                         </div>
                         <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                            <div className={cn("h-full", t.workload > 22 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${Math.min((t.workload / 22) * 100, 100)}%` }} />
                         </div>
                      </div>
                    ))}
                 </TabsContent>
              </Tabs>
           </aside>

           {/* 3. Expanded Main Table Area */}
           <main className="flex-1 flex flex-col bg-[#05060B]/80 overflow-hidden">
              <div className="px-8 py-5 border-b border-white/[0.03] flex items-center justify-between bg-white/[0.01]">
                 <div className="flex items-center gap-4">
                    <BookOpen className="text-indigo-400" size={20} />
                    <h3 className="text-lg font-black text-white">Classe : <span className="text-indigo-400">{getClassDisplayName(selectedClass, "Inconnue")}</span></h3>
                 </div>
                 <div className="flex gap-3">
                    <Button onClick={handleSyncCursus} className="h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 font-black text-[10px] gap-2 px-6">
                      <Zap size={14} /> Sync Cursus
                    </Button>
                    <Button onClick={() => setShowAddSubjects(true)} className="h-9 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-[10px] gap-2 px-6">
                      <Plus size={14} /> Matière
                    </Button>
                 </div>
              </div>

              <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                 <div className="bg-black/40 rounded-[2rem] border border-white/5 overflow-hidden">
                    <table className="w-full border-collapse">
                       <thead className="sticky top-0 z-10 bg-[#0F111A]">
                          <tr className="border-b border-white/5">
                             <th className="text-left p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Matière</th>
                             <th className="text-left p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Enseignant</th>
                             <th className="text-center p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Charge</th>
                             <th className="text-right p-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">État</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/[0.02]">
                          {assignments.map(a => (
                            <tr 
                              key={a.id} 
                              onClick={() => setSelectedAssignmentId(a.id)}
                              className={cn(
                                "group transition-all cursor-pointer",
                                selectedAssignmentId === a.id ? "bg-indigo-500/10" : "hover:bg-white/[0.02]"
                              )}
                            >
                               <td className="p-5">
                                  <div className="flex items-center gap-4">
                                     <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", selectedAssignmentId === a.id ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-400" : "bg-black/40 border-white/5 text-slate-600")}>
                                        <GraduationCap size={16} />
                                     </div>
                                     <span className={cn("text-sm font-black uppercase transition-colors", selectedAssignmentId === a.id ? "text-white" : "text-slate-300")}>{a.subject?.subjectName}</span>
                                  </div>
                               </td>
                               <td className="p-5">
                                  {a.teacher ? (
                                    <div className="flex items-center gap-3">
                                       <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-white/5 flex items-center justify-center text-[9px] font-black text-indigo-400">{a.teacher.nom.substring(0,2)}</div>
                                       <span className="text-xs font-bold text-slate-300">{a.teacher.nom}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Non assigné</span>
                                  )}
                               </td>
                               <td className="p-5 text-center">
                                  <span className="text-xs font-black text-indigo-400">{a.coefficient || 0}h</span>
                               </td>
                               <td className="p-5 text-right">
                                  <div className={cn(
                                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                    a.employeeId ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                                  )}>
                                     <div className={cn("w-1.5 h-1.5 rounded-full", a.employeeId ? "bg-emerald-500" : "bg-amber-500")} />
                                     {a.employeeId ? "Assigné" : "Vancant"}
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* 4. Compressed Controls Section */}
              <div className="px-8 py-6 bg-white/[0.01] border-t border-white/[0.05] grid grid-cols-5 gap-6 shrink-0">
                 <div className="col-span-3 bg-black/40 p-5 rounded-3xl border border-white/5 flex items-center gap-6">
                    <div className="flex-1 space-y-3">
                       <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Activity size={12} /> Affectation Manuelle
                       </h4>
                       <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-3">
                             <select 
                               value={selectedAssignment?.employeeId || ''}
                               onChange={(e) => {
                                 const teacherId = Number(e.target.value);
                                 const teacher = teacherWorkloads.find(t => t.id === teacherId);
                                 if (teacher && teacher.workload + (selectedAssignment?.coefficient || 0) > 22) {
                                   if (!confirm(`Attention : Ce professeur dépassera le seuil de 22h (${teacher.workload + (selectedAssignment?.coefficient || 0)}h). Continuer ?`)) return;
                                 }
                                 handleUpdateAssignment(selectedAssignmentId!, { employeeId: teacherId });
                               }}
                               className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-bold text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/30"
                             >
                                <option value="">-- Choisir Prof --</option>
                                {teacherWorkloads.map(t => (
                                  <option key={t.id} value={t.id} className={cn(t.workload > 22 ? "text-rose-500" : "")}>
                                    {t.nom} ({t.workload}h) {t.workload > 22 ? "⚠️" : ""}
                                  </option>
                                ))}
                             </select>
                          </div>
                          <div className="flex items-center bg-white/5 rounded-xl border border-white/10">
                             <button onClick={() => handleUpdateAssignment(selectedAssignmentId!, { coefficient: Math.max((selectedAssignment?.coefficient || 1) - 1, 0) })} className="w-9 h-11 text-slate-500 font-black">-</button>
                             <input type="number" value={selectedAssignment?.coefficient || ''} className="w-10 h-11 bg-transparent text-center text-xs font-black text-indigo-400 outline-none" readOnly />
                             <button onClick={() => handleUpdateAssignment(selectedAssignmentId!, { coefficient: (selectedAssignment?.coefficient || 1) + 1 })} className="w-9 h-11 text-slate-500 font-black">+</button>
                          </div>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <Button disabled={!selectedAssignmentId} className="h-11 px-6 bg-indigo-500 hover:bg-indigo-600 rounded-xl font-black text-white gap-2 shadow-lg shadow-indigo-500/20">
                          <Save size={16} /> Appliquer
                       </Button>
                       <Button variant="ghost" onClick={() => selectedAssignmentId && handleDeleteAssignment(selectedAssignmentId)} className="h-11 w-11 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/10">
                          <Trash2 size={16} />
                       </Button>
                    </div>
                 </div>

                 <div className="col-span-2 bg-emerald-500/[0.03] p-5 rounded-3xl border border-emerald-500/10 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-emerald-400" />
                          <h4 className="text-[9px] font-black uppercase tracking-widest text-white">AI Suggestion</h4>
                       </div>
                       <Check size={14} className="text-emerald-500" />
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 line-clamp-1">{aiInsight}</p>
                    <Button onClick={handleAutoSuggest} disabled={!selectedAssignmentId} className="h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 font-black text-[9px] uppercase tracking-widest">
                      Auto-Suggest
                    </Button>
                 </div>
              </div>
           </main>
        </div>

        <div className="px-8 py-5 bg-black/40 border-t border-white/5 flex items-center justify-center shrink-0">
           <Button onClick={() => onOpenChange(false)} className="h-12 px-20 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-white text-xs">
              Terminer les Affectations
           </Button>
        </div>

        <AddSubjectsDialog 
          open={showAddSubjects} 
          onOpenChange={setShowAddSubjects} 
          classId={selectedClassId!} 
          onSuccess={loadData} 
          existingSubjectIds={assignments.map(a => a.subjectId)}
        />

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.03); border-radius: 20px; border: 2px solid transparent; background-clip: padding-box; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.08); }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}


// --- 1. Constraints Dialog (RÈGLES) ---
export function ConstraintsDialog({ open, onOpenChange, teachers }: { open: boolean, onOpenChange: (open: boolean) => void, teachers: any[] }) {
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    offDays: [] as string[],
    maxPeriodsPerDay: 5,
    forceConsecutive: false
  });

  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  useEffect(() => {
    if (selectedTeacher) {
      setLoading(true);
      getTeacherConstraints(Number(selectedTeacher)).then(res => {
        if (res.success && res.data) {
          setData({
            offDays: res.data.offDays ? res.data.offDays.split(',') : [],
            maxPeriodsPerDay: res.data.maxPeriodsPerDay || 5,
            forceConsecutive: res.data.forceConsecutive || false
          });
        }
        setLoading(false);
      });
    }
  }, [selectedTeacher]);

  const handleSave = async () => {
    if (!selectedTeacher) return;
    setLoading(true);
    const res = await saveTeacherConstraints(Number(selectedTeacher), {
      ...data,
      offDays: data.offDays.join(',')
    });
    setLoading(false);
    if (res.success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1A1C26] border-white/5 text-slate-200 rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white flex items-center gap-2">
             <Settings2 className="text-amber-400" /> Logique IA & Règles
          </DialogTitle>
          <DialogDescription className="text-slate-400">Définissez les contraintes pédagogiques pour les enseignants.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Enseignant</Label>
            <select 
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full h-12 bg-black/40 border-none rounded-xl px-4 font-bold text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">-- Sélectionner un prof --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </div>

          {selectedTeacher && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Jours de Repos (Indisponibilité)</Label>
                <div className="grid grid-cols-3 gap-3">
                  {days.map(day => (
                    <div key={day} className="flex items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/5">
                      <Checkbox 
                        id={day} 
                        checked={data.offDays.includes(day)}
                        onCheckedChange={(checked: boolean) => {
                          setData(prev => ({
                            ...prev,
                            offDays: checked ? [...prev.offDays, day] : prev.offDays.filter(d => d !== day)
                          }));
                        }}
                      />
                      <label htmlFor={day} className="text-xs font-bold cursor-pointer">{day}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Max Heures / Jour</Label>
                  <Input 
                    type="number" 
                    value={data.maxPeriodsPerDay}
                    onChange={(e) => setData(prev => ({ ...prev, maxPeriodsPerDay: Number(e.target.value) }))}
                    className="h-12 bg-black/40 border-none rounded-xl font-bold"
                  />
                </div>
                <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Heures Groupées</span>
                    <span className="text-xs font-bold">Consécutif</span>
                  </div>
                  <Switch 
                    checked={data.forceConsecutive}
                    onCheckedChange={(checked) => setData(prev => ({ ...prev, forceConsecutive: checked }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl text-slate-400 hover:text-white">Annuler</Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !selectedTeacher}
            className="bg-indigo-500 hover:bg-indigo-600 rounded-xl px-8 font-black gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 2. Global Config Dialog (📅 CONFIG) ---
// --- 3. PDF Export Menu Dialog ---
export function PrintOptionsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setLoading(type);
    setErrorMsg(null);
    try {
      const { generateTimetablePDF } = await import('@/domains/academics/utils/timetable-pdf');
      
      if (type === 'classes') {
        await generateTimetablePDF({ type: 'all-classes' });
      } else if (type === 'teachers') {
        await generateTimetablePDF({ type: 'all-teachers' });
      } else if (type === 'teachers_a4') {
        await generateTimetablePDF({ type: 'teachers-4-per-page' });
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      setErrorMsg(error?.message || "Erreur inconnue lors de la génération PDF.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0A0B10] border-white/5 text-slate-200 rounded-[3rem] overflow-hidden p-0 shadow-2xl">
        <div className="p-8 text-center bg-gradient-to-b from-[#1A1C26] to-transparent">
           <h2 className="text-2xl font-black text-indigo-400 tracking-tight mb-2">Options d'Impression</h2>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Menu d'Exportation PDF</p>
        </div>

        <div className="p-8 space-y-6">
           {errorMsg && (
             <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-xs font-bold">
               ⚠️ {errorMsg}
             </div>
           )}
           <div className="space-y-4 text-center">
              <span className="text-xs font-bold text-slate-400">Choisissez le type d'exportation :</span>
              <Button 
                onClick={() => handleExport('current')}
                disabled={!!loading}
                className="w-full h-16 bg-indigo-500 hover:bg-indigo-600 rounded-2xl font-black text-white gap-3 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                {loading === 'current' ? <Loader2 className="animate-spin" /> : <FileText size={20} />}
                Vue Actuelle (Sélectionner...)
              </Button>
           </div>

           <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center">
                 <span className="bg-[#0A0B10] px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest italic">--- Rapports Complets ---</span>
              </div>
           </div>

           <div className="space-y-3">
              <Button 
                variant="outline"
                onClick={() => handleExport('classes')}
                disabled={!!loading}
                className="w-full h-14 bg-white/5 border-white/5 hover:bg-white/10 rounded-2xl font-black text-slate-200 gap-3 transition-all"
              >
                 {loading === 'classes' ? <Loader2 className="animate-spin" /> : <LayoutGrid size={18} className="text-indigo-400" />}
                 Toutes les Classes (Bulk)
              </Button>

              <Button 
                variant="outline"
                onClick={() => handleExport('teachers')}
                disabled={!!loading}
                className="w-full h-14 bg-white/5 border-white/5 hover:bg-white/10 rounded-2xl font-black text-slate-200 gap-3 transition-all"
              >
                 {loading === 'teachers' ? <Loader2 className="animate-spin" /> : <Users size={18} className="text-indigo-400" />}
                 Tous les Professeurs (Bulk)
              </Button>

              <Button 
                onClick={() => handleExport('teachers_a4')}
                disabled={!!loading}
                className="w-full h-14 bg-emerald-500/80 hover:bg-emerald-500 rounded-2xl font-black text-white gap-3 transition-all shadow-lg shadow-emerald-500/10"
              >
                 {loading === 'teachers_a4' ? <Loader2 className="animate-spin" /> : <Printer size={18} />}
                 Profs (4 par Page - A4)
              </Button>
           </div>
        </div>

        <div className="p-6 bg-black/20 flex justify-center">
           <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 font-bold hover:text-white">Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TimetableSettingsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    days: "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
    periods: 6,
    recessAfter: 3,
    recessDuration: 30,
    periodDuration: 60,
    dayStart: "08:00",
    hideSaturday: true,
    dailyPeriods: "{}"
  });

  const availableDays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  useEffect(() => {
    if (open) {
      setLoading(true);
      getTimetableSettings().then(res => {
        if (res.success && res.data) {
          setData(res.data as any);
        }
        setLoading(false);
      });
    }
  }, [open]);

  const dailyMap = useMemo(() => {
    try {
      return JSON.parse(data.dailyPeriods || "{}");
    } catch {
      return {};
    }
  }, [data.dailyPeriods]);

  const updateDailyPeriod = (day: string, value: number) => {
    const updated = { ...dailyMap, [day]: value };
    setData((prev: any) => ({ ...prev, dailyPeriods: JSON.stringify(updated) }));
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await saveTimetableSettings(data);
    setLoading(false);
    if (res.success) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] h-[90vh] bg-[#0A0B10] border-white/5 text-slate-200 rounded-[3.5rem] overflow-hidden p-0 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col">
        
        {/* 1. Ultra-Premium Header */}
        <div className="p-10 bg-gradient-to-br from-[#1A1C26] to-[#0A0B10] border-b border-white/5 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32" />
           <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <Settings2 className="text-emerald-400" size={32} />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Configuration Maîtresse</h2>
                    <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                       <Activity size={14} className="text-emerald-500/60" /> Architecture temporelle et cycles scolaires
                    </p>
                 </div>
              </div>
              <div className="hidden sm:block">
                 <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Système Global Actif</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-auto p-10 custom-scrollbar space-y-10">
          
          {/* 2. Section: Paramètres de Base */}
          <section className="space-y-6">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                   <Clock className="text-indigo-400" size={16} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Cycle de Temps Fondamental</h3>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group bg-white/5 p-6 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-500">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Heure de Début</Label>
                   <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400/50" size={18} />
                      <Input 
                        type="time" 
                        value={data.dayStart}
                        onChange={(e) => setData(prev => ({ ...prev, dayStart: e.target.value }))}
                        className="h-14 bg-black/40 border-none rounded-2xl font-black text-lg text-white pl-12"
                      />
                   </div>
                </div>

                <div className="group bg-white/5 p-6 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-500">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Durée Période</Label>
                   <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400/50 text-xs font-black">MIN</div>
                      <Input 
                        type="number" 
                        value={data.periodDuration}
                        onChange={(e) => setData(prev => ({ ...prev, periodDuration: Number(e.target.value) }))}
                        className="h-14 bg-black/40 border-none rounded-2xl font-black text-lg text-white pl-14"
                      />
                   </div>
                </div>

                <div className="group bg-white/5 p-6 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-500">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Durée Pause</Label>
                   <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400/50 text-xs font-black">MIN</div>
                      <Input 
                        type="number" 
                        value={data.recessDuration}
                        onChange={(e) => setData(prev => ({ ...prev, recessDuration: Number(e.target.value) }))}
                        className="h-14 bg-black/40 border-none rounded-2xl font-black text-lg text-amber-400 pl-14"
                      />
                   </div>
                </div>
             </div>
          </section>

          {/* 3. Section: Gestion des Pauses */}
          <section className="bg-indigo-500/5 p-8 rounded-[3rem] border border-indigo-500/10 space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                      <Zap className="text-indigo-400" size={16} />
                   </div>
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Configuration de la Pause</h3>
                </div>
                <span className="text-[9px] font-bold text-indigo-500/60 uppercase tracking-widest">Calcul automatique des décalages</span>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                   Définissez après quelle période la pause principale de l'établissement doit avoir lieu. Cela affectera le rendu visuel et le calcul des conflits.
                </p>
                <select 
                  value={data.recessAfter}
                  onChange={(e) => setData(prev => ({ ...prev, recessAfter: Number(e.target.value) }))}
                  className="h-14 bg-black/60 border border-white/5 rounded-[1.5rem] px-6 text-sm font-black text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                >
                   {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>Après la Période {n}</option>)}
                </select>
             </div>
          </section>

          {/* 4. Section: Calendrier Hebdomadaire */}
          <section className="space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      <Filter className="text-emerald-400" size={16} />
                   </div>
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Calendrier Hebdomadaire & Charge</h3>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-3">
                {availableDays.map(day => {
                  const isActive = data.days.split(',').includes(day);
                  return (
                    <div key={day} className={cn(
                      "group flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-500",
                      isActive 
                        ? "bg-white/5 border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.2)]" 
                        : "bg-transparent border-white/5 opacity-30 grayscale"
                    )}>
                       <div className="flex items-center gap-6">
                          <button 
                            onClick={() => {
                              const current = data.days.split(',').filter(d => d);
                              const updated = isActive ? current.filter(d => d !== day) : [...current, day];
                              setData(prev => ({ ...prev, days: updated.join(',') }));
                            }}
                            className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                              isActive ? "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "bg-white/5 border border-white/10"
                            )}
                          >
                             {isActive ? <UserCheck className="text-white" size={20} /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
                          </button>
                          <div>
                             <span className={cn("text-sm font-black uppercase tracking-widest block", isActive ? "text-white" : "text-slate-600")}>{day}</span>
                             <span className="text-[10px] font-bold text-slate-500">{isActive ? "Journée d'enseignement active" : "Non-travaillé"}</span>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-6">
                          <div className="text-right">
                             <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Capacité Max</span>
                             <div className="flex items-center gap-3">
                                <Input 
                                  type="number"
                                  value={dailyMap[day] || 6}
                                  disabled={!isActive}
                                  onChange={(e) => updateDailyPeriod(day, Number(e.target.value))}
                                  className="w-24 h-12 bg-black/40 border-none rounded-2xl text-center font-black text-lg text-emerald-400"
                                />
                                <span className="text-xs font-black text-slate-600">H</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  );
                })}
             </div>
          </section>

          {/* 5. Section: Paramètres Avancés */}
          <section className="bg-rose-500/5 p-8 rounded-[3rem] border border-rose-500/10 flex items-center justify-between group">
             <div className="flex items-center gap-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500",
                  data.hideSaturday ? "bg-rose-500/20 border-rose-500/40" : "bg-white/5 border-white/10"
                )}>
                   <GraduationCap className={cn("transition-colors", data.hideSaturday ? "text-rose-400" : "text-slate-600")} size={24} />
                </div>
                <div>
                   <h4 className="text-sm font-black text-white">Nettoyage Intelligent</h4>
                   <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-md">
                      Masquer automatiquement le Samedi dans les vues publiques si aucune séance n'est programmée.
                   </p>
                </div>
             </div>
             <Switch 
               checked={data.hideSaturday}
               onCheckedChange={(checked) => setData(prev => ({ ...prev, hideSaturday: checked }))}
               className="data-[state=checked]:bg-rose-500"
             />
          </section>

        </div>

        {/* Ultra-Premium Footer */}
        <div className="p-10 bg-black/40 border-t border-white/5 flex items-center justify-between backdrop-blur-3xl">
           <Button 
             variant="ghost" 
             onClick={() => onOpenChange(false)} 
             className="h-14 px-10 rounded-[1.5rem] font-black text-slate-500 hover:text-white transition-all"
           >
              Annuler
           </Button>
           <div className="flex gap-4">
              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="h-14 px-12 bg-emerald-500 hover:bg-emerald-600 rounded-[1.5rem] font-black text-white gap-3 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Enregistrer les Modifications
              </Button>
           </div>
        </div>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

// --- 4. Add Subjects Dialog (Catalogue de Matières) ---
export function AddSubjectsDialog({ 
  open, 
  onOpenChange, 
  classId, 
  onSuccess, 
  existingSubjectIds 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void, 
  classId: number, 
  onSuccess: () => void,
  existingSubjectIds: number[]
}) {
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      getAllSubjects(classId).then(res => {
        if (res.success) setAllSubjects(res.data || []);
      });
      setSelectedIds([]);
    }
  }, [open, classId]);

  const filteredSubjects = allSubjects.filter(s => 
    !existingSubjectIds.includes(s.id) && 
    s.subjectName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    const res = await addSubjectsToClass(classId, selectedIds);
    setLoading(false);
    if (res.success) {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-[#0F111A] border-white/5 text-slate-200 rounded-[2.5rem] overflow-hidden p-0 shadow-2xl flex flex-col">
        <DialogHeader className="p-8 bg-white/[0.02] border-b border-white/5">
           <DialogTitle className="text-xl font-black text-white flex items-center gap-3">
              <LayoutGrid className="text-indigo-400" size={24} />
              Catalogue de Matières
           </DialogTitle>
           <DialogDescription className="text-slate-500">
              Sélectionnez les matières à ajouter au cursus de cette classe.
           </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input 
                placeholder="Rechercher une matière..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 text-sm font-bold text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
           </div>

           <div className="max-h-[400px] overflow-auto custom-scrollbar pr-2 space-y-2">
              {filteredSubjects.length === 0 ? (
                <div className="p-12 text-center text-slate-600 italic font-medium">
                   Aucune matière disponible.
                </div>
              ) : (
                filteredSubjects.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => {
                      setSelectedIds(prev => 
                        prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                      );
                    }}
                    className={cn(
                      "group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                      selectedIds.includes(s.id) ? "bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                    )}
                  >
                     <div className={cn(
                       "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                       selectedIds.includes(s.id) ? "bg-indigo-500 border-indigo-500" : "bg-black/40 border-white/10"
                     )}>
                        {selectedIds.includes(s.id) && <Check size={14} className="text-white" />}
                     </div>
                     <span className={cn("text-sm font-black transition-colors", selectedIds.includes(s.id) ? "text-white" : "text-slate-400")}>
                        {s.subjectName}
                     </span>
                  </div>
                ))
              )}
           </div>
        </div>

        <DialogFooter className="p-8 bg-black/20 border-t border-white/5">
           <Button 
             onClick={handleAdd}
             disabled={loading || selectedIds.length === 0}
             className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 rounded-2xl font-black text-white gap-3 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
           >
              {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
              Confirmer l'Ajout ({selectedIds.length})
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
