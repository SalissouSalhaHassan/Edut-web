import { jsPDF } from "jspdf";
import originalAutoTable from "jspdf-autotable";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

function ensureAmiriRegistered(doc: jsPDF) {
  try {
    const fontList = doc.getFontList();
    if (!fontList["Amiri"]) {
      if (amiriFontBase64) {
        try {
          doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        } catch (e) {}
        try {
          doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
          console.log("[Amiri debug] ensureAmiriRegistered registered Amiri on doc instance");
        } catch (e) {
          console.error("[Amiri debug] ensureAmiriRegistered failed:", e);
        }
      }
    }
  } catch (e) {
    console.warn("Failed to check or register Amiri font:", e);
  }
}

const handleBilingualCell = (data: any) => {
  if (data.cell && data.cell.text) {
    let hasAr = false;
    const newText = data.cell.text.map((t: string) => {
      if (hasArabicCharacters(t)) {
        hasAr = true;
        return reshapeArabicText(t);
      }
      return t;
    });
    if (hasAr) {
      const activeDoc = data.doc || (data.settings && data.settings.doc);
      if (activeDoc) {
        ensureAmiriRegistered(activeDoc);
      }
      data.cell.text = newText;
      data.cell.styles.font = "Amiri";
      data.cell.styles.fontStyle = "normal";
    }
  }
};

const autoTable = (doc: jsPDF, options: any) => {
  const originalDidParseCell = options.didParseCell;
  options.didParseCell = (data: any) => {
    handleBilingualCell(data);
    if (originalDidParseCell) {
      originalDidParseCell(data);
    }
  };
  return originalAutoTable(doc, options);
};

function drawTextBilingual(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  if (hasArabicCharacters(text)) {
    ensureAmiriRegistered(doc);
    try {
      const reshaped = reshapeArabicText(text);
      const activeFont = doc.getFont();
      const activeStyle = activeFont.fontStyle;
      const activeName = activeFont.fontName;
      
      doc.setFont("Amiri", "normal");
      doc.text(reshaped, x, y, options);
      doc.setFont(activeName, activeStyle);
    } catch (e: any) {
      console.warn("Error rendering Arabic text with Amiri font:", e);
      doc.text(text, x, y, options);
    }
  } else {
    doc.text(text, x, y, options);
  }
}

function drawWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, align: "left" | "right" | "center"): number {
  const isAr = hasArabicCharacters(text);
  const currentFont = doc.getFont();
  const currentName = currentFont.fontName;
  const currentStyle = currentFont.fontStyle;

  if (isAr) {
    ensureAmiriRegistered(doc);
    const reshaped = reshapeArabicText(text);
    console.log("[Amiri debug] Setting font to Amiri for text:", text, "reshaped:", reshaped);
    doc.setFont("Amiri", "normal");
    console.log("[Amiri debug] Active font after setFont:", doc.getFont()?.fontName);
    const lines = doc.splitTextToSize(reshaped, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4;
    }
    doc.setFont(currentName, currentStyle);
    return tempY - y;
  } else {
    const lines = doc.splitTextToSize(text, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4;
    }
    return tempY - y;
  }
}

function drawOfflineWatermark(doc: jsPDF, text: string = "PROVISOIRE - HORS LIGNE") {
  const pageCount = doc.getNumberOfPages();
  doc.saveGraphicsState();
  doc.setTextColor(252, 165, 165); // Soft red/pink
  doc.setFontSize(40);
  doc.setFont("helvetica", "bold");
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(text, 105, 148, {
      align: "center",
      angle: 45,
    });
  }
  doc.restoreGraphicsState();
}

async function fetchQRCodeBase64(data: string): Promise<string> {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve("");
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    };
    img.onerror = () => {
      resolve("");
    };
  });
}

async function fetchTransparentLogoBase64(url: string, opacity: number = 0.08): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve("");
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);
      }
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    };
    img.onerror = () => {
      resolve("");
    };
  });
}

function drawPDFHeader(
  doc: jsPDF,
  headerConfig: any,
  branchInfo: any,
  eduLevel: string,
  session: string
) {
  const style = headerConfig?.style || "classic_dual_logo";
  const schoolName = headerConfig?.schoolName || branchInfo?.branchName || "ÉCOLE EXCELLENCE";
  const address = headerConfig?.address || branchInfo?.address || "";
  const phone = headerConfig?.phone || branchInfo?.contactNo || "";
  const email = headerConfig?.email || branchInfo?.email || "";
  const registrationNo = headerConfig?.registrationNo || branchInfo?.registrationNo || "";
  const schoolYear = headerConfig?.schoolYear || session || "";
  const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
  const service = headerConfig?.service || "Service de la Scolarité";
  const bp = headerConfig?.bp || "";
  const motto = headerConfig?.motto || "";
  
  const leftLogo = headerConfig?.leftLogo || branchInfo?.logoPath;
  const rightLogo = headerConfig?.rightLogo || leftLogo;
  const centerLogo = headerConfig?.centerLogo || leftLogo;

  if (style === "modern_card") {
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(10, 8, 190, 26, 2, 2, "F");
    
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', 14, 11, 20, 20);
      } catch (e) {}
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    drawWrappedText(doc, schoolName, 38, 17, 150, "left");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 225, 255);
    drawWrappedText(doc, `Année Scolaire: ${schoolYear} | Niveau: ${eduLevel}`, 38, 23, 150, "left");
    drawWrappedText(doc, `${address} ${phone ? '| Tél: ' + phone : ''}`, 38, 28, 150, "left");
    
    doc.setTextColor(0, 0, 0);
    return 38;
  }
  
  if (style === "bilingual_center_logo") {
    if (centerLogo) {
      try {
        doc.addImage(centerLogo, 'PNG', 92, 8, 26, 26);
      } catch (e) {}
    }
    
    const leftLines = [
      headerConfig?.country || branchInfo?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || branchInfo?.regionalDirection || "",
      headerConfig?.departmentalDirection || branchInfo?.departmentalDirection || "",
      headerConfig?.inspection || branchInfo?.inspection || "",
      schoolName,
      service,
      address,
      bp ? `BP : ${bp}` : "",
      phone ? `Tél: ${phone}` : "",
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    const rightLines = [
      headerConfig?.countryAr || "جمهورية النيجر",
      headerConfig?.ministryAr || "وزارة التربية الوطنية",
      headerConfig?.regionalDirectionAr || "",
      headerConfig?.departmentalDirectionAr || "",
      headerConfig?.inspectionAr || "",
      headerConfig?.schoolNameAr || schoolName,
      headerConfig?.serviceAr || "",
      headerConfig?.addressAr || "",
      bp ? `ص.ب: ${bp}` : "",
      phone ? `الهاتف: ${phone}` : "",
      email ? `البريد: ${email}` : "",
    ].filter(Boolean);

    const colWidth = centerLogo ? 78 : 92;
    
    let leftY = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    for (const line of leftLines) {
      const height = drawWrappedText(doc, line, 10, leftY, colWidth, "left");
      leftY += height + 0.5;
    }
    
    let rightY = 12;
    for (const line of rightLines) {
      const height = drawWrappedText(doc, line, 200, rightY, colWidth, "right");
      rightY += height + 0.5;
    }
    
    const maxY = Math.max(leftY, rightY);
    doc.setLineWidth(0.5);
    doc.line(10, maxY + 2, 200, maxY + 2);
    return maxY + 4;
  }
  
  if (style === "university_formal") {
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', 10, 5, 22, 22);
      } catch (e) {}
    }
    if (rightLogo) {
      try {
        doc.addImage(rightLogo, 'PNG', 178, 5, 22, 22);
      } catch (e) {}
    }
    
    const centerLines = [
      headerConfig?.country || branchInfo?.country || "REPUBLIQUE DU NIGER",
      schoolName,
      service,
      [bp && `BP : ${bp}`, address, phone && `Tél. ${phone}`].filter(Boolean).join(" | "),
      email ? `Email : ${email}` : "",
      registrationNo ? `Agrément N°: ${registrationNo}` : "",
    ].filter(Boolean);

    let centerY = 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const height0 = drawWrappedText(doc, centerLines[0].toUpperCase(), 105, centerY, 140, "center");
    centerY += height0 + 1;
    
    doc.setFontSize(12);
    const height1 = drawWrappedText(doc, centerLines[1], 105, centerY, 140, "center");
    centerY += height1 + 1;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    for (let i = 2; i < centerLines.length; i++) {
      const height = drawWrappedText(doc, centerLines[i], 105, centerY, 140, "center");
      centerY += height + 0.5;
    }
    
    const finalY = Math.max(centerY + 1.5, 26);
    doc.setLineWidth(0.5);
    doc.line(10, finalY, 200, finalY);
    return finalY + 1;
  }
  
  if (style === "minimal_administrative") {
    if (centerLogo || leftLogo) {
      try {
        doc.addImage(centerLogo || leftLogo, 'PNG', 175, 8, 22, 22);
      } catch (e) {}
    }
    
    const leftLines = [
      schoolName,
      headerConfig?.country || branchInfo?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || branchInfo?.regionalDirection || "",
      headerConfig?.inspection || branchInfo?.inspection || "",
      registrationNo ? `Agrément: ${registrationNo}` : "",
      [address, phone && `Tél: ${phone}`].filter(Boolean).join(" | "),
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    let leftY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const height0 = drawWrappedText(doc, leftLines[0], 10, leftY, 155, "left");
    leftY += height0 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (let i = 1; i < leftLines.length; i++) {
      const height = drawWrappedText(doc, leftLines[i], 10, leftY, 155, "left");
      leftY += height + 0.5;
    }
    
    const finalY = Math.max(leftY + 3, 32);
    doc.setLineWidth(0.3);
    doc.line(10, finalY, 200, finalY);
    return finalY + 2;
  }
  
  if (leftLogo) {
    try {
      doc.addImage(leftLogo, 'PNG', 10, 5, 22, 22);
    } catch (e) {}
  }
  if (rightLogo && rightLogo !== leftLogo) {
    try {
      doc.addImage(rightLogo, 'PNG', 178, 5, 22, 22);
    } catch (e) {}
  }
  
  const centerLines = [
    schoolName,
    motto ? `"${motto}"` : "",
    [registrationNo && `Agrément: ${registrationNo}`, eduLevel && `Niveau: ${eduLevel}`].filter(Boolean).join(" | "),
    `Année Scolaire: ${schoolYear}`,
    [phone && `Tél: ${phone}`, email && `Email: ${email}`].filter(Boolean).join(" | "),
    address ? `Adresse: ${address}` : "",
  ].filter(Boolean);

  let centerY = 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const height0 = drawWrappedText(doc, centerLines[0], 105, centerY, 140, "center");
  centerY += height0 + 1;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < centerLines.length; i++) {
    if (i === 1 && motto) {
      doc.setFont("helvetica", "italic");
      const height = drawWrappedText(doc, centerLines[i], 105, centerY, 140, "center");
      centerY += height + 0.5;
      doc.setFont("helvetica", "normal");
    } else {
      const height = drawWrappedText(doc, centerLines[i], 105, centerY, 140, "center");
      centerY += height + 0.5;
    }
  }
  
  const finalY = Math.max(centerY + 1.5, 26);
  doc.setLineWidth(0.5);
  doc.line(10, finalY, 200, finalY);
  return finalY + 1;
}

export async function generateBulletinPDF(data: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { student, session, term, results, summary, summaryS1, summaryS2, totalStudents, branchInfo, headerConfig } = data;
  
  if (amiriFontBase64) {
    try {
      doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      console.log("[Amiri debug] Amiri registered directly on doc instance in generateBulletinPDF");
    } catch (e) {
      console.warn("[Amiri debug] Failed to register Amiri directly in generateBulletinPDF:", e);
    }
  }

  const safeTerm = (term || "Semestre").toUpperCase();
  const eduLevel = (student?.educationalLevel || "Lycée").toUpperCase();
  
  // Title mapping based on level
  let mainTitle = "BULLETIN DE NOTES";
  if (eduLevel.includes("PRIMAIRE")) mainTitle = "CARNET DE NOTES";
  if (eduLevel.includes("UNIVERSITÉ") || eduLevel.includes("SUPÉRIEUR")) mainTitle = "RELEVÉ DE NOTES";

  // Header
  const headerEndY = drawPDFHeader(doc, headerConfig, branchInfo, eduLevel, session);

  // Background logo watermark - Expanded to cover page center behind tables
  const logoUrl = headerConfig?.centerLogo || headerConfig?.leftLogo || headerConfig?.rightLogo || branchInfo?.logoPath;
  if (logoUrl) {
    try {
      const logoWatermark = await fetchTransparentLogoBase64(logoUrl, 0.10);
      if (logoWatermark) {
        doc.addImage(logoWatermark, 'PNG', 30, 70, 150, 150);
      }
    } catch (e) {
      console.warn("Failed to load watermark for bulletin:", e);
    }
  }

  const titleY = headerEndY + 4.5;
  const infoBoxY = headerEndY + 9.5;
  const textRow1Y = infoBoxY + 5;
  const textRow2Y = infoBoxY + 10.5;
  const textRow3Y = infoBoxY + 15.5;
  const tableY = infoBoxY + 20.5;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bolditalic");
  doc.text(`${mainTitle} - ${safeTerm}`, 105, titleY, { align: "center" });

  // Student Info Box
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(10, infoBoxY, 190, 19);
  
  // Extract and compute data robustly
  const totalCoef = (results || []).reduce((acc: number, r: any) => acc + (parseFloat(r.coefficient) || 1), 0);
  const totalWeighted = (results || []).reduce((acc: number, r: any) => {
    const cw = parseFloat(r.classWorkScore) || 0;
    const ex = parseFloat(r.examScore) || 0;
    const coef = parseFloat(r.coefficient) || 1;
    return acc + (((cw + ex) / 2) * coef);
  }, 0);

  const computedAverage = totalCoef > 0 ? (totalWeighted / totalCoef) : 0;
  const displayAverage = summary?.average || computedAverage;
  const rawRank = summary?.rank || student?.rank || "-";
  
  const formatRank = (val: string | number | null | undefined) => {
    if (!val || val === "-") return "-";
    const str = String(val).trim();
    if (str === "1") return "1er";
    if (/^\d+$/.test(str)) return `${str}ème`;
    return str; // already formatted
  };
  
  const displayRank = formatRank(rawRank);

  // Load QR Code early to place inside the box
  let qrBase64: string | null = null;
  try {
    const qrData = `ELEVE: ${student?.nomEtudiant || student?.name || "N/A"} | MATRICULE: ${student?.numAdmission || student?.matricule || "N/A"} | MOYENNE: ${displayAverage.toFixed(2)}/20 | CLASSE: ${student?.classe || student?.className || "N/A"}`;
    qrBase64 = await fetchQRCodeBase64(qrData);
  } catch (e) {
    console.warn("Failed to load QR code for Bulletin:", e);
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ÉLÈVE:", 15, textRow1Y);
  doc.setFont("helvetica", "normal");
  drawTextBilingual(doc, student?.nomEtudiant || student?.name || "N/A", 40, textRow1Y);

  doc.setFont("helvetica", "bold");
  doc.text("MATRICULE:", 15, textRow2Y);
  doc.setFont("helvetica", "normal");
  drawTextBilingual(doc, student?.numAdmission || student?.matricule || "N/A", 40, textRow2Y);

  doc.setFont("helvetica", "bold");
  doc.text("CLASSE:", 15, textRow3Y);
  doc.setFont("helvetica", "normal");
  drawTextBilingual(doc, student?.classe || student?.className || "N/A", 40, textRow3Y);

  doc.setFont("helvetica", "bold");
  doc.text("RANG:", 130, textRow1Y);
  doc.setFont("helvetica", "normal");
  doc.text(`${displayRank} / ${totalStudents || 0}`, 150, textRow1Y);

  doc.setFont("helvetica", "bold");
  doc.text("MOYENNE:", 130, textRow2Y);
  doc.setFont("helvetica", "bold");
  doc.text(`${displayAverage.toFixed(2)} / 20`, 150, textRow2Y);

  if (qrBase64) {
    doc.addImage(qrBase64, 'PNG', 179, infoBoxY + 1.5, 16, 16);
  }

  // Results Table
  const tableData = (results || []).map((r: any) => {
    const cw = parseFloat(r.classWorkScore) || 0;
    const ex = parseFloat(r.examScore) || 0;
    const coef = parseFloat(r.coefficient) || 1;
    const avg = (cw + ex) / 2;
    const weighted = avg * coef;
    
    return [
      r.subject?.subjectName || r.subjectName || "Matière",
      cw.toFixed(2),
      ex.toFixed(2),
      avg.toFixed(2),
      coef,
      weighted.toFixed(2),
      formatRank(r.rank),
      r.appreciation || "-",
      ""
    ];
  });

  // Determine semesters' averages and ranks cleanly
  const isS1Active = safeTerm.includes("1") || safeTerm.includes("PREMIÈRE") || safeTerm.includes("1ER");
  const isS2Active = safeTerm.includes("2") || safeTerm.includes("DEUXIÈME") || safeTerm.includes("2ÈME");

  const avgS1 = isS1Active ? displayAverage : (summaryS1?.average || null);
  const rankS1 = isS1Active ? displayRank : formatRank(summaryS1?.rank);

  const avgS2 = isS2Active ? displayAverage : (summaryS2?.average || null);
  const rankS2 = isS2Active ? displayRank : formatRank(summaryS2?.rank);

  const annualAvg = (summary?.annualAverage !== undefined && summary?.annualAverage !== null)
    ? summary.annualAverage
    : (avgS1 !== null && avgS2 !== null ? (avgS1 + avgS2) / 2 : null);

  const annualRank = formatRank(summary?.annualRank);

  const displayAvgS1 = avgS1 !== null && avgS1 !== undefined ? (typeof avgS1 === 'number' ? avgS1.toFixed(2) : String(avgS1)) : "";
  const displayRankS1 = rankS1 || "";
  const displayAvgS2 = avgS2 !== null && avgS2 !== undefined ? (typeof avgS2 === 'number' ? avgS2.toFixed(2) : String(avgS2)) : "";
  const displayRankS2 = rankS2 || "";
  const displayAnnualAvg = annualAvg !== null && annualAvg !== undefined ? (typeof annualAvg === 'number' ? annualAvg.toFixed(2) : String(annualAvg)) : "";
  const displayAnnualRank = annualRank || "";

  const footerRows: any[] = [
    [
      { content: "Conduite", colSpan: 4, styles: { halign: "left", fontStyle: "bold" } },
      { content: "1", styles: { halign: "center", fontStyle: "bold" } },
      { content: summary?.conduite || student?.conduite || "-", styles: { halign: "center", fontStyle: "bold" } },
      { content: "", colSpan: 3, styles: {} }
    ],
    [
      { content: "Total", colSpan: 4, styles: { halign: "left", fontStyle: "bold" } },
      { content: totalCoef.toFixed(2), styles: { halign: "center", fontStyle: "bold" } },
      { content: totalWeighted.toFixed(2), styles: { halign: "center", fontStyle: "bold" } },
      { content: "", colSpan: 3, styles: {} }
    ],
    [
      { content: `Moy. du ${safeTerm}`, colSpan: 5, styles: { halign: "left", fontStyle: "bold" } },
      { content: displayAverage.toFixed(2), styles: { halign: "center", fontStyle: "bold", fillColor: [240, 240, 240] } },
      { content: "", colSpan: 3, styles: {} }
    ],
    [
      { content: "Moy. Annuelle", colSpan: 5, styles: { halign: "left", fontStyle: "bold" } },
      { content: displayAnnualAvg || "-", styles: { halign: "center", fontStyle: "bold", fillColor: [240, 240, 240] } },
      { content: "", colSpan: 3, styles: {} }
    ]
  ];

  autoTable(doc, {
    startY: tableY,
    head: [["Discipline", "Moy. CC", "Compo", "Moyenne", "Coef", "Moy x Coef", "Rang", "Appréciation", "Sign Prof"]],
    body: tableData,
    foot: footerRows,
    theme: "grid",
    headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: "bold" },
    footStyles: { textColor: 0, lineWidth: 0.1, lineColor: 0 },
    styles: { fontSize: 8.5, cellPadding: 1.2, lineColor: 0, lineWidth: 0.1, textColor: 0 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      4: { halign: "center" },
      5: { fontStyle: "bold", halign: "center" }
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' || data.section === 'foot') {
        data.cell.styles.fillColor = false;
      }
    },
    margin: { left: 10, right: 10 }
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 3;

  // 1. Table: Moyenne Générale sur 20
  autoTable(doc, {
    startY: finalY1,
    head: [
      [{ content: "Moyenne Générale sur 20", colSpan: 6, styles: { halign: "center", fontStyle: "bold", textColor: 0 } }],
      [
        { content: "1er Semestre", colSpan: 2, styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "2ème Semestre", colSpan: 2, styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Moyenne Annuelle", colSpan: 2, styles: { halign: "center", fontStyle: "bold", textColor: 0 } }
      ],
      [
        { content: "Moyenne", styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Rang", styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Moyenne", styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Rang", styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Moyenne", styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Rang", styles: { halign: "center", fontStyle: "bold", textColor: 0 } }
      ]
    ],
    body: [
      [
        { content: displayAvgS1, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayRankS1, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayAvgS2, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayRankS2, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayAnnualAvg, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayAnnualRank, styles: { halign: "center", fontStyle: "bold" } }
      ]
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1, lineColor: 0, lineWidth: 0.1, textColor: 0 },
    didParseCell: (data: any) => {
      data.cell.styles.fillColor = false;
    },
    margin: { left: 10, right: 10 }
  });

  const checkT = (target: string) => {
    const val = (summary?.travail || "").toLowerCase().trim();
    const tgt = target.toLowerCase().trim();
    if (!val) return `[  ] ${target}`;
    return val.includes(tgt) || tgt.includes(val) ? `[X] ${target}` : `[  ] ${target}`;
  };

  const getConduiteString = (score: number | string | undefined | null) => {
    if (score === undefined || score === null) return "";
    const num = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(num)) return String(score); // Fallback if it's somehow a string
    if (num >= 14) return "Bonne";
    if (num >= 12) return "Assez Bien";
    if (num >= 10) return "Passable";
    if (num >= 8) return "Avertissement";
    return "Blâme";
  };

  const checkC = (target: string) => {
    const val = getConduiteString(summary?.conduite).toLowerCase().trim();
    const tgt = target.toLowerCase().trim();
    if (!val) return `[  ] ${target}`;
    return val === tgt ? `[X] ${target}` : `[  ] ${target}`;
  };

  const finalY2 = (doc as any).lastAutoTable.finalY + 3;
  autoTable(doc, {
    startY: finalY2,
    head: [
      [{ content: "Appréciation", colSpan: 3, styles: { halign: "center", fontStyle: "bold", textColor: 0 } }],
      [
        { content: "Travail", styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Conduite", styles: { halign: "center", fontStyle: "bold", textColor: 0 } },
        { content: "Assiduité/Retard", styles: { halign: "center", fontStyle: "bold", textColor: 0 } }
      ]
    ],
    body: [
      [checkT("Félicitation"), checkC("Bonne"), { content: "", rowSpan: 5 }],
      [checkT("Encouragement"), checkC("Avertissement"), ""],
      [checkT("Tableau d'honneur"), checkC("Passable"), ""],
      [checkT("Avertissement"), checkC("Assez Bien"), ""],
      [checkT("Blâme"), checkC("Blâme"), ""],
      [
        { content: summary?.travail || "", styles: { fontStyle: "bolditalic", halign: "center", textColor: [63, 81, 181] } },
        { content: getConduiteString(summary?.conduite) || "", styles: { fontStyle: "bolditalic", halign: "center", textColor: [63, 81, 181] } },
        { content: "" }
      ]
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1, lineColor: 0, lineWidth: 0.1, textColor: 0 },
    didParseCell: (data: any) => {
      data.cell.styles.fillColor = false;
    },
    margin: { left: 10, right: 10 }
  });

  // 3. Table: Résultat annuel & Signatures (Automated decision linkage & Target Class Computation)
  const rawDecision = String(summary?.decision || "").toUpperCase();
  const annualAvgVal = typeof summary?.annualAverage === 'number' ? summary.annualAverage : (typeof student?.annualAverage === 'number' ? student.annualAverage : (parseFloat(displayAnnualAvg) || summary?.average || 0));

  const isPassage = rawDecision.includes("ADMIS") || rawDecision.includes("PASSAGE") || (!rawDecision && annualAvgVal >= 10.0);
  const isRedoublement = rawDecision.includes("REDOUBLE") || (!rawDecision && annualAvgVal >= 8.0 && annualAvgVal < 10.0);
  const isExclusion = rawDecision.includes("EXCLU") || (!rawDecision && annualAvgVal < 8.0 && annualAvgVal > 0);

  const computeNextClassStr = (currentCls?: string, explicitTarget?: string) => {
    if (explicitTarget && explicitTarget.trim()) return explicitTarget.trim();
    if (!currentCls) return "Classe Supérieure";
    const cls = currentCls.trim();
    const u = cls.toUpperCase();

    if (u.includes("6ÈME") || u.includes("6EME") || u.includes("6E")) return cls.replace(/6è?m?e?/i, "5ème");
    if (u.includes("5ÈME") || u.includes("5EME") || u.includes("5E")) return cls.replace(/5è?m?e?/i, "4ème");
    if (u.includes("4ÈME") || u.includes("4EME") || u.includes("4E")) return cls.replace(/4è?m?e?/i, "3ème");
    if (u.includes("3ÈME") || u.includes("3EME") || u.includes("3E")) return cls.replace(/3è?m?e?/i, "2nde");
    if (u.includes("2NDE") || u.includes("2ND")) return cls.replace(/2nde?/i, "1ère");
    if (u.includes("1ÈRE") || u.includes("1ERE") || u.includes("1ER")) return cls.replace(/1è?r?e?/i, "Tle");

    if (u.includes("CI")) return cls.replace(/CI/i, "CP");
    if (u.includes("CP")) return cls.replace(/CP/i, "CE1");
    if (u.includes("CE1")) return cls.replace(/CE1/i, "CE2");
    if (u.includes("CE2")) return cls.replace(/CE2/i, "CM1");
    if (u.includes("CM1")) return cls.replace(/CM1/i, "CM2");

    if (u.includes("L1")) return cls.replace(/L1/i, "L2");
    if (u.includes("L2")) return cls.replace(/L2/i, "L3");
    if (u.includes("M1")) return cls.replace(/M1/i, "M2");

    return `${cls} (Niveau Supé.)`;
  };

  const nextClassName = computeNextClassStr(student?.classe, (summary as any)?.targetClassName);
  const currentOrTargetRepeatClass = (summary as any)?.targetClassName || student?.classe || "classe actuelle";

  const passageLabel = isPassage ? `[X] Passage en ${nextClassName}` : `[  ] Passage en`;
  const redoublementLabel = isRedoublement ? `[X] Redoublement en ${currentOrTargetRepeatClass}` : `[  ] Redoublement`;
  const exclusionLabel = isExclusion ? `[X] Exclusion` : `[  ] Exclusion`;
  
  const rawComputedLabel = summary?.decision || (isPassage ? `ADMIS(E) EN ${nextClassName.toUpperCase()} ✅` : isRedoublement ? "AUTORISÉ(E) À REDOUBLER ❌" : "EXCLU(E) DE L'ÉTABLISSEMENT ⛔");
  const computedDecisionLabel = String(rawComputedLabel).replace(/[✅❌⛔]/g, '').trim();

  const finalY3 = (doc as any).lastAutoTable.finalY + 3;
  autoTable(doc, {
    startY: finalY3,
    body: [
      [
        { content: "Résultat annuel", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: "Appréciation et signature du proviseur", styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "Proposé pour", rowSpan: 3, styles: { halign: "center", valign: "middle", fontStyle: "bold" } },
        { content: passageLabel, styles: { fontStyle: isPassage ? "bold" : "normal" } },
        { content: summary?.observation || "", rowSpan: 3, styles: { halign: "center", valign: "middle", fontStyle: "italic", fontSize: 9, textColor: [63, 81, 181] } }
      ],
      [{ content: redoublementLabel, styles: { fontStyle: isRedoublement ? "bold" : "normal" } }],
      [{ content: exclusionLabel, styles: { fontStyle: isExclusion ? "bold" : "normal" } }],
      [
        { content: computedDecisionLabel, colSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", fontSize: 8.5, textColor: [63, 81, 181] } },
        { content: "VISA DES PARENTS", styles: { halign: "center", fontStyle: "bold", valign: "bottom", minCellHeight: 16 } }
      ]
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.2, lineColor: 0, lineWidth: 0.1, textColor: 0 },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 53 }
    },
    margin: { left: 10, right: 10 }
  });

  const lastY = (doc as any).lastAutoTable.finalY;

  if (data.isOffline) {
    doc.saveGraphicsState();
    doc.setFillColor(254, 243, 199); // light amber background
    doc.setDrawColor(245, 158, 11);   // amber border
    doc.setLineWidth(0.5);
    doc.roundedRect(10, doc.internal.pageSize.getHeight() - 15, 190, 8, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);     // dark amber text
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, doc.internal.pageSize.getHeight() - 9.5, { align: "center" });
    doc.restoreGraphicsState();
  }

  // Save PDF directly to bypass browser PDF sandbox restrictions on blob URL custom fonts
  const studentName = student?.nomEtudiant?.replace(/\s+/g, "_") || "eleve";
  doc.save(`Bulletin_${studentName}_${Date.now()}.pdf`);
}

export async function generatePVMatrixPDF(matrixData: any, classInfo: any, filters: any) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  ensureAmiriRegistered(doc);

  const { students = [], subjects = [] } = matrixData || {};
  const classNameStr = classInfo?.className || filters?.className || "CLASSE";
  const sessionStr = filters?.sessionName || filters?.session || "2025-2026";
  const periodStr = String(filters?.period || "PÉRIODE").toUpperCase();
  const currentDateStr = new Date().toLocaleDateString("fr-FR");

  const headerConfig = classInfo?.headerConfig || filters?.headerConfig || {};
  const schoolName = headerConfig.schoolName || headerConfig.school?.name || "ÉCOLE EXCELLENCE";
  const country = headerConfig.country || headerConfig.countryName || "RÉPUBLIQUE DU NIGER";
  const motto = headerConfig.motto || "Unité - Travail - Progrès";
  const defaultMinistry = classInfo?.isHigherEd ? "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE" : "MINISTÈRE DE L'ÉDUCATION NATIONALE";
  const ministry = headerConfig.ministry || headerConfig.ministryName || defaultMinistry;
  const logo = headerConfig.leftLogo || headerConfig.rightLogo || headerConfig.centerLogo || headerConfig.logoUrl;

  const toDisplayNumber = (value: any, digits = 1) => {
    if (value === null || value === undefined || value === "" || value === "-") return "-";
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(digits) : "-";
  };

  const readResultTotal = (result: any) => {
    if (!result) return null;
    return result.total ?? result.totalScore ?? result.moy ?? result.average ?? result.weightedScore ?? result.note ?? null;
  };

  // Helper for ordinal rank formatting
  const getOrdinalRank = (rankNum: number) => {
    if (!rankNum || isNaN(rankNum)) return "-";
    if (rankNum === 1) return "1er";
    return `${rankNum}ème`;
  };

  let startY = 12;

  // Render Header Logo & Info
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 12, 8, 20, 20);
    } catch (e) {}
  }

  // Left Header Block
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(country.toUpperCase(), logo ? 35 : 12, startY);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text(motto, logo ? 35 : 12, startY + 4);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(ministry.toUpperCase(), logo ? 35 : 12, startY + 8);

  // Right Header Block
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(schoolName.toUpperCase(), 285, startY + 2, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Année Scolaire: ${sessionStr}`, 285, startY + 7, { align: "right" });
  doc.text(`Édition du: ${currentDateStr}`, 285, startY + 11, { align: "right" });

  // Divider Line
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.6);
  doc.line(10, startY + 14, 287, startY + 14);

  // Document Title Box
  doc.setFillColor(241, 245, 249);
  doc.rect(10, startY + 17, 277, 12, "F");
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`PROCÈS VERBAL DES RÉSULTATS — ${classNameStr.toUpperCase()}`, 148.5, startY + 23, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Période: ${periodStr}   |   Session: ${sessionStr}   |   Effectif: ${students.length} Élèves`, 148.5, startY + 27, { align: "center" });

  // Calculate ranks dynamically if needed
  const sortedStudents = [...students].sort((a, b) => {
    const avgA = Number(a.average ?? a.moyenne ?? a.annualAverage ?? 0);
    const avgB = Number(b.average ?? b.moyenne ?? b.annualAverage ?? 0);
    return avgB - avgA;
  });

  const rankMap = new Map<any, number>();
  sortedStudents.forEach((st, idx) => {
    rankMap.set(st.id || st.studentId || st.matricule || idx, idx + 1);
  });

  // Prepare Subject Headers (Subject Name on Line 1, Subject Code on Line 2)
  const subjectHeaderTitles = (subjects || []).map((s: any, idx: number) => {
    const sName = s.subjectName || s.name || `Matière ${idx + 1}`;
    const sCode = s.subjectCode || s.code || s.shortCode || `SUBJ${String(idx + 1).padStart(3, '0')}`;
    const sCoef = s.coefficient || 1;
    return `${sName}\n${sCode} (C:${sCoef})`;
  });

  // Build one column per subject: MOY.COEF only
  const subjectColHeaders: string[] = [];
  (subjects || []).forEach((s: any, idx: number) => {
    const sName = s.subjectName || s.name || `M${idx + 1}`;
    const sCode = s.subjectCode || s.code || s.shortCode || `S${idx + 1}`;
    const sCoef = s.coefficient || 1;
    subjectColHeaders.push(`${sName}\n${sCode} (C:${sCoef})\nMOY.COEF`);
  });

  const headers = ["N°", "Matricule", "Nom et Prénoms de l'Élève", ...subjectColHeaders, "MOY\n/20", "Rang", "Décision du Conseil"];

  // Table Body Rows
  let totalClassAvgSum = 0;
  let validAvgStudentsCount = 0;
  let admisCount = 0;
  let redoubleCount = 0;
  let excluCount = 0;

  // Subject Stats Aggregator — track raw scores and coefficient per subject
  const subjectStats: Record<string, { name: string; code: string; coef: number; scores: number[] }> = {};
  (subjects || []).forEach((subj: any, idx: number) => {
    const sName = subj.subjectName || subj.name || `Matière ${idx + 1}`;
    const sCode = subj.subjectCode || subj.code || subj.shortCode || `SUBJ${String(idx + 1).padStart(3, '0')}`;
    const sCoef = parseFloat(subj.coefficient) || 1;
    const key = String(subj.id || subj.subjectId || sCode);
    subjectStats[key] = { name: sName, code: sCode, coef: sCoef, scores: [] };
  });

  const body = (students || []).map((s: any, idx: number) => {
    const stKey = s.id || s.studentId || s.matricule || idx;
    const calcRank = rankMap.get(stKey) || idx + 1;
    const rankStr = getOrdinalRank(calcRank);

    const safeAvgNum = Number(s.average ?? s.moyenne ?? s.annualAverage ?? 0);
    if (!isNaN(safeAvgNum) && safeAvgNum > 0) {
      totalClassAvgSum += safeAvgNum;
      validAvgStudentsCount++;
    }

    const decisionStr = s.decision || (safeAvgNum >= 10.0 ? "ADMIS(E) EN CLASSE SUPÉRIEURE ✅" : safeAvgNum >= 8.0 ? "AUTORISÉ(E) À REDOUBLER ❌" : "EXCLU(E) DE L'ÉTABLISSEMENT ⛔");
    const isAdmis = decisionStr.includes("ADMIS");
    const isRedouble = decisionStr.includes("REDOUBLE");
    const isExclu = decisionStr.includes("EXCLU");

    if (isAdmis) admisCount++;
    else if (isRedouble) redoubleCount++;
    else if (isExclu) excluCount++;
    else admisCount++;

    const rowSubjectCols: string[] = [];
    (subjects || []).forEach((subj: any, sIdx: number) => {
      const resultMap = s.results || {};
      const res = resultMap[subj.id] || resultMap[subj.subjectId] || resultMap[subj.subjectName] || resultMap[subj.name];
      const valNum = readResultTotal(res);
      const coef = parseFloat(subj.coefficient) || 1;
      
      const key = String(subj.id || subj.subjectId || subj.subjectCode || subj.code || `SUBJ${String(sIdx + 1).padStart(3, '0')}`);
      if (valNum !== null && valNum !== undefined && !isNaN(Number(valNum))) {
        if (subjectStats[key]) {
          subjectStats[key].scores.push(Number(valNum));
        }
      }

      // Only push MOY.COEF — no per-subject MOY column
      const moyCoef = (valNum !== null && valNum !== undefined && !isNaN(Number(valNum)))
        ? (Number(valNum) * coef).toFixed(2)
        : "-";
      rowSubjectCols.push(moyCoef);
    });

    return [
      idx + 1,
      s.matricule || s.numAdmission || "-",
      s.name || s.studentName || s.nomEtudiant || "Élève",
      ...rowSubjectCols,
      toDisplayNumber(safeAvgNum, 2),
      rankStr,
      decisionStr.replace(/[✅❌⛔]/g, '').trim()
    ];
  });

  // Build columnStyles — one column per subject (MOY.COEF only)
  const subjectColStyles: Record<number, any> = {};
  const subjectStartCol = 3;
  const subjectColCount = (subjects || []).length; // 1 col per subject

  // Dynamic width: fill 277mm (A4 landscape usable width with 10mm margins each side)
  const FIXED_COLS_WIDTH = 7 + 26 + 38 + 14 + 13 + 34; // N° + Matricule + Nom + MOY + Rang + Decision
  const USABLE_WIDTH = 277;
  const availForSubjects = USABLE_WIDTH - FIXED_COLS_WIDTH;
  const subjColW = subjectColCount > 0
    ? Math.max(12, Math.floor(availForSubjects / subjectColCount))
    : 16;

  for (let i = 0; i < subjectColCount; i++) {
    subjectColStyles[subjectStartCol + i] = {
      cellWidth: subjColW,
      halign: "center",
      fontSize: 9,
      fontStyle: "bold"
    };
  }
  const moyCol   = subjectStartCol + subjectColCount;
  const rangCol  = moyCol + 1;
  const decCol   = rangCol + 1;

  const mainTableStartY = startY + 32;

  autoTable(doc, {
    startY: mainTableStartY,
    head: [headers],
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      valign: "middle"
    },
    styles: {
      fontSize: 10,
      fontStyle: "bold",
      cellPadding: 1.4,
      valign: "middle"
    },
    columnStyles: {
      0: { cellWidth: 7,  halign: "center", fontSize: 10, fontStyle: "bold" },
      1: { cellWidth: 26, halign: "center", fontSize: 8,  fontStyle: "bold" },
      2: { cellWidth: 38, fontSize: 10, fontStyle: "bold" },
      ...subjectColStyles,
      [moyCol]:  { cellWidth: 14, halign: "center", fontSize: 12, fontStyle: "bold" },
      [rangCol]: { cellWidth: 13, halign: "center", fontSize: 10, fontStyle: "bold" },
      [decCol]:  { cellWidth: 34, halign: "center", fontSize: 8,  fontStyle: "bold" }
    },
    tableWidth: USABLE_WIDTH,
    margin: { left: 10, right: 10 },
    didParseCell: (data: any) => {
      handleBilingualCell(data);
      // Color-code final MOY /20 column
      if (data.section === 'body' && data.column.index === moyCol) {
        const val = parseFloat(data.cell.text?.[0]);
        if (!isNaN(val)) {
          data.cell.styles.textColor = val >= 10 ? [0, 128, 0] : [200, 0, 0];
        }
      }
      // Blue tint on all MOY.COEF subject columns
      if (data.section === 'body' && data.column.index >= subjectStartCol &&
          data.column.index < moyCol) {
        data.cell.styles.fillColor = [235, 245, 255];
        data.cell.styles.textColor = [30, 64, 175];
      }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 6;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Check page overflow for summary sections
  if (currentY + 60 > pageHeight) {
    doc.addPage();
    currentY = 15;
  }

  // 1. STATISTICAL SUMMARY BOX (RÉSUMÉ STATISTIQUE)
  const classAvg = validAvgStudentsCount > 0 ? (totalClassAvgSum / validAvgStudentsCount).toFixed(2) : "0.00";
  const successRate = students.length > 0 ? ((admisCount / students.length) * 100).toFixed(1) : "0.0";

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("📊 RÉSUMÉ STATISTIQUE DE LA CLASSE", 10, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [["Effectif Total", "Admis(es)", "Redoublants", "Exclus / Ajournés", "Taux de Réussite", "Moyenne Générale Classe"]],
    body: [[
      `${students.length} Élèves`,
      `${admisCount} (${successRate}%)`,
      `${redoubleCount}`,
      `${excluCount}`,
      `${successRate} %`,
      `${classAvg} / 20`
    ]],
    theme: "grid",
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 10, fontStyle: "bold", halign: "center" },
    styles: { fontSize: 11, cellPadding: 2, halign: "center", fontStyle: "bold" },
    tableWidth: USABLE_WIDTH,
    margin: { left: 10, right: 10 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;
  if (currentY + 50 > pageHeight) {
    doc.addPage();
    currentY = 15;
  }

  // 2. SUBJECTS ANALYSIS TABLE (RÉCAPITULATIF & ANALYSE DES MATIÈRES)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("📚 RÉCAPITULATIF ET ANALYSE DES MATIÈRES", 10, currentY);

  const subjectAnalysisHead = [["Code", "Nom de la Matière", "Coef", "MOY.COEF Classe", "Meilleur MOY.COEF", "Plus Faible MOY.COEF", "Total Points", "Taux Réussite (>=10)"]];
  const subjectAnalysisBody = Object.values(subjectStats).map((st) => {
    const scs = st.scores;
    const coef = st.coef || 1;
    if (scs.length === 0) {
      return [st.code, st.name, String(coef), "-", "-", "-", "-", "-"];
    }
    // MOY.COEF = Moyenne de la matière × Coefficient
    const moyCoefScores = scs.map(s => s * coef);
    const avgMoyCoef   = (moyCoefScores.reduce((a, b) => a + b, 0) / moyCoefScores.length).toFixed(2);
    const maxMoyCoef   = Math.max(...moyCoefScores).toFixed(2);
    const minMoyCoef   = Math.min(...moyCoefScores).toFixed(2);
    const totalPoints  = moyCoefScores.reduce((a, b) => a + b, 0).toFixed(2);
    const passCount    = scs.filter(s => s >= 10.0).length;
    const passRate     = ((passCount / scs.length) * 100).toFixed(1);

    return [st.code, st.name, String(coef), avgMoyCoef, maxMoyCoef, minMoyCoef, totalPoints, `${passRate} %`];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: subjectAnalysisHead,
    body: subjectAnalysisBody,
    theme: "grid",
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9, fontStyle: "bold", halign: "center" },
    styles: { fontSize: 10, fontStyle: "bold", cellPadding: 1.5, halign: "center" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 22, halign: "center" },
      1: { fontStyle: "bold", halign: "left", cellWidth: 60 },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 30, halign: "center", textColor: [30, 64, 175] },
      4: { cellWidth: 30, halign: "center", textColor: [0, 128, 0] },
      5: { cellWidth: 30, halign: "center", textColor: [200, 0, 0] },
      6: { cellWidth: 28, halign: "center" },
      7: { cellWidth: 28, halign: "center" }
    },
    tableWidth: USABLE_WIDTH,
    margin: { left: 10, right: 10 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;
  if (currentY + 25 > pageHeight) {
    doc.addPage();
    currentY = 20;
  }

  // Official Footer & Signatures
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Le Directeur des Études", 45, currentY, { align: "center" });
  doc.text("Le Président du Conseil de Classe", 235, currentY, { align: "center" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text("Signature : _______________________", 45, currentY + 10, { align: "center" });
  doc.text("Cachet : _______________________", 45, currentY + 16, { align: "center" });

  doc.text("Signature : _______________________", 235, currentY + 10, { align: "center" });
  doc.text("Cachet : _______________________", 235, currentY + 16, { align: "center" });

  // Add Dynamic Page Numbers (Page X / Y)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i} / ${totalPages}`, 285, pageHeight - 6, { align: "right" });
    doc.text(`Document Académique Officiel — Edut-Pro`, 10, pageHeight - 6, { align: "left" });
  }

  const classInfoName = (classNameStr || "Classe").replace(/\s+/g, "_");
  doc.save(`PV_Resultats_Officiel_${classInfoName}_${Date.now()}.pdf`);
}


export async function generateResultsPedagogicalReportPDF(payload: any) {
  const doc = new jsPDF({ orientation: "landscape" });
  const { matrixData, students = [], filters, headerConfig, isOffline } = payload || {};
  const rows = Array.isArray(matrixData?.students) && matrixData.students.length ? matrixData.students : students;
  const subjects = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];

  if (amiriFontBase64) {
    try {
      doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
    } catch (e) {
      console.warn("Error registering Amiri font for results report:", e);
    }
  }

  const getAverage = (row: any) => Number(row?.average ?? row?.moyenne ?? row?.weighted ?? row?.total ?? row?.totalScore ?? 0) || 0;
  const getName = (row: any) => row?.studentName || row?.name || row?.nomEtudiant || row?.student?.nomEtudiant || "Eleve";
  const averages = rows.map(getAverage).filter((value: number) => value > 0);
  const evaluated = averages.length;
  const passed = averages.filter((value: number) => value >= 10).length;
  const failed = Math.max(evaluated - passed, 0);
  const classAverage = evaluated ? averages.reduce((sum: number, value: number) => sum + value, 0) / evaluated : 0;
  const successRate = evaluated ? (passed / evaluated) * 100 : 0;
  const best = averages.length ? Math.max(...averages) : 0;

  doc.setFont("helvetica", "normal");
  const headerY = drawPDFHeader(doc, headerConfig, {}, (filters?.level || "").toUpperCase(), filters?.sessionName || filters?.sessionId || "");
  const titleY = Math.max(headerY + 8, 42);

  doc.setFillColor(238, 242, 255);
  doc.roundedRect(12, titleY - 7, 273, 12, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(49, 46, 129);
  doc.text("RAPPORT PEDAGOGIQUE DES NOTES ET RESULTATS", 148, titleY, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Classe: ${filters?.className || filters?.classId || "-"}   |   Periode: ${filters?.period || "-"}   |   Date: ${new Date().toLocaleDateString("fr-FR")}`, 148, titleY + 8, { align: "center" });

  const statsY = titleY + 18;
  const stats = [
    ["Eleves charges", String(rows.length)],
    ["Eleves evalues", String(evaluated)],
    ["Moyenne classe", `${classAverage.toFixed(2)}/20`],
    ["Taux de reussite", `${successRate.toFixed(2)}%`],
    ["Admis", String(passed)],
    ["Non admis", String(failed)],
    ["Meilleure moyenne", `${best.toFixed(2)}/20`],
  ];

  autoTable(doc, {
    startY: statsY,
    head: [stats.map((item) => item[0])],
    body: [stats.map((item) => item[1])],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, halign: "center", fontStyle: "bold" },
    bodyStyles: { halign: "center", fontStyle: "bold", textColor: [15, 23, 42] },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 12, right: 12 },
  });

  const distribution = [
    ["Excellent", ">= 16", averages.filter((value: number) => value >= 16).length],
    ["Bien", "14 - 15,99", averages.filter((value: number) => value >= 14 && value < 16).length],
    ["Assez bien", "12 - 13,99", averages.filter((value: number) => value >= 12 && value < 14).length],
    ["Passable", "10 - 11,99", averages.filter((value: number) => value >= 10 && value < 12).length],
    ["Insuffisant", "< 10", averages.filter((value: number) => value > 0 && value < 10).length],
  ].map((row: any[]) => [row[0], row[1], row[2], evaluated ? `${((row[2] / evaluated) * 100).toFixed(2)}%` : "0%"]);

  const topStudents = [...rows]
    .filter((row: any) => getAverage(row) > 0)
    .sort((a: any, b: any) => getAverage(b) - getAverage(a))
    .slice(0, 10)
    .map((row: any, index: number) => [index + 1, getName(row), `${getAverage(row).toFixed(2)}/20`, getAverage(row) >= 10 ? "Admis" : "A remedier"]);

  const weakStudents = [...rows]
    .filter((row: any) => getAverage(row) > 0 && getAverage(row) < 10)
    .sort((a: any, b: any) => getAverage(a) - getAverage(b))
    .slice(0, 10)
    .map((row: any, index: number) => [index + 1, getName(row), `${getAverage(row).toFixed(2)}/20`, "Suivi pedagogique"]);

  const firstTableY = (doc as any).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: firstTableY,
    head: [["Mention", "Intervalle", "Nombre", "Pourcentage"]],
    body: distribution,
    theme: "striped",
    tableWidth: 130,
    margin: { left: 12 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  autoTable(doc, {
    startY: firstTableY,
    head: [["Rang", "Eleve", "Moyenne", "Decision"]],
    body: topStudents.length ? topStudents : [["-", "Aucune donnee", "-", "-"]],
    theme: "grid",
    tableWidth: 132,
    margin: { left: 153 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { halign: "center", cellWidth: 16 }, 2: { halign: "center", cellWidth: 24 } },
  });

  const secondTableY = Math.max((doc as any).lastAutoTable.finalY + 8, 126);
  autoTable(doc, {
    startY: secondTableY,
    head: [["N", "Eleves a accompagner", "Moyenne", "Action recommandee"]],
    body: weakStudents.length ? weakStudents : [["-", "Aucun eleve sous 10/20", "-", "Maintenir le suivi"]],
    theme: "grid",
    tableWidth: 130,
    margin: { left: 12 },
    headStyles: { fillColor: [225, 29, 72], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  const subjectStats = subjects.map((subject: any) => {
    const values = rows
      .map((row: any) => {
        const result = row?.results?.[subject.id] || row?.results?.[subject.subjectId] || row?.results?.[subject.subjectName];
        return Number(result?.moy ?? result?.average ?? result?.total ?? result?.weightedScore ?? 0) || 0;
      })
      .filter((value: number) => value > 0);
    const average = values.length ? values.reduce((sum: number, value: number) => sum + value, 0) / values.length : 0;
    const subjectPassed = values.filter((value: number) => value >= 10).length;
    return [
      subject.subjectName || subject.name || "Matiere",
      values.length,
      `${average.toFixed(2)}/20`,
      values.length ? `${((subjectPassed / values.length) * 100).toFixed(2)}%` : "0%",
      average < 10 ? "Remediation recommandee" : "Niveau acceptable",
    ];
  });

  autoTable(doc, {
    startY: secondTableY,
    head: [["Matiere", "Copies", "Moyenne", "Reussite", "Observation"]],
    body: subjectStats.length ? subjectStats : [["Analyse indisponible", "-", "-", "-", "Chargez le broadsheet"]],
    theme: "striped",
    tableWidth: 132,
    margin: { left: 153 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(203, 213, 225);
  doc.line(12, pageHeight - 16, 285, pageHeight - 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Signature du professeur principal", 40, pageHeight - 8, { align: "center" });
  doc.text("Visa de la direction", 148, pageHeight - 8, { align: "center" });
  doc.text("Cachet de l'etablissement", 252, pageHeight - 8, { align: "center" });

  if (isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.roundedRect(93, pageHeight - 28, 112, 7, 1.5, 1.5, "F");
    doc.text("DOCUMENT GENERE HORS LIGNE - SYNCHRONISATION EN ATTENTE", 149, pageHeight - 23.2, { align: "center" });
    drawOfflineWatermark(doc, "BULLETIN PROVISOIRE");
  }

  const pageCount = (doc as any).internal.getNumberOfPages?.() || 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i}/${pageCount}`, 285, 204, { align: "right" });
  }

  const filterClassName = (filters?.className || "Classe").replace(/\s+/g, "_");
  doc.save(`Rapport_Pedagogique_${filterClassName}_${Date.now()}.pdf`);
}

export async function generateReleveNotesPDF(data: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { student, session, term, results, summary, resultsS1, resultsS2, resultsS3, resultsS4, resultsS5, resultsS6, summaryS1, summaryS2, summaryS3, summaryS4, summaryS5, summaryS6, branchInfo, headerConfig } = data;

  if (amiriFontBase64) {
    try {
      doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      console.log("[Amiri debug] Amiri registered directly on doc instance in generateReleveNotesPDF");
    } catch (e) {
      console.warn("[Amiri debug] Failed to register Amiri directly in generateReleveNotesPDF:", e);
    }
  }

  // --- 1. HEADER SECTION ---
  const headerEndY = drawPDFHeader(doc, headerConfig, branchInfo, (student?.educationalLevel || "Université").toUpperCase(), session);

  // --- 2. TITLE BAR ---
  // Background logo watermark - Expanded to cover page center behind tables
  const logoUrl = headerConfig?.centerLogo || headerConfig?.leftLogo || headerConfig?.rightLogo || branchInfo?.logoPath;
  if (logoUrl) {
    try {
      const logoWatermark = await fetchTransparentLogoBase64(logoUrl, 0.10);
      if (logoWatermark) {
        doc.addImage(logoWatermark, 'PNG', 30, 70, 150, 150);
      }
    } catch (e) {
      console.warn("Failed to load watermark for releve:", e);
    }
  }

  const titleBarY = headerEndY + 3.5;
  const studentInfoY = titleBarY + 11;
  const s1SectionY = studentInfoY + 15;
  const s1TitleY = studentInfoY + 19;
  const table1StartY = studentInfoY + 22;

  doc.setFillColor(210, 230, 210);
  doc.rect(10, titleBarY, 190, 7, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 50, 0);
  doc.text("RELEVE DE NOTES", 105, titleBarY + 5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // --- 3. STUDENT INFO ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Etudiant:", 10, studentInfoY);
  doc.text("Matricule:", 10, studentInfoY + 4.5);
  doc.text("Parcours:", 10, studentInfoY + 9);
  
  doc.setFont("helvetica", "bold");
  drawTextBilingual(doc, student?.nomEtudiant || student?.name || "ADIATULLAHI RABIU AHMAD Nigeria", 30, studentInfoY);
  drawTextBilingual(doc, student?.numAdmission || student?.matricule || "20 D 004", 30, studentInfoY + 4.5);
  drawTextBilingual(doc, student?.classe || student?.className || "Première année de licence en Shari'a and Law", 30, studentInfoY + 9);

  // --- 4. DETERMINE SEMESTER PAIR ---
  const isDoctorate = student?.educationalLevel?.toLowerCase().includes("doc") || student?.classe?.toLowerCase().includes("doc") || term?.toLowerCase().includes("ann") || term?.toLowerCase().includes("annee");
  
  let firstSemesterName = isDoctorate ? "ANNEE 1" : "SEMESTRE 1";
  let secondSemesterName = isDoctorate ? "ANNEE 2" : "SEMESTRE 2";
  let activeResults1 = (resultsS1 && resultsS1.length > 0) ? resultsS1 : results;
  let activeResults2 = resultsS2;
  let activeSummary1 = summaryS1;
  let activeSummary2 = summaryS2;
  let suffix1 = "1";
  let suffix2 = "2";

  if (term?.toLowerCase().includes("3") || term?.toLowerCase().includes("4") || term === "F3" || term === "F4") {
    firstSemesterName = isDoctorate ? "ANNEE 3" : "SEMESTRE 3";
    secondSemesterName = isDoctorate ? "ANNEE 4" : "SEMESTRE 4";
    activeResults1 = resultsS3;
    activeResults2 = resultsS4;
    activeSummary1 = summaryS3;
    activeSummary2 = summaryS4;
    suffix1 = "3";
    suffix2 = "4";
  } else if (term?.toLowerCase().includes("5") || term?.toLowerCase().includes("6") || term === "F5" || term === "F6") {
    firstSemesterName = isDoctorate ? "ANNEE 5" : "SEMESTRE 5";
    secondSemesterName = isDoctorate ? "ANNEE 6" : "SEMESTRE 6";
    activeResults1 = resultsS5;
    activeResults2 = resultsS6;
    activeSummary1 = summaryS5;
    activeSummary2 = summaryS6;
    suffix1 = "5";
    suffix2 = "6";
  } else {
    firstSemesterName = isDoctorate ? "ANNEE 1" : "SEMESTRE 1";
    secondSemesterName = isDoctorate ? "ANNEE 2" : "SEMESTRE 2";
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Première session`, 10, s1SectionY);
  doc.text(`${session || "2022/2023"}`, 40, s1SectionY);
  
  doc.setFontSize(12);
  doc.text(firstSemesterName, 105, s1TitleY, { align: "center" });

  const buildTableRows = (resList: any[], sfx: string) => {
    return resList.map((r: any) => {
      const cwRaw = r.classWorkScore;
      const exRaw = r.examScore;
      const hasCw = cwRaw !== null && cwRaw !== undefined && cwRaw !== "";
      const hasEx = exRaw !== null && exRaw !== undefined && exRaw !== "";
      const cw  = hasCw ? (parseFloat(cwRaw) || 0) : 0;
      const ex  = hasEx ? (parseFloat(exRaw) || 0) : 0;
      const coef = parseFloat(r.coefficient) || 1;
      let avg: number;
      if (hasCw && hasEx) avg = (cw + ex) / 2;
      else if (hasCw)     avg = cw;
      else if (hasEx)     avg = ex;
      else avg = parseFloat(r.totalScore) || parseFloat(r.average) || 0;
      const code = (r.subject?.subjectName || r.subjectName || "SUBJ").substring(0, 4).toUpperCase() + ` ${sfx}`;
      const mention = r.appreciation || (
        avg >= 16 ? "Excellent" : avg >= 14 ? "Très bien" :
        avg >= 12 ? "Bien" : avg >= 10 ? "Assez bien" : "Ajourné"
      );
      return { code, name: r.subject?.subjectName || r.subjectName || "Matière", coef, avg, mention };
    });
  };

  const computeTotals = (rows: any[]) => {
    const totalCoef   = rows.reduce((s, r) => s + r.coef, 0);
    const totalPoints = rows.reduce((s, r) => s + r.avg * r.coef, 0);
    const average     = totalCoef > 0 ? totalPoints / totalCoef : 0;
    return { totalCoef, totalPoints, average };
  };

  const getDecision = (avg: number, savedDecision?: string): string => {
    if (savedDecision) return savedDecision;
    if (avg >= 16) return "Admis avec la mention Très Bien";
    if (avg >= 14) return "Admis avec la mention Bien";
    if (avg >= 12) return "Admis avec la mention Assez Bien";
    if (avg >= 10) return "Admis avec la mention Passable";
    return "Ajourné";
  };

  const hasRealS1   = activeResults1 && activeResults1.length > 0;
  const rows1       = hasRealS1 ? buildTableRows(activeResults1, suffix1) : [];
  const { totalCoef: tc1, totalPoints: tp1, average: avg1 } = computeTotals(rows1);
  // Always use fresh computed average from raw data; only fall back to saved if no raw results
  const usedAvg1    = hasRealS1 ? avg1 : (activeSummary1?.average ?? 0);
  const decision1   = getDecision(usedAvg1, activeSummary1?.decision);

  const bodyData1 = rows1.map(r => [
    r.code,
    r.name,
    r.coef.toString(),
    r.avg.toFixed(2),
    r.mention
  ]);

  autoTable(doc, {
    startY: table1StartY,
    head: [["Code", "Matières", "Crédits", "Notes/20", "Mention"]],
    body: bodyData1.length > 0 ? bodyData1 : [["—", "Aucune note saisie pour ce semestre", "—", "—", "—"]],
    foot: [
      [
        { content: "TOTAL", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS1 ? tc1.toString() : "—", styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS1 ? tp1.toFixed(2) : "—", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "Moyenne Semestrielle", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS1 ? usedAvg1.toFixed(2) : "—", colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "DECISION DU JURY", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS1 ? decision1 : "—", colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ]
    ],
    theme: "grid",
    headStyles: { textColor: 0, fontStyle: "bold", lineWidth: 0.15, lineColor: 0, fillColor: [210, 230, 210] },
    bodyStyles: { textColor: 0, lineWidth: 0.15, lineColor: 0 },
    footStyles: { textColor: 0, lineWidth: 0.15, lineColor: 0 },
    styles: { fontSize: 9.5, cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 } },
    columnStyles: {
      0: { fontStyle: "bold", halign: "center", cellWidth: 28 },
      1: { cellWidth: 82 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 26 },
      4: { halign: "center", cellWidth: 32 }
    },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        data.cell.styles.fillColor = false;
        if (data.column.index === 3 && data.cell.text?.[0]) {
          const val = parseFloat(data.cell.text[0]);
          if (!isNaN(val)) {
            if (val >= 16)       data.cell.styles.textColor = [0, 128, 0];
            else if (val >= 10)  data.cell.styles.textColor = [0, 0, 150];
            else                 data.cell.styles.textColor = [200, 0, 0];
          }
        }
      }
    },
    margin: { left: 10, right: 10 }
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(secondSemesterName, 105, finalY1, { align: "center" });

  const hasRealS2   = activeResults2 && activeResults2.length > 0;
  const rows2       = hasRealS2 ? buildTableRows(activeResults2, suffix2) : [];
  const { totalCoef: tc2, totalPoints: tp2, average: avg2 } = computeTotals(rows2);
  // Always use fresh computed average from raw data; only fall back to saved if no raw results
  const usedAvg2    = hasRealS2 ? avg2 : (activeSummary2?.average ?? 0);
  const decision2   = getDecision(usedAvg2, activeSummary2?.decision);

  const bodyData2 = rows2.map(r => [
    r.code,
    r.name,
    r.coef.toString(),
    r.avg.toFixed(2),
    r.mention
  ]);

  autoTable(doc, {
    startY: finalY1 + 3,
    head: [["Code", "Matières", "Crédits", "Notes/20", "Mention"]],
    body: bodyData2.length > 0 ? bodyData2 : [["—", "Aucune note saisie pour ce semestre", "—", "—", "—"]],
    foot: [
      [
        { content: "TOTAL", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS2 ? tc2.toString() : "—", styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS2 ? tp2.toFixed(2) : "—", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "Moyenne Semestrielle", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS2 ? usedAvg2.toFixed(2) : "—", colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "DECISION DU JURY", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: hasRealS2 ? decision2 : "—", colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ]
    ],
    theme: "grid",
    headStyles: { textColor: 0, fontStyle: "bold", lineWidth: 0.15, lineColor: 0, fillColor: [210, 230, 210] },
    bodyStyles: { textColor: 0, lineWidth: 0.15, lineColor: 0 },
    footStyles: { textColor: 0, lineWidth: 0.15, lineColor: 0 },
    styles: { fontSize: 9.5, cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 } },
    columnStyles: {
      0: { fontStyle: "bold", halign: "center", cellWidth: 28 },
      1: { cellWidth: 82 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 26 },
      4: { halign: "center", cellWidth: 32 }
    },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        data.cell.styles.fillColor = false;
        if (data.column.index === 3 && data.cell.text?.[0]) {
          const val = parseFloat(data.cell.text[0]);
          if (!isNaN(val)) {
            if (val >= 16)       data.cell.styles.textColor = [0, 128, 0];
            else if (val >= 10)  data.cell.styles.textColor = [0, 0, 150];
            else                 data.cell.styles.textColor = [200, 0, 0];
          }
        }
      }
    },
    margin: { left: 10, right: 10 }
  });

  const finalY2 = (doc as any).lastAutoTable.finalY + 8;

  // --- 6. SIGNATURE ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Le Doyen", 105, finalY2, { align: "center" });

  // --- 7. FOOTER NOTE ---
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Il ne sera pas délivré de duplicata de ce relevé. Il vous appartient d'en faire des copies et de les faire certifier conformes.", 105, pageHeight - 5, { align: "center" });

  // Draw QR Code in top right position
  try {
    const qrData = `RELEVE: ${student?.nomEtudiant || student?.name || "N/A"} | MATRICULE: ${student?.numAdmission || student?.matricule || "N/A"} | DECISION: ${hasRealS2 ? decision2 : "—"} | ANNEE: ${session || "2024-2025"}`;
    const qrBase64 = await fetchQRCodeBase64(qrData);
    if (qrBase64) {
      doc.addImage(qrBase64, 'PNG', 175, studentInfoY - 4, 18, 18);
    }
  } catch (e) {
    console.warn("Failed to load QR code for Releve:", e);
  }

  if (data.isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    doc.saveGraphicsState();
    doc.setFillColor(254, 243, 199); // light amber background
    doc.setDrawColor(245, 158, 11);   // amber border
    doc.setLineWidth(0.5);
    doc.roundedRect(10, doc.internal.pageSize.getHeight() - 15, 190, 8, 1, 1, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);     // dark amber text
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, doc.internal.pageSize.getHeight() - 9.5, { align: "center" });
    doc.restoreGraphicsState();
    drawOfflineWatermark(doc, "RELEVÉ PROVISOIRE");
  }

  const studentName = (student?.nomEtudiant || student?.name || "Eleve").replace(/\s+/g, "_");
  doc.save(`Releve_Notes_${studentName}_${Date.now()}.pdf`);
}

export async function generateClassReportPDF(payload: any) {
  const doc = new jsPDF();
  const { matrixData, students = [], filters, headerConfig, isOffline } = payload || {};
  const rows = Array.isArray(matrixData?.students) && matrixData.students.length ? matrixData.students : students;
  const subjects = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];

  const getAverage = (row: any) => Number(row?.average ?? row?.moyenne ?? row?.weighted ?? row?.total ?? row?.totalScore ?? 0) || 0;
  const getName = (row: any) => row?.studentName || row?.name || row?.nomEtudiant || row?.student?.nomEtudiant || "Élève";
  
  const averages = rows.map(getAverage).filter((v: number) => v > 0);
  const evaluated = averages.length;
  const passed = averages.filter((v: number) => v >= 10).length;
  const failed = evaluated - passed;
  const classAvg = evaluated ? averages.reduce((sum: number, v: number) => sum + v, 0) / evaluated : 0;
  const successRate = evaluated ? (passed / evaluated) * 100 : 0;

  const headerEndY = drawPDFHeader(doc, headerConfig, {}, (filters?.level || "Lycée").toUpperCase(), filters?.sessionName || "");
  const startY = Math.max(headerEndY + 8, 45);

  // Title
  doc.setFillColor(79, 70, 229);
  doc.rect(10, startY, 190, 8, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`RAPPORT DE CLASSE - ${filters?.className || "CLASSE"}`, 105, startY + 5.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // Summary Table
  autoTable(doc, {
    startY: startY + 12,
    head: [["Élèves évalues", "Moyenne Générale", "Taux de Réussite", "Taux d'Échec", "Admis", "Ajournés"]],
    body: [[
      evaluated.toString(),
      `${classAvg.toFixed(2)}/20`,
      `${successRate.toFixed(2)}%`,
      `${(100 - successRate).toFixed(2)}%`,
      passed.toString(),
      failed.toString()
    ]],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: 255, halign: "center", fontSize: 8 },
    bodyStyles: { halign: "center", fontStyle: "bold", fontSize: 9 }
  });

  // Students Table
  const tableRows = [...rows]
    .sort((a, b) => getAverage(b) - getAverage(a))
    .map((row, idx) => [
      (idx + 1).toString(),
      row.matricule || row.numAdmission || "—",
      getName(row),
      row.sexe || "—",
      `${getAverage(row).toFixed(2)}/20`,
      getAverage(row) >= 10 ? "Admis" : "Ajourné"
    ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Rang", "Matricule", "Nom de l'élève", "Genre", "Moyenne", "Décision"]],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8 }
  });

  if (isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, pageHeight - 10, { align: "center" });
    drawOfflineWatermark(doc, "RAPPORT PROVISOIRE");
  }

  const filterClassName = (filters?.className || "Classe").replace(/\s+/g, "_");
  doc.save(`Rapport_Statistique_Classe_${filterClassName}_${Date.now()}.pdf`);
}

export async function generateSubjectReportPDF(payload: any) {
  const doc = new jsPDF();
  const { matrixData, students = [], filters, headerConfig, isOffline } = payload || {};
  const rows = Array.isArray(matrixData?.students) && matrixData.students.length ? matrixData.students : students;
  const subjects = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];
  
  const currentSubjectId = filters?.subjectId;
  const currentSubject = subjects.find((s: any) => s.id === currentSubjectId || s.subjectId === currentSubjectId) || { subjectName: "Matière" };
  const getSubjectScore = (row: any) => {
    const res = row?.results?.[currentSubjectId];
    return res ? Number(res.total || res.totalScore || res.moy || 0) : 0;
  };
  const getName = (row: any) => row?.studentName || row?.name || row?.nomEtudiant || row?.student?.nomEtudiant || "Élève";
  
  const scores = rows.map(getSubjectScore).filter((v: number) => v > 0);
  const evaluated = scores.length;
  const passed = scores.filter((v: number) => v >= 10).length;
  const subjectAvg = evaluated ? scores.reduce((sum: number, v: number) => sum + v, 0) / evaluated : 0;
  const successRate = evaluated ? (passed / evaluated) * 100 : 0;

  const headerEndY = drawPDFHeader(doc, headerConfig, {}, (filters?.level || "Lycée").toUpperCase(), filters?.sessionName || "");
  const startY = Math.max(headerEndY + 8, 45);

  doc.setFillColor(16, 185, 129);
  doc.rect(10, startY, 190, 8, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`RAPPORT PAR MATIÈRE - ${currentSubject.subjectName.toUpperCase()}`, 105, startY + 5.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: startY + 12,
    head: [["Matière", "Enseignant", "Élèves évalués", "Moyenne Matière", "Taux de Réussite"]],
    body: [[
      currentSubject.subjectName,
      currentSubject.teacherName || "—",
      evaluated.toString(),
      `${subjectAvg.toFixed(2)}/20`,
      `${successRate.toFixed(2)}%`
    ]],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], halign: "center" },
    bodyStyles: { halign: "center", fontStyle: "bold" }
  });

  const tableRows = [...rows]
    .sort((a, b) => getSubjectScore(b) - getSubjectScore(a))
    .map((row, idx) => [
      (idx + 1).toString(),
      row.matricule || row.numAdmission || "—",
      getName(row),
      `${getSubjectScore(row).toFixed(2)}/20`,
      getSubjectScore(row) >= 10 ? "Acquis" : "Non acquis"
    ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Rang", "Matricule", "Nom de l'élève", "Note obtenue", "Statut"]],
    body: tableRows,
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] },
    styles: { fontSize: 8 }
  });

  if (isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, pageHeight - 10, { align: "center" });
    drawOfflineWatermark(doc, "RAPPORT PROVISOIRE");
  }

  const subjectName = (currentSubject?.subjectName || "Matiere").replace(/\s+/g, "_");
  doc.save(`Rapport_Par_Matiere_${subjectName}_${Date.now()}.pdf`);
}

export async function generateTeacherReportPDF(payload: any) {
  const doc = new jsPDF();
  const { matrixData, students = [], filters, headerConfig, isOffline } = payload || {};
  const rows = Array.isArray(matrixData?.students) && matrixData.students.length ? matrixData.students : students;
  const subjects = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];

  // Group by teacher name
  const teacherStatsMap = new Map<string, { subjectNames: string[], totalStudents: number, scoreSum: number, count: number }>();
  subjects.forEach((subj: any) => {
    const tName = subj.teacherName || "Non affecté";
    const scores = rows.map((r: any) => {
      const res = r?.results?.[subj.id];
      return res ? Number(res.total || res.totalScore || res.moy || 0) : 0;
    }).filter((v: number) => v > 0);
    
    if (scores.length > 0) {
      const sum = scores.reduce((a: number, b: number) => a + b, 0);
      if (!teacherStatsMap.has(tName)) {
        teacherStatsMap.set(tName, { subjectNames: [], totalStudents: 0, scoreSum: 0, count: 0 });
      }
      const data = teacherStatsMap.get(tName)!;
      data.subjectNames.push(subj.subjectName);
      data.totalStudents += scores.length;
      data.scoreSum += sum;
      data.count += scores.length;
    }
  });

  const headerEndY = drawPDFHeader(doc, headerConfig, {}, (filters?.level || "Lycée").toUpperCase(), filters?.sessionName || "");
  const startY = Math.max(headerEndY + 8, 45);

  doc.setFillColor(245, 158, 11);
  doc.rect(10, startY, 190, 8, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`RAPPORT DE PERFORMANCE DES ENSEIGNANTS`, 105, startY + 5.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  const tableRows: any[] = [];
  teacherStatsMap.forEach((val, key) => {
    const avg = val.count > 0 ? val.scoreSum / val.count : 0;
    tableRows.push([
      key,
      val.subjectNames.join(", "),
      val.totalStudents.toString(),
      `${avg.toFixed(2)}/20`,
      avg >= 10 ? "Objectifs Pédagogiques Atteints" : "Soutien Recommandé"
    ]);
  });

  autoTable(doc, {
    startY: startY + 12,
    head: [["Nom de l'Enseignant", "Matières enseignées", "Élèves évalués", "Moyenne Générale", "Diagnostic"]],
    body: tableRows.length ? tableRows : [["Non disponible", "—", "—", "—", "—"]],
    theme: "striped",
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 8 }
  });

  if (isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, pageHeight - 10, { align: "center" });
    drawOfflineWatermark(doc, "RAPPORT PROVISOIRE");
  }

  const teacherName = (filters?.teacherName || "Enseignant").replace(/\s+/g, "_");
  doc.save(`Rapport_Enseignant_${teacherName}_${Date.now()}.pdf`);
}

export async function generateWeakStudentsReportPDF(payload: any) {
  const doc = new jsPDF();
  const { matrixData, students = [], filters, headerConfig, isOffline } = payload || {};
  const rows = Array.isArray(matrixData?.students) && matrixData.students.length ? matrixData.students : students;
  const subjects = Array.isArray(matrixData?.subjects) ? matrixData.subjects : [];

  const getAverage = (row: any) => Number(row?.average ?? row?.moyenne ?? row?.weighted ?? row?.total ?? row?.totalScore ?? 0) || 0;
  const getName = (row: any) => row?.studentName || row?.name || row?.nomEtudiant || row?.student?.nomEtudiant || "Élève";

  // Filter students with average < 10
  const weakList = [...rows]
    .filter(r => getAverage(r) > 0 && getAverage(r) < 10)
    .sort((a, b) => getAverage(a) - getAverage(b));

  const headerEndY = drawPDFHeader(doc, headerConfig, {}, (filters?.level || "Lycée").toUpperCase(), filters?.sessionName || "");
  const startY = Math.max(headerEndY + 8, 45);

  doc.setFillColor(225, 29, 72);
  doc.rect(10, startY, 190, 8, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`RAPPORT DES ÉLÈVES EN DIFFICULTÉ - ${filters?.className || "CLASSE"}`, 105, startY + 5.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  const tableRows = weakList.map((row: any, idx: number) => {
    // Find weak subjects for this student
    const weakSubjs: string[] = [];
    subjects.forEach((subj: any) => {
      const res = row?.results?.[subj.id];
      const score = res ? Number(res.total || res.totalScore || res.moy || 0) : 0;
      if (score > 0 && score < 10) {
        weakSubjs.push(subj.subjectName);
      }
    });

    return [
      (idx + 1).toString(),
      row.matricule || row.numAdmission || "—",
      getName(row),
      `${getAverage(row).toFixed(2)}/20`,
      weakSubjs.length > 0 ? weakSubjs.join(", ") : "Général",
      "Plan de soutien à activer"
    ];
  });

  autoTable(doc, {
    startY: startY + 12,
    head: [["N°", "Matricule", "Nom de l'élève", "Moyenne", "Matières à renforcer", "Action Recommandée"]],
    body: tableRows.length ? tableRows : [["—", "—", "Aucun élève en difficulté détecté", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: [225, 29, 72] },
    styles: { fontSize: 8 }
  });

  if (isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, pageHeight - 10, { align: "center" });
    drawOfflineWatermark(doc, "RAPPORT PROVISOIRE");
  }

  const filterClassName = (filters?.className || "Classe").replace(/\s+/g, "_");
  doc.save(`Rapport_Eleves_En_Difficulte_${filterClassName}_${Date.now()}.pdf`);
}

export async function generateClassCouncilReportPDF(payload: any) {
  const doc = new jsPDF();
  const { matrixData, students = [], filters, headerConfig, isOffline } = payload || {};
  const rows = Array.isArray(matrixData?.students) && matrixData.students.length ? matrixData.students : students;

  const getAverage = (row: any) => Number(row?.average ?? row?.moyenne ?? row?.weighted ?? row?.total ?? row?.totalScore ?? 0) || 0;
  const getName = (row: any) => row?.studentName || row?.name || row?.nomEtudiant || row?.student?.nomEtudiant || "Élève";

  const averages = rows.map(getAverage).filter((v: number) => v > 0);
  const total = averages.length;
  const felicitations = rows.filter((r: any) => getAverage(r) >= 16).map(getName);
  const tableauHonneur = rows.filter((r: any) => getAverage(r) >= 14 && getAverage(r) < 16).map(getName);
  const encouragements = rows.filter((r: any) => getAverage(r) >= 12 && getAverage(r) < 14).map(getName);
  const warnings = rows.filter((r: any) => getAverage(r) < 10).map(getName);

  const headerEndY = drawPDFHeader(doc, headerConfig, {}, (filters?.level || "Lycée").toUpperCase(), filters?.sessionName || "");
  const startY = Math.max(headerEndY + 8, 45);

  doc.setFillColor(79, 70, 229);
  doc.rect(10, startY, 190, 8, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(`PROCES VERBAL DU CONSEIL DE CLASSE - ${filters?.className || "CLASSE"}`, 105, startY + 5.5, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // Statistics Summary
  autoTable(doc, {
    startY: startY + 12,
    head: [["Nombre total d'élèves", "Félicitations (>=16)", "Tableau d'Honneur (>=14)", "Encouragements (>=12)", "Mises en garde (<10)"]],
    body: [[
      total.toString(),
      felicitations.length.toString(),
      tableauHonneur.length.toString(),
      encouragements.length.toString(),
      warnings.length.toString()
    ]],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], halign: "center" },
    bodyStyles: { halign: "center", fontStyle: "bold" }
  });

  // Details Table
  const bodyData = [
    ["Félicitations", felicitations.length > 0 ? felicitations.join(", ") : "Aucun"],
    ["Tableau d'Honneur", tableauHonneur.length > 0 ? tableauHonneur.join(", ") : "Aucun"],
    ["Encouragements", encouragements.length > 0 ? encouragements.join(", ") : "Aucun"],
    ["Mises en garde / Difficultés", warnings.length > 0 ? warnings.join(", ") : "Aucun"]
  ];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [["Distinction / Catégorie", "Liste des élèves"]],
    body: bodyData,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" }, 1: { cellWidth: 140 } },
    styles: { fontSize: 8.5 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Le Professeur Principal", 40, finalY, { align: "center" });
  doc.text("Le Proviseur / Directeur", 150, finalY, { align: "center" });

  if (isOffline || (typeof navigator !== "undefined" && !navigator.onLine)) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, pageHeight - 10, { align: "center" });
    drawOfflineWatermark(doc, "PROVISOIRE - HORS LIGNE");
  }

  const filterClassName = (filters?.className || "Classe").replace(/\s+/g, "_");
  doc.save(`Rapport_Conseil_Classe_${filterClassName}_${Date.now()}.pdf`);
}

/**
 * Generate Official Annual Summary Report PDF (Landscape with all 11 columns)
 */
export function generateOfficialAnnualReportPDF(data: {
  className: string;
  sessionName?: string;
  students: any[];
  headerConfig?: any;
  isHigherEd?: boolean;
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  ensureAmiriRegistered(doc);

  const cfg = data.headerConfig || {};
  const country = cfg.country || cfg.countryName || "RÉPUBLIQUE DU NIGER";
  const motto = cfg.motto || "Unité - Travail - Progrès";
  const defaultMinistry = data.isHigherEd ? "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE" : "MINISTÈRE DE L'ÉDUCATION NATIONALE";
  const ministry = cfg.ministry || cfg.ministryName || defaultMinistry;
  const regionalDir = cfg.regionalDirection || cfg.region || "";
  const schoolName = cfg.schoolName || cfg.school?.name || "ÉCOLE GESTION PRO";
  const logo = cfg.leftLogo || cfg.rightLogo || cfg.centerLogo || cfg.logoUrl;

  let startY = 32;

  // Render official header logo & info if headerConfig available
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 12, 8, 22, 22);
    } catch (e) {}
  }

  // Left Block (Country / Ministry / Region)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(country.toUpperCase(), logo ? 38 : 12, 12);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text(motto, logo ? 38 : 12, 15);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(ministry, logo ? 38 : 12, 19);
  if (regionalDir) doc.text(regionalDir, logo ? 38 : 12, 23);

  // Right Block (School Name & Session)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(schoolName, 285, 12, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Année Scolaire: ${data.sessionName || "2025-2026"}`, 285, 17, { align: "right" });
  doc.text(`Document Officiel Annuel`, 285, 21, { align: "right" });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(10, 26, 287, 26);

  // Main Report Title
  const isHigherEd = data.isHigherEd ?? false;
  const docTitle = isHigherEd ? `RAPPORT RÉCAPITULATIF ANNUEL D'ÉVALUATION (LMD)` : `RAPPORT RÉCAPITULATIF OFFICIEL ANNUEL`;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, 148.5, 32, { align: "center" });

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Classe: ${data.className || "N/A"}  |  Effectif: ${data.students.length} Élèves`, 148.5, 37, { align: "center" });

  startY = 42;

  const clsUpper = (data.className || "").toUpperCase();
  let s1Label = isHigherEd ? "Moyenne\nS1" : "Moyenne\n1er Sem.";
  let r1Label = isHigherEd ? "Rang\nS1" : "Rang\n1er Sem.";
  let s2Label = isHigherEd ? "Moyenne\nS2" : "Moyenne\n2ème Sem.";
  let r2Label = isHigherEd ? "Rang\nS2" : "Rang\n2ème Sem.";

  if (isHigherEd) {
    if (clsUpper.includes("L2") || clsUpper.includes("LICENCE 2") || clsUpper.includes("L-2")) {
      s1Label = "Moyenne\nS3"; r1Label = "Rang\nS3"; s2Label = "Moyenne\nS4"; r2Label = "Rang\nS4";
    } else if (clsUpper.includes("L3") || clsUpper.includes("LICENCE 3") || clsUpper.includes("L-3")) {
      s1Label = "Moyenne\nS5"; r1Label = "Rang\nS5"; s2Label = "Moyenne\nS6"; r2Label = "Rang\nS6";
    } else if (clsUpper.includes("M2") || clsUpper.includes("MASTER 2") || clsUpper.includes("M-2")) {
      s1Label = "Moyenne\nS9"; r1Label = "Rang\nS9"; s2Label = "Moyenne\nS10"; r2Label = "Rang\nS10";
    }
  }

  // Table Data
  const head = [[
    "N°",
    "Noms et Prénoms",
    "Date et lieu de naissance",
    "Matricule",
    "Sexe",
    s1Label,
    r1Label,
    s2Label,
    r2Label,
    "Moyenne\nAnnuelle",
    "Décision du\nConseil",
    "Affectation /\nClasse",
    "Allocataire"
  ]];

  const computeNextClassStrPdf = (currentCls?: string, explicitTarget?: string) => {
    if (explicitTarget && explicitTarget.trim()) return explicitTarget.trim();
    if (!currentCls) return "Passage en Classe Supérieure";
    const cls = currentCls.trim();
    const u = cls.toUpperCase();

    if (u.includes("6ÈME") || u.includes("6EME") || u.includes("6E")) return cls.replace(/6è?m?e?/i, "Passage en 5ème");
    if (u.includes("5ÈME") || u.includes("5EME") || u.includes("5E")) return cls.replace(/5è?m?e?/i, "Passage en 4ème");
    if (u.includes("4ÈME") || u.includes("4EME") || u.includes("4E")) return cls.replace(/4è?m?e?/i, "Passage en 3ème");
    if (u.includes("3ÈME") || u.includes("3EME") || u.includes("3E")) return cls.replace(/3è?m?e?/i, "Passage en 2nde");
    if (u.includes("2NDE") || u.includes("2ND")) return cls.replace(/2nde?/i, "Passage en 1ère");
    if (u.includes("1ÈRE") || u.includes("1ERE") || u.includes("1ER")) return cls.replace(/1è?r?e?/i, "Passage en Tle");

    if (u.includes("CI")) return cls.replace(/CI/i, "Passage en CP");
    if (u.includes("CP")) return cls.replace(/CP/i, "Passage en CE1");
    if (u.includes("CE1")) return cls.replace(/CE1/i, "Passage en CE2");
    if (u.includes("CE2")) return cls.replace(/CE2/i, "Passage en CM1");
    if (u.includes("CM1")) return cls.replace(/CM1/i, "Passage en CM2");

    if (u.includes("L1")) return cls.replace(/L1/i, "Passage en L2");
    if (u.includes("L2")) return cls.replace(/L2/i, "Passage en L3");
    if (u.includes("M1")) return cls.replace(/M1/i, "Passage en M2");

    return `Passage en ${cls}`;
  };

  const body = data.students.map((student: any, idx: number) => {
    const dob = student.dateNaissance || student.dateOfBirth || student.birthDate || "-";
    const pob = student.lieuNaissance || student.placeOfBirth || "-";
    const dateAndPlace = `${dob} à ${pob}`;

    const s1Summary = student.summaryS1 || student.history?.find((h: any) => {
      if (!h.term) return false;
      const norm = String(h.term).toLowerCase();
      return norm.includes("1") || norm.includes("première") || norm.includes("s1");
    });
    const s2Summary = student.summaryS2 || student.history?.find((h: any) => {
      if (!h.term) return false;
      const norm = String(h.term).toLowerCase();
      return norm.includes("2") || norm.includes("deuxième") || norm.includes("s2");
    });

    const formatAvgPdf = (v: any) => {
      if (v === null || v === undefined || v === "" || v === "-") return "-";
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return !isNaN(n) ? n.toFixed(2) : "-";
    };

    const formatRankPdf = (v: any) => {
      if (!v || v === "-" || v === "N/A") return "-";
      return String(v);
    };

    const s1Avg = formatAvgPdf(s1Summary?.average ?? student.s1Average);
    const s1Rank = formatRankPdf(s1Summary?.rank ?? student.s1Rank);

    const s2Avg = formatAvgPdf(s2Summary?.average ?? student.s2Average);
    const s2Rank = formatRankPdf(s2Summary?.rank ?? student.s2Rank);

    const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
    const annualAvgNum = typeof student.annualAverage === 'number' ? student.annualAverage : safeAvg;
    const annualAvgStr = annualAvgNum.toFixed(2);

    const decisionStr = student.decision || (annualAvgNum >= 10 ? "ADMIS(E) EN CLASSE SUPÉRIEURE ✅" : annualAvgNum >= 8 ? "AUTORISÉ(E) À REDOUBLER ❌" : "EXCLU(E) ⛔");
    const isRedouble = decisionStr.includes("REDOUBLE");
    const currentClassStr = data.className || student.classe || "";
    const targetClassStr = student.targetClassName || (isRedouble ? `Redouble en ${currentClassStr}` : computeNextClassStrPdf(currentClassStr));

    const allocataire = student.allocataire || (student.isScholarship ? "Boursier" : "Non Boursier") || "Non";

    return [
      idx + 1,
      student.name || student.studentName || "Élève",
      dateAndPlace,
      student.matricule || "-",
      student.sexe || student.gender || "M",
      s1Avg,
      s1Rank,
      s2Avg,
      s2Rank,
      annualAvgStr,
      decisionStr.replace(/[✅❌⛔]/g, '').trim(),
      targetClassStr,
      allocataire
    ];
  });

  autoTable(doc, {
    startY: startY,
    head: head,
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
      valign: "middle"
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.5,
      valign: "middle",
      overflow: "linebreak"
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 40, fontStyle: "bold" },
      2: { cellWidth: 38 },
      3: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 16, halign: "center" },
      6: { cellWidth: 12, halign: "center" },
      7: { cellWidth: 16, halign: "center" },
      8: { cellWidth: 12, halign: "center" },
      9: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      10: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      11: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      12: { cellWidth: 18, halign: "center" }
    },
    didParseCell: handleBilingualCell
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (finalY + 20 < pageHeight) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Le Chef d'Établissement / Directeur", 50, finalY, { align: "center" });
    doc.text("Le Président du Conseil de Classe / Inspection", 230, finalY, { align: "center" });
  }

  if (isOffline) {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 148.5, pageHeight - 8, { align: "center" });
  }

  const cleanClassName = (data.className || "Classe").replace(/\s+/g, "_");
  doc.save(`Rapport_Annuel_Officiel_${cleanClassName}_${Date.now()}.pdf`);
}

// ─── University LMD Official PV Generator ──────────────────────────────────

export function generateOfficialUniversityPV(data: {
  className: string;
  sessionName: string;
  students: any[];
  headerConfig?: any;
  juryPresident?: string;
  juryMembers?: string[];
  isOffline?: boolean;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const isOffline = data.isOffline ?? false;

  const headerConfig = data.headerConfig || {};
  const schoolName = headerConfig.schoolName || "ÉCOLE SUPÉRIEURE / UNIVERSITÉ";
  const country = headerConfig.country || headerConfig.countryName || "RÉPUBLIQUE DU NIGER";
  const motto = headerConfig.motto || "Unité - Travail - Progrès";
  const ministry = headerConfig.ministry || headerConfig.ministryName || "MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE";

  let startY = 12;

  // University Header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(country.toUpperCase(), 14, startY);
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text(motto, 14, startY + 4);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(ministry.toUpperCase(), 14, startY + 8);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138);
  doc.text(schoolName.toUpperCase(), 285, startY + 2, { align: "right" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Année Académique: ${data.sessionName || "2025-2026"}`, 285, startY + 7, { align: "right" });
  doc.text(`Session: Principale (Mdaolation)`, 285, startY + 11, { align: "right" });

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(10, startY + 14, 287, startY + 14);

  // Main PV Title Box
  doc.setFillColor(241, 245, 249);
  doc.rect(10, startY + 17, 277, 12, "F");
  
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("PROCES-VERBAL DÉFINITIF DES RÉSULTATS D'ÉVALUATION (LMD)", 148.5, startY + 23, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Filière / Parcours: ${data.className || "Licence"}  |  Effectif du Jury: ${data.students.length} Étudiants`, 148.5, startY + 27, { align: "center" });

  // Table Columns for University LMD PV
  const head = [[
    "N°",
    "Matricule",
    "Noms et Prénoms",
    "Date & Lieu de Naissance",
    "Sexe",
    "Crédits\nECTS",
    "Moyenne\nS1 / S3",
    "Moyenne\nS2 / S4",
    "Moyenne\nGénérale",
    "Décision du Jury\nLMD",
    "Mention\nUniversitaire"
  ]];

  let admisCount = 0;
  let ajourneCount = 0;

  const body = data.students.map((student: any, idx: number) => {
    const dob = student.dateNaissance || student.dateOfBirth || student.birthDate || "-";
    const pob = student.lieuNaissance || student.placeOfBirth || "-";
    const dateAndPlace = `${dob} à ${pob}`;

    const s1Summary = student.summaryS1 || student.history?.find((h: any) => h.term && String(h.term).toLowerCase().includes("1"));
    const s2Summary = student.summaryS2 || student.history?.find((h: any) => h.term && String(h.term).toLowerCase().includes("2"));

    const formatAvg = (v: any) => {
      if (v === null || v === undefined || v === "" || v === "-") return "-";
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return !isNaN(n) ? n.toFixed(2) : "-";
    };

    const s1Avg = formatAvg(s1Summary?.average ?? student.s1Average);
    const s2Avg = formatAvg(s2Summary?.average ?? student.s2Average);

    const safeAvg = typeof student.average === 'number' && !isNaN(student.average) ? student.average : 0;
    const annualAvg = typeof student.annualAverage === 'number' ? student.annualAverage : safeAvg;
    const annualAvgStr = annualAvg.toFixed(2);

    let decision = "AJOURNÉ (NV)";
    let mention = "-";
    const ects = annualAvg >= 10.0 ? "60 / 60 ECTS" : "30 / 60 ECTS";

    if (annualAvg >= 10.0) {
      admisCount++;
      decision = "ADMIS (V)";
      if (annualAvg >= 16.0) mention = "Très Bien";
      else if (annualAvg >= 14.0) mention = "Bien";
      else if (annualAvg >= 12.0) mention = "Assez Bien";
      else mention = "Passable";
    } else {
      ajourneCount++;
      decision = "AJOURNÉ (NV)";
      mention = "Ajourné";
    }

    return [
      idx + 1,
      student.matricule || "-",
      student.name || student.studentName || "Étudiant",
      dateAndPlace,
      student.sexe || student.gender || "M",
      ects,
      s1Avg,
      s2Avg,
      annualAvgStr,
      decision,
      mention
    ];
  });

  autoTable(doc, {
    startY: startY + 32,
    head: head,
    body: body,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      fontSize: 7
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 55, fontStyle: "bold" },
      3: { cellWidth: 45 },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 22, halign: "center", fontStyle: "bold" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 22, halign: "center" },
      8: { cellWidth: 22, halign: "center", fontStyle: "bold" },
      9: { cellWidth: 24, halign: "center", fontStyle: "bold" },
      10: { cellWidth: 15, halign: "center" }
    },
    didParseCell: handleBilingualCell
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (finalY + 30 < pageHeight) {
    // Jury Statistics Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, finalY, 277, 10, "FD");

    const totalStudents = data.students.length;
    const rate = totalStudents > 0 ? ((admisCount / totalStudents) * 100).toFixed(1) : "0.0";

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`RÉSUMÉ DES DÉLIBÉRATIONS DU JURY :   Effectif Total: ${totalStudents}  |  Admis (V): ${admisCount}  |  Ajournés (NV): ${ajourneCount}  |  Taux de Réussite: ${rate}%`, 14, finalY + 6);

    // Jury Signatures
    const sigY = finalY + 18;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Les Membres du Jury de Délibération", 50, sigY, { align: "center" });
    doc.text("Le Président du Jury de Délibération", 230, sigY, { align: "center" });
    
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("(Noms, Titres & Signatures)", 50, sigY + 4, { align: "center" });
    doc.text("(Nom, Sceau & Signature)", 230, sigY + 4, { align: "center" });
  }

  if (isOffline) {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ PV GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 148.5, pageHeight - 8, { align: "center" });
  }

  const cleanClassName = (data.className || "Parcours").replace(/\s+/g, "_");
  doc.save(`PV_Resultats_LMD_${cleanClassName}_${Date.now()}.pdf`);
}
