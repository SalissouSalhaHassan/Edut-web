/**
 * Official University Degree Generator – Diplôme de Licence / Master / Doctorat
 * Layout conforme au modèle officiel REESAO / Ministère de l'Enseignement Supérieur Niger
 *
 * Fixes applied (v3):
 * 1. Full-width dark-green banner with larger gold title text
 * 2. Selective Bold in laureate paragraph (name, specialization, faculty, mention)
 * 3. Larger, separated official seals (gold + blue)
 * 4. Compressed VU clauses with all Niger-specific extra articles
 * 5. Decorative central ornament below seals
 * 6. Signature underlines for all three blocks
 */

import QRCode from "qrcode";
import { getEctsGrade } from "./lmd-releve-generator";

export interface LmdDiplomaParams {
  student: {
    id: number;
    nom: string;
    prenom?: string;
    matricule?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nationalite?: string;
    sexe?: string;
  };
  degree: {
    title: string;
    specialization: string;
    fieldOfStudy: string;
    mention: string;
    finalGradeAverage: number;
    totalCreditsAcquired: number;
    sessionName: string;
    deliberationDate?: string;
    diplomaNumber?: string;
  };
  institution: {
    name?: string;
    countryName?: string;
    ministryName?: string;
    ministryLabel?: string;
    facultyName?: string;
    rectorName?: string;
    deanName?: string;
    directorGeneralName?: string;
    city?: string;
    logo?: string;
    ministryLogo?: string;
  };
}

/* ─── Helper: draw ornamental border ─────────────────────────────────── */
function drawOrnamentalBorder(doc: any, pw: number, ph: number) {
  // Outer thick green border
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(3);
  doc.rect(5, 5, pw - 10, ph - 10, "S");

  // Inner thin green border
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(0.7);
  doc.rect(9, 9, pw - 18, ph - 18, "S");

  // Chain-link ornamental dots between the two borders
  doc.setFillColor(0, 110, 0);
  const step = 3.5;
  for (let x = 10; x <= pw - 10; x += step) {
    doc.circle(x, 7, 0.55, "F");
    doc.circle(x, ph - 7, 0.55, "F");
  }
  for (let y = 10; y <= ph - 10; y += step) {
    doc.circle(7, y, 0.55, "F");
    doc.circle(pw - 7, y, 0.55, "F");
  }

  // Corner circular ornaments (4 corners)
  const corners = [
    [12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12],
  ];
  for (const [cx, cy] of corners) {
    doc.setDrawColor(0, 110, 0);
    doc.setLineWidth(0.7);
    doc.circle(cx, cy, 5.5, "S");
    doc.circle(cx, cy, 3.2, "S");
    doc.setFillColor(0, 110, 0);
    doc.circle(cx, cy, 1.2, "F");
    doc.setLineWidth(0.5);
    doc.line(cx - 7, cy, cx + 7, cy);
    doc.line(cx, cy - 7, cx, cy + 7);
  }
}

/* ─── Helper: draw decorative central ornament ─────────────────────────── */
function drawCentralOrnament(doc: any, cx: number, cy: number) {
  // Horizontal decorative vine/leaf line
  doc.setDrawColor(180, 0, 0);
  doc.setLineWidth(0.5);
  const halfW = 28;
  doc.line(cx - halfW, cy, cx + halfW, cy);

  // Left leaf clusters
  for (let i = 0; i < 5; i++) {
    const lx = cx - halfW + i * 5 + 3;
    doc.setFillColor(180, 0, 0);
    doc.circle(lx, cy - 1.2, 0.9, "F");
    doc.circle(lx, cy + 1.2, 0.9, "F");
  }
  // Right mirror
  for (let i = 0; i < 5; i++) {
    const lx = cx + halfW - i * 5 - 3;
    doc.setFillColor(180, 0, 0);
    doc.circle(lx, cy - 1.2, 0.9, "F");
    doc.circle(lx, cy + 1.2, 0.9, "F");
  }

  // Central star/flower
  doc.setFillColor(200, 20, 20);
  doc.circle(cx, cy, 2.2, "F");
  doc.setFillColor(255, 200, 0);
  doc.circle(cx, cy, 1.2, "F");
}

/* ─── Helper: Inline bold writer ───────────────────────────────────────── */
// Draws segments of text with alternating normal/bold,
// segments = [{text, bold}], returns final x after all segments
function writeInlineSegments(
  doc: any,
  segments: { text: string; bold?: boolean }[],
  startX: number,
  y: number,
  fontSize: number
): number {
  let x = startX;
  for (const seg of segments) {
    doc.setFont("helvetica", seg.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const w = (doc.getStringUnitWidth(seg.text) * fontSize) / doc.internal.scaleFactor;
    doc.text(seg.text, x, y);
    x += w;
  }
  return x;
}

/* ─── Main Export: Diplôme Officiel (A4 Landscape) ──────────────────────── */
export async function generateLmdOfficialDiplomaPDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();   // 297 mm
  const ph = doc.internal.pageSize.getHeight();  // 210 mm

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, "F");

  // ─── 1. Ornamental border ────────────────────────────────────────────
  drawOrnamentalBorder(doc, pw, ph);

  const isMaster  = data.degree.title.toLowerCase().includes("master");
  const isDoctorat = data.degree.title.toLowerCase().includes("doctorat");

  const country    = (data.institution.countryName  || "REPUBLIQUE DU NIGER").toUpperCase();
  const ministry   = data.institution.ministryName  || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR, DE LA RECHERCHE ET DE L'INNOVATION";
  const school     = (data.institution.name         || "UNIVERSITE PRIVEE ENTENTE INTERNATIONALE").toUpperCase();
  const city       = data.institution.city          || "Niamey";
  const rectorName = data.institution.rectorName    || "";
  const dirName    = data.institution.directorGeneralName || "Le Directeur Général des Enseignements";
  const dipNum     = data.degree.diplomaNumber      || `${data.student.matricule || data.student.id}`;

  // ─── 2. Header ───────────────────────────────────────────────────────
  const hCX = pw / 2;

  // Left logo
  const logoX = 14, logoY = 12, logoSize = 24;
  if (data.institution.logo) {
    try { doc.addImage(data.institution.logo, "PNG", logoX, logoY, logoSize, logoSize); } catch (_) {}
  } else {
    doc.setDrawColor(0, 110, 0);
    doc.setLineWidth(0.7);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 0.5, "S");
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 3, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(0, 110, 0);
    doc.text("SCEAU", logoX + logoSize / 2, logoY + logoSize / 2 + 1, { align: "center" });
  }

  // Top-right ministry box
  const boxW = 52, boxH = 24;
  const boxX = pw - 14 - boxW, boxY = 12;
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(0.6);
  doc.rect(boxX, boxY, boxW, boxH, "S");
  if (data.institution.ministryLogo) {
    try { doc.addImage(data.institution.ministryLogo, "PNG", boxX + 2, boxY + 2, 14, 14); } catch (_) {}
  } else {
    // Niger emblem placeholder (gold circle with brown center)
    doc.setFillColor(200, 160, 0);
    doc.circle(boxX + 10, boxY + 9, 6.5, "F");
    doc.setFillColor(130, 80, 0);
    doc.circle(boxX + 10, boxY + 9, 3.5, "F");
  }
  const mlabel = data.institution.ministryLabel || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR\nDirection Générale de l'Enseignement";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.3);
  doc.setTextColor(20, 20, 20);
  mlabel.split("\n").forEach((line: string, i: number) => {
    doc.text(line, boxX + 19, boxY + 5 + i * 4.5);
  });
  // Diploma number big and bold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text(dipNum, boxX + boxW / 2, boxY + 19.5, { align: "center" });

  // Country
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text(country, hCX, 17, { align: "center" });

  // Ministry line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(40, 40, 40);
  doc.text(ministry.toUpperCase(), hCX, 21.5, { align: "center", maxWidth: 145 });

  // University name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(school, hCX, 28, { align: "center", maxWidth: 160 });

  // ─── 3. Full-width dark-green banner ─────────────────────────────────
  const bannerY = 31.5;
  const bannerH = 15;
  // Green filled rect full width (edge to edge inside border)
  doc.setFillColor(0, 100, 0);
  doc.rect(10, bannerY, pw - 20, bannerH, "F");
  // Gold border lines top/bottom
  doc.setDrawColor(180, 140, 0);
  doc.setLineWidth(1);
  doc.line(10, bannerY, pw - 10, bannerY);
  doc.line(10, bannerY + bannerH, pw - 10, bannerY + bannerH);

  // Gold title text – bigger font
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 215, 0);
  doc.text(
    `DIPLÔME DE ${data.degree.title.toUpperCase()}`,
    hCX,
    bannerY + 10.5,
    { align: "center" }
  );

  // ─── 4. VU Legal Clauses ─────────────────────────────────────────────
  let cY = bannerY + bannerH + 4;
  const clauseX    = 13;
  const clauseMaxW = pw - 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.setTextColor(20, 20, 20);

  const vuClauses = [
    "Vu la loi N° 98-12 du 1er Juin 1998, portant Orientation du Système Educatif Nigérien et les textes modifiants subséquents;",
    "Vu l'ordonnance N° 96-035 du 19 Juin 1996 portant réglementation de l'enseignement privé au Niger;",
    "Vu le décret N° 96-210/PCSN/MEN du 19 Juin 1996, fixant les modalités de l'application de l'ordonnance portant réglementation de l'enseignement privé au Niger;",
    "Vu le décret N° 2010-402/PCSRD/MESS/RS du 14 Mai 2010, portant institution du système Licence, Master et Doctorat LMD dans l'enseignement supérieur au Niger;",
    "Vu l'arrêté N° 00277/MEMS/SG/DGE/DES/DES/DEPRI du 22 Novembre 2012, portant création et organisation d'un cycle de formation conduisant aux diplômes de Master au sein des établissements privés d'enseignement supérieur;",
    "Vu l'arrêté N° 00105/MEMS/SG/DGE/DES/DES/DEPRI du 13 Mai 2013, fixant les conditions et modalités de délivrance des diplômes de Licence et Master professionnels par les établissements privés d'enseignement supérieur;",
    "Vu l'arrêté N° 092/MES/R/II/SG/DGE/DL/DESP/DESPRI du 28 Août 2017, portant autorisation de création de l'Université;",
    "Vu l'arrêté N° 118/MES/R/II/SG/DGE/DL/DESP/DESPRI du 04 Octobre 2017, portant autorisation d'ouverture de l'Université;",
    "Vu l'arrêté N° 163/MES/R/II/SG/DGE/DL/DESP/DESPRI du 19 décembre 2017, portant autorisation provisoire d'ouverture de nouvelles filières au sein de l'établissement privé d'enseignement supérieur dénommé « Université »;",
    "Vu la décision du Conseil Universitaire dans son assise en date du présent;",
  ];

  const lineH = 3.2;
  for (const clause of vuClauses) {
    const lines: string[] = doc.splitTextToSize(clause, clauseMaxW);
    if (cY + lines.length * lineH > 108) break; // safety – don't overflow into sig block
    doc.text(lines, clauseX, cY);
    cY += lines.length * lineH + 0.4;
  }

  // ─── 5. Laureate paragraph with selective Bold ────────────────────────
  cY += 1.5;
  const boxPadX = 3;
  const declFontSize = 9.5;

  // Build bold segments
  const fullName = `${(data.student.nom || "").toUpperCase()} ${(data.student.prenom || "").toUpperCase()}`.trim();
  const dob      = data.student.dateNaissance  || "01-01-2000";
  const pob      = data.student.lieuNaissance  || "Niamey";
  const nat      = data.student.nationalite    || "Nigériane";
  const mat      = data.student.matricule      || "N/A";
  const spec     = data.degree.specialization  || "Sciences";
  const faculty  = data.degree.fieldOfStudy    || "Faculté des Sciences";
  const mention  = data.degree.mention         || "Bien";
  const session  = data.degree.sessionName     || "2024-2025";
  const degTitle = data.degree.title           || "LICENCE";

  // We render the paragraph in a temp variable, then overlay bold words
  // Strategy: split into lines using normal text width, then re-render inline

  const para1 = `${fullName}, Né(e) le : ${dob} à ${pob}, Nationalité: ${nat}, Matricule : ${mat} a obtenu le Diplôme de ${degTitle} en ${spec}, dans la ${faculty} avec la mention générale: ${mention}, Session: ${session}.`;

  const paraLines: string[] = doc.splitTextToSize(para1, clauseMaxW - boxPadX * 2);
  const declBoxH = paraLines.length * 5.2 + 7;

  // Box
  doc.setFillColor(248, 252, 248);
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(clauseX, cY, clauseMaxW, declBoxH, 2, 2, "FD");

  // Render paragraph line by line — full normal first pass (for positioning)
  // then re-draw bold segments on top using inline segments approach
  // Simpler approach: detect key words and re-render them bold

  const boldWords = [fullName, spec, faculty, mention, `Diplôme de ${degTitle}`];

  let lineY = cY + 6;
  for (const line of paraLines) {
    // Split line into segments by bold words
    const segments: { text: string; bold?: boolean }[] = [];
    let remaining = line;
    let placed = false;

    for (const bw of boldWords) {
      const idx = remaining.indexOf(bw);
      if (idx !== -1) {
        if (idx > 0) segments.push({ text: remaining.substring(0, idx) });
        segments.push({ text: bw, bold: true });
        remaining = remaining.substring(idx + bw.length);
        placed = true;
        break;
      }
    }
    if (!placed) segments.push({ text: remaining });
    else if (remaining.length > 0) segments.push({ text: remaining });

    writeInlineSegments(doc, segments, clauseX + boxPadX, lineY, declFontSize);
    lineY += 5.2;
  }

  cY += declBoxH + 3;

  // ─── 6. Signatures block + seals ─────────────────────────────────────
  const sigY = cY + 1;

  // Left: L'impétrant
  const col1X = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(10, 10, 10);
  doc.text("L'impétrant:", col1X, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature............", col1X, sigY + 7.5);

  // Center: Recteur / Président du Conseil
  const col2X = pw / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(10, 10, 10);
  doc.text("Le Recteur /", col2X, sigY, { align: "center" });
  doc.text("Président du Conseil", col2X, sigY + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature...............................", col2X, sigY + 11, { align: "center" });
  if (rectorName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.text(rectorName, col2X, sigY + 17, { align: "center" });
  }

  // Right: Fait à + P. Le Ministre PO
  const col3X = pw - 18;
  const dateStr = data.degree.deliberationDate ||
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(10, 10, 10);
  doc.text(`Fait à ${city}, le ${dateStr}`, col3X, sigY, { align: "right" });
  doc.text("P. Le Ministre PO.", col3X, sigY + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature......................", col3X, sigY + 14, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(dirName, col3X, sigY + 20, { align: "right" });
  // Director signature line underline
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(col3X - 52, sigY + 26, col3X, sigY + 26);

  // ─── 7. Seals (gold + blue, well-separated) ───────────────────────────
  const sealBaseY = sigY + 6;

  // Gold round seal (center-right of middle)
  const goldCX = pw / 2 + 12;
  const goldCY = sealBaseY + 8;
  const goldR  = 12;
  // Outer ring
  doc.setFillColor(218, 165, 32);
  doc.circle(goldCX, goldCY, goldR, "F");
  doc.setDrawColor(150, 100, 0);
  doc.setLineWidth(0.8);
  doc.circle(goldCX, goldCY, goldR, "S");
  // Inner ring
  doc.setFillColor(200, 145, 10);
  doc.circle(goldCX, goldCY, goldR - 3, "F");
  // Core dark
  doc.setFillColor(120, 80, 0);
  doc.circle(goldCX, goldCY, 4.5, "F");
  // Text on gold seal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.5);
  doc.setTextColor(80, 40, 0);
  const abbrev = (data.institution.name || "UPEI").split(" ").map((w: string) => w[0]).join("").substring(0, 5);
  doc.text(abbrev, goldCX, goldCY - 7.2, { align: "center" });
  doc.text(city.toUpperCase(), goldCX, goldCY + 9, { align: "center" });

  // Blue university stamp (center-left of middle)
  const blueCX = pw / 2 - 14;
  const blueCY = sealBaseY + 8;
  const blueR  = 11;
  doc.setDrawColor(0, 70, 150);
  doc.setLineWidth(0.9);
  doc.circle(blueCX, blueCY, blueR, "S");
  doc.circle(blueCX, blueCY, blueR - 2.5, "S");
  // Thin fill for readability
  doc.setFillColor(240, 245, 255);
  doc.circle(blueCX, blueCY, blueR - 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.2);
  doc.setTextColor(0, 60, 140);
  const shortName = (data.institution.name || "UNIVERSITÉ PRIVÉE").split(" ").slice(0, 3).join(" ");
  doc.text(shortName, blueCX, blueCY - 4, { align: "center", maxWidth: blueR * 2 - 4 });
  doc.text(city.toUpperCase(), blueCX, blueCY + 6, { align: "center" });

  // ─── 8. Decorative central ornament below seals ───────────────────────
  const ornCX = pw / 2 - 1;
  const ornCY  = sealBaseY + 22;
  drawCentralOrnament(doc, ornCX, ornCY);

  // ─── 9. QR Code bottom-left ───────────────────────────────────────────
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro";
  const verifUrl = `${appUrl}/verify/${encodeURIComponent(data.student.matricule || String(data.student.id))}`;
  const qrY = ph - 32;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 128 });
    doc.addImage(qrDataUrl, "PNG", clauseX, qrY, 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(40, 40, 40);
    doc.text("Veuillez visiter ce lien pour vérification", clauseX + 23, qrY + 6);
    doc.text("de l'authenticité du document:", clauseX + 23, qrY + 10);
    doc.setTextColor(0, 80, 180);
    doc.setFontSize(5.5);
    doc.text(verifUrl, clauseX + 23, qrY + 14.5);
  } catch (_) {}

  // ─── Save ─────────────────────────────────────────────────────────────
  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Diplome_Officiel_${data.degree.title}_${cleanNom}.pdf`);
}

/* ─── Attestation Provisoire de Réussite (A4 Portrait) ─────────────────── */
export async function generateLmdAttestationReussitePDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, "F");

  // Border
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(3);
  doc.rect(5, 5, pw - 10, ph - 10, "S");
  doc.setLineWidth(0.7);
  doc.rect(9, 9, pw - 18, ph - 18, "S");
  doc.setFillColor(0, 110, 0);
  const step2 = 3.5;
  for (let x = 10; x <= pw - 10; x += step2) {
    doc.circle(x, 7, 0.55, "F");
    doc.circle(x, ph - 7, 0.55, "F");
  }
  for (let y = 10; y <= ph - 10; y += step2) {
    doc.circle(7, y, 0.55, "F");
    doc.circle(pw - 7, y, 0.55, "F");
  }

  const country  = (data.institution.countryName || "REPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution.ministryName  || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR, DE LA RECHERCHE ET DE L'INNOVATION";
  const school   = (data.institution.name         || "UNIVERSITÉ PRIVÉE ENTENTE INTERNATIONALE").toUpperCase();
  const city     = data.institution.city          || "Niamey";
  const dirName  = data.institution.directorGeneralName || "Le Directeur Général des Enseignements";
  const hCX = pw / 2;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text(country, hCX, 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(40, 40, 40);
  doc.text(ministry.toUpperCase(), hCX, 23, { align: "center", maxWidth: pw - 40 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(school, hCX, 30, { align: "center", maxWidth: pw - 30 });

  // Banner
  const bannerY2 = 34;
  doc.setFillColor(0, 100, 0);
  doc.rect(10, bannerY2, pw - 20, 14, "F");
  doc.setDrawColor(180, 140, 0);
  doc.setLineWidth(1);
  doc.line(10, bannerY2, pw - 10, bannerY2);
  doc.line(10, bannerY2 + 14, pw - 10, bannerY2 + 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 215, 0);
  doc.text(`ATTESTATION DE RÉUSSITE – DIPLÔME DE ${data.degree.title.toUpperCase()}`, hCX, bannerY2 + 9.5, {
    align: "center",
    maxWidth: pw - 24,
  });

  // Declaration
  let bY = 56;
  const bX  = 13;
  const bW  = pw - 26;

  const fullName2 = `${(data.student.nom || "").toUpperCase()} ${(data.student.prenom || "").toUpperCase()}`.trim();
  const dob2  = data.student.dateNaissance || "01/01/2000";
  const pob2  = data.student.lieuNaissance || "Niamey";
  const nat2  = data.student.nationalite   || "Nigériane";
  const mat2  = data.student.matricule     || "N/A";
  const spec2 = data.degree.specialization || "Sciences";
  const fac2  = data.degree.fieldOfStudy   || "Faculté";
  const men2  = data.degree.mention        || "Bien";
  const ses2  = data.degree.sessionName    || "2024-2025";
  const deg2  = data.degree.title          || "LICENCE";

  const preamble = "Le Doyen de la Faculté et le Président du Jury d'Examen soussignés certifient que :";
  const para2 = `${fullName2}, Né(e) le : ${dob2} à ${pob2}, Nationalité: ${nat2}, Matricule : ${mat2} a obtenu le Diplôme de ${deg2} en ${spec2}, dans la ${fac2} avec la mention générale: ${men2}, Session: ${ses2}.`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(preamble, bX, bY);
  bY += 6;

  const paraLines2: string[] = doc.splitTextToSize(para2, bW - 6);
  const declH2 = paraLines2.length * 5.5 + 7;

  doc.setFillColor(248, 252, 248);
  doc.setDrawColor(0, 110, 0);
  doc.setLineWidth(0.6);
  doc.roundedRect(bX, bY, bW, declH2, 2, 2, "FD");

  const boldWords2 = [fullName2, spec2, fac2, men2, `Diplôme de ${deg2}`];
  let lineY2 = bY + 6;
  for (const line of paraLines2) {
    const segments2: { text: string; bold?: boolean }[] = [];
    let remaining2 = line;
    let placed2 = false;
    for (const bw of boldWords2) {
      const idx = remaining2.indexOf(bw);
      if (idx !== -1) {
        if (idx > 0) segments2.push({ text: remaining2.substring(0, idx) });
        segments2.push({ text: bw, bold: true });
        remaining2 = remaining2.substring(idx + bw.length);
        placed2 = true;
        break;
      }
    }
    if (!placed2) segments2.push({ text: remaining2 });
    else if (remaining2.length > 0) segments2.push({ text: remaining2 });
    writeInlineSegments(doc, segments2, bX + 3, lineY2, 9.5);
    lineY2 += 5.5;
  }
  bY += declH2 + 5;

  // Legal note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "La présente attestation est délivrée en un seul exemplaire en attendant l'établissement du diplôme définitif.",
    hCX, bY, { align: "center", maxWidth: bW }
  );
  bY += 10;

  // Signatures
  const dateStr2 = data.degree.deliberationDate ||
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(10, 10, 10);
  doc.text("Le Doyen de la Faculté", bX, bY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature et Cachet Officiel", bX, bY + 6);
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  doc.line(bX, bY + 18, bX + 55, bY + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Fait à ${city}, le ${dateStr2}`, pw - bX, bY, { align: "right" });
  doc.text("P. Le Ministre PO.", pw - bX, bY + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature......................", pw - bX, bY + 14, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(dirName, pw - bX, bY + 20, { align: "right" });
  doc.setDrawColor(100, 100, 100);
  doc.line(pw - bX - 55, bY + 26, pw - bX, bY + 26);
  bY += 30;

  // QR Code
  const appUrl2   = process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro";
  const verifUrl2 = `${appUrl2}/verify/${encodeURIComponent(data.student.matricule || String(data.student.id))}`;
  try {
    const qrDataUrl2 = await QRCode.toDataURL(verifUrl2, { margin: 1, width: 100 });
    doc.addImage(qrDataUrl2, "PNG", bX, bY, 22, 22);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text("Veuillez visiter ce lien pour vérification", bX + 25, bY + 7);
    doc.text("de l'authenticité du document:", bX + 25, bY + 11.5);
    doc.setTextColor(0, 80, 180);
    doc.text(verifUrl2, bX + 25, bY + 16);
  } catch (_) {}

  const cleanNom2 = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Reussite_${data.degree.title}_${cleanNom2}.pdf`);
}
