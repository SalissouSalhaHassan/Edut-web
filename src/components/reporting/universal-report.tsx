"use client";

import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Mail,
  X,
  ChevronRight,
  Info,
  Calendar,
  User,
  ShieldCheck,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import type { DocumentHeaderConfig } from "@/domains/printing/document-header";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

export interface UniversalReportKpi {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export interface UniversalReportProps {
  metadata: {
    title: string;
    subtitle?: string;
    moduleName: string; // e.g. "GESTION DES CANEVAS SCOLAIRES"
    reportId: string; // e.g. "RPT-ETB-2026-0001"
    academicYear: string;
    editorName: string;
    description?: string;
    qrValue?: string;
    isLandscape?: boolean;
    documentHeaderConfig?: Partial<DocumentHeaderConfig> | null;
  };
  kpis?: UniversalReportKpi[];
  table?: {
    headers: string[];
    rows: Array<Array<any>>;
    summary?: Array<{
      label: string;
      value: string | number;
      icon?: React.ReactNode;
      color?: string;
    }>;
  };
  // Callback when email is triggered
  onSendEmail?: (email: string) => Promise<boolean> | boolean;
}

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
    console.warn("Failed to check or register Amiri font in universal-report:", e);
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
      headerConfig?.addressAr || "",
      bp ? `ص.ب: ${bp}` : "",
      phone ? `الهاتف: ${phone}` : "",
      email ? `البريد: ${email}` : "",
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

export default function UniversalReport({ metadata, kpis = [], table, onSendEmail }: UniversalReportProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5">("A4");

  React.useEffect(() => {
    const styleId = "universal-report-print-style";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    const pageMargin = selectedPaperSize === "A5" ? "8mm" : "15mm";
    style.innerHTML = `
      @media print {
        @page { size: ${selectedPaperSize} ${metadata.isLandscape ? "landscape" : "portrait"}; margin: ${pageMargin}; }
        
        /* A5 print overrides */
        article[data-paper-size="A5"] {
          width: ${metadata.isLandscape ? "210mm" : "148mm"} !important;
          height: ${metadata.isLandscape ? "148mm" : "210mm"} !important;
          padding: 6mm !important;
          font-size: 8.5px !important;
        }
        article[data-paper-size="A5"] h1,
        article[data-paper-size="A5"] h2 {
          font-size: 16px !important;
        }
        article[data-paper-size="A5"] table {
          font-size: 7.5px !important;
        }
        article[data-paper-size="A5"] th,
        article[data-paper-size="A5"] td {
          padding: 3px 4px !important;
        }
        article[data-paper-size="A5"] .w-12 {
          width: 2rem !important;
          height: 2rem !important;
        }
        article[data-paper-size="A5"] .text-2xl {
          font-size: 1.125rem !important;
        }
      }
      
      /* A5 Screen Preview Overrides */
      article[data-paper-size="A5"] {
        max-width: ${metadata.isLandscape ? "210mm" : "148mm"} !important;
        margin: 0 auto;
        font-size: 8.5px !important;
      }
    `;
  }, [selectedPaperSize, metadata.isLandscape]);

  const formattedDate = new Date().toLocaleDateString("fr-FR");
  const formattedTime = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' });

  // 1. Excel/CSV Export Handler
  const handleExportSpreadsheet = (format: "excel" | "csv") => {
    try {
      toast.success(`Exportation en cours au format ${format.toUpperCase()}...`);
      
      let rowsData = table ? table.rows.map((row) => {
        const item: Record<string, any> = {};
        table.headers.forEach((header, idx) => {
          // Skip action column on spreadsheet export
          if (header.toLowerCase() !== "actions") {
            item[header] = row[idx];
          }
        });
        return item;
      }) : [];

      const worksheet = XLSX.utils.json_to_sheet(rowsData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport");

      if (format === "excel") {
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${metadata.reportId}_${metadata.title.replace(/\s+/g, "_")}_${Date.now()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const csvContent = XLSX.write(workbook, { bookType: "csv", type: "string" });
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${metadata.reportId}_${metadata.title.replace(/\s+/g, "_")}_${Date.now()}.csv`;
        document.body.appendChild(link);
  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;
    setIsSendingEmail(true);

    try {
      let success = true;
      if (onSendEmail) {
        success = await onSendEmail(recipientEmail);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (success) {
        toast.success(`Le rapport a été envoyé avec succès par e-mail à ${recipientEmail}`);
        setEmailModalOpen(false);
        setRecipientEmail("");
      } else {
        toast.error("Échec de l'envoi de l'e-mail.");
      }
    } catch (err) {
      toast.error("Une erreur s'est produite lors de l'envoi.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className={cn("space-y-6 text-slate-900 w-full", metadata.isLandscape && "print:w-[297mm] print:h-[210mm]")}>
      {metadata.isLandscape && (
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: landscape !important;
              margin: 10mm !important;
            }
          }
        `}} />
      )}
      
      {/* ─── WEB CONTROLS HEADER (Hidden on print) ─── */}
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">{metadata.moduleName}</p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">{metadata.title}</h2>
              {metadata.subtitle && <p className="text-xs font-bold text-slate-400 mt-0.5">{metadata.subtitle}</p>}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Size Selector */}
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/50 p-1">
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A4")}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  selectedPaperSize === "A4"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A5")}
                className={`h-8 px-3 rounded-lg text-xs font-bold transition-all ${
                  selectedPaperSize === "A5"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                A5
              </button>
            </div>

            <button 
              onClick={handleExportPDF}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <FileText size={15} className="text-rose-500" /> Exporter PDF
            </button>
            <button 
              onClick={() => handleExportSpreadsheet("excel")}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" /> Excel
            </button>
            <button 
              onClick={() => handleExportSpreadsheet("csv")}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Download size={15} className="text-slate-500" /> CSV
            </button>
            <button 
              onClick={() => setEmailModalOpen(true)}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Mail size={15} className="text-indigo-600" /> E-mail
            </button>
            <button 
              onClick={() => window.print()}
              className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Printer size={15} /> Imprimer
            </button>
          </div>
        </div>
      </header>

      {/* ─── PRINTABLE DOCUMENT WRAPPER ─── */}
      <article data-paper-size={selectedPaperSize} className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 print:p-0 print:border-none print:shadow-none space-y-8 print:bg-white print:text-black">
        
        {/* ─── PRINTABLE OFFICIAL HEADER ─── */}
        <OfficialDocumentHeader config={metadata.documentHeaderConfig || null} title={metadata.title} />
        {/* ─── GENERAL SUMMARY SECTION ─── */}
        {kpis && kpis.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ShieldCheck size={14} className="text-indigo-600" /> Résumé Général
            </h3>
            
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between gap-4 print:border-slate-300">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{kpi.label}</span>
                    <span className="text-2xl font-black text-slate-950 mt-1 block">{kpi.value}</span>
                    {kpi.subtext && <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{kpi.subtext}</span>}
                  </div>
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 print:hidden", kpi.bgColor, kpi.color)}>
                    {kpi.icon}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── DESCRIPTION / INFO SECTION ─── */}
        {metadata.description && (
          <div className="rounded-[24px] border border-slate-100 bg-slate-50/50 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-slate-300 print:bg-white">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                <Info size={13} /> À propos de ce rapport
              </p>
              <p className="text-xs font-bold leading-relaxed text-slate-500 max-w-2xl">{metadata.description}</p>
            </div>
            
            {/* QR Code and Reference */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400">VÉRIFICATION D'AUTHENTICITÉ</p>
                <p className="text-[10px] font-mono font-bold text-slate-700 mt-0.5">{metadata.reportId}</p>
              </div>
              <div className="w-14 h-14 border border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center text-[8px] font-mono text-slate-400 select-none">
                [QR CODE]
              </div>
            </div>
          </div>
        )}

        {/* ─── DATA TABLE SECTION ─── */}
        {table && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 print:text-black">
              <Building size={14} className="text-indigo-600" /> Données détaillées
            </h3>
            
            <div className="overflow-x-auto rounded-[24px] border border-slate-100 print:border-slate-300">
              <table className="w-full border-collapse text-left text-sm print:border print:border-slate-300">
                <thead>
                  <tr className="bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white print:bg-slate-100 print:text-black print:border-b print:border-slate-300">
                    {table.headers.map((head, idx) => (
                      <th key={idx} className="px-5 py-4 first:rounded-tl-[24px] last:rounded-tr-[24px] print:rounded-none">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700 print:divide-slate-300 print:text-black">
                  {table.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors odd:bg-white even:bg-slate-50/30 print:odd:bg-white print:even:bg-slate-50/30">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-5 py-4">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recapitulative Table Footer */}
            {table.summary && table.summary.length > 0 && (
              <div className="rounded-[20px] border border-slate-100 bg-slate-50/70 p-4 flex flex-wrap gap-6 items-center justify-between text-xs font-black text-slate-700 print:bg-white print:border-slate-300 print:text-black">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Récapitulatif</span>
                <div className="flex flex-wrap gap-6">
                  {table.summary.map((sum, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {sum.icon && <span className={sum.color}>{sum.icon}</span>}
                      <span>{sum.label} : <span className="text-slate-900">{sum.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PRINT FOOTER / SIGNATURES ─── */}
        <div className="w-full border-t border-slate-100 pt-6 mt-10 print:border-slate-300 print:mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
            
            {/* Client signature */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Le Client (Inspecteur / IEFA)</p>
              <div className="h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic print:border-slate-400">
                Signature & Cachet
              </div>
            </div>

            {/* Official Stamp */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-double border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center p-2 print:border-slate-400 print:bg-white">
                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest leading-none">Edut Pro</span>
                <span className="text-[7px] font-bold text-slate-500 uppercase leading-normal">Système</span>
                <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">Gestion Scolaire</span>
                <span className="text-[8px] text-indigo-500 mt-1">★</span>
              </div>
              <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest">Cachet Officiel</p>
            </div>

            {/* General Direction Signature */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">La Direction Générale</p>
              <div className="h-20 w-44 border border-dashed border-slate-200 rounded-2xl mx-auto flex items-center justify-center text-[10px] text-slate-400 italic print:border-slate-400">
                Signature & Cachet
              </div>
            </div>

          </div>
        </div>

        {/* ─── DEDICATED PRINT METRICS FOOTER ─── */}
        <div className="hidden print:flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-200 pt-4 mt-6">
          <span>Edut Pro - Gestion Scolaire</span>
          <span className="text-indigo-600 italic">Merci pour votre confiance</span>
          <span>Page 1 / 1</span>
        </div>

      </article>

      {/* ─── EMAIL DIALOG MODAL (Hidden on print) ─── */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.2rem] border border-slate-100 shadow-2xl max-w-md w-full p-8 relative">
            <button 
              onClick={() => setEmailModalOpen(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-950 mb-2">Envoyer par Email</h3>
            <p className="text-xs text-slate-400 font-bold mb-5">Le destinataire recevra un rapport PDF conforme à l'année en cours.</p>
            
            <form onSubmit={handleSendEmailSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Adresse Email du destinataire *</label>
                <input 
                  required 
                  type="email"
                  value={recipientEmail} 
                  onChange={e => setRecipientEmail(e.target.value)} 
                  placeholder="contact@ministere.ne" 
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 text-sm" 
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setEmailModalOpen(false)} 
                  className="h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSendingEmail}
                  className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {isSendingEmail ? "Envoi..." : "Envoyer le mail"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
