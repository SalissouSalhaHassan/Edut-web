"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Scale, ArrowLeft, Download, CheckCircle2, 
  AlertTriangle, RefreshCw, Sparkles, Filter, 
  UserCheck, ShieldCheck, FileSpreadsheet, Printer, Award,
  Calendar, Layers, School, GraduationCap, Search, CheckCircle,
  HelpCircle, BookOpen, AlertCircle
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

type Props = {
  initialPrograms: any[];
  classes: any[];
  sessions: any[];
  periods?: any[];
};

export default function DeliberationClient({
  initialPrograms,
  classes,
  sessions,
  periods = [],
}: Props) {
  const [programs] = useState(initialPrograms);

  // 1. Session Académique (défaut sur session active)
  const activeSession = sessions.find((s) => s.isActive || s.status === "Actif") || sessions[0];
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    activeSession ? String(activeSession.id) : ""
  );

  // 2. Cycle / Niveau LMD (Tous, Licence, Master, Doctorat)
  const [selectedCycle, setSelectedCycle] = useState<string>("Tous");

  // 3. Filière LMD filtrée par Cycle
  const filteredPrograms = useMemo(() => {
    if (!selectedCycle || selectedCycle === "Tous") return programs;
    return programs.filter((p) => {
      const level = (p.degreeLevel || "Licence").toLowerCase();
      return level.includes(selectedCycle.toLowerCase());
    });
  }, [programs, selectedCycle]);

  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    filteredPrograms.length > 0 ? String(filteredPrograms[0].id) : ""
  );

  // Auto-switch program if current is not in filteredPrograms
  useEffect(() => {
    if (filteredPrograms.length > 0) {
      const exists = filteredPrograms.some((p) => String(p.id) === selectedProgramId);
      if (!exists) {
        setSelectedProgramId(String(filteredPrograms[0].id));
      }
    } else {
      setSelectedProgramId("");
    }
  }, [filteredPrograms]);

  const selectedProgram = programs.find((p) => String(p.id) === selectedProgramId);

  // 4. Promotions / Classes filtrées strictement par Filière (sectionId)
  const filteredClasses = useMemo(() => {
    if (!selectedProgram) return classes;
    if (selectedProgram.sectionId) {
      const matched = classes.filter((c) => c.sectionId === selectedProgram.sectionId);
      return matched.length > 0 ? matched : classes;
    }
    const progName = (selectedProgram.name || "").toLowerCase();
    const matched = classes.filter((c) => 
      (c.className || "").toLowerCase().includes(progName) || 
      (c.section?.sectionName || "").toLowerCase().includes(progName)
    );
    return matched.length > 0 ? matched : classes;
  }, [selectedProgram, classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(
    filteredClasses.length > 0 ? String(filteredClasses[0].id) : (classes[0] ? String(classes[0].id) : "")
  );

  // Auto-switch class when program changes
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const exists = filteredClasses.some((c) => String(c.id) === selectedClassId);
      if (!exists) {
        setSelectedClassId(String(filteredClasses[0].id));
      }
    } else {
      setSelectedClassId("");
    }
  }, [selectedProgramId, filteredClasses]);

  // 5. Semestres adaptés au cursus (Licence: S1-S6, Master: S1-S4)
  const availableSemesters = useMemo(() => {
    const isMaster = selectedProgram?.degreeLevel === "Master";
    const maxSem = isMaster ? 4 : 6;
    const list = [];
    for (let i = 1; i <= maxSem; i++) {
      const sCode = `S${i}`;
      const matchingPeriod = periods.find((p) => 
        (p.name || "").toLowerCase().includes(`semestre ${i}`) || 
        (p.name || "").toLowerCase().includes(`s${i}`)
      );
      list.push({
        code: sCode,
        label: matchingPeriod ? `${matchingPeriod.name} (${sCode})` : `Semestre ${i} (${sCode})`,
      });
    }
    return list;
  }, [selectedProgram, periods]);

  const [selectedSemester, setSelectedSemester] = useState<string>("S1");

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
    if (!selectedProgramId || !selectedClassId || !selectedSessionId) return;
    setIsLoading(true);
    try {
      const res = await getLmdDeliberationCohort(
        Number(selectedProgramId),
        Number(selectedClassId),
        selectedSemester,
        Number(selectedSessionId)
      );
      if (res.success && res.data) {
        setDeliberationData(res.data);
      } else {
        setDeliberationData({ ues: [], cohort: [], totalStudents: 0, passedCount: 0, successRate: 0 });
      }
    } catch (e) {
      toast.error("Erreur de chargement des délibérations");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProgramId && selectedClassId && selectedSessionId) {
      loadDeliberationData();
    }
  }, [selectedProgramId, selectedClassId, selectedSemester, selectedSessionId]);

  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);
  const selectedSession = sessions.find((s) => String(s.id) === selectedSessionId);

  // ─── Save / Validate Deliberation ──────────────────────────────────────────
  const handleSaveDeliberation = async () => {
    if (!selectedProgramId || !selectedClassId || !selectedSessionId) return;
    if (deliberationData.cohort.length === 0) {
      toast.error("Aucun étudiant à délibérer");
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveLmdDeliberation({
        programId: Number(selectedProgramId),
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
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("PROCÈS-VERBAL OFFICIEL DE DÉLIBÉRATION SEMESTRIELLE", pageWidth / 2, 18, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105); // slate-600
      const subTitle = `Filière : ${selectedProgram?.name || "LMD"} (${selectedProgram?.degreeLevel || "Licence"})   |   Promotion : ${selectedClass?.className || "Classe"}   |   ${selectedSemester}   |   Session : ${selectedSession?.sessionName || "2025-2026"}`;
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

      // Table rows
      const body = deliberationData.cohort.map((item) => {
        const d = item.deliberation;
        const ueGrades = deliberationData.ues.map((ue) => {
          const res = d.ueResults.find((r: any) => r.codeUe === ue.codeUe || r.ueId === ue.id);
          if (!res) return "-";
          return `${res.average.toFixed(2)} [${res.status}]`;
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
        body: body,
        startY: 40,
        margin: { left: 10, right: 10 },
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
          fontSize: 7.5,
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 24, halign: "left" },
          2: { cellWidth: 42, halign: "left", fontStyle: "bold" },
        },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index >= 3 + deliberationData.ues.length) {
            const val = String(data.cell.raw);
            if (val.includes("Admis")) {
              data.cell.styles.textColor = [5, 150, 105];
              data.cell.styles.fontStyle = "bold";
            } else if (val.includes("Ajourné")) {
              data.cell.styles.textColor = [225, 29, 72];
            }
          }
        },
      });

      // Signatures zone at bottom
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
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-6">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/academics/lmd"
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Salle de Délibération du Jury LMD
            </h1>
            <p className="text-xs text-slate-500">
              Compensation semestrielle automatique, capitalisation des 30 ECTS et PV officiel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportPDF}
            disabled={deliberationData.cohort.length === 0 || isExportingPdf}
            variant="outline"
            className="gap-2 text-xs font-bold border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <Printer className="h-4 w-4" />
            {isExportingPdf ? "Génération PDF..." : "Exporter PV Officiel (PDF)"}
          </Button>

          <Button
            onClick={handleSaveDeliberation}
            disabled={deliberationData.cohort.length === 0 || isSaving}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            {isSaving ? "Validation en cours..." : "Valider & Clôturer Délibération"}
          </Button>
        </div>
      </div>

      {/* ─── FILTRES ACADÉMIQUES CONFORMES À NOTES & RÉSULTATS ───────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold text-slate-700">
          <Filter className="h-4 w-4 text-indigo-600" />
          <span>Filtres de Délibération Universitaire</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* 1. Session Académique */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              1. Session Académique
            </label>
            <Select value={selectedSessionId} onValueChange={(val) => setSelectedSessionId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 border-slate-200">
                <SelectValue placeholder="Sélectionner la session" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                    {s.sessionName} {s.isActive || s.status === "Actif" ? "• (Actif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Cycle / Niveau LMD */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              2. Cycle / Diplôme
            </label>
            <Select value={selectedCycle} onValueChange={(val) => setSelectedCycle(val || "Tous")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 border-slate-200">
                <SelectValue placeholder="Cycle LMD" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tous" className="text-xs">Tous les cycles</SelectItem>
                <SelectItem value="Licence" className="text-xs">Licence (L1 - L3)</SelectItem>
                <SelectItem value="Master" className="text-xs">Master (M1 - M2)</SelectItem>
                <SelectItem value="Doctorat" className="text-xs">Doctorat (D1 - D3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Filière LMD */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              3. Filière LMD
            </label>
            <Select value={selectedProgramId} onValueChange={(val) => setSelectedProgramId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 border-slate-200">
                <SelectValue placeholder="Choisir la filière" />
              </SelectTrigger>
              <SelectContent>
                {filteredPrograms.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {p.name} ({p.degreeLevel || "Licence"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Promotion / Classe (Filtrée dynamiquement) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              4. Promotion / Classe ({filteredClasses.length})
            </label>
            <Select value={selectedClassId} onValueChange={(val) => setSelectedClassId(val || "")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 border-slate-200">
                <SelectValue placeholder="Sélectionner la classe" />
              </SelectTrigger>
              <SelectContent>
                {filteredClasses.length === 0 ? (
                  <SelectItem value="none" disabled className="text-xs text-slate-400">
                    Aucune classe rattachée
                  </SelectItem>
                ) : (
                  filteredClasses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                      {c.className}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Semestre */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              5. Semestre d'Évaluation
            </label>
            <Select value={selectedSemester} onValueChange={(val) => setSelectedSemester(val || "S1")}>
              <SelectTrigger className="w-full text-xs font-medium bg-slate-50 border-slate-200">
                <SelectValue placeholder="Choisir le semestre" />
              </SelectTrigger>
              <SelectContent>
                {availableSemesters.map((s) => (
                  <SelectItem key={s.code} value={s.code} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Button & Active Filter Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Sélection active :</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
              <GraduationCap className="h-3 w-3" /> {selectedProgram?.name || "Filière"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
              <School className="h-3 w-3" /> {selectedClass?.className || "Classe"}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-100">
              <Layers className="h-3 w-3" /> {selectedSemester}
            </span>
          </div>

          <Button
            onClick={loadDeliberationData}
            disabled={isLoading || !selectedProgramId || !selectedClassId}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
          >
            <Search className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Chargement en cours..." : "Afficher la Délibération"}
          </Button>
        </div>
      </div>

      {/* ─── STATISTIQUES EN DIRECT ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Effectif de la promotion</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{deliberationData.totalStudents}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600">Admis (Validation Semestre)</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{deliberationData.passedCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-rose-600">Ajournés (Rattrapage)</div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {deliberationData.totalStudents - deliberationData.passedCount}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-600">Taux de Réussite</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{deliberationData.successRate} %</div>
        </div>
      </div>

      {/* ─── TABLEAU DU PROCÈS-VERBAL DE DÉLIBÉRATION ──────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-600" />
            <span className="font-bold text-sm text-slate-800">
              Grille Collective de Délibération du Jury ({selectedSemester})
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> V = Validé (Note ≥ 10)
            </span>
            <span className="flex items-center gap-1 text-indigo-600">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> VC = Compensé (Moy ≥ 10)
            </span>
            <span className="flex items-center gap-1 text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> NV = Non Validé (&lt; 10)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Calcul des compensations LMD en temps réel...
          </div>
        ) : deliberationData.cohort.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            Aucun étudiant trouvé dans cette promotion ou aucune note saisie pour ce semestre.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-900 text-white">
                  <th className="p-3 text-center w-12 font-bold">Rang</th>
                  <th className="p-3 font-bold">Étudiant</th>
                  {deliberationData.ues.map((ue) => (
                    <th key={ue.id} className="p-3 text-center font-bold border-l border-slate-800">
                      <div>{ue.codeUe}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{ue.creditsEcts} ECTS</div>
                    </th>
                  ))}
                  <th className="p-3 text-center font-bold border-l border-slate-800 bg-slate-800">Moyenne /20</th>
                  <th className="p-3 text-center font-bold bg-slate-800">Crédits /30</th>
                  <th className="p-3 text-center font-bold bg-slate-800">Décision</th>
                  <th className="p-3 text-center font-bold bg-slate-800">Mention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {deliberationData.cohort.map((item) => {
                  const d = item.deliberation;
                  return (
                    <tr key={item.student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-500">
                        {item.rank === 1 ? "🥇 1" : `${item.rank}`}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{item.student.nom}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.student.matricule || "N/A"}</div>
                      </td>

                      {/* UE Results */}
                      {deliberationData.ues.map((ue) => {
                        const r = d.ueResults.find((res: any) => res.codeUe === ue.codeUe || res.ueId === ue.id);
                        if (!r) return <td key={ue.id} className="p-3 text-center text-slate-300">-</td>;

                        const isV = r.status === "V";
                        const isVC = r.status === "VC";

                        return (
                          <td key={ue.id} className="p-3 text-center border-l border-slate-100">
                            <div className="font-mono font-bold text-slate-800">
                              {r.average.toFixed(2)}
                            </div>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                isV
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isVC
                                  ? "bg-indigo-100 text-indigo-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {r.status} ({r.creditsAcquired} ECTS)
                            </span>
                          </td>
                        );
                      })}

                      {/* Semester Summary */}
                      <td className="p-3 text-center border-l border-slate-200 bg-slate-50/50 font-mono font-bold text-sm text-slate-900">
                        {d.semesterAverage.toFixed(2)}
                      </td>
                      <td className="p-3 text-center bg-slate-50/50 font-mono font-bold text-xs text-indigo-700">
                        {d.creditsAcquired} / 30
                      </td>
                      <td className="p-3 text-center bg-slate-50/50">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            d.isSemesterValidated
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {d.decision}
                        </span>
                      </td>
                      <td className="p-3 text-center bg-slate-50/50 text-slate-600 font-semibold">
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
