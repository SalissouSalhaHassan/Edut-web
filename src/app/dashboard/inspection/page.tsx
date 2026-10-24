"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  Shield,
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
  FileCheck2,
  AlertCircle,
  FileQuestion,
  Sun,
  Moon,
  ChevronDown,
  Copy,
  Sparkles,
  CheckCheck,
  Send,
  Share2,
  FileDown,
  BadgeCheck,
  RotateCcw,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { getSessions, getCanevasReferenceLists, getEducationalLevels } from "@/domains/academics/actions/academics.actions";
import { getMinistrySchoolsData } from "@/domains/ministry/actions/ministry.actions";
import { localDb } from "@/infrastructure/local-db/dexie";
import { syncOutbox } from "@/infrastructure/local-db/sync";

interface SchoolInspectionData {
  code: string;
  name: string;
  type: "Public" | "Privé";
  cycle: string;
  inspection: string;
  commune: string;
  eleves: number;
  enseignants: number;
  salles: number;
  eau: boolean;
  electricite: boolean;
  completion: number; // 0 to 100
  lastDeclaration: string; // YYYY-MM-DD
  successRate: number; // 0 to 100
  attendanceRate: number; // 0 to 100
  status: "Validé" | "En attente" | "Rejeté";
  rejectionReason?: string;
  needsCount: number;
}

const initialSchools: SchoolInspectionData[] = [
  {
    code: "ETB-2026-001",
    name: "Université Privée Internationale Aboubacar Ibrahim",
    type: "Privé",
    cycle: "Supérieur",
    inspection: "Maradi I",
    commune: "Commune de Maradi 1",
    eleves: 364,
    enseignants: 16,
    salles: 19,
    eau: false,
    electricite: false,
    completion: 100,
    lastDeclaration: "2026-06-27",
    successRate: 88.5,
    attendanceRate: 95.2,
    status: "Validé",
    needsCount: 2,
  },
  {
    code: "REG-2025-0002",
    name: "CSP ALHOUSNA",
    type: "Privé",
    cycle: "Collège",
    inspection: "Maradi Zaria 3",
    commune: "Maradi Zaria 3",
    eleves: 364,
    enseignants: 16,
    salles: 19,
    eau: false,
    electricite: false,
    completion: 100,
    lastDeclaration: "2026-06-25",
    successRate: 74.8,
    attendanceRate: 91.0,
    status: "Validé",
    needsCount: 2,
  },
  {
    code: "ETB-2024-132343435",
    name: "CSP BASMA",
    type: "Privé",
    cycle: "Primaire",
    inspection: "Maradi II",
    commune: "Commune de Maradi 2",
    eleves: 364,
    enseignants: 16,
    salles: 19,
    eau: false,
    electricite: false,
    completion: 100,
    lastDeclaration: "2026-06-24",
    successRate: 82.2,
    attendanceRate: 93.1,
    status: "Validé",
    needsCount: 2,
  },
  {
    code: "ETB-2026-067",
    name: "Ecole Publique Lazaret B",
    type: "Public",
    cycle: "Primaire",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 350,
    enseignants: 12,
    salles: 8,
    eau: false,
    electricite: true,
    completion: 70,
    lastDeclaration: "2026-06-25",
    successRate: 59.8,
    attendanceRate: 85.0,
    status: "En attente",
    needsCount: 2,
  },
  {
    code: "ETB-2026-202",
    name: "Collège d'Enseignement Général CEG 14",
    type: "Public",
    cycle: "Collège",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 890,
    enseignants: 38,
    salles: 22,
    eau: true,
    electricite: false,
    completion: 65,
    lastDeclaration: "2026-06-24",
    successRate: 61.2,
    attendanceRate: 84.1,
    status: "En attente",
    needsCount: 1,
  },
  {
    code: "ETB-2026-521",
    name: "Complexe Scolaire Privé Al-Barka",
    type: "Privé",
    cycle: "Collège",
    inspection: "Niamey IV",
    commune: "Niamey IV",
    eleves: 310,
    enseignants: 15,
    salles: 10,
    eau: false,
    electricite: false,
    completion: 55,
    lastDeclaration: "2026-05-10",
    successRate: 78.4,
    attendanceRate: 90.6,
    status: "Rejeté",
    rejectionReason: "Données d'infrastructure incohérentes. Veuillez vérifier les salles de classe.",
    needsCount: 3,
  },
];

type QuickTab = "all" | "pending" | "validated" | "rejected" | "infra_alerts" | "critical_needs";

export default function InspectionDashboardPage() {
  const [schools, setSchools] = useState<SchoolInspectionData[]>(initialSchools);
  const [schoolSessions, setSchoolSessions] = useState<any[]>([]);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Filter States
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("all");
  const [selectedCycle, setSelectedCycle] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<QuickTab>("all");

  // Advanced Menu Dropdown State
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  // Modal States
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<SchoolInspectionData | null>(null);
  const [rejectingSchool, setRejectingSchool] = useState<SchoolInspectionData | null>(null);
  const [rejectionObservation, setRejectionObservation] = useState("");
  const [dynamicCycles, setDynamicCycles] = useState<string[]>([]);
  const [certificateSchool, setCertificateSchool] = useState<SchoolInspectionData | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Initialize Dark Mode & Close menus on outside click
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_theme") || localStorage.getItem("edut_inspection_dark_mode");
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
      } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setIsDarkMode(true);
      }
    } catch {
      // ignore
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOptionsOpen(false);
      }
      setActiveRowMenu(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem("edut_theme", next ? "dark" : "light");
        localStorage.setItem("edut_inspection_dark_mode", next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [res, refsRes, levelsRes, schoolsRes] = await Promise.all([
          getSessions().catch(() => null),
          getCanevasReferenceLists().catch(() => null),
          getEducationalLevels(true).catch(() => null),
          getMinistrySchoolsData().catch(() => null),
        ]);
        const sessions = (res as any)?.data?.data || (res as any)?.data || [];
        if (cancelled) return;

        setSchoolSessions(sessions);
        const activeSession = sessions.find((session: any) => session.isActive) || sessions[0];
        setSelectedYear(activeSession?.sessionName || "2026-2027");

        const refCycles = (refsRes as any)?.data?.cycle || (refsRes as any)?.cycle || [];
        const eduLevels = (levelsRes as any)?.data || levelsRes || [];
        const combined = Array.from(new Set([
          "Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur",
          ...eduLevels.map((l: any) => l.levelName || l.name || l).filter(Boolean),
          ...refCycles.map((c: any) => c.value || c).filter(Boolean)
        ]));
        setDynamicCycles(combined);

        if (schoolsRes?.success && Array.isArray(schoolsRes.data) && schoolsRes.data.length > 0) {
          const mapped: SchoolInspectionData[] = schoolsRes.data.map((s: any) => ({
            code: s.code,
            name: s.name,
            type: s.type,
            cycle: s.cycle,
            inspection: s.inspection || "Niamey IV",
            commune: s.commune || s.inspection || "Niamey",
            eleves: s.eleves || 0,
            enseignants: s.enseignants || 0,
            salles: s.salles || 0,
            eau: !!s.eau,
            electricite: !!s.electricite,
            completion: s.completion || 0,
            lastDeclaration: s.lastDeclaration || new Date().toISOString().slice(0, 10),
            successRate: s.successRate || 0,
            attendanceRate: s.attendanceRate || 0,
            status: s.status === "Valide" || s.status === "Validé" ? "Validé" : (s.status === "Rejeté" ? "Rejeté" : "En attente"),
            needsCount: (s.manqueEnseignants > 0 ? 1 : 0) + (s.manqueSalles > 0 ? 1 : 0) + (!s.eau ? 1 : 0) + (!s.electricite ? 1 : 0),
          }));
          setSchools(mapped);
        }

        // Merge offline local modifications if available
        try {
          const cached = await localDb.canevasDeclarations.toArray();
          if (!cancelled && cached && cached.length > 0) {
            setSchools(prev => {
              const cachedMap = new Map(cached.map(c => [c.code, c]));
              return prev.map(s => {
                const c = cachedMap.get(s.code);
                if (!c) return s;
                let derivedStatus: "Validé" | "En attente" | "Rejeté" = s.status;
                if (c.statut?.includes("Validé")) derivedStatus = "Validé";
                else if (c.statut?.includes("Rejeté")) derivedStatus = "Rejeté";
                else if (c.statut?.includes("Brouillon") || c.statut?.includes("attente")) derivedStatus = "En attente";
                return {
                  ...s,
                  status: derivedStatus,
                  completion: derivedStatus === "Validé" ? 100 : (c.completion || s.completion),
                };
              });
            });
          }
        } catch (e) {
          console.warn("Offline inspection load warning:", e);
        }
      } catch {
        if (!cancelled) {
          setSchoolSessions([]);
          setSelectedYear("2026-2027");
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const academicYearOptions = useMemo(() => {
    const realSessions = schoolSessions
      .map((session: any) => String(session.sessionName || "").trim())
      .filter(Boolean);
    const uniqueSessions = Array.from(new Set(realSessions));
    return uniqueSessions.length > 0 ? uniqueSessions : ["2026-2027", "2025-2026", "2024-2025"];
  }, [schoolSessions]);

  const cyclesList = useMemo(() => {
    const defaults = ["Préscolaire", "Primaire", "Collège", "Lycée", "Technique", "Supérieur"];
    const schoolCycles = schools.map(s => s.cycle).filter(Boolean);
    return Array.from(new Set([...defaults, ...dynamicCycles, ...schoolCycles]));
  }, [dynamicCycles, schools]);

  const communesList = useMemo(() => {
    const comms = schools.map(s => s.commune).filter(Boolean);
    return Array.from(new Set(comms));
  }, [schools]);

  // Late declaration date limit (older than June 1, 2026)
  const isDeclarationLate = (dateStr: string) => {
    return new Date(dateStr) < new Date("2026-06-01");
  };

  // Filtered list with Tab & Dropdowns
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchSearch = searchQuery ? (
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.commune.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cycle.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;

      const matchCommune = selectedCommune === "all" || s.commune === selectedCommune;
      const matchCycle = selectedCycle === "all" || s.cycle === selectedCycle;
      const matchType = selectedType === "all" || s.type === selectedType;
      const matchStatus = selectedStatus === "all" || s.status === selectedStatus;

      // Tab filter
      let matchTab = true;
      if (activeTab === "pending") matchTab = s.status === "En attente";
      else if (activeTab === "validated") matchTab = s.status === "Validé";
      else if (activeTab === "rejected") matchTab = s.status === "Rejeté";
      else if (activeTab === "infra_alerts") matchTab = !s.eau || !s.electricite;
      else if (activeTab === "critical_needs") matchTab = s.needsCount > 0;

      return matchSearch && matchCommune && matchCycle && matchType && matchStatus && matchTab;
    });
  }, [schools, searchQuery, selectedCommune, selectedCycle, selectedType, selectedStatus, activeTab]);

  // KPIs
  const kpis = useMemo(() => {
    const totalSchools = schools.length;
    let received = 0;
    let late = 0;
    let incomplete = 0;
    let infraAlerts = 0;
    let criticalNeeds = 0;
    let validated = 0;
    let pending = 0;
    let rejected = 0;

    schools.forEach(s => {
      if (s.status === "Validé") validated++;
      if (s.status === "En attente") pending++;
      if (s.status === "Rejeté") rejected++;
      if (s.status === "Validé" || s.status === "En attente") received++;
      if (isDeclarationLate(s.lastDeclaration)) late++;
      if (s.completion < 80) incomplete++;
      if (!s.eau || !s.electricite) infraAlerts++;
      criticalNeeds += s.needsCount;
    });

    return {
      totalSchools,
      received,
      late,
      incomplete,
      infraAlerts,
      criticalNeeds,
      validated,
      pending,
      rejected,
    };
  }, [schools]);

  // Helper to persist inspection status offline and queue in outbox
  const saveInspectionOfflineAndQueue = async (code: string, newStatus: "Validé" | "Rejeté", reason?: string) => {
    try {
      const existing = await localDb.canevasDeclarations.where("code").equals(code).first();
      const newStatut = newStatus === "Validé" ? "Validé inspection" : "Rejeté inspection";
      if (existing) {
        await localDb.canevasDeclarations.update(existing.id, {
          statut: newStatut,
          completion: newStatus === "Validé" ? 100 : existing.completion,
          updatedAt: Date.now(),
          synced: false,
        });
      } else {
        const school = schools.find(s => s.code === code);
        if (school) {
          await localDb.canevasDeclarations.put({
            code: school.code,
            name: school.name,
            type: school.type,
            cycle: school.cycle,
            region: "Niamey",
            commune: school.commune,
            quartier: "Centre",
            eleves: school.eleves,
            filles: Math.floor(school.eleves / 2),
            garcons: Math.ceil(school.eleves / 2),
            enseignants: school.enseignants,
            salles: school.salles,
            eau: school.eau,
            electricite: school.electricite,
            statut: newStatut,
            completion: newStatus === "Validé" ? 100 : school.completion,
            lastUpdate: school.lastDeclaration,
            updatedAt: Date.now(),
            synced: false,
          });
        }
      }

      await localDb.outbox.add({
        actionType: 'UPDATE',
        targetTable: 'canevasDeclarations',
        entity: 'SchoolInspection',
        entityId: code,
        payload: { code, status: newStatus, rejectionReason: reason, updatedAt: Date.now() },
        status: 'pending',
        priority: 3,
        timestamp: Date.now(),
        idempotencyKey: `inspection:${code}:${newStatus}:${Date.now()}`,
      });

      if (typeof navigator !== "undefined" && navigator.onLine) {
        syncOutbox().catch(() => {});
      }
    } catch (err) {
      console.warn("Offline inspection queue warning:", err);
    }
  };

  // Actions handlers
  const handleValidate = (code: string) => {
    setSchools(prev => prev.map(s => {
      if (s.code === code) {
        toast.success(`Les données de ${s.name} ont été validées avec succès.`);
        return { ...s, status: "Validé", completion: 100 };
      }
      return s;
    }));
    saveInspectionOfflineAndQueue(code, "Validé");
  };

  const handleBatchValidate = () => {
    const pendingList = filteredSchools.filter(s => s.status === "En attente");
    if (pendingList.length === 0) {
      toast.info("Aucune déclaration en attente dans la sélection actuelle.");
      return;
    }
    const codes = new Set(pendingList.map(s => s.code));
    setSchools(prev => prev.map(s => codes.has(s.code) ? { ...s, status: "Validé", completion: 100 } : s));
    pendingList.forEach(s => saveInspectionOfflineAndQueue(s.code, "Validé"));
    toast.success(`${pendingList.length} déclaration(s) validée(s) en lot.`);
  };

  const triggerRejectModal = (school: SchoolInspectionData) => {
    setRejectingSchool(school);
    setRejectionObservation("");
  };

  const handleRejectSubmit = () => {
    if (!rejectionObservation.trim()) {
      toast.error("Veuillez saisir une observation pour expliquer le motif du rejet.");
      return;
    }

    if (rejectingSchool) {
      const targetCode = rejectingSchool.code;
      const targetReason = rejectionObservation;
      setSchools(prev => prev.map(s => {
        if (s.code === targetCode) {
          toast.warning(`Déclaration de ${s.name} rejetée.`);
          return {
            ...s,
            status: "Rejeté",
            rejectionReason: targetReason
          };
        }
        return s;
      }));
      saveInspectionOfflineAndQueue(targetCode, "Rejeté", targetReason);
      setRejectingSchool(null);
    }
  };

  const handleCopySynthesis = () => {
    const text = `=== SYNTHÈSE INSPECTION SCOLAIRE [${selectedYear}] ===
Écoles déclarées: ${schools.length}
Validées: ${kpis.validated} | En attente: ${kpis.pending} | Rejetées: ${kpis.rejected}
Alertes Infrastructures (Eau/Élec): ${kpis.infraAlerts}
Besoins critiques répertoriés: ${kpis.criticalNeeds}
Date d'extraction: ${new Date().toLocaleDateString('fr-FR')}`;

    navigator.clipboard.writeText(text);
    toast.success("Synthèse d'inspection copiée dans le presse-papiers !");
  };

  const handleResetFilters = () => {
    setSelectedCommune("all");
    setSelectedCycle("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setSearchQuery("");
    setActiveTab("all");
    toast.info("Tous les filtres ont été réinitialisés.");
  };

  // Generate Individual School Report
  const handleGenerateReport = (school: SchoolInspectionData) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, 190, 30, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, 190, 30, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(6, 182, 212);
      doc.text(`INSPECTION DE L'ENSEIGNEMENT - ${school.inspection.toUpperCase()}`, 15, 17);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`RAPPORT D'INSPECTION & DÉCLARATION : ${school.name.toUpperCase()}`, 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Code Établissement : ${school.code}    |    Date : ${new Date().toLocaleDateString()}`, 15, 30);

      // Section 1
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("1. STATISTIQUES CONSOLIDÉES", 10, 48);
      doc.line(10, 50, 200, 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Type d'établissement : ${school.type}`, 15, 57);
      doc.text(`Cycle d'enseignement : ${school.cycle}`, 15, 62);
      doc.text(`Commune : ${school.commune}`, 15, 67);
      doc.text(`Effectifs élèves : ${school.eleves} élèves`, 15, 72);
      doc.text(`Personnel enseignant : ${school.enseignants} enseignants`, 15, 77);

      // Section 2
      doc.setFont("helvetica", "bold");
      doc.text("2. LOGISTIQUE & SERVICES ESSENTIELS", 10, 88);
      doc.line(10, 90, 200, 90);

      doc.setFont("helvetica", "normal");
      doc.text(`Accès eau potable : ${school.eau ? "FONCTIONNEL" : "ABSENT / À CORRIGER"}`, 15, 97);
      doc.text(`Accès électricité : ${school.electricite ? "FONCTIONNEL" : "ABSENT / À CORRIGER"}`, 15, 102);
      doc.text(`Salles de classe : ${school.salles} salles disponibles`, 15, 107);

      // Section 3
      doc.setFont("helvetica", "bold");
      doc.text("3. STATUT DE VALIDATION DU CANEVAS", 10, 118);
      doc.line(10, 120, 200, 120);

      doc.setFont("helvetica", "normal");
      doc.text(`Statut actuel : ${school.status}`, 15, 127);
      doc.text(`Complétude des données : ${school.completion}%`, 15, 132);
      if (school.rejectionReason) {
        doc.setTextColor(225, 29, 72);
        doc.text(`Motif de rejet : ${school.rejectionReason}`, 15, 138);
      }

      doc.save(`Rapport_Inspection_${school.code}.pdf`);
      toast.success("Rapport d'inspection généré !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du rapport PDF");
    }
  };

  // Export Excel
  const handleExcelExport = () => {
    try {
      const data = filteredSchools.map((s, idx) => ({
        "N°": idx + 1,
        "Code": s.code,
        "Nom": s.name,
        "Type": s.type,
        "Cycle": s.cycle,
        "Inspection": s.inspection,
        "Commune": s.commune,
        "Élèves": s.eleves,
        "Enseignants": s.enseignants,
        "Salles": s.salles,
        "Eau": s.eau ? "Oui" : "Non",
        "Électricité": s.electricite ? "Oui" : "Non",
        "Complétude (%)": `${s.completion}%`,
        "Statut Validation": s.status,
        "Dernière Déclaration": s.lastDeclaration,
        "Besoins Critiques": s.needsCount,
        "Motif Rejet": s.rejectionReason || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inspections");
      XLSX.writeFile(workbook, `Edut_Report_Inspection_${Date.now()}.xlsx`);
      toast.success("Rapport Excel exporté !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Excel");
    }
  };

  // Export PDF Central
  const handlePdfExport = () => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 32, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 32, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(6, 182, 212);
      doc.text("INSPECTION SCOLAIRE NATIONALE", 15, 17);
      doc.text("DASHBOARD CENTRAL DE SUIVI ET VALIDATION DES CANEVAS", 15, 22);

      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("RAPPORT SYNTHÉTIQUE DES INSPECTIONS ET DÉCLARATIONS", 15, 30);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Année scolaire : ${selectedYear}    |    Date d'édition : ${new Date().toLocaleDateString()}`, 15, 36);

      const headers = ["N°", "Code", "Établissement", "Commune", "Type/Cycle", "Élèves", "Enseignants", "Eau", "Élec", "Complétude", "Statut"];
      const body = filteredSchools.map((s, idx) => [
        idx + 1,
        s.code,
        s.name,
        s.commune,
        `${s.type} / ${s.cycle}`,
        s.eleves,
        s.enseignants,
        s.eau ? "Oui" : "Non",
        s.electricite ? "Oui" : "Non",
        `${s.completion}%`,
        s.status
      ]);

      autoTable(doc, {
        startY: 48,
        head: [headers],
        body: body,
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        margin: { left: 10, right: 10 }
      });

      doc.save(`Rapport_Inspection_Central_${Date.now()}.pdf`);
      toast.success("Rapport PDF exporté !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF");
    }
  };

  return (
    <div className={cn(
      "min-h-screen space-y-8 p-4 md:p-6 xl:p-8 transition-colors duration-200",
      isDarkMode ? "dark bg-[#090D16] text-slate-100" : "bg-[#fcfdff] text-slate-950",
      "print:bg-white print:text-black print:p-0"
    )}>
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 8mm !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden,
          nav,
          aside {
            display: none !important;
          }
          table {
            width: 100% !important;
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <header className={cn(
        "rounded-[2rem] border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border transition print:hidden",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20">
            <Shield size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500">Suivi & Validation canevas</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black text-cyan-400 border border-cyan-500/20">
                <Sparkles size={10} /> Portail Officiel
              </span>
            </div>
            <h1 className={cn("text-3xl font-black tracking-tight", isDarkMode ? "text-white" : "text-slate-900")}>
              B portal d'Inspection
            </h1>
            <p className={cn("mt-1 text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              Mise à jour, vérification et certification des déclarations d'établissements
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Passer en mode clair" : "Passer en mode sombre"}
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-3 text-xs font-black transition",
              isDarkMode 
                ? "border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800" 
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {isDarkMode ? <Sun size={17} className="animate-spin-slow" /> : <Moon size={17} />}
            <span className="hidden sm:inline">{isDarkMode ? "Clair" : "Sombre"}</span>
          </button>

          {/* Carte Scolaire SIG Button */}
          <Link
            href="/dashboard/canevas/carte-scolaire"
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-3.5 text-xs font-black uppercase tracking-wider transition shadow-xs",
              isDarkMode
                ? "border-teal-500/30 bg-teal-950/30 text-teal-300 hover:bg-teal-900/40"
                : "border-teal-200 bg-teal-50/80 text-teal-700 hover:bg-teal-100"
            )}
          >
            <Compass size={16} className="text-teal-500" />
            <span className="font-bold">Carte SIG</span>
          </Link>

          {/* Advanced Actions Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOptionsOpen(prev => !prev);
              }}
              className={cn(
                "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-wider transition",
                isDarkMode 
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" 
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <MoreVertical size={16} className="text-cyan-500" />
              <span>Options & Actions</span>
              <ChevronDown size={14} className={cn("transition-transform duration-200", isOptionsOpen && "rotate-180")} />
            </button>

            {isOptionsOpen && (
              <div className={cn(
                "absolute right-0 mt-2 w-64 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95",
                isDarkMode ? "bg-[#111827] border-slate-800 text-slate-200 shadow-black/60" : "bg-white border-slate-100 text-slate-800 shadow-slate-200/50"
              )}>
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions d'Inspection</p>
                </div>
                <div className="py-1 space-y-0.5">
                  <button
                    onClick={() => {
                      handleBatchValidate();
                      setIsOptionsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition",
                      isDarkMode ? "hover:bg-slate-800 text-emerald-400" : "hover:bg-emerald-50 text-emerald-700"
                    )}
                  >
                    <CheckCheck size={15} />
                    <span>Valider tout le lot en attente</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCopySynthesis();
                      setIsOptionsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition",
                      isDarkMode ? "hover:bg-slate-800 text-slate-200" : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <Copy size={15} className="text-cyan-500" />
                    <span>Copier la synthèse globale</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("infra_alerts");
                      setIsOptionsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition",
                      isDarkMode ? "hover:bg-slate-800 text-rose-400" : "hover:bg-rose-50 text-rose-700"
                    )}
                  >
                    <ShieldAlert size={15} />
                    <span>Filtrer alertes Eau & Élec</span>
                  </button>
                  <button
                    onClick={() => {
                      handleResetFilters();
                      setIsOptionsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition",
                      isDarkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <RotateCcw size={15} />
                    <span>Réinitialiser les filtres</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handlePdfExport}
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <FileText size={16} className="text-cyan-500" /> PDF
          </button>
          <button 
            onClick={handleExcelExport}
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-widest transition",
              isDarkMode ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <FileSpreadsheet size={16} className="text-emerald-500" /> Excel
          </button>
          <button 
            onClick={() => window.print()}
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl px-5 text-xs font-black uppercase tracking-widest transition shadow-md",
              isDarkMode ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </header>

      {/* Filter panel */}
      <section className={cn(
        "p-6 rounded-[2rem] border shadow-sm space-y-4 print:hidden transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Filter size={14} className="text-cyan-500" /> Filtres d'Inspection
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">ANNÉE SCOLAIRE</Label>
            <select 
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className={cn(
                "h-11 w-full rounded-xl border px-3 text-xs font-bold outline-none cursor-pointer transition",
                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50/50 border-slate-200 text-slate-800"
              )}
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">COMMUNE</Label>
            <select 
              value={selectedCommune}
              onChange={e => setSelectedCommune(e.target.value)}
              className={cn(
                "h-11 w-full rounded-xl border px-3 text-xs font-bold outline-none cursor-pointer transition",
                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50/50 border-slate-200 text-slate-800"
              )}
            >
              <option value="all">Toutes</option>
              {communesList.map(comm => (
                <option key={comm} value={comm}>{comm}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">CYCLE</Label>
            <select 
              value={selectedCycle}
              onChange={e => setSelectedCycle(e.target.value)}
              className={cn(
                "h-11 w-full rounded-xl border px-3 text-xs font-bold outline-none cursor-pointer transition",
                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50/50 border-slate-200 text-slate-800"
              )}
            >
              <option value="all">Tous</option>
              {cyclesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">TYPE ÉTABLISSEMENT</Label>
            <select 
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className={cn(
                "h-11 w-full rounded-xl border px-3 text-xs font-bold outline-none cursor-pointer transition",
                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50/50 border-slate-200 text-slate-800"
              )}
            >
              <option value="all">Tous</option>
              <option value="Public">Public</option>
              <option value="Privé">Privé</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[9px] font-black text-slate-400">STATUT VALIDATION</Label>
            <select 
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className={cn(
                "h-11 w-full rounded-xl border px-3 text-xs font-bold outline-none cursor-pointer transition",
                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-slate-50/50 border-slate-200 text-slate-800"
              )}
            >
              <option value="all">Tous</option>
              <option value="En attente">En attente</option>
              <option value="Validé">Validé</option>
              <option value="Rejeté">Rejeté</option>
            </select>
          </div>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Écoles Suivies", value: kpis.totalSchools, icon: Building2, color: "text-cyan-500", bgLight: "bg-cyan-50", bgDark: "dark:bg-cyan-950/40" },
          { label: "Canevas Reçus", value: kpis.received, icon: FileCheck2, color: "text-emerald-500", bgLight: "bg-emerald-50", bgDark: "dark:bg-emerald-950/40" },
          { label: "Canevas En Retard", value: kpis.late, icon: Clock, color: kpis.late > 0 ? "text-rose-500" : "text-slate-400", bgLight: kpis.late > 0 ? "bg-rose-50" : "bg-slate-50", bgDark: kpis.late > 0 ? "dark:bg-rose-950/40" : "dark:bg-slate-900" },
          { label: "Données Incomplètes", value: kpis.incomplete, icon: AlertTriangle, color: kpis.incomplete > 0 ? "text-amber-500" : "text-slate-400", bgLight: kpis.incomplete > 0 ? "bg-amber-50" : "bg-slate-50", bgDark: kpis.incomplete > 0 ? "dark:bg-amber-950/40" : "dark:bg-slate-900" },
          { label: "Alertes Infrastructure", value: kpis.infraAlerts, icon: ShieldAlert, color: kpis.infraAlerts > 0 ? "text-rose-500" : "text-slate-400", bgLight: kpis.infraAlerts > 0 ? "bg-rose-50" : "bg-slate-50", bgDark: kpis.infraAlerts > 0 ? "dark:bg-rose-950/40" : "dark:bg-slate-900" },
          { label: "Besoins Critiques", value: kpis.criticalNeeds, icon: AlertCircle, color: kpis.criticalNeeds > 0 ? "text-rose-500" : "text-slate-400", bgLight: kpis.criticalNeeds > 0 ? "bg-rose-50" : "bg-slate-50", bgDark: kpis.criticalNeeds > 0 ? "dark:bg-rose-950/40" : "dark:bg-slate-900" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div 
              key={item.label} 
              className={cn(
                "rounded-3xl border p-5 shadow-sm hover:shadow-md transition-colors",
                isDarkMode ? "bg-[#111827] border-slate-800 hover:border-slate-700" : "bg-white border-slate-100"
              )}
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", item.bgLight, item.bgDark, item.color)}>
                <Icon size={20} />
              </div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className={cn("mt-1 text-2xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>{item.value}</p>
            </div>
          );
        })}
      </section>

      {/* Main Table area */}
      <section className={cn(
        "rounded-[2.5rem] border shadow-sm overflow-hidden transition-colors",
        isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-slate-100"
      )}>
        
        {/* Header search & Quick Segment Tabs */}
        <div className={cn(
          "p-6 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-6",
          isDarkMode ? "border-slate-800" : "border-slate-50"
        )}>
          <div>
            <h2 className={cn("text-lg font-black font-sans", isDarkMode ? "text-white" : "text-slate-900")}>
              Déclarations sous Inspection
            </h2>
            <p className={cn("text-xs font-bold", isDarkMode ? "text-slate-400" : "text-slate-400")}>
              Valider, rejeter ou certifier les canevas scolaires déclarés ({filteredSchools.length} sur {schools.length})
            </p>
          </div>

          {/* Quick Segment Tabs */}
          <div className={cn(
            "flex flex-wrap items-center gap-1.5 p-1 rounded-2xl border",
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100/70 border-slate-200/50"
          )}>
            {[
              { id: "all" as QuickTab, label: "Tous", count: schools.length },
              { id: "pending" as QuickTab, label: "En attente", count: kpis.pending, badgeColor: "bg-amber-500/20 text-amber-500" },
              { id: "validated" as QuickTab, label: "Validés", count: kpis.validated, badgeColor: "bg-emerald-500/20 text-emerald-500" },
              { id: "rejected" as QuickTab, label: "Rejetés", count: kpis.rejected, badgeColor: "bg-rose-500/20 text-rose-500" },
              { id: "infra_alerts" as QuickTab, label: "Alertes Infras", count: kpis.infraAlerts, badgeColor: "bg-rose-500/20 text-rose-500" },
              { id: "critical_needs" as QuickTab, label: "Besoins", count: kpis.criticalNeeds, badgeColor: "bg-blue-500/20 text-blue-500" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition",
                  activeTab === tab.id
                    ? (isDarkMode ? "bg-cyan-600 text-white shadow" : "bg-white text-slate-900 shadow-sm")
                    : (isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                  activeTab === tab.id ? (isDarkMode ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-800") : (tab.badgeColor || "bg-slate-200/50 dark:bg-slate-800 text-slate-500")
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, code..."
              className={cn(
                "h-10 w-full pl-9 pr-8 rounded-xl border text-xs font-bold outline-none transition placeholder:text-slate-400",
                isDarkMode 
                  ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-cyan-500" 
                  : "bg-slate-50/50 border-slate-100 text-slate-800 focus:border-cyan-400"
              )}
            />
            {searchQuery && (
              <X 
                size={14} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer" 
                onClick={() => setSearchQuery("")} 
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredSchools.length > 0 ? (
            <table className="w-full text-left min-w-[1000px]">
              <thead>
                <tr className={cn(
                  "border-b text-[9px] font-black uppercase tracking-widest",
                  isDarkMode ? "border-slate-800 bg-slate-900/60 text-slate-400" : "border-slate-50 bg-slate-50/40 text-slate-400"
                )}>
                  <th className="px-6 py-4">Établissement</th>
                  <th className="px-6 py-4">Type/Cycle</th>
                  <th className="px-6 py-4">Effectifs</th>
                  <th className="px-6 py-4">Réseaux & Eau</th>
                  <th className="px-6 py-4">Besoins Critiques</th>
                  <th className="px-6 py-4">Complétude</th>
                  <th className="px-6 py-4">Statut Validation</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDarkMode ? "divide-slate-800/80" : "divide-slate-50")}>
                {filteredSchools.map((s) => (
                  <tr 
                    key={s.code} 
                    className={cn(
                      "text-xs font-bold transition",
                      isDarkMode ? "hover:bg-slate-900/40 text-slate-300" : "hover:bg-slate-50/50 text-slate-600"
                    )}
                  >
                    <td className="px-6 py-4">
                      <p className={cn("font-black", isDarkMode ? "text-white" : "text-slate-900")}>{s.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.code} / {s.commune}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mr-1.5",
                        s.type === "Public" 
                          ? (isDarkMode ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50" : "bg-emerald-50 text-emerald-700")
                          : (isDarkMode ? "bg-indigo-950/60 text-indigo-400 border border-indigo-800/50" : "bg-indigo-50 text-indigo-700")
                      )}>
                        {s.type}
                      </span>
                      <span className={cn("text-[10px] font-black", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                        {s.cycle}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className={cn("font-black", isDarkMode ? "text-slate-100" : "text-slate-950")}>{s.eleves} Élèves</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{s.enseignants} Enseignants / {s.salles} Salles</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                          s.eau 
                            ? (isDarkMode ? "bg-blue-950/60 text-blue-400 border border-blue-800/40" : "bg-blue-50 text-blue-600")
                            : (isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-800/40" : "bg-rose-50 text-rose-600")
                        )}>
                          <Droplets className="size-3" /> Eau
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                          s.electricite 
                            ? (isDarkMode ? "bg-amber-950/60 text-amber-400 border border-amber-800/40" : "bg-amber-50 text-amber-600")
                            : (isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-800/40" : "bg-rose-50 text-rose-600")
                        )}>
                          <Lightbulb className="size-3" /> Elec
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex rounded px-2.5 py-0.5 text-[10px] font-black",
                        s.needsCount > 0 
                          ? (isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-800/50" : "bg-rose-50 text-rose-700")
                          : (isDarkMode ? "bg-slate-900 text-slate-500" : "bg-slate-50 text-slate-400")
                      )}>
                        {s.needsCount} besoin{s.needsCount > 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-12 h-1.5 rounded-full overflow-hidden", isDarkMode ? "bg-slate-800" : "bg-slate-100")}>
                          <div className="h-full bg-emerald-500" style={{ width: `${s.completion}%` }} />
                        </div>
                        <span className={cn("text-[10px] font-black", isDarkMode ? "text-slate-200" : "text-slate-900")}>
                          {s.completion}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex rounded-full border px-3 py-0.5 text-[9px] font-black uppercase tracking-widest",
                        s.status === "Validé" && (isDarkMode ? "border-emerald-800/60 bg-emerald-950/50 text-emerald-400" : "border-emerald-100 bg-emerald-50 text-emerald-700"),
                        s.status === "En attente" && (isDarkMode ? "border-amber-800/60 bg-amber-950/50 text-amber-400" : "border-amber-100 bg-amber-50 text-amber-700"),
                        s.status === "Rejeté" && (isDarkMode ? "border-rose-800/60 bg-rose-950/50 text-rose-400" : "border-rose-100 bg-rose-50 text-rose-700"),
                      )}>
                        {s.status}
                      </span>
                      {s.rejectionReason && (
                        <p className="text-[9px] text-rose-400 font-bold mt-1 max-w-[200px] truncate" title={s.rejectionReason}>
                          {s.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setSelectedSchoolDetail(s)}
                          className={cn(
                            "p-1.5 rounded-lg border transition",
                            isDarkMode 
                              ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800" 
                              : "border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                          )}
                          title="Voir Fiche Détaillée"
                        >
                          <Eye className="size-4" />
                        </button>
                        
                        {s.status === "En attente" && (
                          <>
                            <button 
                              onClick={() => handleValidate(s.code)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white uppercase tracking-widest transition shadow-sm"
                              title="Valider"
                            >
                              Valider
                            </button>
                            <button 
                              onClick={() => triggerRejectModal(s)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[10px] font-black text-white uppercase tracking-widest transition shadow-sm"
                              title="Rejeter"
                            >
                              Rejeter
                            </button>
                          </>
                        )}

                        <button 
                          onClick={() => handleGenerateReport(s)}
                          className={cn(
                            "p-1.5 rounded-lg border transition",
                            isDarkMode 
                              ? "border-slate-800 bg-slate-900 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300" 
                              : "border-slate-100 hover:bg-cyan-50 text-cyan-600 hover:text-cyan-700"
                          )}
                          title="Générer Rapport PDF"
                        >
                          <FileText className="size-4" />
                        </button>

                        {/* Extra Row Actions Dropdown */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRowMenu(activeRowMenu === s.code ? null : s.code);
                            }}
                            className={cn(
                              "p-1.5 rounded-lg border transition",
                              isDarkMode 
                                ? "border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800" 
                                : "border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                            )}
                            title="Plus d'actions"
                          >
                            <MoreVertical className="size-4" />
                          </button>

                          {activeRowMenu === s.code && (
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "absolute right-0 mt-2 w-52 rounded-2xl border p-2 shadow-2xl z-50 text-left animate-in fade-in zoom-in-95",
                                isDarkMode ? "bg-[#111827] border-slate-800 text-slate-200 shadow-black/70" : "bg-white border-slate-100 text-slate-800 shadow-slate-200/50"
                              )}
                            >
                              <div className="px-2 py-1 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                {s.code}
                              </div>
                              <div className="py-1 space-y-0.5">
                                <button
                                  onClick={() => {
                                    setSelectedSchoolDetail(s);
                                    setActiveRowMenu(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition",
                                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                                  )}
                                >
                                  <Eye size={14} className="text-cyan-500" />
                                  <span>Fiche d'Inspection</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleValidate(s.code);
                                    setActiveRowMenu(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition text-emerald-500",
                                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-emerald-50"
                                  )}
                                >
                                  <Check size={14} />
                                  <span>Marquer Validé</span>
                                </button>
                                <button
                                  onClick={() => {
                                    triggerRejectModal(s);
                                    setActiveRowMenu(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition text-rose-500",
                                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-rose-50"
                                  )}
                                >
                                  <AlertTriangle size={14} />
                                  <span>Demander corrections</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const copyData = `${s.name} (${s.code}) - ${s.type} ${s.cycle} - Commune: ${s.commune} - Élèves: ${s.eleves} - Enseignants: ${s.enseignants} - Eau: ${s.eau ? "Oui" : "Non"} - Elec: ${s.electricite ? "Oui" : "Non"} - Statut: ${s.status}`;
                                    navigator.clipboard.writeText(copyData);
                                    toast.success("Détails de l'école copiés !");
                                    setActiveRowMenu(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition",
                                    isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
                                  )}
                                >
                                  <Copy size={14} className="text-slate-400" />
                                  <span>Copier les infos</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center">
              <Building2 className={cn("mx-auto size-12", isDarkMode ? "text-slate-800" : "text-slate-200")} />
              <p className={cn("mt-4 text-sm font-black", isDarkMode ? "text-slate-200" : "text-slate-800")}>
                Aucun établissement sous tutelle d'inspection trouvé
              </p>
              <p className="text-xs text-slate-400 mt-1">Vérifiez les filtres ou l'onglet sélectionné.</p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 transition"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>
      </section>

      {/* School Details Modal */}
      {selectedSchoolDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className={cn(
            "w-full max-w-2xl rounded-[2.5rem] border shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8 transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800 text-slate-100" : "bg-white border-slate-100 text-slate-900"
          )}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center",
                  isDarkMode ? "bg-cyan-950/60 text-cyan-400 border border-cyan-800/40" : "bg-cyan-50 text-cyan-600"
                )}>
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 className={cn("text-xl font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                    {selectedSchoolDetail.name}
                  </h3>
                  <p className="text-xs font-bold text-slate-400">Code Établissement : {selectedSchoolDetail.code}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSchoolDetail(null)}
                className={cn(
                  "h-9 w-9 rounded-full border flex items-center justify-center text-slate-400 hover:text-white transition",
                  isDarkMode ? "border-slate-800 bg-slate-900 hover:bg-slate-800" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                )}
              >
                <X size={16} />
              </button>
            </div>

            <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t text-xs", isDarkMode ? "border-slate-800" : "border-slate-50")}>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Cycle</p>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{selectedSchoolDetail.type} / {selectedSchoolDetail.cycle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tutelle d'Inspection</p>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{selectedSchoolDetail.inspection} / {selectedSchoolDetail.commune}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Effectifs Élèves</p>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{selectedSchoolDetail.eleves} Élèves</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Équipe Enseignante</p>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{selectedSchoolDetail.enseignants} enseignants</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salles de classe</p>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{selectedSchoolDetail.salles} salles</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réseaux Services</p>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>Eau: {selectedSchoolDetail.eau ? "Fonctionnel" : "Absent"} | Élec: {selectedSchoolDetail.electricite ? "Fonctionnel" : "Absent"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complétude du dossier</p>
                <p className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{selectedSchoolDetail.completion}% complété</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Scolaire</p>
                <span className="font-bold text-amber-500">{selectedSchoolDetail.successRate}% succès examens</span>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Présence moyenne</p>
                <span className={cn("font-bold", isDarkMode ? "text-slate-200" : "text-slate-800")}>{selectedSchoolDetail.attendanceRate}%</span>
              </div>
            </div>

            {selectedSchoolDetail.rejectionReason && (
              <div className={cn(
                "p-4 rounded-2xl border",
                isDarkMode ? "bg-rose-950/40 border-rose-800/50" : "bg-rose-50 border-rose-100"
              )}>
                <p className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Motif du dernier rejet</p>
                <p className={cn("text-xs font-bold mt-1", isDarkMode ? "text-rose-200" : "text-rose-800")}>{selectedSchoolDetail.rejectionReason}</p>
              </div>
            )}

            <div className={cn("pt-6 border-t flex justify-end gap-3", isDarkMode ? "border-slate-800" : "border-slate-50")}>
              <button 
                onClick={() => handleGenerateReport(selectedSchoolDetail)}
                className="px-5 h-12 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-widest transition flex items-center gap-2"
              >
                <FileText size={15} /> Télécharger Rapport
              </button>
              <button 
                onClick={() => setSelectedSchoolDetail(null)}
                className={cn(
                  "px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition",
                  isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingSchool && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition animate-in fade-in">
          <div className={cn(
            "w-full max-w-md rounded-[2.5rem] border shadow-2xl p-8 space-y-6 animate-in slide-in-from-bottom-8 transition-colors",
            isDarkMode ? "bg-[#111827] border-slate-800 text-slate-100" : "bg-white border-slate-100 text-slate-900"
          )}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  isDarkMode ? "bg-rose-950/60 text-rose-400 border border-rose-800/50" : "bg-rose-50 text-rose-600"
                )}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className={cn("text-lg font-black", isDarkMode ? "text-white" : "text-slate-900")}>
                    Rejeter la Déclaration
                  </h3>
                  <p className="text-xs font-bold text-slate-400">{rejectingSchool.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setRejectingSchool(null)}
                className={cn(
                  "h-8 w-8 rounded-full border flex items-center justify-center text-slate-400 hover:text-white transition",
                  isDarkMode ? "border-slate-800 bg-slate-900 hover:bg-slate-800" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                )}
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Observation / Motif du rejet
              </Label>
              <textarea
                value={rejectionObservation}
                onChange={e => setRejectionObservation(e.target.value)}
                placeholder="Exemple : Les effectifs déclarés ne correspondent pas au nombre d'enseignants. Veuillez vérifier vos données."
                rows={4}
                className={cn(
                  "w-full rounded-2xl border p-4 text-xs font-bold outline-none placeholder:text-slate-400 transition",
                  isDarkMode 
                    ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-rose-500" 
                    : "bg-slate-50/50 border-slate-200 text-slate-800 focus:border-rose-400"
                )}
              />
            </div>

            <div className={cn("pt-4 border-t flex justify-end gap-3", isDarkMode ? "border-slate-800" : "border-slate-50")}>
              <button 
                onClick={() => setRejectingSchool(null)}
                className={cn(
                  "px-5 h-11 rounded-xl text-xs font-black uppercase tracking-widest transition",
                  isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                )}
              >
                Annuler
              </button>
              <button 
                onClick={handleRejectSubmit}
                className="px-5 h-11 rounded-xl bg-rose-600 text-white hover:bg-rose-500 text-xs font-black uppercase tracking-widest transition shadow-md"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
