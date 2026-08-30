/**
 * Official University Degree Generator – Diplôme de Licence / Master / Doctorat
 * Layout conforme au modèle REESAO / Ministère de l'Enseignement Supérieur Niger
 * Includes: Ornamental border, Legal VU clauses, 3-signature block, Official Seal,
 *           Ministry registration number box, QR verification code.
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
    title: string;           // "LICENCE" | "MASTER" | "DOCTORAT"
    specialization: string;  // "Charia et Études Islamiques"
    fieldOfStudy: string;    // "Faculté des Sciences Islamiques, Juridiques et Politiques"
    mention: string;         // "Très Bien" | "Bien" | "Assez Bien" | "Passable"
    finalGradeAverage: number;
    totalCreditsAcquired: number;
    sessionName: string;     // "2024-2025"
    deliberationDate?: string;
    diplomaNumber?: string;  // "16188"
  };
  institution: {
    name?: string;           // "UNIVERSITÉ PRIVÉE ENTENTE INTERNATIONALE"
    countryName?: string;    // "REPUBLIQUE DU NIGER"
    ministryName?: string;
    ministryLabel?: string;  // Label in top-right box
    facultyName?: string;
    rectorName?: string;
    deanName?: string;
    directorGeneralName?: string;
    city?: string;           // "Niamey"
    logo?: string;           // base64 data URL of university seal/logo
    ministryLogo?: string;   // base64 data URL of ministry emblem
  };
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */

function drawOrnamentalBorder(doc: any, pw: number, ph: number) {
  // Outer thick green border
  doc.setDrawColor(34, 120, 34);
  doc.setLineWidth(2.5);
  doc.rect(6, 6, pw - 12, ph - 12, "S");

  // Inner thin green border
  doc.setLineWidth(0.6);
  doc.rect(9, 9, pw - 18, ph - 18, "S");

  // Between the two borders: repeating ornamental chain pattern
  // We draw small diamond dots along each edge
  doc.setFillColor(34, 120, 34);
  const step = 4;

  // Top & Bottom chains
  for (let x = 10; x <= pw - 10; x += step) {
    doc.circle(x, 7.5, 0.5, "F");
    doc.circle(x, ph - 7.5, 0.5, "F");
  }
  // Left & Right chains
  for (let y = 10; y <= ph - 10; y += step) {
    doc.circle(7.5, y, 0.5, "F");
    doc.circle(pw - 7.5, y, 0.5, "F");
  }

  // Corner floral ornaments (4 corners) – concentric circles + cross
  const corners = [
    [12, 12], [pw - 12, 12], [12, ph - 12], [pw - 12, ph - 12]
  ];
  for (const [cx, cy] of corners) {
    doc.setDrawColor(34, 120, 34);
    doc.setLineWidth(0.6);
    doc.circle(cx, cy, 4.5, "S");
    doc.circle(cx, cy, 2.5, "S");
    doc.setFillColor(34, 120, 34);
    doc.circle(cx, cy, 0.9, "F");
    doc.setLineWidth(0.4);
    doc.line(cx - 6, cy, cx + 6, cy);
    doc.line(cx, cy - 6, cx, cy + 6);
  }
}

function drawOfficialSeal(doc: any, cx: number, cy: number, label: string, sublabel: string) {
  // Gold round seal with text
  doc.setDrawColor(180, 140, 0);
  doc.setLineWidth(0.8);
  doc.circle(cx, cy, 13, "S");
  doc.circle(cx, cy, 10.5, "S");
  doc.setFillColor(255, 215, 0);
  doc.circle(cx, cy, 10.4, "F");

  // Inner dark ring
  doc.setFillColor(140, 100, 0);
  doc.circle(cx, cy, 5, "F");

  // Text on seal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.8);
  doc.setTextColor(100, 70, 0);
  doc.text(label, cx, cy - 7.5, { align: "center" });
  doc.text(sublabel, cx, cy + 9, { align: "center" });
}

function splitAndWrite(
  doc: any,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options?: { align?: string }
): number {
  const lines: string[] = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string, i: number) => {
    doc.text(line, x, y + i * lineHeight, options);
  });
  return y + lines.length * lineHeight;
}

/* ─── Main Export ─────────────────────────────────────────────────────── */

export async function generateLmdOfficialDiplomaPDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  // A4 Landscape: 297 × 210 mm
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();   // 297
  const ph = doc.internal.pageSize.getHeight();  // 210

  // ─── 0. White background ───────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, "F");

  // ─── 1. Ornamental green border ────────────────────────────────────────
  drawOrnamentalBorder(doc, pw, ph);

  const isMaster = data.degree.title.toLowerCase().includes("master");
  const isDoctorat = data.degree.title.toLowerCase().includes("doctorat");
  const targetCredits = isDoctorat ? 180 : isMaster ? 120 : 180;

  const country = (data.institution.countryName || "REPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution.ministryName ||
    "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR, DE LA RECHERCHE ET DE L'INNOVATION";
  const school = (data.institution.name || "UNIVERSITE PRIVEE ENTENTE INTERNATIONALE").toUpperCase();
  const city = data.institution.city || "Niamey";
  const rectorName = data.institution.rectorName || "Le Recteur";
  const directorName = data.institution.directorGeneralName || "Le Directeur Général des Enseignements";

  // ─── 2. Header: Republic / Ministry / University (center) ─────────────
  // Left logo placeholder (university seal)
  const logoX = 16, logoY = 13, logoSize = 22;
  if (data.institution.logo) {
    doc.addImage(data.institution.logo, "PNG", logoX, logoY, logoSize, logoSize);
  } else {
    // Draw placeholder seal
    doc.setDrawColor(34, 120, 34);
    doc.setLineWidth(0.6);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 - 1, "S");
    doc.setFontSize(4.5);
    doc.setTextColor(34, 120, 34);
    doc.setFont("helvetica", "bold");
    doc.text("SCEAU", logoX + logoSize / 2, logoY + logoSize / 2, { align: "center" });
  }

  // Top-right Ministry box
  const boxW = 55, boxH = 22;
  const boxX = pw - 16 - boxW, boxY = 13;
  doc.setDrawColor(34, 120, 34);
  doc.setLineWidth(0.6);
  doc.rect(boxX, boxY, boxW, boxH, "S");
  if (data.institution.ministryLogo) {
    doc.addImage(data.institution.ministryLogo, "PNG", boxX + 2, boxY + 2, 12, 12);
  } else {
    // Mini emblem placeholder
    doc.setFillColor(200, 160, 0);
    doc.circle(boxX + 9, boxY + 8, 5, "F");
  }
  const ministryLabel = data.institution.ministryLabel || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR\nDirection Générale de l'Enseignement";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(30, 30, 30);
  const mlLines = ministryLabel.split("\n");
  mlLines.forEach((line, i) => doc.text(line, boxX + 16, boxY + 5 + i * 5));
  // Diploma number
  const dipNum = data.degree.diplomaNumber || `DIP-${data.student.id}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(dipNum, boxX + boxW / 2, boxY + 17, { align: "center" });

  // Center header text
  const headerCX = pw / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 15, 15);
  doc.text(country, headerCX, 17, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(40, 40, 40);
  doc.text(ministry.toUpperCase(), headerCX, 21.5, { align: "center", maxWidth: 150 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  doc.text(school, headerCX, 28, { align: "center" });

  // ─── 3. Diploma Title Banner (dark green gradient) ─────────────────────
  const titleBannerY = 33;
  // Background fill
  doc.setFillColor(0, 100, 0);
  doc.rect(16, titleBannerY, pw - 32, 12, "F");
  // Gold accent lines top & bottom
  doc.setDrawColor(180, 140, 0);
  doc.setLineWidth(0.8);
  doc.line(16, titleBannerY, pw - 16, titleBannerY);
  doc.line(16, titleBannerY + 12, pw - 16, titleBannerY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 215, 0); // Gold text
  doc.text(
    `DIPLÔME DE ${data.degree.title.toUpperCase()}`,
    headerCX,
    titleBannerY + 8.5,
    { align: "center" }
  );

  // ─── 4. Legal VU clauses ───────────────────────────────────────────────
  let cY = 51;
  const clauseX = 16;
  const clauseMaxW = pw - 32;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
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
    "Vu la décision du Conseil Universitaire dans son assise en date du présent;",
  ];

  for (const clause of vuClauses) {
    const lines: string[] = doc.splitTextToSize(clause, clauseMaxW);
    doc.text(lines, clauseX, cY);
    cY += lines.length * 3.5;
    if (cY > 100) break; // safety guard
  }

  cY += 1.5;

  // ─── 5. Main laureate declaration paragraph ────────────────────────────
  const fullName = `${(data.student.nom || "").toUpperCase()} ${(data.student.prenom || "").toUpperCase()}`.trim();
  const dob = data.student.dateNaissance || "01-01-2000";
  const pob = data.student.lieuNaissance || "Niamey";
  const nat = data.student.nationalite || "Nigériane";
  const mat = data.student.matricule || "N/A";
  const spec = data.degree.specialization || "Sciences";
  const faculty = data.degree.fieldOfStudy || "Faculté des Sciences";
  const mention = data.degree.mention || "Bien";
  const session = data.degree.sessionName || "2024-2025";

  // Paragraph with mixed bold inline (simulate with two calls)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 15, 15);

  const declarationText =
    `${fullName}, Né(e) le : ${dob} à ${pob}, Nationalité: ${nat}, Matricule : ${mat} a obtenu ` +
    `le Diplôme de ${data.degree.title} en ${spec}, dans la ${faculty} ` +
    `avec la mention générale: ${mention}, Session: ${session}.`;

  // We render as wrapped text, then re-render the key parts bold
  const declLines: string[] = doc.splitTextToSize(declarationText, clauseMaxW);

  // Background highlight box for declaration
  const declBoxH = declLines.length * 5 + 6;
  doc.setFillColor(240, 248, 240);
  doc.setDrawColor(34, 120, 34);
  doc.setLineWidth(0.4);
  doc.roundedRect(clauseX, cY, clauseMaxW, declBoxH, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(15, 15, 15);
  declLines.forEach((line: string, i: number) => {
    doc.text(line, clauseX + 3, cY + 5 + i * 5);
  });

  cY += declBoxH + 3;

  // ─── 6. Signatures block ───────────────────────────────────────────────
  const sigY = cY + 2;
  const sigLineLen = 40;

  // Left: L'impétrant (laureate)
  const col1X = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 15, 15);
  doc.text("L'impétrant:", col1X, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature............", col1X, sigY + 7);

  // Center: Recteur / Président du Conseil
  const col2X = pw / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Le Recteur /", col2X, sigY - 1, { align: "center" });
  doc.text("Président du Conseil", col2X, sigY + 4, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature..........................", col2X, sigY + 11, { align: "center" });

  // Rector name
  if (data.institution.rectorName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(20, 20, 20);
    doc.text(data.institution.rectorName, col2X, sigY + 17, { align: "center" });
  }

  // Right block: Fait à + P.Le Ministre PO. / Le Directeur Général
  const col3X = pw - 22;
  const dateStr = data.degree.deliberationDate ||
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 15, 15);
  doc.text(`Fait à ${city}, le ${dateStr}`, col3X, sigY - 1, { align: "right" });
  doc.text("P. Le Ministre PO.", col3X, sigY + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature.......................", col3X, sigY + 12, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(directorName, col3X, sigY + 18, { align: "right" });

  // ─── 7. Official Seals ─────────────────────────────────────────────────
  // Central round ornamental gold seal
  const sealY = sigY + 8;
  drawOfficialSeal(doc, pw / 2, sealY, school.substring(0, 10), city.toUpperCase());

  // University circular stamp (blue, lower center)
  const stampCX = pw / 2 - 30;
  const stampCY = sealY + 3;
  doc.setDrawColor(0, 80, 160);
  doc.setLineWidth(0.7);
  doc.circle(stampCX, stampCY, 10, "S");
  doc.circle(stampCX, stampCY, 8, "S");
  doc.setFontSize(4.2);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 80, 160);
  doc.text(school.substring(0, 15), stampCX, stampCY - 3, { align: "center" });
  doc.text(city.toUpperCase(), stampCX, stampCY + 5.5, { align: "center" });

  // ─── 8. QR Code bottom-left ────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro";
  const verifUrl = `${appUrl}/verify/${encodeURIComponent(data.student.matricule || String(data.student.id))}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 120 });
    doc.addImage(qrDataUrl, "PNG", clauseX, ph - 28, 18, 18);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Veuillez visiter ce lien pour vérification", clauseX + 20, ph - 24);
    doc.text("de l'authenticité du document:", clauseX + 20, ph - 20.5);
    doc.setTextColor(0, 80, 180);
    doc.text(verifUrl, clauseX + 20, ph - 17);
  } catch (_e) {}

  // ─── 9. Save ───────────────────────────────────────────────────────────
  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Diplome_Officiel_${data.degree.title}_${cleanNom}.pdf`);
}

/* ─── Attestation Provisoire de Réussite ─────────────────────────────── */

export async function generateLmdAttestationReussitePDF(data: LmdDiplomaParams): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, "F");

  // Green ornamental border (portrait)
  doc.setDrawColor(34, 120, 34);
  doc.setLineWidth(2.5);
  doc.rect(6, 6, pw - 12, ph - 12, "S");
  doc.setLineWidth(0.6);
  doc.rect(9, 9, pw - 18, ph - 18, "S");

  // Chain dots
  doc.setFillColor(34, 120, 34);
  const step = 4;
  for (let x = 10; x <= pw - 10; x += step) {
    doc.circle(x, 7.5, 0.5, "F");
    doc.circle(x, ph - 7.5, 0.5, "F");
  }
  for (let y = 10; y <= ph - 10; y += step) {
    doc.circle(7.5, y, 0.5, "F");
    doc.circle(pw - 7.5, y, 0.5, "F");
  }

  const country = (data.institution.countryName || "REPUBLIQUE DU NIGER").toUpperCase();
  const ministry = data.institution.ministryName || "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR, DE LA RECHERCHE ET DE L'INNOVATION";
  const school = (data.institution.name || "UNIVERSITÉ PRIVÉE ENTENTE INTERNATIONALE").toUpperCase();
  const city = data.institution.city || "Niamey";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  doc.text(country, pw / 2, 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(50, 50, 50);
  doc.text(ministry.toUpperCase(), pw / 2, 23, { align: "center", maxWidth: pw - 40 });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 15, 15);
  doc.text(school, pw / 2, 30, { align: "center", maxWidth: pw - 30 });

  // Title Banner
  doc.setFillColor(0, 100, 0);
  doc.rect(13, 36, pw - 26, 13, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 215, 0);
  doc.text(`ATTESTATION DE RÉUSSITE – DIPLÔME DE ${data.degree.title.toUpperCase()}`, pw / 2, 44.5, {
    align: "center",
    maxWidth: pw - 30,
  });

  // Body
  let bY = 58;
  const bX = 14;
  const bW = pw - 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);

  const fullName = `${(data.student.nom || "").toUpperCase()} ${(data.student.prenom || "").toUpperCase()}`.trim();
  const spec = data.degree.specialization;
  const faculty = data.degree.fieldOfStudy;
  const mention = data.degree.mention;
  const session = data.degree.sessionName;
  const dob = data.student.dateNaissance || "";
  const pob = data.student.lieuNaissance || "";
  const nat = data.student.nationalite || "";
  const mat = data.student.matricule || "N/A";
  const ectsGrade = getEctsGrade(data.degree.finalGradeAverage);

  const declaration =
    `Le Doyen de la Faculté et le Président du Jury d'Examen soussignés certifient que :\n\n` +
    `${fullName}, Né(e) le : ${dob} à ${pob}, Nationalité: ${nat}, Matricule : ${mat} a obtenu le ` +
    `Diplôme de ${data.degree.title} en ${spec}, dans la ${faculty}, ` +
    `avec la mention générale: ${mention} (Grade ECTS: ${ectsGrade.grade}), ` +
    `Moyenne: ${data.degree.finalGradeAverage.toFixed(2)}/20, Session: ${session}.`;

  const declLines: string[] = doc.splitTextToSize(declaration, bW - 6);
  doc.setFillColor(240, 248, 240);
  doc.setDrawColor(34, 120, 34);
  doc.setLineWidth(0.4);
  const declH = declLines.length * 5.5 + 10;
  doc.roundedRect(bX, bY, bW, declH, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 15, 15);
  declLines.forEach((line: string, i: number) => {
    doc.text(line, bX + 3, bY + 7 + i * 5.5);
  });

  bY += declH + 6;

  // Legal note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(
    "La présente attestation est délivrée en un seul exemplaire en attendant l'établissement du diplôme définitif.",
    pw / 2,
    bY,
    { align: "center", maxWidth: bW }
  );

  bY += 10;

  // Signatures
  const dateStr = data.degree.deliberationDate ||
    new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 15, 15);
  doc.text("Le Doyen de la Faculté", bX, bY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Signature et Cachet Officiel", bX, bY + 5.5);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(bX, bY + 18, bX + 55, bY + 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 15, 15);
  doc.text(`Fait à ${city}, le ${dateStr}`, pw - bX, bY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Le Président du Jury", pw - bX, bY + 6, { align: "right" });
  doc.text("Signature et Cachet Officiel", pw - bX, bY + 11, { align: "right" });
  doc.setDrawColor(150, 150, 150);
  doc.line(pw - bX - 55, bY + 18, pw - bX, bY + 18);

  bY += 24;

  // QR Code
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://niger.edut.pro";
  const verifUrl = `${appUrl}/verify/${encodeURIComponent(data.student.matricule || String(data.student.id))}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 100 });
    doc.addImage(qrDataUrl, "PNG", bX, bY, 22, 22);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Scannez pour vérifier l'authenticité du document", bX + 25, bY + 8);
    doc.setTextColor(0, 80, 180);
    doc.text(verifUrl, bX + 25, bY + 13);
    doc.setTextColor(80, 80, 80);
    doc.text(`Réf : ATT-${data.student.matricule || data.student.id}-${session}`, bX + 25, bY + 18);
  } catch (_e) {}

  const cleanNom = (data.student.nom || "Etudiant").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Attestation_Reussite_${data.degree.title}_${cleanNom}.pdf`);
}
