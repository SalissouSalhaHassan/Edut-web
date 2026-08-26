/**
 * LMD Annual Deliberation (Bilan 60 ECTS & Enjambement) Generator
 * Standards: REESAO / CAMES / ECTS / Bologne
 * Vector-perfect Landscape PV & Portrait Annual Transcripts
 */

import { getEctsGrade } from "./lmd-releve-generator";

export interface LmdAnnualStudent {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    sexe?: string;
  };
  rank: number;
  sem1: {
    name: string;
    average: number;
    creditsAcquired: number;
    isValidated: boolean;
    decision: string;
    ueResults?: any[];
  };
  sem2: {
    name: string;
    average: number;
    creditsAcquired: number;
    isValidated: boolean;
    decision: string;
    ueResults?: any[];
  };
  annual: {
    annualAverage: number;
    totalCreditsAcquired: number;
    totalCreditsTarget: number;
    decision: string;
    mention: string;
    isAnnualValidated: boolean;
    isEnjambement: boolean;
    cycleLevel: string;
  };
}

export interface LmdAnnualParams {
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    facultyName?: string;
    departmentName?: string;
    programName?: string;
    className?: string;
    sessionName?: string;
    cycleLevel?: string;
  };
  sem1Name: string;
  sem2Name: string;
  cycleLevel: string;
  cohort: LmdAnnualStudent[];
  totalStudents: number;
  passedCount: number;
  enjambementCount: number;
  ajournesCount: number;
  successRate: number;
  sessionType?: "Normale" | "Rattrapage";
}

/**
 * 1. Generate Official Annual Deliberation PV (A4 Landscape)
 */
export async function generateLmdAnnualDeliberationPVPDF(data: LmdAnnualParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const isRat = data.sessionType === "Rattrapage";

  // Header Box
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 10, pageWidth - 20, 26, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(10, 10, pageWidth - 20, 26, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `PROCÈS-VERBAL ANNUEL DE DÉLIBÉRATION DU JURY LMD — ${data.cycleLevel.toUpperCase()}`,
    pageWidth / 2,
    17,
    { align: "center" }
  );

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const subTitle = `Filière : ${data.institution.programName || "Tronc Commun LMD"}   |   Promotion : ${data.institution.className || "Classe"}   |   Année Académique : ${data.institution.sessionName || "2025-2026"}   |   ${isRat ? "Session de Rattrapage (Session 2)" : "Session Normale (Session 1)"}`;
  doc.text(subTitle, pageWidth / 2, 23, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Bilan Annuel : 60 Crédits ECTS   •   Règle d'Enjambement (Passage avec dettes) : ≥ 45 ECTS   •   Compensation Annuelle : MGA ≥ 10.00 / 20`,
    pageWidth / 2,
    29,
    { align: "center" }
  );

  // Table Columns
  const headers = [
    "Rang",
    "Matricule",
    "Nom & Prénoms",
    `${data.sem1Name}\n(Moy / 30 ECTS)`,
    `${data.sem2Name}\n(Moy / 30 ECTS)`,
    "Moyenne\nAnnuelle",
    "Crédits\n/ 60 ECTS",
    "Décision Annuelle du Jury",
    "Mention",
  ];

  const body = data.cohort.map((c) => {
    return [
      `${c.rank}e`,
      c.student.matricule || "N/A",
      c.student.nom,
      `${c.sem1.average.toFixed(2)} (${c.sem1.creditsAcquired} ECTS)`,
      `${c.sem2.average.toFixed(2)} (${c.sem2.creditsAcquired} ECTS)`,
      c.annual.annualAverage.toFixed(2),
      `${c.annual.totalCreditsAcquired} / 60`,
      c.annual.decision,
      c.annual.mention,
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [headers],
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
      1: { halign: "center", cellWidth: 26, fontStyle: "bold" },
      2: { halign: "left", cellWidth: 60, fontStyle: "bold" },
      3: { halign: "center", cellWidth: 32 },
      4: { halign: "center", cellWidth: 32 },
      5: { halign: "center", cellWidth: 22, fontStyle: "bold" },
      6: { halign: "center", cellWidth: 24, fontStyle: "bold" },
      7: { halign: "center", cellWidth: 42, fontStyle: "bold" },
      8: { halign: "center", cellWidth: 22 },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body") {
        const text = String(hookData.cell.raw || "");
        if (hookData.column.index === 7) {
          if (text.includes("Admis en Année")) {
            hookData.cell.styles.textColor = [16, 185, 129]; // emerald-500
          } else if (text.includes("Enjambement")) {
            hookData.cell.styles.textColor = [217, 119, 6]; // amber-600
          } else {
            hookData.cell.styles.textColor = [225, 29, 72]; // rose-600
          }
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

  const cleanClass = (data.institution.className || "Classe").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`PV_Deliberation_Annuelle_${data.cycleLevel.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanClass}.pdf`);
}

/**
 * 2. Generate Single Student Annual Transcript (A4 Portrait)
 */
export async function generateLmdStudentAnnualRelevePDF(
  item: LmdAnnualStudent,
  institution: any,
  totalCohort: number
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dual Security Borders
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.7);
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14, "S");

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(8.5, 8.5, pageWidth - 17, pageHeight - 17, "S");

  // Republic & University Header
  const country = institution.countryName || "RÉPUBLIQUE DU NIGER";
  const ministry = institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const schoolName = institution.name || "UNIVERSITÉ / ÉCOLE SUPÉRIEURE";
  const faculty = institution.facultyName || "FACULTÉ / DÉPARTEMENT";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(country.toUpperCase(), 14, 14);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 15.5, 52, 15.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, 14, 20, { maxWidth: 65 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), pageWidth - 14, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(faculty, pageWidth - 14, 18.5, { align: "right" });

  // Title Banner
  const bannerY = 27;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, bannerY, pageWidth - 24, 12, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `RELEVÉ DE NOTES ANNUEL & BILAN DES 60 CRÉDITS ECTS`,
    pageWidth / 2,
    bannerY + 5.5,
    { align: "center" }
  );

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Cycle LMD • ${item.annual.cycleLevel} • Validation de l'Année Académique • Norme REESAO / CAMES`,
    pageWidth / 2,
    bannerY + 9.5,
    { align: "center" }
  );

  // Student Info Box
  const infoY = 41;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, infoY, pageWidth - 24, 24, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 16, infoY + 6);
  doc.setTextColor(15, 23, 42);
  doc.text(item.student.nom.toUpperCase(), 44, infoY + 6);

  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule :", 16, infoY + 12);
  doc.setTextColor(15, 23, 42);
  doc.text(item.student.matricule || "N/A", 44, infoY + 12);

  doc.setTextColor(71, 85, 105);
  doc.text("Filière / Cycle :", 16, infoY + 18);
  doc.setTextColor(15, 23, 42);
  doc.text(`${institution.programName || "LMD"} (${item.annual.cycleLevel})`, 44, infoY + 18);

  doc.setTextColor(71, 85, 105);
  doc.text("Année Académique :", pageWidth / 2 + 10, infoY + 6);
  doc.setTextColor(15, 23, 42);
  doc.text(institution.sessionName || "2025-2026", pageWidth / 2 + 42, infoY + 6);

  doc.setTextColor(71, 85, 105);
  doc.text("Classe / Promotion :", pageWidth / 2 + 10, infoY + 12);
  doc.setTextColor(15, 23, 42);
  doc.text(institution.className || "Promotion LMD", pageWidth / 2 + 42, infoY + 12);

  doc.setTextColor(71, 85, 105);
  doc.text("Rang de l'Étudiant :", pageWidth / 2 + 10, infoY + 18);
  doc.setTextColor(15, 23, 42);
  doc.text(`${item.rank === 1 ? "1er (Major)" : `${item.rank}e`} sur ${totalCohort} étudiants`, pageWidth / 2 + 42, infoY + 18);

  // Annual Balance Summary Table
  const tableHeaders = ["Période Académique", "Moyenne / 20", "Crédits Validés", "Total Visé", "Décision Semestrielle"];
  const tableBody = [
    [item.sem1.name, `${item.sem1.average.toFixed(2)} / 20`, `${item.sem1.creditsAcquired} ECTS`, "30 ECTS", item.sem1.decision],
    [item.sem2.name, `${item.sem2.average.toFixed(2)} / 20`, `${item.sem2.creditsAcquired} ECTS`, "30 ECTS", item.sem2.decision],
  ];

  autoTable(doc, {
    startY: 68,
    head: [tableHeaders],
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 50 },
      1: { fontStyle: "bold" },
      2: { fontStyle: "bold", textColor: [79, 70, 229] },
      4: { fontStyle: "bold" },
    },
  });

  // Annual Conclusion Card
  const annualY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, annualY, pageWidth - 24, 30, 1.5, 1.5, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("BILAN ANNUEL GLOBAL (60 CRÉDITS ECTS) :", 16, annualY + 7);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`• Moyenne Générale Annuelle (MGA) : `, 16, annualY + 14);
  doc.setFont("helvetica", "bold");
  doc.text(`${item.annual.annualAverage.toFixed(2)} / 20`, 72, annualY + 14);

  doc.setFont("helvetica", "normal");
  doc.text(`• Total Crédits ECTS Capitalisés : `, 16, annualY + 20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(`${item.annual.totalCreditsAcquired} / 60.0 ECTS`, 68, annualY + 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`• Mention Annuelle : `, 16, annualY + 26);
  doc.setFont("helvetica", "bold");
  doc.text(item.annual.mention, 52, annualY + 26);

  // Big Decision Badge on the right
  const isPass = item.annual.isAnnualValidated;
  const isEnj = item.annual.isEnjambement;
  doc.setFillColor(isPass ? 209 : isEnj ? 254 : 255, isPass ? 250 : isEnj ? 243 : 228, isPass ? 229 : isEnj ? 199 : 230);
  doc.roundedRect(pageWidth - 78, annualY + 5, 62, 20, 1.5, 1.5, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPass ? 6 : isEnj ? 180 : 190, isPass ? 95 : isEnj ? 83 : 18, isPass ? 70 : isEnj ? 9 : 60);
  doc.text("DÉCISION DU JURY ANNUEL", pageWidth - 47, annualY + 11, { align: "center" });

  doc.setFontSize(8);
  doc.text(item.annual.decision, pageWidth - 47, annualY + 18, { align: "center", maxWidth: 58 });

  // Signatures
  const sigY = pageHeight - 38;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("Le Doyen de Faculté / Chef d'Établissement", 16, sigY);
  doc.line(16, sigY + 15, 65, sigY + 15);

  doc.text("Le Président du Jury LMD", pageWidth - 65, sigY);
  doc.line(pageWidth - 65, sigY + 15, pageWidth - 16, sigY + 15);

  const cleanNom = (item.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Releve_Annuel_LMD_${item.annual.cycleLevel.replace(/[^a-zA-Z0-9]/g, "_")}_${cleanNom}.pdf`);
}
