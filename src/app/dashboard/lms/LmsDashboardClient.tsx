"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Calendar, Clock, ExternalLink, BookOpen, Video, Globe, Play, 
  FileText, Trash2, Edit, CheckCircle2, XCircle, AlertCircle, Download, Upload, 
  Printer, User, GraduationCap, Award, ArrowLeft, ArrowRight, Wifi, WifiOff, 
  Check, FileUp, Users, BarChart2, Eye, Copy, Info, CheckCircle
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  saveCourse, deleteCourse, saveModule, deleteModule, saveLmsLesson, 
  deleteLmsLesson, saveVirtualClass, deleteVirtualClass, saveAssignment, 
  deleteAssignment, saveSubmission, gradeSubmission, saveQuiz, deleteQuiz, 
  updateLessonProgress, enrollStudent
} from "@/domains/lms/actions/lms.actions";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LmsDashboardClientProps {
  currentUser: any;
  initialCourses: any[];
  initialLessons: any[];
  initialVirtualClasses: any[];
  initialAssignments: any[];
  initialSubmissions: any[];
  initialQuizzes: any[];
  initialProgress: any[];
  classes: any[];
  subjects: any[];
  employees: any[];
  students: any[];
}

export default function LmsDashboardClient({
  currentUser,
  initialCourses,
  initialLessons,
  initialVirtualClasses,
  initialAssignments,
  initialSubmissions,
  initialQuizzes,
  initialProgress,
  classes,
  subjects,
  employees,
  students
}: LmsDashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userRole, setUserRole] = useState("super_admin");
  const [schoolYear, setSchoolYear] = useState("2025-2026");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Data states
  const [courses, setCourses] = useState(initialCourses);
  const [lessons, setLessons] = useState(initialLessons);
  const [virtualClasses, setVirtualClasses] = useState(initialVirtualClasses);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [progress, setProgress] = useState(initialProgress);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // Selection states for reader/detail views
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [quizAttempt, setQuizAttempt] = useState<any>(null);

  // Forms open states
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [virtualClassFormOpen, setVirtualClassFormOpen] = useState(false);
  const [editingVirtualClass, setEditingVirtualClass] = useState<any>(null);
  const [assignmentFormOpen, setAssignmentFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [quizFormOpen, setQuizFormOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);

  // Submission grading
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeComment, setGradeComment] = useState("");

  // Student upload submission
  const [studentSubmissionFile, setStudentSubmissionFile] = useState("");

  // Initial user role setup
  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    // Set role based on user record
    if (currentUser) {
      if (currentUser.superAdmin) {
        setUserRole("super_admin");
      } else if (currentUser.admin) {
        setUserRole("general_director");
      } else if (currentUser.role?.roleName === "Professeur" || currentUser.role?.roleName === "Enseignant" || currentUser.role?.roleName?.toLowerCase() === "teacher") {
        setUserRole("teacher");
      } else {
        setUserRole("student");
      }
    }

    // Handle online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Read pending sync queue length
    const queue = localStorage.getItem("lms_offline_queue");
    if (queue) {
      setPendingSyncCount(JSON.parse(queue).length);
    }

    // Try reading cache if offline
    if (!navigator.onLine) {
      const cachedCourses = localStorage.getItem("lms_courses_cache");
      if (cachedCourses) setCourses(JSON.parse(cachedCourses));
      const cachedLessons = localStorage.getItem("lms_lessons_cache");
      if (cachedLessons) setLessons(JSON.parse(cachedLessons));
      const cachedClasses = localStorage.getItem("lms_classes_cache");
      if (cachedClasses) setVirtualClasses(JSON.parse(cachedClasses));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [currentUser]);

  // Caching courses and progress locally
  useEffect(() => {
    if (mounted && courses.length > 0) {
      localStorage.setItem("lms_courses_cache", JSON.stringify(courses));
    }
  }, [courses, mounted]);

  useEffect(() => {
    if (mounted && lessons.length > 0) {
      localStorage.setItem("lms_lessons_cache", JSON.stringify(lessons));
    }
  }, [lessons, mounted]);

  useEffect(() => {
    if (mounted && virtualClasses.length > 0) {
      localStorage.setItem("lms_classes_cache", JSON.stringify(virtualClasses));
    }
  }, [virtualClasses, mounted]);

  // Offline Synchronization Manager
  const addToOfflineQueue = (actionType: string, payload: any) => {
    const queue = JSON.parse(localStorage.getItem("lms_offline_queue") || "[]");
    queue.push({ actionType, payload, timestamp: Date.now() });
    localStorage.setItem("lms_offline_queue", JSON.stringify(queue));
    setPendingSyncCount(queue.length);
    toast.warning("Action enregistrée hors ligne. Elle sera synchronisée au retour d'internet.");
  };

  const triggerSync = async () => {
    const queue = JSON.parse(localStorage.getItem("lms_offline_queue") || "[]");
    if (queue.length === 0) return;

    toast.info(`Synchronisation de ${queue.length} actions en attente...`);
    let successfulCount = 0;

    for (const item of queue) {
      try {
        if (item.actionType === "progress") {
          await updateLessonProgress(item.payload);
        } else if (item.actionType === "submission") {
          await saveSubmission(item.payload);
        }
        successfulCount++;
      } catch (err) {
        console.error("Sync item failed:", err);
      }
    }

    const remaining = queue.slice(successfulCount);
    localStorage.setItem("lms_offline_queue", JSON.stringify(remaining));
    setPendingSyncCount(remaining.length);

    if (successfulCount > 0) {
      toast.success(`${successfulCount} actions synchronisées avec succès !`);
      // Refresh state from server if online
      window.location.reload();
    }
  };

  if (!mounted) return null;

  // Helpers
  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subjectName || "Matière inconnue";
  const getClassName = (id: number) => classes.find(c => c.id === id)?.className || "Classe inconnue";
  const getTeacherName = (id: number) => employees.find(e => e.id === id)?.nomPrenom || "Enseignant inconnu";
  const getStudentName = (id: number) => students.find(s => s.id === id)?.nomEtudiant || "Étudiant inconnu";

  // Data calculations & KPIs
  const totalCourses = courses.length;
  const totalLessons = lessons.length;
  const videoSupports = lessons.filter(l => l.videoUrl).length;
  const pdfSupports = lessons.filter(l => l.contentType === "PDF" || l.filePath).length;
  const upcomingVirtualClasses = virtualClasses.filter(v => v.status === "À venir").length;
  const enrolledStudentsCount = students.length; // Simplified
  const devoirsToCorrect = submissions.filter(s => !s.isGraded).length;
  const activeQuizzes = quizzes.filter(q => q.status === "Active").length;
  const progressRate = 65; // Simulated overall progression rate
  const lastConnections = 12; // Simulated recent connections count

  // Charts datasets
  const progressionByClassData = [
    { name: "CP", Progression: 75 },
    { name: "CE1", Progression: 80 },
    { name: "CE2", Progression: 62 },
    { name: "CM1", Progression: 90 },
    { name: "CM2", Progression: 70 },
  ];

  const activityBySubjectData = [
    { name: "Maths", Cours: 12, Devoirs: 8 },
    { name: "Français", Cours: 15, Devoirs: 10 },
    { name: "Sciences", Cours: 8, Devoirs: 5 },
    { name: "Histoire", Cours: 6, Devoirs: 4 },
    { name: "Anglais", Cours: 10, Devoirs: 7 },
  ];

  const virtualPresenceData = [
    { name: "Présents", value: 125, color: "#10b981" },
    { name: "Absents", value: 15, color: "#ef4444" },
    { name: "Retard", value: 10, color: "#f59e0b" },
  ];

  const devoirsSubmissionData = [
    { name: "Rendus", value: 85, color: "#3b82f6" },
    { name: "Non rendus", value: 25, color: "#cbd5e1" },
  ];

  const quizResultsData = [
    { name: "Maths Q1", Moyenne: 14.5 },
    { name: "Français Q2", Moyenne: 16.2 },
    { name: "Sciences Q1", Moyenne: 11.8 },
    { name: "Anglais Q3", Moyenne: 15.0 },
  ];

  const popularCoursesData = [
    { name: "Algèbre 1", Inscrits: 45 },
    { name: "Grammaire FR", Inscrits: 38 },
    { name: "Astronomie", Inscrits: 52 },
    { name: "Grammaire EN", Inscrits: 30 },
  ];

  // Filters for tables
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.courseCode && c.courseCode.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClass = classFilter === "all" || c.classId === parseInt(classFilter);
    const matchesSubject = subjectFilter === "all" || c.subjectId === parseInt(subjectFilter);
    return matchesSearch && matchesClass && matchesSubject;
  });

  // Course reader specific calculations
  const courseLessons = selectedCourseId ? lessons.filter(l => l.courseId === selectedCourseId) : [];
  const selectedLesson = lessons.find(l => l.id === selectedLessonId);

  // Current Student details & progress (Simulating an active student for Student Space)
  const currentStudentId = students[0]?.id || 1; 
  const currentStudentProgress = progress.filter(p => p.studentId === currentStudentId);
  const completedLessonsCount = currentStudentProgress.filter(p => p.isCompleted).length;

  // Actions
  const handleSaveCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      courseCode: formData.get("courseCode") as string,
      classId: formData.get("classId") ? parseInt(formData.get("classId") as string) : null,
      subjectId: formData.get("subjectId") ? parseInt(formData.get("subjectId") as string) : null,
      teacherId: formData.get("teacherId") ? parseInt(formData.get("teacherId") as string) : null,
      description: formData.get("description") as string,
      status: formData.get("status") as string || "Draft",
    };

    if (editingCourse) {
      const res = await saveCourse(data, editingCourse.id);
      if (res.success) {
        setCourses(courses.map(c => c.id === editingCourse.id ? { ...c, ...data } : c));
        toast.success("Cours mis à jour avec succès !");
      }
    } else {
      const res = await saveCourse(data);
      if (res.success) {
        toast.success("Cours créé avec succès !");
        window.location.reload();
      }
    }
    setCourseFormOpen(false);
    setEditingCourse(null);
  };

  const handleDeleteCourse = async (id: number) => {
    if (confirm("Voulez-vous vraiment supprimer ce cours ?")) {
      const res = await deleteCourse(id);
      if (res.success) {
        setCourses(courses.filter(c => c.id !== id));
        toast.success("Cours supprimé avec succès !");
      }
    }
  };

  const handleSaveModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      courseId: selectedCourseId,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      displayOrder: formData.get("displayOrder") ? parseInt(formData.get("displayOrder") as string) : 0,
      status: formData.get("status") as string || "Active",
    };

    const res = await saveModule(data, editingModule?.id);
    if (res.success) {
      toast.success(editingModule ? "Module mis à jour !" : "Module créé !");
      window.location.reload();
    }
    setModuleFormOpen(false);
    setEditingModule(null);
  };

  const handleSaveLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      courseId: selectedCourseId,
      moduleId: selectedModuleId,
      content: formData.get("content") as string,
      contentType: formData.get("contentType") as string || "Text",
      videoUrl: formData.get("videoUrl") as string,
      filePath: formData.get("filePath") as string,
      duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : 15,
      displayOrder: formData.get("displayOrder") ? parseInt(formData.get("displayOrder") as string) : 0,
    };

    const res = await saveLmsLesson(data, editingLesson?.id);
    if (res.success) {
      toast.success(editingLesson ? "Leçon mise à jour !" : "Leçon créée !");
      window.location.reload();
    }
    setLessonFormOpen(false);
    setEditingLesson(null);
  };

  const handleSaveVirtualClass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      classId: formData.get("classId") ? parseInt(formData.get("classId") as string) : null,
      subjectId: formData.get("subjectId") ? parseInt(formData.get("subjectId") as string) : null,
      teacherId: formData.get("teacherId") ? parseInt(formData.get("teacherId") as string) : null,
      sessionDate: new Date(formData.get("sessionDate") as string),
      duration: formData.get("duration") ? parseInt(formData.get("duration") as string) : 45,
      meetingUrl: formData.get("meetingUrl") as string,
      meetingPassword: formData.get("meetingPassword") as string,
      platform: formData.get("platform") as string || "Google Meet",
      status: formData.get("status") as string || "À venir",
    };

    const res = await saveVirtualClass(data, editingVirtualClass?.id);
    if (res.success) {
      toast.success("Classe virtuelle enregistrée avec succès !");
      window.location.reload();
    }
    setVirtualClassFormOpen(false);
    setEditingVirtualClass(null);
  };

  const handleSaveAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      courseId: formData.get("courseId") ? parseInt(formData.get("courseId") as string) : null,
      classId: formData.get("classId") ? parseInt(formData.get("classId") as string) : null,
      subjectId: formData.get("subjectId") ? parseInt(formData.get("subjectId") as string) : null,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      fileSujetPath: formData.get("fileSujetPath") as string,
      dueDate: new Date(formData.get("dueDate") as string),
      maxScore: formData.get("maxScore") ? parseFloat(formData.get("maxScore") as string) : 20.0,
      status: formData.get("status") as string || "Active",
    };

    const res = await saveAssignment(data, editingAssignment?.id);
    if (res.success) {
      toast.success("Devoir enregistré !");
      window.location.reload();
    }
    setAssignmentFormOpen(false);
    setEditingAssignment(null);
  };

  const handleToggleLessonCompleted = async (lessonId: number) => {
    const isCompleted = !progress.find(p => p.lessonId === lessonId && p.studentId === currentStudentId)?.isCompleted;
    const notes = progress.find(p => p.lessonId === lessonId && p.studentId === currentStudentId)?.personalNotes || "";
    
    const payload = { studentId: currentStudentId, lessonId, isCompleted, personalNotes: notes };

    if (!isOnline) {
      addToOfflineQueue("progress", payload);
      // Optimistic update
      setProgress([...progress.filter(p => !(p.lessonId === lessonId && p.studentId === currentStudentId)), { ...payload, id: Math.random() }]);
      return;
    }

    const res = await updateLessonProgress(payload);
    if (res.success) {
      toast.success(isCompleted ? "Leçon marquée comme terminée !" : "Statut réinitialisé !");
      setProgress([...progress.filter(p => !(p.lessonId === lessonId && p.studentId === currentStudentId)), { ...payload, id: Math.random() }]);
    }
  };

  const handleSavePersonalNotes = async (lessonId: number, notes: string) => {
    const isCompleted = !!progress.find(p => p.lessonId === lessonId && p.studentId === currentStudentId)?.isCompleted;
    const payload = { studentId: currentStudentId, lessonId, isCompleted, personalNotes: notes };

    if (!isOnline) {
      addToOfflineQueue("progress", payload);
      return;
    }

    await updateLessonProgress(payload);
    toast.success("Notes personnelles sauvegardées !");
  };

  const handleSubmitDevoir = async (assignmentId: number) => {
    if (!studentSubmissionFile) {
      toast.error("Veuillez entrer une réponse ou un lien de fichier.");
      return;
    }

    const payload = {
      assignmentId,
      studentId: currentStudentId,
      fileReponsePath: studentSubmissionFile,
      isGraded: false
    };

    if (!isOnline) {
      addToOfflineQueue("submission", payload);
      setStudentSubmissionFile("");
      return;
    }

    const res = await saveSubmission(payload);
    if (res.success) {
      toast.success("Votre travail a été envoyé avec succès !");
      setStudentSubmissionFile("");
      window.location.reload();
    }
  };

  const handleGradeSubmissionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    const res = await gradeSubmission(gradingSubmission.id, parseFloat(gradeScore), gradeComment);
    if (res.success) {
      toast.success("Note et commentaire enregistrés !");
      setSubmissions(submissions.map(s => s.id === gradingSubmission.id ? { ...s, score: parseFloat(gradeScore), comment: gradeComment, isGraded: true } : s));
      setGradingSubmission(null);
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      courseId: formData.get("courseId") ? parseInt(formData.get("courseId") as string) : null,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      durationMin: formData.get("durationMin") ? parseInt(formData.get("durationMin") as string) : 20,
      passingScore: formData.get("passingScore") ? parseFloat(formData.get("passingScore") as string) : 10.0,
      status: formData.get("status") as string || "Draft",
      questions: []
    };

    const res = await saveQuiz(data, editingQuiz?.id);
    if (res.success) {
      toast.success("Quiz enregistré !");
      window.location.reload();
    }
    setQuizFormOpen(false);
    setEditingQuiz(null);
  };

  // Export functions
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(courses.map((c, i) => ({
      "N°": i + 1,
      "Code": c.courseCode,
      "Titre": c.title,
      "Classe": getClassName(c.classId),
      "Matière": getSubjectName(c.subjectId),
      "Enseignant": getTeacherName(c.teacherId),
      "Statut": c.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LMS Courses");
    XLSX.writeFile(wb, "LMS_Courses_Export.xlsx");
    toast.success("Export Excel réussi !");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("LMS Platform Report - Courses List", 14, 15);
    autoTable(doc, {
      head: [["N°", "Code", "Titre", "Classe", "Matière", "Enseignant", "Statut"]],
      body: courses.map((c, i) => [
        i + 1,
        c.courseCode || "-",
        c.title,
        getClassName(c.classId),
        getSubjectName(c.subjectId),
        getTeacherName(c.teacherId),
        c.status
      ]),
      startY: 20
    });
    doc.save("LMS_Courses_Report.pdf");
    toast.success("Export PDF réussi !");
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      
      {/* Offline Sync bar */}
      {!isOnline && (
        <div className="bg-amber-500 text-white p-3 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff size={20} />
            <span className="font-bold text-sm">Mode Hors ligne actif. Vos actions sont sauvegardées localement.</span>
          </div>
          {pendingSyncCount > 0 && (
            <span className="bg-amber-700 px-3 py-1 rounded-xl text-xs font-black">
              {pendingSyncCount} en attente
            </span>
          )}
        </div>
      )}

      {isOnline && pendingSyncCount > 0 && (
        <div className="bg-emerald-500 text-white p-3 rounded-2xl flex items-center justify-between shadow-md animate-bounce">
          <div className="flex items-center gap-2">
            <Wifi size={20} />
            <span className="font-bold text-sm">Connexion rétablie. Des données hors ligne attendent d'être synchronisées.</span>
          </div>
          <button onClick={triggerSync} className="bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-xl text-xs font-black transition-all">
            Synchroniser maintenant
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">E-Learning & LMS</h1>
            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              Scolaire
            </span>
          </div>
          <p className="text-slate-500 mt-1 font-medium">Plateforme éducative intégrale : étudiants, cours, modules, examens et classes en direct</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Year selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-4 py-2 rounded-2xl text-xs font-bold text-slate-700">
            <span className="text-slate-400">Année scolaire :</span>
            <select 
              value={schoolYear} 
              onChange={(e) => setSchoolYear(e.target.value)} 
              className="bg-transparent border-none outline-none font-bold text-indigo-600 cursor-pointer"
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>

          {/* Role switcher (for testing/management) */}
          {(currentUser?.superAdmin || currentUser?.admin) && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl text-xs font-bold text-indigo-900">
              <span className="text-indigo-500">Vue :</span>
              <select 
                value={userRole} 
                onChange={(e) => {
                  setUserRole(e.target.value);
                  setActiveTab(e.target.value === "student" ? "reader" : "dashboard");
                }}
                className="bg-transparent border-none outline-none font-black cursor-pointer text-indigo-600"
              >
                <option value="super_admin">Super Admin</option>
                <option value="general_director">Directeur</option>
                <option value="teacher">Professeur</option>
                <option value="student">Élève</option>
              </select>
            </div>
          )}

          {/* Action buttons shortcuts */}
          {userRole !== "student" && (
            <div className="flex gap-2">
              <button 
                onClick={() => { setEditingCourse(null); setCourseFormOpen(true); }}
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2"
              >
                <Plus size={14} /> Nouveau cours
              </button>
              <button 
                onClick={() => { setEditingVirtualClass(null); setVirtualClassFormOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all shadow-md flex items-center gap-2"
              >
                <Plus size={14} /> Nouvelle classe virtuelle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tab bar */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-100 rounded-3xl w-full max-w-fit print:hidden shadow-inner">
        {userRole !== "student" && (
          <>
            <button 
              onClick={() => setActiveTab("dashboard")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "dashboard" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              📊 Tableau de bord
            </button>
            <button 
              onClick={() => setActiveTab("catalog")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "catalog" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              📚 Catalogue Cours
            </button>
            <button 
              onClick={() => setActiveTab("modules")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "modules" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              🗂️ Modules & Leçons
            </button>
          </>
        )}
        <button 
          onClick={() => {
            setActiveTab("reader");
            // Auto select first course/lesson if none selected
            if (courses.length > 0 && !selectedCourseId) {
              setSelectedCourseId(courses[0].id);
              const courseL = lessons.filter(l => l.courseId === courses[0].id);
              if (courseL.length > 0) setSelectedLessonId(courseL[0].id);
            }
          }} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "reader" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          📖 Lecteur Cours
        </button>
        <button 
          onClick={() => setActiveTab("virtual-classes")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "virtual-classes" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          🌐 Lives
        </button>
        <button 
          onClick={() => setActiveTab("assignments")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "assignments" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          📝 Devoirs
        </button>
        <button 
          onClick={() => setActiveTab("quizzes")} 
          className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "quizzes" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          ❓ Quiz
        </button>
        {userRole !== "student" && (
          <>
            <button 
              onClick={() => setActiveTab("tracking")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "tracking" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              👥 Suivi élèves
            </button>
            <button 
              onClick={() => setActiveTab("reports")} 
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "reports" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              📁 Centre Rapports
            </button>
          </>
        )}
      </div>

      {/* -------------------- TAB 1: DASHBOARD -------------------- */}
      {activeTab === "dashboard" && userRole !== "student" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: "Total cours", value: totalCourses, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
              { label: "Total leçons", value: totalLessons, icon: GraduationCap, color: "text-purple-600 bg-purple-50" },
              { label: "Supports vidéo", value: videoSupports, icon: Video, color: "text-rose-600 bg-rose-50" },
              { label: "Documents PDF", value: pdfSupports, icon: FileText, color: "text-amber-600 bg-amber-50" },
              { label: "Directs à venir", value: upcomingVirtualClasses, icon: Globe, color: "text-emerald-600 bg-emerald-50" },
              { label: "Élèves inscrits", value: enrolledStudentsCount, icon: Users, color: "text-slate-600 bg-slate-50" },
              { label: "Devoirs à corriger", value: devoirsToCorrect, icon: Edit, color: "text-orange-600 bg-orange-50" },
              { label: "Quiz actifs", value: activeQuizzes, icon: Award, color: "text-indigo-600 bg-indigo-50" },
              { label: "Taux progression", value: `${progressRate}%`, icon: CheckCircle2, color: "text-teal-600 bg-teal-50" },
              { label: "Dernières connexions", value: lastConnections, icon: Clock, color: "text-neutral-600 bg-neutral-50" },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${kpi.color}`}>
                  <kpi.icon size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Recharts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Chart 1: Progression par classe */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Progression par classe (%)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressionByClassData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickLine={false} />
                    <Tooltip cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="Progression" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Activité par matière */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Activité par matière</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityBySubjectData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Cours" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="Devoirs" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Présence classes virtuelles */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Présence classes virtuelles</h3>
              <div className="h-64 flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={virtualPresenceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {virtualPresenceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-xs font-bold mt-2">
                  {virtualPresenceData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 4: Devoirs rendus */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Devoirs rendus / non rendus</h3>
              <div className="h-64 flex flex-col justify-center items-center">
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={devoirsSubmissionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {devoirsSubmissionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-xs font-bold mt-2">
                  {devoirsSubmissionData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-600">{d.name} ({d.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 5: Résultats quiz */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Moyenne Résultats Quiz (sur 20)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quizResultsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis domain={[0, 20]} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Moyenne" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Cours les plus suivis */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Cours les plus suivis</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popularCoursesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="Inscrits" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: COURSE CATALOG -------------------- */}
      {activeTab === "catalog" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filters and search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex flex-1 items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-2xl">
              <Search size={16} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Rechercher par titre ou code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select 
                value={classFilter} 
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer outline-none"
              >
                <option value="all">Toutes les classes</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.className}</option>
                ))}
              </select>

              <select 
                value={subjectFilter} 
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer outline-none"
              >
                <option value="all">Toutes les matières</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subjectName}</option>
                ))}
              </select>

              <button 
                onClick={exportToExcel}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all"
              >
                <Download size={16} /> Excel
              </button>

              <button 
                onClick={exportToPDF}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all"
              >
                <Printer size={16} /> PDF
              </button>
            </div>
          </div>

          {/* Courses Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">N°</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code cours</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Modules</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Leçons</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Inscrits</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date création</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                {filteredCourses.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-400">{i + 1}</td>
                    <td className="px-6 py-4 font-mono text-xs">{c.courseCode || "-"}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{c.title}</td>
                    <td className="px-6 py-4 text-indigo-600">{getClassName(c.classId)}</td>
                    <td className="px-6 py-4">{getSubjectName(c.subjectId)}</td>
                    <td className="px-6 py-4 text-slate-500">{getTeacherName(c.teacherId)}</td>
                    <td className="px-6 py-4 text-center">{c.modules?.length || 0}</td>
                    <td className="px-6 py-4 text-center">{c.lessons?.length || 0}</td>
                    <td className="px-6 py-4 text-center">{c.enrollments?.length || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        c.status === "Published" ? "bg-emerald-50 text-emerald-600" :
                        c.status === "Archived" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"
                      }`}>
                        {c.status === "Published" ? "Publié" : c.status === "Archived" ? "Archivé" : "Brouillon"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => { setSelectedCourseId(c.id); setActiveTab("modules"); }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          title="Gérer les modules & leçons"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingCourse(c); setCourseFormOpen(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(c.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: MODULES & LESSONS -------------------- */}
      {activeTab === "modules" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">Choisir un cours :</span>
              <select 
                value={selectedCourseId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCourseId(val ? parseInt(val) : null);
                  setSelectedModuleId(null);
                }}
                className="bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer outline-none"
              >
                <option value="">-- Choisir un cours --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {selectedCourseId && (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingModule(null); setModuleFormOpen(true); }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Nouveau module
                </button>
                {selectedModuleId && (
                  <button 
                    onClick={() => { setEditingLesson(null); setLessonFormOpen(true); }}
                    className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> Nouvelle leçon
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedCourseId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Modules List column */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">Modules du cours</h3>
                <div className="space-y-3">
                  {(courses.find(c => c.id === selectedCourseId)?.modules || []).map((m: any) => (
                    <div 
                      key={m.id} 
                      onClick={() => setSelectedModuleId(m.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedModuleId === m.id ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100 hover:border-slate-300 bg-slate-50/30"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-800">{m.title}</p>
                        <p className="text-xs text-slate-400">Ordre : {m.displayOrder}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingModule(m); setModuleFormOpen(true); }}
                          className="p-1 text-blue-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={async (e) => { 
                            e.stopPropagation(); 
                            if(confirm("Supprimer ce module ?")) {
                              await deleteModule(m.id);
                              window.location.reload();
                            }
                          }}
                          className="p-1 text-rose-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(courses.find(c => c.id === selectedCourseId)?.modules || []).length === 0 && (
                    <p className="text-slate-400 text-xs font-semibold text-center py-6">Aucun module défini pour ce cours.</p>
                  )}
                </div>
              </div>

              {/* Lessons List column */}
              <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Leçons {selectedModuleId ? `du module sélectionné` : `(Sélectionnez un module)`}
                </h3>
                {selectedModuleId ? (
                  <div className="space-y-3">
                    {lessons.filter(l => l.moduleId === selectedModuleId).map((l: any) => (
                      <div key={l.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/20 flex items-center justify-between hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-4">
                          <span className="bg-slate-100 text-slate-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">
                            {l.displayOrder}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{l.title}</p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase">
                                {l.contentType}
                              </span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md">
                                {l.duration} min
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => { setEditingLesson(l); setLessonFormOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-slate-50 rounded-xl transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm("Supprimer cette leçon ?")) {
                                await deleteLmsLesson(l.id);
                                window.location.reload();
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-slate-50 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {lessons.filter(l => l.moduleId === selectedModuleId).length === 0 && (
                      <p className="text-slate-400 text-xs font-semibold text-center py-12">Aucune leçon dans ce module.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs font-semibold text-center py-20">Veuillez sélectionner un module à gauche pour afficher et éditer ses leçons.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 shadow-sm text-center text-slate-400 font-bold">
              Veuillez sélectionner un cours ci-dessus pour gérer ses modules et ses leçons.
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 4: COURSE READER (Vue Élève) -------------------- */}
      {activeTab === "reader" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Sélectionner le cours :</span>
              <select 
                value={selectedCourseId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCourseId(val ? parseInt(val) : null);
                  const firstL = lessons.find(l => l.courseId === parseInt(val));
                  setSelectedLessonId(firstL ? firstL.id : null);
                }}
                className="bg-slate-50 border border-slate-200/60 px-4 py-2 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer outline-none font-black text-indigo-600"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            {/* Student progression stats */}
            <div className="text-right text-xs font-black text-slate-400 uppercase tracking-widest">
              Progression : {completedLessonsCount} / {courseLessons.length} leçons
            </div>
          </div>

          {selectedCourseId ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Course Syllabus outline */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 h-[600px] overflow-y-auto">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Plan du cours</h3>
                <div className="space-y-6">
                  {(courses.find(c => c.id === selectedCourseId)?.modules || []).map((mod: any) => (
                    <div key={mod.id} className="space-y-2">
                      <p className="font-black text-xs text-indigo-600 uppercase tracking-wider">{mod.title}</p>
                      <div className="space-y-1">
                        {lessons.filter(l => l.moduleId === mod.id).map((les: any) => {
                          const isCompleted = progress.find(p => p.lessonId === les.id && p.studentId === currentStudentId)?.isCompleted;
                          return (
                            <div 
                              key={les.id}
                              onClick={() => setSelectedLessonId(les.id)}
                              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                                selectedLessonId === les.id 
                                  ? "bg-primary text-white" 
                                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span className="truncate pr-2">{les.title}</span>
                              <div className="flex items-center gap-1">
                                {isCompleted ? (
                                  <CheckCircle size={14} className={selectedLessonId === les.id ? "text-white" : "text-emerald-500"} />
                                ) : (
                                  <span className="text-[9px] opacity-60">{les.duration}m</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Course viewer panel */}
              <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 flex flex-col min-h-[600px]">
                {selectedLesson ? (
                  <>
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {selectedLesson.contentType}
                        </span>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">{selectedLesson.title}</h2>
                      </div>
                      <button 
                        onClick={() => handleToggleLessonCompleted(selectedLesson.id)}
                        className={`px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                          progress.find(p => p.lessonId === selectedLesson.id && p.studentId === currentStudentId)?.isCompleted
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {progress.find(p => p.lessonId === selectedLesson.id && p.studentId === currentStudentId)?.isCompleted
                          ? "Terminée ✔" : "Marquer comme terminée"}
                      </button>
                    </div>

                    {/* Lesson Media content viewer */}
                    <div className="space-y-6 flex-1">
                      {selectedLesson.videoUrl && (
                        <div className="aspect-video bg-slate-900 rounded-[2rem] overflow-hidden shadow-inner relative flex items-center justify-center">
                          {selectedLesson.videoUrl.includes("youtube.com") || selectedLesson.videoUrl.includes("youtu.be") ? (
                            <iframe 
                              src={selectedLesson.videoUrl.replace("watch?v=", "embed/")} 
                              className="w-full h-full border-none"
                              allowFullScreen
                            />
                          ) : (
                            <video src={selectedLesson.videoUrl} controls className="w-full h-full" />
                          )}
                        </div>
                      )}

                      {selectedLesson.filePath && (
                        <div className="border border-slate-100 p-6 rounded-3xl bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText size={24} className="text-indigo-500" />
                            <div>
                              <p className="font-bold text-slate-800">Support de cours PDF joint</p>
                              <p className="text-xs text-slate-400">Télécharger pour lecture hors-ligne</p>
                            </div>
                          </div>
                          <a 
                            href={selectedLesson.filePath} 
                            download 
                            className="bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl flex items-center gap-2"
                          >
                            <Download size={14} /> Ouvrir / Télécharger
                          </a>
                        </div>
                      )}

                      {/* Text content summary */}
                      {selectedLesson.content && (
                        <div className="text-slate-600 font-medium leading-relaxed bg-slate-50/40 p-6 rounded-3xl border border-slate-100">
                          <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-3">Résumé de la leçon</h4>
                          <p className="whitespace-pre-line">{selectedLesson.content}</p>
                        </div>
                      )}
                    </div>

                    {/* Student personal notes */}
                    <div className="border-t border-slate-100 pt-6 space-y-3">
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Mes notes personnelles (sauvegardées automatiquement)</h4>
                      <textarea 
                        defaultValue={progress.find(p => p.lessonId === selectedLesson.id && p.studentId === currentStudentId)?.personalNotes || ""}
                        onBlur={(e) => handleSavePersonalNotes(selectedLesson.id, e.target.value)}
                        placeholder="Écrivez vos notes de cours ici..."
                        className="w-full bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-xs font-semibold outline-none focus:border-indigo-500 h-24 text-slate-700"
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 font-bold">
                    <BookOpen size={48} className="text-slate-300 mb-2" />
                    Sélectionnez une leçon dans le syllabus à gauche pour démarrer la lecture.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 shadow-sm text-center text-slate-400 font-bold">
              Aucun cours disponible pour la lecture.
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 5: VIRTUAL CLASSES -------------------- */}
      {activeTab === "virtual-classes" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durée</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plateforme</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mot de passe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                {virtualClasses.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{v.title}</td>
                    <td className="px-6 py-4 text-indigo-600">{getClassName(v.classId)}</td>
                    <td className="px-6 py-4">{getSubjectName(v.subjectId)}</td>
                    <td className="px-6 py-4 text-slate-500">{getTeacherName(v.teacherId)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-800">{new Date(v.sessionDate).toLocaleDateString()}</span>
                        <span className="text-xs text-slate-400">{new Date(v.sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">{v.duration} min</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-600 font-bold">
                        {v.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs">{v.meetingPassword || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        v.status === "À venir" ? "bg-emerald-50 text-emerald-600" :
                        v.status === "Terminée" ? "bg-slate-100 text-slate-500" : "bg-rose-50 text-rose-600"
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={v.meetingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-primary hover:bg-primary/95 text-white font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                        >
                          <ExternalLink size={12} /> Rejoindre
                        </a>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(v.meetingUrl);
                            toast.success("Lien copié dans le presse-papier !");
                          }}
                          className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                          title="Copier le lien"
                        >
                          <Copy size={14} />
                        </button>
                        {userRole !== "student" && (
                          <>
                            <button 
                              onClick={() => { setEditingVirtualClass(v); setVirtualClassFormOpen(true); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm("Annuler ce direct ?")) {
                                  await deleteVirtualClass(v.id);
                                  window.location.reload();
                                }
                              }}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB 6: DEVOIRS LMS -------------------- */}
      {activeTab === "assignments" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm print:hidden">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Devoirs et Travaux scolaires</h3>
            {userRole !== "student" && (
              <button 
                onClick={() => { setEditingAssignment(null); setAssignmentFormOpen(true); }}
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl shadow-md flex items-center gap-2"
              >
                <Plus size={14} /> Nouveau devoir
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Devoirs list */}
            <div className="lg:col-span-2 space-y-4">
              {assignments.map((a) => {
                const subCount = submissions.filter(s => s.assignmentId === a.id).length;
                const gradedCount = submissions.filter(s => s.assignmentId === a.id && s.isGraded).length;
                return (
                  <div 
                    key={a.id} 
                    onClick={() => {
                      setSelectedAssignmentId(a.id);
                      setGradingSubmission(null);
                    }}
                    className={`p-6 rounded-[2rem] border bg-white shadow-sm cursor-pointer transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                      selectedAssignmentId === a.id ? "border-indigo-600" : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex gap-2 mb-2">
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                          {getClassName(a.classId)}
                        </span>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                          {getSubjectName(a.subjectId)}
                        </span>
                      </div>
                      <h4 className="font-black text-lg text-slate-900">{a.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">Limite : {new Date(a.dueDate).toLocaleDateString()} | Barème : /{a.maxScore}</p>
                    </div>

                    <div className="flex items-center gap-6">
                      {userRole !== "student" ? (
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Rendus / Corrigés</p>
                          <p className="text-lg font-black text-indigo-600">{subCount} / {gradedCount}</p>
                        </div>
                      ) : (
                        <div>
                          {submissions.find(s => s.assignmentId === a.id && s.studentId === currentStudentId) ? (
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                              Rendu {submissions.find(s => s.assignmentId === a.id && s.studentId === currentStudentId)?.isGraded ? "✓ Corrigé" : "⏳ Attente correction"}
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                              Non rendu
                            </span>
                          )}
                        </div>
                      )}

                      {userRole !== "student" && (
                        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => { setEditingAssignment(a); setAssignmentFormOpen(true); }}
                            className="p-2 text-blue-600 hover:bg-slate-100 rounded-xl"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm("Supprimer ce devoir ?")) {
                                await deleteAssignment(a.id);
                                window.location.reload();
                              }
                            }}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Devoir details panel */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              {selectedAssignmentId ? (
                (() => {
                  const assignment = assignments.find(a => a.id === selectedAssignmentId);
                  if (!assignment) return null;
                  const mySubmission = submissions.find(s => s.assignmentId === selectedAssignmentId && s.studentId === currentStudentId);

                  return (
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <h3 className="font-black text-xl text-slate-900">{assignment.title}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Maximum score : {assignment.maxScore} points</p>
                      </div>

                      {assignment.description && (
                        <div className="text-slate-600 font-medium text-xs bg-slate-50 p-4 rounded-2xl border">
                          {assignment.description}
                        </div>
                      )}

                      {assignment.fileSujetPath && (
                        <a 
                          href={assignment.fileSujetPath} 
                          target="_blank" 
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black text-[10px] uppercase tracking-widest p-4 rounded-2xl flex items-center justify-between"
                        >
                          <span>📄 Télécharger le sujet</span>
                          <Download size={14} />
                        </a>
                      )}

                      {/* View for Student upload */}
                      {userRole === "student" && (
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Mon rendu (Élève)</h4>
                          {mySubmission ? (
                            <div className="space-y-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                              <p className="text-xs font-bold text-emerald-800">Travail transmis avec succès !</p>
                              <p className="text-xs text-slate-500 font-mono">Fichier : {mySubmission.fileReponsePath}</p>
                              {mySubmission.isGraded ? (
                                <div className="pt-2 border-t border-emerald-200">
                                  <p className="text-xs font-black text-emerald-900">Note obtenue : {mySubmission.score} / {assignment.maxScore}</p>
                                  {mySubmission.comment && (
                                    <p className="text-xs text-slate-600 mt-1 italic">Correction : "{mySubmission.comment}"</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">En attente de notation par l'enseignant.</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <input 
                                type="text" 
                                placeholder="Lien vers votre travail (PDF, Drive...)" 
                                value={studentSubmissionFile}
                                onChange={(e) => setStudentSubmissionFile(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500"
                              />
                              <button 
                                onClick={() => handleSubmitDevoir(assignment.id)}
                                className="w-full bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md flex items-center justify-center gap-2"
                              >
                                <Upload size={14} /> Envoyer ma réponse
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* View for Teacher grading list */}
                      {userRole !== "student" && (
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Copies reçues (Notation)</h4>
                          <div className="space-y-2">
                            {submissions.filter(s => s.assignmentId === assignment.id).map((s) => (
                              <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-xs text-slate-800">{getStudentName(s.studentId)}</p>
                                  <a href={s.fileReponsePath} target="_blank" className="text-[10px] text-indigo-600 underline font-mono truncate max-w-[150px] block">
                                    Voir copie
                                  </a>
                                </div>
                                <div>
                                  {s.isGraded ? (
                                    <span className="text-xs font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                                      {s.score} / {assignment.maxScore}
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setGradingSubmission(s);
                                        setGradeScore(s.score ? String(s.score) : "");
                                        setGradeComment(s.comment || "");
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg"
                                    >
                                      Noter
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {submissions.filter(s => s.assignmentId === assignment.id).length === 0 && (
                              <p className="text-slate-400 text-xs font-semibold text-center py-4">Aucun élève n'a encore rendu ce devoir.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-400 font-bold text-center py-20">
                  Sélectionnez un devoir à gauche pour afficher les détails, les copies et procéder aux corrections.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 7: QUIZZES -------------------- */}
      {activeTab === "quizzes" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Quiz & Évaluations rapides</h3>
            {userRole !== "student" && (
              <button 
                onClick={() => { setEditingQuiz(null); setQuizFormOpen(true); }}
                className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-2xl shadow-md flex items-center gap-2"
              >
                <Plus size={14} /> Nouveau Quiz
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {quizzes.map((q) => (
                <div 
                  key={q.id}
                  onClick={() => {
                    setSelectedQuizId(q.id);
                    setQuizAttempt(null);
                  }}
                  className={`p-6 rounded-[2rem] border bg-white shadow-sm cursor-pointer transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                    selectedQuizId === q.id ? "border-indigo-600" : "border-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <h4 className="font-black text-lg text-slate-900">{q.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">Durée : {q.durationMin} minutes | Note minimale : {q.passingScore}/20</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      q.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {q.status === "Active" ? "Actif" : "Brouillon"}
                    </span>

                    {userRole !== "student" && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => { setEditingQuiz(q); setQuizFormOpen(true); }}
                          className="p-2 text-blue-600 hover:bg-slate-50 rounded-xl"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm("Supprimer ce quiz ?")) {
                              await deleteQuiz(q.id);
                              window.location.reload();
                            }
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              {selectedQuizId ? (
                (() => {
                  const quiz = quizzes.find(q => q.id === selectedQuizId);
                  if (!quiz) return null;

                  return (
                    <div className="space-y-6">
                      <div className="border-b pb-4">
                        <h3 className="font-black text-xl text-slate-900">{quiz.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{quiz.description || "Aucune description fournie."}</p>
                      </div>

                      {userRole === "student" && !quizAttempt && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border text-xs space-y-2 text-slate-600">
                            <p>⏱ **Durée :** {quiz.durationMin} minutes</p>
                            <p>🎯 **Note requise :** {quiz.passingScore} / 20</p>
                            <p>⚠️ **Tentatives autorisées :** {quiz.maxAttempts || 1}</p>
                          </div>
                          <button 
                            onClick={() => {
                              // Simulate taking quiz
                              setQuizAttempt({
                                startTime: Date.now(),
                                answers: {}
                              });
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md"
                          >
                            🚀 Démarrer l'évaluation
                          </button>
                        </div>
                      )}

                      {/* Simulating Quiz Taking */}
                      {quizAttempt && (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center bg-rose-50 text-rose-700 p-3 rounded-2xl font-black text-xs">
                            <span>ÉVALUATION EN COURS</span>
                            <span>{quiz.durationMin}:00</span>
                          </div>

                          <div className="space-y-4">
                            <p className="font-bold text-sm text-slate-800">Question 1: Quel est le type de triangle ayant un angle droit ?</p>
                            <div className="space-y-2 text-xs font-semibold text-slate-700">
                              {["Isocèle", "Équilatéral", "Rectangle", "Scalène"].map((ansOption, oIdx) => (
                                <label key={oIdx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer">
                                  <input type="radio" name="q1" value={ansOption} className="text-primary focus:ring-primary" />
                                  <span>{ansOption}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              toast.success("Quiz soumis avec succès !");
                              setQuizAttempt(null);
                            }}
                            className="w-full bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md"
                          >
                            Terminer et Envoyer
                          </button>
                        </div>
                      )}

                      {userRole !== "student" && (
                        <div className="space-y-4">
                          <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs">Contenu & Questions</h4>
                          <div className="p-4 rounded-2xl border bg-slate-50/50 text-xs text-slate-500 font-bold space-y-2 text-center">
                            Ce quiz contient {(quiz.questions || []).length} questions.
                            <br />
                            Moyenne générale de la classe : 14.2 / 20.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-slate-400 font-bold text-center py-20">
                  Sélectionnez un quiz à gauche pour démarrer le test ou configurer les barèmes de notation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 8: SUIVI ELEVES -------------------- */}
      {activeTab === "tracking" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cours suivis</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Leçons terminées</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Devoirs rendus</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Moyenne quiz</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progression</th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-semibold text-slate-700">
                {students.map((student) => {
                  const sProgress = progress.filter(p => p.studentId === student.id);
                  const complCount = sProgress.filter(p => p.isCompleted).length;
                  const sSubmissions = submissions.filter(s => s.studentId === student.id).length;
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {student.nomEtudiant.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{student.nomEtudiant}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{student.numAdmission}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-indigo-600">{student.classe}</td>
                      <td className="px-6 py-4 text-center">2</td>
                      <td className="px-6 py-4 text-center text-slate-500">{complCount}</td>
                      <td className="px-6 py-4 text-center text-slate-500">{sSubmissions}</td>
                      <td className="px-6 py-4 text-center font-bold text-amber-600">15.5/20</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div className="bg-indigo-600 h-full" style={{ width: "65%" }}></div>
                          </div>
                          <span className="text-xs text-slate-500">65%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-xs">
                          Actif
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB 9: REPORTS -------------------- */}
      {activeTab === "reports" && userRole !== "student" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Rapport progression élèves", desc: "Progression par classe, taux de complétion des modules." },
              { title: "Rapport activité enseignants", desc: "Fréquence d'ajout de leçons et cours publiés." },
              { title: "Rapport classes virtuelles", desc: "Journal des séances, taux de présence par live." },
              { title: "Rapport devoirs", desc: "Notes des travaux, retards de soumission." },
              { title: "Rapport quiz", desc: "Analyses des résultats, moyenne par test." },
              { title: "Rapport présence LMS", desc: "Historique des connexions par jour/heure." },
            ].map((rep, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-all">
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 text-base">{rep.title}</h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{rep.desc}</p>
                </div>
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={exportToPDF}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all"
                  >
                    PDF
                  </button>
                  <button 
                    onClick={exportToExcel}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider py-3 rounded-xl transition-all"
                  >
                    EXCEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== FORMS / MODALS SECTION ==================== */}

      {/* 1. Course Modal */}
      {courseFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCourse} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl max-w-lg w-full space-y-6 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900">{editingCourse ? "Modifier le cours" : "Nouveau cours"}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre du cours *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingCourse?.title || ""} 
                  required 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code cours</label>
                <input 
                  type="text" 
                  name="courseCode" 
                  defaultValue={editingCourse?.courseCode || ""} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe *</label>
                  <select name="classId" defaultValue={editingCourse?.classId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière *</label>
                  <select name="subjectId" defaultValue={editingCourse?.subjectId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant *</label>
                <select name="teacherId" defaultValue={editingCourse?.teacherId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                  <option value="">-- Choisir --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.nomPrenom}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingCourse?.description || ""} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold h-24 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                <select name="status" defaultValue={editingCourse?.status || "Draft"} className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                  <option value="Draft">Brouillon</option>
                  <option value="Published">Publié</option>
                  <option value="Archived">Archivé</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setCourseFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-md"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Module Modal */}
      {moduleFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveModule} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl max-w-md w-full space-y-6 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900">{editingModule ? "Modifier le module" : "Nouveau module"}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre du module *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingModule?.title || ""} 
                  required 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordre d'affichage</label>
                <input 
                  type="number" 
                  name="displayOrder" 
                  defaultValue={editingModule?.displayOrder || 0} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingModule?.description || ""} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold h-20 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setModuleFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Lesson Modal */}
      {lessonFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveLesson} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl max-w-lg w-full space-y-6 overflow-y-auto max-h-[90vh] animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900">{editingLesson ? "Modifier la leçon" : "Nouvelle leçon"}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre de la leçon *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingLesson?.title || ""} 
                  required 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type de contenu *</label>
                  <select name="contentType" defaultValue={editingLesson?.contentType || "Text"} className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="Text">Texte</option>
                    <option value="PDF">PDF</option>
                    <option value="Video">Vidéo</option>
                    <option value="Audio">Audio</option>
                    <option value="Quiz">Quiz</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée estimée (min)</label>
                  <input 
                    type="number" 
                    name="duration" 
                    defaultValue={editingLesson?.duration || 15} 
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Vidéo</label>
                <input 
                  type="text" 
                  name="videoUrl" 
                  defaultValue={editingLesson?.videoUrl || ""} 
                  placeholder="https://youtube.com/..." 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lien Document / Fichier PDF</label>
                <input 
                  type="text" 
                  name="filePath" 
                  defaultValue={editingLesson?.filePath || ""} 
                  placeholder="/uploads/..." 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordre d'affichage</label>
                <input 
                  type="number" 
                  name="displayOrder" 
                  defaultValue={editingLesson?.displayOrder || 0} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contenu textuel / Résumé</label>
                <textarea 
                  name="content" 
                  defaultValue={editingLesson?.content || ""} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold h-24 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setLessonFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Virtual Class Modal */}
      {virtualClassFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveVirtualClass} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl max-w-lg w-full space-y-6 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900">{editingVirtualClass ? "Modifier la séance" : "Nouvelle séance en direct"}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre de la réunion *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingVirtualClass?.title || ""} 
                  required 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe *</label>
                  <select name="classId" defaultValue={editingVirtualClass?.classId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière *</label>
                  <select name="subjectId" defaultValue={editingVirtualClass?.subjectId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure *</label>
                  <input 
                    type="datetime-local" 
                    name="sessionDate" 
                    defaultValue={editingVirtualClass?.sessionDate ? new Date(editingVirtualClass.sessionDate).toISOString().slice(0, 16) : ""}
                    required
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée (minutes)</label>
                  <input 
                    type="number" 
                    name="duration" 
                    defaultValue={editingVirtualClass?.duration || 45} 
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plateforme</label>
                  <select name="platform" defaultValue={editingVirtualClass?.platform || "Google Meet"} className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="Google Meet">Google Meet</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Microsoft Teams">Microsoft Teams</option>
                    <option value="Custom">Custom Link</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe de la réunion</label>
                  <input 
                    type="text" 
                    name="meetingPassword" 
                    defaultValue={editingVirtualClass?.meetingPassword || ""} 
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lien de la réunion *</label>
                <input 
                  type="text" 
                  name="meetingUrl" 
                  defaultValue={editingVirtualClass?.meetingUrl || ""} 
                  placeholder="https://..." 
                  required
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant *</label>
                  <select name="teacherId" defaultValue={editingVirtualClass?.teacherId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.nomPrenom}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                  <select name="status" defaultValue={editingVirtualClass?.status || "À venir"} className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="À venir">À venir</option>
                    <option value="Terminée">Terminée</option>
                    <option value="Annulée">Annulée</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setVirtualClassFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. Assignment Modal */}
      {assignmentFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveAssignment} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl max-w-lg w-full space-y-6 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900">{editingAssignment ? "Modifier le devoir" : "Nouveau Devoir"}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre du devoir *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingAssignment?.title || ""} 
                  required 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cours lié *</label>
                  <select name="courseId" defaultValue={editingAssignment?.courseId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe *</label>
                  <select name="classId" defaultValue={editingAssignment?.classId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matière *</label>
                  <select name="subjectId" defaultValue={editingAssignment?.subjectId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                    <option value="">-- Choisir --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date limite de rendu *</label>
                  <input 
                    type="datetime-local" 
                    name="dueDate" 
                    defaultValue={editingAssignment?.dueDate ? new Date(editingAssignment.dueDate).toISOString().slice(0, 16) : ""}
                    required
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Barème maximum (ex: 20)</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    name="maxScore" 
                    defaultValue={editingAssignment?.maxScore || 20} 
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lien du document de sujet</label>
                <input 
                  type="text" 
                  name="fileSujetPath" 
                  defaultValue={editingAssignment?.fileSujetPath || ""} 
                  placeholder="/uploads/sujet..." 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Renseignements</label>
                <textarea 
                  name="description" 
                  defaultValue={editingAssignment?.description || ""} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold h-20 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setAssignmentFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. Submission Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleGradeSubmissionSubmit} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl max-w-md w-full space-y-6 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900">Noter la copie</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <p className="text-xs text-slate-500 font-bold">Élève : {getStudentName(gradingSubmission.studentId)}</p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Note accordée</label>
                <input 
                  type="number" 
                  step="0.25" 
                  required
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                  placeholder="Ex : 15.5" 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commentaires et Remarques</label>
                <textarea 
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  placeholder="Excellent travail..." 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold h-24 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setGradingSubmission(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Fermer
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Valider
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 7. Quiz Modal */}
      {quizFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveQuiz} className="bg-white p-8 rounded-[2.5rem] border shadow-2xl max-w-md w-full space-y-6 animate-in zoom-in duration-300">
            <h3 className="text-xl font-black text-slate-900">{editingQuiz ? "Modifier le Quiz" : "Nouveau Quiz"}</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titre du Quiz *</label>
                <input 
                  type="text" 
                  name="title" 
                  defaultValue={editingQuiz?.title || ""} 
                  required 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cours lié *</label>
                <select name="courseId" defaultValue={editingQuiz?.courseId || ""} required className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                  <option value="">-- Choisir --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée (minutes)</label>
                  <input 
                    type="number" 
                    name="durationMin" 
                    defaultValue={editingQuiz?.durationMin || 20} 
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moyenne de réussite</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    name="passingScore" 
                    defaultValue={editingQuiz?.passingScore || 10.0} 
                    className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingQuiz?.description || ""} 
                  className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold h-20 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</label>
                <select name="status" defaultValue={editingQuiz?.status || "Draft"} className="w-full bg-slate-50 border p-3 rounded-2xl text-xs font-bold cursor-pointer">
                  <option value="Draft">Brouillon</option>
                  <option value="Active">Actif</option>
                  <option value="Closed">Fermé</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setQuizFormOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl"
              >
                Créer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
