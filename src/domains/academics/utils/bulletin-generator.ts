import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export async function generateBulletinPDF(data: any) {
  const doc = new jsPDF();
  const { student, session, term, results, summary, totalStudents, branchInfo } = data;
  const safeTerm = (term || "Semestre").toUpperCase();
  const eduLevel = (student?.educationalLevel || "Lycée").toUpperCase();
  
  // Title mapping based on level
  let mainTitle = "BULLETIN DE NOTES";
  if (eduLevel.includes("PRIMAIRE")) mainTitle = "CARNET DE NOTES";
  if (eduLevel.includes("UNIVERSITÉ") || eduLevel.includes("SUPÉRIEUR")) mainTitle = "RELEVÉ DE NOTES";

  // Header
  if (branchInfo?.logoPath) {
    try {
      doc.addImage(branchInfo.logoPath, 'PNG', 10, 8, 25, 25);
    } catch (e) {
      doc.setDrawColor(200);
      doc.rect(10, 8, 25, 25);
    }
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(branchInfo?.branchName || "ÉCOLE GESTION PRO", 105, 15, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Agrément: ${branchInfo?.registrationNo || "N/A"}`, 40, 22);
  doc.text(`Niveau Educatif: ${eduLevel}`, 40, 27);
  doc.text(`Année Scolaire: ${session || "2024-2025"}`, 195, 22, { align: "right" });
  doc.text(`Tél: ${branchInfo?.contactNo || ""} | Email: ${branchInfo?.email || ""}`, 105, 32, { align: "center" });
  doc.text(`Adresse: ${branchInfo?.address || ""}`, 105, 37, { align: "center" });

  doc.setLineWidth(0.5);
  doc.line(10, 40, 200, 40);

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

  doc.setFontSize(14);
  doc.setFont("helvetica", "bolditalic");
  doc.text(`${mainTitle} - ${safeTerm}`, 105, 52, { align: "center" });

  // Student Info Box
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(10, 55, 190, 22);
  
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

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ÉLÈVE:", 15, 62);
  doc.setFont("helvetica", "normal");
  doc.text(student?.nomEtudiant || student?.name || "N/A", 40, 62);

  doc.setFont("helvetica", "bold");
  doc.text("MATRICULE:", 15, 69);
  doc.setFont("helvetica", "normal");
  doc.text(student?.numAdmission || student?.matricule || "N/A", 40, 69);

  doc.setFont("helvetica", "bold");
  doc.text("CLASSE:", 15, 76);
  doc.setFont("helvetica", "normal");
  doc.text(student?.classe || student?.className || "N/A", 40, 76);

  doc.setFont("helvetica", "bold");
  doc.text("RANG:", 130, 62);
  doc.setFont("helvetica", "normal");
  doc.text(`${displayRank} / ${totalStudents || 0}`, 150, 62);

  doc.setFont("helvetica", "bold");
  doc.text("MOYENNE:", 130, 69);
  doc.setFont("helvetica", "bold");
  doc.text(`${displayAverage.toFixed(2)} / 20`, 150, 69);

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
      { content: summary?.annualAverage?.toFixed(2) || "-", styles: { halign: "center", fontStyle: "bold", fillColor: [240, 240, 240] } },
      { content: "", colSpan: 3, styles: { fillColor: [255, 255, 255] } }
    ]
  ];

  autoTable(doc, {
    startY: 85,
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
        { content: safeTerm.includes("1") ? displayAverage.toFixed(2) : "", styles: { halign: "center", fontStyle: "bold" } },
        { content: safeTerm.includes("1") ? displayRank : "", styles: { halign: "center", fontStyle: "bold" } },
        { content: safeTerm.includes("2") ? displayAverage.toFixed(2) : "", styles: { halign: "center", fontStyle: "bold" } },
        { content: safeTerm.includes("2") ? displayRank : "", styles: { halign: "center", fontStyle: "bold", fillColor: safeTerm.includes("2") ? [255, 255, 0] : [255, 255, 255] } },
        { content: summary?.annualAverage?.toFixed(2) || "", styles: { halign: "center", fontStyle: "bold" } },
        { content: summary?.annualRank || "", styles: { halign: "center", fontStyle: "bold" } }
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

  // Draw QR Code
  try {
    const qrData = `ELEVE: ${student?.nomEtudiant || student?.name || "N/A"} | MATRICULE: ${student?.numAdmission || student?.matricule || "N/A"} | MOYENNE: ${displayAverage.toFixed(2)}/20 | CLASSE: ${student?.classe || student?.className || "N/A"}`;
    const qrBase64 = await fetchQRCodeBase64(qrData);
    if (qrBase64) {
      doc.addImage(qrBase64, 'PNG', 170, lastY + 5, 20, 20);
    }
  } catch (e) {
    console.warn("Failed to load QR code for Bulletin:", e);
  }

  // Open in new window for preview
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export async function generatePVMatrixPDF(matrixData: any, classInfo: any, filters: any) {
  const doc = new jsPDF({ orientation: "landscape" });
  const { students, subjects } = matrixData;
  const safePeriod = (filters?.period || "Période").toUpperCase();

  doc.setFontSize(16);
  doc.text(`PROCÈS VERBAL DES RÉSULTATS - ${classInfo?.className || "CLASSE"}`, 148, 15, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Période: ${safePeriod} | Session: ${filters?.sessionName || ""}`, 148, 22, { align: "center" });

  const headers = ["Matricule", "Nom de l'élève", ...(subjects || []).map((s: any) => s.subjectName), "Moyenne", "Rang", "Décision"];
  
  const body = (students || []).map((s: any) => [
    s.matricule,
    s.name,
    ...(subjects || []).map((subj: any) => {
      const res = s.results[subj.id];
      return res ? res.total.toFixed(1) : "-";
    }),
    s.average.toFixed(2),
    s.rank || "-",
    s.decision
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

export async function generateReleveNotesPDF(data: any) {
  const doc = new jsPDF();
  const { student, session, term, results, summary, resultsS1, resultsS2, resultsS3, resultsS4, resultsS5, resultsS6, summaryS1, summaryS2, summaryS3, summaryS4, summaryS5, summaryS6, branchInfo } = data;

  // --- 1. HEADER SECTION ---
  if (branchInfo?.logoPath) {
    try {
      doc.addImage(branchInfo.logoPath, 'PNG', 10, 8, 25, 25);
    } catch (e) {
      doc.setDrawColor(200);
      doc.rect(10, 8, 25, 25);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("REPUBLIQUE DU NIGER", 105, 12, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(branchInfo?.branchName || "Université Privée Internationale Aboubacar Ibrahim", 105, 17, { align: "center" });
  
  doc.setFontSize(9);
  doc.text(branchInfo?.branchAlias || "Faculté des Sciences Administratives, Juridiques et Economiques", 105, 21, { align: "center" });
  doc.text("Service de la Scolarité", 105, 25, { align: "center" });
  
  doc.setFont("helvetica", "normal");
  doc.text(`BP : ${branchInfo?.address || "370 Maradi-Niger"}, Tél. ${branchInfo?.contactNo || "(+227) 96 06 92 66"}`, 105, 29, { align: "center" });
  doc.text(`Email : ${branchInfo?.email || "university@gmail.com"}`, 105, 33, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`AGREMENT N°: ${branchInfo?.registrationNo || "00172/MESR/I/SG/DGE/DL/DESPRI"}`, 105, 38, { align: "center" });
  doc.text(`NIVEAU: ${(student?.educationalLevel || "Université").toUpperCase()}`, 105, 42, { align: "center" });

  // Draw Logos (Decoration)
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.circle(185, 25, 12);

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

  doc.setFillColor(210, 230, 210);
  doc.rect(10, 45, 190, 8, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 50, 0);
  doc.text("RELEVE DE NOTES", 105, 51, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // --- 3. STUDENT INFO ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Etudiant:", 10, 59);
  doc.text("Matricule:", 10, 64);
  doc.text("Parcours:", 10, 69);
  
  doc.setFont("helvetica", "bold");
  doc.text(student?.nomEtudiant || student?.name || "ADIATULLAHI RABIU AHMAD Nigeria", 30, 59);
  doc.text(student?.numAdmission || student?.matricule || "20 D 004", 30, 64);
  doc.text(student?.classe || student?.className || "Première année de licence en Shari'a and Law", 30, 69);

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(175, 55, 18, 18);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("QR Code", 178, 64);

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
  doc.text(`Première session`, 10, 77);
  doc.text(`${session || "2022/2023"}`, 40, 77);
  
  doc.setFontSize(11);
  doc.text(firstSemesterName, 105, 82, { align: "center" });

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
    startY: 84,
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

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
