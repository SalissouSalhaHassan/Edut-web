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

    const { entries, classes, teachers, settings, schoolInfo } = reportData;
    const days = normalizeDays(settings?.days);
    const periods = settings?.periods || 6;
    const recessAfter = settings?.recessAfter || 0;

    const doc = new jsPDF('landscape', 'mm', 'a4');

    if (options.type === 'current' && options.id && options.mode) {
      if (options.mode === 'class') {
        const cls = classes.find((c: any) => c.id === options.id);
        const clsEntries = entries.filter((e: any) => e.classId === options.id);
        drawTimetablePage(doc, `CLASSE : ${cls?.className || 'Inconnue'}`, days, periods, recessAfter, clsEntries, 'class', schoolInfo);
        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        const teacher = teachers.find((t: any) => t.id === options.id);
        const tEntries = entries.filter((e: any) => e.employeeId === options.id);
        drawTimetablePage(doc, `ENSEIGNANT : ${teacher?.nom || 'Inconnu'}`, days, periods, recessAfter, tEntries, 'teacher', schoolInfo);
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
        drawTimetablePage(doc, `CLASSE : ${cls.className}`, days, periods, recessAfter, clsEntries, 'class', schoolInfo);
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
        drawTimetablePage(doc, `ENSEIGNANT : ${t.nom}`, days, periods, recessAfter, tEntries, 'teacher', schoolInfo);
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

function drawTimetablePage(
  doc: any,
  title: string,
  days: string[],
  periods: number,
  recessAfter: number,
  entries: any[],
  mode: 'class' | 'teacher',
  schoolInfo?: any
) {
  // Professional Header
  doc.setFontSize(10);
  doc.setTextColor(50);
  
  // Left side: Republic & Ministry
  doc.text("RÉPUBLIQUE DU NIGER", 15, 15);
  doc.setFontSize(8);
  doc.text("Ministère de l'Éducation Nationale", 15, 20);
  
  // Right side: School details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const schoolName = schoolInfo?.branchName || "ÉTABLISSEMENT D'EXCELLENCE";
  doc.text(schoolName, 282, 15, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  if (schoolInfo?.contactNo) doc.text(`Tél: ${schoolInfo.contactNo}`, 282, 20, { align: 'right' });
  if (schoolInfo?.address) doc.text(schoolInfo.address, 282, 24, { align: 'right' });

  // Main Title
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // Indigo 900
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOI DU TEMPS", 148, 25, { align: 'center' });
  
  // Subtitle (Class or Teacher)
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  // Draw a rounded pill for the subtitle
  const subtitleWidth = doc.getTextWidth(title) + 20;
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.roundedRect(148 - subtitleWidth / 2, 30, subtitleWidth, 10, 5, 5, 'F');
  doc.text((title || "").toUpperCase(), 148, 37, { align: 'center' });

  // Academic Year / Date
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Année Scolaire: 2024 - 2025  •  Imprimé le ${new Date().toLocaleDateString('fr-FR')}`, 148, 46, { align: 'center' });

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
    startY: 52,
    head: [['HEURES', ...days.map((d: string) => (d || "").toUpperCase())]],
    body: tableBody,
    theme: 'grid',
    styles: { 
      fontSize: 9, 
      halign: 'center', 
      valign: 'middle', 
      cellPadding: 4, 
      overflow: 'linebreak', 
      lineColor: [226, 232, 240], 
      lineWidth: 0.5,
      minCellHeight: 16
    },
    headStyles: { 
      fillColor: [30, 41, 59], 
      textColor: 255, 
      fontStyle: 'bold', 
      fontSize: 10,
      halign: 'center'
    },
    alternateRowStyles: { },
    margin: { top: 52, bottom: 30, left: 15, right: 15 },
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Le Censeur", 40, finalY);
  doc.text("Le Directeur", 257, finalY, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("(Cachet et Signature)", 40, finalY + 5);
  doc.text("(Cachet et Signature)", 257, finalY + 5, { align: 'right' });
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
