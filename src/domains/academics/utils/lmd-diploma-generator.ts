/**
 * Official University Degree & Attestation de Réussite Generator
 * Standards: REESAO / CAMES / ECTS / Ministère de l'Enseignement Supérieur
 * Luxury Vector Layout with Gold & Royal Navy Borders, Scannable Anti-Fraud QR Code & Official Stamps
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ─── 1. CADRE ROYAL DORÉ & SÉCURITÉ GUILOChe ──────────────────────────────
  // Outer Navy Border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(1.2);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  // Gold Inner Frame
  doc.setDrawColor(217, 119, 6); // amber-600 gold
  doc.setLineWidth(0.6);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, "S");

  // Fine Inner Security Line
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  doc.rect(11.5, 11.5, pageWidth - 23, pageHeight - 23, "S");

  // Corner Gold Rosettes / Accents
  const rosetteSize = 5;
  const corners = [
    { x: 14, y: 14 },
    { x: pageWidth - 14, y: 14 },
    { x: 14, y: pageHeight - 14 },
    { x: pageWidth - 14, y: pageHeight - 14 },
  ];
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  corners.forEach((c) => {
    doc.line(c.x - rosetteSize, c.y, c.x + rosetteSize, c.y);
    doc.line(c.x, c.y - rosetteSize, c.x, c.y + rosetteSize);
    doc.circle(c.x, c.y, 1.5, "S");
  });

  // ─── 2. EN-TÊTE RÉPUBLICAIN & ÉTABLISSEMENT ────────────────────────────────
  const country = (data.institution.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const motto = data.institution.motto || "Fraternité — Travail — Progrès";
  const ministry = data.institution.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const school = (data.institution.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution.facultyName || "FACULTÉ DES SCIENCES & TECHNIQUES").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(country, pageWidth / 2, 20, { align: "center" });

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(motto, pageWidth / 2, 24, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, pageWidth / 2, 28.5, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth / 2, 36, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth / 2, 41, { align: "center" });

  // ─── 3. TITRE DU DIPLÔME OFFICIEL ──────────────────────────────────────────
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 45, 46, pageWidth / 2 + 45, 46);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42);
  const diplomaTitle = `DIPLÔME DE ${data.degree.title.toUpperCase()}`;
  doc.text(diplomaTitle, pageWidth / 2, 54, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Grade Universitaire conféré selon les normes du Système LMD (REESAO • CAMES • Bologne)`,
    pageWidth / 2,
    60,
    { align: "center" }
  );

  // ─── 4. CORPS DU TEXTE DU DIPLÔME ──────────────────────────────────────────
  const bodyY = 70;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Le Recteur et le Président du Jury d'Examen attestent que :", pageWidth / 2, bodyY, { align: "center" });

  // Student Full Name in Prestige Font
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  const fullName = (data.student.nom || "").toUpperCase();
  doc.text(fullName, pageWidth / 2, bodyY + 9, { align: "center" });

  // Student Details
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const birthDetails = `Né(e) le ${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}   •   N° Matricule : ${data.student.matricule || "N/A"}`;
  doc.text(birthDetails, pageWidth / 2, bodyY + 16, { align: "center" });

  // Conferred Degree Details
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    "A satisfait à l'ensemble des épreuves théoriques, pratiques et soutenance de stage prévues par la maquette pédagogique,",
    pageWidth / 2,
    bodyY + 24,
    { align: "center" }
  );

  doc.text(
    `et a capitalisé l'intégralité des ${data.degree.totalCreditsAcquired || 180} Crédits ECTS requis pour la validation du cursus :`,
    pageWidth / 2,
    bodyY + 30,
    { align: "center" }
  );

  // Specialty & Field Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth / 2 - 80, bodyY + 34, 160, 16, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text(
    `Domaine : ${data.degree.fieldOfStudy}   •   Mention : ${data.degree.specialization}`,
    pageWidth / 2,
    bodyY + 41,
    { align: "center" }
  );

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const ectsGrade = getEctsGrade(data.degree.finalGradeAverage);
  doc.text(
    `Moyenne Générale : ${data.degree.finalGradeAverage.toFixed(2)} / 20   |   Mention : ${data.degree.mention || "Bien"}   |   Grade ECTS : ${ectsGrade.grade}`,
    pageWidth / 2,
    bodyY + 46.5,
    { align: "center" }
  );

  // Legal statement
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "En foi de quoi, le présent diplôme lui est délivré pour servir et valoir ce que de droit avec tous les privilèges et droits qui y sont attachés.",
    pageWidth / 2,
    bodyY + 56,
    { align: "center" }
  );

  // ─── 5. SIGNATURES & CODE DE VÉRIFICATION QR ──────────────────────────────
  const sigY = bodyY + 66;

  // 1. Doyen de la Faculté
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen de la Faculté", 35, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Visa", 35, sigY + 4);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, sigY + 20, 75, sigY + 20);

  // 2. Président du Jury
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Président du Jury", pageWidth / 2, sigY, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Date et Signature", pageWidth / 2, sigY + 4, { align: "center" });
  doc.line(pageWidth / 2 - 25, sigY + 20, pageWidth / 2 + 25, sigY + 20);

  // 3. Recteur de l'Université
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Recteur / Président", pageWidth - 35, sigY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Sceau officiel et Approbation", pageWidth - 35, sigY + 4, { align: "right" });
  doc.line(pageWidth - 75, sigY + 20, pageWidth - 20, sigY + 20);

  // QR Code Anti-Fraud Verification Box in Bottom Left
  const verifUrl = `https://edut.org/verify/${data.student.matricule || data.student.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, "PNG", 14, pageHeight - 34, 18, 18);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("VÉRIFICATION OFFICIELLE", 34, pageHeight - 30);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Scannez pour vérifier l'authenticité", 34, pageHeight - 26);
    doc.text(`Réf : ${data.degree.diplomaNumber || `DIP-${data.student.id}-2026`}`, 34, pageHeight - 22);
  } catch (e) {
    // Fallback if QR generation fails
  }

  // Location & Date
  const dateStr = data.degree.deliberationDate || new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Fait à ${data.institution.city || "Niamey"}, le ${dateStr}`, pageWidth - 14, pageHeight - 14, { align: "right" });

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
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 16);

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(14, 17.5, 52, 17.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(ministry, 14, 22, { maxWidth: 68 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth - 14, 16, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 20.5, { align: "right" });

  // Main Banner
  const bannerY = 32;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, bannerY, pageWidth - 26, 14, 1.5, 1.5, "F");

  doc.setFillColor(217, 119, 6);
  doc.rect(13, bannerY, 3.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ATTESTATION PROVISOIRE DE RÉUSSITE AU DIPLÔME`,
    pageWidth / 2 + 1.5,
    bannerY + 6,
    { align: "center" }
  );

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Norme REESAO / CAMES • Système LMD • Document Officiel avec Vérification Numérique`,
    pageWidth / 2 + 1.5,
    bannerY + 10.5,
    { align: "center" }
  );

  // Body Text
  const bodyY = 56;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text("Le Doyen de la Faculté et le Président du Jury d'Examen soussignés certifient que :", 16, bodyY);

  // Student Card
  const sCardY = bodyY + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, sCardY, pageWidth - 28, 26, 1.5, 1.5, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 18, sCardY + 7);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 50, sCardY + 7);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule / INE :", 18, sCardY + 14);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", 50, sCardY + 14);

  doc.setTextColor(71, 85, 105);
  doc.text("Date & Lieu de Naissance :", 18, sCardY + 21);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.student.dateNaissance || "15/10/2002"} à ${data.student.lieuNaissance || "Niamey"}`, 58, sCardY + 21);

  // Success Declaration
  const declY = sCardY + 34;
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
  doc.roundedRect(14, dCardY, pageWidth - 28, 38, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(79, 70, 229);
  doc.text(`DIPLÔME DE ${data.degree.title.toUpperCase()}`, pageWidth / 2, dCardY + 9, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Domaine : ${data.degree.fieldOfStudy}`, pageWidth / 2, dCardY + 17, { align: "center" });
  doc.text(`Mention / Spécialité : ${data.degree.specialization}`, pageWidth / 2, dCardY + 23, { align: "center" });

  const ectsGrade = getEctsGrade(data.degree.finalGradeAverage);
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Session : ${data.degree.sessionName}   •   Moyenne : ${data.degree.finalGradeAverage.toFixed(2)} / 20   •   Mention : ${data.degree.mention} (${ectsGrade.grade})`,
    pageWidth / 2,
    dCardY + 31,
    { align: "center" }
  );

  // Legal Notice
  const noteY = dCardY + 46;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "La présente attestation est délivrée en un seul exemplaire en attendant l'établissement du diplôme définitif.",
    pageWidth / 2,
    noteY,
    { align: "center" }
  );

  // QR Code & Signatures
  const bottomY = noteY + 14;

  // Verification QR
  const verifUrl = `https://edut.org/verify/${data.student.matricule || data.student.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, "PNG", 16, bottomY + 2, 24, 24);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("DOCUMENT SÉCURISÉ", 43, bottomY + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Scannez pour vérifier l'authenticité", 43, bottomY + 13);
    doc.text(`Réf : ATT-${data.student.id}-2026`, 43, bottomY + 18);
  } catch (e) {}

  // Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Doyen de la Faculté", pageWidth / 2 + 10, bottomY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Cachet Officiel", pageWidth / 2 + 10, bottomY + 10);
  doc.setDrawColor(203, 213, 225);
  doc.line(pageWidth / 2 + 10, bottomY + 25, pageWidth - 16, bottomY + 25);

  // Date
  const dateStr = data.degree.deliberationDate || new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fait à ${data.institution.city || "Niamey"}, le ${dateStr}`, pageWidth - 16, pageHeight - 15, { align: "right" });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Reussite_${data.degree.title}_${cleanNom}.pdf`);
}
