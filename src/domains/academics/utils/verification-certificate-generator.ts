import { VerificationResult } from "@/domains/academics/actions/verification.actions";

export async function generateVerificationCertificatePDF(
  data: VerificationResult,
  verifyUrl: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: QRCode } = await import("qrcode");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178mm

  // ─── 1. Luxury Dual Security Borders ─────────────────────────────────────────
  doc.setDrawColor(15, 23, 42); // Navy
  doc.setLineWidth(0.8);
  doc.rect(6, 6, pageWidth - 12, pageHeight - 12, "S");

  doc.setDrawColor(203, 213, 225); // Slate Border
  doc.setLineWidth(0.3);
  doc.rect(7.5, 7.5, pageWidth - 15, pageHeight - 15, "S");

  // Gold Security Ribbon Header
  doc.setFillColor(15, 23, 42);
  doc.rect(8, 8, pageWidth - 16, 4.5, "F");
  doc.setFillColor(217, 119, 6); // Amber Gold
  doc.rect(8, 12.5, pageWidth - 16, 1.2, "F");

  // ─── 2. Republic & Institution Header ────────────────────────────────────────
  let currentY = 19;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(data.institution.country.toUpperCase(), pageWidth / 2, currentY, { align: "center" });

  currentY += 3.8;
  doc.setFontSize(7);
  doc.text(data.institution.ministry.toUpperCase(), pageWidth / 2, currentY, { align: "center" });

  currentY += 4.8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.name.toUpperCase(), pageWidth / 2, currentY, { align: "center" });

  currentY += 3.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Direction des Affaires Académiques • Registre Central des Titres & Diplômes • ${data.institution.city}`, pageWidth / 2, currentY, { align: "center" });

  // ─── 3. Certificate Title Banner ─────────────────────────────────────────────
  currentY += 5.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 13.5, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105); // Emerald
  doc.text("ATTESTATION OFFICIELLE DE VÉRIFICATION ACADÉMIQUE", pageWidth / 2, currentY + 5.2, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("OFFICIAL CERTIFICATE OF ACADEMIC RECORD & DEGREE AUTHENTICITY", pageWidth / 2, currentY + 10, { align: "center" });

  // ─── 4. QR Code & Digital Trust Stamp Block ──────────────────────────────────
  currentY += 16.5;
  const qrSize = 25;
  const qrX = marginX + contentWidth - qrSize;
  const trustBoxWidth = contentWidth - qrSize - 4;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 256,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  doc.addImage(qrDataUrl, "PNG", qrX, currentY, qrSize, qrSize);

  // Trust Summary Box
  doc.setFillColor(240, 253, 244); // Light Emerald
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(marginX, currentY, trustBoxWidth, qrSize, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61);
  doc.text("STATUS : AUTHENTICITY CERTIFIED & CRYPTOGRAPHICALLY ANCHORED", marginX + 4, currentY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Ce document certifie la validité légale et académique du titre délivré conformément aux registres", marginX + 4, currentY + 10);
  doc.text("officiels des procès-verbaux de délibération de l'établissement et aux normes CAMES / UNESCO.", marginX + 4, currentY + 14);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`Certificat N° : ${data.degree.certificateNumber}   •   Émis le : ${new Date().toLocaleDateString("fr-FR")}`, marginX + 4, currentY + 19.5);

  // ─── 5. Section 1: Holder Information ─────────────────────────────────────────
  currentY += qrSize + 5;
  const headerBarHeight = 5;
  const col1X = marginX + 4;
  const col2X = marginX + (contentWidth / 2) + 2;
  const colWidth = (contentWidth / 2) - 6;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, contentWidth, headerBarHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("1. INFORMATIONS SUR LE TITULAIRE / HOLDER INFORMATION", col1X, currentY + 3.5);

  // Content Row 1
  currentY += headerBarHeight + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Nom & Prénoms :", col1X, currentY);
  doc.text("Identifiant / Matricule :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(data.student.nom.toUpperCase(), col1X, currentY, { maxWidth: colWidth });
  doc.setFont("courier", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule, col2X, currentY);

  // Content Row 2
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Date & Lieu de Naissance :", col1X, currentY);
  doc.text("Nationalité :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text(`${data.student.dateNaissance} à ${data.student.lieuNaissance}`, col1X, currentY, { maxWidth: colWidth });
  doc.text(data.student.nationalite || "Nigérienne", col2X, currentY);

  // ─── 6. Section 2: Conferred Qualification ───────────────────────────────────
  currentY += 7;
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, contentWidth, headerBarHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("2. QUALIFICATION & TITRE DÉLIVRÉS / CONFERRED QUALIFICATION", col1X, currentY + 3.5);

  // Row 1: Titles FR / EN
  currentY += headerBarHeight + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Intitulé du Diplôme (FR) :", col1X, currentY);
  doc.text("Degree Conferred (EN) :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text(data.degree.title, col1X, currentY, { maxWidth: colWidth });
  doc.text(data.degree.titleEn, col2X, currentY, { maxWidth: colWidth });

  // Row 2: Field & Decision
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Domaine & Mention :", col1X, currentY);
  doc.text("Décision du Jury & Mention :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text(`${data.degree.field} — ${data.degree.mention}`, col1X, currentY, { maxWidth: colWidth });
  doc.setTextColor(5, 150, 105);
  doc.text(data.degree.status, col2X, currentY, { maxWidth: colWidth });

  // Row 3: ECTS & GPA
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Crédits ECTS Capitalisés :", col1X, currentY);
  doc.text("Moyenne Cumulative (GPA) :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.setFontSize(7.5);
  doc.text(`${data.degree.ectsCredits} ECTS (100% Acquis)`, col1X, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.degree.gpa, col2X, currentY);

  // ─── 7. Section 3: Global Standards & Accreditations ─────────────────────────
  currentY += 7;
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, contentWidth, headerBarHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("3. NORMES & RECONNAISSANCE INTERNATIONALE / GLOBAL STANDARDS", col1X, currentY + 3.5);

  currentY += headerBarHeight + 4;
  const labelX = col1X;
  const valueX = marginX + 50;
  const valWidth = contentWidth - 54;

  const standardsItems = [
    { label: "UNESCO ISCED 2011 :", value: data.standards.unescoIscedEn },
    { label: "European Framework :", value: `${data.standards.eqfLevel} • ${data.standards.bolognaCycle}` },
    { label: "WES / NACES Equivalency :", value: data.standards.wesEquivalency },
    { label: "Accréditation Tutelle :", value: `${data.institution.accreditation} • Ministère de l'Enseignement Supérieur` },
  ];

  standardsItems.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, labelX, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(item.value, valueX, currentY, { maxWidth: valWidth });

    currentY += 4.5;
  });

  // ─── 8. Cryptographic Proof & Ledger Box ──────────────────────────────────────
  currentY += 2;
  const cryptoBoxHeight = 15;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, cryptoBoxHeight, 1.5, 1.5, "FD");

  doc.setFont("courier", "bold");
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(`W3C VERIFIABLE CREDENTIAL ID : ${data.degree.merkleProof}`, col1X, currentY + 4);
  doc.text(`SHA-256 HASH OF ACADEMIC RECORD : ${data.degree.verificationHash}`, col1X, currentY + 8);
  doc.text(`DIGITAL TRUST ANCHOR : ${data.degree.digitalSignature}`, col1X, currentY + 12);

  // ─── 9. Signatures & Official Approvals ───────────────────────────────────────
  currentY += cryptoBoxHeight + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  doc.text("Le Directeur du Registre Central :", col1X, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Signature et Sceau Numérique", col1X, currentY + 3.5);
  doc.line(col1X, currentY + 14, col1X + 55, currentY + 14);

  const rightSigX = marginX + contentWidth - 65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Le Recteur / Chef d'Établissement :", rightSigX, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Visa et Approbation Officielle", rightSigX, currentY + 3.5);
  doc.line(rightSigX, currentY + 14, rightSigX + 60, currentY + 14);

  // ─── 10. Bottom Security Notice ───────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Ce document constitue une attestation officielle vérifiable en temps réel en scannant le QR code ou sur le portail public : " + verifyUrl,
    pageWidth / 2,
    pageHeight - 9,
    { align: "center" }
  );

  doc.save(`Attestation_Authenticite_${data.student.matricule.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
