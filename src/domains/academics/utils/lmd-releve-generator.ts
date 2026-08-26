/**
 * LMD Official Transcript (Relevé de Notes) Generator
 * Standards: REESAO / CAMES / ECTS / Bologne
 */

export interface LmdReleveParams {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    sexe?: string;
  };
  deliberation: {
    semester: string;
    semesterAverage: number;
    creditsAcquired: number;
    totalCredits: number;
    decision: string;
    mention: string;
    isSemesterValidated: boolean;
    ueResults: Array<{
      ueId: number;
      codeUe: string;
      nameUe: string;
      typeUe: string;
      creditsEcts: number;
      creditsAcquired: number;
      average: number;
      status: "V" | "VC" | "NV";
      ecuResults: Array<{
        id: number;
        codeEcu?: string;
        nameEcu: string;
        coefficient: number;
        creditsEcts: number;
        finalGrade: number;
        status: "V" | "NV";
      }>;
    }>;
  };
  institution: {
    name?: string;
    facultyName?: string;
    departmentName?: string;
    programName?: string;
    degreeLevel?: string;
    className?: string;
    sessionName?: string;
    logoUrl?: string;
  };
  rank?: number | string;
  totalCohort?: number;
}

export function getEctsGrade(average: number): { grade: string; label: string } {
  if (average >= 16.0) return { grade: "A", label: "Excellent (Top 10%)" };
  if (average >= 14.0) return { grade: "B", label: "Très Bien (Next 25%)" };
  if (average >= 12.0) return { grade: "C", label: "Bien (Next 30%)" };
  if (average >= 11.0) return { grade: "D", label: "Assez Bien (Next 25%)" };
  if (average >= 10.0) return { grade: "E", label: "Passable (Next 10%)" };
  return { grade: "F", label: "Ajourné / Non Validé" };
}

export async function generateLmdStudentRelevePDF(data: LmdReleveParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  buildRelevePage(doc, autoTable, data, pageWidth, pageHeight);

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  const semCode = (data.deliberation.semester || "Semestre").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Releve_LMD_${semCode}_${cleanNom}.pdf`);
}

export async function generateLmdBatchRelevesPDF(cohort: LmdReleveParams[], sessionLabel: string): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  cohort.forEach((item, index) => {
    if (index > 0) doc.addPage();
    buildRelevePage(doc, autoTable, item, pageWidth, pageHeight);
  });

  const cleanSession = sessionLabel.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Releves_LMD_Promotion_${cleanSession}.pdf`);
}

function buildRelevePage(doc: any, autoTable: any, data: LmdReleveParams, pageWidth: number, pageHeight: number) {
  const { student, deliberation, institution, rank, totalCohort } = data;
  const ects = getEctsGrade(deliberation.semesterAverage);

  // Decorative Border
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  // Institutional Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(institution.name || "ÉTABLISSEMENT D'ENSEIGNEMENT SUPÉRIEUR", pageWidth / 2, 16, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`${institution.facultyName || "Faculté des Sciences et Technologies"}  •  ${institution.departmentName || "Département Académique"}`, pageWidth / 2, 21, { align: "center" });

  // Document Title Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(12, 25, pageWidth - 24, 12, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("RELEVÉ DE NOTES ET RÉSULTATS OFFICIEL", pageWidth / 2, 31, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text("Système LMD (Licence - Master - Doctorat) • Norme ECTS / REESAO / CAMES", pageWidth / 2, 35, { align: "center" });

  // Student & Academic Info Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, 40, pageWidth - 24, 25, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Left Column
  doc.setFont("helvetica", "bold");
  doc.text("Nom & Prénoms :", 16, 46);
  doc.setFont("helvetica", "normal");
  doc.text(student.nom || "N/A", 44, 46);

  doc.setFont("helvetica", "bold");
  doc.text("N° Matricule :", 16, 52);
  doc.setFont("helvetica", "normal");
  doc.text(student.matricule || "N/A", 44, 52);

  doc.setFont("helvetica", "bold");
  doc.text("Filière / Parcours :", 16, 58);
  doc.setFont("helvetica", "normal");
  doc.text(institution.programName || "Tronc Commun LMD", 44, 58);

  // Right Column
  doc.setFont("helvetica", "bold");
  doc.text("Année Universitaire :", pageWidth / 2 + 10, 46);
  doc.setFont("helvetica", "normal");
  doc.text(institution.sessionName || "2025-2026", pageWidth / 2 + 44, 46);

  doc.setFont("helvetica", "bold");
  doc.text("Semestre d'Études :", pageWidth / 2 + 10, 52);
  doc.setFont("helvetica", "normal");
  doc.text(deliberation.semester || "S1", pageWidth / 2 + 44, 52);

  doc.setFont("helvetica", "bold");
  doc.text("Promotion / Classe :", pageWidth / 2 + 10, 58);
  doc.setFont("helvetica", "normal");
  doc.text(institution.className || "L1", pageWidth / 2 + 44, 58);

  // Table of UEs and ECUs
  const tableHead = [
    [
      { content: "Code UE", styles: { halign: "center" as const } },
      { content: "Unités d'Enseignement (UE) & Matières (ECU)", styles: { halign: "left" as const } },
      { content: "Coef", styles: { halign: "center" as const } },
      { content: "Note /20", styles: { halign: "center" as const } },
      { content: "Crédits ECTS", styles: { halign: "center" as const } },
      { content: "Résultat / Statut", styles: { halign: "center" as const } },
    ]
  ];

  const tableBody: any[] = [];

  deliberation.ueResults.forEach((ue) => {
    const isV = ue.status === "V";
    const isVC = ue.status === "VC";
    const ueStatusLabel = isV ? "Validé (V)" : isVC ? "Compensé (VC)" : "Non Validé (NV)";

    // Main UE Header Row
    tableBody.push([
      {
        content: ue.codeUe,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: "center" }
      },
      {
        content: `${ue.nameUe} (${ue.typeUe || "Fondamentale"})`,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] }
      },
      {
        content: "-",
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], halign: "center" }
      },
      {
        content: ue.average.toFixed(2),
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: isV ? [5, 150, 105] : isVC ? [79, 70, 229] : [225, 29, 72], halign: "center" }
      },
      {
        content: `${ue.creditsAcquired} / ${ue.creditsEcts}`,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [79, 70, 229], halign: "center" }
      },
      {
        content: ueStatusLabel,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: isV ? [5, 150, 105] : isVC ? [79, 70, 229] : [225, 29, 72], halign: "center" }
      }
    ]);

    // Sub-items ECUs
    if (ue.ecuResults && ue.ecuResults.length > 0) {
      ue.ecuResults.forEach((ecu) => {
        const ecuPass = ecu.finalGrade >= 10.0;
        tableBody.push([
          { content: ecu.codeEcu || "", styles: { textColor: [100, 116, 139], halign: "center" } },
          { content: `   • ${ecu.nameEcu}`, styles: { textColor: [51, 65, 85] } },
          { content: String(ecu.coefficient || 1), styles: { halign: "center", textColor: [100, 116, 139] } },
          { content: ecu.finalGrade > 0 ? ecu.finalGrade.toFixed(2) : "-", styles: { halign: "center", fontStyle: ecuPass ? "normal" : "bold", textColor: ecuPass ? [30, 41, 59] : [225, 29, 72] } },
          { content: `${ecu.creditsEcts} ECTS`, styles: { halign: "center", textColor: [100, 116, 139] } },
          { content: ecuPass ? "Admis" : "Ajourné", styles: { halign: "center", textColor: ecuPass ? [5, 150, 105] : [225, 29, 72] } }
        ]);
      });
    }
  });

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 68,
    margin: { left: 12, right: 12 },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      valign: "middle",
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 80 },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 26, halign: "center" },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Semester Synthesis & Decision Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, finalY, pageWidth - 24, 26, 2, 2, "FD");

  // Summary Metrics
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  doc.setFont("helvetica", "bold");
  doc.text("Moyenne Générale du Semestre :", 16, finalY + 7);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${deliberation.semesterAverage.toFixed(2)} / 20`, 68, finalY + 7);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Total Crédits ECTS Capitalisés :", 16, finalY + 14);
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text(`${deliberation.creditsAcquired} / 30 ECTS`, 68, finalY + 14);

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Notation / Grade ECTS :", 16, finalY + 21);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Grade ${ects.grade} (${ects.label})`, 68, finalY + 21);

  // Right Side: Decision & Mention
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Décision Officielle du Jury :", pageWidth / 2 + 10, finalY + 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  if (deliberation.isSemesterValidated) {
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("ADMIS(E) AU SEMESTRE ✅", pageWidth / 2 + 52, finalY + 7);
  } else {
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text("AJOURNÉ(E) (RATTRAPAGE) ❌", pageWidth / 2 + 52, finalY + 7);
  }

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Mention Attribuée :", pageWidth / 2 + 10, finalY + 14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(deliberation.mention || "Passable", pageWidth / 2 + 52, finalY + 14);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Rang dans la Promotion :", pageWidth / 2 + 10, finalY + 21);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`${rank || 1}e / ${totalCohort || 1} étudiants`, pageWidth / 2 + 52, finalY + 21);

  // Signatures & Security Stamp Zone
  const sigY = finalY + 32;
  if (sigY < pageHeight - 25) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);

    doc.text("Le Président du Jury de Délibération :", 16, sigY);
    doc.setFont("helvetica", "normal");
    doc.text("Signature et approbation", 16, sigY + 4);
    doc.line(16, sigY + 16, 65, sigY + 16);

    doc.setFont("helvetica", "bold");
    doc.text("Le Doyen / Chef d'Établissement :", pageWidth - 70, sigY);
    doc.setFont("helvetica", "normal");
    doc.text("Cachet officiel et validation", pageWidth - 70, sigY + 4);
    doc.line(pageWidth - 70, sigY + 16, pageWidth - 16, sigY + 16);

    // Security Verification Code & Footer Notice
    const today = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Fait le ${today} • Certifié conforme aux délibérations officielles • Réf: LMD-SEC-${student.id}-${Date.now().toString().slice(-6)}`, pageWidth / 2, pageHeight - 11, { align: "center" });
    doc.text("Ce relevé de notes est délivré en un seul exemplaire original. Toute rature ou altération annule sa validité.", pageWidth / 2, pageHeight - 8, { align: "center" });
  }
}
