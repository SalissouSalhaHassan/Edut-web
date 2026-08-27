/**
 * Official University Degree & Attestation de Réussite Generator
 * Standards: REESAO / CAMES / ECTS / Ministère de l'Enseignement Supérieur
 * High-End Luxury Vector Layout with Multi-Layered Gold & Navy Security Borders,
 * Authentic Security Seal, Scannable Anti-Fraud QR Code & Balanced Spacing.
 */

import QRCode from "qrcode";
import { getEctsGrade } from "./lmd-releve-generator";

export interface LmdDiplomaParams {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
    sexe?: string;
  };
  degree: {
    title: string; // e.g. "LICENCE" or "MASTER"
    specialization: string; // e.g. "Informatique & Systèmes d'Information"
    fieldOfStudy: string; // e.g. "Sciences & Technologies"
    mention: string; // e.g. "Très Bien", "Bien", "Assez Bien"
    finalGradeAverage: number; // e.g. 16.25 / 20
    totalCreditsAcquired: number; // 180 ECTS or 120 ECTS
    sessionName: string; // e.g. "2025-2026"
    deliberationDate?: string;
    diplomaNumber?: string;
  };
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    motto?: string;
    facultyName?: string;
    rectorName?: string;
    deanName?: string;
    city?: string;
  };
}

/**
 * 1. Generate Official Luxury University Degree (Diplôme de Licence / Master / Doctorat - A4 Paysage)
 */
export async function generateLmdOfficialDiplomaPDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm

  // ─── 1. CADRE DE SÉCURITÉ MULTI-COUCHES OR & BLEU ROYAL ───────────────────
  // Outer Royal Navy Frame
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(1.4);
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14, "S");

  // Secondary Gold Frame
  doc.setDrawColor(217, 119, 6); // amber-600 gold
  doc.setLineWidth(0.8);
  doc.rect(9, 9, pageWidth - 18, pageHeight - 18, "S");

  // Tertiary Fine Slate Security Line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(10.5, 10.5, pageWidth - 21, pageHeight - 21, "S");

  // Corner Rosettes & Ornamental Stars (4 Corners)
  const drawCornerRosette = (cx: number, cy: number) => {
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.6);
    doc.circle(cx, cy, 3.5, "S");
    doc.circle(cx, cy, 1.8, "S");
    doc.setFillColor(15, 23, 42);
    doc.circle(cx, cy, 0.8, "F");

    // Cross lines
    doc.line(cx - 5, cy, cx + 5, cy);
    doc.line(cx, cy - 5, cx, cy + 5);
  };

  drawCornerRosette(14, 14);
  drawCornerRosette(pageWidth - 14, 14);
  drawCornerRosette(14, pageHeight - 14);
  drawCornerRosette(pageWidth - 14, pageHeight - 14);

  // ─── 2. EN-TÊTE RÉPUBLICAIN & UNIVERSITAIRE ÉQUILIBRÉ ──────────────────────
  const country = (data.institution.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const motto = data.institution.motto || "Fraternité — Travail — Progrès";
  const ministry = data.institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const school = (data.institution.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();

  // Top Republic & Ministry
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(country, pageWidth / 2, 18, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(motto, pageWidth / 2, 22.2, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, pageWidth / 2, 26.5, { align: "center" });

  // University & Faculty Name with Gold underline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth / 2, 34, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth / 2, 39, { align: "center" });

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(pageWidth / 2 - 40, 41.5, pageWidth / 2 + 40, 41.5);

  // ─── 3. GRAND BANDEAU DE TITRE DU DIPLÔME ──────────────────────────────────
  const bannerY = 45;
  const isMaster = data.degree.title.toLowerCase().includes("master");
  const isDoctorat = data.degree.title.toLowerCase().includes("doctorat");
  const targetCredits = isDoctorat ? 180 : isMaster ? 120 : 180;
  const citeLevel = isDoctorat ? "Niveau 8 CITE / UNESCO" : isMaster ? "Niveau 7 CITE / UNESCO" : "Niveau 6 CITE / UNESCO";

  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(pageWidth / 2 - 95, bannerY, 190, 14.5, 2, 2, "F");

  // Gold accent left & right tabs
  doc.setFillColor(217, 119, 6);
  doc.rect(pageWidth / 2 - 95, bannerY, 3.5, 14.5, "F");
  doc.rect(pageWidth / 2 + 91.5, bannerY, 3.5, 14.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `D I P L Ô M E   D E   ${data.degree.title.toUpperCase()}`,
    pageWidth / 2,
    bannerY + 6.2,
    { align: "center" }
  );

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Grade Universitaire conféré selon le Système LMD • ${citeLevel} • ${targetCredits} Crédits ECTS • Norme CAMES`,
    pageWidth / 2,
    bannerY + 11.2,
    { align: "center" }
  );

  // ─── 4. FORMULE LÉGALE & NOM DU LAURÉAT ─────────────────────────────────────
  let currentY = 66;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Le Président du Jury et le Recteur de l'Université, vu le procès-verbal des délibérations, attestent que :",
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  // Student Prestige Presentation Card
  currentY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(pageWidth / 2 - 80, currentY, 160, 19, 2, 2, "FD");

  // Gold accent lines on sides
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 76, currentY + 3.5, pageWidth / 2 - 76, currentY + 15.5);
  doc.line(pageWidth / 2 + 76, currentY + 3.5, pageWidth / 2 + 76, currentY + 15.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const fullName = (data.student.nom || "").toUpperCase();
  doc.text(fullName, pageWidth / 2, currentY + 8.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  const birthInfo = `Né(e) le ${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}   •   N° Matricule / INE : ${data.student.matricule || "N/A"}`;
  doc.text(birthInfo, pageWidth / 2, currentY + 14.5, { align: "center" });

  currentY += 24;

  // Validation statement
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `A satisfait avec succès à l'ensemble des épreuves d'évaluation prévues par la maquette pédagogique nationale,`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );
  doc.text(
    `et a capitalisé l'intégralité des ${targetCredits} Crédits ECTS requis pour l'obtention du diplôme :`,
    pageWidth / 2,
    currentY + 5,
    { align: "center" }
  );

  currentY += 9;

  // ─── 5. CARTOUCHE DE QUALIFICATION & PERFORMANCE (4 BLOCS) ──────────────────
  const cardW = 190;
  const cardH = 22;
  const cardX = pageWidth / 2 - cardW / 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(cardX, currentY, cardW, cardH, 2, 2, "FD");

  // 4 Columns inside Card
  const colWidth = cardW / 4;
  const ectsGrade = getEctsGrade(data.degree.finalGradeAverage);
  const mention = data.degree.mention || (data.degree.finalGradeAverage >= 16 ? "Très Bien" : data.degree.finalGradeAverage >= 14 ? "Bien" : "Passable");

  const statBlocks = [
    { label: "DOMAINE D'ÉTUDES", val: data.degree.fieldOfStudy || "Sciences & Technologies", sub: "Discipline Pédagogique", color: [15, 23, 42] },
    { label: "MENTION / SPÉCIALITÉ", val: data.degree.specialization || "Informatique", sub: "Parcours Professionnel", color: [79, 70, 229] },
    { label: "MOYENNE DU CYCLE (MGC)", val: `${data.degree.finalGradeAverage.toFixed(2)} / 20`, sub: "Barème officiel", color: [15, 23, 42] },
    { label: "MENTION & GRADE ECTS", val: `${mention} (Grade ${ectsGrade.grade})`, sub: ectsGrade.label, color: [16, 185, 129] },
  ];

  statBlocks.forEach((block, i) => {
    const bx = cardX + i * colWidth;
    if (i > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(bx, currentY + 3, bx, currentY + cardH - 3);
    }

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(block.label, bx + colWidth / 2, currentY + 5.5, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(block.color[0], block.color[1], block.color[2]);
    doc.text(block.val, bx + colWidth / 2, currentY + 12.5, { align: "center", maxWidth: colWidth - 4 });

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(block.sub, bx + colWidth / 2, currentY + 18, { align: "center" });
  });

  currentY += cardH + 5;

  // Legal Concluding Statement
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "En foi de quoi, le présent diplôme lui est délivré pour servir et valoir ce que de droit avec tous les prérogatives, droits et privilèges qui y sont attachés.",
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  // ─── 6. SECTION DES SIGNATURES & SCEAU OFFICIEL VECTORIEL ──────────────────
  const sigY = currentY + 6;

  // 1. Doyen de la Faculté (Left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen de la Faculté / Directeur", 52, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Visa officiel", 52, sigY + 4.5);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(26, sigY + 19, 78, sigY + 19);

  // 2. Sceau Officiel de l'Université (Center Vector Seal)
  const sealCx = pageWidth / 2;
  const sealCy = sigY + 9.5;
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.circle(sealCx, sealCy, 11.5, "S");
  doc.circle(sealCx, sealCy, 9, "S");

  doc.setFontSize(4.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(217, 119, 6);
  doc.text("RÉPUBLIQUE DU NIGER", sealCx, sealCy - 5.5, { align: "center" });
  doc.text("• UNIVERSITÉ EDUT •", sealCx, sealCy - 2.5, { align: "center" });
  doc.setFontSize(5.5);
  doc.setTextColor(15, 23, 42);
  doc.text("SCEAU OFFICIEL", sealCx, sealCy + 2, { align: "center" });
  doc.setFontSize(4.5);
  doc.setTextColor(79, 70, 229);
  doc.text("DÉLIBÉRATION LMD", sealCx, sealCy + 5.2, { align: "center" });
  doc.text("HOMOLOGUÉ CAMES", sealCx, sealCy + 7.5, { align: "center" });

  // 3. Recteur de l'Université (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Recteur / Président de l'Université", pageWidth - 52, sigY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Sceau officiel et Approbation", pageWidth - 52, sigY + 4.5, { align: "right" });
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(pageWidth - 78, sigY + 19, pageWidth - 26, sigY + 19);

  // ─── 7. PIED DE PAGE : CODE QR ANTI-FRAUDE & RÉFÉRENCE NATIONALE ───────────
  const footY = 181;

  // Left QR Code (Placed at x = 26mm to clear the corner rosette at x = 14mm)
  const verifUrl = `https://edut.org/verify/${data.student.matricule || data.student.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, "PNG", 26, footY, 16, 16);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("VÉRIFICATION NUMÉRIQUE OFFICIELLE", 45, footY + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text("Scannez le QR Code pour vérifier l'authenticité", 45, footY + 8.5);
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Réf : ${data.degree.diplomaNumber || `DIP-${data.student.id}-2026`}`, 45, footY + 12.5);
  } catch (e) {}

  // Right Date & Location (Aligned right at pageWidth - 26mm to clear the corner rosette at pageWidth - 14mm)
  const dateStr = data.degree.deliberationDate || new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Fait à ${data.institution.city || "Niamey"}, le ${dateStr}`, pageWidth - 26, footY + 5.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(148, 163, 184);
  doc.text("Enregistré au Registre National des Titres et Diplômes d'Enseignement Supérieur", pageWidth - 26, footY + 10, { align: "right" });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Diplome_Officiel_${data.degree.title}_${cleanNom}.pdf`);
}

/**
 * 2. Generate Official Attestation Provisoire de Réussite (A4 Portrait)
 */
export async function generateLmdAttestationReussitePDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dual Security Borders
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  doc.setDrawColor(217, 119, 6); // gold inner
  doc.setLineWidth(0.4);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

  // Republic & University Heading
  const country = (data.institution.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const school = (data.institution.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 16.5);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 18, 54, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, 14, 23, { maxWidth: 70 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth - 14, 16.5, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 21.5, { align: "right" });

  // Main Banner
  const bannerY = 33;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, bannerY, pageWidth - 26, 14, 1.5, 1.5, "F");

  doc.setFillColor(217, 119, 6);
  doc.rect(13, bannerY, 3.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ATTESTATION PROVISOIRE DE RÉUSSITE AU DIPLÔME`,
    pageWidth / 2 + 1.5,
    bannerY + 6,
    { align: "center" }
  );

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Norme REESAO / CAMES • Système LMD • Document Officiel avec Vérification Numérique`,
    pageWidth / 2 + 1.5,
    bannerY + 10.5,
    { align: "center" }
  );

  // Body Text
  const bodyY = 58;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text("Le Doyen de la Faculté et le Président du Jury d'Examen soussignés certifient que :", 16, bodyY);

  // Student Card
  const sCardY = bodyY + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, sCardY, pageWidth - 28, 27, 1.5, 1.5, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 18, sCardY + 7.5);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 52, sCardY + 7.5);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule / INE :", 18, sCardY + 15);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", 52, sCardY + 15);

  doc.setTextColor(71, 85, 105);
  doc.text("Date & Lieu de Naissance :", 18, sCardY + 22);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}`, 60, sCardY + 22);

  // Success Declaration
  const declY = sCardY + 36;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `A été déclaré(e) définitivement admis(e) aux épreuves terminales pour l'obtention du :`,
    16,
    declY
  );

  // Degree Card
  const dCardY = declY + 6;
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(14, dCardY, pageWidth - 28, 40, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(79, 70, 229);
  doc.text(`DIPLÔME DE ${data.degree.title.toUpperCase()}`, pageWidth / 2, dCardY + 9.5, { align: "center" });

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Domaine : ${data.degree.fieldOfStudy}`, pageWidth / 2, dCardY + 18, { align: "center" });
  doc.text(`Mention / Spécialité : ${data.degree.specialization}`, pageWidth / 2, dCardY + 24.5, { align: "center" });

  const ectsGrade = getEctsGrade(data.degree.finalGradeAverage);
  doc.setFontSize(8.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Session : ${data.degree.sessionName}   •   Moyenne : ${data.degree.finalGradeAverage.toFixed(2)} / 20   •   Mention : ${data.degree.mention} (${ectsGrade.grade})`,
    pageWidth / 2,
    dCardY + 33,
    { align: "center" }
  );

  // Legal Notice
  const noteY = dCardY + 49;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "La présente attestation est délivrée en un seul exemplaire en attendant l'établissement du diplôme définitif.",
    pageWidth / 2,
    noteY,
    { align: "center" }
  );

  // QR Code & Signatures
  const bottomY = noteY + 15;

  // Verification QR
  const verifUrl = `https://edut.org/verify/${data.student.matricule || data.student.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, "PNG", 16, bottomY + 2, 25, 25);
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("DOCUMENT SÉCURISÉ", 45, bottomY + 9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Scannez pour vérifier l'authenticité", 45, bottomY + 14);
    doc.text(`Réf : ATT-${data.student.id}-2026`, 45, bottomY + 19);
  } catch (e) {}

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen de la Faculté", pageWidth / 2 + 10, bottomY + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Cachet Officiel", pageWidth / 2 + 10, bottomY + 11.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth / 2 + 10, bottomY + 26, pageWidth - 16, bottomY + 26);

  // Date
  const dateStr = data.degree.deliberationDate || new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fait à ${data.institution.city || "Niamey"}, le ${dateStr}`, pageWidth - 16, pageHeight - 14, { align: "right" });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Reussite_${data.degree.title}_${cleanNom}.pdf`);
}
