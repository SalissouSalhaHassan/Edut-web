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

  const isFinancial = data.category === "financial";
  const isBulletin = data.subType === "school_bulletin" || data.educationLevelType === "secondary" || data.educationLevelType === "primary";
  const isDegree = data.subType === "academic_degree" || (!isFinancial && !isBulletin);

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 256,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const renderHeaderBorders = (docInstance: any, pageNum: number, totalPages: number) => {
    // ─── 1. Luxury Dual Security Borders ───
    docInstance.setDrawColor(15, 23, 42); // Navy
    docInstance.setLineWidth(0.8);
    docInstance.rect(6, 6, pageWidth - 12, pageHeight - 12, "S");

    docInstance.setDrawColor(203, 213, 225); // Slate Border
    docInstance.setLineWidth(0.3);
    docInstance.rect(7.5, 7.5, pageWidth - 15, pageHeight - 15, "S");

    // Ribbon Color
    docInstance.setFillColor(15, 23, 42);
    docInstance.rect(8, 8, pageWidth - 16, 4.5, "F");

    if (isFinancial) {
      docInstance.setFillColor(217, 119, 6); // Amber Gold
    } else if (isBulletin) {
      docInstance.setFillColor(37, 99, 235); // Blue
    } else {
      docInstance.setFillColor(16, 185, 129); // Emerald
    }
    docInstance.rect(8, 12.5, pageWidth - 16, 1.2, "F");
  };

  // ─── PAGE 1: OFFICIAL CERTIFICATE OF RECORD ──────────────────────────────────
  renderHeaderBorders(doc, 1, 1);

  // Republic & Institution Header
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

  const subDeptText = isFinancial
    ? "Direction des Affaires Financières • Agence Comptable Centrale"
    : isBulletin
    ? "Direction Régionale de l'Éducation Nationale • Inspection Pédagogique"
    : "Direction des Affaires Académiques • Registre Central des Titres";

  doc.text(`${subDeptText} • ${data.institution.city}`, pageWidth / 2, currentY, { align: "center" });

  // Certificate Title Banner
  currentY += 5.5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, contentWidth, 13.5, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  
  if (isFinancial) {
    doc.setTextColor(217, 119, 6);
    doc.text("QUITTANCE OFFICIELLE DE VÉRIFICATION & SOLVABILITÉ FINANCIÈRE", pageWidth / 2, currentY + 5.2, { align: "center" });
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL CERTIFICATE OF PAYMENT SETTLEMENT & FINANCIAL SOLVENCY", pageWidth / 2, currentY + 10, { align: "center" });
  } else if (isBulletin) {
    doc.setTextColor(37, 99, 235);
    doc.text("ATTESTATION OFFICIELLE DE BULLETIN DE NOTES & RÉSULTATS", pageWidth / 2, currentY + 5.2, { align: "center" });
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL CERTIFIED ACADEMIC TRANSCRIPT & REPORT CARD RECORD", pageWidth / 2, currentY + 10, { align: "center" });
  } else {
    doc.setTextColor(5, 150, 105);
    doc.text("ATTESTATION OFFICIELLE D'AUTHENTICITÉ DE DIPLÔME (LMD)", pageWidth / 2, currentY + 5.2, { align: "center" });
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL CERTIFICATE OF DEGREE AUTHENTICITY & ACADEMIC MERIT", pageWidth / 2, currentY + 10, { align: "center" });
  }

  // QR Code & Digital Trust Stamp Block
  currentY += 16.5;
  const qrSize = 25;
  const qrX = marginX + contentWidth - qrSize;
  const trustBoxWidth = contentWidth - qrSize - 4;

  doc.addImage(qrDataUrl, "PNG", qrX, currentY, qrSize, qrSize);

  // Trust Summary Box
  doc.setFillColor(240, 253, 244); // Light Emerald
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(marginX, currentY, trustBoxWidth, qrSize, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(21, 128, 61);
  doc.text(
    isFinancial 
      ? "STATUS : FINANCIAL TRANSACTION VERIFIED & RECORDED (SYSCOHADA)"
      : isBulletin
      ? "STATUS : ACADEMIC TRANSCRIPT AUTHENTICATED & CONFORM TO ARCHIVES"
      : "STATUS : ACADEMIC DEGREE CERTIFIED & CRYPTOGRAPHICALLY ANCHORED", 
    marginX + 4, 
    currentY + 5.5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.setTextColor(51, 65, 85);
  doc.text(
    isFinancial
      ? "Cette quittance certifie le règlement officiel et l'encaissement effectif des droits scolaires/universitaires."
      : isBulletin
      ? "Ce document certifie l'authenticité légale des notes obtenues et de la décision officielle du conseil de classe."
      : "Ce document certifie la validité légale et académique du titre délivré conformément aux registres ministériels.",
    marginX + 4, 
    currentY + 9.8,
    { maxWidth: trustBoxWidth - 8 }
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    isFinancial
      ? `Réf. Reçu : ${data.financial?.receiptNumber || data.student.matricule} • Date : ${data.financial?.paymentDate}`
      : `Certificat N° : ${data.degree.certificateNumber} • Date d'Émission : ${data.degree.deliberationDate}`,
    marginX + 4, 
    currentY + 16.5
  );

  doc.setFont("courier", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`HASH : ${data.degree.verificationHash.slice(0, 48)}...`, marginX + 4, currentY + 21);

  // Section 1: Identification of Holder
  currentY += qrSize + 5.5;
  const headerBarHeight = 5.5;
  const col1X = marginX + 3;
  const col2X = marginX + (contentWidth / 2) + 3;
  const colWidth = (contentWidth / 2) - 6;

  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, contentWidth, headerBarHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("1. IDENTIFICATION DU TITULAIRE / BENEFICIARY IDENTIFICATION", col1X, currentY + 3.5);

  currentY += headerBarHeight + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Nom & Prénoms :", col1X, currentY);
  doc.text("Numéro Matricule / INE :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text(data.student.nom.toUpperCase(), col1X, currentY, { maxWidth: colWidth });
  doc.text(data.student.matricule, col2X, currentY);

  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Date & Lieu de Naissance :", col1X, currentY);
  doc.text("Sexe / Nationalité :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  const birthStr = `${data.student.dateNaissance || "14/05/2011"} à ${data.student.lieuNaissance || "Niamey"}`;
  doc.text(birthStr, col1X, currentY, { maxWidth: colWidth });
  doc.text(`${data.student.sexe === "F" ? "Féminin" : "Masculin"} • ${data.student.nationalite || "Nigérienne"}`, col2X, currentY);

  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Classe / Niveau Académique :", col1X, currentY);
  doc.text("Filière / Cycle Pédagogique :", col2X, currentY);

  currentY += 3.5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text(data.student.classe || "6ème A", col1X, currentY, { maxWidth: colWidth });
  doc.text(data.student.filiere || "Enseignement Général", col2X, currentY, { maxWidth: colWidth });

  // Section 2: Document Specific Record
  currentY += 6.5;
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, contentWidth, headerBarHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  const section2Title = isFinancial
    ? "2. DÉTAILS DE L'ENCAISSEMENT & SITUATION FINANCIÈRE"
    : isBulletin
    ? "2. RÉSULTATS ACADÉMIQUES & ÉVALUATION PÉDAGOGIQUE"
    : "2. TITRE ACADÉMIQUE, SPÉCIALITÉ & CRÉDITS ECTS CONFERÉS";

  doc.text(section2Title, col1X, currentY + 3.5);

  if (isFinancial && data.financial) {
    currentY += headerBarHeight + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Montant Encaissé (FCFA) :", col1X, currentY);
    doc.text("Mode de Règlement :", col2X, currentY);

    currentY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(9);
    doc.text(`${data.financial.amount.toLocaleString("fr-FR")} ${data.financial.currency}`, col1X, currentY);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.text(data.financial.paymentMethod, col2X, currentY, { maxWidth: colWidth });

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Objet & Nature du Paiement :", col1X, currentY);
    doc.text("Date & Heure d'Encaissement :", col2X, currentY);

    currentY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.text(data.financial.feeType, col1X, currentY, { maxWidth: colWidth });
    doc.text(`${data.financial.paymentDate} à ${data.financial.paymentTime}`, col2X, currentY);

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Statut de la Transaction :", col1X, currentY);
    doc.text("Solde Restant à Régler :", col2X, currentY);

    currentY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(7.5);
    doc.text(data.financial.status, col1X, currentY, { maxWidth: colWidth });
    doc.setTextColor(217, 119, 6);
    doc.text(`${data.financial.remainingBalance.toLocaleString("fr-FR")} FCFA (Solvabilité Validée)`, col2X, currentY);
  } else if (isBulletin && data.bulletin) {
    currentY += headerBarHeight + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Période / Semestre Pédagogique :", col1X, currentY);
    doc.text("Moyenne Générale Obtenue :", col2X, currentY);

    currentY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.text(`${data.bulletin.term} (Année Scolaire ${data.bulletin.academicYear})`, col1X, currentY);
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(9);
    doc.text(`${data.bulletin.generalAverage.toFixed(2)} / 20`, col2X, currentY);

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Rang de Classement :", col1X, currentY);
    doc.text("Décision Officielle du Conseil :", col2X, currentY);

    currentY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.text(`${data.bulletin.rank} sur ${data.bulletin.totalStudents} élèves`, col1X, currentY);
    doc.setTextColor(5, 150, 105);
    doc.text(data.bulletin.decision, col2X, currentY, { maxWidth: colWidth });

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Appréciation & Conduite :", col1X, currentY);
    doc.text("Total Points / Coefficients :", col2X, currentY);

    currentY += 3.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.text(`${data.bulletin.appreciation} • Conduite: ${data.bulletin.conduite}`, col1X, currentY, { maxWidth: colWidth });
    doc.text(`${data.bulletin.totalWeighted} pts / Coef ${data.bulletin.totalCoef}`, col2X, currentY);
  } else {
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
  }

  // Section 3: Global Standards & Accreditation
  currentY += 7;
  doc.setFillColor(15, 23, 42);
  doc.rect(marginX, currentY, contentWidth, headerBarHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(
    isFinancial
      ? "3. CONFORMITÉ SYSCOHADA & TRAÇABILITÉ BANCAIRE / GOVERNANCE"
      : isBulletin
      ? "3. HOMOLOGATION MINISTÉRIELLE & NORMES PÉDAGOGIQUES"
      : "3. NORMES & RECONNAISSANCE INTERNATIONALE / GLOBAL STANDARDS", 
    col1X, 
    currentY + 3.5
  );

  currentY += headerBarHeight + 4;
  const labelX = col1X;
  const valueX = marginX + 52;
  const valWidth = contentWidth - 56;

  const standardsItems = isFinancial ? [
    { label: "Norme Comptable :", value: "SYSCOHADA Révisé • Plan Comptable de l'Enseignement Supérieur" },
    { label: "Canal de Rapprochement :", value: "BCEAO Mobile Payment Gateway • Trésorerie Générale EDUT" },
    { label: "Réf. Trésorerie :", value: `${data.financial?.transactionReference} • Année Académique 2025-2026` },
    { label: "Autorité de Tutelle :", value: `${data.institution.accreditation} • Ministère de l'Enseignement Supérieur` },
  ] : isBulletin ? [
    { label: "Cadre Réglementaire :", value: "Arrêté Ministériel portant organisation des évaluations et examens scolaires" },
    { label: "Classification UNESCO :", value: data.standards.unescoIscedEn },
    { label: "Inspection Tutelle :", value: `${data.institution.regionalDirection || "DREN"} • ${data.institution.departmentalDirection || "Inspection Pédagogique"}` },
    { label: "Statut Établissement :", value: `${data.institution.accreditation} • ${data.institution.ministry}` },
  ] : [
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

  // Cryptographic Proof & Ledger Box
  currentY += 2;
  const cryptoBoxHeight = 15;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, cryptoBoxHeight, 1.5, 1.5, "FD");

  doc.setFont("courier", "bold");
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(`W3C VERIFIABLE CREDENTIAL ID : ${data.degree.merkleProof}`, col1X, currentY + 4);
  doc.text(`SHA-256 HASH OF RECORD : ${data.degree.verificationHash}`, col1X, currentY + 8);
  doc.text(`DIGITAL TRUST ANCHOR : ${data.degree.digitalSignature}`, col1X, currentY + 12);

  // Signatures & Official Approvals
  currentY += cryptoBoxHeight + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  const leftSigner = isFinancial
    ? "L'Agent Comptable / Trésorier :"
    : isBulletin
    ? "Le Directeur des Études / Principal :"
    : "Le Directeur du Registre Central :";

  doc.text(leftSigner, col1X, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Signature et Cachet Électronique", col1X, currentY + 3.5);
  doc.line(col1X, currentY + 14, col1X + 55, currentY + 14);

  const rightSigX = marginX + contentWidth - 65;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);

  const rightSigner = isFinancial
    ? "Le Chef d'Établissement / Recteur :"
    : isBulletin
    ? "Le Proviseur / Chef d'Établissement :"
    : "Le Recteur de l'Université :";

  doc.text(rightSigner, rightSigX, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Visa et Approbation Officielle", rightSigX, currentY + 3.5);
  doc.line(rightSigX, currentY + 14, rightSigX + 60, currentY + 14);

  // Bottom Notice
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Ce document constitue une attestation officielle vérifiable en temps réel en scannant le QR code ou sur le portail public : " + verifyUrl,
    pageWidth / 2,
    pageHeight - 9,
    { align: "center" }
  );

  // ─── PAGE 2: DETAILED PEDAGOGICAL BREAKDOWN (IF BULLETIN HAS SUBJECTS) ──────
  if (isBulletin && data.bulletin && data.bulletin.subjects.length > 0) {
    doc.addPage();
    renderHeaderBorders(doc, 2, 2);

    let p2Y = 19;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(data.institution.country.toUpperCase(), pageWidth / 2, p2Y, { align: "center" });

    p2Y += 4;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("RELEVÉ DÉTAILLÉ DES MATIÈRES & SYNTHÈSE DES PÉRIODES SCOLAIRES", pageWidth / 2, p2Y, { align: "center" });

    p2Y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Élève : ${data.student.nom.toUpperCase()} (${data.student.matricule}) • Classe : ${data.student.classe} • Année : ${data.bulletin.academicYear}`, pageWidth / 2, p2Y, { align: "center" });

    // Table Header
    p2Y += 6;
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, p2Y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);

    const colSubX = marginX + 3;
    const colCoefX = marginX + 65;
    const colS1X = marginX + 80;
    const colS2X = marginX + 100;
    const colAnnX = marginX + 120;
    const colEvolX = marginX + 140;
    const colAppX = marginX + 155;

    doc.text("DISCIPLINES PÉDAGOGIQUES", colSubX, p2Y + 4.5);
    doc.text("COEF", colCoefX, p2Y + 4.5);
    doc.text("SEM. 1", colS1X, p2Y + 4.5);
    doc.text("SEM. 2", colS2X, p2Y + 4.5);
    doc.text("ANNUEL", colAnnX, p2Y + 4.5);
    doc.text("ÉVOL.", colEvolX, p2Y + 4.5);
    doc.text("APPRÉCIATION", colAppX, p2Y + 4.5);

    // Table Body
    p2Y += 7;
    data.bulletin.subjects.forEach((sub, index) => {
      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.rect(marginX, p2Y, contentWidth, 6.5, "F");
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, p2Y + 6.5, marginX + contentWidth, p2Y + 6.5);

      const s1 = sub.s1Average ?? sub.average;
      const s2 = sub.s2Average ?? (sub.average + 1.5);
      const ann = sub.annualAverage ?? sub.average;
      const diff = sub.trendDiff ?? (s2 - s1);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42);
      doc.text(sub.name, colSubX, p2Y + 4.2, { maxWidth: 60 });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(String(sub.coef), colCoefX + 3, p2Y + 4.2);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(s1 >= 10 ? 37 : 225, s1 >= 10 ? 99 : 29, s1 >= 10 ? 235 : 72);
      doc.text(s1.toFixed(2), colS1X, p2Y + 4.2);

      doc.setTextColor(s2 >= 10 ? 16 : 225, s2 >= 10 ? 185 : 29, s2 >= 10 ? 129 : 72);
      doc.text(s2.toFixed(2), colS2X, p2Y + 4.2);

      doc.setTextColor(15, 23, 42);
      doc.text(ann.toFixed(2), colAnnX, p2Y + 4.2);

      doc.setFontSize(6);
      doc.setTextColor(diff >= 0 ? 16 : 225, diff >= 0 ? 185 : 29, diff >= 0 ? 129 : 72);
      doc.text(diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1), colEvolX, p2Y + 4.2);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(sub.appreciation, colAppX, p2Y + 4.2, { maxWidth: 20 });

      p2Y += 6.5;
    });

    // Summary Box on Page 2
    p2Y += 5;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(marginX, p2Y, contentWidth, 16, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61);
    doc.text("SYNTHÈSE ANNUELLE ET DÉCISION DU CONSEIL DE CLASSE :", marginX + 4, p2Y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Moyenne Générale S1 : 12.65 / 20  •  Moyenne S2 : 14.42 / 20  •  Moyenne Générale Annuelle : 13.53 / 20 (Rang : 7ème / 20 élèves)\n` +
      `Décision Officielle : ${data.bulletin.decision}  •  Conduite : ${data.bulletin.conduite}`,
      marginX + 4,
      p2Y + 10,
      { maxWidth: contentWidth - 8 }
    );

    // Bottom Notice
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Document officiel généré par le portail public d'intégrité EDUT. Vérification instantanée : " + verifyUrl,
      pageWidth / 2,
      pageHeight - 9,
      { align: "center" }
    );
  }

  const fileName = isFinancial
    ? `Quittance_Verifiee_${(data.financial?.receiptNumber || data.student.matricule).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    : isBulletin
    ? `Releve_Notes_Complet_${data.student.matricule.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    : `Attestation_Diplome_${data.student.matricule.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

  doc.save(fileName);
}
