/**
 * Official Scholarship Attribution & Payment Schedule PDF Generator
 * Standards: UEMOA / Ministère de l'Enseignement Supérieur / Gestion Financière Universitaire
 * Generates Official Attestation de Bourse, Échéancier de Paiement & Avis de Relance
 */

import QRCode from "qrcode";

export interface ScholarshipAttestationParams {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    classe?: string;
    filiere?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
  };
  scholarship: {
    name: string;
    provider: string; // e.g. "Ministère de l'Enseignement Supérieur"
    type: string; // "Pourcentage" | "Montant Fixe"
    discountValue: number; // 50% or amount
    allocatedAmount: number; // e.g. 350,000 FCFA
    academicYear: string; // "2025-2026"
    decisionReference?: string;
    decisionDate?: string;
  };
  financialSummary: {
    totalGrossTuition: number; // e.g. 700,000 FCFA
    scholarshipDeduction: number; // e.g. 350,000 FCFA
    netPayableTuition: number; // e.g. 350,000 FCFA
    currency?: string; // FCFA
  };
  institution?: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    facultyName?: string;
    city?: string;
  };
}

export interface PaymentSchedulePDFParams {
  student: {
    id: number;
    nom: string;
    matricule?: string;
    classe?: string;
  };
  academicYear: string;
  currency?: string;
  schedules: Array<{
    installmentNumber: number;
    label: string;
    dueDate: string;
    grossAmount: number;
    scholarshipDeduction: number;
    netAmount: number;
    paidAmount: number;
    balance: number;
    status: string;
  }>;
  summary: {
    totalGross: number;
    totalScholarship: number;
    totalNet: number;
    totalPaid: number;
    totalBalance: number;
  };
  institution?: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    city?: string;
  };
}

/**
 * 1. Generate Official Attestation d'Attribution de Bourse (A4 Portrait)
 */
export async function generateAttestationBoursePDF(data: ScholarshipAttestationParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dual Security Border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  doc.setDrawColor(217, 119, 6); // amber-600 gold
  doc.setLineWidth(0.4);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

  // En-tête Républicain et Universitaire
  const country = (data.institution?.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution?.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";
  const school = (data.institution?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();
  const faculty = (data.institution?.facultyName || "DIRECTION DES AFFAIRES FINANCIÈRES & DES BOURSES").toUpperCase();

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
  doc.setTextColor(217, 119, 6);
  doc.text(faculty, pageWidth - 14, 20.5, { align: "right" });

  // Main Banner
  const bannerY = 30;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, bannerY, pageWidth - 26, 14, 1.5, 1.5, "F");

  doc.setFillColor(217, 119, 6);
  doc.rect(13, bannerY, 3.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ATTESTATION OFFICIELLE D'ATTRIBUTION DE BOURSE D'ÉTUDES`,
    pageWidth / 2 + 1.5,
    bannerY + 5.8,
    { align: "center" }
  );

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Exonération Financière & Prise en Charge Pédagogique • Année Universitaire ${data.scholarship.academicYear || "2025-2026"}`,
    pageWidth / 2 + 1.5,
    bannerY + 10.5,
    { align: "center" }
  );

  let currentY = 50;

  // Introduction Text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    "La Commission Universitaire des Bourses et la Direction Financière attestent que :",
    16,
    currentY
  );

  currentY += 5;

  // Student Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 24, 1.5, 1.5, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 17, currentY + 6);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 50, currentY + 6);

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule / INE :", pageWidth / 2 + 2, currentY + 6);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 32, currentY + 6);

  doc.setTextColor(71, 85, 105);
  doc.text("Filière & Niveau :", 17, currentY + 14);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.filiere || data.student.classe || "Licence Générale", 50, currentY + 14);

  doc.setTextColor(71, 85, 105);
  doc.text("Réf. Décision :", pageWidth / 2 + 2, currentY + 14);
  doc.setTextColor(15, 23, 42);
  doc.text(data.scholarship.decisionReference || `DEC-BRS-${data.student.id}-2026`, pageWidth / 2 + 32, currentY + 14);

  currentY += 30;

  // Statement
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Bénéficie d'une bourse d'études officielle et d'une exonération financière pour son cursus :`,
    16,
    currentY
  );

  currentY += 5;

  // Scholarship Details Card (Golden/Amber)
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.roundedRect(13, currentY, pageWidth - 26, 44, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(data.scholarship.name.toUpperCase(), pageWidth / 2, currentY + 9, { align: "center" });

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Organisme financeur : ${data.scholarship.provider}`, pageWidth / 2, currentY + 16, { align: "center" });

  const discountText = data.scholarship.type === "Pourcentage"
    ? `Taux d'Exonération : ${data.scholarship.discountValue} % des Frais de Scolarité`
    : `Montant Forfaitaire Alloué : ${data.scholarship.discountValue.toLocaleString()} ${data.financialSummary.currency || "FCFA"}`;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(discountText, pageWidth / 2, currentY + 23.5, { align: "center" });

  // 3-Pillar Financial Impact
  const colW = (pageWidth - 36) / 3;
  const curr = data.financialSummary.currency || "FCFA";

  const fBlocks = [
    { label: "SCOLARITÉ BRUTE", val: `${data.financialSummary.totalGrossTuition.toLocaleString()} ${curr}`, color: [100, 116, 139] },
    { label: "DÉDUCTION BOURSE", val: `- ${data.financialSummary.scholarshipDeduction.toLocaleString()} ${curr}`, color: [16, 185, 129] },
    { label: "NET À PAYER (ÉTUDIANT)", val: `${data.financialSummary.netPayableTuition.toLocaleString()} ${curr}`, color: [79, 70, 229] },
  ];

  fBlocks.forEach((fb, i) => {
    const fx = 18 + i * colW;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(fb.label, fx + colW / 2, currentY + 33, { align: "center" });

    doc.setFontSize(8.5);
    doc.setTextColor(fb.color[0], fb.color[1], fb.color[2]);
    doc.text(fb.val, fx + colW / 2, currentY + 39, { align: "center" });
  });

  currentY += 52;

  // Legal Notice
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "La présente attestation est délivrée pour servir et valoir de prise en charge financière auprès des services académiques et comptables.",
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  currentY += 12;

  // Signatures Section
  const sigH = 26;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(13, currentY, pageWidth - 26, sigH, 1, 1, "FD");

  const sigW = (pageWidth - 26) / 2;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Directeur des Affaires Financières", 20, currentY + 6);
  doc.text("Le Recteur / Président de l'Université", 20 + sigW, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature et Visa budgétaire", 20, currentY + 10);
  doc.text("Approbation et Cachet Officiel", 20 + sigW, currentY + 10);

  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY + 20, 20 + sigW - 15, currentY + 20);
  doc.line(20 + sigW, currentY + 20, pageWidth - 20, currentY + 20);

  // Bottom QR Code
  const footY = pageHeight - 16;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro";
  const verifUrl = `${appUrl}/verify/${encodeURIComponent(data.student.matricule || data.student.id)}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, "PNG", 14, footY - 6, 14, 14);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 119, 6);
    doc.text("ATTESTATION DE BOURSE CERTIFIÉE", 31, footY - 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Réf : BRS-${data.student.id}-2026`, 31, footY + 1.5);
    doc.text("Prise en charge financière enregistrée au budget universitaire", 31, footY + 5);
  } catch (e) {}

  const dateStr = data.scholarship.decisionDate
    ? new Date(data.scholarship.decisionDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Fait à ${data.institution?.city || "Niamey"}, le ${dateStr}`, pageWidth - 14, footY + 2, { align: "right" });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Bourse_${cleanNom}.pdf`);
}

/**
 * 2. Generate Official Échéancier de Paiement (A4 Portrait)
 */
export async function generateEcheancierPaiementPDF(data: PaymentSchedulePDFParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dual Outer Border
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

  // Headings
  const country = (data.institution?.countryName || "RÉPUBLIQUE DU NIGER").toUpperCase();
  const school = (data.institution?.name || "UNIVERSITÉ DES SCIENCES & TECHNOLOGIES").toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(country, 14, 16);
  doc.text(school, pageWidth - 14, 16, { align: "right" });

  // Banner
  const bannerY = 25;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, bannerY, pageWidth - 26, 13, 1.5, 1.5, "F");

  doc.setFillColor(79, 70, 229);
  doc.rect(13, bannerY, 3.5, 13, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ÉCHÉANCIER OFFICIEL DE PAIEMENT DES FRAIS DE SCOLARITÉ`,
    pageWidth / 2 + 1.5,
    bannerY + 5.5,
    { align: "center" }
  );

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Calendrier des Mensualités, Déductions Bourses & Suivi des Règlements • Année ${data.academicYear}`,
    pageWidth / 2 + 1.5,
    bannerY + 9.8,
    { align: "center" }
  );

  // Student info bar
  let currentY = 43;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 12, 1, 1, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Étudiant :", 17, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 35, currentY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule :", 110, currentY + 5);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", 132, currentY + 5);

  doc.setTextColor(71, 85, 105);
  doc.text("Classe :", pageWidth - 55, currentY + 5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.student.classe || "Licence", pageWidth - 42, currentY + 5);

  currentY += 17;

  // Table of Installments
  const curr = data.currency || "FCFA";
  const tableRows = data.schedules.map((s) => [
    `N° ${s.installmentNumber}`,
    s.label,
    new Date(s.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
    `${s.grossAmount.toLocaleString()} ${curr}`,
    s.scholarshipDeduction > 0 ? `- ${s.scholarshipDeduction.toLocaleString()} ${curr}` : "—",
    `${s.netAmount.toLocaleString()} ${curr}`,
    `${s.paidAmount.toLocaleString()} ${curr}`,
    `${s.balance.toLocaleString()} ${curr}`,
    s.status,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Échéance", "Intitulé Mensualité", "Date Limite", "Brut", "Bourse", "Net Dû", "Payé", "Reste", "Statut"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.2,
      halign: "center",
      cellPadding: 1.5,
    },
    bodyStyles: {
      fontSize: 5.8,
      textColor: [51, 65, 85],
      halign: "center",
      cellPadding: 1.1,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 15 },
      1: { halign: "left", fontStyle: "bold", cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 18 },
      4: { textColor: [16, 185, 129], cellWidth: 18 },
      5: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 20 },
      6: { cellWidth: 18 },
      7: { fontStyle: "bold", cellWidth: 18 },
      8: { fontStyle: "bold", cellWidth: 18 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Financial Totals Plaque
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(13, currentY, pageWidth - 26, 16, 1, 1, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL BRUT : ${data.summary.totalGross.toLocaleString()} ${curr}`, 18, currentY + 6);
  doc.setTextColor(16, 185, 129);
  doc.text(`TOTAL BOURSES : - ${data.summary.totalScholarship.toLocaleString()} ${curr}`, 78, currentY + 6);
  doc.setTextColor(79, 70, 229);
  doc.text(`NET À PAYER : ${data.summary.totalNet.toLocaleString()} ${curr}`, 145, currentY + 6);

  doc.setFontSize(7.2);
  doc.setTextColor(16, 185, 129);
  doc.text(`Total Réglé : ${data.summary.totalPaid.toLocaleString()} ${curr}`, 18, currentY + 12);
  doc.setTextColor(225, 29, 72);
  doc.text(`Solde Restant Dû : ${data.summary.totalBalance.toLocaleString()} ${curr}`, 145, currentY + 12);

  currentY += 22;

  // Footer Date & Signatures
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("L'Agent Comptable / Service Financier", 20, currentY + 5);
  doc.text("L'Étudiant / Tuteur Légal", pageWidth - 60, currentY + 5);

  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY + 16, 75, currentY + 16);
  doc.line(pageWidth - 75, currentY + 16, pageWidth - 20, currentY + 16);

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Echeancier_Paiement_${cleanNom}.pdf`);
}
