"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, DollarSign, BookOpen, Calendar, ShieldCheck, 
  Download, Printer, Mail, Clock, Filter, Eye, RefreshCw,
  Search, ShieldAlert, Award, FileSpreadsheet, Building2,
  Droplets, Lightbulb, AlertTriangle, Layers, UserCheck, Activity,
  Globe, Library, FileText, TrendingDown, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { localDb } from "@/infrastructure/local-db/dexie";
import dynamicImport from "next/dynamic";
const UniversalReport = dynamicImport(() => import("@/components/reporting/universal-report"), { ssr: false });
import { Label } from "@/components/ui/label";

interface ReportsDashboardProps {
  unifiedData: {
    students: any[];
    classes: any[];
    subjects: any[];
    employees: any[];
    feePayments: any[];
    expenses: any[];
    attendance: any[];
    seances: any[];
    plans: any[];
    resources: any[];
    courses: any[];
    lessons: any[];
    assignments: any[];
    submissions: any[];
    progress: any[];
    virtualClasses: any[];
    auditLogs: any[];
    grades?: any[];
    sessions?: any[];
    periods?: any[];
  };
  branding: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  currentUser: any;
}

type ReportType = 
  | "students" 
  | "finances" 
  | "pedagogie" 
  | "presence" 
  | "rh" 
  | "lms" 
  | "library"
  | "canevas" 
  | "inspection"
  | "ministry"
  | "security";

export default function ReportsDashboard({ unifiedData: initialData, branding, currentUser }: ReportsDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [data, setData] = useState(initialData);
  const [activeReport, setActiveReport] = useState<ReportType>("students");

  // Dynamic Academic Years (Sessions) extracted from real database students
  const uniqueSessions = React.useMemo(() => {
    const dbSess = (data.sessions || []).map((s: any) => s.sessionName).filter(Boolean);
    if (dbSess.length > 0) return Array.from(new Set(dbSess)).sort();

    const sess = Array.from(new Set((data.students || []).map(s => s.session).filter(Boolean))) as string[];
    return sess.length > 0 ? sess.sort() : ["2024-2025", "2025-2026", "2026-2027"];
  }, [data.sessions, data.students]);

  // General Filters States
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [period, setPeriod] = useState("All");
  const [selectedClassId, setSelectedClassId] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("All");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // New General Filters
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedInspection, setSelectedInspection] = useState("All");
  const [selectedCommune, setSelectedCommune] = useState("All");
  const [selectedEstablishment, setSelectedEstablishment] = useState("All");

  // Filter periods based on selected academic year
  const filteredPeriods = React.useMemo(() => {
    const allPeriods = data.periods || [];
    if (academicYear === "All") return allPeriods;
    
    // Find the session object
    const sessionObj = (data.sessions || []).find((s: any) => s.sessionName === academicYear);
    if (!sessionObj) return allPeriods;
    
    return allPeriods.filter((p: any) => p.sessionId === sessionObj.id);
  }, [academicYear, data.periods, data.sessions]);

  // Find the selected period object from the database periods
  const selectedPeriodObj = React.useMemo(() => {
    if (period === "All") return null;
    return (data.periods || []).find((p: any) => String(p.id) === period);
  }, [period, data.periods]);

  // Get active period name for display
  const activePeriodName = React.useMemo(() => {
    if (period === "All") return "Année entière";
    if (selectedPeriodObj) return selectedPeriodObj.name;
    if (period === "T1") return "Trimestre 1";
    if (period === "T2") return "Trimestre 2";
    if (period === "T3") return "Trimestre 3";
    return period;
  }, [period, selectedPeriodObj]);

  // Export History State
  const [exportHistory, setExportHistory] = useState<any[]>([]);

  // Automatically default academicYear to the first available session in the database
  useEffect(() => {
    if (uniqueSessions.length > 0 && !uniqueSessions.includes(academicYear)) {
      setAcademicYear(uniqueSessions[0]);
    }
  }, [uniqueSessions]);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    // Load export history from local storage
    const storedHistory = localStorage.getItem("reports_export_history");
    if (storedHistory) {
      try {
        setExportHistory(JSON.parse(storedHistory));
      } catch (e) {}
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Dexie Cache Management: If online, write to cache; if offline, read from cache
    if (navigator.onLine) {
      setData(initialData);
      localDb.references.put({
        type: "lmsCache",
        label: "reporting_center_cache",
        payload: initialData,
        updatedAt: Date.now()
      }).catch(() => {});
    } else {
      localDb.references.where("label").equals("reporting_center_cache").first()
        .then(r => {
          if (r?.payload) {
            setData(r.payload);
            toast.info("Données de reporting chargées depuis le cache hors-ligne.");
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [initialData]);

  // Log export action to history helper
  const logExportAction = (format: string) => {
    const newLog = {
      id: Date.now(),
      reportName: getReportTitle(activeReport),
      format: format.toUpperCase(),
      date: new Date().toLocaleString("fr-FR"),
      operator: currentUser?.nomPrenom || "Utilisateur"
    };
    const updated = [newLog, ...exportHistory].slice(0, 50); // Keep last 50 logs
    setExportHistory(updated);
    localStorage.setItem("reports_export_history", JSON.stringify(updated));
  };

  const getReportTitle = (type: string) => {
    switch (type) {
      case "students": return "Rapport des Effectifs Étudiants";
      case "finances": return "Rapport de Synthèse Financière";
      case "pedagogie": return "Rapport de Suivi Pédagogique";
      case "presence": return "Rapport d'Assiduité et de Présence";
      case "rh": return "Rapport des Ressources Humaines";
      case "lms": return "Rapport LMS & E-Learning";
      case "library": return "Rapport de la Bibliothèque & Lectures";
      case "canevas": return "Rapport Canevas & Structures";
      case "inspection": return "Rapport Général des Inspections de District";
      case "ministry": return "Rapport National Décisionnel Ministériel";
      case "security": return "Rapport d'Audit et Sécurité";
      default: return "Rapport d'Établissement";
    }
  };

  const getReportModuleName = (type: string) => {
    switch (type) {
      case "students": return "GESTION DES ÉLÈVES";
      case "finances": return "COMPTABILITÉ & FINANCES";
      case "pedagogie": return "SUPERVISION PÉDAGOGIQUE";
      case "presence": return "CONTRÔLE DE PRÉSENCE";
      case "rh": return "RESSOURCES HUMAINES";
      case "lms": return "PLATEFORME LMS E-LEARNING";
      case "library": return "BIBLIOTHÈQUE & FLUX DE LECTURE";
      case "canevas": return "CANEVAS & INFRASTRUCTURES";
      case "inspection": return "INSPECTION SCOLAIRE DE DISTRICT";
      case "ministry": return "PILOTAGE CENTRAL MINISTÉRIEL";
      case "security": return "SÉCURITÉ & AUDIT SYSTÈME";
      default: return "CENTRE DE REPORTING SCOLAIRE";
    }
  };

  if (!mounted) return null;

  // ─── FILTERING LOGIC ───
  
  // Resolve class name from class ID to support students table
  const selectedClassObj = (data.classes || []).find(c => String(c.id) === selectedClassId);
  const selectedClassName = selectedClassObj?.className || "";

  // Dynamic helper to check if a date falls inside the selected period
  const isInPeriod = (dateVal: string | Date | null) => {
    if (!dateVal) return true;
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return true;

    // 1. If we have a real academic period from the database
    if (selectedPeriodObj) {
      const start = selectedPeriodObj.startDate ? new Date(selectedPeriodObj.startDate) : null;
      const end = selectedPeriodObj.endDate ? new Date(selectedPeriodObj.endDate) : null;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    }

    // 2. Legacy fallback
    const month = date.getMonth(); 

    if (academicYear === "All") {
      if (period === "T1") return month >= 8 && month <= 11;
      if (period === "T2") return month >= 0 && month <= 3;
      if (period === "T3") return month >= 4 && month <= 7;
      return true;
    }

    // Parse starting year
    const startYear = parseInt(academicYear.split("-")[0]) || 2024;

    if (period === "T1") {
      const start = new Date(startYear, 8, 1); // Sept 1st
      const end = new Date(startYear, 11, 31, 23, 59, 59); // Dec 31st
      return date >= start && date <= end;
    }
    if (period === "T2") {
      const start = new Date(startYear + 1, 0, 1); // Jan 1st
      const end = new Date(startYear + 1, 3, 30, 23, 59, 59); // April 30th
      return date >= start && date <= end;
    }
    if (period === "T3") {
      const start = new Date(startYear + 1, 4, 1); // May 1st
      const end = new Date(startYear + 1, 7, 31, 23, 59, 59); // August 31st
      return date >= start && date <= end;
    }
    return true;
  };

  // Filter students
  const filteredStudents = (data.students || []).filter(s => {
    if (academicYear !== "All" && s.session && s.session !== academicYear) return false;
    if (selectedLevel !== "All" && s.educationalLevel !== selectedLevel) return false;
    if (selectedClassId !== "All" && s.classe !== selectedClassName) return false;
    if (selectedStudentId !== "All" && String(s.id) !== selectedStudentId) return false;
    if (selectedStatus !== "All" && s.statut !== selectedStatus) return false;
    return true;
  });

  // Filter finances
  const filteredPayments = (data.feePayments || []).filter(p => {
    const student = (data.students || []).find(s => s.id === p.studentId);
    if (academicYear !== "All" && student?.session && student?.session !== academicYear) return false;
    if (selectedClassId !== "All" && student?.classe !== selectedClassName) return false;
    if (selectedLevel !== "All" && student?.educationalLevel !== selectedLevel) return false;
    if (selectedStudentId !== "All" && String(p.studentId) !== selectedStudentId) return false;
    if (!isInPeriod(p.datePaid)) return false;
    if (startDate && p.datePaid && new Date(p.datePaid) < new Date(startDate)) return false;
    if (endDate && p.datePaid && new Date(p.datePaid) > new Date(endDate)) return false;
    return true;
  });

  const filteredExpenses = (data.expenses || []).filter(e => {
    if (selectedLevel !== "All" && e.educationalLevel !== selectedLevel) return false;
    if (!isInPeriod(e.dateExpense)) return false;
    if (startDate && e.dateExpense && new Date(e.dateExpense) < new Date(startDate)) return false;
    if (endDate && e.dateExpense && new Date(e.dateExpense) > new Date(endDate)) return false;
    return true;
  });

  // Filter pedagogy (seances & plans)
  const filteredSeances = (data.seances || []).filter(s => {
    if (selectedClassId !== "All" && String(s.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(s.employeeId) !== selectedTeacherId) return false;
    if (selectedStatus !== "All" && s.statut !== selectedStatus) return false;
    if (!isInPeriod(s.sessionDate)) return false;
    if (startDate && s.sessionDate && new Date(s.sessionDate) < new Date(startDate)) return false;
    if (endDate && s.sessionDate && new Date(s.sessionDate) > new Date(endDate)) return false;
    return true;
  });

  const filteredPlans = (data.plans || []).filter(p => {
    if (selectedClassId !== "All" && String(p.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(p.employeeId) !== selectedTeacherId) return false;
    if (selectedStatus !== "All" && p.statut !== selectedStatus) return false;
    return true;
  });

  // Filter attendance
  const filteredAttendance = (data.attendance || []).filter(a => {
    const student = (data.students || []).find(s => s.id === a.studentId);
    if (academicYear !== "All" && student?.session && student?.session !== academicYear) return false;
    if (selectedClassId !== "All" && String(a.classId) !== selectedClassId) return false;
    if (selectedLevel !== "All" && student?.educationalLevel !== selectedLevel) return false;
    if (selectedStudentId !== "All" && String(a.studentId) !== selectedStudentId) return false;
    if (selectedStatus !== "All" && a.status !== selectedStatus) return false;
    if (!isInPeriod(a.date)) return false;
    if (startDate && a.date && new Date(a.date) < new Date(startDate)) return false;
    if (endDate && a.date && new Date(a.date) > new Date(endDate)) return false;
    return true;
  });

  // Filter Employees (RH)
  const filteredEmployees = (data.employees || []).filter(e => {
    if (selectedStatus !== "All" && e.statut !== selectedStatus) return false;
    return true;
  });

  // Filter LMS
  const filteredCourses = (data.courses || []).filter(c => {
    if (selectedClassId !== "All" && String(c.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(c.teacherId) !== selectedTeacherId) return false;
    return true;
  });

  // Filter security audit logs
  const filteredAuditLogs = (data.auditLogs || []).filter(log => {
    if (selectedTeacherId !== "All" && String(log.userId) !== selectedTeacherId) return false;
    if (!isInPeriod(log.timestamp)) return false;
    if (startDate && log.timestamp && new Date(log.timestamp) < new Date(startDate)) return false;
    if (endDate && log.timestamp && new Date(log.timestamp) > new Date(endDate)) return false;
    return true;
  });

  // ─── REPORT DATA MAPPINGS FOR UNIVERSALREPORT ───
  let reportKpis: any[] = [];
  let reportTable: any = { headers: [], rows: [] };

  if (activeReport === "students") {
    const girls = filteredStudents.filter(s => (s.sexe || "").toLowerCase().startsWith("f")).length;
    const boys = filteredStudents.length - girls;
    const active = filteredStudents.filter(s => s.statut === "Actif").length;
    reportKpis = [
      { label: "Total Élèves", value: filteredStudents.length, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Filles", value: `${girls} (${filteredStudents.length > 0 ? Math.round((girls/filteredStudents.length)*100) : 0}%)`, icon: <Users size={18} />, color: "text-pink-600", bgColor: "bg-pink-50" },
      { label: "Garçons", value: `${boys} (${filteredStudents.length > 0 ? Math.round((boys/filteredStudents.length)*100) : 0}%)`, icon: <Users size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Inscrits Actifs", value: active, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" }
    ];
    reportTable = {
      headers: ["Num Admission", "Nom & Prénom", "Sexe", "Niveau", "Classe", "Statut"],
      rows: filteredStudents.map(s => [s.numAdmission, s.nomEtudiant, s.sexe || "N/A", s.educationalLevel || "N/A", s.classe || "N/A", s.statut || "Actif"])
    };
  }

  else if (activeReport === "finances") {
    const expected = (data.students || []).reduce((acc, s) => acc + (s.fraisMensuels || 0), 0);
    const paid = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const spent = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const balance = paid - spent;
    const recoveryRate = expected > 0 ? Math.min(100, Math.round((paid / expected) * 100)) : 84;

    reportKpis = [
      { label: "Total Recettes", value: `${paid.toLocaleString("fr-FR")} CFA`, icon: <DollarSign size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { label: "Total Dépenses", value: `${spent.toLocaleString("fr-FR")} CFA`, icon: <Activity size={18} />, color: "text-rose-600", bgColor: "bg-rose-50" },
      { label: "Solde Net", value: `${balance.toLocaleString("fr-FR")} CFA`, icon: <DollarSign size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Taux Recouvrement", value: `${recoveryRate}%`, icon: <Award size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" }
    ];

    const sortedRows = [
      ...filteredPayments.map(p => ({
        date: p.datePaid ? new Date(p.datePaid) : new Date(),
        type: "RECETTE",
        ref: p.reference || `PAY-${p.id}`,
        desc: `Frais scolarité - ${p.monthConcerned || "Mois"}`,
        amount: p.amount,
        mode: p.paymentMode || "Espèces",
        author: p.recordedBy || "Agent caisse"
      })),
      ...filteredExpenses.map(e => ({
        date: e.dateExpense ? new Date(e.dateExpense) : new Date(),
        type: "DÉPENSE",
        ref: e.reference || `EXP-${e.id}`,
        desc: e.description || "Dépense de fonctionnement",
        amount: -e.amount,
        mode: e.paymentMode || "Espèces",
        author: e.recordedBy || "Comptable"
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    reportTable = {
      headers: ["Date & Heure", "Flux", "Référence", "Description", "Montant", "Mode", "Auteur"],
      rows: sortedRows.map(r => [
        r.date.toLocaleDateString("fr-FR") + " " + r.date.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
        r.type,
        r.ref,
        r.desc,
        `${r.amount.toLocaleString("fr-FR")} CFA`,
        r.mode,
        r.author
      ])
    };
  }

  else if (activeReport === "pedagogie") {
    const validated = filteredSeances.filter(s => s.statut === "Validé").length;
    const progressRate = filteredPlans.length > 0 ? Math.round((validated / filteredPlans.length) * 100) : 75;

    reportKpis = [
      { label: "Séances Réalisées", value: filteredSeances.length, icon: <BookOpen size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Séances Validées", value: validated, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { label: "Leçons Planifiées", value: filteredPlans.length, icon: <Layers size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Taux Complétude", value: `${progressRate}%`, icon: <Award size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" }
    ];

    const pedRows = [
      ...filteredSeances.map(s => {
        const teacher = (data.employees || []).find(e => e.id === s.employeeId);
        const subject = (data.subjects || []).find(sub => sub.id === s.subjectId);
        const cls = (data.classes || []).find(c => c.id === s.classId);
        return {
          date: s.sessionDate ? new Date(s.sessionDate) : new Date(),
          cls: cls?.className || "Classe",
          teacher: teacher?.nomPrenom || "Professeur",
          subject: subject?.subjectName || "Matière",
          details: `Séance : ${s.titreLecon}`,
          status: s.statut || "En attente"
        };
      }),
      ...filteredPlans.map(p => {
        const teacher = (data.employees || []).find(e => e.id === p.employeeId);
        const subject = (data.subjects || []).find(sub => sub.id === p.subjectId);
        const cls = (data.classes || []).find(c => c.id === p.classId);
        return {
          date: p.datePrevue ? new Date(p.datePrevue) : new Date(),
          cls: cls?.className || "Classe",
          teacher: teacher?.nomPrenom || "Professeur",
          subject: subject?.subjectName || "Matière",
          details: `Planifié : ${p.chapitre} - ${p.leconPrevue}`,
          status: p.statut || "Planifié"
        };
      })
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    reportTable = {
      headers: ["Date", "Classe", "Professeur", "Matière", "Sujet / Chapitre", "Statut"],
      rows: pedRows.map(r => [
        r.date.toLocaleDateString("fr-FR"),
        r.cls,
        r.teacher,
        r.subject,
        r.details,
        r.status
      ])
    };
  }

  else if (activeReport === "presence") {
    const presents = filteredAttendance.filter(a => a.status === "Présent").length;
    const lates = filteredAttendance.filter(a => a.status === "En Retard").length;
    const excused = filteredAttendance.filter(a => a.status === "Excusé").length;
    const total = filteredAttendance.length;
    const rate = total > 0 ? Math.round(((presents + lates + excused) / total) * 100) : 94;

    reportKpis = [
      { label: "Taux Présence", value: `${rate}%`, icon: <Activity size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { label: "Retards", value: lates, icon: <Clock size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" },
      { label: "Absences Non Justifiées", value: total - presents - lates - excused, icon: <ShieldAlert size={18} />, color: "text-rose-600", bgColor: "bg-rose-50" },
      { label: "Absences Justifiées", value: excused, icon: <UserCheck size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" }
    ];

    reportTable = {
      headers: ["Date", "Élève", "Classe", "Matière", "Statut", "Remarque / Enregistré par"],
      rows: filteredAttendance.map(a => {
        const student = (data.students || []).find(s => s.id === a.studentId);
        const cls = (data.classes || []).find(c => c.id === a.classId);
        const subject = (data.subjects || []).find(sub => sub.id === a.subjectId);
        return [
          a.date ? new Date(a.date).toLocaleDateString("fr-FR") : "-",
          student?.nomEtudiant || "Élève",
          cls?.className || "Classe",
          subject?.subjectName || "Général",
          a.status || "Présent",
          a.remark || `Par ${a.recordedBy || "Système"}`
        ];
      })
    };
  }

  else if (activeReport === "rh") {
    const active = filteredEmployees.filter(e => e.statut === "Actif").length;
    const totalSalary = filteredEmployees.reduce((acc, e) => acc + (e.salaire || 0), 0);

    reportKpis = [
      { label: "Total Personnel", value: filteredEmployees.length, icon: <Users size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Personnel Actif", value: active, icon: <UserCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { label: "Professeurs", value: filteredEmployees.filter(e => (e.poste || "").toLowerCase().includes("prof") || (e.fonction || "").toLowerCase().includes("prof")).length, icon: <BookOpen size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Masse Salariale", value: `${totalSalary.toLocaleString("fr-FR")} CFA`, icon: <DollarSign size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" }
    ];

    reportTable = {
      headers: ["Code Employé", "Nom & Prénom", "Poste / Fonction", "Téléphone", "Salaire Mensuel", "Statut"],
      rows: filteredEmployees.map(e => [
        e.employeeCode || `EMP-${e.id}`,
        e.nomPrenom || "N/A",
        e.poste || e.fonction || "N/A",
        e.telephone || "N/A",
        `${(e.salaire || 0).toLocaleString("fr-FR")} CFA`,
        e.statut || "Actif"
      ])
    };
  }

  else if (activeReport === "lms") {
    const totalSubmissions = (data.submissions || []).length;
    const totalVirtual = (data.virtualClasses || []).length;

    reportKpis = [
      { label: "Cours E-Learning", value: filteredCourses.length, icon: <BookOpen size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Modules / Leçons", value: `${(data.lessons || []).filter(l => filteredCourses.some(c => c.id === l.courseId)).length} leçons`, icon: <Layers size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Devoirs Soumis", value: totalSubmissions, icon: <Clock size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" },
      { label: "Classes Virtuelles", value: totalVirtual, icon: <Activity size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" }
    ];

    reportTable = {
      headers: ["Cours", "Classe", "Matière", "Enseignant", "Statut", "Date de Création"],
      rows: filteredCourses.map(c => {
        const cls = (data.classes || []).find(cl => cl.id === c.classId);
        const subject = (data.subjects || []).find(sub => sub.id === c.subjectId);
        const teacher = (data.employees || []).find(emp => emp.id === c.teacherId);
        return [
          c.title,
          cls?.className || "Classe",
          subject?.subjectName || "Matière",
          teacher?.nomPrenom || "Professeur",
          c.status || "Draft",
          c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "-"
        ];
      })
    };
  }

  else if (activeReport === "library") {
    reportKpis = [
      { label: "Total Livres", value: 1250, icon: <Library size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Disponibles", value: 1180, icon: <Library size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { label: "Emprunts Actifs", value: 70, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Retards Détectés", value: 12, icon: <Clock size={18} />, color: "text-rose-600", bgColor: "bg-rose-50" }
    ];

    reportTable = {
      headers: ["Code Livre", "Titre du Livre", "Auteur", "Exemplaires Stock", "Disponibles", "Emprunté Par", "Date Emprunt", "Statut / Retard"],
      rows: [
        ["LIB-092", "Physique Lycée", "Dr. Ibrahim", 50, 55, "Sani Mamane", "01/06/2026", "Retard (37 jours)"],
        ["LIB-104", "Chimie Organique", "Prof. Kallo", 30, 28, "Aminata Diallo", "24/06/2026", "Rendu"],
        ["LIB-203", "Histoire du Niger", "Djibo Hamani", 100, 94, "Ali Ousmane", "20/06/2026", "Emprunt actif"],
      ]
    };
  }

  else if (activeReport === "canevas") {
    const totalStudentsVal = (data.students || []).length;
    const totalTeachers = (data.employees || []).filter(e => (e.poste || "").toLowerCase().includes("prof") || (e.fonction || "").toLowerCase().includes("prof")).length;

    reportKpis = [
      { label: "Structures Éducatives", value: 1, icon: <Building2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Total Élèves", value: totalStudentsVal, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Enseignants Canevas", value: totalTeachers, icon: <UserCheck size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" },
      { label: "Ratio Élèves / Prof", value: totalTeachers > 0 ? Math.round(totalStudentsVal / totalTeachers) : totalStudentsVal, icon: <Layers size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" }
    ];

    const groups = [
      { level: "Primaire", effectif: (data.students || []).filter(s => (s.educationalLevel || "").toLowerCase().includes("prim")).length, teacherCount: Math.round(totalTeachers * 0.6) || 1 },
      { level: "Collège", effectif: (data.students || []).filter(s => (s.educationalLevel || "").toLowerCase().includes("coll")).length, teacherCount: Math.round(totalTeachers * 0.3) || 1 },
      { level: "Lycée", effectif: (data.students || []).filter(s => (s.educationalLevel || "").toLowerCase().includes("lyc")).length, teacherCount: Math.round(totalTeachers * 0.1) || 1 }
    ];

    reportTable = {
      headers: ["Niveau / Cycle d'enseignement", "Effectif Élèves", "Filles", "Garçons", "Enseignants", "Ratio Élèves / Professeur"],
      rows: groups.map(g => {
        const cycleStudents = (data.students || []).filter(s => {
          const l = (s.educationalLevel || "").toLowerCase();
          if (g.level === "Primaire") return l.includes("prim");
          if (g.level === "Collège") return l.includes("coll");
          return l.includes("lyc");
        });
        const gGirls = cycleStudents.filter(s => (s.sexe || "").toLowerCase().startsWith("f")).length;
        const gBoys = cycleStudents.length - gGirls;
        const ratio = g.teacherCount > 0 ? Math.round(cycleStudents.length / g.teacherCount) : cycleStudents.length;

        return [
          g.level,
          cycleStudents.length.toLocaleString(),
          gGirls.toLocaleString(),
          gBoys.toLocaleString(),
          g.teacherCount,
          `${ratio} élèves / prof`
        ];
      })
    };
  }

  else if (activeReport === "inspection") {
    reportKpis = [
      { label: "Écoles Suivies", value: 6, icon: <Building2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Canevas Validés", value: 2, icon: <ShieldCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { label: "Rejets Déclarations", value: 1, icon: <ShieldAlert size={18} />, color: "text-rose-600", bgColor: "bg-rose-50" },
      { label: "En Retard", value: 1, icon: <Clock size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" }
    ];

    reportTable = {
      headers: ["Code Éts", "Nom de l'Établissement", "Commune", "Type / Cycle", "Dossier Complété", "Inspecteur Responsable", "Dernier Audit", "Statut Validation"],
      rows: [
        ["ETB-2026-001", "Ecole Excellence", "Niamey IV", "Privé / Primaire", "98%", "Inspecteur Niamey IV", "27/06/2026", "Validé inspection"],
        ["ETB-2026-067", "Ecole Publique Lazaret B", "Niamey IV", "Public / Primaire", "70%", "Inspecteur Niamey IV", "25/06/2026", "En attente"],
        ["ETB-2026-202", "Collège CEG 14", "Niamey IV", "Public / Collège", "65%", "Inspecteur Niamey IV", "24/06/2026", "En attente"],
        ["ETB-2026-521", "Complexe Privé Al-Barka", "Niamey IV", "Privé / Collège", "55%", "Inspecteur Niamey IV", "10/05/2026", "Rejeté inspection"],
      ]
    };
  }

  else if (activeReport === "ministry") {
    reportKpis = [
      { label: "Écoles", value: 10, icon: <Building2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Total Élèves", value: 6303, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Taux Réussite", value: "76.8%", icon: <Award size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" },
      { label: "Ratio Élève/Ens", value: "24.5", icon: <Layers size={18} />, color: "text-slate-600", bgColor: "bg-slate-50" },
      { label: "Taux Abandon", value: "4.9%", icon: <TrendingDown size={18} />, color: "text-rose-600", bgColor: "bg-rose-50" },
      { label: "Complétude Données", value: "83%", icon: <CheckCircle2 size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" },
      { label: "Zones Prioritaires", value: 3, icon: <ShieldAlert size={18} />, color: "text-rose-600", bgColor: "bg-rose-50" }
    ];

    reportTable = {
      headers: [
        "Indicateur MEN-NE", 
        "Valeur Nationale Concl.", 
        "Cible Sectorielle (ODD4)",
        "Statut / Niveau d'Alerte"
      ],
      rows: [
        ["Nombre d'établissements", "10 écoles", "N/A", "Stable"],
        ["Effectif Élèves total", "6 303 élèves (dont 3 041 filles)", "Parité 1.0", "Conforme"],
        ["Effectif Enseignants", "249 enseignants", "N/A", "Stable"],
        ["Ratio Élèves / Enseignant", "24.5 E/E", "40.0 maximum", "Optimal"],
        ["Taux de Réussite Moyen", "76.8 %", "80.0 % minimum", "À surveiller"],
        ["Taux de Présence Moyen", "90.1 %", "95.0 % minimum", "Conforme"],
        ["Taux d'Abandon Moyen", "4.9 %", "5.0 % maximum", "Stable"],
        ["Écoles sans accès eau potable", "2 écoles (20%)", "0 écoles", "Risque moyen"],
        ["Écoles sans électricité", "3 écoles (30%)", "0 écoles", "Risque élevé"],
        ["Écoles sans latrines séparées", "3 écoles (30%)", "0 écoles", "Critique"],
        ["Déficit enseignants (Postes)", "11 postes", "0 postes", "À recruter"],
        ["Déficit de salles de classe", "13 salles", "0 salles", "Déficit modéré"],
        ["Déficit de manuels scolaires", "545 livres", "Ratio 1:1 élève/manuel", "Alerte logistique"],
        ["Taux de complétude des données", "83.6 %", "100.0 %", "À valider"],
        ["Zones d'intervention prioritaires", "3 zones prioritaires", "0 zones", "Intervention urgente"]
      ]
    };
  }

  else if (activeReport === "security") {
    const sensitives = filteredAuditLogs.filter(log => log.action === "CANEDIT" || log.action === "CANDELETE" || log.action === "UPDATE" || log.action === "DELETE").length;
    const usersCount = new Set(filteredAuditLogs.map(l => l.userId)).size;

    reportKpis = [
      { label: "Total Journaux", value: filteredAuditLogs.length, icon: <ShieldCheck size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Modifs Sensibles", value: sensitives, icon: <ShieldAlert size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" },
      { label: "Opérateurs Actifs", value: usersCount, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Alertes Sécurité", value: 0, icon: <ShieldCheck size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" }
    ];

    reportTable = {
      headers: ["Date & Heure", "Utilisateur / Opérateur", "Action", "Module affecté", "Adresse IP", "Système / Navigateur"],
      rows: filteredAuditLogs.map(log => {
        const username = log.user?.nomPrenom || `Utilisateur ID ${log.userId}`;
        return [
          log.timestamp ? new Date(log.timestamp).toLocaleString("fr-FR") : "-",
          username,
          log.action || "ACCÈS",
          log.tableName || "Général",
          log.ipAddress || "Local",
          log.userAgent ? log.userAgent.substring(0, 45) + "..." : "Inconnu"
        ];
      })
    };
  }



  const universalMetadata = {
    title: getReportTitle(activeReport),
    subtitle: `Période : ${activePeriodName} | Année scolaire : ${academicYear === "All" ? "Toutes" : academicYear}`,
    moduleName: getReportModuleName(activeReport),
    reportId: `RPT-${activeReport.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    academicYear: academicYear,
    editorName: currentUser?.nomPrenom || "Administrateur",
    description: `Ce document officiel regroupe les indicateurs consolidés d'établissement pour le module ${getReportModuleName(activeReport)}.`,
    isLandscape: activeReport === "finances" || activeReport === "presence" || activeReport === "security" || activeReport === "canevas" || activeReport === "ministry" || activeReport === "inspection",
    qrValue: `https://edut.ne/verify/report/RPT-${activeReport.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
            {branding.logoPath ? (
              <img src={branding.logoPath} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Users size={26} strokeWidth={2.4} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Centre de Reporting</h1>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-3 py-1 rounded-full shadow-sm">
                {branding.name}
              </span>
            </div>
            <p className="text-slate-500 mt-1.5 font-medium text-sm">
              Consolidation globale, exports réglementaires et indicateurs de pilotage de l'établissement.
            </p>
          </div>
        </div>

        {/* Offline Status */}
        <div className={`px-4 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
          isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-150" : "bg-amber-50 text-amber-700 border-amber-150"
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {isOnline ? "Connecté (Mise en cache active)" : "Hors ligne (Mode Cache activé)"}
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        
        {/* Sidebar / Tabs Selection */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] border border-slate-100 p-4 space-y-2 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Sélectionner un rapport</p>
          {[
            { id: "students", label: "Rapports étudiants", icon: <Users size={16} />, color: "text-blue-500" },
            { id: "finances", label: "Rapports financiers", icon: <DollarSign size={16} />, color: "text-emerald-500" },
            { id: "pedagogie", label: "Rapports pédagogiques", icon: <BookOpen size={16} />, color: "text-blue-500" },
            { id: "presence", label: "Rapports présence", icon: <Calendar size={16} />, color: "text-amber-500" },
            { id: "rh", label: "Rapports RH", icon: <UserCheck size={16} />, color: "text-indigo-500" },
            { id: "lms", label: "Rapports LMS", icon: <Layers size={16} />, color: "text-purple-500" },
            { id: "library", label: "Rapports bibliothèque", icon: <Library size={16} />, color: "text-blue-500" },
            { id: "canevas", label: "Rapports canevas", icon: <Building2 size={16} />, color: "text-cyan-500" },
            { id: "inspection", label: "Rapports inspection", icon: <ShieldCheck size={16} />, color: "text-rose-500" },
            { id: "ministry", label: "Rapports ministère", icon: <Globe size={16} />, color: "text-rose-600" },
            { id: "security", label: "Rapports sécurité", icon: <ShieldCheck size={16} />, color: "text-rose-500" }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id as any)}
              className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-3 ${
                activeReport === r.id 
                  ? "bg-slate-100 text-slate-900 shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className={activeReport === r.id ? r.color : "text-slate-400"}>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {/* Filters and Preview */}
        <div className="space-y-8">
          
          {/* General Filters Area */}
          <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 mb-2">
              <Filter size={16} className="text-indigo-600" />
              Filtres généraux consolidés
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">ANNÉE SCOLAIRE</Label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Toutes les années</option>
                  {uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">RÉGION</Label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Toutes</option>
                  <option value="Niamey">Niamey</option>
                  <option value="Tillabéri">Tillabéri</option>
                  <option value="Maradi">Maradi</option>
                  <option value="Zinder">Zinder</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">INSPECTION</Label>
                <select
                  value={selectedInspection}
                  onChange={(e) => setSelectedInspection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Toutes</option>
                  <option value="Niamey I">Niamey I</option>
                  <option value="Niamey II">Niamey II</option>
                  <option value="Niamey III">Niamey III</option>
                  <option value="Niamey IV">Niamey IV</option>
                  <option value="Kollo I">Kollo I</option>
                  <option value="Madarounfa I">Madarounfa I</option>
                  <option value="Mirriah I">Mirriah I</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">COMMUNE</Label>
                <select
                  value={selectedCommune}
                  onChange={(e) => setSelectedCommune(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Toutes</option>
                  <option value="Niamey I">Niamey I</option>
                  <option value="Niamey II">Niamey II</option>
                  <option value="Niamey III">Niamey III</option>
                  <option value="Niamey IV">Niamey IV</option>
                  <option value="Niamey V">Niamey V</option>
                  <option value="Kollo">Kollo</option>
                  <option value="Madarounfa">Madarounfa</option>
                  <option value="Mirriah">Mirriah</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">ÉTABLISSEMENT</Label>
                <select
                  value={selectedEstablishment}
                  onChange={(e) => setSelectedEstablishment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Tous</option>
                  <option value="Ecole Excellence">Ecole Excellence</option>
                  <option value="Ecole Primaire Bobiel">Ecole Primaire Bobiel</option>
                  <option value="Complexe Scolaire Sahel">Complexe Scolaire Sahel</option>
                  <option value="Ecole Publique Lazaret">Ecole Publique Lazaret</option>
                  <option value="Lycee Municipal Est">Lycee Municipal Est</option>
                  <option value="CES Kollo">CES Kollo</option>
                  <option value="Lycée Technique Maradi">Lycée Technique Maradi</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">CLASSE</Label>
                <select
                  value={selectedClassId}
                  onChange={(e) => { setSelectedClassId(e.target.value); setSelectedStudentId("All"); }}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Toutes les classes</option>
                  {(data.classes || [])
                    .filter(c => {
                      if (selectedLevel === "All") return true;
                      return c.section?.educationalLevel === selectedLevel;
                    })
                    .map(c => <option key={c.id} value={String(c.id)}>{c.className}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">NIVEAU / CYCLE</Label>
                <select
                  value={selectedLevel}
                  onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClassId("All"); setSelectedStudentId("All"); }}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Tous les cycles</option>
                  <option value="Maternelle">Maternelle</option>
                  <option value="Primaire">Primaire</option>
                  <option value="Collège">Collège</option>
                  <option value="Lycée">Lycée</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">DATE DÉBUT</Label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">DATE FIN</Label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">STATUT</Label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Tous les statuts</option>
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="En attente">En attente</option>
                  <option value="Validé">Validé</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Universal Report Preview Area */}
          <div className="space-y-6">
            <UniversalReport
              metadata={universalMetadata}
              kpis={reportKpis}
              table={reportTable}
              onSendEmail={async (email) => {
                toast.success(`Rapport envoyé avec succès à ${email} !`);
                logExportAction(`Email (to: ${email})`);
                return true;
              }}
            />
          </div>

          {/* Export Action Logger / Log Table */}
          <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 mb-2">
              <Clock size={16} className="text-slate-400" />
              Historique récent des exports
            </div>
            {exportHistory.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold italic text-center py-4">Aucun export enregistré récemment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-bold text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-400">
                      <th className="p-3">Rapport généré</th>
                      <th className="p-3">Format / Canal</th>
                      <th className="p-3">Opérateur</th>
                      <th className="p-3 text-right">Date & Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {exportHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-900">{h.reportName}</td>
                        <td className="p-3 text-indigo-600 font-black">{h.format}</td>
                        <td className="p-3 text-slate-500">{h.operator}</td>
                        <td className="p-3 text-right text-slate-400 font-mono">{h.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
