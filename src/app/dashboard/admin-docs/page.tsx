"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";
import {
  FileText,
  ArrowLeft,
  Search,
  Download,
  Printer,
  User,
  IdCard,
  BookOpen,
  BarChart3,
  Award,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  ShieldCheck,
  CalendarClock,
  UserCheck,
  MessageCircle,
  Moon,
  Sun,
  Share2,
  Copy,
  Filter,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Stamp,
  QrCode,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ensureAmiriRegistered(doc: jsPDF) {
  try {
    const fontList = doc.getFontList();
    if (!fontList["Amiri"]) {
      if (amiriFontBase64) {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      }
    }
  } catch (e) {
    console.warn("Failed to check or register Amiri font in admin-docs:", e);
  }
}

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
    doc.setFont("Amiri", "normal");
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

function drawPDFHeader(
  doc: jsPDF,
  headerConfig: any,
  title: string
): number {
  const style = headerConfig?.style || "classic_dual_logo";
  const schoolName = headerConfig?.schoolName || "ÉCOLE EXCELLENCE";
  const address = headerConfig?.address || "";
  const phone = headerConfig?.phone || "";
  const email = headerConfig?.email || "";
  const registrationNo = headerConfig?.registrationNo || "";
  const schoolYear = headerConfig?.schoolYear || "";
  const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
  const service = headerConfig?.service || "Service de la Scolarité";
  const bp = headerConfig?.bp || "";
  const motto = headerConfig?.motto || "";
  
  const leftLogo = headerConfig?.leftLogo || "";
  const rightLogo = headerConfig?.rightLogo || leftLogo;
  const centerLogo = headerConfig?.centerLogo || leftLogo;

  const W = doc.internal.pageSize.getWidth();
  const margin = 10;
  const rightX = W - margin;
  const centerX = W / 2;

  if (style === "modern_card") {
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, 8, W - 2 * margin, 26, 2, 2, "F");
    
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin + 4, 11, 20, 20);
      } catch (e) {}
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    drawWrappedText(doc, schoolName, margin + 28, 17, W - 2 * margin - 38, "left");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(220, 225, 255);
    drawWrappedText(doc, `Année Scolaire: ${schoolYear}`, margin + 28, 23, W - 2 * margin - 38, "left");
    drawWrappedText(doc, `${address} ${phone ? '| Tél: ' + phone : ''}`, margin + 28, 28, W - 2 * margin - 38, "left");
    
    doc.setTextColor(0, 0, 0);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, 44, W - 2 * margin, "center");
      return 52;
    }
    return 38;
  }
  
  if (style === "bilingual_center_logo") {
    if (centerLogo) {
      try {
        doc.addImage(centerLogo, 'PNG', centerX - 13, 8, 26, 26);
      } catch (e) {}
    }
    
    const leftLines = [
      headerConfig?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || "",
      headerConfig?.departmentalDirection || "",
      headerConfig?.inspection || "",
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
    ].filter(Boolean);

    const colWidth = centerLogo ? (centerX - margin - 15) : (centerX - margin - 4);
    
    let leftY = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    for (const line of leftLines) {
      const height = drawWrappedText(doc, line, margin, leftY, colWidth, "left");
      leftY += height + 0.5;
    }
    
    let rightY = 12;
    for (const line of rightLines) {
      const height = drawWrappedText(doc, line, rightX, rightY, colWidth, "right");
      rightY += height + 0.5;
    }
    
    const maxY = Math.max(leftY, rightY);
    doc.setLineWidth(0.5);
    doc.line(margin, maxY + 2, rightX, maxY + 2);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, maxY + 12, W - 2 * margin, "center");
      return maxY + 18;
    }
    return maxY + 4;
  }
  
  if (style === "university_formal") {
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin, 8, 22, 22);
      } catch (e) {}
    }
    if (rightLogo) {
      try {
        doc.addImage(rightLogo, 'PNG', rightX - 22, 8, 22, 22);
      } catch (e) {}
    }
    
    const centerLines = [
      headerConfig?.country || "REPUBLIQUE DU NIGER",
      schoolName,
      service,
      [bp && `BP : ${bp}`, address, phone && `Tél. ${phone}`].filter(Boolean).join(" | "),
      email ? `Email : ${email}` : "",
      registrationNo ? `Agrément N°: ${registrationNo}` : "",
    ].filter(Boolean);

    let centerY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const height0 = drawWrappedText(doc, centerLines[0].toUpperCase(), centerX, centerY, W - 2 * margin - 50, "center");
    centerY += height0 + 1;
    
    doc.setFontSize(12);
    const height1 = drawWrappedText(doc, centerLines[1], centerX, centerY, W - 2 * margin - 50, "center");
    centerY += height1 + 1;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    for (let i = 2; i < centerLines.length; i++) {
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
    }
    
    const finalY = Math.max(centerY + 3, 32);
    doc.setLineWidth(0.5);
    doc.line(margin, finalY, rightX, finalY);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
      return finalY + 18;
    }
    return finalY + 2;
  }
  
  if (style === "minimal_administrative") {
    if (centerLogo || leftLogo) {
      try {
        doc.addImage(centerLogo || leftLogo, 'PNG', rightX - 22, 8, 22, 22);
      } catch (e) {}
    }
    
    const leftLines = [
      schoolName,
      headerConfig?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      headerConfig?.regionalDirection || "",
      headerConfig?.inspection || "",
      registrationNo ? `Agrément: ${registrationNo}` : "",
      [address, phone && `Tél: ${phone}`].filter(Boolean).join(" | "),
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    let leftY = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const height0 = drawWrappedText(doc, leftLines[0], margin, leftY, W - 2 * margin - 25, "left");
    leftY += height0 + 1;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (let i = 1; i < leftLines.length; i++) {
      const height = drawWrappedText(doc, leftLines[i], margin, leftY, W - 2 * margin - 25, "left");
      leftY += height + 0.5;
    }
    
    const finalY = Math.max(leftY + 3, 32);
    doc.setLineWidth(0.3);
    doc.line(margin, finalY, rightX, finalY);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
      return finalY + 18;
    }
    return finalY + 2;
  }
  
  // DEFAULT / CLASSIC DUAL LOGO
  if (leftLogo) {
    try {
      doc.addImage(leftLogo, 'PNG', margin, 8, 22, 22);
    } catch (e) {}
  }
  if (rightLogo && rightLogo !== leftLogo) {
    try {
      doc.addImage(rightLogo, 'PNG', rightX - 22, 8, 22, 22);
    } catch (e) {}
  }
  
  const centerLines = [
    schoolName,
    motto ? `"${motto}"` : "",
    [registrationNo && `Agrément: ${registrationNo}`, `Niveau: Secondaire`].filter(Boolean).join(" | "),
    `Année Scolaire: ${schoolYear}`,
    [phone && `Tél: ${phone}`, email && `Email: ${email}`].filter(Boolean).join(" | "),
    address ? `Adresse: ${address}` : "",
  ].filter(Boolean);

  let centerY = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const height0 = drawWrappedText(doc, centerLines[0], centerX, centerY, W - 2 * margin - 50, "center");
  centerY += height0 + 1;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < centerLines.length; i++) {
    if (i === 1 && motto) {
      doc.setFont("helvetica", "italic");
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
      doc.setFont("helvetica", "normal");
    } else {
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - 50, "center");
      centerY += height + 0.5;
    }
  }
  
  const finalY = Math.max(centerY + 3, 32);
  doc.setLineWidth(0.5);
  doc.line(margin, finalY, rightX, finalY);
  
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    drawWrappedText(doc, title.toUpperCase(), centerX, finalY + 12, W - 2 * margin, "center");
    return finalY + 18;
  }
  return finalY + 2;
}

// Mock database for students & staff
const mockStudents = [
  { id: "STD-2026-0104", name: "BOUBACAR ISSA", class: "3ème M1", dob: "22/11/2010", pob: "Zinder", year: "2025 / 2026", level: "Moyen", sector: "Public", gpa: "14.50 / 20", mention: "Bien", status: "PROMU(E) – ADMIS(E) AVEC MENTION BIEN", regDate: "15/09/2025" },
  { id: "STD-2026-0091", name: "ALI MOCTAR", class: "6ème A", dob: "12/04/2012", pob: "Niamey", year: "2025 / 2026", level: "Secondaire", sector: "Public", gpa: "16.80 / 20", mention: "Très Bien", status: "PROMU(E) – ADMIS(E) AVEC MENTION TRÈS BIEN", regDate: "10/09/2025" },
  { id: "STD-2026-0043", name: "FATI SANI", class: "CM2 B", dob: "05/08/2014", pob: "Maradi", year: "2025 / 2026", level: "Primaire", sector: "Privé", gpa: "11.20 / 20", mention: "Passable", status: "PROMU(E) – ADMIS(E)", regDate: "18/09/2025" },
  { id: "STD-2026-0218", name: "ZEINABOU BAKO", class: "Terminale D", dob: "30/01/2008", pob: "Tahoua", year: "2025 / 2026", level: "Secondaire", sector: "Public", gpa: "08.40 / 20", mention: "Insuffisant", status: "AJOURNÉ(E) – RETENU(E)", regDate: "11/09/2025" },
];

const mockStaff = [
  { id: "STF-2026-012", name: "M. KAZI KOSSI", role: "Enseignant Mathématiques", serviceStart: "01/10/2021", status: "Actif", salaryGrade: "A2", year: "2025 / 2026", level: "Secondaire", sector: "Public" },
  { id: "STF-2026-034", name: "Mme SANI RAHILA", role: "Enseignante Français", serviceStart: "15/09/2022", status: "Actif", salaryGrade: "A1", year: "2025 / 2026", level: "Secondaire", sector: "Public" },
  { id: "STF-2026-058", name: "M. IBRAHIM AMADOU", role: "Stagiaire Pédagogique", serviceStart: "01/09/2025", status: "Stagiaire", salaryGrade: "B1", year: "2025 / 2026", level: "Secondaire", sector: "Privé" },
];

const docTypes = [
  { id: "reussite", label: "Attestation de Réussite", arLabel: "شهادة نجاح مؤقتة", desc: "Attestation provisoire après délibération de fin d'année.", icon: Award, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/60" },
  { id: "scolarite", label: "Attestation de Scolarité", arLabel: "شهادة مدرسية", desc: "Attestation officielle prouvant la scolarisation régulière de l'élève.", icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/60" },
  { id: "inscription", label: "Attestation d'Inscription", arLabel: "شهادة تسجيل", desc: "Prouve l'inscription administrative de l'élève pour l'année scolaire.", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/60" },
  { id: "conduite", label: "Certificat de Bonne Conduite", arLabel: "شهادة حسن سيرة وسلوك", desc: "Atteste du civisme, respect du règlement et discipline exemplaire.", icon: ShieldCheck, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/60" },
  { id: "frequentation", label: "Attestation de Fréquentation", arLabel: "شهادة حضور ومواظبة", desc: "Justifie l'assiduité et la présence continue aux cours.", icon: CalendarClock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/60" },
  { id: "radiation", label: "Certificat de Radiation", arLabel: "شهادة شطب ومغادرة", desc: "Quitus de départ et de transfert vers un autre établissement.", icon: X, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/60" },
  { id: "travail", label: "Attestation de Travail", arLabel: "شهادة عمل", desc: "Destinée au personnel enseignant et administratif actif.", icon: Clock, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/60" },
  { id: "stage", label: "Attestation de Stage", arLabel: "شهادة تدريب ومباشرة عمل", desc: "Atteste de la période de stage et prise de fonction.", icon: UserCheck, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/60" },
];

export default function AdminDocsPage() {
  const [selectedDoc, setSelectedDoc] = useState("reussite");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedEntityId, setSelectedEntityId] = useState(mockStudents[0].id);
  const [signatoryRole, setSignatoryRole] = useState("LE DIRECTEUR DE L'ÉTABLISSEMENT");
  const [signatoryName, setSignatoryName] = useState("M. BAKO SANI");
  const [customComment, setCustomComment] = useState("");
  const [dbStudents, setDbStudents] = useState<any[]>([]);
  const [activeHeaderConfig, setActiveHeaderConfig] = useState<any>(null);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5">("A4");
  
  // Advanced Features State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [issuanceDate, setIssuanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [documentRef, setDocumentRef] = useState("");
  const [showOfficialSeal, setShowOfficialSeal] = useState(true);
  const [showQRCode, setShowQRCode] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [prePrintedPaperMode, setPrePrintedPaperMode] = useState(false);
  const [specialWatermark, setSpecialWatermark] = useState<"NONE" | "DUPLICATA" | "COPIE_CONFORME" | "URGENT">("NONE");
  const [darkPaperPreview, setDarkPaperPreview] = useState(false);

  // Initialize theme from storage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("edut_admin_docs_dark_mode");
      if (savedTheme === "true") {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("edut_admin_docs_dark_mode", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const styleId = "admin-docs-size-print-style";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    const pageMargin = selectedPaperSize === "A5" ? "8mm" : "15mm";
    style.innerHTML = `
      @media print {
        @page { size: ${selectedPaperSize} portrait; margin: ${pageMargin}; }
        
        /* A5 print overrides */
        .print-container[data-paper-size="A5"] {
          width: 148mm !important;
          height: 210mm !important;
          padding: 8mm !important;
          font-size: 8.5px !important;
        }
        .print-container[data-paper-size="A5"] h2 {
          font-size: 16px !important;
        }
        .print-container[data-paper-size="A5"] p {
          font-size: 8.5px !important;
        }
        .print-container[data-paper-size="A5"] .text-sm {
          font-size: 8.5px !important;
        }
        .print-container[data-paper-size="A5"] .text-2xl {
          font-size: 14px !important;
        }
        .print-container[data-paper-size="A5"] .h-20 {
          height: 3rem !important;
        }
      }
      
      /* A5 Screen Preview Overrides */
      .print-container[data-paper-size="A5"] {
        max-width: 148mm !important;
        margin: 0 auto;
        font-size: 8.5px !important;
      }
    `;
  }, [selectedPaperSize]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("edut_header_config_cache");
      if (cached) {
        setActiveHeaderConfig(JSON.parse(cached));
      }
    } catch {}

    import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
      getDocumentHeaderConfig().then((res) => {
        if (res?.data) {
          setActiveHeaderConfig(res.data);
          try {
            localStorage.setItem("edut_header_config_cache", JSON.stringify(res.data));
          } catch {}
        }
      }).catch((e) => {
        console.debug("Could not fetch header config online:", e);
      });
    }).catch(() => {});
  }, []);

  const activeDoc = docTypes.find((d) => d.id === selectedDoc) || docTypes[0];
  const isStaffDoc = selectedDoc === "travail" || selectedDoc === "stage";

  // Load IndexedDB students on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      async function loadDbStudents() {
        try {
          const { localDb } = await import("@/infrastructure/local-db/dexie");
          const list = await localDb.students.toArray();
          if (list.length > 0) {
            const mapped = list.map(s => ({
              id: s.id?.toString() || `local-${s.numAdmission}`,
              numAdmission: s.numAdmission,
              name: s.nomEtudiant,
              class: s.classe || "Classe N/A",
              dob: "10/10/2012",
              pob: "Niamey",
              year: "2025 / 2026",
              level: "Secondaire",
              sector: "Public",
              gpa: "12.00 / 20",
              mention: "Assez Bien",
              status: s.statut === "Actif" ? "PROMU(E)" : "AJOURNÉ(E)",
              regDate: "15/09/2025",
              isProvisoire: s.id === undefined || typeof s.id === "string" || s.id < 0 || s.id?.toString().startsWith("temp-"),
            }));
            setDbStudents(mapped);
            if (!isStaffDoc) {
              setSelectedEntityId(mapped[0].id);
            }
          }
        } catch (e) {
          console.warn("Failed to load db students:", e);
        }
      }
      loadDbStudents();
    }
  }, [isStaffDoc]);

  // Classes list for filter
  const rawStudentList = dbStudents.length > 0 ? dbStudents : mockStudents;
  const availableClasses = Array.from(
    new Set(rawStudentList.map((s) => s.class).filter(Boolean))
  ).sort();

  // Resolve active student or staff member
  const entities = isStaffDoc ? mockStaff : rawStudentList;
  const filteredEntities = entities.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = isStaffDoc || selectedClass === "ALL" || (e as any).class === selectedClass;
    return matchesSearch && matchesClass;
  });
  
  const activeEntity = entities.find((e) => e.id === selectedEntityId) || filteredEntities[0] || entities[0];

  const effectiveRef = documentRef.trim() || `DOC-${activeDoc.id.toUpperCase()}-${(activeEntity?.id || "000").replace(/[^a-zA-Z0-9]/g, "").slice(-4)}-${Date.now().toString().slice(-4)}`;
  const formattedDate = new Date(issuanceDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const handleShareWhatsApp = () => {
    const docLabel = activeDoc.label;
    const recipientName = activeEntity.name;
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://edut-web.vercel.app";
    const verifyUrl = `${appUrl}/verify/${encodeURIComponent(activeEntity.id || "DOC")}`;

    const text = encodeURIComponent(
      `🏛️ *${activeHeaderConfig?.schoolName || "ÉCOLE EXCELLENCE"}*\n` +
      `📜 *${docLabel.toUpperCase()}* (${activeDoc.arLabel})\n\n` +
      `👤 *Bénéficiaire :* ${recipientName}\n` +
      `🆔 *Identifiant :* ${activeEntity.id}\n` +
      `📅 *Date d'émission :* ${formattedDate}\n` +
      `🔢 *Réf. Officielle :* ${effectiveRef}\n` +
      `✅ *Vérification en ligne :* ${verifyUrl}\n\n` +
      `_Document administratif certifié conforme généré via Edut Pro._`
    );

    window.open(`https://wa.me/?text=${text}`, "_blank");
    toast.success("Détails du document prêts pour WhatsApp !");
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(effectiveRef);
    toast.success(`Référence ${effectiveRef} copiée !`);
  };

  const handleExportPDF = async () => {
    try {
      toast.success("Génération du document officiel haute fidélité...");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: selectedPaperSize === "A5" ? "a5" : "a4"
      });

      ensureAmiriRegistered(doc);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top colored bar
      doc.setFillColor(30, 58, 138); // Institutional blue
      doc.rect(0, 0, pageWidth, 4, "F");

      // Draw official header (Skip if pre-printed stationery mode is enabled)
      let startY = 12;
      if (!prePrintedPaperMode) {
        startY = drawPDFHeader(doc, activeHeaderConfig || null, "");
      } else {
        startY = 48; // Leave margin for pre-printed letterhead
      }

      // Offline watermark banner (shown only when student is not yet synced)
      const isProvisoire = !!(activeEntity as any)?.isProvisoire;
      if (isProvisoire) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.4);
        doc.roundedRect(20, startY + 2, pageWidth - 40, 6, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(180, 83, 9);
        doc.text("Document généré hors ligne - en attente de synchronisation", pageWidth / 2, startY + 6, { align: "center" });
      }

      // Special watermark badge if active
      if (specialWatermark !== "NONE") {
        const watermarkLabels: Record<string, string> = {
          DUPLICATA: "DUPLICATA OFFICIEL",
          COPIE_CONFORME: "COPIE CONFORME À L'ORIGINAL",
          URGENT: "DOCUMENT URGENT",
        };
        doc.setFillColor(239, 68, 68);
        doc.roundedRect(pageWidth - 65, 6, 55, 6, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(watermarkLabels[specialWatermark] || specialWatermark, pageWidth - 37.5, 10.5, { align: "center" });
      }

      // Title Section
      let titleY = startY + (isProvisoire ? 14 : 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138);
      const titleText = activeDoc.label.toUpperCase();
      doc.text(`— • ${titleText} • —`, pageWidth / 2, titleY, { align: "center" });

      // Arabic title under french title
      doc.setFont("Amiri", "normal");
      doc.setFontSize(14);
      doc.setTextColor(99, 102, 241);
      drawTextBilingual(doc, `* ${activeDoc.arLabel} *`, pageWidth / 2, titleY + 6, { align: "center" });

      // Body text introduction
      let bodyY = titleY + 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      
      let introText = "";
      let bottomText = "";
      if (selectedDoc === "reussite") {
        introText = "Le Directeur de l'Établissement certifie qu'après délibérations des notes scolaires et évaluations annuelles de fin d'année :";
        bottomText = "Cette attestation provisoire de réussite lui est accordée pour faire valoir ses droits académiques d'accès au niveau supérieur.";
      } else if (selectedDoc === "scolarite") {
        introText = `Je soussigné, ${signatoryName}, agissant en qualité de ${signatoryRole}, certifie par la présente attestation officielle que l'élève :`;
        bottomText = "En foi de quoi, ce certificat de scolarité lui est délivré pour servir et valoir ce que de droit auprès des instances administratives.";
      } else if (selectedDoc === "inscription") {
        introText = "Il est officiellement certifié que l'élève désigné(e) ci-dessous est inscrit(e) dans les registres académiques de notre établissement :";
        bottomText = "Cette attestation officielle confirme le statut d'inscription active pour toute l'année scolaire et administrative en cours.";
      } else if (selectedDoc === "conduite") {
        introText = `Je soussigné, ${signatoryName}, agissant en qualité de ${signatoryRole}, atteste par la présente que l'élève désigné(e) ci-dessous a fait preuve d'une moralité irréprochable et d'un strict respect de la discipline :`;
        bottomText = "En foi de quoi, le présent certificat de bonne conduite et de civisme lui est délivré pour servir et valoir ce que de droit.";
      } else if (selectedDoc === "frequentation") {
        introText = `Il est officiellement certifié que l'élève mentionné(e) ci-après fréquente avec assiduité et sans interruption notable notre établissement :`;
        bottomText = "Cette attestation de fréquentation régulière est délivrée à la demande de l'intéressé(e) pour justifier de son assiduité scolaire continue.";
      } else if (selectedDoc === "radiation") {
        introText = `La Direction de l'Établissement atteste officiellement que l'élève désigné(e) ci-dessous a été formellement radié(e) des effectifs de notre établissement :`;
        bottomText = "Ce certificat de radiation lui est délivré en toute régularité pour lui permettre son inscription et transfert auprès d'un autre établissement.";
      } else if (selectedDoc === "stage") {
        introText = `Je soussigné, ${signatoryName}, agissant en qualité de ${signatoryRole}, certifie par la présente attestation officielle que :`;
        bottomText = "Cette attestation de stage et de prise de fonction lui est accordée pour faire valoir ses droits et valider son parcours professionnel.";
      } else {
        introText = `Je soussigné, ${signatoryName}, agissant en qualité de ${signatoryRole}, certifie par la présente attestation officielle que :`;
        bottomText = "Cette attestation de travail lui est délivrée sur sa demande pour servir et valoir ce que de droit.";
      }
      
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 40);
      let tempIntroY = bodyY;
      for (const line of splitIntro) {
        drawTextBilingual(doc, line, 20, tempIntroY);
        tempIntroY += 5;
      }
      bodyY = tempIntroY + 2;

      // Draw Info Card
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, bodyY, pageWidth - 40, 55, "FD");

      // Card Lines
      doc.setFontSize(9.5);
      let lineY = bodyY + 8;
      
      if (!isStaffDoc) {
        const student = activeEntity as any;
        
        // Line 1: Nom
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("L'ÉLÈVE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        drawTextBilingual(doc, student.name, 75, lineY);
        doc.setDrawColor(241, 245, 249);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 2: ID
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("ID ÉLÈVE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        drawTextBilingual(doc, student.id, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 3: Classe
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("CLASSE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        drawTextBilingual(doc, `${student.class} (${student.year})`, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 4: Moyenne / Secteur
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(selectedDoc === "reussite" ? "MOYENNE" : "SECTEUR", 30, lineY);
        doc.setFont("helvetica", "bold");
        drawTextBilingual(doc, selectedDoc === "reussite" ? student.gpa : student.sector, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 5: Resultat / Status
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("RÉSULTAT / CONDUITE", 30, lineY);
        doc.setFont("helvetica", "bold");
        if (student.status.includes("PROMU") || student.status.includes("ADMIS")) {
          doc.setTextColor(22, 163, 74); // Green
        } else {
          doc.setTextColor(220, 38, 38); // Red
        }
        drawTextBilingual(doc, selectedDoc === "conduite" ? "TRÈS BONNE CONDUITE – EXEMPLAIRE" : student.status, 75, lineY);
      } else {
        const staff = activeEntity as any;
        
        // Line 1: Nom
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("NOM COMPLET", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        drawTextBilingual(doc, staff.name, 75, lineY);
        doc.setDrawColor(241, 245, 249);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 2: ID
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("MATRICULE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        drawTextBilingual(doc, staff.id, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 3: Role
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("FONCTION", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        drawTextBilingual(doc, staff.role, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 4: Service start
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("ENTRÉE EN SERVICE", 30, lineY);
        doc.setFont("helvetica", "bold");
        drawTextBilingual(doc, staff.serviceStart, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 5: Statut
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("STATUT", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        drawTextBilingual(doc, staff.status.toUpperCase(), 75, lineY);
      }

      bodyY += 65;

      // Bottom Paragraph
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      
      const splitBottom = doc.splitTextToSize(bottomText, pageWidth - 40);
      let tempBottomY = bodyY;
      for (const line of splitBottom) {
        drawTextBilingual(doc, line, 20, tempBottomY);
        tempBottomY += 5;
      }

      if (customComment) {
        tempBottomY += 3;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        drawTextBilingual(doc, `Note : ${customComment}`, 20, tempBottomY);
      }

      // Signatures section coordinates
      let sigY = pageHeight - 65;
      
      // Sceau Officiel
      if (showOfficialSeal) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        doc.text("SCEAU OFFICIEL", 35, sigY, { align: "center" });
        
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.4);
        doc.circle(35, sigY + 15, 12, "S");
        doc.setFontSize(5.5);
        doc.text(activeHeaderConfig?.schoolName?.slice(0, 15) || "EDUT PRO", 35, sigY + 13, { align: "center" });
        doc.text("RÉPUBLIQUE DU NIGER", 35, sigY + 17, { align: "center" });
      }

      // Verification Center – Real QR code pointing to universal verification portal
      const appUrl = typeof window !== "undefined" ? window.location.origin : "https://niger.edut.pro";
      const qrPayload = `${appUrl}/verify/${encodeURIComponent(activeEntity.id || "DOC")}`;
      
      if (showQRCode) {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("VÉRIFICATION EN LIGNE", pageWidth / 2, sigY + 28, { align: "center" });

        // Fetch real QR code image
        try {
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;
          const qrBase64 = await new Promise<string>((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = qrUrl;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
              } else {
                resolve("");
              }
            };
            img.onerror = () => resolve("");
          });

          if (qrBase64) {
            doc.addImage(qrBase64, "PNG", pageWidth / 2 - 10, sigY + 5, 20, 20);
          }
        } catch (e) {
          console.warn("Could not render QR code in PDF:", e);
        }
      }

      // Director signature
      const docIssuanceText = `FAIT LE : ${new Date(issuanceDate).toLocaleDateString("fr-FR")}`;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(docIssuanceText, pageWidth - 20, sigY, { align: "right" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      drawTextBilingual(doc, signatoryRole, pageWidth - 20, sigY + 6, { align: "right" });

      if (showSignature) {
        // Realistic signature vector
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.6);
        doc.lines([[10, -5], [15, 8], [20, -10], [35, 5]], pageWidth - 55, sigY + 16);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      drawTextBilingual(doc, signatoryName, pageWidth - 20, sigY + 24, { align: "right" });

      // Bottom colored Footer
      doc.setFillColor(79, 70, 229); // Purple-indigo footer
      doc.rect(0, pageHeight - 8, pageWidth, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("Edut Pro – Centre d'Attestation Scolaire Officiel", 10, pageHeight - 3);
      doc.text(effectiveRef, pageWidth - 10, pageHeight - 3, { align: "right" });

      doc.save(`Attestation_${activeDoc.id}_${activeEntity.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Document PDF exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans p-4 md:p-8 space-y-6 transition-colors duration-300 print:p-0 print:bg-white print:text-black",
      isDarkMode ? "bg-[#090D16] text-slate-100" : "bg-[#F8FAFC] text-slate-900"
    )}>
      
      {/* ─── PRINT PAGE SIZE CONFIGURATION ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          nav, aside, header, button, .no-print, input, select, textarea, .breadcrumbs {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          .print-container {
            display: flex !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            color: #0f172a !important;
          }
        }
      `}} />

      {/* ─── WEB HEADER (Hidden on print) ─── */}
      <header className={cn(
        "rounded-[30px] border p-5 shadow-sm print:hidden flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 transition-all duration-300",
        isDarkMode
          ? "bg-[#111827]/90 border-slate-800 text-white shadow-xl shadow-black/40 backdrop-blur-md"
          : "bg-white border-slate-200 text-slate-900 shadow-sm"
      )}>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border transition",
              isDarkMode
                ? "border-slate-800 text-slate-300 hover:bg-slate-800/80"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <FileText size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500 font-sans">Administration & Attestations</p>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                isDarkMode ? "bg-indigo-950/80 text-indigo-400 border border-indigo-800" : "bg-indigo-50 text-indigo-700"
              )}>
                PRO v2.5
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">الأوراق الرسمية والشهادات</h1>
            <p className={cn("mt-0.5 text-xs font-semibold", isDarkMode ? "text-slate-400" : "text-slate-500")}>
              Générez, personnalisez et imprimez des attestations officielles bilingues premium
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={isDarkMode ? "Passer au mode clair" : "Activer le mode sombre"}
            className={cn(
              "flex h-11 items-center gap-2 px-3.5 rounded-xl border text-xs font-bold transition-all shadow-sm active:scale-95",
              isDarkMode
                ? "border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 hover:border-amber-500/50"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
            <span className="hidden sm:inline font-bold">{isDarkMode ? "Mode Clair" : "Mode Nuit"}</span>
          </button>

          {/* Paper Size selector */}
          <div className={cn(
            "flex items-center gap-0.5 rounded-xl border p-1",
            isDarkMode ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-slate-50/50"
          )}>
            <button
              type="button"
              onClick={() => setSelectedPaperSize("A4")}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold transition-all",
                selectedPaperSize === "A4"
                  ? isDarkMode ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-800 shadow-sm"
                  : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
              )}
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => setSelectedPaperSize("A5")}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-bold transition-all",
                selectedPaperSize === "A5"
                  ? isDarkMode ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-800 shadow-sm"
                  : isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
              )}
            >
              A5
            </button>
          </div>

          {/* WhatsApp Direct Share */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            title="Partager les informations officielles sur WhatsApp"
            className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <MessageCircle size={16} /> <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Admit Cards Link */}
          <Link
            href="/dashboard/admin-docs/admit-cards"
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-wider active:scale-95 transition-all",
              isDarkMode
                ? "border-indigo-900/50 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50"
                : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            )}
          >
            <IdCard size={15} /> <span className="hidden sm:inline">Cartes d’admission</span>
          </Link>

          {/* PDF Download */}
          <button 
            onClick={handleExportPDF}
            className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Download size={15} /> Télécharger PDF
          </button>

          {/* Print Button */}
          <button 
            onClick={() => window.print()}
            className={cn(
              "flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-black uppercase tracking-wider active:scale-95 transition-all",
              isDarkMode
                ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <Printer size={15} /> Imprimer
          </button>
        </div>
      </header>

      {/* ─── WEB DOCK LAYOUT ─── */}
      <div className="grid gap-6 xl:grid-cols-[400px_1fr] print:block">
        
        {/* Left Control Panel (Hidden on print) */}
        <div className="space-y-6 print:hidden">
          
          {/* Document Types Selector */}
          <div className={cn(
            "rounded-[28px] border p-5 shadow-sm space-y-3 transition-colors",
            isDarkMode ? "border-slate-800 bg-[#111827] text-white shadow-xl shadow-black/20" : "border-slate-100 bg-white"
          )}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                1. Type de Document ({docTypes.length})
              </h3>
              <span className="text-[10px] font-bold text-indigo-500 uppercase">Officiel & Bilingue</span>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {docTypes.map((doc) => {
                const Icon = doc.icon;
                const isSelected = selectedDoc === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc.id);
                      const isStaff = doc.id === "travail" || doc.id === "stage";
                      const currentList = isStaff ? mockStaff : rawStudentList;
                      if (currentList.length > 0) {
                        setSelectedEntityId(currentList[0].id);
                      }
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3",
                      isSelected
                        ? isDarkMode
                          ? "border-indigo-500/80 bg-indigo-950/50 text-indigo-200 shadow-md shadow-indigo-950/40"
                          : "border-indigo-200 bg-indigo-50/60 text-indigo-900 font-bold shadow-sm"
                        : isDarkMode
                          ? "border-slate-800/80 hover:bg-slate-800/40 text-slate-300"
                          : "border-slate-100 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", doc.bg, doc.color)}>
                        <Icon size={19} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black truncate">{doc.label}</p>
                        </div>
                        <p className={cn("text-[10px] truncate mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                          {doc.arLabel}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Selector */}
          <div className={cn(
            "rounded-[28px] border p-5 shadow-sm space-y-4 transition-colors",
            isDarkMode ? "border-slate-800 bg-[#111827] text-white shadow-xl shadow-black/20" : "border-slate-100 bg-white"
          )}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                {isStaffDoc ? "2. Sélectionner l'Employé" : "2. Sélectionner l'Élève"}
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                {filteredEntities.length} résultat(s)
              </span>
            </div>

            {/* Class filter for students */}
            {!isStaffDoc && availableClasses.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl border text-xs font-bold outline-none transition",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500"
                      : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-500"
                  )}
                >
                  <option value="ALL">Toutes les classes ({rawStudentList.length})</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Classe : {cls}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                placeholder={isStaffDoc ? "Rechercher par nom ou matricule..." : "Rechercher par nom ou ID..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-4 h-11 border rounded-xl outline-none font-semibold text-xs transition",
                  isDarkMode
                    ? "bg-slate-900/90 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500"
                    : "bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-500"
                )}
              />
            </div>

            <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
              {filteredEntities.map((ent) => (
                <button
                  key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border text-xs font-bold transition flex items-center gap-3",
                    selectedEntityId === ent.id
                      ? isDarkMode
                        ? "border-indigo-500 bg-indigo-950/40 text-indigo-300"
                        : "border-indigo-600 bg-indigo-50/40 text-indigo-800"
                      : isDarkMode
                        ? "border-slate-800/60 hover:bg-slate-800/40 text-slate-300"
                        : "border-slate-100 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    selectedEntityId === ent.id
                      ? isDarkMode ? "bg-indigo-900/60 text-indigo-300" : "bg-indigo-100 text-indigo-700"
                      : isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                  )}>
                    <User size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate uppercase">{ent.name}</p>
                    <p className={cn("text-[10px] mt-0.5", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                      {ent.id} • {isStaffDoc ? (ent as any).role : (ent as any).class}
                    </p>
                  </div>
                  {selectedEntityId === ent.id && (
                    <Check size={16} className="text-indigo-500 shrink-0" />
                  )}
                </button>
              ))}
              {filteredEntities.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-4">Aucun résultat trouvé.</p>
              )}
            </div>
          </div>

          {/* Document Settings & Security Controls */}
          <div className={cn(
            "rounded-[28px] border p-5 shadow-sm space-y-4 transition-colors",
            isDarkMode ? "border-slate-800 bg-[#111827] text-white shadow-xl shadow-black/20" : "border-slate-100 bg-white"
          )}>
            <div className="flex items-center justify-between">
              <h3 className={cn("text-xs font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-400")}>
                3. Personnalisation & Sécurité
              </h3>
              <SlidersHorizontal size={14} className="text-slate-400" />
            </div>
            
            <div className="space-y-3">
              {/* Date d'émission */}
              <div className="space-y-1">
                <span className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Date d'émission (Fait le)
                </span>
                <input
                  type="date"
                  value={issuanceDate}
                  onChange={(e) => setIssuanceDate(e.target.value)}
                  className={cn(
                    "w-full h-10 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                      : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                  )}
                />
              </div>

              {/* Référence Personnalisée */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Numéro de référence officiel
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1"
                  >
                    <Copy size={11} /> Copier
                  </button>
                </div>
                <input
                  placeholder={effectiveRef}
                  value={documentRef}
                  onChange={(e) => setDocumentRef(e.target.value)}
                  className={cn(
                    "w-full h-10 px-3 border rounded-xl outline-none font-mono text-xs transition",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500"
                      : "bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-500"
                  )}
                />
              </div>

              {/* Qualité et Nom du signataire */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Qualité du signataire
                  </span>
                  <input
                    value={signatoryRole}
                    onChange={(e) => setSignatoryRole(e.target.value)}
                    className={cn(
                      "w-full h-10 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                        : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                    )}
                  />
                </div>
                <div className="space-y-1">
                  <span className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                    Nom du signataire
                  </span>
                  <input
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className={cn(
                      "w-full h-10 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                        : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                    )}
                  />
                </div>
              </div>

              {/* Watermark badge selector */}
              <div className="space-y-1">
                <span className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Mention d'Authenticité
                </span>
                <select
                  value={specialWatermark}
                  onChange={(e) => setSpecialWatermark(e.target.value as any)}
                  className={cn(
                    "w-full h-10 px-3 border rounded-xl outline-none font-semibold text-xs transition",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500"
                      : "bg-white border-slate-200 text-slate-700 focus:border-indigo-500"
                  )}
                >
                  <option value="NONE">Standard (Aucune mention supplémentaire)</option>
                  <option value="DUPLICATA">DUPLICATA OFFICIEL</option>
                  <option value="COPIE_CONFORME">COPIE CONFORME À L'ORIGINAL</option>
                  <option value="URGENT">DOCUMENT URGENT</option>
                </select>
              </div>

              {/* Toggles (Seal, QR, Signature, Preprinted) */}
              <div className={cn(
                "p-3 rounded-2xl border space-y-2 mt-2",
                isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200/60"
              )}>
                <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Stamp size={14} className="text-blue-500" /> Sceau Officiel (Tampon rond)
                  </span>
                  <input
                    type="checkbox"
                    checked={showOfficialSeal}
                    onChange={(e) => setShowOfficialSeal(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                  <span className="flex items-center gap-2">
                    <QrCode size={14} className="text-indigo-500" /> QR Code de vérification
                  </span>
                  <input
                    type="checkbox"
                    checked={showQRCode}
                    onChange={(e) => setShowQRCode(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                  <span className="flex items-center gap-2">
                    <CheckCheck size={14} className="text-emerald-500" /> Signature de la Direction
                  </span>
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => setShowSignature(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-xs font-bold cursor-pointer text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-2">
                    <Printer size={14} /> Papier officiel pré-imprimé
                  </span>
                  <input
                    type="checkbox"
                    checked={prePrintedPaperMode}
                    onChange={(e) => setPrePrintedPaperMode(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </label>
              </div>

              {/* Observation additionnelle */}
              <div className="space-y-1">
                <span className={cn("text-[10px] font-black uppercase tracking-wider", isDarkMode ? "text-slate-400" : "text-slate-500")}>
                  Note / Observation spécifique (optionnel)
                </span>
                <textarea
                  placeholder="Ex: Délivré pour servir et valoir ce que de droit."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  className={cn(
                    "w-full min-h-[60px] p-3 border rounded-xl outline-none font-semibold text-xs resize-none transition",
                    isDarkMode
                      ? "bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus:border-indigo-500"
                      : "bg-white border-slate-200 text-slate-700 placeholder-slate-400 focus:border-indigo-500"
                  )}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Preview Panel */}
        <div className="flex flex-col items-center print:block space-y-3">
          
          {/* Preview Toolbar */}
          <div className={cn(
            "w-full max-w-[800px] flex items-center justify-between px-4 py-2 rounded-2xl border print:hidden text-xs font-bold transition-all",
            isDarkMode ? "bg-[#111827] border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-600"
          )}>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>Aperçu Document Officiel ({selectedPaperSize})</span>
              {prePrintedPaperMode && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  Papier Pré-imprimé
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isDarkMode && (
                <button
                  type="button"
                  onClick={() => setDarkPaperPreview(!darkPaperPreview)}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  {darkPaperPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{darkPaperPreview ? "Papier Blanc Imprimable" : "Aperçu Sombre"}</span>
                </button>
              )}
              <span className="text-slate-400 text-[11px] font-mono">{effectiveRef}</span>
            </div>
          </div>

          {/* A4/A5 Simulated Paper */}
          <div
            data-paper-size={selectedPaperSize}
            className={cn(
              "print-container border shadow-2xl rounded-[32px] max-w-[800px] w-full p-10 md:p-14 aspect-[1/1.414] flex flex-col justify-between relative overflow-hidden transition-all duration-300",
              darkPaperPreview && isDarkMode
                ? "bg-[#0F172A] border-indigo-950 text-slate-100 shadow-indigo-950/20"
                : "bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-950/10"
            )}
          >
            
            {/* Top blue accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-900" />

            {/* Special Watermark Badge if active */}
            {specialWatermark !== "NONE" && (
              <div className="absolute top-4 right-6 px-3 py-1 rounded-full bg-rose-600 text-white font-black text-[10px] tracking-widest uppercase shadow-md z-30">
                {specialWatermark === "DUPLICATA" && "DUPLICATA OFFICIEL"}
                {specialWatermark === "COPIE_CONFORME" && "COPIE CONFORME À L'ORIGINAL"}
                {specialWatermark === "URGENT" && "DOCUMENT URGENT"}
              </div>
            )}

            {/* WATERMARK BACKGROUND (Laurel & Graduation Cap) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
              <svg width="420" height="420" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-950">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>

            {/* 1. OFFICIAL DOCUMENT HEADER (Hidden in pre-printed stationery mode) */}
            {!prePrintedPaperMode ? (
              <div className="w-full border-b-[1.5px] border-blue-900 pb-5 z-10">
                <OfficialDocumentHeader config={activeHeaderConfig} title="" />
              </div>
            ) : (
              <div className="w-full h-24 border-b border-dashed border-slate-300 flex items-center justify-center text-xs font-bold text-slate-400 z-10 print:hidden">
                [ Zone réservée au papier à en-tête pré-imprimé de l'établissement ]
              </div>
            )}

            {/* 2. TITLE SECTION (Institutional & Decorated) */}
            <div className="text-center my-5 z-10">
              <div className="flex items-center justify-center gap-4">
                <span className="h-[1.5px] w-12 bg-indigo-400 rounded-full" />
                <h2 className="text-2xl font-black uppercase tracking-wider text-blue-900 dark:text-indigo-400">
                  {activeDoc.label}
                </h2>
                <span className="h-[1.5px] w-12 bg-indigo-400 rounded-full" />
              </div>
              <p className="text-xs font-black text-indigo-600 dark:text-indigo-300 uppercase mt-1 tracking-widest flex items-center justify-center gap-2.5">
                🌿 {activeDoc.arLabel} 🌿
              </p>
            </div>

            {/* 3. INTRODUCTION TEXT */}
            <div className={cn(
              "text-sm leading-relaxed font-semibold mb-3 z-10",
              darkPaperPreview && isDarkMode ? "text-slate-300" : "text-slate-700"
            )}>
              {selectedDoc === "reussite" && (
                <p>
                  Le Directeur de l'Établissement certifie qu'après délibérations des notes scolaires et évaluations annuelles de fin d'année :
                </p>
              )}
              {selectedDoc === "scolarite" && (
                <p>
                  Je soussigné, <span className="font-extrabold text-blue-900 dark:text-white">{signatoryName}</span>, agissant en qualité de <span className="font-extrabold text-blue-900 dark:text-white">{signatoryRole}</span>, certifie par la présente attestation officielle que l'élève :
                </p>
              )}
              {selectedDoc === "inscription" && (
                <p>
                  Il est officiellement certifié que l'élève désigné(e) ci-dessous est inscrit(e) dans les registres académiques de notre établissement :
                </p>
              )}
              {selectedDoc === "conduite" && (
                <p>
                  Je soussigné, <span className="font-extrabold text-blue-900 dark:text-white">{signatoryName}</span>, agissant en qualité de <span className="font-extrabold text-blue-900 dark:text-white">{signatoryRole}</span>, atteste par la présente que l'élève désigné(e) ci-dessous s'est distingué(e) par une moralité exemplaire et le respect rigoureux de la discipline :
                </p>
              )}
              {selectedDoc === "frequentation" && (
                <p>
                  Il est officiellement certifié que l'élève mentionné(e) ci-après fréquente avec assiduité et sans interruption notable notre établissement scolaire :
                </p>
              )}
              {selectedDoc === "radiation" && (
                <p>
                  La Direction de l'Établissement atteste officiellement que l'élève désigné(e) ci-dessous a été formellement radié(e) des effectifs de notre établissement :
                </p>
              )}
              {selectedDoc === "stage" && (
                <p>
                  Je soussigné, <span className="font-extrabold text-blue-900 dark:text-white">{signatoryName}</span>, agissant en qualité de <span className="font-extrabold text-blue-900 dark:text-white">{signatoryRole}</span>, certifie par la présente attestation officielle que :
                </p>
              )}
              {selectedDoc === "travail" && (
                <p>
                  Je soussigné, <span className="font-extrabold text-blue-900 dark:text-white">{signatoryName}</span>, agissant en qualité de <span className="font-extrabold text-blue-900 dark:text-white">{signatoryRole}</span>, certifie par la présente attestation officielle que :
                </p>
              )}
            </div>

            {/* 4. BLOC INFORMATIONS ÉLÈVE / STAFF (Rounded details card) */}
            <div className={cn(
              "rounded-3xl border shadow-sm p-6 space-y-3 z-10 relative transition-colors",
              darkPaperPreview && isDarkMode
                ? "bg-slate-900/80 border-slate-800 text-slate-100"
                : "bg-white border-slate-200/90 text-slate-900"
            )}>
              
              {!isStaffDoc ? (
                <>
                  {/* Row 1: Nom */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                        <User size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">L'ÉLÈVE</span>
                    </div>
                    <span className="font-extrabold text-sm uppercase">{activeEntity.name}</span>
                  </div>

                  {/* Row 2: ID */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                        <IdCard size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ID ÉLÈVE</span>
                    </div>
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-extrabold">{activeEntity.id}</span>
                  </div>

                  {/* Row 3: Classe */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600 flex items-center justify-center shrink-0">
                        <BookOpen size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CLASSE</span>
                    </div>
                    <span className="font-black">{(activeEntity as any).class}</span>
                  </div>

                  {/* Row 4: Moyenne / Secteur */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                        <BarChart3 size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {selectedDoc === "reussite" ? "MOYENNE GÉNÉRALE" : "SECTEUR"}
                      </span>
                    </div>
                    <span className="font-black">
                      {selectedDoc === "reussite" ? (activeEntity as any).gpa : (activeEntity as any).sector}
                    </span>
                  </div>

                  {/* Row 5: Resultat (Badge Premium) */}
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                        <Award size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {selectedDoc === "conduite" ? "ÉVALUATION" : "RÉSULTAT"}
                      </span>
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-xl text-xs font-black tracking-wide uppercase",
                      selectedDoc === "conduite"
                        ? "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950 dark:text-teal-300"
                        : (activeEntity as any).status.includes("AJOURNÉ")
                          ? "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                    )}>
                      {selectedDoc === "conduite" ? "TRÈS BONNE CONDUITE – EXEMPLAIRE" : (activeEntity as any).status}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Row 1: Nom Staff */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                        <User size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">NOM COMPLET</span>
                    </div>
                    <span className="font-extrabold text-sm uppercase">{activeEntity.name}</span>
                  </div>

                  {/* Row 2: ID Staff */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
                        <IdCard size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">MATRICULE</span>
                    </div>
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-extrabold">{activeEntity.id}</span>
                  </div>

                  {/* Row 3: Role */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600 flex items-center justify-center shrink-0">
                        <Building size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">FONCTION</span>
                    </div>
                    <span className="font-black">{(activeEntity as any).role}</span>
                  </div>

                  {/* Row 4: Service start */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-dotted border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                        <Calendar size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ENTRÉE EN SERVICE</span>
                    </div>
                    <span className="font-black">{(activeEntity as any).serviceStart}</span>
                  </div>

                  {/* Row 5: Status */}
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                        <Award size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">STATUT</span>
                    </div>
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                      {(activeEntity as any).status}
                    </span>
                  </div>
                </>
              )}

            </div>

            {/* 5. BOTTOM PARAGRAPH */}
            <div className={cn(
              "text-sm leading-relaxed font-semibold mt-4 z-10",
              darkPaperPreview && isDarkMode ? "text-slate-300" : "text-slate-700"
            )}>
              {selectedDoc === "reussite" && (
                <p>
                  Cette attestation provisoire de réussite lui est accordée pour faire valoir ses droits académiques d'accès au niveau supérieur.
                </p>
              )}
              {selectedDoc === "scolarite" && (
                <p>
                  En foi de quoi, ce certificat de scolarité lui est délivré pour servir et valoir ce que de droit auprès des instances administratives.
                </p>
              )}
              {selectedDoc === "inscription" && (
                <p>
                  Cette attestation officielle confirme le statut d'inscription active pour toute l'année scolaire et administrative en cours.
                </p>
              )}
              {selectedDoc === "conduite" && (
                <p>
                  En foi de quoi, le présent certificat de bonne conduite et de civisme lui est délivré pour servir et valoir ce que de droit.
                </p>
              )}
              {selectedDoc === "frequentation" && (
                <p>
                  Cette attestation de fréquentation régulière est délivrée à la demande de l'intéressé(e) pour justifier de son assiduité scolaire continue.
                </p>
              )}
              {selectedDoc === "radiation" && (
                <p>
                  Ce certificat de radiation lui est délivré en toute régularité pour lui permettre son inscription et transfert auprès d'un autre établissement.
                </p>
              )}
              {selectedDoc === "stage" && (
                <p>
                  Cette attestation de stage et de prise de fonction lui est accordée pour faire valoir ses droits et valider son parcours professionnel.
                </p>
              )}
              {selectedDoc === "travail" && (
                <p>
                  Cette attestation de travail lui est délivrée sur sa demande pour servir et valoir ce que de droit.
                </p>
              )}

              {customComment && (
                <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold italic">
                    Note additionnelle : {customComment}
                  </p>
                </div>
              )}
            </div>

            {/* 6. SIGNATURE & SEALS BLOCK */}
            <div className="pt-5 border-t-[1.5px] border-slate-100 dark:border-slate-800 z-10">
              <div className="grid grid-cols-3 items-start text-[11px] font-bold text-slate-700 dark:text-slate-300">
                
                {/* Column 1: Sceau Officiel */}
                <div className="flex flex-col items-center space-y-1.5">
                  <p className="text-blue-900 dark:text-indigo-400 font-extrabold uppercase tracking-wide">Sceau Officiel</p>
                  {showOfficialSeal ? (
                    <div className="w-20 h-20 rounded-full border-[3px] border-double border-blue-600 bg-white flex flex-col items-center justify-center text-center p-2 relative shadow-inner select-none">
                      <div className="absolute inset-1 rounded-full border border-blue-400 border-dashed" />
                      <span className="text-[7.5px] font-black text-blue-700 uppercase">
                        {activeHeaderConfig?.schoolName?.slice(0, 10) || "EDUT PRO"}
                      </span>
                      <span className="text-[6px] font-bold text-blue-500">OFFICIEL</span>
                      <span className="text-[5.5px] text-blue-400">★★★★★</span>
                    </div>
                  ) : (
                    <div className="w-20 h-20 border border-dashed border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center text-[9px] text-slate-400">
                      Sans Sceau
                    </div>
                  )}
                </div>

                {/* Column 2: Online Verification & QR */}
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="w-5 h-5 text-indigo-500 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  {showQRCode ? (
                    <div className="w-16 h-16 border border-slate-300 p-1 bg-white rounded-lg flex flex-col justify-between shadow-sm">
                      <div className="flex justify-between">
                        <span className="w-3.5 h-3.5 bg-slate-900 rounded" />
                        <span className="w-3.5 h-3.5 bg-slate-900 rounded" />
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="w-3.5 h-3.5 bg-slate-900 rounded" />
                        <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-[9px] text-slate-400">
                      Sans QR
                    </div>
                  )}
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">VÉRIFICATION EN LIGNE</span>
                </div>
                
                {/* Column 3: Director signature */}
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-slate-400">FAIT LE : {formattedDate}</p>
                  <p className="text-[10px] font-black text-blue-900 dark:text-indigo-400 uppercase leading-tight">{signatoryRole}</p>
                  {showSignature ? (
                    <div className="h-11 w-full flex items-center justify-end pr-2 overflow-hidden relative">
                      <svg width="100" height="38" className="text-blue-600 dark:text-indigo-400 opacity-90">
                        <path d="M10,20 Q30,5 50,22 T90,15" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M25,25 L75,10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-11 w-full flex items-center justify-end pr-2 text-[9px] text-slate-400 italic">
                      Signature manuelle
                    </div>
                  )}
                  <p className="font-extrabold text-xs uppercase">{signatoryName}</p>
                </div>

              </div>
            </div>

            {/* 7. DIGNIFIED FOOTER BAR */}
            <div className="absolute bottom-0 left-0 right-0 bg-indigo-600 h-8 flex items-center justify-between px-6 text-[8.5px] font-bold text-white z-20">
              <span>Edut Pro – Centre d'Attestation Scolaire Officiel</span>
              <span className="font-mono uppercase">{effectiveRef}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
