/**
 * Official Ministerial & CAMES LMD Deliberation PV Generator
 * Standards: REESAO / CAMES / ECTS / Bologne / Ministère de l'Enseignement Supérieur
 * Formats: A3 Grand Format & A4 Paysage
 */

export interface MinisterialPVParams {
  paperFormat?: "a3" | "a4";
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
    city?: string;
  };
  semester: string;
  sessionType: "Normale" | "Rattrapage";
  ues: Array<{
    id: number;
    codeUe: string;
    nameUe: string;
    creditsEcts: number;
    typeUe?: string;
  }>;
  cohort: Array<{
    rank: number;
    student: {
      id: number;
      nom: string;
      matricule?: string;
      sexe?: string;
      dateNaissance?: string;
      lieuNaissance?: string;
    };
    deliberation: {
      semesterAverage: number;
      creditsAcquired: number;
      totalCredits: number;
      decision: string;
      mention: string;
      isSemesterValidated: boolean;
      ueResults: Array<{
        codeUe: string;
        ueId: number;
        average: number;
        creditsAcquired: number;
        status: "V" | "VC" | "NV";
      }>;
    };
  }>;
  juryMembers?: Array<{
    role: string;
    name: string;
    title: string;
    department?: string;
  }>;
}

export async function generateLmdMinisterialPVPDF(data: MinisterialPVParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const isA3 = data.paperFormat === "a3";
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: isA3 ? "a3" : "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isRat = data.sessionType === "Rattrapage";

  // ─── 1. CADRE D'HONNEUR & SÉCURITÉ ─────────────────────────────────────────
  doc.setDrawColor(30, 41, 59); // Slate-800
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

  // ─── 2. EN-TÊTE OFFICIEL D'ÉTAT & UNIVERSITAIRE ────────────────────────────
  const country = (data.institution.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const motto = data.institution.motto || "Fraternité — Travail — Progrès";
  const ministry = data.institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const university = (data.institution.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();
  const department = data.institution.departmentName || "Département Pédagogique LMD";

  // Left Column (Republic)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 10 : 8);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 16);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(isA3 ? 7.5 : 6);
  doc.setTextColor(100, 116, 139);
  doc.text(motto, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7.5 : 6);
  doc.setTextColor(51, 65, 85);
  doc.text(ministry, 14, 24, { maxWidth: isA3 ? 120 : 90 });

  // Right Column (University)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 10 : 8);
  doc.setTextColor(15, 23, 42);
  doc.text(university, pageWidth - 14, 16, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 8 : 6.5);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 20.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7.5 : 6);
  doc.setTextColor(100, 116, 139);
  doc.text(department, pageWidth - 14, 25, { align: "right" });

  // ─── 3. TITRE DU PROCÈS-VERBAL MINISTÉRIEL ─────────────────────────────────
  const titleY = isA3 ? 31 : 28;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, titleY, pageWidth - 28, isA3 ? 14 : 11, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA3 ? 13 : 9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `PROCÈS-VERBAL OFFICIEL DE DÉLIBÉRATION DU JURY D'EXAMEN — SYSTÈME LMD`,
    pageWidth / 2,
    titleY + (isA3 ? 5.5 : 4.5),
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 8 : 6.5);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Norme REESAO / CAMES • ${data.semester.toUpperCase()} • ${isRat ? "SESSION DE RATTRAPAGE (SESSION 2 — RÈGLE MAX)" : "SESSION NORMALE (SESSION 1)"} • ANNÉE ACADÉMIQUE ${data.institution.sessionName || "2025-2026"}`,
    pageWidth / 2,
    titleY + (isA3 ? 10.5 : 8.5),
    { align: "center" }
  );

  // ─── 4. CARTOUCHE DE LA PROMOTION ──────────────────────────────────────────
  const infoY = isA3 ? 48 : 41;
  const infoH = isA3 ? 13 : 10;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, infoY, pageWidth - 28, infoH, 1, 1, "FD");

  doc.setFontSize(isA3 ? 8 : 6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Filière / Domaine :", 18, infoY + (isA3 ? 5 : 4));
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.programName || "Tronc Commun LMD", 46, infoY + (isA3 ? 5 : 4));

  doc.setTextColor(71, 85, 105);
  doc.text("Cycle & Promotion :", 18, infoY + (isA3 ? 10 : 7.5));
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.institution.degreeLevel || "Licence"} — ${data.institution.className || "Classe"}`, 46, infoY + (isA3 ? 10 : 7.5));

  doc.setTextColor(71, 85, 105);
  doc.text("Période Évaluée :", pageWidth / 2 + 10, infoY + (isA3 ? 5 : 4));
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.semester} (30 Crédits ECTS)`, pageWidth / 2 + 40, infoY + (isA3 ? 5 : 4));

  doc.setTextColor(71, 85, 105);
  doc.text("Date de Délibération :", pageWidth / 2 + 10, infoY + (isA3 ? 10 : 7.5));
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), pageWidth / 2 + 45, infoY + (isA3 ? 10 : 7.5));

  // ─── 5. TABLEAU MATRICIEL DES RÉSULTATS DU JURY ────────────────────────────
  const headers = [
    "Rang",
    "Matricule",
    "Nom & Prénoms",
    ...data.ues.map((ue) => `${ue.codeUe}\n(${ue.creditsEcts} ECTS)`),
    "Moyenne\n/ 20",
    "Crédits\n/ 30",
    "Décision du Jury",
    "Mention",
  ];

  const body = data.cohort.map((item) => {
    const d = item.deliberation;
    const ueCells = data.ues.map((ue) => {
      const r = d.ueResults.find((res) => res.codeUe === ue.codeUe || res.ueId === ue.id);
      if (!r) return "-";
      return `${r.average.toFixed(2)}\n[${r.status}]`;
    });

    return [
      `${item.rank}e`,
      item.student.matricule || "N/A",
      item.student.nom,
      ...ueCells,
      d.semesterAverage.toFixed(2),
      `${d.creditsAcquired} / 30`,
      d.decision,
      d.mention,
    ];
  });

  const startTableY = isA3 ? 64 : 53;

  autoTable(doc, {
    startY: startTableY,
    head: [headers],
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: isA3 ? 7.5 : 6,
      halign: "center",
      valign: "middle",
      cellPadding: isA3 ? 2 : 1.2,
    },
    bodyStyles: {
      fontSize: isA3 ? 7 : 5.5,
      textColor: [51, 65, 85],
      valign: "middle",
      cellPadding: isA3 ? 1.8 : 1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", cellWidth: isA3 ? 14 : 10 },
      1: { halign: "center", fontStyle: "bold", cellWidth: isA3 ? 28 : 22 },
      2: { halign: "left", fontStyle: "bold", cellWidth: isA3 ? 60 : 45 },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body") {
        const text = String(hookData.cell.raw || "");
        if (text.includes("Admis") || text.includes("[V]") || text.includes("[VC]")) {
          if (hookData.column.index >= 3 && hookData.column.index < 3 + data.ues.length) {
            hookData.cell.styles.halign = "center";
            if (text.includes("[V]")) hookData.cell.styles.textColor = [16, 185, 129];
            if (text.includes("[VC]")) hookData.cell.styles.textColor = [79, 70, 229];
          }
        }
        if (text.includes("Ajourné") || text.includes("[NV]")) {
          if (hookData.column.index >= 3 && hookData.column.index < 3 + data.ues.length) {
            hookData.cell.styles.halign = "center";
            hookData.cell.styles.textColor = [225, 29, 72];
          }
        }
        // Column Decision
        if (hookData.column.index === 3 + data.ues.length + 2) {
          hookData.cell.styles.halign = "center";
          hookData.cell.styles.fontStyle = "bold";
          if (text.includes("Admis")) hookData.cell.styles.textColor = [16, 185, 129];
          else hookData.cell.styles.textColor = [225, 29, 72];
        }
        // Column Moyenne
        if (hookData.column.index === 3 + data.ues.length) {
          hookData.cell.styles.halign = "center";
          hookData.cell.styles.fontStyle = "bold";
        }
        // Column Credits
        if (hookData.column.index === 3 + data.ues.length + 1) {
          hookData.cell.styles.halign = "center";
          hookData.cell.styles.fontStyle = "bold";
          hookData.cell.styles.textColor = [79, 70, 229];
        }
        // Column Mention
        if (hookData.column.index === 3 + data.ues.length + 3) {
          hookData.cell.styles.halign = "center";
        }
      }
    },
  });

  // ─── 6. BILAN STATISTIQUE & ÉMARGEMENT DU JURY ──────────────────────────────
  let finalY = (doc as any).lastAutoTable.finalY + 6;

  // If table went too far down, add a clean second page for signatures and stats
  if (finalY > pageHeight - 45) {
    doc.addPage(isA3 ? "a3" : "a4", "landscape");
    finalY = 20;

    // Border on second page too
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");
  }

  // Summary KPIs Box
  const totalCount = data.cohort.length;
  const passedCount = data.cohort.filter((c) => c.deliberation.isSemesterValidated).length;
  const ajournesCount = totalCount - passedCount;
  const successRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : "0.0";

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY, pageWidth - 28, isA3 ? 12 : 9, 1, 1, "FD");

  doc.setFontSize(isA3 ? 7.5 : 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("BILAN STATISTIQUE DE LA DÉLIBÉRATION :", 18, finalY + (isA3 ? 7 : 5.5));

  doc.setFont("helvetica", "normal");
  doc.text(`• Effectif Total : ${totalCount}`, 80, finalY + (isA3 ? 7 : 5.5));
  doc.setTextColor(16, 185, 129);
  doc.setFont("helvetica", "bold");
  doc.text(`• Admis : ${passedCount}`, 115, finalY + (isA3 ? 7 : 5.5));
  doc.setTextColor(225, 29, 72);
  doc.text(`• Ajournés : ${ajournesCount}`, 145, finalY + (isA3 ? 7 : 5.5));
  doc.setTextColor(79, 70, 229);
  doc.text(`• Taux de Réussite : ${successRate} %`, 180, finalY + (isA3 ? 7 : 5.5));

  // Jury Signatures Block
  const sigY = finalY + (isA3 ? 18 : 14);

  doc.setFontSize(isA3 ? 8 : 6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);

  // 1. Président du Jury
  doc.text("Le Président du Jury :", 20, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7 : 5.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Grade Universitaire : Professeur Titulaire / Maître de Conférences", 20, sigY + 4);
  doc.text("Signature et mention manuscrite :", 20, sigY + 8);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, sigY + 22, 75, sigY + 22);

  // 2. Les Assesseurs / Membres du Jury
  doc.setFontSize(isA3 ? 8 : 6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Les Membres du Jury (Assesseurs) :", pageWidth / 2 - 35, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7 : 5.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Enseignants-Chercheurs responsables des UE", pageWidth / 2 - 35, sigY + 4);
  doc.text("Émargements et Signatures :", pageWidth / 2 - 35, sigY + 8);
  doc.line(pageWidth / 2 - 35, sigY + 22, pageWidth / 2 + 35, sigY + 22);

  // 3. Le Doyen / Chef d'Établissement
  doc.setFontSize(isA3 ? 8 : 6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen / Chef d'Établissement :", pageWidth - 80, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA3 ? 7 : 5.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Visa, Approbation et Cachet Officiel", pageWidth - 80, sigY + 4);
  doc.text("Date : .....................................................", pageWidth - 80, sigY + 8);
  doc.line(pageWidth - 80, sigY + 22, pageWidth - 20, sigY + 22);

  // Footer Certification
  doc.setFontSize(isA3 ? 6.5 : 5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Document académique officiel infalsifiable • Généré automatiquement par la plateforme universitaire EDUT LMD conforme CAMES / REESAO • Format ${isA3 ? "A3 Grand Format" : "A4 Paysage"}`,
    pageWidth / 2,
    pageHeight - 11,
    { align: "center" }
  );

  const cleanClass = (data.institution.className || "Promotion").replace(/[^a-zA-Z0-9]/g, "_");
  const cleanSem = data.semester.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`PV_Ministeriel_CAMES_${isA3 ? "A3_" : "A4_"}${cleanSem}_${cleanClass}.pdf`);
}
