/**
 * LMD Official Transcript (Relevé de Notes) Generator
 * Standards: REESAO / CAMES / ECTS / Bologne
 * High-precision, pixel-perfect vector A4 layout
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
    countryName?: string;
    ministryName?: string;
    motto?: string;
    facultyName?: string;
    departmentName?: string;
    programName?: string;
    degreeLevel?: string;
    className?: string;
    sessionName?: string;
    logoUrl?: string;
    city?: string;
    phone?: string;
    email?: string;
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

  // 1. Dual Luxury Security Borders
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.7);
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14, "S");

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(8.5, 8.5, pageWidth - 17, pageHeight - 17, "S");

  // 2. Official Republic & Institutional Header
  const country = institution.countryName || "RÉPUBLIQUE DU NIGER";
  const ministry = institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const schoolName = institution.name || "UNIVERSITÉ / INSTITUT D'ENSEIGNEMENT SUPÉRIEUR";
  const faculty = institution.facultyName ? institution.facultyName.toUpperCase() : "FACULTÉ DES SCIENCES & TECHNOLOGIES";
  const department = institution.departmentName ? institution.departmentName.toUpperCase() : "DÉPARTEMENT ACADÉMIQUE";

  // Left Ministry Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(country.toUpperCase(), 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("---------------------------------------------", 14, 17);
  doc.text(ministry, 14, 20, { maxWidth: 65 });

  // Right University Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName.toUpperCase(), pageWidth - 14, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(faculty, pageWidth - 14, 18.5, { align: "right" });
  if (faculty !== department) {
    doc.text(department, pageWidth - 14, 22.5, { align: "right" });
  }

  // 3. Document Title Banner (Sleek Dark Navy with Gold Accents)
  const bannerY = 27;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(12, bannerY, pageWidth - 24, 12, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("RELEVÉ DE NOTES ET RÉSULTATS OFFICIEL", pageWidth / 2, bannerY + 5.5, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text("Système LMD (Licence - Master - Doctorat) • Norme ECTS / REESAO / CAMES", pageWidth / 2, bannerY + 9.5, { align: "center" });

  // 4. Student & Academic Info Box
  const infoY = 41;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, infoY, pageWidth - 24, 24, 1.5, 1.5, "FD");

  // Left Column
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 16, infoY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(student.nom || "N/A", 44, infoY + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule :", 16, infoY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFont("courier", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(student.matricule || "N/A", 44, infoY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Filière / Parcours :", 16, infoY + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.programName || "Tronc Commun LMD", 44, infoY + 18, { maxWidth: 58 });

  // Right Column
  const rightColX = pageWidth / 2 + 8;
  const rightValX = rightColX + 34;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Année Universitaire :", rightColX, infoY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.sessionName || "2025-2026", rightValX, infoY + 6);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Semestre d'Études :", rightColX, infoY + 12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(deliberation.semester || "S1", rightValX, infoY + 12);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Promotion / Classe :", rightColX, infoY + 18);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(institution.className || "L1", rightValX, infoY + 18);

  // 5. Table of UEs and ECUs (Clean Academic Grid)
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
        styles: { 
          fontStyle: "bold", 
          fillColor: [241, 245, 249], 
          textColor: isV ? [5, 150, 105] : isVC ? [79, 70, 229] : [225, 29, 72], 
          halign: "center" 
        }
      },
      {
        content: `${ue.creditsAcquired} / ${ue.creditsEcts}`,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [79, 70, 229], halign: "center" }
      },
      {
        content: ueStatusLabel,
        styles: { 
          fontStyle: "bold", 
          fillColor: [241, 245, 249], 
          textColor: isV ? [5, 150, 105] : isVC ? [79, 70, 229] : [225, 29, 72], 
          halign: "center" 
        }
      }
    ]);

    // Sub-items ECUs
    if (ue.ecuResults && ue.ecuResults.length > 0) {
      ue.ecuResults.forEach((ecu) => {
        const isGraded = ecu.finalGrade !== null && ecu.finalGrade !== undefined && ecu.finalGrade > 0;
        const ecuPass = isGraded && ecu.finalGrade >= 10.0;
        const ecuStatusLabel = isGraded ? (ecuPass ? "Validé" : "Ajourné") : "Non évalué";

        tableBody.push([
          { content: ecu.codeEcu || "", styles: { textColor: [100, 116, 139], halign: "center" } },
          { content: `   • ${ecu.nameEcu}`, styles: { textColor: [51, 65, 85] } },
          { content: String(ecu.coefficient || 1), styles: { halign: "center", textColor: [100, 116, 139] } },
          { 
            content: isGraded ? ecu.finalGrade.toFixed(2) : "-", 
            styles: { 
              halign: "center", 
              fontStyle: isGraded ? "bold" : "normal", 
              textColor: isGraded ? (ecuPass ? [15, 23, 42] : [225, 29, 72]) : [148, 163, 184] 
            } 
          },
          { content: `${ecu.creditsEcts} ECTS`, styles: { halign: "center", textColor: [100, 116, 139] } },
          { 
            content: ecuStatusLabel, 
            styles: { 
              halign: "center", 
              textColor: isGraded ? (ecuPass ? [5, 150, 105] : [225, 29, 72]) : [148, 163, 184],
              fontStyle: isGraded ? "bold" : "normal"
            } 
          }
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
      cellPadding: 1.6,
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

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // 6. Semester Synthesis & Decision Box (Robust 2-column Bounded Layout)
  const boxHeight = 27;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, finalY, pageWidth - 24, boxHeight, 1.5, 1.5, "FD");

  // Column 1 (Left Metrics)
  const col1LabelX = 16;
  const col1ValX = 64;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Moyenne du Semestre :", col1LabelX, finalY + 6.5);
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${deliberation.semesterAverage.toFixed(2)} / 20`, col1ValX, finalY + 6.5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Total Crédits ECTS :", col1LabelX, finalY + 13.5);
  doc.setFontSize(9.5);
  doc.setTextColor(79, 70, 229);
  doc.text(`${deliberation.creditsAcquired} / 30 ECTS`, col1ValX, finalY + 13.5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Notation / Grade ECTS :", col1LabelX, finalY + 20.5);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Grade ${ects.grade} (${ects.label})`, col1ValX, finalY + 20.5, { maxWidth: 45 });

  // Column 2 (Right Decisions - Fully Bounded to Avoid Right Clipping)
  const col2LabelX = pageWidth / 2 + 8;
  const col2ValX = col2LabelX + 38;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Décision du Jury :", col2LabelX, finalY + 6.5);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  if (deliberation.isSemesterValidated) {
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("ADMIS(E) AU SEMESTRE", col2ValX, finalY + 6.5);
  } else {
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text("AJOURNÉ(E) (RATTRAPAGE)", col2ValX, finalY + 6.5);
  }

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Mention Attribuée :", col2LabelX, finalY + 13.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(deliberation.mention || "Ajourné", col2ValX, finalY + 13.5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Rang Promotion :", col2LabelX, finalY + 20.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`${rank || 1}e / ${totalCohort || 1} étudiants`, col2ValX, finalY + 20.5);

  // 7. Official Signatures & Security Stamp Zone
  const sigY = finalY + boxHeight + 6;
  if (sigY < pageHeight - 20) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);

    // Left Signature
    doc.text("Le Président du Jury de Délibération :", 16, sigY);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Signature et approbation officielle", 16, sigY + 4);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(16, sigY + 16, 68, sigY + 16);

    // Center Security Verification Box
    const centerBoxX = pageWidth / 2 - 20;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(centerBoxX, sigY - 2, 40, 18, 1, 1, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("SÉCURITÉ LMD / ECTS", pageWidth / 2, sigY + 2.5, { align: "center" });

    doc.setFontSize(5.5);
    doc.setFont("courier", "normal");
    doc.setTextColor(100, 116, 139);
    const hash = `LMD-${student.id}-${deliberation.creditsAcquired}C-${(deliberation.semesterAverage * 100).toFixed(0)}`;
    doc.text(hash, pageWidth / 2, sigY + 7.5, { align: "center" });
    doc.text("AUTHENTIFIÉ CONFORME", pageWidth / 2, sigY + 12.5, { align: "center" });

    // Right Signature
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Le Doyen / Chef d'Établissement :", pageWidth - 70, sigY);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Cachet officiel et validation", pageWidth - 70, sigY + 4);
    doc.setDrawColor(148, 163, 184);
    doc.line(pageWidth - 70, sigY + 16, pageWidth - 16, sigY + 16);

    // Footer Legal Notice
    const today = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Fait le ${today} • Document certifié conforme au Procès-Verbal de Délibération • Réf: LMD-SEC-${student.id}-${Date.now().toString().slice(-6)}`, pageWidth / 2, pageHeight - 11, { align: "center" });
    doc.text("Ce relevé de notes est délivré en un seul exemplaire original. Toute rature ou altération annule sa validité.", pageWidth / 2, pageHeight - 8, { align: "center" });
  }
}
