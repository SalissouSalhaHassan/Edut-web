"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Scale, ArrowLeft, CheckCircle2, 
  AlertTriangle, RefreshCw, Sparkles, Filter, 
  ShieldCheck, Printer,
  Layers, School, GraduationCap, Search,
  Sun, Moon, Award, Activity, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  getLmdDeliberationCohort, 
  saveLmdDeliberation 
} from "@/domains/academics/actions/lmd.actions";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

type Props = {
  initialPrograms: any[];
  classes: any[];
  sections: any[];
  levels: any[];
  sessions: any[];
  periods?: any[];
};

function normalizeFilterText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getAcademicLevels(levels: any[], sections: any[]): string[] {
  if (levels && levels.length > 0) {
    return levels.map((l: any) => l.levelName || l.name || l);
  }
  const extracted = Array.from(new Set((sections || []).map((s: any) => s.educationalLevel || "Licence"))) as string[];
  return extracted.length > 0 ? extracted : ["Licence", "Master", "Lycée", "Collège", "Primaire"];
}

export default function DeliberationClient({
  initialPrograms,
  classes = [],
  sections = [],
  levels = [],
  sessions = [],
  periods = [],
}: Props) {
  const [programs] = useState(initialPrograms || []);
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // 1. Session Académique (défaut sur session active)
  const activeSession = sessions.find((s) => s.isActive || s.status === "Actif") || sessions[0];
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    activeSession ? String(activeSession.id) : ""
  );

  // 2. Niveaux d'Études (Conforme settings?tab=academic & AcademicFilters)
  const academicLevels = useMemo(() => getAcademicLevels(levels, sections), [levels, sections]);
  
  // Prioritize "Licence" or "Master" for LMD Deliberation if available
  const defaultLevel = useMemo(() => {
    const foundUniv = academicLevels.find((l) => {
      const n = normalizeFilterText(l);
      return n.includes("licence") || n.includes("master") || n.includes("univ") || n.includes("super");
    });
    return foundUniv || academicLevels[0] || "Licence";
  }, [academicLevels]);

  const [selectedLevel, setSelectedLevel] = useState<string>(defaultLevel);

  // 3. Sections / Filières filtrées par Niveau (Logique exacte de AcademicFilters)
  const filteredSections = useMemo(() => {
    const selectedNorm = normalizeFilterText(selectedLevel);
    if (!selectedNorm) return sections;

    const isLevelMatch = (secLevel: string, targetLevel: string) => {
      const sNorm = normalizeFilterText(secLevel);
      const tNorm = normalizeFilterText(targetLevel);
      if (sNorm === tNorm) return true;

      const isUnivTarget = tNorm.includes("univ") || tNorm.includes("super") || tNorm.includes("licence") || tNorm.includes("lmd") || tNorm.includes("master") || tNorm.includes("doc");
      const isUnivSec = sNorm.includes("univ") || sNorm.includes("super") || sNorm.includes("licence") || sNorm.includes("lmd") || sNorm.includes("master") || sNorm.includes("doc");
      if (isUnivTarget && isUnivSec) return true;

      const isLyceeTarget = tNorm.includes("lyc") || tNorm.includes("sec");
      const isLyceeSec = sNorm.includes("lyc") || sNorm.includes("sec");
      if (isLyceeTarget && isLyceeSec) return true;

      const isCollegeTarget = tNorm.includes("colleg") || tNorm.includes("moyen");
      const isCollegeSec = sNorm.includes("colleg") || sNorm.includes("moyen");
      if (isCollegeTarget && isCollegeSec) return true;

      const isPrimTarget = tNorm.includes("prim") || tNorm.includes("matern") || tNorm.includes("elem");
      const isPrimSec = sNorm.includes("prim") || sNorm.includes("matern") || sNorm.includes("elem");
      if (isPrimTarget && isPrimSec) return true;

      return false;
    };

    return (sections || []).filter((s: any) => {
      return isLevelMatch(s.educationalLevel || "Licence", selectedLevel);
    });
  }, [selectedLevel, sections]);

  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    filteredSections.length > 0 ? String(filteredSections[0].id) : (sections[0] ? String(sections[0].id) : "")
  );

  // Auto-switch section when level changes
  useEffect(() => {
    if (filteredSections.length > 0) {
      const exists = filteredSections.some((s) => String(s.id) === selectedSectionId);
      if (!exists) {
        setSelectedSectionId(String(filteredSections[0].id));
      }
    } else {
      setSelectedSectionId("");
    }
  }, [selectedLevel, filteredSections]);

  const currentSection = sections.find((s) => String(s.id) === selectedSectionId);

  // 4. Promotions / Classes (filtrées strictement par sectionId comme dans AcademicFilters)
  const filteredClasses = useMemo(() => {
    if (!selectedSectionId) return classes;
    return classes.filter((c) => c.sectionId?.toString() === selectedSectionId);
  }, [selectedSectionId, classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    filteredClasses.length > 0 ? String(filteredClasses[0].id) : (classes[0] ? String(classes[0].id) : "")
  );

  // Auto-switch class when section changes
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const exists = filteredClasses.some((c) => String(c.id) === selectedClassId);
      if (!exists) {
        setSelectedClassId(String(filteredClasses[0].id));
      }
    } else {
      setSelectedClassId("");
    }
  }, [selectedSectionId, filteredClasses]);

  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);

  // 5. Semestres / Périodes dynamiques (Logique conforme AcademicFilters & Norme LMD)
  const periodOptions = useMemo(() => {
    const normLevel = normalizeFilterText(selectedLevel);
    const isSuperior = normLevel.includes("licence") || normLevel.includes("lmd") || normLevel.includes("master") || normLevel.includes("doc") || normLevel.includes("super") || normLevel.includes("univ");

    let sessionPeriods = (periods || []).filter((p: any) =>
      !p.sessionId || p.sessionId === 0 || String(p.sessionId) === "" || p.sessionId?.toString() === selectedSessionId
    );
    if (sessionPeriods.length === 0 && periods?.length > 0) {
      sessionPeriods = periods;
    }

    if (isSuperior) {
      const isMaster = normLevel.includes("master");
      const maxSem = isMaster ? 4 : 6;
      
      // Look for DB periods configured as Semestres
      const dbSuperior = sessionPeriods.filter((p: any) =>
        p.periodType === "Semestre" || String(p.name).toLowerCase().includes("semest") || /^s\d+/i.test(p.name)
      );

      if (dbSuperior.length >= 2) {
        return dbSuperior.map((p: any) => {
          const m = p.name.match(/\d+/);
          const c = m ? `S${m[0]}` : p.name;
          return { id: p.name, name: p.name, code: c };
        });
      }

      // Standard LMD Semesters Presets
      return Array.from({ length: maxSem }, (_, i) => {
        const num = i + 1;
        const code = `S${num}`;
        const label = `${num === 1 ? "1er" : `${num}ème`} Semestre (${code})`;
        return { id: label, name: label, code };
      });
    }

    // Default for Collège / Lycée -> 2 Semestres
    const dbSemestres = sessionPeriods.filter((p: any) =>
      p.periodType === "Semestre" || String(p.name).toLowerCase().includes("semest")
    );

    if (dbSemestres.length >= 2) {
      return dbSemestres.map((p: any) => ({ id: p.name, name: p.name, code: p.name }));
    }

    return [
      { id: "1er Semestre", name: "1er Semestre (S1)", code: "S1" },
      { id: "2ème Semestre", name: "2ème Semestre (S2)", code: "S2" },
    ];
  }, [selectedLevel, selectedSessionId, periods]);

  const [selectedSemester, setSelectedSemester] = useState<string>("1er Semestre (S1)");

  // Intelligent initial semester auto-selection based on class level (L1 -> S1, L2 -> S3, L3 -> S5, M2 -> S3)
  useEffect(() => {
    if (periodOptions.length > 0) {
      const normClass = normalizeFilterText(selectedClass?.className);
      let targetCode = "S1";
      if (normClass.includes("l2") || normClass.includes("licence 2") || normClass.includes("2eme annee") || normClass.includes("2ème année")) {
        targetCode = "S3";
      } else if (normClass.includes("l3") || normClass.includes("licence 3") || normClass.includes("3eme annee") || normClass.includes("3ème année")) {
        targetCode = "S5";
      } else if (normClass.includes("m2") || normClass.includes("master 2")) {
        targetCode = "S3";
      }

      const matchOption = periodOptions.find((p) => p.code === targetCode || p.id.includes(targetCode)) || periodOptions[0];
      setSelectedSemester(matchOption.id);
    }
  }, [selectedClassId, periodOptions]);

  // Resolve University Program mapped to current Section
  const selectedProgram = useMemo(() => {
    if (selectedSectionId) {
      const prog = programs.find((p) => p.sectionId?.toString() === selectedSectionId);
      if (prog) return prog;
    }
    return programs[0] || null;
  }, [selectedSectionId, programs]);

  // 6. Données de Délibération
  const [deliberationData, setDeliberationData] = useState<{
    ues: any[];
    cohort: any[];
    totalStudents: number;
    passedCount: number;
    successRate: number;
  }>({ ues: [], cohort: [], totalStudents: 0, passedCount: 0, successRate: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const loadDeliberationData = async () => {
    if (!selectedClassId || !selectedSessionId) {
      toast.warning("Veuillez sélectionner une classe et une session.");
      return;
    }
    setIsLoading(true);
    try {
      const progId = selectedProgram ? Number(selectedProgram.id) : 0;
      const res = await getLmdDeliberationCohort(
        progId,
        Number(selectedClassId),
        selectedSemester,
        Number(selectedSessionId)
      );
      if (res.success && res.data) {
        setDeliberationData(res.data);
        if (res.data.cohort.length > 0) {
          toast.success(`Délibération chargée : ${res.data.cohort.length} étudiant(s) calculé(s).`);
        } else {
          toast.info("Aucun résultat saisi pour cette promotion et ce semestre.");
        }
      } else {
        setDeliberationData({ ues: [], cohort: [], totalStudents: 0, passedCount: 0, successRate: 0 });
        toast.error(res.error || "Erreur de chargement des délibérations");
      }
    } catch (e) {
      toast.error("Erreur de chargement des délibérations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && selectedSessionId && selectedSemester) {
      loadDeliberationData();
    }
  }, [selectedClassId, selectedSemester, selectedSessionId]);

  const selectedSession = sessions.find((s) => String(s.id) === selectedSessionId);

  // ─── Save / Validate Deliberation ──────────────────────────────────────────
  const handleSaveDeliberation = async () => {
    if (!selectedClassId || !selectedSessionId) return;
    if (deliberationData.cohort.length === 0) {
      toast.error("Aucun étudiant à délibérer");
      return;
    }

    setIsSaving(true);
    try {
      const progId = selectedProgram ? Number(selectedProgram.id) : 0;
      const res = await saveLmdDeliberation({
        programId: progId,
        classId: Number(selectedClassId),
        semester: selectedSemester,
        sessionId: Number(selectedSessionId),
        cohort: deliberationData.cohort,
      });

      if (res.success) {
        toast.success(res.message || "Délibération validée et clôturée avec succès !");
      } else {
        toast.error(res.error || "Erreur de validation");
      }
    } catch (e: any) {
      toast.error("Erreur réseau lors de la validation");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Export Official Deliberation PV (PDF A4 Paysage) ──────────────────────
  const handleExportPDF = async () => {
    if (deliberationData.cohort.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    setIsExportingPdf(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header Box
      doc.setFillColor(248, 250, 252);
      doc.rect(10, 10, pageWidth - 20, 26, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, 10, pageWidth - 20, 26, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("PROCÈS-VERBAL OFFICIEL DE DÉLIBÉRATION SEMESTRIELLE", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const subTitle = `Filière : ${currentSection?.sectionName || selectedProgram?.name || "LMD"} (${selectedLevel})   |   Promotion : ${getClassDisplayName(selectedClass)}   |   ${selectedSemester}   |   Session : ${selectedSession?.sessionName || "Session"}`;
      doc.text(subTitle, pageWidth / 2, 24, { align: "center" });

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Norme LMD : 30 Crédits ECTS / Semestre   •   Seuil de Compensation : 10.00 / 20   •   Note Éliminatoire : < 7.00 / 20`, pageWidth / 2, 30, { align: "center" });

      // Table columns
      const headers = [
        "N°",
        "Matricule",
        "Nom & Prénoms",
        ...deliberationData.ues.map((ue) => `${ue.codeUe}\n(${ue.creditsEcts} ECTS)`),
        "Moyenne\n/20",
        "Crédits\n/30",
        "Décision du Jury",
        "Mention",
        "Rang"
      ];

      const body = deliberationData.cohort.map((item) => {
        const d = item.deliberation;
        const ueGrades = deliberationData.ues.map((ue) => {
          const r = d.ueResults.find((res: any) => res.codeUe === ue.codeUe || res.ueId === ue.id);
          return r ? `${r.average.toFixed(2)} (${r.status})` : "-";
        });

        return [
          item.rank,
          item.student.matricule || "N/A",
          item.student.nom,
          ...ueGrades,
          d.semesterAverage.toFixed(2),
          `${d.creditsAcquired} / 30`,
          d.decision,
          d.mention,
          `${item.rank}e`
        ];
      });

      autoTable(doc, {
        head: [headers],
        body,
        startY: 40,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: "center",
          valign: "middle",
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 24, fontStyle: "bold" },
          2: { cellWidth: 46, halign: "left" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && (data.column.index === headers.length - 3)) {
            const val = String(data.cell.raw || "");
            if (val.includes("Admis")) {
              data.cell.styles.textColor = [5, 150, 105];
              data.cell.styles.fontStyle = "bold";
            } else if (val.includes("Ajourné")) {
              data.cell.styles.textColor = [225, 29, 72];
            }
          }
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 12;
      if (finalY < pageHeight - 35) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(51, 65, 85);

        doc.text("Le Président du Jury :", 20, finalY);
        doc.setFont("helvetica", "normal");
        doc.text("Date et Signature", 20, finalY + 4);
        doc.line(20, finalY + 18, 70, finalY + 18);

        doc.setFont("helvetica", "bold");
        doc.text("Les Assesseurs / Membres du Jury :", pageWidth / 2 - 25, finalY);
        doc.setFont("helvetica", "normal");
        doc.text("Signatures", pageWidth / 2 - 25, finalY + 4);
        doc.line(pageWidth / 2 - 25, finalY + 18, pageWidth / 2 + 35, finalY + 18);

        doc.setFont("helvetica", "bold");
        doc.text("Le Doyen / Chef d'Établissement :", pageWidth - 70, finalY);
        doc.setFont("helvetica", "normal");
        doc.text("Cachet officiel et Approbation", pageWidth - 70, finalY + 4);
        doc.line(pageWidth - 70, finalY + 18, pageWidth - 20, finalY + 18);
      }

      doc.save(`PV_Deliberation_LMD_${selectedSemester}_${selectedClass?.className || "Classe"}.pdf`);
      toast.success("Procès-verbal de délibération exporté en PDF avec succès !");
    } catch (e: any) {
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6">
      {/* ─── HEADER BAR ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/academics/lmd"
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Salle de Délibération du Jury LMD
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="h-3 w-3" /> ECTS REESAO • CAMES
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Moteur de compensation semestrielle inter-UE, calcul des 30 ECTS et procès-verbal officiel du jury
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
            <span>{darkMode ? "Clair" : "Sombre"}</span>
          </button>

          <Button
            onClick={handleExportPDF}
            disabled={deliberationData.cohort.length === 0 || isExportingPdf}
            variant="outline"
            className="gap-2 text-xs font-bold border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
          >
            <Printer className="h-4 w-4" />
            {isExportingPdf ? "Génération PDF..." : "Exporter PV (PDF)"}
          </Button>

          <Button
            onClick={handleSaveDeliberation}
            disabled={deliberationData.cohort.length === 0 || isSaving}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            {isSaving ? "Validation..." : "Valider & Clôturer"}
          </Button>
        </div>
      </div>

      {/* ─── FILTRES ACADÉMIQUES CONFORMES À SETTINGS & NOTES & RÉSULTATS ──────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Filter className="h-4 w-4" />
            </div>
            <span>Filtres de Délibération Académique</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Cascade : Session → Niveau → Filière → Classe → Semestre
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* 1. Session Académique */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Session Académique
            </label>
            <Select value={selectedSessionId} onValueChange={(val) => setSelectedSessionId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Choisir la session" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                    {s.sessionName} {s.isActive || s.status === "Actif" ? "• (Actif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Niveau d'Étude (educational_levels) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Niveau d'Étude
            </label>
            <Select value={selectedLevel} onValueChange={(val) => setSelectedLevel(val || "Licence")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Niveau d'étude" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {academicLevels.map((lvl) => (
                  <SelectItem key={lvl} value={lvl} className="text-xs">
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Section / Filière (school_sections filtrées par niveau) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Section / Filière ({filteredSections.length})
            </label>
            <Select value={selectedSectionId} onValueChange={(val) => setSelectedSectionId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Choisir la filière" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {filteredSections.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs text-slate-400">
                    Aucune section trouvée
                  </SelectItem>
                ) : (
                  filteredSections.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {s.sectionName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Promotion / Classe (school_classes filtrées par sectionId) */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              4. Promotion / Classe ({filteredClasses.length})
            </label>
            <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Choisir la classe" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {filteredClasses.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs text-slate-400">
                    Aucune classe rattachée
                  </SelectItem>
                ) : (
                  filteredClasses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                      {getClassDisplayName(c)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Semestre / Période d'évaluation */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              5. Semestre d'Évaluation
            </label>
            <Select value={selectedSemester} onValueChange={(val) => setSelectedSemester(val || "S1")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10">
                <SelectValue placeholder="Choisir le semestre" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                {periodOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Button & Active Filter Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Sélection active :</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-100 dark:border-indigo-800 text-[11px]">
              <GraduationCap className="h-3 w-3" /> {currentSection?.sectionName || selectedProgram?.name || "Filière"} ({selectedLevel})
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-100 dark:border-emerald-800 text-[11px]">
              <School className="h-3 w-3" /> {getClassDisplayName(selectedClass) || "Classe"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold border border-purple-100 dark:border-purple-800 text-[11px]">
              <Layers className="h-3 w-3" /> {selectedSemester}
            </span>
          </div>

          <Button
            onClick={loadDeliberationData}
            disabled={isLoading || !selectedClassId}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 px-6 h-10 rounded-xl"
          >
            <Search className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Calcul en cours..." : "Afficher la Délibération"}
          </Button>
        </div>
      </div>

      {/* ─── STATISTIQUES EN DIRECT ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Effectif de la Promotion</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{deliberationData.totalStudents}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Étudiants inscrits</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Admis (Validation Semestre)</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{deliberationData.passedCount}</div>
          <div className="text-[10px] text-emerald-600/70 mt-0.5">Moyenne ≥ 10.00 / 20</div>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Ajournés (Rattrapage)</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {deliberationData.totalStudents - deliberationData.passedCount}
          </div>
          <div className="text-[10px] text-rose-600/70 mt-0.5">Moyenne &lt; 10 ou éliminatoire</div>
        </div>

        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">Taux de Réussite Global</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{deliberationData.successRate} %</div>
          <div className="text-[10px] text-indigo-600/70 mt-0.5">Norme ECTS validée</div>
        </div>
      </div>

      {/* ─── TABLEAU DU PROCÈS-VERBAL DE DÉLIBÉRATION ──────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Grille Collective de Délibération du Jury ({selectedSemester})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> V = Validé (≥ 10)
            </span>
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> VC = Compensé (Moy ≥ 10)
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> NV = Non Validé (&lt; 10)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500">
            <RefreshCw className="h-7 w-7 animate-spin mx-auto mb-3 text-indigo-600 dark:text-indigo-400" />
            Calcul des compensations ECTS en temps réel...
          </div>
        ) : deliberationData.cohort.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">Aucun étudiant ou résultat trouvé</div>
            <p className="max-w-md mx-auto">
              Vérifiez que des notes ont bien été saisies pour cette promotion dans la rubrique <strong>Notes & Résultats</strong> pour ce semestre.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white">
                  <th className="p-3 text-center w-12 font-bold">Rang</th>
                  <th className="p-3 font-bold">Étudiant</th>
                  {deliberationData.ues.map((ue) => (
                    <th key={ue.id} className="p-3 text-center font-bold border-l border-slate-800 dark:border-slate-900">
                      <div>{ue.codeUe}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{ue.creditsEcts} ECTS</div>
                    </th>
                  ))}
                  <th className="p-3 text-center font-bold border-l border-slate-800 dark:border-slate-900 bg-slate-800 dark:bg-slate-900">Moyenne /20</th>
                  <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Crédits /30</th>
                  <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Décision</th>
                  <th className="p-3 text-center font-bold bg-slate-800 dark:bg-slate-900">Mention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {deliberationData.cohort.map((item) => {
                  const d = item.deliberation;
                  return (
                    <tr key={item.student.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-500 dark:text-slate-400">
                        {item.rank === 1 ? "🥇 1" : `${item.rank}`}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.student.nom}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.student.matricule || "N/A"}</div>
                      </td>

                      {/* UE Results */}
                      {deliberationData.ues.map((ue) => {
                        const r = d.ueResults.find((res: any) => res.codeUe === ue.codeUe || res.ueId === ue.id);
                        if (!r) return <td key={ue.id} className="p-3 text-center text-slate-300 dark:text-slate-600">-</td>;

                        const isV = r.status === "V";
                        const isVC = r.status === "VC";

                        return (
                          <td key={ue.id} className="p-3 text-center border-l border-slate-100 dark:border-slate-800">
                            <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {r.average.toFixed(2)}
                            </div>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                isV
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                  : isVC
                                  ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300"
                                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                              }`}
                            >
                              {r.status} ({r.creditsAcquired} ECTS)
                            </span>
                          </td>
                        );
                      })}

                      {/* Semester Summary */}
                      <td className="p-3 text-center border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        {d.semesterAverage.toFixed(2)}
                      </td>
                      <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40 font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">
                        {d.creditsAcquired} / 30
                      </td>
                      <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            d.isSemesterValidated
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
                          }`}
                        >
                          {d.decision}
                        </span>
                      </td>
                      <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-semibold">
                        {d.mention}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
