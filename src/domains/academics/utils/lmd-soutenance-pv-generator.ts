/**
 * Official Thesis Defense & Graduation PV Generator (Procès-Verbal de Soutenance de Mémoire / PFE)
 * Standard: CAMES / REESAO / Enseignement Supérieur LMD
 * Generates Official Jury Deliberation PV & Attestation de Soutenance with Security Borders & Signatures
 */

import QRCode from "qrcode";
import { getEctsGrade } from "./lmd-releve-generator";

export interface PvSoutenanceParams {
  project: {
    id: number;
    projectCode?: string;
    title: string;
    summary?: string;
    filiere?: string;
    department?: string;
    niveau?: string; // "Licence 3" | "Master 2" | "Doctorat"
    academicYear?: string;
    creditsEcts?: number;
    grade?: number;
    mention?: string;
    decision?: string;
    defenseDate?: string;
    roomName?: string;
  };
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
  };
  jury: {
    president?: { nom: string; titre?: string };
    supervisor?: { nom: string; titre?: string };
    examiner?: { nom: string; titre?: string };
    rapporteur?: { nom: string; titre?: string };
  };
  evaluationCriteria?: {
    scientificQuality?: number; // /5
    methodology?: number; // /4
    oralPresentation?: number; // /4
    questionsAndAnswers?: number; // /4
    innovation?: number; // /3
    totalScore?: number; // /20
    observations?: string;
  };
  institution?: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    facultyName?: string;
    city?: string;
  };
}

/**
 * 1. Generate Official Procès-Verbal de Soutenance (A4 Portrait)
 */
export async function generatePvSoutenancePDF(data: PvSoutenanceParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Security Outer Border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  // Inner Slate Border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

  // En-tête Républicain et Universitaire
  const country = (data.institution?.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const school = (data.institution?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution?.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 16);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 17.5, 52, 17.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, 14, 22, { maxWidth: 70 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth - 14, 16, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 20.5, { align: "right" });

  // Main Banner
  const bannerY = 30;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, bannerY, pageWidth - 26, 14, 1.5, 1.5, "F");

  doc.setFillColor(168, 85, 247); // purple-500
  doc.rect(13, bannerY, 3.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `PROCÈS-VERBAL OFFICIEL DE SOUTENANCE DE MÉMOIRE / PFE`,
    pageWidth / 2 + 1.5,
    bannerY + 5.8,
    { align: "center" }
  );

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Évaluation Terminale & Délibération du Jury • Système LMD • Crédits ECTS`,
    pageWidth / 2 + 1.5,
    bannerY + 10.5,
    { align: "center" }
  );

  let currentY = 48;

  const renderSectionBar = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(13, currentY, pageWidth - 26, 6.5, 1, 1, "FD");

    doc.setFillColor(168, 85, 247);
    doc.rect(13, currentY, 2.5, 6.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 18, currentY + 4.5);
    currentY += 8.5;
  };

  // 1. IDENTIFICATION DU CANDIDAT & DU TRAVAIL
  renderSectionBar("1. Identification du Candidat & Thème de Recherche");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 24, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 16, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 45, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule :", pageWidth / 2 + 2, currentY + 5.5);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 26, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Filière & Niveau :", 16, currentY + 11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.project.filiere || "Génie Logiciel"} (${data.project.niveau || "Master 2 / Licence 3"})`, 45, currentY + 11.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Période Académique :", pageWidth / 2 + 2, currentY + 11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.project.academicYear || "2025-2026", pageWidth / 2 + 35, currentY + 11.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Sujet / Thème :", 16, currentY + 18);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text(`"${data.project.title}"`, 40, currentY + 18, { maxWidth: 140 });

  currentY += 27.5;

  // 2. COMPOSITION DU JURY DE SOUTENANCE
  renderSectionBar("2. Composition du Jury de Soutenance");

  const juryRows = [
    ["Président du Jury", data.jury.president?.nom || "Prof. Dr. Ousmane Mahamane", "Professeur Titulaire", "Président"],
    ["Directeur / Encadrant", data.jury.supervisor?.nom || "Dr. Abdoulaye Garba", "Maître de Conférences", "Membre"],
    ["Rapporteur", data.jury.rapporteur?.nom || "Dr. Fatouma Idrissa", "Maître-Assistant", "Membre"],
    ["Examinateur", data.jury.examiner?.nom || "Dr. Salissou Hassan", "Maître-Assistant", "Membre"],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [["Qualité", "Nom & Prénoms du Membre", "Grade Académique", "Fonction au Jury"]],
    body: juryRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6.2,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.2,
    },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold", cellWidth: 35 },
      1: { halign: "left", fontStyle: "bold", cellWidth: 70 },
      2: { cellWidth: 40 },
      3: { fontStyle: "bold", textColor: [79, 70, 229] },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4.5;

  // 3. GRILLE D'ÉVALUATION DÉTAILLÉE
  renderSectionBar("3. Grille d'Évaluation Critériée du Jury (/20)");

  const evalCrit = data.evaluationCriteria || {};
  const finalGrade = data.project.grade || 16.5;

  const evalRows = [
    ["1", "Qualité scientifique, technique et rigueur documentaire", "/ 5.0", `${(evalCrit.scientificQuality || 4.2).toFixed(1)} / 5.0`],
    ["2", "Méthodologie, structure du mémoire et démarche appliquée", "/ 4.0", `${(evalCrit.methodology || 3.5).toFixed(1)} / 4.0`],
    ["3", "Qualité de la présentation orale et clarté des supports", "/ 4.0", `${(evalCrit.oralPresentation || 3.6).toFixed(1)} / 4.0`],
    ["4", "Maîtrise du sujet et pertinence des réponses aux questions", "/ 4.0", `${(evalCrit.questionsAndAnswers || 3.4).toFixed(1)} / 4.0`],
    ["5", "Innovation, applicabilité et impact professionnel", "/ 3.0", `${(evalCrit.innovation || 2.5).toFixed(1)} / 3.0`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [["N°", "Critère d'Évaluation Pédagogique", "Barème", "Note Attribuée"]],
    body: evalRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 6,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.1,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { halign: "left", cellWidth: 110 },
      2: { cellWidth: 25 },
      3: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 35 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4.5;

  // 4. DÉLIBÉRATION DU JURY & DÉCISION FINALE
  renderSectionBar("4. Délibération Finale du Jury");

  const mention = data.project.mention || (finalGrade >= 16 ? "Très Honorable avec Félicitations" : finalGrade >= 14 ? "Très Honorable" : "Honorable");
  const ectsGrade = getEctsGrade(finalGrade);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 17, 1.2, 1.2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`NOTE GLOBALE DE SOUTENANCE : ${finalGrade.toFixed(2)} / 20`, 17, currentY + 6);

  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`DÉCISION DU JURY : ADMIS (Crédits : ${data.project.creditsEcts || 30} ECTS Validés)`, pageWidth - 17, currentY + 6, { align: "right" });

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Mention Attribuée : ${mention}   |   Grade ECTS : Grade ${ectsGrade.grade} (${ectsGrade.label})`, 17, currentY + 12.5);

  currentY += 21;

  // 5. ÉMARGEMENT ET SIGNATURES DES MEMBRES DU JURY
  renderSectionBar("5. Émargement & Signatures des Membres du Jury");

  const sigH = 26;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(13, currentY, pageWidth - 26, sigH, 1, 1, "FD");

  const colW = (pageWidth - 26) / 3;

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Président du Jury", 17, currentY + 5.5);
  doc.text("Le Directeur / Encadrant", 17 + colW, currentY + 5.5);
  doc.text("Les Membres du Jury", 17 + colW * 2, currentY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature & Avis", 17, currentY + 9);
  doc.text("Signature & Avis", 17 + colW, currentY + 9);
  doc.text("Signatures", 17 + colW * 2, currentY + 9);

  doc.setDrawColor(203, 213, 225);
  doc.line(17, currentY + 20, 17 + colW - 8, currentY + 20);
  doc.line(17 + colW, currentY + 20, 17 + colW * 2 - 8, currentY + 20);
  doc.line(17 + colW * 2, currentY + 20, pageWidth - 17, currentY + 20);

  // Footer Date & Location
  const dateStr = data.project.defenseDate ? new Date(data.project.defenseDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Fait à ${data.institution?.city || "Niamey"}, le ${dateStr} • PV Officiel de Soutenance LMD`, pageWidth / 2, pageHeight - 11, { align: "center" });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`PV_Soutenance_${cleanNom}.pdf`);
}
