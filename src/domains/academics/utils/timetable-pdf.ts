interface ExportOptions {
  type: 'all-classes' | 'all-teachers' | 'teachers-4-per-page' | 'current';
  id?: number; // Used for 'current' mode (classId or employeeId)
  mode?: 'class' | 'teacher'; // Used for 'current' mode
}

function normalizeDays(days: any): string[] {
  if (!days) return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
  if (Array.isArray(days)) return days;
  if (typeof days === 'string') return days.split(',').map(d => d.trim()).filter(Boolean);
  return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
}

// Map subject names to beautiful background colors for the timetable
const colorMap: Record<string, [number, number, number]> = {
  "Mathématiques": [238, 242, 255], // Indigo
  "Physique Chimie": [240, 253, 244], // Green
  "SVT": [236, 253, 245], // Emerald
  "Français": [254, 242, 242], // Red
  "Anglais": [255, 247, 237], // Orange
  "Histoire Géo": [254, 252, 232], // Yellow
  "Arabe": [245, 243, 255], // Violet
  "Philosophie": [253, 244, 255], // Fuchsia
  "EPS": [248, 250, 252], // Slate
  "Informatique": [240, 249, 255], // Sky
  "Education Islamique": [245, 253, 235], // Lime
};

function getSubjectColor(subjectName: string): [number, number, number] {
  for (const key in colorMap) {
    if (subjectName.toLowerCase().includes(key.toLowerCase())) {
      return colorMap[key];
    }
  }
  return [248, 250, 252]; // Default light slate
}

export async function generateTimetablePDF(options: ExportOptions) {
  if (typeof window === 'undefined') return;

  try {
    // Dynamic imports to avoid SSR/Turbopack issues
    const jspdfModule = await import('jspdf');
    const jsPDF = jspdfModule.jsPDF || (jspdfModule as any).default;
    await import('jspdf-autotable');

    // Fetch data via API route (not server action - avoids "use server" restriction)
    const response = await fetch('/api/timetable/report');
    if (!response.ok) {
      alert(`Erreur serveur : ${response.statusText}`);
      return;
    }
    const reportData = await response.json();

    const { entries, classes, teachers, settings, schoolInfo, documentHeaderConfig } = reportData;
    const days = normalizeDays(settings?.days);
    const periods = settings?.periods || 6;
    const recessAfter = settings?.recessAfter || 0;

    const doc = new jsPDF('landscape', 'mm', 'a4');

    if (options.type === 'current' && options.id && options.mode) {
      if (options.mode === 'class') {
        const cls = classes.find((c: any) => c.id === options.id);
        const clsEntries = entries.filter((e: any) => e.classId === options.id);
        drawTimetablePage(doc, `CLASSE : ${cls?.className || 'Inconnue'}`, days, periods, recessAfter, clsEntries, 'class', schoolInfo, documentHeaderConfig);
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        const teacher = teachers.find((t: any) => t.id === options.id);
        const tEntries = entries.filter((e: any) => e.employeeId === options.id);
        drawTimetablePage(doc, `ENSEIGNANT : ${teacher?.nom || 'Inconnu'}`, days, periods, recessAfter, tEntries, 'teacher', schoolInfo, documentHeaderConfig);
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    }
    else if (options.type === 'all-classes') {
      if (!classes || classes.length === 0) { alert("Aucune classe trouvée."); return; }
      classes.forEach((cls: any, index: number) => {
        if (index > 0) doc.addPage();
        const clsEntries = entries.filter((e: any) => e.classId === cls.id);
        drawTimetablePage(doc, `CLASSE : ${cls.className}`, days, periods, recessAfter, clsEntries, 'class', schoolInfo, documentHeaderConfig);
      });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
    else if (options.type === 'all-teachers') {
      const activeTeachers = (teachers || []).filter((t: any) => (entries || []).some((e: any) => e.employeeId === t.id));
      if (activeTeachers.length === 0) { alert("Aucun enseignant avec des cours programmés."); return; }
      activeTeachers.forEach((t: any, index: number) => {
        if (index > 0) doc.addPage();
        const tEntries = entries.filter((e: any) => e.employeeId === t.id);
        drawTimetablePage(doc, `ENSEIGNANT : ${t.nom}`, days, periods, recessAfter, tEntries, 'teacher', schoolInfo, documentHeaderConfig);
      });
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
    else if (options.type === 'teachers-4-per-page') {
      const activeTeachers = (teachers || []).filter((t: any) => (entries || []).some((e: any) => e.employeeId === t.id));
      if (activeTeachers.length === 0) { alert("Aucun enseignant avec des cours programmés."); return; }
      const margin = 10;
      const pageW = 297;
      const pageH = 210;
      const cardW = (pageW - 3 * margin) / 2;
      const cardH = (pageH - 3 * margin) / 2;

      for (let i = 0; i < activeTeachers.length; i += 4) {
        if (i > 0) doc.addPage();
        doc.setDrawColor(200);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(pageW / 2, margin, pageW / 2, pageH - margin);
        doc.line(margin, pageH / 2, pageW - margin, pageH / 2);
        doc.setLineDashPattern([], 0);

        const batch = activeTeachers.slice(i, i + 4);
        batch.forEach((t: any, idx: number) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = margin + col * (cardW + margin);
          const y = margin + row * (cardH + margin);
          const tEntries = entries.filter((e: any) => e.employeeId === t.id);
          drawMiniTimetable(doc, x, y, cardW, cardH, t.nom, days, periods, tEntries, schoolInfo);
        });
      }
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
  } catch (err: any) {
    console.error("PDF Generation Error:", err);
    alert("Erreur lors de la génération PDF : " + (err?.message || String(err)));
  }
}

function drawOfficialHeaderLandscape(doc: any, headerConfig: any, schoolInfo: any, titleText: string): number {
  const schoolName = headerConfig?.schoolName || schoolInfo?.branchName || "ÉTABLISSEMENT D'EXCELLENCE";
  const schoolNameAr = headerConfig?.schoolNameAr || "";
  const country = headerConfig?.country || "RÉPUBLIQUE DU NIGER";
  const countryAr = headerConfig?.countryAr || "";
  const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
  const ministryAr = headerConfig?.ministryAr || "";
  const regionalDirection = headerConfig?.regionalDirection || schoolInfo?.dren || schoolInfo?.region || "";
  const regionalDirectionAr = headerConfig?.regionalDirectionAr || "";
  const departmentalDirection = headerConfig?.departmentalDirection || schoolInfo?.dden || schoolInfo?.department || "";
  const departmentalDirectionAr = headerConfig?.departmentalDirectionAr || "";
  const inspection = headerConfig?.inspection || schoolInfo?.inspection || "";
  const inspectionAr = headerConfig?.inspectionAr || "";
  const service = headerConfig?.service || "";
  const serviceAr = headerConfig?.serviceAr || "";
  const address = headerConfig?.address || schoolInfo?.address || "";
  const addressAr = headerConfig?.addressAr || "";
  const bp = headerConfig?.bp || "";
  const phone = headerConfig?.phone || schoolInfo?.contactNo || "";
  const email = headerConfig?.email || schoolInfo?.email || "";
  const schoolYear = headerConfig?.schoolYear || "2024 - 2025";
  const motto = headerConfig?.motto || "";
  const mottoAr = headerConfig?.mottoAr || "";

  const style = headerConfig?.style || "classic_dual_logo";

  doc.setTextColor(0, 0, 0);

  if (style === "modern_card") {
    // Fill background
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.roundedRect(15, 8, 267, 20, 2, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(schoolName, 25, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(220, 225, 255);
    doc.text(`Année Scolaire: ${schoolYear}`, 25, 20);
    doc.text(`${address} ${phone ? '| Tél: ' + phone : ''}`, 25, 25);

    doc.setTextColor(0, 0, 0);
    
    // Draw Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(titleText, 148, 38, { align: 'center' });
    return 42;
  }

  if (style === "bilingual_center_logo") {
    const leftLines = [
      country,
      motto,
      ministry,
      regionalDirection,
      departmentalDirection,
      inspection,
      schoolName,
      service,
      address,
      bp ? `BP : ${bp}` : "",
      phone ? `Tél: ${phone}` : "",
    ].filter(Boolean);

    let leftY = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const line of leftLines) {
      doc.text(line, 15, leftY);
      leftY += 3.8;
    }

    const rightLines = [
      countryAr || "جمهورية النيجر",
      mottoAr,
      ministryAr,
      regionalDirectionAr,
      departmentalDirectionAr,
      inspectionAr,
      schoolNameAr || schoolName,
      serviceAr,
      addressAr,
      bp ? `ص.ب: ${bp}` : "",
      phone ? `الهاتف: ${phone}` : "",
    ].filter(Boolean);

    let rightY = 12;
    for (const line of rightLines) {
      doc.text(line, 282, rightY, { align: "right" });
      rightY += 3.8;
    }

    const maxY = Math.max(leftY, rightY);
    doc.setLineWidth(0.5);
    doc.line(15, maxY + 1, 282, maxY + 1);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 58, 138); // Indigo 900
    doc.text(titleText, 148, maxY + 8, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Année Scolaire: ${schoolYear}  •  Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, 148, maxY + 13, { align: 'center' });

    return maxY + 18;
  }

  if (style === "university_formal") {
    const centerLines = [
      country,
      schoolName,
      service,
      [bp && `BP : ${bp}`, address, phone && `Tél. ${phone}`].filter(Boolean).join(" | "),
      email ? `Email : ${email}` : "",
    ].filter(Boolean);

    let centerY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(centerLines[0].toUpperCase(), 148, centerY, { align: "center" });

    doc.setFontSize(13);
    centerY += 5;
    doc.text(centerLines[1], 148, centerY, { align: "center" });

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    for (let i = 2; i < centerLines.length; i++) {
      centerY += 4;
      doc.text(centerLines[i], 148, centerY, { align: "center" });
    }

    const finalY = Math.max(centerY + 3, 30);
    doc.setLineWidth(0.5);
    doc.line(15, finalY, 282, finalY);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 58, 138); // Indigo 900
    doc.text(titleText, 148, finalY + 8, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Année Scolaire: ${schoolYear}  •  Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, 148, finalY + 13, { align: 'center' });

    return finalY + 18;
  }

  if (style === "minimal_administrative") {
    const leftLines = [
      schoolName,
      service || "Administration",
      phone ? `Tél: ${phone}` : "",
    ].filter(Boolean);

    let leftY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(leftLines[0], 15, leftY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (let i = 1; i < leftLines.length; i++) {
      leftY += 4;
      doc.text(leftLines[i], 15, leftY);
    }

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(30, 58, 138); // Indigo 900
    doc.text(titleText, 148, 16, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Année Scolaire: ${schoolYear}  •  Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, 148, 22, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(15, 27, 282, 27);
    return 33;
  }

  // DEFAULT / CLASSIC DUAL LOGO
  // Left side: Republic & Ministry
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(country, 15, 12);
  doc.setFontSize(7.5);
  doc.text(motto, 15, 15);
  doc.text(ministry, 15, 18);
  if (regionalDirection) doc.text(regionalDirection, 15, 21);
  if (departmentalDirection) doc.text(departmentalDirection, 15, 24);
  if (inspection) doc.text(inspection, 15, 27);

  // Right side: School details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(schoolName, 282, 12, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let rightY = 16;
  if (phone) { doc.text(`Tél: ${phone}`, 282, rightY, { align: 'right' }); rightY += 3.5; }
  if (address) { doc.text(address, 282, rightY, { align: 'right' }); rightY += 3.5; }
  if (email) { doc.text(email, 282, rightY, { align: 'right' }); rightY += 3.5; }

  // Draw separator line
  doc.setLineWidth(0.5);
  doc.line(15, 34, 282, 34);

  // Main Title
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // Indigo 900
  doc.setFont("helvetica", "bold");
  doc.text(titleText, 148, 42, { align: 'center' });

  // Academic Year / Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Année Scolaire: ${schoolYear}  •  Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, 148, 48, { align: 'center' });

  return 52;
}

function drawTimetablePage(
  doc: any,
  title: string,
  days: string[],
  periods: number,
  recessAfter: number,
  entries: any[],
  mode: 'class' | 'teacher',
  schoolInfo?: any,
  documentHeaderConfig?: any
) {
  const startY = drawOfficialHeaderLandscape(doc, documentHeaderConfig, schoolInfo, "EMPLOI DU TEMPS");

  // Subtitle (Class or Teacher)
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  // Draw a rounded pill for the subtitle
  const subtitleWidth = doc.getTextWidth(title) + 16;
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.roundedRect(148 - subtitleWidth / 2, startY - 4, subtitleWidth, 8, 4, 4, 'F');
  doc.text((title || "").toUpperCase(), 148, startY + 1.5, { align: 'center' });

  // Generate Table Data
  const tableBody: any[] = [];
  for (let p = 1; p <= periods; p++) {
    // Recess row
    if (recessAfter > 0 && p === recessAfter + 1) {
      tableBody.push([
        { content: '— R É C R É A T I O N —', colSpan: days.length + 1, styles: { fillColor: [248, 250, 252], fontStyle: 'italic', textColor: [100, 116, 139], halign: 'center', fontSize: 9, cellPadding: 4 } }
      ]);
    }

    const row: any[] = [{ content: `H${p}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105], halign: 'center' } }];
    days.forEach(day => {
      const entry = entries.find((e: any) => e.dayName === day && e.periodNumber === p);
      if (entry) {
        const main = entry.subject?.subjectName || '?';
        const sub = mode === 'class'
          ? (entry.teacher?.nom || 'Sans Prof')
          : (entry.class?.className || 'Classe ?');
        
        const bgColor = getSubjectColor(main);
        
        row.push({ 
          content: `${main}\n\n${sub}`, 
          styles: { 
            fontSize: 9, 
            fontStyle: 'bold', 
            textColor: [30, 41, 59], 
            fillColor: bgColor,
            halign: 'center',
            valign: 'middle'
          } 
        });
      } else {
        row.push({ content: '', styles: { fillColor: [255, 255, 255] } });
      }
    });
    tableBody.push(row);
  }

  (doc as any).autoTable({
    startY: startY + 8,
    head: [['HEURES', ...days.map((d: string) => (d || "").toUpperCase())]],
    body: tableBody,
    theme: 'grid',
    styles: { 
      fontSize: 8.5, 
      halign: 'center', 
      valign: 'middle', 
      cellPadding: 2, 
      overflow: 'linebreak', 
      lineColor: [226, 232, 240], 
      lineWidth: 0.5,
      minCellHeight: 11
    },
    headStyles: { 
      fillColor: [30, 41, 59], 
      textColor: 255, 
      fontStyle: 'bold', 
      fontSize: 9.5,
      halign: 'center'
    },
    alternateRowStyles: { },
    margin: { top: startY + 8, bottom: 15, left: 15, right: 15 },
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Le Censeur", 40, finalY);
  doc.text("Le Directeur", 257, finalY, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text("(Cachet et Signature)", 40, finalY + 4);
  doc.text("(Cachet et Signature)", 257, finalY + 4, { align: 'right' });
}

function drawMiniTimetable(
  doc: any,
  x: number,
  y: number,
  w: number,
  _h: number,
  teacherName: string,
  days: string[],
  periods: number,
  entries: any[],
  schoolInfo?: any
) {
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.roundedRect(x, y, w, 8, 2, 2, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text((teacherName || "").toUpperCase(), x + w / 2, y + 5.5, { align: 'center' });

  const tableBody: any[] = [];
  for (let p = 1; p <= periods; p++) {
    const row: any[] = [{ content: `H${p}`, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [71, 85, 105] } }];
    days.forEach(day => {
      const entry = entries.find((e: any) => e.dayName === day && e.periodNumber === p);
      if (entry) {
        const subj = (entry.subject?.subjectName || '?').substring(0, 10);
        const cls = (entry.class?.className || '?').substring(0, 8);
        const bgColor = getSubjectColor(subj);
        row.push({ 
          content: `${subj}\n${cls}`, 
          styles: { fillColor: bgColor, textColor: [30, 41, 59], fontStyle: 'bold' } 
        });
      } else {
        row.push('');
      }
    });
    tableBody.push(row);
  }

  (doc as any).autoTable({
    startY: y + 10,
    margin: { left: x, right: 297 - x - w },
    tableWidth: w,
    head: [['H', ...days.map((d: string) => (d || "").substring(0, 3).toUpperCase())]],
    body: tableBody,
    styles: { fontSize: 6, halign: 'center', valign: 'middle', cellPadding: 1.5, overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 6.5, fontStyle: 'bold' },
    theme: 'grid',
  });
}
