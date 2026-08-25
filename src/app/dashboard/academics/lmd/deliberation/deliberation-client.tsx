"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { 
  Scale, ArrowLeft, Download, CheckCircle2, 
  AlertTriangle, RefreshCw, Sparkles, Filter, 
  UserCheck, ShieldCheck, FileSpreadsheet, Printer, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  getLmdDeliberationCohort, 
  saveLmdDeliberation 
} from "@/domains/academics/actions/lmd.actions";

type Props = {
  initialPrograms: any[];
  classes: any[];
  sessions: any[];
};

export default function DeliberationClient({
  initialPrograms,
  classes,
  sessions,
}: Props) {
  const [programs] = useState(initialPrograms);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    programs.length > 0 ? programs[0].id : null
  );
  const [selectedClassId, setSelectedClassId] = useState<number | null>(
    classes.length > 0 ? classes[0].id : null
  );
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    sessions.length > 0 ? sessions[0].id : null
  );
  const [selectedSemester, setSelectedSemester] = useState<string>("S1");

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
  const [isPending, startTransition] = useTransition();

  const loadDeliberationData = async () => {
    if (!selectedProgramId || !selectedClassId || !selectedSessionId) return;
    setIsLoading(true);
    try {
      const res = await getLmdDeliberationCohort(
        selectedProgramId,
        selectedClassId,
        selectedSemester,
        selectedSessionId
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
    loadDeliberationData();
  }, [selectedProgramId, selectedClassId, selectedSemester, selectedSessionId]);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

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
        programId: selectedProgramId,
        classId: selectedClassId,
        semester: selectedSemester,
        sessionId: selectedSessionId,
        cohort: deliberationData.cohort,
      });

      if (res.success) {
        toast.success("Délibération officielle enregistrée et validée avec succès !");
      } else {
        toast.error(res.error || "Erreur d'enregistrement");
      }
    } catch (e: any) {
      toast.error("Erreur critique lors de la validation");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Export Official Deliberation PDF ───────────────────────────────────────
  const handleExportPDF = async () => {
    if (deliberationData.cohort.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header Bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 24, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("PROCÈS-VERBAL OFFICIEL DE DÉLIBÉRATION DU JURY LMD", pageWidth / 2, 11, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `FILIÈRE : ${selectedProgram?.name || ""} | CLASSE : ${selectedClass?.className || ""} | SEMESTRE : ${selectedSemester} | SESSION : ${selectedSession?.sessionName || ""}`,
        pageWidth / 2,
        18,
        { align: "center" }
      );

      // Summary Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, pageWidth - 28, 12, 2, 2, "F");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Effectif Total : ${deliberationData.totalStudents}  |  Admis : ${deliberationData.passedCount}  |  Taux de Réussite : ${deliberationData.successRate}%  |  Objectif ECTS : 30 Crédits  |  Date : ${new Date().toLocaleDateString("fr-FR")}`,
        pageWidth / 2,
        35.5,
        { align: "center" }
      );

      // Build Headers
      const dynamicUeHeaders = deliberationData.ues.map((u) => `${u.codeUe}\n(${u.creditsEcts} ECTS)`);
      const tableHeaders = [
        ["#", "Matricule", "Nom & Prénom", ...dynamicUeHeaders, "Moyenne", "Crédits", "Mention", "Décision Jury"],
      ];

      // Build Rows
      const tableRows = deliberationData.cohort.map((c) => {
        const d = c.deliberation;
        const ueGrades = d.ueResults.map((u: any) => `${u.average.toFixed(2)} [${u.status}]`);
        return [
          c.rank,
          c.student.matricule || "-",
          c.student.nom,
          ...ueGrades,
          `${d.semesterAverage.toFixed(2)}/20`,
          `${d.creditsAcquired}/30`,
          d.mention,
          d.decision,
        ];
      });

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 44,
        theme: "grid",
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          halign: "center",
          textColor: [15, 23, 42],
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
              data.cell.styles.textColor = [5, 150, 105]; // emerald-600
              data.cell.styles.fontStyle = "bold";
            } else if (val.includes("Ajourné")) {
              data.cell.styles.textColor = [225, 29, 72]; // rose-600
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
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs"
          >
            <ShieldCheck className="h-4 w-4" />
            {isSaving ? "Validation en cours..." : "Valider & Clôturer Délibération"}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Filière LMD</label>
            <select
              value={selectedProgramId || ""}
              onChange={(e) => setSelectedProgramId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.degreeLevel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Promotion / Classe</label>
            <select
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Semestre</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="S1">Semestre 1 (S1)</option>
              <option value="S2">Semestre 2 (S2)</option>
              <option value="S3">Semestre 3 (S3)</option>
              <option value="S4">Semestre 4 (S4)</option>
              <option value="S5">Semestre 5 (S5)</option>
              <option value="S6">Semestre 6 (S6)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Session Académique</label>
            <select
              value={selectedSessionId || ""}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sessionName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-bold text-slate-500">Effectif de la promotion</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{deliberationData.totalStudents}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600">Admis (Validation Semestre)</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{deliberationData.passedCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-bold text-indigo-600">Taux de Réussite</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{deliberationData.successRate}%</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-bold text-purple-600">Standard de Crédits</div>
          <div className="text-2xl font-black text-purple-700 mt-1">30 ECTS</div>
        </div>
      </div>

      {/* Deliberation Grid Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            Calcul et simulation des compensations semestrielles...
          </div>
        ) : deliberationData.cohort.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Aucun résultat d’étudiant trouvé pour ces critères de délibération.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="p-3 w-10 text-center">Rang</th>
                  <th className="p-3">Matricule</th>
                  <th className="p-3">Étudiant(e)</th>
                  {deliberationData.ues.map((ue) => (
                    <th key={ue.id} className="p-3 text-center border-l border-slate-800">
                      <div>{ue.codeUe}</div>
                      <div className="text-[10px] text-indigo-300 font-normal">({ue.creditsEcts} ECTS)</div>
                    </th>
                  ))}
                  <th className="p-3 text-center border-l border-slate-800 bg-slate-800">Moyenne / 20</th>
                  <th className="p-3 text-center bg-slate-800">Crédits Acquis</th>
                  <th className="p-3 text-center bg-slate-800">Mention</th>
                  <th className="p-3 text-center bg-slate-800">Décision Jury</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliberationData.cohort.map((row) => {
                  const d = row.deliberation;
                  const isPass = d.isSemesterValidated;

                  return (
                    <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-500">{row.rank}</td>
                      <td className="p-3 font-mono font-bold text-slate-600">{row.student.matricule || "-"}</td>
                      <td className="p-3 font-bold text-slate-900">{row.student.nom}</td>

                      {/* UE Results */}
                      {d.ueResults.map((ueRes: any) => {
                        const isUePass = ueRes.status === "V" || ueRes.status === "VC" || ueRes.status === "CAP";
                        return (
                          <td key={ueRes.id} className="p-3 text-center border-l border-slate-100">
                            <div className={`font-bold ${isUePass ? "text-emerald-700" : "text-rose-700"}`}>
                              {ueRes.average.toFixed(2)}
                            </div>
                            <span className={`inline-block text-[9px] font-black px-1.5 py-0.2 rounded mt-0.5 ${
                              ueRes.status === "V"
                                ? "bg-emerald-100 text-emerald-800"
                                : ueRes.status === "VC"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-rose-100 text-rose-800"
                            }`}>
                              {ueRes.status} ({ueRes.creditsAcquired} ECTS)
                            </span>
                          </td>
                        );
                      })}

                      {/* Semester Summary */}
                      <td className="p-3 text-center border-l border-slate-200 font-black text-sm bg-slate-50/50">
                        <span className={d.semesterAverage >= 10 ? "text-emerald-700" : "text-rose-700"}>
                          {d.semesterAverage.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center font-black bg-slate-50/50">
                        <span className={d.creditsAcquired === 30 ? "text-emerald-700" : "text-amber-700"}>
                          {d.creditsAcquired} / 30
                        </span>
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-700 bg-slate-50/50">
                        {d.mention}
                      </td>
                      <td className="p-3 text-center font-bold bg-slate-50/50">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                          d.decision.includes("Admis")
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          {d.decision}
                        </span>
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
