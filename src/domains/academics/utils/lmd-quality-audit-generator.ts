/**
 * Official Academic Quality & Performance Audit Report Generator
 * Standards: ANAQ-Sup / CAMES / REESAO / UNESCO Bologna
 * Generates Official PDF Report with Key Performance Indicators, Pass Rates,
 * Normal vs Rattrapage Session Impact, and Quality Assurance Metrics.
 */

export interface QualityAuditParams {
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    facultyName?: string;
    city?: string;
    academicYear?: string;
  };
  metrics: {
    totalStudents: number;
    graduatedCount: number;
    directPassCount: number;
    enjambementCount: number;
    ajourneCount: number;
    overallPassRate: number; // e.g. 84.5%
    session1PassRate: number; // e.g. 68.2%
    session2RecoveryRate: number; // e.g. 52.4% (gain from rattrapage)
    averageGpa: number; // e.g. 14.85 / 20
    totalEctsAwarded: number; // e.g. 4,560 ECTS
  };
  uePerformances: Array<{
    codeUe: string;
    nameUe: string;
    creditsEcts: number;
    passRate: number; // %
    averageGrade: number; // /20
    failureRisk: "Faible" | "Modéré" | "Élevé";
  }>;
  gradeDistribution: Array<{
    grade: string; // A, B, C, D, E, F
    count: number;
    percentage: number;
    label: string;
  }>;
}

export async function generateQualityAuditReportPDF(data: QualityAuditParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Dual Security Outer Borders
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.8);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, "S");

  // 2. Headings
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
  doc.text(ministry, 14, 22, { maxWidth: 70 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(school, pageWidth - 14, 16, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(79, 70, 229);
  doc.text(faculty, pageWidth - 14, 20.5, { align: "right" });

  // 3. Main Title Banner
  const bannerY = 30;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(13, bannerY, pageWidth - 26, 14, 1.5, 1.5, "F");

  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(13, bannerY, 3.5, 14, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `RAPPORT OFFICIEL D'AUDIT & PILOTAGE DE LA QUALITÉ PÉDAGOGIQUE LMD`,
    pageWidth / 2 + 1.5,
    bannerY + 5.8,
    { align: "center" }
  );

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text(
    `Évaluation des Taux de Réussite, Rendement des ECTS & Indicateurs ANAQ-Sup / CAMES • Année ${data.institution.academicYear || "2025-2026"}`,
    pageWidth / 2 + 1.5,
    bannerY + 10.5,
    { align: "center" }
  );

  let currentY = 48;

  const renderSectionBar = (title: string) => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(13, currentY, pageWidth - 26, 6, 1, 1, "FD");

    doc.setFillColor(16, 185, 129);
    doc.rect(13, currentY, 2.5, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), 18, currentY + 4.2);
    currentY += 8;
  };

  // 4. INDICATEURS CLÉS DE PERFORMANCE (KPIs)
  renderSectionBar("1. Synthèse Globale & Rendement Académique du Cycle");

  const m = data.metrics;
  const kpiBlocks = [
    { label: "EFFECTIF ÉTUDIANTS", val: `${m.totalStudents}`, sub: "Inscrits aux délibérations" },
    { label: "TAUX GLOBAL DE RÉUSSITE", val: `${m.overallPassRate.toFixed(1)} %`, sub: "Admis & Enjambement" },
    { label: "MOYENNE GÉNÉRALE (MGC)", val: `${m.averageGpa.toFixed(2)} / 20`, sub: "Performance de la cohorte" },
    { label: "VOLUME ECTS CAPITALISÉ", val: `${m.totalEctsAwarded} ECTS`, sub: "Crédits validés au total" },
  ];

  const colW = (pageWidth - 26) / 4;
  kpiBlocks.forEach((kpi, idx) => {
    const kx = 13 + idx * colW;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, currentY, colW - 2, 16, 1, 1, "FD");

    doc.setFontSize(5.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + (colW - 2) / 2, currentY + 4.5, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, kx + (colW - 2) / 2, currentY + 10, { align: "center" });

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, kx + (colW - 2) / 2, currentY + 14, { align: "center" });
  });

  currentY += 19.5;

  // 5. IMPACT DE LA SESSION DE RATTRAPAGE
  renderSectionBar("2. Analyse Comparative des Sessions (Normale vs Rattrapage)");

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(13, currentY, pageWidth - 26, 18, 1.2, 1.2, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`Taux de réussite en Session 1 (Normale) : ${m.session1PassRate.toFixed(1)} %`, 18, currentY + 6.5);
  doc.text(`Taux de récupération en Session 2 (Rattrapage) : +${m.session2RecoveryRate.toFixed(1)} % des ajournés`, pageWidth / 2 + 2, currentY + 6.5);

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Admis direct : ${m.directPassCount} (${((m.directPassCount / m.totalStudents) * 100).toFixed(1)}%)   •   Enjambement (>=45 ECTS) : ${m.enjambementCount}   •   Ajournés : ${m.ajourneCount}`,
    18,
    currentY + 13
  );

  currentY += 22;

  // 6. TABLEAU DE PERFORMANCE PAR UNITÉ D'ENSEIGNEMENT (UE)
  renderSectionBar("3. Rendement Pédagogique & Vulnérabilité par Unité d'Enseignement (UE)");

  const ueRows = data.uePerformances.map((ue, idx) => [
    (idx + 1).toString(),
    ue.codeUe,
    ue.nameUe,
    `${ue.creditsEcts} ECTS`,
    `${ue.averageGrade.toFixed(2)} / 20`,
    `${ue.passRate.toFixed(1)} %`,
    ue.failureRisk,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["N°", "Code UE", "Intitulé de l'Unité d'Enseignement", "Crédits", "Moyenne /20", "Taux Réussite", "Risque"]],
    body: ueRows,
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
      0: { cellWidth: 8 },
      1: { fontStyle: "bold", cellWidth: 20 },
      2: { halign: "left", fontStyle: "bold", cellWidth: 80 },
      3: { cellWidth: 18, fontStyle: "bold", textColor: [79, 70, 229] },
      4: { cellWidth: 20 },
      5: { cellWidth: 22, fontStyle: "bold", textColor: [16, 185, 129] },
      6: { cellWidth: 18 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 7. DISTRIBUTION DES GRADES INTERNATIONAUX ECTS
  renderSectionBar("4. Répartition de la Cohorte selon l'Échelle ECTS (A à F)");

  const gradeRows = data.gradeDistribution.map((g) => [
    `Grade ${g.grade}`,
    g.label,
    g.count.toString(),
    `${g.percentage.toFixed(1)} %`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Grade ECTS", "Signification & Description CAMES / REESAO", "Effectif", "Pourcentage"]],
    body: gradeRows,
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
      0: { fontStyle: "bold", textColor: [79, 70, 229], cellWidth: 25 },
      1: { halign: "left", cellWidth: 95 },
      2: { cellWidth: 30 },
      3: { fontStyle: "bold", cellWidth: 34 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // 8. VISA & SIGNATURES DU COMITÉ DE PILOTAGE QUALITÉ
  renderSectionBar("5. Validation du Responsable Assurance Qualité & Doyen");

  const sigH = 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(13, currentY, pageWidth - 26, sigH, 1, 1, "FD");

  const sigColW = (pageWidth - 26) / 2;

  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Responsable de la Cellule Interne d'Assurance Qualité", 20, currentY + 5.5);
  doc.text("Le Doyen de la Faculté & Président du Conseil", 20 + sigColW, currentY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Visa et Analyse Qualité", 20, currentY + 9);
  doc.text("Approbation et Transmission au Rectorat", 20 + sigColW, currentY + 9);

  doc.setDrawColor(203, 213, 225);
  doc.line(20, currentY + 17, 20 + sigColW - 15, currentY + 17);
  doc.line(20 + sigColW, currentY + 17, pageWidth - 20, currentY + 17);

  // Footer Date
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Fait à ${data.institution.city || "Niamey"}, le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} • Rapport d'Audit Qualité LMD`, pageWidth / 2, pageHeight - 11, { align: "center" });

  doc.save(`Rapport_Audit_Qualite_LMD_${data.institution.academicYear || "2026"}.pdf`);
}
