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

  // ─── 1. Luxury Dual Security Borders ─────────────────────────────────────────
  doc.setDrawColor(15, 23, 42); // Navy
  doc.setLineWidth(0.8);
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14, "S");

  doc.setDrawColor(203, 213, 225); // Slate
  doc.setLineWidth(0.3);
  doc.rect(8.5, 8.5, pageWidth - 17, pageHeight - 17, "S");

  // Gold Security Ribbon Header
  doc.setFillColor(15, 23, 42);
  doc.rect(9, 9, pageWidth - 18, 5, "F");
  doc.setFillColor(217, 119, 6); // Amber Gold
  doc.rect(9, 14, pageWidth - 18, 1.5, "F");

  // ─── 2. Republic & Institution Header ────────────────────────────────────────
  let currentY = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(data.institution.country.toUpperCase(), pageWidth / 2, currentY, { align: "center" });

  currentY += 4;
  doc.setFontSize(7.5);
  doc.text(data.institution.ministry.toUpperCase(), pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(data.institution.name.toUpperCase(), pageWidth / 2, currentY, { align: "center" });

  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Direction des Affaires Académiques • Registre Central des Titres & Diplômes • ${data.institution.city}`, pageWidth / 2, currentY, { align: "center" });

  // ─── 3. Certificate Title & Badge ────────────────────────────────────────────
  currentY += 7;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(18, currentY, pageWidth - 36, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105); // Emerald
  doc.text("ATTESTATION OFFICIELLE DE VÉRIFICATION ACADÉMIQUE", pageWidth / 2, currentY + 6, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("OFFICIAL CERTIFICATE OF ACADEMIC RECORD & DEGREE AUTHENTICITY", pageWidth / 2, currentY + 11, { align: "center" });

  // ─── 4. QR Code & Digital Trust Stamp ─────────────────────────────────────────
  currentY += 21;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 256,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  doc.addImage(qrDataUrl, "PNG", pageWidth - 42, currentY, 26, 26);

  // Trust Summary Box
  doc.setFillColor(240, 253, 244); // Light Emerald
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(18, currentY, pageWidth - 64, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text("STATUS: AUTHENTICITY CERTIFIED & CRYPTOGRAPHICALLY ANCHORED", 22, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text("Ce document certifie la validité légale et académique du titre délivré conformément", 22, currentY + 11);
  doc.text("aux registres des procès-verbaux de délibération de l'établissement et aux normes CAMES/UNESCO.", 22, currentY + 15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Certificat N° : ${data.degree.certificateNumber}   |   Émis le : ${new Date().toLocaleDateString("fr-FR")}`, 22, currentY + 20);

  // ─── 5. Holder Information ────────────────────────────────────────────────────
  currentY += 31;
  doc.setFillColor(15, 23, 42);
  doc.rect(18, currentY, pageWidth - 36, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("1. INFORMATIONS SUR LE TITULAIRE / HOLDER INFORMATION", 22, currentY + 4);

  currentY += 7;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Nom & Prénoms :", 22, currentY);
  doc.text("Identifiant / Matricule :", pageWidth / 2 + 10, currentY);

  currentY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(data.student.nom.toUpperCase(), 22, currentY);
  doc.setFont("courier", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text(data.student.matricule, pageWidth / 2 + 10, currentY);

  currentY += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Date & Lieu de Naissance :", 22, currentY);
  doc.text("Nationalité :", pageWidth / 2 + 10, currentY);

  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(`${data.student.dateNaissance} à ${data.student.lieuNaissance}`, 22, currentY);
  doc.text(data.student.nationalite || "Nigérienne", pageWidth / 2 + 10, currentY);

  // ─── 6. Degree & Conferred Qualification ───────────────────────────────────────
  currentY += 8;
  doc.setFillColor(15, 23, 42);
  doc.rect(18, currentY, pageWidth - 36, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("2. QUALIFICATION & TITRE DÉLIVRÉS / CONFERRED QUALIFICATION", 22, currentY + 4);

  currentY += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Intitulé du Diplôme (FR) :", 22, currentY);
  doc.text("Degree Conferred (EN) :", pageWidth / 2 + 10, currentY);

  currentY += 4.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(data.degree.title, 22, currentY);
  doc.text(data.degree.titleEn, pageWidth / 2 + 10, currentY);

  currentY += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Domaine & Mention :", 22, currentY);
  doc.text("Décision du Jury & Mention :", pageWidth / 2 + 10, currentY);

  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(`${data.degree.field} — ${data.degree.mention}`, 22, currentY);
  doc.setTextColor(5, 150, 105);
  doc.text(data.degree.status, pageWidth / 2 + 10, currentY);

  currentY += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Crédits ECTS Capitalisés :", 22, currentY);
  doc.text("Moyenne Cumulative (GPA) :", pageWidth / 2 + 10, currentY);

  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.setFontSize(8);
  doc.text(`${data.degree.ectsCredits} ECTS (100% Acquis)`, 22, currentY);
  doc.setTextColor(15, 23, 42);
  doc.text(data.degree.gpa, pageWidth / 2 + 10, currentY);

  // ─── 7. International Standards & Equivalencies ───────────────────────────────
  currentY += 8;
  doc.setFillColor(15, 23, 42);
  doc.rect(18, currentY, pageWidth - 36, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("3. NORMES & RECONNAISSANCE INTERNATIONALE / GLOBAL STANDARDS", 22, currentY + 4);

  currentY += 7;
  const standardsList = [
    ["UNESCO ISCED 2011 :", data.standards.unescoIscedEn],
    ["European Framework :", data.standards.eqfLevel + " • " + data.standards.bolognaCycle],
    ["WES / NACES Equivalency :", data.standards.wesEquivalency],
    ["Accréditation Tutelle :", data.institution.accreditation + " • Ministère de l'Enseignement Supérieur"],
  ];

  standardsList.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, 22, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(val, 65, currentY);
    currentY += 4.5;
  });

  // ─── 8. Cryptographic Proof & Ledger ──────────────────────────────────────────
  currentY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(18, currentY, pageWidth - 36, 18, 2, 2, "FD");

  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`W3C VERIFIABLE CREDENTIAL ID : ${data.degree.merkleProof}`, 22, currentY + 4.5);
  doc.text(`SHA-256 HASH OF ACADEMIC RECORD : ${data.degree.verificationHash}`, 22, currentY + 9);
  doc.text(`DIGITAL TRUST ANCHOR : ${data.degree.digitalSignature}`, 22, currentY + 13.5);

  // ─── 9. Official Seal & Signatures ────────────────────────────────────────────
  currentY += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  doc.text("Le Directeur du Registre Central :", 22, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Signature et Sceau Numérique", 22, currentY + 4);
  doc.line(22, currentY + 16, 75, currentY + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Le Recteur / Chef d'Établissement :", pageWidth - 80, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Visa et Approbation Officielle", pageWidth - 80, currentY + 4);
  doc.line(pageWidth - 80, currentY + 16, pageWidth - 22, currentY + 16);

  // Bottom Notice
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Ce document constitue une attestation officielle vérifiable en temps réel en scannant le QR code ou sur le portail public : " + verifyUrl, pageWidth / 2, pageHeight - 11, { align: "center" });

  doc.save(`Attestation_Authenticite_${data.student.matricule.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
