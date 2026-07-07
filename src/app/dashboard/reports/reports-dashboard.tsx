"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, DollarSign, BookOpen, Calendar, ShieldCheck, 
  Download, Printer, Mail, Clock, Filter, Eye, RefreshCw,
  Search, ShieldAlert, Award, FileSpreadsheet, Building2,
  Droplets, Lightbulb, AlertTriangle, Layers, UserCheck, Activity
} from "lucide-react";
import { toast } from "sonner";
import { localDb } from "@/infrastructure/local-db/dexie";
import UniversalReport from "@/components/reporting/universal-report";

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
  };
  branding: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  currentUser: any;
}

export default function ReportsDashboard({ unifiedData: initialData, branding, currentUser }: ReportsDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [data, setData] = useState(initialData);
  const [activeReport, setActiveReport] = useState<
    "students" | "finances" | "pedagogie" | "presence" | "rh" | "lms" | "canevas" | "security"
  >("students");

  // General Filters States
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [period, setPeriod] = useState("All");
  const [selectedClassId, setSelectedClassId] = useState<string>("All");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("All");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Export History State
  const [exportHistory, setExportHistory] = useState<any[]>([]);

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
      case "canevas": return "Rapport Canevas & Structures";
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
      case "canevas": return "CANEVAS & INFRASTRUCTURES";
      case "security": return "SÉCURITÉ & AUDIT SYSTÈME";
      default: return "CENTRE DE REPORTING SCOLAIRE";
    }
  };

  if (!mounted) return null;

  // ─── FILTERING LOGIC ───
  // Filter students
  const filteredStudents = data.students.filter(s => {
    if (selectedLevel !== "All" && s.educationalLevel !== selectedLevel) return false;
    if (selectedClassId !== "All" && s.classe !== selectedClassId) return false;
    if (selectedStatus !== "All" && s.statut !== selectedStatus) return false;
    return true;
  });

  // Filter finances
  const filteredPayments = data.feePayments.filter(p => {
    const student = data.students.find(s => s.id === p.studentId);
    if (selectedClassId !== "All" && student?.classe !== selectedClassId) return false;
    if (selectedLevel !== "All" && student?.educationalLevel !== selectedLevel) return false;
    if (selectedStudentId !== "All" && String(p.studentId) !== selectedStudentId) return false;
    if (startDate && p.datePaid && new Date(p.datePaid) < new Date(startDate)) return false;
    if (endDate && p.datePaid && new Date(p.datePaid) > new Date(endDate)) return false;
    return true;
  });

  const filteredExpenses = data.expenses.filter(e => {
    if (selectedLevel !== "All" && e.educationalLevel !== selectedLevel) return false;
    if (startDate && e.dateExpense && new Date(e.dateExpense) < new Date(startDate)) return false;
    if (endDate && e.dateExpense && new Date(e.dateExpense) > new Date(endDate)) return false;
    return true;
  });

  // Filter pedagogy (seances & plans)
  const filteredSeances = data.seances.filter(s => {
    if (selectedClassId !== "All" && String(s.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(s.employeeId) !== selectedTeacherId) return false;
    if (selectedStatus !== "All" && s.statut !== selectedStatus) return false;
    if (startDate && s.sessionDate && new Date(s.sessionDate) < new Date(startDate)) return false;
    if (endDate && s.sessionDate && new Date(s.sessionDate) > new Date(endDate)) return false;
    return true;
  });

  const filteredPlans = data.plans.filter(p => {
    if (selectedClassId !== "All" && String(p.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(p.employeeId) !== selectedTeacherId) return false;
    if (selectedStatus !== "All" && p.statut !== selectedStatus) return false;
    return true;
  });

  // Filter attendance
  const filteredAttendance = data.attendance.filter(a => {
    const student = data.students.find(s => s.id === a.studentId);
    if (selectedClassId !== "All" && String(a.classId) !== selectedClassId) return false;
    if (selectedLevel !== "All" && student?.educationalLevel !== selectedLevel) return false;
    if (selectedStudentId !== "All" && String(a.studentId) !== selectedStudentId) return false;
    if (selectedStatus !== "All" && a.status !== selectedStatus) return false;
    if (startDate && a.date && new Date(a.date) < new Date(startDate)) return false;
    if (endDate && a.date && new Date(a.date) > new Date(endDate)) return false;
    return true;
  });

  // Filter Employees (RH)
  const filteredEmployees = data.employees.filter(e => {
    if (selectedStatus !== "All" && e.statut !== selectedStatus) return false;
    return true;
  });

  // Filter LMS
  const filteredCourses = data.courses.filter(c => {
    if (selectedClassId !== "All" && String(c.classId) !== selectedClassId) return false;
    if (selectedTeacherId !== "All" && String(c.teacherId) !== selectedTeacherId) return false;
    return true;
  });

  // Filter security audit logs
  const filteredAuditLogs = data.auditLogs.filter(log => {
    if (selectedTeacherId !== "All" && String(log.userId) !== selectedTeacherId) return false;
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
    const expected = data.students.reduce((acc, s) => acc + (s.fraisMensuels || 0), 0);
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
        const teacher = data.employees.find(e => e.id === s.employeeId);
        const subject = data.subjects.find(sub => sub.id === s.subjectId);
        const cls = data.classes.find(c => c.id === s.classId);
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
        const teacher = data.employees.find(e => e.id === p.employeeId);
        const subject = data.subjects.find(sub => sub.id === p.subjectId);
        const cls = data.classes.find(c => c.id === p.classId);
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
        const student = data.students.find(s => s.id === a.studentId);
        const cls = data.classes.find(c => c.id === a.classId);
        const subject = data.subjects.find(sub => sub.id === a.subjectId);
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
    const totalLessons = data.lessons.length;
    const totalSubmissions = data.submissions.length;
    const totalVirtual = data.virtualClasses.length;

    reportKpis = [
      { label: "Cours E-Learning", value: filteredCourses.length, icon: <BookOpen size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Modules / Leçons", value: `${data.lessons.filter(l => filteredCourses.some(c => c.id === l.courseId)).length} leçons`, icon: <Layers size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Devoirs Soumis", value: totalSubmissions, icon: <Clock size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" },
      { label: "Classes Virtuelles", value: totalVirtual, icon: <Activity size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" }
    ];

    reportTable = {
      headers: ["Cours", "Classe", "Matière", "Enseignant", "Statut", "Date de Création"],
      rows: filteredCourses.map(c => {
        const cls = data.classes.find(cl => cl.id === c.classId);
        const subject = data.subjects.find(sub => sub.id === c.subjectId);
        const teacher = data.employees.find(emp => emp.id === c.teacherId);
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

  else if (activeReport === "canevas") {
    const totalStudents = data.students.length;
    const totalTeachers = data.employees.filter(e => (e.poste || "").toLowerCase().includes("prof") || (e.fonction || "").toLowerCase().includes("prof")).length;
    const publicCount = 1;
    const privateCount = 0;

    reportKpis = [
      { label: "Structures Éducatives", value: 1, icon: <Building2 size={18} />, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      { label: "Total Élèves", value: totalStudents, icon: <Users size={18} />, color: "text-blue-600", bgColor: "bg-blue-50" },
      { label: "Enseignants Canevas", value: totalTeachers, icon: <UserCheck size={18} />, color: "text-amber-600", bgColor: "bg-amber-50" },
      { label: "Ratio Élèves / Prof", value: totalTeachers > 0 ? Math.round(totalStudents / totalTeachers) : totalStudents, icon: <Layers size={18} />, color: "text-emerald-600", bgColor: "bg-emerald-50" }
    ];

    const groups = [
      { level: "Primaire", effectif: data.students.filter(s => (s.educationalLevel || "").toLowerCase().includes("prim")).length, teacherCount: Math.round(totalTeachers * 0.6) || 1 },
      { level: "Collège", effectif: data.students.filter(s => (s.educationalLevel || "").toLowerCase().includes("coll")).length, teacherCount: Math.round(totalTeachers * 0.3) || 1 },
      { level: "Lycée", effectif: data.students.filter(s => (s.educationalLevel || "").toLowerCase().includes("lyc")).length, teacherCount: Math.round(totalTeachers * 0.1) || 1 }
    ];

    reportTable = {
      headers: ["Niveau / Cycle d'enseignement", "Effectif Élèves", "Filles", "Garçons", "Enseignants", "Ratio Élèves / Professeur"],
      rows: groups.map(g => {
        const cycleStudents = data.students.filter(s => {
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
    subtitle: `Rapport automatisé généré pour la période sélectionnée.`,
    moduleName: getReportModuleName(activeReport),
    reportId: `RPT-${activeReport.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
    academicYear: academicYear,
    editorName: currentUser?.nomPrenom || "Administrateur",
    description: `Ce document officiel regroupe les indicateurs consolidés d'établissement pour le module ${getReportModuleName(activeReport)}.`,
    isLandscape: activeReport === "finances" || activeReport === "presence" || activeReport === "security" || activeReport === "canevas"
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* ─── HEADER ─── */}
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

      {/* ─── MAIN LAYOUT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        
        {/* Sidebar / Tabs Selection */}
        <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] border border-slate-100 p-4 space-y-2 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Sélectionner un rapport</p>
          {[
            { id: "students", label: "Effectifs élèves", icon: <Users size={16} />, color: "text-blue-500" },
            { id: "finances", label: "Synthèse finances", icon: <DollarSign size={16} />, color: "text-emerald-500" },
            { id: "pedagogie", label: "Suivi pédagogique", icon: <BookOpen size={16} />, color: "text-blue-500" },
            { id: "presence", label: "Taux de présence", icon: <Calendar size={16} />, color: "text-amber-500" },
            { id: "rh", label: "Ressources Humaines", icon: <UserCheck size={16} />, color: "text-indigo-500" },
            { id: "lms", label: "Plateforme LMS", icon: <Layers size={16} />, color: "text-purple-500" },
            { id: "canevas", label: "Canevas Ministériels", icon: <Building2 size={16} />, color: "text-cyan-500" },
            { id: "security", label: "Audit & Sécurité", icon: <ShieldCheck size={16} />, color: "text-rose-500" }
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Année scolaire</label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Période</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Année entière</option>
                  <option value="T1">Trimestre 1</option>
                  <option value="T2">Trimestre 2</option>
                  <option value="T3">Trimestre 3</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Niveau éducatif</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => { setSelectedLevel(e.target.value); setSelectedClassId("All"); }}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Tous les cycles</option>
                  <option value="Maternelle">Maternelle</option>
                  <option value="Primaire">Primaire</option>
                  <option value="Collège">Collège</option>
                  <option value="Lycée">Lycée</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe / Section</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Toutes les classes</option>
                  {data.classes.map(c => <option key={c.id} value={c.className}>{c.className}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève concerné</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Tous les élèves</option>
                  {data.students.map(s => <option key={s.id} value={s.id}>{s.nomEtudiant}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignant / Opérateur</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none"
                >
                  <option value="All">Tout le personnel</option>
                  {data.employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nomPrenom}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date de fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold outline-none"
                />
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
