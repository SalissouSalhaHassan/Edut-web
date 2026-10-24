"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  ShieldAlert,
  Brain,
  FileText,
  Copy,
  Download,
  Share2,
  RefreshCw,
  CheckCircle2,
  Users,
  Building2,
  Droplets,
  Zap,
  Globe,
  Sliders,
  ChevronRight,
  Flame,
  ArrowUpRight,
  Bot,
  Lightbulb,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export interface EarlyWarningSchool {
  code: string;
  name: string;
  cycle: string;
  commune: string;
  eleves: number;
  enseignants: number;
  salles: number;
  eau: boolean;
  electricite: boolean;
  attendanceRate?: number; // e.g. 85.5%
  successRate?: number; // e.g. 62.0%
  dropoutRate?: number; // e.g. 14.2%
  statut?: string;
}

interface EarlyWarningProps {
  schools?: EarlyWarningSchool[];
  isDarkMode?: boolean;
}

export default function EarlyWarningAndAiInsights({
  schools = [],
  isDarkMode = false,
}: EarlyWarningProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<"fr" | "ar">("fr");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"dropout" | "executive_summary">("dropout");
  const [filterRiskLevel, setFilterRiskLevel] = useState<"all" | "critical" | "high" | "moderate" | "low">("all");

  // Sample data fallback if empty
  const schoolData: EarlyWarningSchool[] = useMemo(() => {
    if (schools.length > 0) return schools;
    return [
      {
        code: "ETB-2026-067",
        name: "Collège d'Enseignement Général Lazaret (CEG 14)",
        cycle: "Collège",
        commune: "Niamey III",
        eleves: 890,
        enseignants: 16,
        salles: 12,
        eau: false,
        electricite: false,
        attendanceRate: 72.4,
        successRate: 48.5,
        dropoutRate: 18.6,
      },
      {
        code: "ETB-2026-043",
        name: "École Primaire Publique Bobiel B",
        cycle: "Primaire",
        commune: "Niamey I",
        eleves: 481,
        enseignants: 9,
        salles: 8,
        eau: false,
        electricite: true,
        attendanceRate: 78.0,
        successRate: 54.2,
        dropoutRate: 12.8,
      },
      {
        code: "ETB-2026-115",
        name: "École Communautaire Zinder Sabon Gari",
        cycle: "Primaire",
        commune: "Zinder 1",
        eleves: 520,
        enseignants: 8,
        salles: 7,
        eau: false,
        electricite: false,
        attendanceRate: 75.2,
        successRate: 51.0,
        dropoutRate: 15.4,
      },
      {
        code: "ETB-2026-018",
        name: "Complexe Scolaire Excellence Yantala",
        cycle: "Lycée",
        commune: "Niamey I",
        eleves: 642,
        enseignants: 24,
        salles: 18,
        eau: true,
        electricite: true,
        attendanceRate: 94.6,
        successRate: 88.2,
        dropoutRate: 2.1,
      },
      {
        code: "ETB-2026-001",
        name: "Université Privée Internationale Aboubacar Ibrahim",
        cycle: "Supérieur",
        commune: "Maradi 1",
        eleves: 364,
        enseignants: 16,
        salles: 19,
        eau: true,
        electricite: true,
        attendanceRate: 96.0,
        successRate: 91.5,
        dropoutRate: 1.4,
      },
      {
        code: "ETB-2026-165",
        name: "Complexe Scolaire Tahoua Ader",
        cycle: "Collège",
        commune: "Tahoua 1",
        eleves: 410,
        enseignants: 10,
        salles: 8,
        eau: true,
        electricite: false,
        attendanceRate: 83.0,
        successRate: 64.0,
        dropoutRate: 8.5,
      },
    ];
  }, [schools]);

  // Compute Dropout Risk Index (0 - 100)
  const evaluatedSchools = useMemo(() => {
    return schoolData.map((s) => {
      const attendance = s.attendanceRate ?? 85;
      const success = s.successRate ?? 70;
      const pupilTeacherRatio = s.eleves / (s.enseignants || 1);
      const pupilRoomRatio = s.eleves / (s.salles || 1);

      // Weight breakdown:
      // 1. Attendance penalty (weight: 35%)
      const attendancePenalty = Math.max(0, (95 - attendance) * 2);
      // 2. Success rate penalty (weight: 35%)
      const academicPenalty = Math.max(0, (80 - success) * 1.5);
      // 3. Infrastructure penalty (weight: 15%)
      const infraPenalty = (!s.eau ? 10 : 0) + (!s.electricite ? 8 : 0);
      // 4. Overcrowding penalty (weight: 15%)
      const crowdingPenalty = pupilTeacherRatio > 40 ? 12 : (pupilTeacherRatio > 30 ? 6 : 0);

      const rawScore = attendancePenalty + academicPenalty + infraPenalty + crowdingPenalty;
      const riskScore = Math.min(100, Math.max(5, Math.round(rawScore)));

      let tier: "critical" | "high" | "moderate" | "low" = "low";
      let tierLabelFr = "Faible Risque";
      let tierLabelAr = "خطر منخفض";
      let color = "#10b981"; // emerald

      if (riskScore >= 75) {
        tier = "critical";
        tierLabelFr = "Décrochage Critique";
        tierLabelAr = "خطر تسرب حرج";
        color = "#ef4444"; // red
      } else if (riskScore >= 50) {
        tier = "high";
        tierLabelFr = "Risque Élevé";
        tierLabelAr = "خطر تسرب مرتفع";
        color = "#f97316"; // orange
      } else if (riskScore >= 30) {
        tier = "moderate";
        tierLabelFr = "Vigilance Modérée";
        tierLabelAr = "يقظة ومتابعة";
        color = "#eab308"; // amber
      }

      // Prescriptive automated recommendations
      const recommendationsFr: string[] = [];
      const recommendationsAr: string[] = [];

      if (attendance < 80) {
        recommendationsFr.push("Alerte immédiate aux comités de gestion (COGES) et tuteurs pour absentéisme répété.");
        recommendationsAr.push("تنبيه فوري للجان تسيير المؤسسات وأولياء الأمور بسبب الغياب المتكرر.");
      }
      if (success < 60) {
        recommendationsFr.push("Mise en place d'un tutorat et de sessions de remédiation pédagogique ciblées.");
        recommendationsAr.push("إطلاق حصص استدراك ودعم تربوي مكثف في المواد الأساسية.");
      }
      if (!s.eau || !s.electricite) {
        recommendationsFr.push("Demande d'intervention d'urgence auprès de la Direction des Infrastructures Scolaires.");
        recommendationsAr.push("رفع طلب تدخل عاجل لإمداد المدرسة بنقطة ماء صالحة للشرب وشبكة طاقة.");
      }
      if (pupilTeacherRatio > 40) {
        recommendationsFr.push(`Affectation prioritaire de renforts enseignants (Ratio actuel critique: ${Math.round(pupilTeacherRatio)} él/ens).`);
        recommendationsAr.push(`إعادة توزيع وتعيين معلمين إضافيين لخفض الاكتظاظ (النسبة الحالية: ${Math.round(pupilTeacherRatio)} تلميذ/أستاذ).`);
      }

      return {
        ...s,
        riskScore,
        tier,
        tierLabelFr,
        tierLabelAr,
        color,
        recommendationsFr,
        recommendationsAr,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [schoolData]);

  // Filtered schools
  const filteredList = useMemo(() => {
    if (filterRiskLevel === "all") return evaluatedSchools;
    return evaluatedSchools.filter((s) => s.tier === filterRiskLevel);
  }, [evaluatedSchools, filterRiskLevel]);

  // Overall Statistics
  const overallMetrics = useMemo(() => {
    const total = evaluatedSchools.length;
    const criticalCount = evaluatedSchools.filter(s => s.tier === "critical").length;
    const highCount = evaluatedSchools.filter(s => s.tier === "high").length;
    const moderateCount = evaluatedSchools.filter(s => s.tier === "moderate").length;
    const lowCount = evaluatedSchools.filter(s => s.tier === "low").length;
    const avgRisk = Math.round(evaluatedSchools.reduce((a, b) => a + b.riskScore, 0) / (total || 1));

    return { total, criticalCount, highCount, moderateCount, lowCount, avgRisk };
  }, [evaluatedSchools]);

  // Executive Summary Narrative State
  const [executiveSummaryText, setExecutiveSummaryText] = useState(() => {
    return generateExecutiveText(evaluatedSchools, "fr");
  });

  function generateExecutiveText(schoolsList: typeof evaluatedSchools, lang: "fr" | "ar") {
    const criticals = schoolsList.filter(s => s.tier === "critical");
    const highs = schoolsList.filter(s => s.tier === "high");
    const totalStudentsAtRisk = [...criticals, ...highs].reduce((acc, s) => acc + s.eleves, 0);

    if (lang === "ar") {
      return (
`# 📑 التقرير التنفيذي الذكي: رصد المخاطر واستراتيجية مكافحة التسرب المدرسي
**التاريخ:** ${new Date().toLocaleDateString("ar-SA")}  |  **النظام:** Edut Pro - الذكاء الاصطناعي للتحليل التنبؤي

---

### 1. 📊 المؤشرات العامة والتشخيص الاستراتيجي:
- **إجمالي المؤسسات المشمولة بالرصد:** ${schoolsList.length} مؤسسة تعليمية.
- **مؤسسات في منطقة الخطر الحرج (Décrochage Critique):** ${criticals.length} مؤسسة تحتاج تدخلاً فورياً.
- **إجمالي الطلاب المهددين بالتسرب أو الرسوب:** ${totalStudentsAtRisk.toLocaleString("ar-SA")} تلميذ وتلميذة.
- **متوسط مؤشر الهشاشة المدرسية العام:** ${Math.round(schoolsList.reduce((a,b)=>a+b.riskScore,0)/schoolsList.length)}%

---

### 2. 🚨 أهم بؤر التوتر والمخاطر المرصودة:
${criticals.map(c => `• **${c.name} (${c.commune}):** مؤشر خطر **${c.riskScore}%** | نسبة الحضور **${c.attendanceRate}%** | نسبة النجاح **${c.successRate}%** | ${!c.eau ? '⚠️ تفتقر للماء' : ''} ${!c.electricite ? '⚠️ تفتقر للكهرباء' : ''}`).join("\n")}

---

### 3. 🎯 خطة العمل التنفيذية الموصى بها للوزارة والمفتشيات:
1. **التدخل التربوي الاستعجالي:** تفعيل برامج الاستدراك والدعم المركز في المؤسسات ذات النجاح الأقل من 55%.
2. **بروتوكول التواصل الآلي:** إطلاق حملة رسائل وإشعارات فورية عبر WhatsApp لأولياء الأمور لرصد الغيابات المتكررة.
3. **الدعم اللوجستي للبنية التحتية:** برمجة أولويات حفر آبار وتركيب ألواح طاقة شمسية في المدارس المصنفة باللون الأحمر.`
      );
    }

    return (
`# 📑 RAPPORT EXÉCUTIF IA : DÉTECTION DU DÉCROCHAGE SCOLAIRE & PLAN D'ACTION
**Date d'émission :** ${new Date().toLocaleDateString("fr-FR")}  |  **Plateforme :** Edut Pro Analytics & Early Warning Engine

---

### 1. 📊 DIAGNOSTIC GLOBAL & SYNTHÈSE STATISTIQUE
- **Périmètre audité :** ${schoolsList.length} établissements scolaires.
- **Établissements en Alerte Critique :** ${criticals.length} structures nécessitent un arbitrage immédiat.
- **Effectif cumulé en situation de vulnérabilité :** ${totalStudentsAtRisk.toLocaleString("fr-FR")} élèves à risque de déscolarisation.
- **Indice moyen de vulnérabilité académique :** ${Math.round(schoolsList.reduce((a,b)=>a+b.riskScore,0)/schoolsList.length)}%

---

### 2. 🚨 CARTOGRAPHIE DES POINTS CHAUDS & RISQUES MAJEURS
${criticals.map(c => `• **${c.name} (${c.commune}) :** Indice de risque **${c.riskScore}%** | Taux d'assiduité **${c.attendanceRate}%** | Réussite **${c.successRate}%** | ${!c.eau ? '💧 Sans eau' : ''} ${!c.electricite ? '⚡ Sans élec' : ''}`).join("\n")}

---

### 3. 🎯 PLAN D'INTERVENTION STRATÉGIQUE PRIORITAIRE (MINISTÈRE & INSPECTIONS)
1. **Déploiement Pédagogique d'Urgence :** Instauration d'heures de remédiation intensive dans les disciplines clés pour les écoles sous la barre des 55% de réussite.
2. **Mobilisation Communautaire & Numérique :** Déclenchement d'alertes automatisées par WhatsApp/SMS vers les tuteurs pour juguler les absences chroniques.
3. **Rattrapage d'Infrastructures Essentielles :** Priorisation absolue des dotations en eau potable et électrification solaire pour stabiliser l'environnement d'apprentissage.`
    );
  }

  // Handle Regenerate
  const handleRegenerateSummary = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setExecutiveSummaryText(generateExecutiveText(evaluatedSchools, selectedLanguage));
      setIsGenerating(false);
      toast.success("Synthèse exécutive actualisée avec succès par l'IA !");
    }, 600);
  };

  // Toggle Language
  const handleLanguageSwitch = (lang: "fr" | "ar") => {
    setSelectedLanguage(lang);
    setExecutiveSummaryText(generateExecutiveText(evaluatedSchools, lang));
  };

  // Copy Executive Summary
  const handleCopySummary = () => {
    navigator.clipboard.writeText(executiveSummaryText);
    toast.success("Rapport exécutif copié dans le presse-papiers !");
  };

  // Export Executive Summary to PDF
  const handleExportSummaryPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("RÉPUBLIQUE DU NIGER", 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("Ministère de l'Éducation Nationale — Synthèse IA Early Warning", 14, 22);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("RAPPORT STRATÉGIQUE DE DÉTECTION DU DÉCROCHAGE SCOLAIRE", 14, 32);

      const splitText = doc.splitTextToSize(
        executiveSummaryText.replace(/[*#]/g, ""),
        180
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(splitText, 14, 42);

      doc.save(`Edut_Rapport_Executif_IA_${Date.now()}.pdf`);
      toast.success("Rapport PDF exécutif téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  return (
    <div className={cn("space-y-6 w-full transition-colors duration-300", isDarkMode ? "dark text-slate-100" : "text-slate-900")}>
      {/* Top Banner & Control Deck */}
      <div className={cn(
        "relative rounded-3xl border p-6 overflow-hidden shadow-xl transition-all",
        isDarkMode
          ? "bg-gradient-to-br from-[#0e1322] via-[#12192c] to-[#0b0e18] border-slate-800"
          : "bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border-indigo-900"
      )}>
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 size-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 shadow-lg shadow-orange-500/30">
              <Brain className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  Système d'Alerte Précoce & IA Analytique
                  <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                    Smart AI Engine
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                Modèle prédictif de détection du risque de décrochage scolaire, croisant assiduité, performances aux examens et état des infrastructures.
              </p>
            </div>
          </div>

          {/* Navigation Pill Buttons */}
          <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md">
            <button
              onClick={() => setActiveTab("dropout")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                activeTab === "dropout"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Flame size={15} />
              <span>Indicateur Décrochage</span>
            </button>
            <button
              onClick={() => setActiveTab("executive_summary")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                activeTab === "executive_summary"
                  ? "bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 shadow-lg shadow-teal-500/20"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Bot size={15} />
              <span>Rapport Exécutif IA</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-3 backdrop-blur-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Établissements Audités</span>
            <span className="text-2xl font-black text-white">{overallMetrics.total}</span>
          </div>

          <div className="rounded-2xl bg-red-950/30 border border-red-500/30 p-3 backdrop-blur-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block flex items-center gap-1">
              <AlertTriangle size={12} /> Alerte Critique
            </span>
            <span className="text-2xl font-black text-red-400">{overallMetrics.criticalCount}</span>
          </div>

          <div className="rounded-2xl bg-orange-950/30 border border-orange-500/30 p-3 backdrop-blur-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block flex items-center gap-1">
              <Flame size={12} /> Risque Élevé
            </span>
            <span className="text-2xl font-black text-orange-400">{overallMetrics.highCount}</span>
          </div>

          <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-3 backdrop-blur-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block flex items-center gap-1">
              <CheckCircle2 size={12} /> Situations Saines
            </span>
            <span className="text-2xl font-black text-emerald-400">{overallMetrics.lowCount}</span>
          </div>
        </div>
      </div>

      {/* TAB 1: INDICE DE RISQUE DU DÉCROCHAGE SCOLAIRE */}
      {activeTab === "dropout" && (
        <div className="space-y-6">
          {/* Risk Level Filter Pill */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterRiskLevel("all")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold border transition",
                  filterRiskLevel === "all"
                    ? "bg-slate-900 text-white border-slate-700 dark:bg-white dark:text-slate-900"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                Tous ({overallMetrics.total})
              </button>
              <button
                onClick={() => setFilterRiskLevel("critical")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold border transition",
                  filterRiskLevel === "critical"
                    ? "bg-red-500 text-white border-red-600"
                    : "border-red-500/30 text-red-500 hover:bg-red-500/10"
                )}
              >
                Critique (&gt;75%) ({overallMetrics.criticalCount})
              </button>
              <button
                onClick={() => setFilterRiskLevel("high")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold border transition",
                  filterRiskLevel === "high"
                    ? "bg-orange-500 text-white border-orange-600"
                    : "border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
                )}
              >
                Élevé (50-74%) ({overallMetrics.highCount})
              </button>
              <button
                onClick={() => setFilterRiskLevel("moderate")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold border transition",
                  filterRiskLevel === "moderate"
                    ? "bg-amber-500 text-slate-950 border-amber-600"
                    : "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                )}
              >
                Modéré (30-49%) ({overallMetrics.moderateCount})
              </button>
              <button
                onClick={() => setFilterRiskLevel("low")}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-bold border transition",
                  filterRiskLevel === "low"
                    ? "bg-emerald-500 text-white border-emerald-600"
                    : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                )}
              >
                Faible (&lt;30%) ({overallMetrics.lowCount})
              </button>
            </div>

            <span className="text-xs text-slate-400">
              {filteredList.length} établissement(s) répertorié(s)
            </span>
          </div>

          {/* School Dropout Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((school) => (
              <div
                key={school.code}
                className={cn(
                  "rounded-3xl border p-5 transition-all duration-300 hover:shadow-xl flex flex-col justify-between",
                  isDarkMode
                    ? "bg-[#111624] border-slate-800/80 hover:border-slate-700"
                    : "bg-white border-slate-200/80 hover:border-slate-300"
                )}
              >
                <div>
                  {/* Card Top: Code & Risk Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {school.code}
                      </span>
                      <h3 className="mt-1 text-sm font-black text-slate-900 dark:text-white leading-snug">
                        {school.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {school.commune} • {school.cycle}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black"
                        style={{
                          backgroundColor: `${school.color}20`,
                          color: school.color,
                          border: `1px solid ${school.color}40`,
                        }}
                      >
                        {school.riskScore}%
                      </span>
                      <span className="block text-[9px] font-bold text-slate-400 mt-0.5">
                        {school.tierLabelFr}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar of Risk */}
                  <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${school.riskScore}%`,
                        backgroundColor: school.color,
                      }}
                    />
                  </div>

                  {/* Academic Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Assiduité</span>
                      <span className={cn(
                        "text-xs font-black",
                        (school.attendanceRate || 0) < 80 ? "text-red-500" : "text-emerald-500"
                      )}>
                        {school.attendanceRate}%
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Réussite</span>
                      <span className={cn(
                        "text-xs font-black",
                        (school.successRate || 0) < 60 ? "text-orange-500" : "text-emerald-500"
                      )}>
                        {school.successRate}%
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-2 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Eau / Élec</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {school.eau ? "💧" : "❌"} {school.electricite ? "⚡" : "❌"}
                      </span>
                    </div>
                  </div>

                  {/* Automated Prescriptive Recommendations */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Lightbulb size={12} className="text-amber-500" />
                      Plan d'Action Recommandé :
                    </span>
                    {school.recommendationsFr.map((rec, i) => (
                      <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5 leading-relaxed">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Quick Trigger WhatsApp */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {school.eleves} élèves concernés
                  </span>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `*ALERTE EDUT PRO - RISQUE DE DÉCROCHAGE SCOLAIRE*\nÉtablissement: ${school.name} (${school.code})\nIndice de risque: ${school.riskScore}%\nAssiduité: ${school.attendanceRate}%\nTaux de réussite: ${school.successRate}%\nRecommandation urgente: ${school.recommendationsFr[0] || 'Intervention pédagogique requise'}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold transition"
                  >
                    <span>Diffuser Alerte</span>
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: RAPPORT EXÉCUTIF IA POUR LA DIRECTION & LE MINISTÈRE */}
      {activeTab === "executive_summary" && (
        <div className={cn(
          "rounded-3xl border p-6 md:p-8 space-y-6 shadow-xl transition-all",
          isDarkMode ? "bg-[#111624] border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        )}>
          {/* Header Controls for Executive Briefing */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Synthèse Stratégique Générée par l'IA
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Document officiel de cadrage pour la Direction Générale et les Inspecteurs
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Language Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => handleLanguageSwitch("fr")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-bold transition",
                    selectedLanguage === "fr"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Français 🇫🇷
                </button>
                <button
                  onClick={() => handleLanguageSwitch("ar")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-bold transition",
                    selectedLanguage === "ar"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  العربية 🇸🇦
                </button>
              </div>

              {/* Regenerate Button */}
              <button
                onClick={handleRegenerateSummary}
                disabled={isGenerating}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw size={14} className={cn(isGenerating && "animate-spin text-teal-500")} />
                <span>Actualiser</span>
              </button>

              {/* Copy Button */}
              <button
                onClick={handleCopySummary}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Copy size={14} />
                <span>Copier</span>
              </button>

              {/* Export PDF Button */}
              <button
                onClick={handleExportSummaryPdf}
                className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md shadow-teal-500/20 hover:brightness-110 transition"
              >
                <Download size={14} />
                <span>Télécharger PDF</span>
              </button>
            </div>
          </div>

          {/* Rendered Markdown Preview Area */}
          <div
            dir={selectedLanguage === "ar" ? "rtl" : "ltr"}
            className={cn(
              "rounded-2xl p-6 border font-sans leading-relaxed text-sm whitespace-pre-wrap select-text",
              isDarkMode
                ? "bg-slate-950/70 border-slate-800/90 text-slate-200"
                : "bg-slate-50 border-slate-200 text-slate-800"
            )}
          >
            {executiveSummaryText}
          </div>
        </div>
      )}
    </div>
  );
}
