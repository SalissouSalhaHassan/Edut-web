/**
 * Official ECTS Credit Recognition & Transfer Certificate Generator
 * (Attestation de Reconnaissance & Transfert de Crédits ECTS • Mobilité Internationale & Passerelles)
 * Standards: REESAO / CAMES / Accord de Bologne / ECTS
 */

import QRCode from "qrcode";

export interface RecognizedCourse {
  codeUe: string;
  nameUe: string;
  creditsEcts: number;
  gradeObtained?: number; // /20
  originCourseName?: string;
}

export interface EquivalenceCertificateParams {
  equivalence: {
    id: number;
    certificateNumber?: string;
    originInstitution: string;
    originCountry: string;
    originProgram: string;
    academicYear: string;
    targetProgramName: string;
    targetLevel: string; // "L2", "L3", "M1", "M2"
    targetSemester: string; // "S3", "S5"
    creditsTransferred: number; // e.g. 60 or 120
    decision: string; // "Validé", "Admis en L2"
    decisionDate?: string;
    commissionPresident?: string;
    commissionComments?: string;
    recognizedCourses: RecognizedCourse[];
  };
  student: {
    id: number;
    nom: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
  };
  institution?: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    facultyName?: string;
    city?: string;
  };
}

export async function generateAttestationEquivalencePDF(data: EquivalenceCertificateParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Double Security Border
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.9);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  doc.setDrawColor(217, 119, 6); // amber-600 gold
  doc.setLineWidth(0.4);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

  // 2. Sovereign & University Heading
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

  // 3. Main Certificate Banner
  const bannerY = 30;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, bannerY, pageWidth - 26, 14, 1.5, 1.5, "F");

  doc.setFillColor(217, 119, 6);
  doc.rect(13, bannerY, 3.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `ATTESTATION DE RECONNAISSANCE & TRANSFERT DE CRÉDITS ECTS`,
    pageWidth / 2 + 1.5,
    bannerY + 5.8,
    { align: "center" }
  );

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Commission Pédagogique d'Équivalences • Mobilité Internationale & Passerelles LMD (CAMES / REESAO)`,
    pageWidth / 2 + 1.5,
    bannerY + 10.5,
    { align: "center" }
  );

  let currentY = 48;

  const renderSectionBar = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(13, currentY, pageWidth - 26, 6, 1, 1, "FD");

    doc.setFillColor(79, 70, 229);
    doc.rect(13, currentY, 2.5, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 18, currentY + 4.2);
    currentY += 8;
  };

  // 4. CANDIDAT & PARCOURS D'ORIGINE
  renderSectionBar("1. Identification de l'Étudiant & Cursus d'Origine");

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 26, 1, 1, "FD");

  doc.setFontSize(7.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Nom & Prénoms :", 16, currentY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text((data.student.nom || "").toUpperCase(), 45, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("N° Matricule / INE :", pageWidth / 2 + 2, currentY + 5.5);
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule || "N/A", pageWidth / 2 + 30, currentY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Établissement d'origine :", 16, currentY + 12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.equivalence.originInstitution} (${data.equivalence.originCountry})`, 48, currentY + 12);

  doc.setTextColor(71, 85, 105);
  doc.text("Programme d'origine :", 16, currentY + 18.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.equivalence.originProgram || "Licence Informatique", 48, currentY + 18.5);

  doc.setTextColor(71, 85, 105);
  doc.text("Année académique :", pageWidth / 2 + 2, currentY + 18.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.equivalence.academicYear || "2024-2025", pageWidth / 2 + 30, currentY + 18.5);

  currentY += 29.5;

  // 5. DÉCISION D'ADMISSION & INTÉGRATION
  renderSectionBar("2. Décision d'Équivalence & Niveau d'Intégration");

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 17, 1.2, 1.2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`FORMATION D'ACCUEIL : ${data.equivalence.targetProgramName || "Licence Générale Informatique"}`, 17, currentY + 6);

  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129);
  doc.text(`TOTAL CRÉDITS RECONNUS : ${data.equivalence.creditsTransferred} ECTS VALIDÉS`, pageWidth - 17, currentY + 6, { align: "right" });

  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Niveau d'admission directe : ${data.equivalence.targetLevel} (${data.equivalence.targetSemester})   •   Avis : ${data.equivalence.decision || "Admis par Équivalence"}`,
    17,
    currentY + 12
  );

  currentY += 21;

  // 6. TABLEAU DÉTAILLÉ DES UNITÉS D'ENSEIGNEMENT RECONNUES
  renderSectionBar("3. Détail des Unités d'Enseignement (UE) Capitalisées par Équivalence");

  const courses = data.equivalence.recognizedCourses && data.equivalence.recognizedCourses.length > 0
    ? data.equivalence.recognizedCourses
    : [
        { codeUe: "UE1.1", nameUe: "Algorithmique & Structures de Données", creditsEcts: 6, gradeObtained: 15.5, originCourseName: "Algo & C" },
        { codeUe: "UE1.2", nameUe: "Mathématiques Fondamentales & Algèbre", creditsEcts: 6, gradeObtained: 14.0, originCourseName: "Maths I" },
        { codeUe: "UE1.3", nameUe: "Architecture des Ordinateurs & Systèmes", creditsEcts: 6, gradeObtained: 16.0, originCourseName: "Systèmes d'Exploitation" },
        { codeUe: "UE2.1", nameUe: "Bases de Données Relationnelles & SQL", creditsEcts: 6, gradeObtained: 15.0, originCourseName: "SGBD / SQL" },
        { codeUe: "UE2.2", nameUe: "Développement Web & Technologies Internet", creditsEcts: 6, gradeObtained: 17.0, originCourseName: "Web dev" },
      ];

  const tableRows = courses.map((c, idx) => [
    (idx + 1).toString(),
    c.codeUe,
    c.nameUe,
    c.originCourseName || "Équivalent validé",
    `${c.creditsEcts} ECTS`,
    c.gradeObtained ? `${c.gradeObtained.toFixed(1)} / 20` : "Validé",
    "CAPITALISÉ (V)",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["N°", "Code UE", "Intitulé de l'UE d'Accueil", "Matière d'Origine Validée", "Crédits", "Note", "Statut"]],
    body: tableRows,
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
      cellPadding: 1.2,
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { fontStyle: "bold", cellWidth: 18 },
      2: { halign: "left", fontStyle: "bold", cellWidth: 60 },
      3: { halign: "left", cellWidth: 50 },
      4: { cellWidth: 16, fontStyle: "bold", textColor: [79, 70, 229] },
      5: { cellWidth: 16 },
      6: { cellWidth: 20, fontStyle: "bold", textColor: [16, 185, 129] },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 7. OBSERVATIONS & SIGNATURES
  renderSectionBar("4. Visa & Signatures de la Commission d'Équivalences");

  const sigH = 26;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(13, currentY, pageWidth - 26, sigH, 1, 1, "FD");

  const colW = (pageWidth - 26) / 3;

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Président de la Commission", 17, currentY + 5.5);
  doc.text("Le Responsable Pédagogique", 17 + colW, currentY + 5.5);
  doc.text("Le Doyen de la Faculté", 17 + colW * 2, currentY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(data.equivalence.commissionPresident || "Signature & Avis", 17, currentY + 9);
  doc.text("Signature & Avis", 17 + colW, currentY + 9);
  doc.text("Signature et Sceau officiel", 17 + colW * 2, currentY + 9);

  doc.setDrawColor(203, 213, 225);
  doc.line(17, currentY + 20, 17 + colW - 8, currentY + 20);
  doc.line(17 + colW, currentY + 20, 17 + colW * 2 - 8, currentY + 20);
  doc.line(17 + colW * 2, currentY + 20, pageWidth - 17, currentY + 20);

  // 8. PIED DE PAGE : CODE QR ANTI-FRAUDE
  const footY = pageHeight - 16;
  const verifUrl = `https://edut.org/verify/${data.student.matricule || data.student.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 80 });
    doc.addImage(qrDataUrl, "PNG", 14, footY - 6, 14, 14);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("ATTESTATION OFFICIELLE D'ÉQUIVALENCE", 31, footY - 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Réf : ${data.equivalence.certificateNumber || `EQ-ECTS-${data.equivalence.id || data.student.id}-2026`}`, 31, footY + 1.5);
    doc.text("Document certifié conforme aux accords de reconnaissance académique", 31, footY + 5);
  } catch (e) {}

  const dateStr = data.equivalence.decisionDate
    ? new Date(data.equivalence.decisionDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Fait à ${data.institution?.city || "Niamey"}, le ${dateStr}`, pageWidth - 14, footY + 2, { align: "right" });

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Equivalence_ECTS_${cleanNom}.pdf`);
}
