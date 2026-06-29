"use client";

import React, { useState, useTransition, useEffect } from "react";
import { 
  Award, BookOpen, Calendar, MapPin, Users, TrendingUp, 
  Search, X, Plus, Trash2, User, Loader2, CheckCircle2, 
  HelpCircle, Settings2, Edit, Save, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { 
  saveGraduationProject, 
  deleteGraduationProject, 
  searchStudentsForGraduation 
} from "@/domains/academics/actions/graduation.actions";

interface Teacher {
  id: number;
  nom: string;
}

interface Student {
  id: number;
  nomEtudiant: string;
  classe?: string;
  numAdmission: string;
}

interface Project {
  id: number;
  title: string;
  studentId: number;
  supervisorId: number;
  defenseDate?: string | null;
  roomName?: string | null;
  status: string;
  grade?: number | null;
  presidentId?: number | null;
  examinerId?: number | null;
  student?: Student | null;
  supervisor?: Teacher | null;
  president?: Teacher | null;
  examiner?: Teacher | null;
}

interface GraduationClientProps {
  initialProjects: Project[];
  teachers: Teacher[];
}

export default function GraduationClient({ initialProjects, teachers }: GraduationClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState("projects");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDefenseModalOpen, setIsDefenseModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Project Form State
  const [projectTitle, setProjectTitle] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [supervisorId, setSupervisorId] = useState("");

  // Defense Form State
  const [defenseDate, setDefenseDate] = useState("");
  const [roomName, setRoomName] = useState("");
  const [presidentId, setPresidentId] = useState("");
  const [examinerId, setExaminerId] = useState("");

  // Grade Form State
  const [projectGrade, setProjectGrade] = useState("");
  const [projectStatus, setProjectStatus] = useState("Soutenu");

  // Debounced student search
  useEffect(() => {
    if (!studentSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingStudents(true);
      try {
        const res = await searchStudentsForGraduation(studentSearch) as any;
        const list = res?.data?.data || res?.data || [];
        setSearchResults(Array.isArray(list) ? list : []);
      } catch {
        toast.error("Erreur lors de la recherche des étudiants");
      }
      setIsSearchingStudents(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  const handleCreateProject = () => {
    if (!projectTitle.trim()) {
      toast.error("Veuillez saisir le titre du projet");
      return;
    }
    if (!selectedStudent) {
      toast.error("Veuillez sélectionner un étudiant");
      return;
    }
    if (!supervisorId) {
      toast.error("Veuillez sélectionner un encadrant");
      return;
    }

    startTransition(async () => {
      const res = await saveGraduationProject({
        title: projectTitle,
        studentId: selectedStudent.id,
        supervisorId: parseInt(supervisorId),
        status: "En cours"
      });

      if (res.success) {
        toast.success("Projet de graduation enregistré avec succès !");
        setIsProjectModalOpen(false);
        setProjectTitle("");
        setSelectedStudent(null);
        setStudentSearch("");
        setSupervisorId("");
        router.refresh();
      } else {
        toast.error("Erreur lors de la création.");
      }
    });
  };

  const handleSaveDefense = () => {
    if (!selectedProject) return;
    if (!defenseDate || !roomName.trim()) {
      toast.error("Veuillez remplir les informations obligatoires");
      return;
    }

    startTransition(async () => {
      const res = await saveGraduationProject({
        id: selectedProject.id,
        title: selectedProject.title,
        studentId: selectedProject.studentId,
        supervisorId: selectedProject.supervisorId,
        defenseDate,
        roomName,
        presidentId: presidentId ? parseInt(presidentId) : undefined,
        examinerId: examinerId ? parseInt(examinerId) : undefined,
        status: "Prêt"
      });

      if (res.success) {
        toast.success("Soutenance planifiée avec succès !");
        setIsDefenseModalOpen(false);
        setSelectedProject(null);
        setDefenseDate("");
        setRoomName("");
        setPresidentId("");
        setExaminerId("");
        router.refresh();
      } else {
        toast.error("Erreur lors de la planification.");
      }
    });
  };

  const handleSaveGrade = () => {
    if (!selectedProject) return;
    if (!projectGrade) {
      toast.error("Veuillez saisir une note");
      return;
    }

    startTransition(async () => {
      const res = await saveGraduationProject({
        id: selectedProject.id,
        title: selectedProject.title,
        studentId: selectedProject.studentId,
        supervisorId: selectedProject.supervisorId,
        defenseDate: selectedProject.defenseDate,
        roomName: selectedProject.roomName,
        presidentId: selectedProject.presidentId,
        examinerId: selectedProject.examinerId,
        grade: parseFloat(projectGrade),
        status: projectStatus
      });

      if (res.success) {
        toast.success("Note et évaluation enregistrées !");
        setIsGradeModalOpen(false);
        setSelectedProject(null);
        setProjectGrade("");
        router.refresh();
      } else {
        toast.error("Erreur lors de l'enregistrement de la note.");
      }
    });
  };

  const handleDeleteProject = (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer ce projet de graduation ?")) return;

    startTransition(async () => {
      const res = await deleteGraduationProject(id);
      if (res.success) {
        toast.success("Projet supprimé.");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression.");
      }
    });
  };

  const filteredProjects = initialProjects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.student?.nomEtudiant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supervisor?.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const gradedProjects = initialProjects.filter(p => p.grade !== null && p.grade !== undefined);
  const averageGrade = gradedProjects.length > 0
    ? (gradedProjects.reduce((acc, p) => acc + (p.grade || 0), 0) / gradedProjects.length).toFixed(2)
    : "N/A";

  const stats = [
    { label: "Mémoires Actifs", value: initialProjects.filter(p => p.status === "En cours").length, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Soutenances Planifiées", value: initialProjects.filter(p => p.status === "Prêt").length, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Note Moyenne (Graduation)", value: averageGrade + " / 20", icon: Award, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Graduation & Recherche</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestion et suivi des Projets de Fin d'Études (PFE) et des soutenances de mémoire</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={cn("p-4 rounded-2xl", stat.bg, stat.color)}>
              <stat.icon size={26} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Layout */}
      <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
        
        {/* Navigation & Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
          <TabsList className="bg-slate-100/80 p-1.5 rounded-2xl h-14 w-full max-w-sm gap-2">
            <TabsTrigger value="projects" className="rounded-xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm flex-1">
              📋 Projets & Encadrement
            </TabsTrigger>
            <TabsTrigger value="defenses" className="rounded-xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm flex-1">
              🗓️ Soutenances & Jurys
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre, étudiant ou encadrant..." 
                className="pl-11 rounded-xl border-slate-100 bg-slate-50/50 shadow-none h-12 text-xs font-bold" 
              />
            </div>
            <Button 
              onClick={() => setIsProjectModalOpen(true)}
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-100"
            >
              <Plus size={16} /> Nouveau Projet
            </Button>
          </div>
        </div>

        {/* Tab 1: Projects List */}
        <TabsContent value="projects" className="outline-none">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sujet / Titre du PFE</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Étudiant</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Encadrant (Enseignant)</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Note / Éval</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4.5 max-w-sm">
                        <p className="font-extrabold text-slate-900 text-xs line-clamp-2">{p.title}</p>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 font-bold border border-slate-100 text-[10px]">
                            <User size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{p.student?.nomEtudiant}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">{p.student?.classe || "N/A"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <p className="font-semibold text-slate-700 text-xs">{p.supervisor?.nom || "Non assigné"}</p>
                      </td>
                      <td className="px-6 py-4.5 text-center font-black text-xs text-slate-800">
                        {p.grade !== null && p.grade !== undefined ? (
                          <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800">{p.grade} / 20</span>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px]">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={cn(
                          "px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                          p.status === 'Soutenu' && 'bg-emerald-100 text-emerald-600',
                          p.status === 'En cours' && 'bg-indigo-100 text-indigo-600',
                          p.status === 'Prêt' && 'bg-amber-100 text-amber-600',
                          p.status === 'Refusé' && 'bg-rose-100 text-rose-600'
                        )}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.status !== "Soutenu" && (
                            <button 
                              onClick={() => { setSelectedProject(p); setIsDefenseModalOpen(true); }}
                              className="px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100"
                            >
                              Planifier Soutenance
                            </button>
                          )}
                          {p.status === "Prêt" && (
                            <button 
                              onClick={() => { setSelectedProject(p); setIsGradeModalOpen(true); }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100"
                            >
                              Évaluer
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteProject(p.id)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400 italic">
                        Aucun projet enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Defenses list */}
        <TabsContent value="defenses" className="outline-none">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sujet / Titre</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Salle</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Membres du Jury</th>
                    <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProjects.filter(p => p.defenseDate).map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4.5 max-w-sm">
                        <p className="font-extrabold text-slate-900 text-xs line-clamp-1">{p.title}</p>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">Étudiant: {p.student?.nomEtudiant}</p>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
                          <Calendar size={13} className="text-slate-400" />
                          {p.defenseDate ? new Date(p.defenseDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                          <MapPin size={13} className="text-slate-400" /> {p.roomName || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4.5 space-y-0.5">
                        <p className="text-[10px] text-slate-700 font-semibold"><span className="text-[9px] font-black uppercase text-slate-400">Président:</span> {p.president?.nom || "N/A"}</p>
                        <p className="text-[10px] text-slate-700 font-semibold"><span className="text-[9px] font-black uppercase text-slate-400">Rapporteur:</span> {p.supervisor?.nom || "N/A"}</p>
                        <p className="text-[10px] text-slate-700 font-semibold"><span className="text-[9px] font-black uppercase text-slate-400">Examinateur:</span> {p.examiner?.nom || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={cn(
                          "px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                          p.status === 'Soutenu' && 'bg-emerald-100 text-emerald-600',
                          p.status === 'Prêt' && 'bg-amber-100 text-amber-600',
                          p.status === 'Refusé' && 'bg-rose-100 text-rose-600'
                        )}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProjects.filter(p => p.defenseDate).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-slate-400 italic">
                        Aucune soutenance planifiée.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: CRÉER UN PROJET ─── */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Enregistrer un Projet de Fin d'Études</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Nouveau sujet de mémoire</p>
                </div>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Titre du Sujet / Mémoire *</Label>
                <Input 
                  value={projectTitle}
                  onChange={e => setProjectTitle(e.target.value)}
                  placeholder="Ex: Analyse de la décentralisation de l'éducation au Niger"
                  className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                />
              </div>

              {/* Student Search */}
              <div className="space-y-2 relative">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Étudiant *</Label>
                {selectedStudent ? (
                  <div className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900">{selectedStudent.nomEtudiant}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{selectedStudent.classe || "N/A"} • Ref: {selectedStudent.numAdmission}</p>
                    </div>
                    <button onClick={() => { setSelectedStudent(null); setStudentSearch(""); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <Input 
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Rechercher l'étudiant par nom..." 
                        className="pl-11 h-12 rounded-xl border-slate-200 focus:border-purple-500 text-xs font-bold"
                      />
                      {isSearchingStudents && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={16} />}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto divide-y divide-slate-50">
                        {searchResults.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => { setSelectedStudent(s); setSearchResults([]); }}
                            className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs font-bold"
                          >
                            <div>
                              <p className="font-black text-slate-900">{s.nomEtudiant}</p>
                              <p className="text-[9px] text-slate-400">{s.classe || "N/A"}</p>
                            </div>
                            <span className="text-[8px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-1 rounded">Sélectionner</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Supervisor */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Encadrant Académique *</Label>
                <Select onValueChange={setSupervisorId} value={supervisorId}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Sélectionner un enseignant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">
                        {t.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsProjectModalOpen(false)} className="h-11 px-5 rounded-xl text-slate-500">Annuler</Button>
              <Button onClick={handleCreateProject} disabled={isPending} className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100">
                {isPending && <Loader2 className="animate-spin" size={14} />} Créer le projet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: PLANIFIER SOUTENANCE ─── */}
      {isDefenseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Planifier la Soutenance</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Date et Composition du Jury</p>
                </div>
              </div>
              <button onClick={() => { setIsDefenseModalOpen(false); setSelectedProject(null); }} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sujet de Mémoire</p>
                <p className="text-xs font-black text-slate-800 mt-1">{selectedProject?.title}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">Encadrant / Rapporteur : {selectedProject?.supervisor?.nom}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date & Heure *</Label>
                  <Input 
                    type="datetime-local"
                    value={defenseDate}
                    onChange={e => setDefenseDate(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Salle de classe / Amphi *</Label>
                  <Input 
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                    placeholder="Ex: Salle de Conférence A"
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Président du Jury</Label>
                  <Select onValueChange={setPresidentId} value={presidentId}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700">
                      <SelectValue placeholder="Choisir le président..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">
                          {t.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Membre / Examinateur</Label>
                  <Select onValueChange={setExaminerId} value={examinerId}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700">
                      <SelectValue placeholder="Choisir l'examinateur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id.toString()} className="text-xs font-bold">
                          {t.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsDefenseModalOpen(false); setSelectedProject(null); }} className="h-11 px-5 rounded-xl text-slate-500">Annuler</Button>
              <Button onClick={handleSaveDefense} disabled={isPending} className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-100">
                {isPending && <Loader2 className="animate-spin" size={14} />} Enregistrer la soutenance
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: ÉVALUER LE MÉMOIRE ─── */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Évaluation du Jury & Délibération</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Saisir le verdict final</p>
                </div>
              </div>
              <button onClick={() => { setIsGradeModalOpen(false); setSelectedProject(null); }} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 text-xs">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sujet de Mémoire</p>
                <p className="font-black text-slate-800 mt-0.5">{selectedProject?.title}</p>
                <p className="mt-2 text-slate-500 font-semibold">Président du Jury : {selectedProject?.president?.nom || "N/A"}</p>
                <p className="text-slate-500 font-semibold">Rapporteur / Encadrant : {selectedProject?.supervisor?.nom || "N/A"}</p>
                <p className="text-slate-500 font-semibold">Examinateur : {selectedProject?.examiner?.nom || "N/A"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Note de soutenance (/20) *</Label>
                  <Input 
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    value={projectGrade}
                    onChange={e => setProjectGrade(e.target.value)}
                    placeholder="Ex: 16.5"
                    className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Décision Finale *</Label>
                  <Select onValueChange={setProjectStatus} value={projectStatus}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 text-xs font-bold text-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Soutenu" className="text-xs font-bold">Soutenu / Validé</SelectItem>
                      <SelectItem value="Refusé" className="text-xs font-bold">Refusé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsGradeModalOpen(false); setSelectedProject(null); }} className="h-11 px-5 rounded-xl text-slate-500">Annuler</Button>
              <Button onClick={handleSaveGrade} disabled={isPending} className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100">
                {isPending && <Loader2 className="animate-spin" size={14} />} Valider la note
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
