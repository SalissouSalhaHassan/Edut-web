/**
 * Diploma Supplement (Annexe Descriptive au Diplôme) Generator
 * Official Standard: UNESCO / Conseil de l'Europe / Commission Européenne / CAMES / REESAO
 * Multi-page luxury vector A4 layout with security frames
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
    title: string; // e.g. "LICENCE PROFESSIONNELLE" or "DIPLÔME DE MASTER"
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
  };
  curriculumSemesters?: Array<{
    semesterCode: string;
    credits: number;
    average: number;
    validatedUes: Array<{
      code: string;
      title: string;
      credits: number;
      grade: number;
    }>;
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

  const drawPageBorders = (pageNum: number, totalPages: number) => {
    // Outer security border
    doc.setDrawColor(15, 23, 42); // slate-900
    doc.setLineWidth(0.8);
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14, "S");

    // Inner fine border
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.3);
    doc.rect(8.5, 8.5, pageWidth - 17, pageHeight - 17, "S");

    // Micro corner crosses
    const crossSize = 2.5;
    const corners = [
      { x: 10, y: 10 },
      { x: pageWidth - 10, y: 10 },
      { x: 10, y: pageHeight - 10 },
      { x: pageWidth - 10, y: pageHeight - 10 },
    ];
    doc.setDrawColor(148, 163, 184);
    corners.forEach((c) => {
      doc.line(c.x - crossSize, c.y, c.x + crossSize, c.y);
      doc.line(c.x, c.y - crossSize, c.x, c.y + crossSize);
    });

    // Page numbering footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ANNEXE DESCRIPTIVE AU DIPLÔME (MODÈLE ÉLABORÉ PAR L'UNESCO, LA COMMISSION EUROPÉENNE ET LE CAMES) — Page ${pageNum} sur ${totalPages}`,
      pageWidth / 2,
      pageHeight - 9.5,
      { align: "center" }
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 : SECTIONS 1, 2, 3, 4 (En-tête & Informations Générales)
  // ══════════════════════════════════════════════════════════════════════════
  drawPageBorders(1, 2);

  // Republic & University Heading
  const country = (data.institution.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const school = (data.institution.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 14);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 15.5, 50, 15.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, 14, 20, { maxWidth: 65 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth - 14, 14, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 18.5, { align: "right" });

  // Main Banner
  const bannerY = 27;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, bannerY, pageWidth - 24, 13, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ANNEXE DESCRIPTIVE AU DIPLÔME (DIPLOMA SUPPLEMENT)`,
    pageWidth / 2,
    bannerY + 5.5,
    { align: "center" }
  );

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Norme Internationale UNESCO / Espace Européen de l'Enseignement Supérieur / CAMES — ECTS`,
    pageWidth / 2,
    bannerY + 9.5,
    { align: "center" }
  );

  let currentY = 44;

  const renderSectionHeader = (number: string, title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(12, currentY, pageWidth - 24, 6.5, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(12, currentY + 6.5, pageWidth - 12, currentY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${number}. ${title.toUpperCase()}`, 15, currentY + 4.5);
    currentY += 8.5;
  };

  // ─── 1. INFORMATIONS SUR LE TITULAIRE DU DIPLÔME ───────────────────────────
  renderSectionHeader("1", "Informations sur le titulaire du diplôme");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("1.1 Nom de famille :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 52, currentY);

  doc.setTextColor(71, 85, 105);
  doc.text("1.2 Numéro d'immatriculation / INE :", pageWidth / 2 + 5, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 56, currentY);

  currentY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text("1.3 Date et lieu de naissance :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  const birthInfo = `${data.student.dateNaissance || "12/05/2002"} à ${data.student.lieuNaissance || "Niamey"}`;
  doc.text(birthInfo, 55, currentY);

  doc.setTextColor(71, 85, 105);
  doc.text("1.4 Nationalité :", pageWidth / 2 + 5, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.nationalite || "Nigérienne", pageWidth / 2 + 30, currentY);

  currentY += 8;

  // ─── 2. INFORMATIONS SUR LE DIPLÔME ────────────────────────────────────────
  renderSectionHeader("2", "Informations sur le diplôme");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("2.1 Intitulé du diplôme :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.diploma.title || "DIPLÔME DE LICENCE LMD", 52, currentY);

  currentY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text("2.2 Domaine & Mention :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.diploma.fieldOfStudy} — Mention : ${data.diploma.mention}`, 52, currentY);

  currentY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text("2.3 Établissement délivreur :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(school, 55, currentY);

  currentY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text("2.4 Langue d'enseignement / d'examen :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text("Français (Norme REESAO / CAMES)", 68, currentY);

  currentY += 8;

  // ─── 3. INFORMATIONS SUR LE NIVEAU DU DIPLÔME ──────────────────────────────
  renderSectionHeader("3", "Informations sur le niveau du diplôme");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("3.1 Niveau de qualification :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  const cycleDesc = data.diploma.degreeLevel.toLowerCase().includes("master")
    ? "Grade de Master (Bac + 5) — Niveau 7 CITE / UNESCO"
    : "Grade de Licence (Bac + 3) — Niveau 6 CITE / UNESCO";
  doc.text(cycleDesc, 55, currentY);

  currentY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text("3.2 Durée officielle du programme :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  const durDesc = data.diploma.degreeLevel.toLowerCase().includes("master")
    ? "2 Années académiques (4 Semestres) — 120 Crédits ECTS"
    : "3 Années académiques (6 Semestres) — 180 Crédits ECTS";
  doc.text(durDesc, 64, currentY);

  currentY += 5;
  doc.setTextColor(71, 85, 105);
  doc.text("3.3 Conditions d'accès officielles :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  const accessDesc = data.diploma.degreeLevel.toLowerCase().includes("master")
    ? "Titulaire d'une Licence LMD ou diplôme équivalent reconnu par le CAMES"
    : "Baccalauréat de l'Enseignement Secondaire ou titre admis en équivalence";
  doc.text(accessDesc, 64, currentY);

  currentY += 8;

  // ─── 4. INFORMATIONS SUR LE CONTENU ET LES RÉSULTATS OBTENUS ───────────────
  renderSectionHeader("4", "Informations sur le contenu et les résultats obtenus");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("4.1 Organisation des études :", 16, currentY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    "Temps plein. Enseignements organisés en Unités d'Enseignement (UE) Fondamentales, Transversales et Optionnelles.",
    58,
    currentY,
    { maxWidth: 135 }
  );

  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("4.2 Exigences du programme :", 16, currentY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const reqDesc = data.diploma.degreeLevel.toLowerCase().includes("master")
    ? "Capitalisation intégrale de 120 Crédits ECTS + Soutenance publique de Mémoire de Recherche / Professionnel."
    : "Capitalisation intégrale de 180 Crédits ECTS (6 Semestres de 30 ECTS chacun) + Stage professionnel.";
  doc.text(reqDesc, 58, currentY, { maxWidth: 135 });

  currentY += 8;

  // Grade & Honors Summary Box
  const summaryY = currentY;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, summaryY, pageWidth - 24, 25, 1.5, 1.5, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("RÉSULTATS GLOBAUX DU DIPLÔME :", 16, summaryY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`• Total Crédits ECTS Capitalisés : `, 16, summaryY + 13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(`${data.diploma.totalCreditsAcquired || 180} ECTS validés`, 64, summaryY + 13);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`• Moyenne Générale du Cycle (MGC) : `, 16, summaryY + 19);
  doc.setFont("helvetica", "bold");
  doc.text(`${data.diploma.finalGradeAverage.toFixed(2)} / 20`, 68, summaryY + 19);

  doc.setFont("helvetica", "normal");
  doc.text(`• Mention Finale Attribuée : `, pageWidth / 2 + 10, summaryY + 13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text(data.diploma.honors || "Bien", pageWidth / 2 + 48, summaryY + 13);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`• Grade ECTS International : `, pageWidth / 2 + 10, summaryY + 19);
  doc.setFont("helvetica", "bold");
  const ectsGrade = getEctsGrade(data.diploma.finalGradeAverage);
  doc.setTextColor(79, 70, 229);
  doc.text(`${ectsGrade.grade} (${ectsGrade.label})`, pageWidth / 2 + 50, summaryY + 19);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2 : SECTIONS 5, 6, 7, 8 (Fonction, Certification & Système National)
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage("a4", "portrait");
  drawPageBorders(2, 2);

  currentY = 16;

  // Mini Title Header on Page 2
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ANNEXE DESCRIPTIVE AU DIPLÔME (SUITE)`, 14, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Titulaire : ${(data.student.nom || "").toUpperCase()} • N° Matricule : ${data.student.matricule || "N/A"}`, pageWidth - 14, currentY, { align: "right" });

  currentY += 6;

  // ─── 5. INFORMATIONS SUR LA FONCTION DU DIPLÔME ────────────────────────────
  renderSectionHeader("5", "Informations sur la fonction du diplôme");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.1 Accès aux études supérieures ultérieures :", 16, currentY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const nextProgDesc = data.diploma.degreeLevel.toLowerCase().includes("master")
    ? "Donne accès aux études doctorales (Doctorat / Ph.D.) et aux écoles doctorales accréditées."
    : "Donne accès aux programmes de Master (Professionnel ou Recherche) dans l'espace CAMES et international.";
  doc.text(nextProgDesc, 72, currentY, { maxWidth: 120 });

  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("5.2 Statut professionnel conféré :", 16, currentY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    "Permet d'exercer des fonctions de cadre moyen/supérieur, ingénieur d'études, analyste ou gestionnaire de projets.",
    60,
    currentY,
    { maxWidth: 130 }
  );

  currentY += 8;

  // ─── 6. RENSEIGNEMENTS COMPLÉMENTAIRES ─────────────────────────────────────
  renderSectionHeader("6", "Renseignements complémentaires & Mobilité");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.1 Stage / Travaux de recherche :", 16, currentY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const stageDesc = data.internshipOrThesis?.topic
    ? `Thème : "${data.internshipOrThesis.topic}" (${data.internshipOrThesis.organization || "Entreprise / Laboratoire"})`
    : "Stage d'immersion professionnelle et soutenance de projet de fin de cycle validés avec succès.";
  doc.text(stageDesc, 62, currentY, { maxWidth: 130 });

  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("6.2 Autres sources d'information :", 16, currentY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Site officiel de l'établissement : ${data.institution.website || "www.universite-edut.org"} • CAMES : www.lecames.org`,
    62,
    currentY,
    { maxWidth: 130 }
  );

  currentY += 10;

  // ─── 7. CERTIFICATION OFFICIELLE DE L'ANNEXE ──────────────────────────────
  renderSectionHeader("7", "Certification officielle de l'annexe");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("7.1 Date de délivrance :", 16, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }), 48, currentY);

  doc.setTextColor(71, 85, 105);
  doc.text("7.2 Lieu d'émission :", pageWidth / 2 + 10, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.city || "Niamey", pageWidth / 2 + 38, currentY);

  currentY += 6;

  // Signatures Box
  const sigY = currentY;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, sigY, pageWidth - 24, 28, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen de la Faculté / Directeur", 20, sigY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Signature et Visa", 20, sigY + 10);
  doc.line(20, sigY + 22, 65, sigY + 22);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Recteur / Président de l'Université", pageWidth - 75, sigY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Sceau officiel et Approbation", pageWidth - 75, sigY + 10);
  doc.line(pageWidth - 75, sigY + 22, pageWidth - 20, sigY + 22);

  currentY += 34;

  // ─── 8. DESCRIPTION DU SYSTÈME NATIONAL D'ENSEIGNEMENT SUPÉRIEUR (LMD) ─────
  renderSectionHeader("8", "Description du système d'enseignement supérieur (Schéma LMD)");

  const lmdHeaders = ["Grade LMD", "Durée", "Crédits ECTS", "Conditions d'accès", "Passerelles & Débouchés"];
  const lmdBody = [
    ["Licence (L)", "3 ans (6 semestres)", "180 ECTS", "Baccalauréat", "Insertion Pro ou Accès Master"],
    ["Master (M)", "2 ans (4 semestres)", "120 ECTS", "Licence LMD", "Cadre Supérieur ou Accès Doctorat"],
    ["Doctorat (D)", "3 ans (6 semestres)", "180 ECTS", "Master Recherche", "Enseignement Supérieur, R&D"],
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
      fontSize: 6.5,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 24 },
      3: { halign: "left", cellWidth: 35 },
      4: { halign: "left" },
    },
  });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Diploma_Supplement_UNESCO_${cleanNom}.pdf`);
}
