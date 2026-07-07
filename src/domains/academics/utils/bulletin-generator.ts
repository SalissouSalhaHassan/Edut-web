import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

function drawTextBilingual(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  if (hasArabicCharacters(text)) {
    if (!amiriFontBase64) {
      doc.setFontSize(8);
      doc.setTextColor(255, 0, 0);
      doc.text("ERR: amiriFontBase64 empty!", x, y - 4);
      doc.setTextColor(0, 0, 0);
      doc.text(text, x, y, options);
      return;
    }
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
      doc.setFontSize(8);
      doc.setTextColor(255, 0, 0);
      doc.text(`ERR: ${e?.message || String(e)}`, x, y - 4);
      doc.setTextColor(0, 0, 0);
      doc.text(text, x, y, options);
    }
  } else {
    doc.text(text, x, y, options);
  }
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
    drawTextBilingual(doc, schoolName, 38, 17);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 225, 255);
    drawTextBilingual(doc, `Année Scolaire: ${schoolYear} | Niveau: ${eduLevel}`, 38, 23);
    drawTextBilingual(doc, `${address} ${phone ? '| Tél: ' + phone : ''}`, 38, 28);
    
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

    let leftY = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    for (const line of leftLines) {
      drawTextBilingual(doc, line, 10, leftY);
      leftY += 4.5;
    }
    
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

    let rightY = 12;
    for (const line of rightLines) {
      drawTextBilingual(doc, line, 200, rightY, { align: "right" });
      rightY += 4.5;
    }
    
    const maxY = Math.max(leftY, rightY);
    doc.setLineWidth(0.5);
    doc.line(10, maxY + 2, 200, maxY + 2);
    return maxY + 4;
  }
  
  if (style === "university_formal") {
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', 10, 8, 22, 22);
      } catch (e) {}
    }
    if (rightLogo) {
      try {
        doc.addImage(rightLogo, 'PNG', 178, 8, 22, 22);
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

    let centerY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    drawTextBilingual(doc, centerLines[0].toUpperCase(), 105, centerY, { align: "center" });
    
    doc.setFontSize(12);
    centerY += 5;
    drawTextBilingual(doc, centerLines[1], 105, centerY, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    for (let i = 2; i < centerLines.length; i++) {
      centerY += 4.5;
      drawTextBilingual(doc, centerLines[i], 105, centerY, { align: "center" });
    }
    
    const finalY = Math.max(centerY + 3, 32);
    doc.setLineWidth(0.5);
    doc.line(10, finalY, 200, finalY);
    return finalY + 2;
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
    drawTextBilingual(doc, leftLines[0], 10, leftY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (let i = 1; i < leftLines.length; i++) {
      leftY += 4.5;
      drawTextBilingual(doc, leftLines[i], 10, leftY);
    }
    
    const finalY = Math.max(leftY + 3, 32);
    doc.setLineWidth(0.3);
    doc.line(10, finalY, 200, finalY);
    return finalY + 2;
  }
  
  if (leftLogo) {
    try {
      doc.addImage(leftLogo, 'PNG', 10, 8, 22, 22);
    } catch (e) {}
  }
  if (rightLogo && rightLogo !== leftLogo) {
    try {
      doc.addImage(rightLogo, 'PNG', 178, 8, 22, 22);
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

  let centerY = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  drawTextBilingual(doc, centerLines[0], 105, centerY, { align: "center" });

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < centerLines.length; i++) {
    centerY += 4.5;
    if (i === 1 && motto) {
      doc.setFont("helvetica", "italic");
      drawTextBilingual(doc, centerLines[i], 105, centerY, { align: "center" });
      doc.setFont("helvetica", "normal");
    } else {
      drawTextBilingual(doc, centerLines[i], 105, centerY, { align: "center" });
    }
  }
  
  const finalY = Math.max(centerY + 3, 32);
  doc.setLineWidth(0.5);
  doc.line(10, finalY, 200, finalY);
  return finalY + 2;
}

export async function generateBulletinPDF(data: any) {
  const doc = new jsPDF();
  const { student, session, term, results, summary, summaryS1, summaryS2, totalStudents, branchInfo, headerConfig } = data;
  
  if (amiriFontBase64) {
    try {
      doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
    } catch (e) {
      console.warn("Error registering Amiri font for bulletin:", e);
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

  // Background logo watermark
  if (branchInfo?.logoPath) {
    try {
      const logoWatermark = await fetchTransparentLogoBase64(branchInfo.logoPath, 0.05);
      if (logoWatermark) {
        doc.addImage(logoWatermark, 'PNG', 55, 110, 100, 100);
      }
    } catch (e) {
      console.warn("Failed to load watermark for bulletin:", e);
    }
  }

  const titleY = headerEndY + 10;
  const infoBoxY = headerEndY + 15;
  const textRow1Y = infoBoxY + 7;
  const textRow2Y = infoBoxY + 14;
  const textRow3Y = infoBoxY + 21;
  const tableY = infoBoxY + 30;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bolditalic");
  doc.text(`${mainTitle} - ${safeTerm}`, 105, titleY, { align: "center" });

  // Student Info Box
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(10, infoBoxY, 190, 22);
  
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
    doc.addImage(qrBase64, 'PNG', 178, infoBoxY + 2, 18, 18);
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
      { content: "Conduite", colSpan: 4, styles: { halign: "left", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: "1", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: summary?.conduite || student?.conduite || "-", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: "", colSpan: 3, styles: { fillColor: [255, 255, 255] } }
    ],
    [
      { content: "Total", colSpan: 4, styles: { halign: "left", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: totalCoef.toFixed(2), styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: totalWeighted.toFixed(2), styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: "", colSpan: 3, styles: { fillColor: [255, 255, 255] } }
    ],
    [
      { content: `Moy. du ${safeTerm}`, colSpan: 5, styles: { halign: "left", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: displayAverage.toFixed(2), styles: { halign: "center", fontStyle: "bold", fillColor: [240, 240, 240] } },
      { content: "", colSpan: 3, styles: { fillColor: [255, 255, 255] } }
    ],
    [
      { content: "Moy. Annuelle", colSpan: 5, styles: { halign: "left", fontStyle: "bold", fillColor: [255, 255, 255] } },
      { content: displayAnnualAvg || "-", styles: { halign: "center", fontStyle: "bold", fillColor: [240, 240, 240] } },
      { content: "", colSpan: 3, styles: { fillColor: [255, 255, 255] } }
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
    margin: { left: 10, right: 10 }
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 3;

  // 1. Table: Moyenne Générale sur 20
  autoTable(doc, {
    startY: finalY1,
    head: [
      [{ content: "Moyenne Générale sur 20", colSpan: 6, styles: { halign: "center", fontStyle: "bold", fillColor: [230, 230, 230], textColor: 0 } }],
      [
        { content: "1er Semestre", colSpan: 2, styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245], textColor: 0 } },
        { content: "2ème Semestre", colSpan: 2, styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245], textColor: 0 } },
        { content: "Moyenne Annuelle", colSpan: 2, styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245], textColor: 0 } }
      ],
      [
        { content: "Moyenne", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } },
        { content: "Rang", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } },
        { content: "Moyenne", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } },
        { content: "Rang", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } },
        { content: "Moyenne", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } },
        { content: "Rang", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } }
      ]
    ],
    body: [
      [
        { content: displayAvgS1, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayRankS1, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayAvgS2, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayRankS2, styles: { halign: "center", fontStyle: "bold", fillColor: isS2Active ? [255, 255, 0] : [255, 255, 255] } },
        { content: displayAnnualAvg, styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245] } },
        { content: displayAnnualRank, styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245] } }
      ]
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1, lineColor: 0, lineWidth: 0.1, textColor: 0 },
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
      [{ content: "Appréciation", colSpan: 3, styles: { halign: "center", fontStyle: "bold", fillColor: [230, 230, 230], textColor: 0 } }],
      [
        { content: "Travail", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } },
        { content: "Conduite", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } },
        { content: "Assiduité/Retard", styles: { halign: "center", fontStyle: "bold", fillColor: [255, 255, 255], textColor: 0 } }
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
    margin: { left: 10, right: 10 }
  });

  // 3. Table: Résultat annuel & Signatures
  const finalY3 = (doc as any).lastAutoTable.finalY + 3;
  autoTable(doc, {
    startY: finalY3,
    body: [
      [
        { content: "Résultat annuel", colSpan: 2, styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245] } },
        { content: "Appréciation et signature du proviseur", styles: { halign: "center", fontStyle: "bold", fillColor: [245, 245, 245] } }
      ],
      [
        { content: "Proposé pour", rowSpan: 3, styles: { halign: "center", valign: "middle", fontStyle: "bold" } },
        { content: "Passage en", styles: { fontStyle: "bold" } },
        { content: summary?.observation || "", rowSpan: 3, styles: { halign: "center", valign: "middle", fontStyle: "italic", fontSize: 10, textColor: [63, 81, 181] } }
      ],
      [{ content: "Redoublement", styles: { fontStyle: "bold" } }],
      [{ content: "Exclusion", styles: { fontStyle: "bold" } }],
      [
        { content: summary?.decision || "", colSpan: 2, styles: { halign: "center", fontStyle: "bold", fontSize: 11, textColor: [63, 81, 181] } },
        { content: "VISA DES PARENTS", styles: { halign: "center", fontStyle: "bold", valign: "bottom", minCellHeight: 18 } }
      ]
    ],
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 1.2, lineColor: 0, lineWidth: 0.1, textColor: 0 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 50 }
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

  // Open in new window for preview
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export async function generatePVMatrixPDF(matrixData: any, classInfo: any, filters: any) {
  const doc = new jsPDF({ orientation: "landscape" });
  const { students, subjects } = matrixData || {};
  const safePeriod = String(filters?.period || "Periode").toUpperCase();
  const toDisplayNumber = (value: any, digits = 1) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(digits) : "-";
  };
  const readResultTotal = (result: any) => {
    if (!result) return null;
    return result.total ?? result.totalScore ?? result.moy ?? result.average ?? result.weightedScore ?? result.note ?? null;
  };

  doc.setFontSize(16);
  doc.text(`PROCES VERBAL DES RESULTATS - ${classInfo?.className || "CLASSE"}`, 148, 15, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Periode: ${safePeriod} | Session: ${filters?.sessionName || ""}`, 148, 22, { align: "center" });

  const headers = ["Matricule", "Nom de l'eleve", ...(subjects || []).map((s: any) => s.subjectName || s.name || "Matiere"), "Moyenne", "Rang", "Decision"];
  
  const body = (students || []).map((s: any) => [
    s.matricule || s.numAdmission || "-",
    s.name || s.studentName || s.nomEtudiant || "-",
    ...(subjects || []).map((subj: any) => {
      const resultMap = s.results || {};
      const res = resultMap[subj.id] || resultMap[subj.subjectId] || resultMap[subj.subjectName] || resultMap[subj.name];
      return toDisplayNumber(readResultTotal(res), 1);
    }),
    toDisplayNumber(s.average ?? s.moyenne ?? s.weighted ?? s.total, 2),
    s.rank || "-",
    s.decision || (Number(s.average ?? s.moyenne ?? 0) >= 10 ? "Admis" : "A remedier")
  ]);

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: body,
    theme: "grid",
    headStyles: { fillColor: [44, 62, 80], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 1 },
    columnStyles: {
      1: { cellWidth: 40 },
      [headers.length - 3]: { fontStyle: "bold" }
    }
  });

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
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

  if (isOffline) {
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.roundedRect(93, pageHeight - 28, 112, 7, 1.5, 1.5, "F");
    doc.text("DOCUMENT GENERE HORS LIGNE - SYNCHRONISATION EN ATTENTE", 149, pageHeight - 23.2, { align: "center" });
  }

  const pageCount = (doc as any).internal.getNumberOfPages?.() || 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i}/${pageCount}`, 285, 204, { align: "right" });
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export async function generateReleveNotesPDF(data: any) {
  const doc = new jsPDF();
  const { student, session, term, results, summary, resultsS1, resultsS2, resultsS3, resultsS4, resultsS5, resultsS6, summaryS1, summaryS2, summaryS3, summaryS4, summaryS5, summaryS6, branchInfo, headerConfig } = data;

  if (amiriFontBase64) {
    try {
      doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
    } catch (e) {
      console.warn("Error registering Amiri font for releve:", e);
    }
  }

  // --- 1. HEADER SECTION ---
  const headerEndY = drawPDFHeader(doc, headerConfig, branchInfo, (student?.educationalLevel || "Université").toUpperCase(), session);

  // --- 2. TITLE BAR ---
  // Background logo watermark
  if (branchInfo?.logoPath) {
    try {
      const logoWatermark = await fetchTransparentLogoBase64(branchInfo.logoPath, 0.05);
      if (logoWatermark) {
        doc.addImage(logoWatermark, 'PNG', 55, 110, 100, 100);
      }
    } catch (e) {
      console.warn("Failed to load watermark for releve:", e);
    }
  }

  const titleBarY = headerEndY + 5;
  const studentInfoY = titleBarY + 14;
  const s1SectionY = studentInfoY + 18;
  const s1TitleY = studentInfoY + 23;
  const table1StartY = studentInfoY + 25;

  doc.setFillColor(210, 230, 210);
  doc.rect(10, titleBarY, 190, 8, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 50, 0);
  doc.text("RELEVE DE NOTES", 105, titleBarY + 6, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // --- 3. STUDENT INFO ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Etudiant:", 10, studentInfoY);
  doc.text("Matricule:", 10, studentInfoY + 5);
  doc.text("Parcours:", 10, studentInfoY + 10);
  
  doc.setFont("helvetica", "bold");
  drawTextBilingual(doc, student?.nomEtudiant || student?.name || "ADIATULLAHI RABIU AHMAD Nigeria", 30, studentInfoY);
  drawTextBilingual(doc, student?.numAdmission || student?.matricule || "20 D 004", 30, studentInfoY + 5);
  drawTextBilingual(doc, student?.classe || student?.className || "Première année de licence en Shari'a and Law", 30, studentInfoY + 10);

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(175, studentInfoY - 4, 18, 18);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("QR Code", 178, studentInfoY + 5);

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

  // --- 5. SEMESTRE 1 SECTION ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Première session`, 10, s1SectionY);
  doc.text(`${session || "2022/2023"}`, 40, s1SectionY);
  
  doc.setFontSize(11);
  doc.text(firstSemesterName, 105, s1TitleY, { align: "center" });

  const defaultS1List = [
    ["INTR 1", "Introduction au droit 1", "3", "16.00", "T.bien"],
    ["HIST 1", "Historique du droit 1", "3", "16.00", "T.bien"],
    ["INTR 1", "Introduction au droit islamique 1", "2", "12.00", "A.bien"],
    ["HIST 1", "Historique du droit islamique 1", "2", "18.00", "Exllent"],
    ["OBJE 1", "Objectifs de la Sharia 1", "2", "14.00", "Bien"],
    ["HIST 1", "Histoire de la législation 1", "3", "16.00", "T.bien"],
    ["DÉVE 1", "Développement de la pensée législative 1", "3", "16.00", "T.bien"],
    ["HIST 1", "Histoire de la législation islamique 1", "2", "13.00", "A.bien"],
    ["LÉGI 1", "Législation dans l'ère prophétique 1", "2", "10.00", "Passable"],
    ["FOND 1", "Fondement de la Charia islamique 1", "2", "18.00", "Exllent"],
    ["INFO 1", "Informatique 1", "2", "14.00", "Bien"],
    ["TECH 1", "Technique expression française 1", "2", "16.00", "T.bien"],
    ["TECH 1", "Technique expression anglaise 1", "2", "17.00", "T.bien"]
  ];

  const hasRealS1 = activeResults1 && activeResults1.length > 0;
  const tableData1 = hasRealS1 ? activeResults1.map((r: any) => {
    const total = parseFloat(r.examScore) || parseFloat(r.totalScore) || 0;
    const coef = parseFloat(r.coefficient) || 1;
    const code = (r.subject?.subjectName || r.subjectName || "SUBJ").substring(0, 4).toUpperCase() + ` ${suffix1}`;
    return [code, r.subject?.subjectName || r.subjectName || "Matière", coef.toString(), total.toFixed(2), r.appreciation || "Passable"];
  }) : defaultS1List.map(row => {
    const code = row[0].replace("1", suffix1);
    const subject = row[1].replace("1", suffix1);
    return [code, subject, row[2], row[3], row[4]];
  });

  const totalCredits1 = tableData1.reduce((acc: number, r: any) => acc + parseFloat(r[2]), 0);
  const totalNotes1 = tableData1.reduce((acc: number, r: any) => acc + (parseFloat(r[3]) * parseFloat(r[2])), 0);
  const average1 = activeSummary1?.average || (totalCredits1 > 0 ? (totalNotes1 / totalCredits1) : 0);
  let decision1 = activeSummary1?.decision || "Admis avec la mention Bien";
  if (!activeSummary1?.decision) {
    if (average1 < 10) decision1 = "Ajourné";
    else if (average1 >= 16) decision1 = "Admis avec la mention Très Bien";
  }

  autoTable(doc, {
    startY: table1StartY,
    head: [["Code", "Matières", "Crédits", "Notes/20", "Mention"]],
    body: tableData1,
    foot: [
      [
        { content: "TOTAL", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: totalCredits1.toString(), styles: { halign: "center", fontStyle: "bold" } },
        { content: totalNotes1.toFixed(2), colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "Moyenne Semestrielle", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: average1.toFixed(2), colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "DECISION DU JURY", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: decision1, colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ]
    ],
    theme: "grid",
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", lineWidth: 0.5, lineColor: 0 },
    bodyStyles: { textColor: 0, lineWidth: 0.5, lineColor: 0 },
    footStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, lineColor: 0 },
    styles: { fontSize: 8, cellPadding: { top: 0.5, bottom: 0.5, left: 1, right: 1 } },
    columnStyles: {
      0: { fontStyle: "bold", halign: "center", cellWidth: 30 },
      1: { cellWidth: 80 },
      2: { halign: "center", cellWidth: 25 },
      3: { halign: "center", cellWidth: 25 },
      4: { halign: "center", cellWidth: 30 }
    },
    margin: { left: 10, right: 10 }
  });

  const finalY1 = (doc as any).lastAutoTable.finalY + 5;

  // --- 6. SEMESTRE 2 SECTION ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(secondSemesterName, 105, finalY1, { align: "center" });

  const defaultS2List = [
    ["TECH 2", "Technique expression française 2", "2", "#N/A", "#N/A"],
    ["TECH 2", "Technique expression anglaise 2", "2", "#N/A", "#N/A"],
    ["OBJE 2", "Objectifs de la Sharia 2", "2", "#N/A", "#N/A"],
    ["LÉGI 2", "Législation dans l'ère prophétique 2", "2", "#N/A", "#N/A"],
    ["INTR 2", "Introduction au droit 2", "3", "#N/A", "#N/A"],
    ["INTR 2", "Introduction au droit islamique 2", "2", "#N/A", "#N/A"],
    ["INFO 2", "Informatique 2", "2", "#N/A", "#N/A"],
    ["HIST 2", "Historique du droit 2", "3", "#N/A", "#N/A"],
    ["HIST 2", "Historique du droit islamique 2", "2", "#N/A", "#N/A"],
    ["HIST 2", "Histoire de la législation 2", "3", "#N/A", "#N/A"],
    ["HIST 2", "Histoire de la législation islamique 2", "2", "#N/A", "#N/A"],
    ["FOND 2", "Fondement de la Charia islamique 2", "2", "#N/A", "#N/A"],
    ["DÉVE 2", "Développement de la pensée législative 2", "3", "#N/A", "#N/A"]
  ];

  const hasRealS2 = activeResults2 && activeResults2.length > 0;
  const tableData2 = hasRealS2 ? activeResults2.map((r: any) => {
    const total = parseFloat(r.examScore) || parseFloat(r.totalScore) || 0;
    const coef = parseFloat(r.coefficient) || 1;
    const code = (r.subject?.subjectName || r.subjectName || "SUBJ").substring(0, 4).toUpperCase() + ` ${suffix2}`;
    return [code, r.subject?.subjectName || r.subjectName || "Matière", coef.toString(), total.toFixed(2), r.appreciation || "Passable"];
  }) : defaultS2List.map(row => {
    const code = row[0].replace("2", suffix2);
    const subject = row[1].replace("2", suffix2);
    return [code, subject, row[2], row[3], row[4]];
  });

  const totalCredits2 = hasRealS2 ? tableData2.reduce((acc: number, r: any) => acc + parseFloat(r[2]), 0) : 30;
  const totalNotes2 = hasRealS2 ? tableData2.reduce((acc: number, r: any) => acc + (parseFloat(r[3]) * parseFloat(r[2])), 0) : 0;
  const average2 = activeSummary2?.average || (hasRealS2 && totalCredits2 > 0 ? (totalNotes2 / totalCredits2) : 0);
  
  let decision2 = activeSummary2?.decision || "Admis avec la mention Bien";
  if (!activeSummary2?.decision) {
    if (average2 < 10) decision2 = "Ajourné";
    else if (average2 >= 16) decision2 = "Admis avec la mention Très Bien";
  }

  const displayTotalNotes2 = hasRealS2 ? totalNotes2.toFixed(2) : "#N/A";
  const displayAverage2 = hasRealS2 ? average2.toFixed(2) : "#N/A";
  const displayDecision2 = hasRealS2 ? decision2 : "Admis avec la mention #N/A";

  autoTable(doc, {
    startY: finalY1 + 2,
    head: [["Code", "Matières", "Crédits", "Notes/20", "Mention"]],
    body: tableData2,
    foot: [
      [
        { content: "TOTAL", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: totalCredits2.toString(), styles: { halign: "center", fontStyle: "bold" } },
        { content: displayTotalNotes2, colSpan: 2, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "Moyenne Semestrielle", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayAverage2, colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ],
      [
        { content: "DECISION DU JURY", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
        { content: displayDecision2, colSpan: 3, styles: { halign: "center", fontStyle: "bold" } }
      ]
    ],
    theme: "grid",
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", lineWidth: 0.5, lineColor: 0 },
    bodyStyles: { textColor: 0, lineWidth: 0.5, lineColor: 0 },
    footStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.5, lineColor: 0 },
    styles: { fontSize: 8, cellPadding: { top: 0.5, bottom: 0.5, left: 1, right: 1 } },
    columnStyles: {
      0: { fontStyle: "bold", halign: "center", cellWidth: 30 },
      1: { cellWidth: 80 },
      2: { halign: "center", cellWidth: 25 },
      3: { halign: "center", cellWidth: 25 },
      4: { halign: "center", cellWidth: 30 }
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

  // Draw QR Code
  try {
    const qrData = `RELEVE: ${student?.nomEtudiant || student?.name || "N/A"} | MATRICULE: ${student?.numAdmission || student?.matricule || "N/A"} | DECISION: ${displayDecision2} | ANNEE: ${session || "2024-2025"}`;
    const qrBase64 = await fetchQRCodeBase64(qrData);
    if (qrBase64) {
      doc.addImage(qrBase64, 'PNG', 170, finalY2 - 10, 25, 25);
    }
  } catch (e) {
    console.warn("Failed to load QR code for Releve:", e);
  }

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

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
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

  if (isOffline) {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(254, 243, 199);
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.text("⚠️ DOCUMENT GÉNÉRÉ HORS LIGNE - EN ATTENTE DE SYNCHRONISATION", 105, pageHeight - 10, { align: "center" });
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
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

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
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

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
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

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
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

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
