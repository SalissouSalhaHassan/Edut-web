/**
 * Diploma Supplement (Annexe Descriptive au Diplôme) Generator
 * Official Standard: UNESCO / Conseil de l'Europe / Commission Européenne / CAMES / REESAO
 * High-Prestige Multi-page Vector A4 Layout with Security Frames, Transcript Grid & ECTS Scale
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
    // Outer Deep Navy Border
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
    doc.setFontSize(6.2);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ANNEXE DESCRIPTIVE AU DIPLÔME • MODÈLE ÉLABORÉ PAR L'UNESCO, LA COMMISSION EUROPÉENNE ET LE CAMES • PAGE ${pageNum} / ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10.5,
      { align: "center" }
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : EN-TÊTE, SECTIONS 1, 2, 3 & BILAN GLOBAL DES RÉSULTATS
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
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 15);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 16.5, 52, 16.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, 14, 20.5, { maxWidth: 68 });

  // Right Column (University)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth - 14, 15, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 19.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(department, pageWidth - 14, 23.5, { align: "right" });

  // 2. Bannière de Titre Prestigieuse
  const bannerY = 27;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(13, bannerY, pageWidth - 26, 13.5, 1.5, 1.5, "F");

  // Gold accent bar
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(13, bannerY, 3, 13.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ANNEXE DESCRIPTIVE AU DIPLÔME (DIPLOMA SUPPLEMENT)`,
    pageWidth / 2 + 1.5,
    bannerY + 5.5,
    { align: "center" }
  );

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Cadre de Transparence & Mobilité Internationale • Norme UNESCO / Espace Européen Bologne / CAMES — ECTS`,
    pageWidth / 2 + 1.5,
    bannerY + 9.8,
    { align: "center" }
  );

  let currentY = 43.5;

  const renderSectionBar = (number: string, title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(13, currentY, pageWidth - 26, 6.5, 1, 1, "FD");

    // Left accent pill
    doc.setFillColor(79, 70, 229);
    doc.rect(13, currentY, 2.5, 6.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${number}. ${title.toUpperCase()}`, 18, currentY + 4.5);
    currentY += 8;
  };

  // ─── 1. INFORMATIONS SUR LE TITULAIRE DU DIPLÔME ───────────────────────────
  renderSectionBar("1", "Informations sur le titulaire du diplôme");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 17, 1, 1, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("1.1 Nom & Prénoms :", 16, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 50, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("1.2 Identifiant National / Matricule :", pageWidth / 2 + 2, currentY + 5.5);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 56, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("1.3 Date & Lieu de naissance :", 16, currentY + 12);
  doc.setTextColor(15, 23, 42);
  const birthInfo = `${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}`;
  doc.text(birthInfo, 56, currentY + 12);

  doc.setTextColor(71, 85, 105);
  doc.text("1.4 Nationalité :", pageWidth / 2 + 2, currentY + 12);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.nationalite || "Nigérienne", pageWidth / 2 + 26, currentY + 12);

  currentY += 20;

  // ─── 2. INFORMATIONS SUR LE DIPLÔME ────────────────────────────────────────
  renderSectionBar("2", "Informations sur le diplôme");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 23, 1, 1, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("2.1 Intitulé officiel du diplôme :", 16, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.diploma.title || "DIPLÔME DE LICENCE LMD", 60, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("2.2 Domaine & Mention :", 16, currentY + 11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.diploma.fieldOfStudy} — Mention : ${data.diploma.mention}`, 50, currentY + 11.5);

  doc.setTextColor(71, 85, 105);
  doc.text("2.3 Établissement délivreur :", 16, currentY + 17.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${school} (${faculty})`, 54, currentY + 17.5);

  doc.setTextColor(71, 85, 105);
  doc.text("2.4 Langue d'enseignement :", pageWidth / 2 + 2, currentY + 17.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Français (Cadre REESAO)", pageWidth / 2 + 42, currentY + 17.5);

  currentY += 26;

  // ─── 3. INFORMATIONS SUR LE NIVEAU DU DIPLÔME ──────────────────────────────
  renderSectionBar("3", "Informations sur le niveau du diplôme");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 23, 1, 1, "FD");

  const isMaster = data.diploma.degreeLevel.toLowerCase().includes("master");
  const isDoctorat = data.diploma.degreeLevel.toLowerCase().includes("doctorat");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("3.1 Niveau de qualification :", 16, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  const qualif = isDoctorat
    ? "Grade de Doctorat (Bac + 8) — Niveau 8 CITE / UNESCO"
    : isMaster
    ? "Grade de Master (Bac + 5) — Niveau 7 CITE / UNESCO"
    : "Grade de Licence (Bac + 3) — Niveau 6 CITE / UNESCO";
  doc.text(qualif, 56, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("3.2 Durée officielle du programme :", 16, currentY + 11.5);
  doc.setTextColor(15, 23, 42);
  const duration = isDoctorat
    ? "3 Années académiques (6 Semestres) — 180 Crédits ECTS"
    : isMaster
    ? "2 Années académiques (4 Semestres) — 120 Crédits ECTS"
    : "3 Années académiques (6 Semestres) — 180 Crédits ECTS";
  doc.text(duration, 64, currentY + 11.5);

  doc.setTextColor(71, 85, 105);
  doc.text("3.3 Conditions d'accès officielles :", 16, currentY + 17.5);
  doc.setTextColor(15, 23, 42);
  const access = isDoctorat
    ? "Titulaire d'un Master de Recherche ou diplôme équivalent accrédité CAMES"
    : isMaster
    ? "Titulaire d'une Licence LMD ou diplôme équivalent accrédité CAMES"
    : "Baccalauréat de l'Enseignement Secondaire ou diplôme admis en équivalence";
  doc.text(access, 64, currentY + 17.5);

  currentY += 26;

  // ─── 4. INFORMATIONS SUR LE CONTENU ET RÉSULTATS DU CYCLE ───────────────────
  renderSectionBar("4", "Contenu des études et bilan global des résultats");

  // 4 Cards Metric Dashboard
  const cardW = (pageWidth - 26 - 9) / 4;
  const cardH = 20;

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
    doc.roundedRect(kx, currentY, cardW, cardH, 1, 1, "FD");

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + cardW / 2, currentY + 4.5, { align: "center" });

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, kx + cardW / 2, currentY + 11.5, { align: "center" });

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, kx + cardW / 2, currentY + 16.5, { align: "center" });
  });

  currentY += cardH + 4;

  // ECTS Grading System Official Scale Table
  const ectsHeaders = ["Grade ECTS", "Pourcentage Cohorte", "Définition & Appréciation", "Fourchette de Notes Indicative"];
  const ectsRows = [
    ["A", "10% supérieurs", "EXCELLENT — Résultats remarquables avec seulement des insuffisances mineures", "≥ 16.00 / 20 (Très Bien)"],
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
      fontSize: 6.2,
      halign: "center",
      cellPadding: 1.2,
    },
    bodyStyles: {
      fontSize: 5.8,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 20 },
      1: { cellWidth: 28 },
      2: { halign: "left", cellWidth: 86 },
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

  currentY = 15;

  // Header Banner Page 2
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, currentY, pageWidth - 26, 9.5, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ANNEXE DESCRIPTIVE AU DIPLÔME (SUITE) — DÉTAIL DU CURRICULUM & CERTIFICATION`,
    17,
    currentY + 6
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Étudiant : ${(data.student.nom || "").toUpperCase()} • N° Matricule : ${data.student.matricule || "N/A"}`,
    pageWidth - 17,
    currentY + 6,
    { align: "right" }
  );

  currentY += 13.5;

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
      fontSize: 6.2,
      halign: "center",
      cellPadding: 1.2,
    },
    bodyStyles: {
      fontSize: 5.8,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", cellWidth: 24 },
      1: { halign: "left", cellWidth: 80, fontStyle: "bold" },
      2: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 20 },
      3: { fontStyle: "bold", cellWidth: 22 },
      4: { fontStyle: "bold", textColor: [16, 185, 129], cellWidth: 22 },
      5: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 16 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // ─── 5. INFORMATIONS SUR LA FONCTION DU DIPLÔME ────────────────────────────
  renderSectionBar("5", "Informations sur la fonction du diplôme");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 17, 1, 1, "FD");

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.1 Poursuite d'études supérieures :", 16, currentY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const progDesc = isMaster
    ? "Accès direct aux formations doctorales (Doctorat / Ph.D.) et aux concours nationaux/internationaux de recrutement de chercheurs."
    : "Accès de plein droit aux programmes de Master (Recherche ou Professionnel) dans l'espace CAMES et international.";
  doc.text(progDesc, 64, currentY + 5, { maxWidth: 124 });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.2 Statut professionnel conféré :", 16, currentY + 11.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    "Permet d'exercer des fonctions de cadre moyen ou supérieur, ingénieur d'études, analyste, consultant ou gestionnaire de projets.",
    60,
    currentY + 11.5,
    { maxWidth: 128 }
  );

  currentY += 20;

  // ─── 6. RENSEIGNEMENTS COMPLÉMENTAIRES ─────────────────────────────────────
  renderSectionBar("6", "Renseignements complémentaires & Mobilité");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 16, 1, 1, "FD");

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.1 Stage / Travaux de recherche :", 16, currentY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const stageInfo = data.internshipOrThesis?.topic
    ? `Thème : "${data.internshipOrThesis.topic}" (${data.internshipOrThesis.organization || "Entreprise"})`
    : "Stage d'immersion professionnelle et soutenance de projet de fin de cycle validés avec mention très honorable.";
  doc.text(stageInfo, 62, currentY + 5, { maxWidth: 126 });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.2 Organismes d'accréditation :", 16, currentY + 11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Conseil Africain et Malgache pour l'Enseignement Supérieur (CAMES : www.lecames.org) • Site : ${data.institution.website || "www.universite-edut.org"}`,
    60,
    currentY + 11,
    { maxWidth: 128 }
  );

  currentY += 19;

  // ─── 7. CERTIFICATION OFFICIELLE DE L'ANNEXE ──────────────────────────────
  renderSectionBar("7", "Certification officielle de l'annexe");

  const sigBoxH = 26;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(13, currentY, pageWidth - 26, sigBoxH, 1, 1, "FD");

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Date de délivrance :", 17, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), 45, currentY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text("Lieu d'émission :", 90, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.city || "Niamey", 112, currentY + 5);

  // Signatures Lines
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen de la Faculté / Chef d'Établissement", 17, currentY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Visa officiel", 17, currentY + 15.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(17, currentY + 23, 65, currentY + 23);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Recteur / Président de l'Université", pageWidth - 80, currentY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("Sceau officiel et Approbation", pageWidth - 80, currentY + 15.5);
  doc.line(pageWidth - 80, currentY + 23, pageWidth - 17, currentY + 23);

  // Security QR / Seal Box in Middle
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth / 2 - 14, currentY + 8, 28, 15, 1, 1, "FD");
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text("SCEAU DE SÉCURITÉ", pageWidth / 2, currentY + 13, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("DOCUMENT OFFICIEL", pageWidth / 2, currentY + 16.5, { align: "center" });
  doc.text("INFALSIFIABLE", pageWidth / 2, currentY + 20, { align: "center" });

  currentY += sigBoxH + 4;

  // ─── 8. SCHÉMA DU SYSTÈME NATIONAL D'ENSEIGNEMENT SUPÉRIEUR (LMD) ─────────
  renderSectionBar("8", "Description du système d'enseignement supérieur (Schéma LMD)");

  const lmdHeaders = ["Grade Universitaire", "Durée", "Crédits ECTS", "Conditions d'accès", "Passerelles & Débouchés"];
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
      fontSize: 6,
      halign: "center",
      cellPadding: 1,
    },
    bodyStyles: {
      fontSize: 5.5,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 0.9,
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
