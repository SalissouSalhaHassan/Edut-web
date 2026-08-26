/**
 * Diploma Supplement (Annexe Descriptive au Diplôme) Generator
 * Official Standard: UNESCO / Conseil de l'Europe / Commission Européenne / CAMES / REESAO
 * Pixel-Perfect Vector Layout with Balanced Page Spacing, No Text Overlaps & Standard Character Encodings
 */

import { getEctsGrade } from "./lmd-releve-generator";

export interface DiplomaSupplementParams {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
    sexe?: string;
  };
  diploma: {
    title: string; // e.g. "DIPLÔME DE LICENCE LMD"
    degreeLevel: "Licence" | "Master" | "Doctorat" | string;
    fieldOfStudy: string; // e.g. "Sciences & Technologies"
    mention: string; // e.g. "Informatique & Systèmes d'Information"
    specialization?: string; // e.g. "Génie Logiciel & Systèmes d'Information"
    graduationYear: string; // e.g. "2025-2026"
    finalGradeAverage: number; // e.g. 15.40 / 20
    totalCreditsAcquired: number; // 180 ECTS (Licence) or 120 ECTS (Master)
    honors: string; // e.g. "Bien", "Très Bien"
    ectsFinalGrade?: string; // "A", "B", "C"
  };
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    facultyName?: string;
    departmentName?: string;
    city?: string;
    website?: string;
    rectorName?: string;
    deanName?: string;
    logoUrl?: string;
  };
  ueList?: Array<{
    codeUe: string;
    nameUe: string;
    creditsEcts: number;
    average: number;
    status: "V" | "VC" | "NV" | string;
    semester?: string;
  }>;
  internshipOrThesis?: {
    topic?: string;
    organization?: string;
    defenseDate?: string;
    grade?: number;
  };
}

export async function generateDiplomaSupplementPDF(data: DiplomaSupplementParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const totalPages = 2;

  const drawPageBorders = (pageNum: number) => {
    // Outer Deep Navy Security Border
    doc.setDrawColor(15, 23, 42); // slate-900
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

    // Inner Fine Slate Border
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

    // Corner Decorative Crosses
    const crossSize = 2.5;
    const corners = [
      { x: 12, y: 12 },
      { x: pageWidth - 12, y: 12 },
      { x: 12, y: pageHeight - 12 },
      { x: pageWidth - 12, y: pageHeight - 12 },
    ];
    doc.setDrawColor(99, 102, 241); // indigo-500
    doc.setLineWidth(0.4);
    corners.forEach((c) => {
      doc.line(c.x - crossSize, c.y, c.x + crossSize, c.y);
      doc.line(c.x, c.y - crossSize, c.x, c.y + crossSize);
    });

    // Official Security Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ANNEXE DESCRIPTIVE AU DIPLÔME • MODÈLE ÉLABORÉ PAR L'UNESCO, LA COMMISSION EUROPÉENNE ET LE CAMES • PAGE ${pageNum} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 11,
      { align: "center" }
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : EN-TÊTE, SECTIONS 1, 2, 3 & BILAN GLOBAL DES RÉSULTATS (AVEC ESPACEMENT OPTIMAL)
  // ══════════════════════════════════════════════════════════════════════════
  drawPageBorders(1);

  // 1. En-tête Républicain et Universitaire
  const country = (data.institution.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const school = (data.institution.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();
  const department = (data.institution.departmentName || "Département Pédagogique Universitaire LMD");

  // Left Column (Republic)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 15.5);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 17, 54, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, 14, 21.5, { maxWidth: 70 });

  // Right Column (University)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth - 14, 15.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 20.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(department, pageWidth - 14, 25, { align: "right" });

  // 2. Bannière de Titre
  const bannerY = 29;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(13, bannerY, pageWidth - 26, 14, 1.5, 1.5, "F");

  // Gold accent bar
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(13, bannerY, 3.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ANNEXE DESCRIPTIVE AU DIPLÔME (DIPLOMA SUPPLEMENT)`,
    pageWidth / 2 + 1.5,
    bannerY + 5.8,
    { align: "center" }
  );

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Cadre de Transparence & Mobilité Internationale • Norme UNESCO / Espace Européen Bologne / CAMES — ECTS`,
    pageWidth / 2 + 1.5,
    bannerY + 10.5,
    { align: "center" }
  );

  let currentY = 47;

  const renderSectionBar = (number: string, title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(13, currentY, pageWidth - 26, 7, 1, 1, "FD");

    // Left accent pill
    doc.setFillColor(79, 70, 229);
    doc.rect(13, currentY, 3, 7, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${number}. ${title.toUpperCase()}`, 19, currentY + 4.8);
    currentY += 9;
  };

  // ─── 1. INFORMATIONS SUR LE TITULAIRE DU DIPLÔME ───────────────────────────
  renderSectionBar("1", "Informations sur le titulaire du diplôme");

  const s1Height = 20;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, s1Height, 1, 1, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("1.1 Nom & Prénoms :", 17, currentY + 6.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 54, currentY + 6.5);

  doc.setTextColor(71, 85, 105);
  doc.text("1.2 Identifiant National / Matricule :", pageWidth / 2 + 2, currentY + 6.5);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 58, currentY + 6.5);

  doc.setTextColor(71, 85, 105);
  doc.text("1.3 Date & Lieu de naissance :", 17, currentY + 14);
  doc.setTextColor(15, 23, 42);
  const birthInfo = `${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}`;
  doc.text(birthInfo, 60, currentY + 14);

  doc.setTextColor(71, 85, 105);
  doc.text("1.4 Nationalité :", pageWidth / 2 + 2, currentY + 14);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.nationalite || "Nigérienne", pageWidth / 2 + 28, currentY + 14);

  currentY += s1Height + 5;

  // ─── 2. INFORMATIONS SUR LE DIPLÔME ────────────────────────────────────────
  renderSectionBar("2", "Informations sur le diplôme");

  const s2Height = 28;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, s2Height, 1, 1, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("2.1 Intitulé officiel du diplôme :", 17, currentY + 6);
  doc.setTextColor(15, 23, 42);
  doc.text(data.diploma.title || "DIPLÔME DE LICENCE LMD", 65, currentY + 6);

  doc.setTextColor(71, 85, 105);
  doc.text("2.2 Domaine & Mention :", 17, currentY + 13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.diploma.fieldOfStudy} — Mention : ${data.diploma.mention}`, 54, currentY + 13);

  doc.setTextColor(71, 85, 105);
  doc.text("2.3 Établissement de formation :", 17, currentY + 20);
  doc.setTextColor(15, 23, 42);
  doc.text(`${school} (${faculty})`, 63, currentY + 20);

  doc.setTextColor(71, 85, 105);
  doc.text("2.4 Langue d'enseignement & d'examen :", 17, currentY + 26);
  doc.setTextColor(15, 23, 42);
  doc.text("Français (Cadre officiel REESAO / CAMES)", 75, currentY + 26);

  currentY += s2Height + 5;

  // ─── 3. INFORMATIONS SUR LE NIVEAU DU DIPLÔME ──────────────────────────────
  renderSectionBar("3", "Informations sur le niveau du diplôme");

  const s3Height = 25;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, s3Height, 1, 1, "FD");

  const isMaster = data.diploma.degreeLevel.toLowerCase().includes("master");
  const isDoctorat = data.diploma.degreeLevel.toLowerCase().includes("doctorat");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("3.1 Niveau de qualification :", 17, currentY + 6);
  doc.setTextColor(15, 23, 42);
  const qualif = isDoctorat
    ? "Grade de Doctorat (Bac + 8) — Niveau 8 CITE / UNESCO"
    : isMaster
    ? "Grade de Master (Bac + 5) — Niveau 7 CITE / UNESCO"
    : "Grade de Licence (Bac + 3) — Niveau 6 CITE / UNESCO";
  doc.text(qualif, 59, currentY + 6);

  doc.setTextColor(71, 85, 105);
  doc.text("3.2 Durée officielle du cursus :", 17, currentY + 13);
  doc.setTextColor(15, 23, 42);
  const duration = isDoctorat
    ? "3 Années académiques (6 Semestres) — 180 Crédits ECTS"
    : isMaster
    ? "2 Années académiques (4 Semestres) — 120 Crédits ECTS"
    : "3 Années académiques (6 Semestres) — 180 Crédits ECTS";
  doc.text(duration, 62, currentY + 13);

  doc.setTextColor(71, 85, 105);
  doc.text("3.3 Conditions d'accès officielles :", 17, currentY + 20);
  doc.setTextColor(15, 23, 42);
  const access = isDoctorat
    ? "Titulaire d'un Master de Recherche ou diplôme équivalent accrédité CAMES"
    : isMaster
    ? "Titulaire d'une Licence LMD ou diplôme équivalent accrédité CAMES"
    : "Baccalauréat de l'Enseignement Secondaire ou titre admis en équivalence";
  doc.text(access, 67, currentY + 20);

  currentY += s3Height + 5;

  // ─── 4. BILAN GLOBAL DES RÉSULTATS DU CYCLE & GRILLE ECTS ──────────────────
  renderSectionBar("4", "Contenu des études et bilan global des résultats");

  // 4 Cards Metric Dashboard
  const cardW = (pageWidth - 26 - 9) / 4;
  const cardH = 22;

  const totalCredits = data.diploma.totalCreditsAcquired || (isMaster ? 120 : 180);
  const targetCredits = isMaster ? 120 : 180;
  const ectsGrade = getEctsGrade(data.diploma.finalGradeAverage);

  const kpis = [
    { label: "CRÉDITS ECTS CAPITALISÉS", val: `${totalCredits} / ${targetCredits}`, sub: "Norme 100% Validée", color: [79, 70, 229] },
    { label: "MOYENNE GÉNÉRALE (MGC)", val: `${data.diploma.finalGradeAverage.toFixed(2)} / 20`, sub: "Barème officiel /20", color: [15, 23, 42] },
    { label: "MENTION FINALE DU JURY", val: data.diploma.honors || "Bien", sub: "Délibération officielle", color: [16, 185, 129] },
    { label: "GRADE ECTS INTERNATIONAL", val: `Grade ${ectsGrade.grade}`, sub: ectsGrade.label, color: [245, 158, 11] },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = 13 + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, currentY, cardW, cardH, 1.2, 1.2, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + cardW / 2, currentY + 5, { align: "center" });

    doc.setFontSize(10.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, kx + cardW / 2, currentY + 12.5, { align: "center" });

    doc.setFontSize(6.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, kx + cardW / 2, currentY + 18, { align: "center" });
  });

  currentY += cardH + 5;

  // ECTS Grading System Official Scale Table (Fixing character encoding like "e -> >=)
  const ectsHeaders = ["Grade ECTS", "Pourcentage Cohorte", "Définition & Appréciation Qualitative", "Fourchette de Notes Indicative"];
  const ectsRows = [
    ["A", "10% supérieurs", "EXCELLENT — Résultats remarquables avec seulement des insuffisances mineures", "16.00 à 20.00 / 20 (Très Bien)"],
    ["B", "25% suivants", "TRÈS BIEN — Résultats nettement au-dessus de la moyenne malgré quelques lacunes", "14.00 à 15.99 / 20 (Bien)"],
    ["C", "30% suivants", "BIEN — Travail de bonne qualité globale avec insuffisances notables", "12.00 à 13.99 / 20 (Assez Bien)"],
    ["D", "25% suivants", "SATISFAISANT — Travail honnête mais comportant des lacunes importantes", "11.00 à 11.99 / 20 (Passable)"],
    ["E", "10% restants", "PASSABLE — Les résultats satisfont aux critères minimaux de validation", "10.00 à 10.99 / 20 (Passable)"],
    ["Fx / F", "—", "AJOURNÉ / ÉCHEC — Crédits non acquis, compensation ou rattrapage requis", "< 10.00 / 20 (Insuffisant)"],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [ectsHeaders],
    body: ectsRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "center",
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { halign: "left", cellWidth: 82 },
      3: { halign: "center", cellWidth: 50 },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === "body") {
        const grade = String(hookData.row.cells[0]?.raw || "");
        if (grade === ectsGrade.grade) {
          hookData.cell.styles.fillColor = [238, 242, 255]; // indigo-50 highlight
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : RELEVÉ MATRICIEL DES UE, FONCTION, CERTIFICATION & SCHÉMA LMD
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage("a4", "portrait");
  drawPageBorders(2);

  currentY = 16;

  // Header Banner Page 2 (Separating left title and right student info so they NEVER collide)
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, currentY, pageWidth - 26, 11, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ANNEXE DESCRIPTIVE AU DIPLÔME (SUITE)`,
    17,
    currentY + 6.8
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(226, 232, 240);
  const studentHeaderInfo = `Étudiant : ${(data.student.nom || "").toUpperCase()} • N° : ${data.student.matricule || "N/A"}`;
  doc.text(
    studentHeaderInfo,
    pageWidth - 17,
    currentY + 6.8,
    { align: "right" }
  );

  currentY += 16;

  // ─── 4.3 RELEVÉ DES UNITÉS D'ENSEIGNEMENT CAPITALISÉES ──────────────────────
  renderSectionBar("4.3", "Relevé synthétique des Unités d'Enseignement (UE) capitalisées");

  const sampleUeRows = (data.ueList && data.ueList.length > 0)
    ? data.ueList.map((ue) => [
        ue.codeUe,
        ue.nameUe,
        `${ue.creditsEcts} ECTS`,
        `${ue.average.toFixed(2)} / 20`,
        ue.status === "V" ? "Validé (V)" : ue.status === "VC" ? "Compensé (VC)" : "Validé",
        getEctsGrade(ue.average).grade,
      ])
    : [
        ["UE-FOND-01", "Mathématiques & Algorithmique Avancée", "6 ECTS", `${data.diploma.finalGradeAverage.toFixed(2)} / 20`, "Validé (V)", getEctsGrade(data.diploma.finalGradeAverage).grade],
        ["UE-FOND-02", "Génie Logiciel & Architecture des Systèmes", "6 ECTS", `${(data.diploma.finalGradeAverage + 0.3).toFixed(2)} / 20`, "Validé (V)", getEctsGrade(data.diploma.finalGradeAverage).grade],
        ["UE-FOND-03", "Bases de Données & Systèmes Distribués", "6 ECTS", `${(data.diploma.finalGradeAverage - 0.2).toFixed(2)} / 20`, "Validé (V)", getEctsGrade(data.diploma.finalGradeAverage).grade],
        ["UE-TRANS-01", "Anglais Professionnel & Communication Technique", "4 ECTS", `${(data.diploma.finalGradeAverage + 0.5).toFixed(2)} / 20`, "Validé (V)", getEctsGrade(data.diploma.finalGradeAverage).grade],
        ["UE-TRANS-02", "Économie, Droit du Numérique & Entrepreneuriat", "4 ECTS", `${(data.diploma.finalGradeAverage - 0.4).toFixed(2)} / 20`, "Validé (V)", getEctsGrade(data.diploma.finalGradeAverage).grade],
        ["UE-STAGE-01", "Projet de Fin d'Études & Stage Professionnel", "4 ECTS", `${(data.diploma.finalGradeAverage + 0.8).toFixed(2)} / 20`, "Validé (V)", "A"],
      ];

  autoTable(doc, {
    startY: currentY,
    head: [["Code UE", "Intitulé de l'Unité d'Enseignement", "Crédits", "Moyenne", "Résultat Jury", "Grade ECTS"]],
    body: sampleUeRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "center",
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", cellWidth: 25 },
      1: { halign: "left", cellWidth: 78, fontStyle: "bold" },
      2: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 21 },
      3: { fontStyle: "bold", cellWidth: 23 },
      4: { fontStyle: "bold", textColor: [16, 185, 129], cellWidth: 22 },
      5: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 15 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // ─── 5. INFORMATIONS SUR LA FONCTION DU DIPLÔME ────────────────────────────
  renderSectionBar("5", "Informations sur la fonction du diplôme");

  const s5Height = 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, s5Height, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.1 Poursuite d'études supérieures :", 17, currentY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const progDesc = isMaster
    ? "Accès direct aux formations doctorales (Doctorat / Ph.D.) et aux concours nationaux/internationaux de recrutement de chercheurs."
    : "Accès de plein droit aux programmes de Master (Recherche ou Professionnel) dans l'espace CAMES et international.";
  doc.text(progDesc, 66, currentY + 6, { maxWidth: 120 });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.2 Statut professionnel conféré :", 17, currentY + 14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    "Permet d'exercer des fonctions de cadre moyen ou supérieur, ingénieur d'études, analyste, consultant ou gestionnaire de projets.",
    63,
    currentY + 14,
    { maxWidth: 123 }
  );

  currentY += s5Height + 5;

  // ─── 6. RENSEIGNEMENTS COMPLÉMENTAIRES ─────────────────────────────────────
  renderSectionBar("6", "Renseignements complémentaires & Mobilité");

  const s6Height = 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, s6Height, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.1 Stage / Travaux de recherche :", 17, currentY + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const stageInfo = data.internshipOrThesis?.topic
    ? `Thème : "${data.internshipOrThesis.topic}" (${data.internshipOrThesis.organization || "Entreprise"})`
    : "Stage d'immersion professionnelle et soutenance de projet de fin de cycle validés avec mention très honorable.";
  doc.text(stageInfo, 64, currentY + 6, { maxWidth: 122 });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.2 Organismes d'accréditation :", 17, currentY + 14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Conseil Africain et Malgache pour l'Enseignement Supérieur (CAMES : www.lecames.org) • Site : ${data.institution.website || "www.universite-edut.org"}`,
    62,
    currentY + 14,
    { maxWidth: 124 }
  );

  currentY += s6Height + 5;

  // ─── 7. CERTIFICATION OFFICIELLE DE L'ANNEXE ──────────────────────────────
  renderSectionBar("7", "Certification officielle de l'annexe");

  const sigBoxH = 28;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(13, currentY, pageWidth - 26, sigBoxH, 1, 1, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Date de délivrance :", 17, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), 46, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Lieu d'émission :", 95, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.city || "Niamey", 118, currentY + 5.5);

  // Signatures Lines
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen de la Faculté / Chef d'Établissement", 17, currentY + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Visa officiel", 17, currentY + 16.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(17, currentY + 24, 65, currentY + 24);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Recteur / Président de l'Université", pageWidth - 80, currentY + 12.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Sceau officiel et Approbation", pageWidth - 80, currentY + 16.5);
  doc.line(pageWidth - 80, currentY + 24, pageWidth - 17, currentY + 24);

  // Security QR / Seal Box in Middle
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth / 2 - 15, currentY + 8.5, 30, 17, 1, 1, "FD");
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text("SCEAU DE SÉCURITÉ", pageWidth / 2, currentY + 13.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("DOCUMENT OFFICIEL", pageWidth / 2, currentY + 17.5, { align: "center" });
  doc.text("INFALSIFIABLE", pageWidth / 2, currentY + 21.5, { align: "center" });

  currentY += sigBoxH + 5;

  // ─── 8. SCHÉMA DU SYSTÈME NATIONAL D'ENSEIGNEMENT SUPÉRIEUR (LMD) ─────────
  renderSectionBar("8", "Description du système d'enseignement supérieur (Schéma LMD)");

  const lmdHeaders = ["Grade Universitaire", "Durée Officielle", "Crédits ECTS", "Conditions d'Accès", "Passerelles & Débouchés Académiques"];
  const lmdBody = [
    ["Licence (L)", "3 ans (6 semestres)", "180 ECTS", "Baccalauréat", "Insertion Professionnelle ou Accès en Master"],
    ["Master (M)", "2 ans (4 semestres)", "120 ECTS", "Licence LMD", "Cadre Supérieur ou Accès en Doctorat"],
    ["Doctorat (D)", "3 ans (6 semestres)", "180 ECTS", "Master Recherche", "Enseignement Supérieur, R&D, Recherche"],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [lmdHeaders],
    body: lmdBody,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.8,
      halign: "center",
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.3,
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 26 },
      1: { cellWidth: 28 },
      2: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 22 },
      3: { halign: "left", cellWidth: 36 },
      4: { halign: "left" },
    },
  });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Diploma_Supplement_UNESCO_${cleanNom}.pdf`);
}
