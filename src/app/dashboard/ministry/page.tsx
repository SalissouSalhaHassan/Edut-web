"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Upload,
  Users,
  Trash2,
  X,
  Droplets,
  Lightbulb,
  Check,
  Info,
  FileText,
  FileSpreadsheet,
  Globe,
  Award,
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Layers,
  BookOpen,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { getSessions } from "@/domains/academics/actions/academics.actions";

interface SchoolData {
  code: string;
  name: string;
  type: "Public" | "Privé";
  cycle: "Préscolaire" | "Primaire" | "Collège" | "Lycée";
  region: string;
  department: string;
  inspection: string;
  commune: string;
  eleves: number;
  filles: number;
  garcons: number;
  enseignants: number;
  salles: number;
  eau: boolean;
  electricite: boolean;
  latrines: boolean;
  manqueEnseignants: number;
  manqueSalles: number;
  manqueLivres: number;
  abandonRate: number;
  completion: number; // 0 to 100
  lastDeclaration: string; // YYYY-MM-DD
  successRate: number; // 0 to 100
  attendanceRate: number; // 0 to 100
  status: "Valide" | "À vérifier" | "Incomplet";
}

const initialSchools: SchoolData[] = [
  {
    code: "ETB-2026-001",
    name: "Ecole Excellence",
    type: "Privé",
    cycle: "Primaire",
    region: "Niamey",
    department: "Niamey",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 642,
    filles: 318,
    garcons: 324,
    enseignants: 24,
    salles: 18,
    eau: true,
    electricite: true,
    latrines: true,
    manqueEnseignants: 0,
    manqueSalles: 0,
    manqueLivres: 10,
    abandonRate: 1.2,
    completion: 98,
    lastDeclaration: "2026-06-27",
    successRate: 88.5,
    attendanceRate: 95.2,
    status: "Valide",
  },
  {
    code: "ETB-2026-018",
    name: "Ecole Primaire Bobiel",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    department: "Niamey",
    inspection: "Niamey I",
    commune: "Niamey I",
    eleves: 481,
    filles: 236,
    garcons: 245,
    enseignants: 16,
    salles: 12,
    eau: false,
    electricite: true,
    latrines: false,
    manqueEnseignants: 3,
    manqueSalles: 2,
    manqueLivres: 85,
    abandonRate: 8.2,
    completion: 76,
    lastDeclaration: "2026-06-26",
    successRate: 64.2,
    attendanceRate: 88.4,
    status: "À vérifier",
  },
  {
    code: "ETB-2026-043",
    name: "Complexe Scolaire Sahel",
    type: "Privé",
    cycle: "Collège",
    region: "Niamey",
    department: "Niamey",
    inspection: "Niamey II",
    commune: "Niamey II",
    eleves: 934,
    filles: 452,
    garcons: 482,
    enseignants: 41,
    salles: 26,
    eau: true,
    electricite: true,
    latrines: true,
    manqueEnseignants: 0,
    manqueSalles: 0,
    manqueLivres: 0,
    abandonRate: 2.1,
    completion: 94,
    lastDeclaration: "2026-06-25",
    successRate: 82.1,
    attendanceRate: 91.8,
    status: "Valide",
  },
  {
    code: "ETB-2026-067",
    name: "Ecole Publique Lazaret",
    type: "Public",
    cycle: "Primaire",
    region: "Niamey",
    department: "Niamey",
    inspection: "Niamey III",
    commune: "Niamey III",
    eleves: 388,
    filles: 190,
    garcons: 198,
    enseignants: 13,
    salles: 9,
    eau: true,
    electricite: false,
    latrines: true,
    manqueEnseignants: 1,
    manqueSalles: 3,
    manqueLivres: 120,
    abandonRate: 5.4,
    completion: 61,
    lastDeclaration: "2026-06-24",
    successRate: 59.8,
    attendanceRate: 85.0,
    status: "Incomplet",
  },
  {
    code: "ETB-2026-104",
    name: "Lycee Municipal Est",
    type: "Public",
    cycle: "Lycée",
    region: "Niamey",
    department: "Niamey",
    inspection: "Niamey V",
    commune: "Niamey V",
    eleves: 1218,
    filles: 593,
    garcons: 625,
    enseignants: 58,
    salles: 34,
    eau: true,
    electricite: true,
    latrines: true,
    manqueEnseignants: 0,
    manqueSalles: 1,
    manqueLivres: 40,
    abandonRate: 3.8,
    completion: 91,
    lastDeclaration: "2026-06-22",
    successRate: 74.5,
    attendanceRate: 89.2,
    status: "Valide",
  },
  {
    code: "ETB-2026-202",
    name: "CES Kollo",
    type: "Public",
    cycle: "Collège",
    region: "Tillabéri",
    department: "Kollo",
    inspection: "Kollo I",
    commune: "Kollo",
    eleves: 540,
    filles: 250,
    garcons: 290,
    enseignants: 18,
    salles: 14,
    eau: true,
    electricite: false,
    latrines: false,
    manqueEnseignants: 2,
    manqueSalles: 4,
    manqueLivres: 95,
    abandonRate: 9.6,
    completion: 85,
    lastDeclaration: "2026-05-15", // Late
    successRate: 61.2,
    attendanceRate: 84.1,
    status: "À vérifier",
  },
  {
    code: "ETB-2026-305",
    name: "Lycée Technique Maradi",
    type: "Public",
    cycle: "Lycée",
    region: "Maradi",
    department: "Madarounfa",
    inspection: "Madarounfa I",
    commune: "Madarounfa",
    eleves: 710,
    filles: 310,
    garcons: 400,
    enseignants: 32,
    salles: 20,
    eau: false,
    electricite: false,
    latrines: false,
    manqueEnseignants: 5,
    manqueSalles: 4,
    manqueLivres: 150,
    abandonRate: 12.4,
    completion: 55,
    lastDeclaration: "2026-06-18",
    successRate: 54.3,
    attendanceRate: 81.5,
    status: "Incomplet",
  },
  {
    code: "ETB-2026-412",
    name: "Ecole Privée Franco-Arabe Nour",
    type: "Privé",
    cycle: "Primaire",
    region: "Zinder",
    department: "Mirriah",
    inspection: "Mirriah I",
    commune: "Mirriah",
    eleves: 320,
    filles: 170,
    garcons: 150,
    enseignants: 12,
    salles: 8,
    eau: true,
    electricite: true,
    latrines: true,
    manqueEnseignants: 0,
    manqueSalles: 0,
    manqueLivres: 15,
    abandonRate: 0.8,
    completion: 97,
    lastDeclaration: "2026-06-28",
    successRate: 91.0,
    attendanceRate: 96.8,
    status: "Valide",
  },
  {
    code: "ETB-2026-521",
    name: "Complexe Scolaire Dan Kassmy",
    type: "Privé",
    cycle: "Lycée",
    region: "Maradi",
    department: "Madarounfa",
    inspection: "Madarounfa I",
    commune: "Madarounfa",
    eleves: 890,
    filles: 430,
    garcons: 460,
    enseignants: 45,
    salles: 28,
    eau: true,
    electricite: true,
    latrines: true,
    manqueEnseignants: 0,
    manqueSalles: 0,
    manqueLivres: 20,
    abandonRate: 1.9,
    completion: 88,
    lastDeclaration: "2026-04-10", // Late
    successRate: 78.4,
    attendanceRate: 90.6,
    status: "Valide",
  },
  {
    code: "ETB-2026-613",
    name: "Ecole Maternelle Kollo",
    type: "Public",
    cycle: "Préscolaire",
    region: "Tillabéri",
    department: "Kollo",
    inspection: "Kollo I",
    commune: "Kollo",
    eleves: 180,
    filles: 92,
    garcons: 88,
    enseignants: 6,
    salles: 4,
    eau: false,
    electricite: true,
    latrines: true,
    manqueEnseignants: 0,
    manqueSalles: 0,
    manqueLivres: 80,
    abandonRate: 4.1,
    completion: 40,
    lastDeclaration: "2026-06-29",
    successRate: 95.0,
    attendanceRate: 92.5,
    status: "Incomplet",
  },
];

export default function MinistryDashboardPage() {
  const [schools] = useState<SchoolData[]>(initialSchools);
  const [schoolSessions, setSchoolSessions] = useState<any[]>([]);
  
  // Filter States
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedInsp, setSelectedInsp] = useState("all");
  const [selectedCommune, setSelectedCommune] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedCycle, setSelectedCycle] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<SchoolData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      try {
        const res = await getSessions();
        const sessions = (res as any)?.data?.data || (res as any)?.data || [];
        if (cancelled) return;

        setSchoolSessions(sessions);
        const activeSession = sessions.find((session: any) => session.isActive) || sessions[0];
        setSelectedYear(activeSession?.sessionName || "2025-2026");
      } catch (error) {
        if (!cancelled) {
          setSchoolSessions([]);
          setSelectedYear("2025-2026");
        }
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const academicYearOptions = useMemo(() => {
    const realSessions = schoolSessions
      .map((session: any) => String(session.sessionName || "").trim())
      .filter(Boolean);
    const uniqueSessions = Array.from(new Set(realSessions));
    return uniqueSessions.length > 0 ? uniqueSessions : ["2025-2026", "2024-2025"];
  }, [schoolSessions]);

  // Late declaration date limit (older than June 1, 2026)
  const isDeclarationLate = (dateStr: string) => {
    return new Date(dateStr) < new Date("2026-06-01");
  };

  // Filter lists based on selected region
  const departments = useMemo(() => {
    const list = schools.filter(s => selectedRegion === "all" || s.region === selectedRegion);
    return Array.from(new Set(list.map(s => s.department)));
  }, [schools, selectedRegion]);

  const inspections = useMemo(() => {
    const list = schools.filter(s => {
      const matchReg = selectedRegion === "all" || s.region === selectedRegion;
      const matchDept = selectedDept === "all" || s.department === selectedDept;
      return matchReg && matchDept;
    });
    return Array.from(new Set(list.map(s => s.inspection)));
  }, [schools, selectedRegion, selectedDept]);

  const communes = useMemo(() => {
    const list = schools.filter(s => {
      const matchReg = selectedRegion === "all" || s.region === selectedRegion;
      const matchDept = selectedDept === "all" || s.department === selectedDept;
      const matchInsp = selectedInsp === "all" || s.inspection === selectedInsp;
      return matchReg && matchDept && matchInsp;
    });
    return Array.from(new Set(list.map(s => s.commune)));
  }, [schools, selectedRegion, selectedDept, selectedInsp]);

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchSearch = searchQuery ? (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.commune.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;
      const matchRegion = selectedRegion === "all" || s.region === selectedRegion;
      const matchDept = selectedDept === "all" || s.department === selectedDept;
      const matchInsp = selectedInsp === "all" || s.inspection === selectedInsp;
      const matchCommune = selectedCommune === "all" || s.commune === selectedCommune;
      const matchType = selectedType === "all" || s.type === selectedType;
      const matchCycle = selectedCycle === "all" || s.cycle === selectedCycle;

      return matchSearch && matchRegion && matchDept && matchInsp && matchCommune && matchType && matchCycle;
    });
  }, [schools, searchQuery, selectedRegion, selectedDept, selectedInsp, selectedCommune, selectedType, selectedCycle]);

  // KPIs Calculations
  const kpis = useMemo(() => {
    const totalSchools = filteredSchools.length;
    let totalEleves = 0;
    let totalFilles = 0;
    let totalGarcons = 0;
    let totalEnseignants = 0;
    let sumSuccess = 0;
    let sumAttendance = 0;
    let noWater = 0;
    let noElec = 0;
    let noLatrines = 0;
    let missingTeachers = 0;
    let missingSalles = 0;
    let missingBooks = 0;
    let sumAbandon = 0;
    let sumCompletion = 0;
    let lateDeclaration = 0;

    filteredSchools.forEach(s => {
      totalEleves += s.eleves;
      totalFilles += s.filles;
      totalGarcons += s.garcons;
      totalEnseignants += s.enseignants;
      sumSuccess += s.successRate;
      sumAttendance += s.attendanceRate;
      if (!s.eau) noWater++;
      if (!s.electricite) noElec++;
      if (!s.latrines) noLatrines++;
      missingTeachers += s.manqueEnseignants;
      missingSalles += s.manqueSalles;
      missingBooks += s.manqueLivres;
      sumAbandon += s.abandonRate;
      sumCompletion += s.completion;
      if (isDeclarationLate(s.lastDeclaration)) lateDeclaration++;
    });

    const pupilTeacherRatio = totalEnseignants > 0 ? (totalEleves / totalEnseignants).toFixed(1) : "0";
    const avgAbandon = totalSchools > 0 ? (sumAbandon / totalSchools).toFixed(1) : "0";
    const avgCompletion = totalSchools > 0 ? (sumCompletion / totalSchools).toFixed(0) : "0";
    const priorityZones = filteredSchools.filter(s => s.successRate < 65 || !s.eau || !s.electricite || s.abandonRate > 8).length;

    return {
      totalSchools,
      totalEleves,
      totalFilles,
      totalGarcons,
      totalEnseignants,
      pupilTeacherRatio,
      avgSuccess: totalSchools > 0 ? (sumSuccess / totalSchools).toFixed(1) : "0",
      avgAttendance: totalSchools > 0 ? (sumAttendance / totalSchools).toFixed(1) : "0",
      avgAbandon,
      noWater,
      noElec,
      noLatrines,
      missingTeachers,
      missingSalles,
      missingBooks,
      avgCompletion,
      priorityZones,
      lateDeclaration,
    };
  }, [filteredSchools]);

  // Public/Private Breakdown
  const publicPrivateRatio = useMemo(() => {
    let pub = 0;
    let priv = 0;
    filteredSchools.forEach(s => {
      if (s.type === "Public") pub++;
      else priv++;
    });
    const total = pub + priv || 1;
    return {
      publicCount: pub,
      privateCount: priv,
      publicPct: ((pub / total) * 100).toFixed(0),
      privatePct: ((priv / total) * 100).toFixed(0)
    };
  }, [filteredSchools]);

  // Statistics by Region
  const regionStats = useMemo(() => {
    const stats: Record<string, { schools: number; eleves: number; completion: number }> = {};
    filteredSchools.forEach(s => {
      if (!stats[s.region]) {
        stats[s.region] = { schools: 0, eleves: 0, completion: 0 };
      }
      stats[s.region].schools++;
      stats[s.region].eleves += s.eleves;
      stats[s.region].completion += s.completion;
    });

    return Object.entries(stats).map(([region, data]) => ({
      region,
      schoolsCount: data.schools,
      studentsCount: data.eleves,
      avgCompletion: (data.completion / data.schools).toFixed(0),
    }));
  }, [filteredSchools]);

  // Statistics by Inspection
  const inspectionStats = useMemo(() => {
    const stats: Record<string, { schools: number; eleves: number; success: number }> = {};
    filteredSchools.forEach(s => {
      if (!stats[s.inspection]) {
        stats[s.inspection] = { schools: 0, eleves: 0, success: 0 };
      }
      stats[s.inspection].schools++;
      stats[s.inspection].eleves += s.eleves;
      stats[s.inspection].success += s.successRate;
    });

    return Object.entries(stats).map(([inspection, data]) => ({
      inspection,
      schoolsCount: data.schools,
      studentsCount: data.eleves,
      avgSuccess: (data.success / data.schools).toFixed(1),
    }));
  }, [filteredSchools]);

  // Alerts
  const nationalAlerts = useMemo(() => {
    const alerts: { school: string; code: string; type: string; severity: "critical" | "warning" }[] = [];
    filteredSchools.forEach(s => {
      if (!s.eau && !s.electricite) {
        alerts.push({ school: s.name, code: s.code, type: "Manque d'eau et d'électricité critiques", severity: "critical" });
      } else if (!s.eau) {
        alerts.push({ school: s.name, code: s.code, type: "Absence d'alimentation en eau potable", severity: "warning" });
      } else if (!s.electricite) {
        alerts.push({ school: s.name, code: s.code, type: "Pas d'électricité fonctionnelle", severity: "warning" });
      }

      if (!s.latrines) {
        alerts.push({ school: s.name, code: s.code, type: "Absence de latrines opérationnelles", severity: "critical" });
      }

      if (s.manqueEnseignants > 2) {
        alerts.push({ school: s.name, code: s.code, type: `Déficit de ${s.manqueEnseignants} enseignants`, severity: "critical" });
      }

      if (s.abandonRate > 8) {
        alerts.push({ school: s.name, code: s.code, type: `Taux d'abandon élevé (${s.abandonRate}%)`, severity: "critical" });
      }

      if (isDeclarationLate(s.lastDeclaration)) {
        alerts.push({ school: s.name, code: s.code, type: `Fiche de déclaration en retard (${s.lastDeclaration})`, severity: "critical" });
      }

      if (s.completion < 60) {
        alerts.push({ school: s.name, code: s.code, type: `Fiche canevas incomplète (${s.completion}%)`, severity: "warning" });
      }
    });
    return alerts;
  }, [filteredSchools]);

  // Export Excel function
  const handleExcelExport = () => {
    try {
      const data = filteredSchools.map((s, idx) => ({
        "N°": idx + 1,
        "Code": s.code,
        "Nom": s.name,
        "Type": s.type,
        "Cycle": s.cycle,
        "Région": s.region,
        "Département": s.department,
        "Inspection": s.inspection,
        "Commune": s.commune,
        "Élèves": s.eleves,
        "Filles": s.filles,
        "Garçons": s.garcons,
        "Enseignants": s.enseignants,
        "Salles": s.salles,
        "Eau": s.eau ? "Oui" : "Non",
        "Électricité": s.electricite ? "Oui" : "Non",
        "Latrines": s.latrines ? "Oui" : "Non",
        "Manque Enseignants": s.manqueEnseignants,
        "Manque Salles": s.manqueSalles,
        "Manque Livres": s.manqueLivres,
        "Taux Abandon (%)": s.abandonRate,
        "Complétude (%)": s.completion,
        "Taux Réussite (%)": s.successRate,
        "Taux Présence (%)": s.attendanceRate,
        "Dernière Déclaration": s.lastDeclaration
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport National");
      XLSX.writeFile(workbook, `Edut_Indicateurs_Nationaux_${Date.now()}.xlsx`);
      toast.success("Rapport Excel généré et téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  // Export PDF function
  const handlePdfExport = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // Official Header
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 35, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 35, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(225, 29, 72); // Rose/Red accent
      doc.text("RÉPUBLIQUE DU NIGER", 15, 17);
      doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE", 15, 22);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("TABLEAU DE BORD STATISTIQUE SCOLAIRE OFFICIEL", 15, 30);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Année scolaire : ${selectedYear}    |    Date de génération : ${new Date().toLocaleDateString()}`, 15, 36);

      let currentY = 52;

      // KPIs summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PRINCIPAUX INDICATEURS CLÉS SCOLAIRES", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 8;

      const items = [
        { label: "Écoles", value: kpis.totalSchools },
        { label: "Ratio Élève/Ens", value: kpis.pupilTeacherRatio },
        { label: "Taux Réussite", value: `${kpis.avgSuccess}%` },
        { label: "Taux Abandon", value: `${kpis.avgAbandon}%` },
        { label: "Manque Livres", value: kpis.missingBooks },
        { label: "Zones Prioritaires", value: kpis.priorityZones }
      ];

      const boxWidth = (pageWidth - 20 - 20) / 6;
      items.forEach((item, idx) => {
        const startX = 10 + idx * (boxWidth + 4);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(241, 245, 249);
        doc.rect(startX, currentY, boxWidth, 16, "DF");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(item.label.toUpperCase(), startX + 3, currentY + 5);

        doc.setFontSize(10);
        doc.setTextColor(225, 29, 72);
        doc.text(String(item.value), startX + 3, currentY + 11);
      });

      currentY += 24;

      // Table of schools
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("DONNÉES PAR ÉTABLISSEMENT", 10, currentY);
      doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
      currentY += 6;

      const headers = ["N°", "Code", "Nom", "Région", "Élèves", "Enseignants", "Ratio", "Réussite", "Abandon", "Eau", "Latrines"];
      const body = filteredSchools.map((s, idx) => [
        idx + 1,
        s.code,
        s.name,
        s.region,
        s.eleves.toLocaleString("fr-FR"),
        s.enseignants,
        (s.eleves / (s.enseignants || 1)).toFixed(0),
        `${s.successRate}%`,
        `${s.abandonRate}%`,
        s.eau ? "Oui" : "Non",
        s.latrines ? "Oui" : "Non"
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: body,
        theme: "striped",
        headStyles: { fillColor: [225, 29, 72], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Rapport_MEN_National_${Date.now()}.pdf`);
      toast.success("Rapport PDF généré !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  return (
    <div className="min-h-screen space-y-8 p-4 text-slate-950 md:p-6 xl:p-8 bg-[#fcfdff] print:bg-white print:p-0 animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition print:hidden">
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-100">
            <Globe size={26} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Portail National Décisionnel</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Ministère de l'Éducation</h1>
            <p className="mt-1 text-xs font-bold text-slate-500">Tableau de Bord Réglementaire du Secteur Éducatif National</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <button 
            onClick={handlePdfExport}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition"
          >
            <FileText size={16} className="text-rose-600" /> Export PDF
          </button>
          <button 
            onClick={handleExcelExport}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" /> Export Excel
          </button>
          <button 
            onClick={() => window.print()}
            className="flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 transition"
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </header>

      {/* Filter panel */}
      <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 print:hidden">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Filter size={14} /> Filtres Nationaux
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">ANNÉE SCOLAIRE</Label>
            <select 
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">RÉGION</Label>
            <select 
              value={selectedRegion}
              onChange={e => {
                setSelectedRegion(e.target.value);
                setSelectedDept("all");
                setSelectedInsp("all");
                setSelectedCommune("all");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Toutes</option>
              <option value="Niamey">Niamey</option>
              <option value="Tillabéri">Tillabéri</option>
              <option value="Maradi">Maradi</option>
              <option value="Zinder">Zinder</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">DÉPARTEMENT</Label>
            <select 
              value={selectedDept}
              disabled={selectedRegion === "all"}
              onChange={e => {
                setSelectedDept(e.target.value);
                setSelectedInsp("all");
                setSelectedCommune("all");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="all">Tous</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">INSPECTION</Label>
            <select 
              value={selectedInsp}
              disabled={selectedRegion === "all"}
              onChange={e => {
                setSelectedInsp(e.target.value);
                setSelectedCommune("all");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="all">Toutes</option>
              {inspections.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">COMMUNE</Label>
            <select 
              value={selectedCommune}
              disabled={selectedRegion === "all"}
              onChange={e => setSelectedCommune(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="all">Toutes</option>
              {communes.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">TYPE ÉTABLISSEMENT</Label>
            <select 
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Tous</option>
              <option value="Public">Public</option>
              <option value="Privé">Privé</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">CYCLE</Label>
            <select 
              value={selectedCycle}
              onChange={e => setSelectedCycle(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="all">Tous</option>
              <option value="Préscolaire">Préscolaire</option>
              <option value="Primaire">Primaire</option>
              <option value="Collège">Collège</option>
              <option value="Lycée">Lycée</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9">
        {[
          { label: "Établissements", value: kpis.totalSchools, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Total Élèves", value: kpis.totalEleves.toLocaleString("fr-FR"), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Filles", value: kpis.totalFilles.toLocaleString("fr-FR"), icon: Users, color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Total Garçons", value: kpis.totalGarcons.toLocaleString("fr-FR"), icon: Users, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Total Enseignants", value: kpis.totalEnseignants.toLocaleString("fr-FR"), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Ratio Élève/Ens", value: kpis.pupilTeacherRatio, icon: Layers, color: "text-slate-700", bg: "bg-slate-100" },
          { label: "Taux Réussite", value: `${kpis.avgSuccess}%`, icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Taux Présence", value: `${kpis.avgAttendance}%`, icon: Activity, color: "text-teal-600", bg: "bg-teal-50" },
          { label: "Taux Abandon", value: `${kpis.avgAbandon}%`, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Écoles Sans Eau", value: kpis.noWater, icon: Droplets, color: kpis.noWater > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.noWater > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Écoles Sans Élec.", value: kpis.noElec, icon: Lightbulb, color: kpis.noElec > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.noElec > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Sans Latrines", value: kpis.noLatrines, icon: AlertCircle, color: kpis.noLatrines > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.noLatrines > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Manque Enseignants", value: kpis.missingTeachers, icon: Users, color: kpis.missingTeachers > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.missingTeachers > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Manque Salles", value: kpis.missingSalles, icon: Building2, color: kpis.missingSalles > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.missingSalles > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Manque Livres", value: kpis.missingBooks, icon: BookOpen, color: kpis.missingBooks > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.missingBooks > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Complétude Données", value: `${kpis.avgCompletion}%`, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Zones Prioritaires", value: kpis.priorityZones, icon: ShieldAlert, color: kpis.priorityZones > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.priorityZones > 0 ? "bg-rose-50" : "bg-slate-50" },
          { label: "Retards Décl.", value: kpis.lateDeclaration, icon: Clock, color: kpis.lateDeclaration > 0 ? "text-rose-600" : "text-slate-400", bg: kpis.lateDeclaration > 0 ? "bg-rose-50" : "bg-slate-50" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", item.bg, item.color)}>
                <Icon size={16} />
              </div>
              <div className="mt-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-450 leading-snug">{item.label}</p>
                <p className="mt-1 text-lg font-black text-slate-900">{item.value}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main Panel grid */}
      <section className="grid gap-8 xl:grid-cols-12">
        
        {/* Left Side: Establishments List / Map */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            
            {/* Header controls */}
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Registre Éducatif National</h2>
                <p className="text-xs font-bold text-slate-400">Visualisation des données par établissement</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Nom, code, commune..."
                    className="h-10 w-full pl-9 pr-4 rounded-xl border border-slate-100 bg-slate-50/50 text-xs font-bold outline-none placeholder:text-slate-450 text-slate-850"
                  />
                  {searchQuery && <X size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer" onClick={() => setSearchQuery("")} />}
                </div>

                <div className="flex border border-slate-100 rounded-xl p-1 bg-slate-50/50">
                  <button 
                    onClick={() => setViewMode("list")}
                    className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition", viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700")}
                  >
                    Liste
                  </button>
                  <button 
                    onClick={() => setViewMode("map")}
                    className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition", viewMode === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-700")}
                  >
                    Carte
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "list" ? (
              <div className="overflow-x-auto">
                {filteredSchools.length > 0 ? (
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-50 bg-slate-50/40 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4">Établissement</th>
                        <th className="px-6 py-4">Type/Cycle</th>
                        <th className="px-6 py-4">Localisation</th>
                        <th className="px-6 py-4">Élèves / Ratio</th>
                        <th className="px-6 py-4">Réussite / Abandon</th>
                        <th className="px-6 py-4">Infras</th>
                        <th className="px-6 py-4">Complétude</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold text-slate-700 text-xs">
                      {filteredSchools.map((s) => (
                        <tr key={s.code} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-900">{s.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.code}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1.5", s.type === "Public" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700")}>
                              {s.type}
                            </span>
                            <span className="text-[10px] font-black text-slate-500">{s.cycle}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-800">{s.commune}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.region} / {s.department}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-950 font-black">{s.eleves} élèves</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Ratio: {(s.eleves / (s.enseignants || 1)).toFixed(0)} E/E</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-amber-600 font-black">Réussite: {s.successRate}%</p>
                            <p className="text-[9px] text-rose-600 mt-0.5">Abandon: {s.abandonRate}%</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span title={s.eau ? "Eau potable" : "Pas d'eau"}><Droplets className={cn("size-4", s.eau ? "text-blue-500" : "text-rose-500")} /></span>
                              <span title={s.electricite ? "Électricité" : "Pas d'élec"}><Lightbulb className={cn("size-4", s.electricite ? "text-amber-500" : "text-rose-500")} /></span>
                              <span title={s.latrines ? "Latrines" : "Pas de latrines"}><HelpCircle className={cn("size-4", s.latrines ? "text-emerald-500" : "text-rose-500")} /></span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${s.completion}%` }} />
                              </div>
                              <span className="text-[10px] font-black text-slate-900">{s.completion}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => setSelectedSchoolDetail(s)}
                              className="px-3 py-1.5 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 text-[10px] font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition"
                            >
                              Voir détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-16 text-center">
                    <Building2 className="mx-auto size-12 text-slate-200" />
                    <p className="mt-4 text-sm font-black text-slate-800">Aucun établissement trouvé</p>
                    <p className="text-xs text-slate-400 mt-1">Essayez de modifier vos filtres de recherche.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center space-y-4">
                <div className="h-96 w-full rounded-2xl bg-indigo-50/50 border border-slate-100 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-40" />
                  
                  {/* Decorative Simulated Map Pins */}
                  <div className="absolute top-1/4 left-1/3 animate-bounce"><div className="h-8 w-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>
                  <div className="absolute top-1/2 left-2/3 animate-pulse"><div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>
                  <div className="absolute top-2/3 left-1/4 animate-bounce delay-300"><div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>
                  <div className="absolute top-1/3 left-2/3"><div className="h-8 w-8 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-lg"><Building2 size={14} /></div></div>

                  <Globe className="size-20 text-indigo-500 opacity-90 animate-spin" style={{ animationDuration: '20s' }} />
                  <div className="mt-6 space-y-1">
                    <p className="text-base font-black text-slate-800">Carte Éducative Nationale Interactive</p>
                    <p className="text-xs text-slate-500 max-w-sm">Géolocalisation des établissements et anomalies d'infrastructures en temps réel.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Stats breakdowns & Alerts */}
        <div className="xl:col-span-4 space-y-8">
          
          {/* Public vs Private Breakdown */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Répartition Secteurs</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Ratio établissements Publics vs Privés</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-black">
                <span className="text-emerald-700">Public ({publicPrivateRatio.publicCount} éts)</span>
                <span className="text-indigo-700">Privé ({publicPrivateRatio.privateCount} éts)</span>
              </div>
              
              <div className="h-3 w-full bg-indigo-200 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${publicPrivateRatio.publicPct}%` }} />
                <div className="bg-indigo-600 h-full flex-1" style={{ width: `${publicPrivateRatio.privatePct}%` }} />
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>{publicPrivateRatio.publicPct}% Public</span>
                <span>{publicPrivateRatio.privatePct}% Privé</span>
              </div>
            </div>
          </div>

          {/* Regional Statistics */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Statistiques par Région</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Complétude des dossiers</p>
            </div>
            
            <div className="space-y-4">
              {regionStats.length > 0 ? regionStats.map(stat => (
                <div key={stat.region} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-800">{stat.region} ({stat.schoolsCount} éts)</span>
                    <span className="text-slate-900">{stat.avgCompletion}% Complétude</span>
                  </div>
                  <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stat.avgCompletion}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold">{stat.studentsCount.toLocaleString("fr-FR")} Élèves inscrits</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400">Aucune donnée régionale disponible.</p>
              )}
            </div>
          </div>

          {/* Inspection Statistics */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Statistiques par Inspection</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Performance (Réussite)</p>
            </div>
            
            <div className="space-y-4">
              {inspectionStats.length > 0 ? inspectionStats.map(stat => (
                <div key={stat.inspection} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-slate-800">{stat.inspection}</span>
                    <span className="text-slate-900">{stat.avgSuccess}% Réussite</span>
                  </div>
                  <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stat.avgSuccess}%` }} />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold">{stat.schoolsCount} Établissement(s) sous tutelle</p>
                </div>
              )) : (
                <p className="text-xs text-slate-400">Aucune donnée disponible.</p>
              )}
            </div>
          </div>

          {/* National Alerts */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Alertes Critiques Secteur</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Logistiques, Ratios & anomalies de Fichiers</p>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {nationalAlerts.length > 0 ? nationalAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "p-4 rounded-2xl border flex gap-3 items-start",
                    alert.severity === "critical" ? "bg-rose-50 border-rose-100 text-rose-800" : "bg-amber-50 border-amber-100 text-amber-800"
                  )}
                >
                  <ShieldAlert className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black">{alert.school}</p>
                    <p className="text-[10px] font-bold opacity-80 mt-0.5">{alert.type}</p>
                    <span className="inline-block text-[8px] font-black uppercase tracking-widest mt-1 bg-white/40 px-2 py-0.5 rounded">
                      {alert.code}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-6 text-center rounded-2xl border border-slate-50 bg-slate-50/20 text-slate-400">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                  <p className="text-xs font-bold mt-2">Aucune alerte active</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* School Details Dialog Modal */}
      {selectedSchoolDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedSchoolDetail.name}</h3>
                  <p className="text-xs font-bold text-slate-400">Code Etablissement : {selectedSchoolDetail.code}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSchoolDetail(null)}
                className="h-9 w-9 rounded-full border border-slate-100 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-slate-50 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type & Niveau</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.type} / {selectedSchoolDetail.cycle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Région / Dép.</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.region} / {selectedSchoolDetail.department}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspection / Comm.</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.inspection} / {selectedSchoolDetail.commune}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élèves inscrits</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.eleves} (F: {selectedSchoolDetail.filles} | G: {selectedSchoolDetail.garcons})</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enseignants / Salles</p>
                <p className="font-bold text-slate-800">{selectedSchoolDetail.enseignants} Ens. / {selectedSchoolDetail.salles} Salles</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eau, Élec & Latrines</p>
                <p className="font-bold text-slate-800">Eau: {selectedSchoolDetail.eau ? "Oui" : "Non"} | Élec: {selectedSchoolDetail.electricite ? "Oui" : "Non"} | Latr: {selectedSchoolDetail.latrines ? "Oui" : "Non"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manques Logistiques</p>
                <p className="font-bold text-rose-600">Ens: {selectedSchoolDetail.manqueEnseignants} | Salles: {selectedSchoolDetail.manqueSalles} | Livres: {selectedSchoolDetail.manqueLivres}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complétude & Abandon</p>
                <span className="font-bold text-slate-800">{selectedSchoolDetail.completion}% (Abandon: {selectedSchoolDetail.abandonRate}%)</span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernière Déclaration</p>
                <span className="font-bold text-slate-800">{selectedSchoolDetail.lastDeclaration}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedSchoolDetail(null)}
                className="px-6 h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-widest transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
