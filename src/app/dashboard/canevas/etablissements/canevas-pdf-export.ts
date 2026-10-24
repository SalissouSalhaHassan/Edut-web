import { toast } from "sonner";

export interface CanevasExportOptions {
  title: string;
  subtitle?: string;
  schoolName?: string;
  schoolCode?: string;
  headers: string[];
  rows: (string | number)[][];
  filename?: string;
  summaryNotes?: { label: string; value: string | number }[];
  orientation?: "portrait" | "landscape";
}

export async function exportCanevasTableToPdf(options: CanevasExportOptions) {
  try {
    toast.info("Génération du fichier PDF officiel en cours...");

    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const orientation = options.orientation || (options.headers.length > 6 ? "landscape" : "portrait");
    const doc = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Header - Official Republic banner
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("RÉPUBLIQUE DU NIGER", margin, 10);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE - CANEVAS STATISTIQUE SCOLAIRE", margin, 16);

    // School Code badge on top-right
    const code = options.schoolCode || "ETB-2026-001";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`CODE : ${code}`, pageWidth - margin, 12, { align: "right" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const now = new Date();
    doc.text(`Généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR")}`, pageWidth - margin, 18, { align: "right" });

    // Section title
    let yPos = 34;
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(options.title, margin, yPos);

    if (options.subtitle) {
      yPos += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(options.subtitle, margin, yPos);
    }

    // School Info Sub-banner
    yPos += 8;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 12, 3, 3, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(67, 56, 202); // Indigo-700
    const schoolName = options.schoolName || "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI";
    doc.text(`Établissement : ${schoolName}`, margin + 5, yPos + 7.5);

    yPos += 18;

    // AutoTable
    autoTable(doc, {
      startY: yPos,
      head: [options.headers],
      body: options.rows,
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [67, 56, 202], // Indigo-700
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
        halign: "left",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didDrawPage: (data) => {
        // Page numbers footer
        const str = `Page ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, pageWidth / 2, pageHeight - 8, { align: "center" });
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 60;

    // Summary Notes Box if available
    let nextY = finalY + 8;
    if (options.summaryNotes && options.summaryNotes.length > 0 && nextY + 30 < pageHeight - 30) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, nextY, pageWidth - margin * 2, 14, 2, 2, "FD");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      const notesText = options.summaryNotes.map((n) => `${n.label}: ${n.value}`).join("   |   ");
      doc.text(`SYNTHÈSE :   ${notesText}`, margin + 5, nextY + 8.5);
      nextY += 20;
    }

    // Signature Block (if space allows on current page, else on next)
    if (nextY + 32 > pageHeight) {
      doc.addPage();
      nextY = 25;
    }

    const boxWidth = (pageWidth - margin * 2 - 20) / 2;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    
    // Left Box: Direction
    doc.roundedRect(margin, nextY, boxWidth, 26, 2, 2, "D");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("Le Directeur de l'Établissement", margin + 6, nextY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Date, cachet et signature :", margin + 6, nextY + 11);

    // Right Box: Inspection
    const rightBoxX = margin + boxWidth + 20;
    doc.roundedRect(rightBoxX, nextY, boxWidth, 26, 2, 2, "D");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("L'Inspecteur de l'Enseignement", rightBoxX + 6, nextY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Visa, homologation et observations :", rightBoxX + 6, nextY + 11);

    // Save PDF
    const saveName = `${code}_${options.filename || "fiche_etablissement"}.pdf`;
    doc.save(saveName);

    toast.success(`Export PDF téléchargé : ${saveName}`);
  } catch (error) {
    console.error("PDF Export Error:", error);
    toast.error("Erreur lors de la génération du PDF.");
  }
}

export async function exportFullFicheDossierPdf(etb: {
  code: string;
  nom: string;
  commune?: string;
  region?: string;
  statut?: string;
  directeur?: string;
  telephone?: string;
  totalEleves?: number;
  totalEnseignants?: number;
  totalClasses?: number;
}) {
  try {
    toast.info("Génération du dossier complet officiel de l'établissement...");

    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("RÉPUBLIQUE DU NIGER", margin, 11);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE - DOSSIER HOMOLOGUÉ DE L'ÉTABLISSEMENT", margin, 18);
    doc.text(`CODE ETB : ${etb.code}  |  STATUT CANEVAS : ${etb.statut || "VALIDÉ"}`, margin, 24);

    // Title
    let y = 38;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(etb.nom || "ÉCOLE PRIMAIRE PUBLIQUE GUESSELBODI", margin, y);

    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Région: ${etb.region || "Niamey"}  •  Commune: ${etb.commune || "Niamey 1"}  •  Directeur: ${etb.directeur || "M. Mahamadou Moussa"}  •  Tél: ${etb.telephone || "+227 90 00 00 00"}`, margin, y);

    // Key Stats row
    y += 10;
    const stats = [
      ["Total Élèves", String(etb.totalEleves || 642)],
      ["Classes / Groupes", String(etb.totalClasses || 20)],
      ["Personnel Enseignant", String(etb.totalEnseignants || 47)],
      ["Ratio Élèves / Enseignant", "1 / 14"],
    ];

    const statBoxWidth = (pageWidth - margin * 2 - 9) / 4;
    stats.forEach(([lbl, val], idx) => {
      const bx = margin + idx * (statBoxWidth + 3);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(bx, y, statBoxWidth, 18, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(lbl.toUpperCase(), bx + 3, y + 6);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(67, 56, 202);
      doc.text(val, bx + 3, y + 14);
    });

    y += 26;

    // Table 1: Répartition des Effectifs et Redoublants
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("1. Effectifs par Niveau et Taux de Redoublement", margin, y);

    autoTable(doc, {
      startY: y + 4,
      head: [["Niveau", "Total Élèves", "Filles", "Garçons", "% Filles", "Redoublants", "Taux Red."]],
      body: [
        ["Section 1", "52", "25", "27", "48%", "1", "2%"],
        ["Section 2", "58", "28", "30", "48%", "1", "2%"],
        ["CI", "104", "50", "54", "48%", "4", "4%"],
        ["CP", "118", "58", "60", "49%", "6", "5%"],
        ["CE1", "111", "55", "56", "50%", "5", "5%"],
        ["CE2", "105", "52", "53", "50%", "3", "3%"],
        ["CM1", "98", "49", "49", "50%", "4", "4%"],
        ["CM2", "106", "54", "52", "51%", "2", "2%"],
        ["TOTAL GÉNÉRAL", "642", "321", "321", "50%", "26", "4%"],
      ],
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [67, 56, 202], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    let currentY = (doc as any).lastAutoTable?.finalY + 10;

    // Table 2: Infrastructures et Services
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("2. Infrastructures, Salles et Services Essentiels", margin, currentY);

    autoTable(doc, {
      startY: currentY + 4,
      head: [["Type d'Infrastructure", "Total Salles", "Utilisées", "Fonctionnelles", "Mauvais État", "Observations"]],
      body: [
        ["Dur", "12", "11", "10", "2", "Entretien régulier"],
        ["Semi-dur", "4", "4", "3", "1", "À rénover"],
        ["Banco", "1", "1", "1", "0", "Temporaire"],
        ["Préfabriquée", "1", "1", "1", "0", "Bon état"],
        ["TOTAL", "18", "17", "15", "3", "3 salles requièrent réhabilitation"],
      ],
      theme: "grid",
      margin: { left: margin, right: margin },
      headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    currentY = (doc as any).lastAutoTable?.finalY + 12;

    // Signatures
    const boxWidth = (pageWidth - margin * 2 - 20) / 2;
    doc.roundedRect(margin, currentY, boxWidth, 24, 2, 2, "D");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text("Visa de l'Établissement :", margin + 6, currentY + 6);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Signature et cachet officiel du Directeur", margin + 6, currentY + 12);

    doc.roundedRect(margin + boxWidth + 20, currentY, boxWidth, 24, 2, 2, "D");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Visa de l'Inspection DREN :", margin + boxWidth + 26, currentY + 6);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Signature et cachet de l'Inspecteur de zone", margin + boxWidth + 26, currentY + 12);

    doc.save(`${etb.code}_Dossier_Complet_Fiche_Etablissement.pdf`);
    toast.success("Dossier complet de l'établissement exporté en PDF !");
  } catch (error) {
    console.error("Dossier Export Error:", error);
    toast.error("Erreur lors de l'export du dossier.");
  }
}
