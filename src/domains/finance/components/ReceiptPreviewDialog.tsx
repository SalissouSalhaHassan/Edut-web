"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  FileText,
  Send,
  AlertCircle,
  X,
  Smartphone,
  Download,
  CheckCircle2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Wallet,
  Hourglass,
  Info,
  CreditCard,
  Building2,
  Banknote,
  BookOpen,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getBranchByLevel } from "../../settings/actions/settings.actions";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import type { DocumentHeaderConfig } from "@/domains/printing/document-header";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

const formatCfaAmount = (amount: number) => {
  return amount.toLocaleString("fr-FR").replace(/[\u00A0\u202F\u2007\u200B]/g, " ") + " CFA";
};

function drawTextBilingual(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  if (hasArabicCharacters(text)) {
    if (!amiriFontBase64) {
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
    const reshaped = reshapeArabicText(text);
    doc.setFont("Amiri", "normal");
    const lines = doc.splitTextToSize(reshaped, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4.5;
    }
    doc.setFont(currentName, currentStyle);
    return tempY - y;
  } else {
    const lines = doc.splitTextToSize(text, maxWidth);
    let tempY = y;
    for (const line of lines) {
      doc.text(line, x, tempY, { align });
      tempY += 4.5;
    }
    return tempY - y;
  }
}

interface ReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeData: any;
  headerConfig?: any | null;
}

const fmt = (val: number) => `${val.toLocaleString("fr-FR")} F CFA`;

function numberToWords(n: number): string {
  if (n === 0) return "Zéro franc CFA";
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
    "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  function below1000(num: number): string {
    if (num === 0) return "";
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7) return "soixante-" + units[10 + u];
      if (t === 9) return "quatre-vingt-" + units[10 + u];
      return tens[t] + (u > 0 ? (u === 1 && t !== 8 ? "-et-un" : "-" + units[u]) : (t === 8 ? "s" : ""));
    }
    const h = Math.floor(num / 100);
    const r = num % 100;
    return (h > 1 ? units[h] + " cent" : "cent") + (r > 0 ? " " + below1000(r) : (h > 1 ? "s" : ""));
  }

  let result = "";
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const remainder = n % 1000;

  if (millions > 0) result += below1000(millions) + (millions > 1 ? " millions " : " million ");
  if (thousands > 0) result += (thousands === 1 ? "mille" : below1000(thousands) + " mille") + " ";
  if (remainder > 0) result += below1000(remainder);

  return result.trim().charAt(0).toUpperCase() + result.trim().slice(1) + " francs CFA";
}

function getModeIcon(mode: string) {
  switch (mode) {
    case "Espèces": return <Banknote size={14} className="text-emerald-600" />;
    case "Mobile Money": return <Smartphone size={14} className="text-blue-600" />;
    case "Virement": return <Building2 size={14} className="text-purple-600" />;
    case "Carte Bancaire": return <CreditCard size={14} className="text-orange-600" />;
    default: return <Wallet size={14} className="text-slate-400" />;
  }
}

export default function ReceiptPreviewDialog({
  open,
  onOpenChange,
  feeData,
  headerConfig,
}: ReceiptPreviewDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"receipt" | "history">("receipt");
  const [activeHeaderConfig, setActiveHeaderConfig] = useState<any>(headerConfig);
  const [selectedPaperSize, setSelectedPaperSize] = useState<"A4" | "A5">("A4");

  useEffect(() => {
    if (headerConfig) {
      setActiveHeaderConfig(headerConfig);
    } else if (open) {
      import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
        getDocumentHeaderConfig().then((res) => {
          if (res?.data) {
            setActiveHeaderConfig(res.data);
          }
        });
      });
    }
  }, [open, headerConfig]);

  useEffect(() => {
    if (open && feeData?.student?.educationalLevel) {
      getBranchByLevel(feeData.student.educationalLevel).then((res) => {
        if (res.data) setBranchInfo(res.data);
      });
    }
  }, [open, feeData?.student?.educationalLevel]);

  useEffect(() => {
    const styleId = "receipt-print-style-v3";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    const pageMargin = selectedPaperSize === "A5" ? "5mm" : "10mm";
    style.innerHTML = `
      @media print {
        body > *:not(#receipt-print-root) { display: none !important; }
        #receipt-print-root { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; padding: 0; margin: 0; }
        .no-print { display: none !important; }
        @page { size: ${selectedPaperSize}; margin: ${pageMargin}; }
        
        /* A5 print overrides */
        #receipt-print-root [data-paper-size="A5"] {
          width: 148mm !important;
          height: 210mm !important;
          padding: 6mm !important;
          font-size: 8.5px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .px-10 {
          padding-left: 14px !important;
          padding-right: 14px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .py-6 {
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .py-8 {
          padding-top: 10px !important;
          padding-bottom: 10px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .pt-7 {
          padding-top: 10px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .pb-6 {
          padding-bottom: 8px !important;
        }
        #receipt-print-root [data-paper-size="A5"] h2 {
          font-size: 20px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .text-\\[22px\\] {
          font-size: 14px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .text-\\[26px\\] {
          font-size: 16px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .grid-cols-\\[1fr_220px\\] {
          grid-template-columns: 1fr 120px !important;
        }
        #receipt-print-root [data-paper-size="A5"] svg.stamp-svg {
          width: 75px !important;
          height: 75px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .signature-area {
          width: 110px !important;
        }
        #receipt-print-root [data-paper-size="A5"] .signature-area .h-16 {
          height: 30px !important;
        }
      }
      
      /* A5 Screen Preview Overrides */
      #receipt-print-area[data-paper-size="A5"] {
        max-width: 148mm !important;
        margin: 0 auto;
        font-size: 8.5px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .px-10 {
        padding-left: 14px !important;
        padding-right: 14px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .py-6 {
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .py-8 {
        padding-top: 10px !important;
        padding-bottom: 10px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .pt-7 {
        padding-top: 10px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .pb-6 {
        padding-bottom: 8px !important;
      }
      #receipt-print-area[data-paper-size="A5"] h2 {
        font-size: 20px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .text-\\[22px\\] {
        font-size: 14px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .text-\\[26px\\] {
        font-size: 16px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .grid-cols-\\[1fr_220px\\] {
        grid-template-columns: 1fr 120px !important;
      }
      #receipt-print-area[data-paper-size="A5"] svg.stamp-svg {
        width: 75px !important;
        height: 75px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .signature-area {
        width: 110px !important;
      }
      #receipt-print-area[data-paper-size="A5"] .signature-area .h-16 {
        height: 30px !important;
      }
      
      .custom-scrollbar::-webkit-scrollbar { width: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.07); border-radius: 10px; }
    `;
  }, [selectedPaperSize]);

  if (!feeData) return null;

  const totalExpected = feeData.totalExpected || 0;
  const totalPaid = feeData.totalPaid || 0;
  const totalReduction = feeData.totalReduction || 0;
  const balance = feeData.balance || 0;
  const lastPayment = feeData.payments?.[0];
  const allPayments = feeData.payments || [];
  const isDataComplete = !!feeData.student && totalExpected > 0;
  const isSolde = balance <= 0;
  const isProvisoire = !!lastPayment?.isProvisoire;

  const refNumber =
    lastPayment?.reference ||
    `REF-${String(feeData.id).padStart(2, "0")}-${new Date().getFullYear()}`;

  const receiptDate = lastPayment?.datePaid
    ? new Date(lastPayment.datePaid).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const schoolName = activeHeaderConfig?.schoolName || branchInfo?.branchName || "EDUT ACADEMY";
  const schoolAddress = activeHeaderConfig?.address || branchInfo?.address || "Secteur 5, Niamey, Niger";
  const schoolPhone = activeHeaderConfig?.phone || branchInfo?.contactNo || "+227 90 12 34 56";
  const schoolEmail = activeHeaderConfig?.email || branchInfo?.email || "contact@edutacademy.ne";
  const receiptHeaderConfig: Partial<DocumentHeaderConfig> = {
    style: activeHeaderConfig?.style || "classic_dual_logo",
    schoolName,
    address: schoolAddress,
    phone: schoolPhone,
    email: schoolEmail,
    schoolYear: activeHeaderConfig?.schoolYear || feeData?.session?.sessionName || "2024 - 2025",
    leftLogo: activeHeaderConfig?.leftLogo || branchInfo?.logoPath || "",
    rightLogo: activeHeaderConfig?.rightLogo || branchInfo?.logoPath || "",
    centerLogo: activeHeaderConfig?.centerLogo || branchInfo?.logoPath || "",
    ministry: activeHeaderConfig?.ministry || "Ministère de l'Éducation Nationale",
    service: activeHeaderConfig?.service || "Service de la Scolarité",
  };

  // ---------- PRINT ----------
  const handlePrint = () => {
    if (!isDataComplete) return;
    const printArea = document.getElementById("receipt-print-area");
    if (!printArea) return;
    const clone = printArea.cloneNode(true) as HTMLElement;
    let root = document.getElementById("receipt-print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "receipt-print-root";
      document.body.appendChild(root);
    }
    root.innerHTML = "";
    root.appendChild(clone);
    window.print();
    setTimeout(() => {
      if (root) root.innerHTML = "";
    }, 1500);
  };

  function drawReceiptPDFHeader(
    doc: jsPDF,
    headerConfig: any,
    branchInfo: any,
    schoolName: string,
    schoolAddress: string,
    schoolPhone: string,
    schoolEmail: string,
    schoolYear: string,
    receiptDate: string,
    margin: number,
    W: number,
    paperSize: "A4" | "A5"
  ): number {
    const style = headerConfig?.style || "classic_dual_logo";
    const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
    const service = headerConfig?.service || "Service de la Scolarité";
    const bp = headerConfig?.bp || "";
    const registrationNo = headerConfig?.registrationNo || branchInfo?.registrationNo || "";
    
    const leftLogo = headerConfig?.leftLogo || branchInfo?.logoPath;
    const rightLogo = headerConfig?.rightLogo || leftLogo;
    const centerLogo = headerConfig?.centerLogo || leftLogo;

    const isA5 = paperSize === "A5";

    if (style === "modern_card") {
      const cardHeight = isA5 ? 18 : 24;
      const cardTop = isA5 ? 5 : 8;
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(margin, cardTop, W - 2 * margin, cardHeight, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "F");
      
      if (leftLogo) {
        try {
          const logoSize = isA5 ? 12 : 20;
          doc.addImage(leftLogo, 'PNG', margin + (isA5 ? 3 : 4), cardTop + (isA5 ? 3 : 2), logoSize, logoSize);
        } catch (e) {}
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 10 : 13);
      drawWrappedText(doc, schoolName, margin + (isA5 ? 18 : 28), cardTop + (isA5 ? 5 : 7), W - 2 * margin - (isA5 ? 22 : 32), "left");
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA5 ? 6.5 : 8);
      doc.setTextColor(220, 225, 255);
      drawWrappedText(doc, `Année: ${schoolYear} | Date: ${receiptDate}`, margin + (isA5 ? 18 : 28), cardTop + (isA5 ? 10.5 : 14), W - 2 * margin - (isA5 ? 22 : 32), "left");
      drawWrappedText(doc, `${schoolAddress} | Tél: ${schoolPhone}`, margin + (isA5 ? 18 : 28), cardTop + (isA5 ? 14 : 19), W - 2 * margin - (isA5 ? 22 : 32), "left");
      
      doc.setTextColor(0, 0, 0);
      return cardTop + cardHeight + 4;
    }
    
    if (style === "bilingual_center_logo") {
      if (centerLogo) {
        try {
          const logoSize = isA5 ? 16 : 24;
          doc.addImage(centerLogo, 'PNG', W / 2 - (logoSize / 2), isA5 ? 5 : 8, logoSize, logoSize);
        } catch (e) {}
      }
      
      const leftLines = [
        headerConfig?.country || branchInfo?.country || "RÉPUBLIQUE DU NIGER",
        ministry,
        headerConfig?.regionalDirection || branchInfo?.regionalDirection || "",
        headerConfig?.departmentalDirection || branchInfo?.departmentalDirection || "",
        schoolName,
        service,
        schoolAddress,
        bp ? `BP : ${bp}` : "",
        schoolPhone ? `Tél: ${schoolPhone}` : "",
        schoolEmail ? `Email: ${schoolEmail}` : "",
      ].filter(Boolean);

      let leftY = isA5 ? 8 : 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA5 ? 5.5 : 7.5);
      doc.setTextColor(15, 23, 42);
      const colWidth = isA5 ? 48 : 65;
      const stepY = isA5 ? 3 : 4.5;

      for (const line of leftLines) {
        const height = drawWrappedText(doc, line, margin, leftY, colWidth, "left");
        leftY += height - 4.5 + stepY;
      }
      
      const rightLines = [
        headerConfig?.countryAr || "جمهورية النيجر",
        headerConfig?.ministryAr || "وزارة التربية الوطنية",
        headerConfig?.regionalDirectionAr || "",
        headerConfig?.departmentalDirectionAr || "",
        headerConfig?.schoolNameAr || schoolName,
        headerConfig?.serviceAr || "",
        headerConfig?.addressAr || "",
        bp ? `ص.ب: ${bp}` : "",
        schoolPhone ? `الهاتف: ${schoolPhone}` : "",
        schoolEmail ? `البريد: ${schoolEmail}` : "",
      ].filter(Boolean);

      let rightY = isA5 ? 8 : 12;
      for (const line of rightLines) {
        const height = drawWrappedText(doc, line, W - margin, rightY, colWidth, "right");
        rightY += height - 4.5 + stepY;
      }
      
      const maxY = Math.max(leftY, rightY);
      doc.setDrawColor(220, 225, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, maxY + 1, W - margin, maxY + 1);
      return maxY + (isA5 ? 3 : 4);
    }
    
    if (style === "university_formal") {
      const logoSize = isA5 ? 14 : 20;
      const logoTop = isA5 ? 5 : 8;
      if (leftLogo) {
        try {
          doc.addImage(leftLogo, 'PNG', margin, logoTop, logoSize, logoSize);
        } catch (e) {}
      }
      if (rightLogo) {
        try {
          doc.addImage(rightLogo, 'PNG', W - margin - logoSize, logoTop, logoSize, logoSize);
        } catch (e) {}
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 7 : 9);
      doc.setTextColor(15, 23, 42);
      drawWrappedText(doc, ministry.toUpperCase(), W / 2, isA5 ? 8 : 12, W - 2 * margin - (logoSize * 2 + 4), "center");
      
      doc.setFontSize(isA5 ? 9 : 11);
      drawWrappedText(doc, schoolName, W / 2, isA5 ? 12.5 : 17, W - 2 * margin - (logoSize * 2 + 4), "center");
      
      doc.setFontSize(isA5 ? 6.5 : 8.5);
      doc.setFont("helvetica", "normal");
      drawWrappedText(doc, service, W / 2, isA5 ? 17 : 22, W - 2 * margin - (logoSize * 2 + 4), "center");
      drawWrappedText(doc, `BP : ${bp || "N/A"} | Tél. ${schoolPhone} | Email : ${schoolEmail}`, W / 2, isA5 ? 21 : 27, W - 2 * margin - (logoSize * 2 + 4), "center");
      
      const dividerY = isA5 ? 26 : 34;
      doc.setDrawColor(220, 225, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, dividerY, W - margin, dividerY);
      return dividerY;
    }
    
    if (style === "minimal_administrative") {
      const logoSize = isA5 ? 14 : 20;
      const logoTop = isA5 ? 5 : 8;
      if (centerLogo || leftLogo) {
        try {
          doc.addImage(centerLogo || leftLogo, 'PNG', W - margin - logoSize, logoTop, logoSize, logoSize);
        } catch (e) {}
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 9.5 : 12);
      doc.setTextColor(15, 23, 42);
      drawWrappedText(doc, schoolName, margin, isA5 ? 9 : 14, W - 2 * margin - (logoSize + 4), "left");
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA5 ? 6.5 : 8);
      drawWrappedText(doc, `Agrément: ${registrationNo} | Année: ${schoolYear}`, margin, isA5 ? 14 : 20, W - 2 * margin - (logoSize + 4), "left");
      drawWrappedText(doc, `Adresse: ${schoolAddress} | Tél: ${schoolPhone}`, margin, isA5 ? 18 : 25, W - 2 * margin - (logoSize + 4), "left");
      drawWrappedText(doc, `Email: ${schoolEmail} | Date: ${receiptDate}`, margin, isA5 ? 22 : 30, W - 2 * margin - (logoSize + 4), "left");
      
      const dividerY = isA5 ? 26 : 34;
      doc.setDrawColor(220, 225, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, dividerY, W - margin, dividerY);
      return dividerY;
    }
    
    // Default fallback: classic dual logo
    const logoSize = isA5 ? 14 : 20;
    const logoTop = isA5 ? 5 : 8;
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin, logoTop, logoSize, logoSize);
      } catch (e) {}
    }
    if (rightLogo && rightLogo !== leftLogo) {
      try {
        doc.addImage(rightLogo, 'PNG', W - margin - logoSize, logoTop, logoSize, logoSize);
      } catch (e) {}
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA5 ? 10 : 14);
    doc.setTextColor(15, 23, 42);
    drawWrappedText(doc, schoolName, margin + (isA5 ? 18 : 24), isA5 ? 8 : 12, W - 2 * margin - (isA5 ? 38 : 48), "left");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(isA5 ? 6.5 : 8);
    doc.setTextColor(120, 130, 150);
    
    let subY = isA5 ? 13 : 18;
    const stepY = isA5 ? 3.5 : 4.5;
    if (schoolAddress) {
      drawWrappedText(doc, schoolAddress, margin + (isA5 ? 18 : 24), subY, W - 2 * margin - (isA5 ? 38 : 48), "left");
      subY += stepY;
    }
    drawWrappedText(doc, `Tél: ${schoolPhone}  |  Email: ${schoolEmail}`, margin + (isA5 ? 18 : 24), subY, W - 2 * margin - (isA5 ? 38 : 48), "left");
    subY += stepY;
    drawWrappedText(doc, `Année: ${schoolYear}  |  Date: ${receiptDate}`, margin + (isA5 ? 18 : 24), subY, W - 2 * margin - (isA5 ? 38 : 48), "left");

    const dividerY = Math.max(isA5 ? 26 : 34, subY + 3);
    doc.setDrawColor(220, 225, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, dividerY, W - margin, dividerY);
    return dividerY;
  }

  // ---------- PDF ----------
  const generatePDF = async (save = true): Promise<jsPDF> => {
    setIsGenerating(true);
    setPdfSuccess(false);

    const isA5 = selectedPaperSize === "A5";
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: isA5 ? "a5" : "a4" });
    
    if (amiriFontBase64) {
      try {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal", "Identity-H");
      } catch (e) {
        console.warn("Error registering Amiri font for receipt PDF:", e);
      }
    }

    const W = isA5 ? 148 : 210;
    const H = isA5 ? 210 : 297;
    const margin = isA5 ? 8 : 14;

    doc.setFillColor(249, 250, 252);
    doc.rect(0, 0, W, H, "F");
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 2, "F");
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 2, isA5 ? 40 : 60, 1, "F");

    const headerBottomY = drawReceiptPDFHeader(
      doc,
      receiptHeaderConfig,
      branchInfo,
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolEmail,
      feeData.session?.sessionName || "2024-2025",
      receiptDate,
      margin,
      W,
      selectedPaperSize
    );

    // Dynamic placement of elements below header to prevent overlaps
    const titleBoxY = headerBottomY + (isA5 ? 3 : 4);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, titleBoxY, W - 2 * margin, isA5 ? 9 : 12, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "F");
    doc.setFontSize(isA5 ? 9 : 12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("REÇU DE PAIEMENT", W / 2, titleBoxY + (isA5 ? 6 : 8), { align: "center" });

    const refBoxY = titleBoxY + (isA5 ? 12 : 16);
    doc.setFillColor(241, 245, 255);
    doc.setDrawColor(200, 210, 255);
    doc.roundedRect(W / 2 - (isA5 ? 25 : 35), refBoxY, isA5 ? 50 : 70, isA5 ? 6 : 8, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "FD");
    doc.setFontSize(isA5 ? 6.5 : 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`RÉF : ${refNumber}`, W / 2, refBoxY + (isA5 ? 4.2 : 5.5), { align: "center" });

    let provY = refBoxY + (isA5 ? 8 : 10);
    if (isProvisoire) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(margin, provY, W - 2 * margin, isA5 ? 3 : 4, 0.5, 0.5, "FD");
      doc.setFontSize(isA5 ? 5.5 : 6.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text("Document généré hors ligne - en attente de synchronisation", W / 2, provY + (isA5 ? 2.2 : 3), { align: "center" });
      provY += isA5 ? 4.5 : 6;
    }

    const infoBoxY = provY;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 225, 240);
    doc.roundedRect(margin, infoBoxY, W - 2 * margin, isA5 ? 24 : 32, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "FD");

    doc.setFontSize(isA5 ? 6 : 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("INFORMATIONS ÉLÈVE", margin + (isA5 ? 4 : 5), infoBoxY + (isA5 ? 4.5 : 6));

    doc.setFontSize(isA5 ? 8 : 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(feeData.student?.nomEtudiant || "—", margin + (isA5 ? 4 : 5), infoBoxY + (isA5 ? 9 : 12));

    const leftLabels = ["Classe", "Matricule", "Année Scolaire"];
    const leftVals = [
      feeData.student?.classe || "—",
      feeData.student?.numAdmission || "—",
      feeData.session?.sessionName || "2024–2025",
    ];
    doc.setFontSize(isA5 ? 6.5 : 8);
    leftLabels.forEach((lbl, i) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 130, 150);
      doc.text(lbl, margin + (isA5 ? 4 : 5), infoBoxY + (isA5 ? 14 : 18) + i * (isA5 ? 3.5 : 4.5));
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 35, 50);
      doc.text(`: ${leftVals[i]}`, margin + (isA5 ? 20 : 28), infoBoxY + (isA5 ? 14 : 18) + i * (isA5 ? 3.5 : 4.5));
    });

    const rx = W / 2 + (isA5 ? 4 : 5);
    doc.setFontSize(isA5 ? 6 : 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("DATE DU REÇU", rx, infoBoxY + (isA5 ? 4.5 : 6));
    doc.setFontSize(isA5 ? 8.5 : 11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(receiptDate, rx, infoBoxY + (isA5 ? 10.5 : 14));

    doc.setDrawColor(220, 225, 240);
    doc.line(W / 2, infoBoxY + (isA5 ? 1.5 : 2), W / 2, infoBoxY + (isA5 ? 22.5 : 30));

    autoTable(doc, {
      startY: infoBoxY + (isA5 ? 27 : 36),
      head: [["Description", "Montant"]],
      body: [
        ["Total Attendu — Frais annuels de scolarité", formatCfaAmount(totalExpected)],
        ["Total Déjà Payé", formatCfaAmount(totalPaid)],
        ...(totalReduction > 0 ? [["Réduction / Bourse", "- " + formatCfaAmount(totalReduction)]] : []),
      ],
      foot: [["SOLDE RESTANT", formatCfaAmount(balance)]],
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: isA5 ? 7 : 9,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: { fontSize: isA5 ? 7 : 9, cellPadding: isA5 ? 2.5 : 4, overflow: 'linebreak' },
      footStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: isA5 ? 7.5 : 10,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: isA5 ? 92 : 130 },
        1: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
    });

    const tableBottom = (doc as any).lastAutoTable.finalY;

    // Grid layout at bottom
    const badgeY = tableBottom + (isA5 ? 8 : 12);
    const isOk = balance <= 0;
    
    // Status Badge (Left)
    doc.setFillColor(...(isOk ? [236, 253, 245] : [255, 251, 235]) as [number, number, number]);
    doc.setDrawColor(...(isOk ? [167, 243, 208] : [253, 230, 138]) as [number, number, number]);
    doc.roundedRect(margin, badgeY, isA5 ? 45 : 60, isA5 ? 7 : 10, isA5 ? 1.5 : 2, isA5 ? 1.5 : 2, "FD");
    doc.setFontSize(isA5 ? 6 : 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(isOk ? [6, 120, 80] : [146, 64, 14]) as [number, number, number]);
    doc.text(
      isOk ? "✓ SOLDÉ — COMPLET" : "⏳ EN COURS — DU",
      margin + (isA5 ? 22.5 : 30),
      badgeY + (isA5 ? 4.8 : 6.5),
      { align: "center" }
    );

    // Official circular stamp (Center)
    const stampX = W / 2;
    const stampY = badgeY + (isA5 ? 3.5 : 5);
    const stampRadius = isA5 ? 9 : 14;
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(isA5 ? 0.4 : 0.6);
    doc.setGState(new (doc as any).GState({ opacity: 0.25 }));
    doc.circle(stampX, stampY, stampRadius, "S");
    doc.circle(stampX, stampY, stampRadius - 2, "S");
    doc.setFontSize(isA5 ? 3.5 : 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`${schoolName}\nNIAMEY - NIGER`, stampX, stampY - (isA5 ? 1.5 : 2), { align: "center" });
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // Signature Area & Line (Right-Center)
    const sigX = W - margin - (isA5 ? 45 : 65);
    const sigLineWidth = isA5 ? 30 : 45;
    doc.setFontSize(isA5 ? 5.5 : 7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 130, 150);
    doc.text("Signature & Cachet", sigX + (sigLineWidth / 2), badgeY, { align: "center" });
    doc.setDrawColor(200, 210, 220);
    doc.line(sigX, badgeY + (isA5 ? 11 : 15), sigX + sigLineWidth, badgeY + (isA5 ? 11 : 15));

    const footerY = H - (isA5 ? 14 : 18);
    doc.setDrawColor(220, 225, 240);
    doc.line(margin, footerY - 2, W - margin, footerY - 2);
    doc.setFillColor(248, 250, 252);
    doc.rect(0, footerY - 2, W, isA5 ? 16 : 20, "F");
    doc.setFontSize(isA5 ? 5.5 : 6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 160, 180);
    doc.text(
      "Merci pour votre confiance. Ce reçu est délivré à titre de preuve de paiement.",
      W / 2,
      footerY + 1.5,
      { align: "center" }
    );
    doc.setFontSize(isA5 ? 5 : 6);
    doc.text(
      `Généré le ${new Date().toLocaleDateString("fr-FR")} — ${schoolName} — ${schoolAddress}`,
      W / 2,
      footerY + (isA5 ? 5.5 : 7),
      { align: "center" }
    );

    doc.setFillColor(79, 70, 229);
    doc.rect(0, H - 2, W, 2, "F");

    // Fetch and append QR code containing reference, localId, and syncStatus
    let qrBase64 = "";
    try {
      const qrData = `REF: ${refNumber} | LOCAL_ID: ${feeData.id || "N/A"} | STATUS: ${isProvisoire ? "provisoire" : "officiel"}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      qrBase64 = await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = qrUrl;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve("");
      });
    } catch (e) {
      console.warn("Failed to load QR code for receipt PDF:", e);
    }

    if (qrBase64) {
      try {
        const qrSize = isA5 ? 12 : 18;
        doc.addImage(qrBase64, 'PNG', W - margin - qrSize, badgeY - (isA5 ? 3.5 : 5), qrSize, qrSize);
      } catch (e) {}
    }

    if (save) {
      const name = feeData.student?.nomEtudiant?.replace(/\s+/g, "_") || "eleve";
      doc.save(`Recu_${name}_${Date.now()}.pdf`);
      setPdfSuccess(true);
    }

    setIsGenerating(false);
    return doc;
  };ame}_${Date.now()}.pdf`);
      setPdfSuccess(true);
    }

    setIsGenerating(false);
    return doc;
  };

  // ---------- WHATSAPP ----------
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 8) return "Numéro trop court (minimum 8 chiffres).";
    if (cleaned.length > 15) return "Numéro trop long (maximum 15 chiffres).";
    return "";
  };

  const handleWhatsApp = async () => {
    const err = validatePhone(phoneNumber);
    if (err) { setPhoneError(err); return; }
    setPhoneError("");
    const cleaned = phoneNumber.replace(/\D/g, "");
    const text =
      `✅ *REÇU DE PAIEMENT — ${schoolName}*\n\n` +
      `👤 Élève : *${feeData.student?.nomEtudiant}*\n` +
      `📚 Classe : ${feeData.student?.classe}\n` +
      `🆔 Matricule : ${feeData.student?.numAdmission || "—"}\n\n` +
      `💰 Total attendu : ${fmt(totalExpected)}\n` +
      `✅ Total versé : ${fmt(totalPaid)}\n` +
      `📊 Solde restant : *${fmt(balance)}*\n\n` +
      `📅 Date : ${receiptDate}\n🔖 Réf : ${refNumber}\n\n` +
      `_Merci de votre confiance — ${schoolName}_`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-[2.5rem] bg-white p-0 overflow-hidden border-none shadow-2xl max-h-[96vh] flex flex-col">

        {/* ── Dialog Header ── */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-7 text-white shrink-0 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <FileText size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Reçu de Paiement</h2>
                <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">
                  {feeData.student?.nomEtudiant} · {feeData.session?.sessionName || "2024-2025"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl bg-white/10 p-1 gap-1 no-print">
                {(["receipt", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === tab ? "bg-white text-slate-900" : "text-white/70 hover:text-white"
                    )}
                  >
                    {tab === "receipt" ? "Reçu" : "Historique"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">

          {!isDataComplete && (
            <div className="m-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center gap-3 no-print">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-sm font-bold">Données incomplètes. Vérifiez les informations avant d'imprimer.</p>
            </div>
          )}
          {pdfSuccess && (
            <div className="m-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-3 no-print">
              <CheckCircle2 size={18} className="shrink-0" />
              <p className="text-sm font-bold">PDF généré et téléchargé avec succès !</p>
            </div>
          )}

          {activeTab === "receipt" ? (
            <div className="p-6">

              {/* ════════════════════════════════════════
                  RECEIPT DOCUMENT — matches reference image
                  ════════════════════════════════════════ */}
              <div
                id="receipt-print-area"
                data-paper-size={selectedPaperSize}
                className="bg-white rounded-[2rem] border border-slate-200 shadow-lg overflow-hidden transition-all duration-300"
                style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
              >
                {/* Top color accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-indigo-600 to-slate-900" />

                {/* ── HEADER: Logo | Title | Contact ── */}
                <div className="px-10 pt-7 pb-6 border-b border-slate-100">
                  <OfficialDocumentHeader config={receiptHeaderConfig} title={`Reçu de paiement - ${refNumber}`} variant="compact" />
                </div>

                {isProvisoire && (
                  <div className="mx-10 mt-6 bg-amber-500/10 border border-amber-500/20 text-amber-600 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse no-print">
                    <div className="flex items-center gap-3">
                      <AlertCircle size={20} className="text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">Reçu provisoire - Non synchronisé</p>
                        <p className="text-[10px] font-semibold mt-0.5">Ce versement a été enregistré localement et sera synchronisé dès le retour de la connexion.</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-600 rounded-xl text-[10px] font-black uppercase shrink-0">PROVISOIRE</span>
                  </div>
                )}

                <div className="hidden px-10 pt-7 pb-6 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-6">

                    {/* Left — Shield logo + school name */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-[68px] h-[68px] shrink-0">
                        <svg viewBox="0 0 68 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                          <path d="M34 3L5 15v22c0 17 13 32 29 37 16-5 29-20 29-37V15L34 3z" fill="#EEF2FF" stroke="#1E3A8A" strokeWidth="2.5" strokeLinejoin="round"/>
                          {/* Book left page */}
                          <rect x="19" y="28" width="13" height="16" rx="2" fill="none" stroke="#1E3A8A" strokeWidth="1.8"/>
                          <line x1="19" y1="36" x2="32" y2="36" stroke="#1E3A8A" strokeWidth="1.2"/>
                          <line x1="19" y1="40" x2="32" y2="40" stroke="#1E3A8A" strokeWidth="1.2"/>
                          {/* Book right page */}
                          <rect x="36" y="28" width="13" height="16" rx="2" fill="none" stroke="#1E3A8A" strokeWidth="1.8"/>
                          <line x1="36" y1="36" x2="49" y2="36" stroke="#1E3A8A" strokeWidth="1.2"/>
                          <line x1="36" y1="40" x2="49" y2="40" stroke="#1E3A8A" strokeWidth="1.2"/>
                          {/* Book spine */}
                          <path d="M32,28 Q34,26 36,28" fill="none" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M32,44 L34,47 L36,44" fill="none" stroke="#1E3A8A" strokeWidth="1.3" strokeLinejoin="round"/>
                          {/* Graduation cap */}
                          <polygon points="34,17 44,21 34,25 24,21" fill="none" stroke="#1E3A8A" strokeWidth="1.5" strokeLinejoin="round"/>
                          <line x1="44" y1="21" x2="44" y2="27" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round"/>
                          {/* Laurel left */}
                          <path d="M11,50 Q8,46 11,42" fill="none" stroke="#1E3A8A" strokeWidth="1.4" strokeLinecap="round"/>
                          <path d="M14,53 Q10,49 12,45" fill="none" stroke="#1E3A8A" strokeWidth="1.4" strokeLinecap="round"/>
                          {/* Laurel right */}
                          <path d="M57,50 Q60,46 57,42" fill="none" stroke="#1E3A8A" strokeWidth="1.4" strokeLinecap="round"/>
                          <path d="M54,53 Q58,49 56,45" fill="none" stroke="#1E3A8A" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[17px] font-black text-[#1E3A8A] leading-tight">{schoolName}</p>
                        <p className="text-[11px] text-slate-400 font-medium italic mt-0.5">Excellence en Éducation</p>
                      </div>
                    </div>

                    {/* Center — Big title + dot line + ref badge */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <h2 className="text-[2.1rem] font-black text-[#0F172A] tracking-tight text-center leading-none">
                        REÇU DE PAIEMENT
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-px w-12 bg-slate-200" />
                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        <div className="h-px w-12 bg-slate-200" />
                      </div>
                      <div className="px-5 py-1.5 rounded-lg border border-indigo-200 bg-white mt-1">
                        <p className="text-[13px] font-black text-indigo-700 tracking-widest uppercase">
                          RÉF : {refNumber}
                        </p>
                      </div>
                    </div>

                    {/* Right — Contact info list */}
                    <div className="space-y-1.5 shrink-0">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <p className="text-[11.5px] text-slate-600 font-medium">{schoolAddress}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <p className="text-[11.5px] text-slate-600 font-medium">
                          Année : {feeData.session?.sessionName || "2024 – 2025"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <p className="text-[11.5px] text-slate-600 font-medium">{schoolPhone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <p className="text-[11.5px] text-slate-600 font-medium">{schoolEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── STUDENT INFO + DATE (2-column with divider) ── */}
                <div className="bg-slate-50/80 border-b border-slate-100">
                  <div className="px-10 py-6 flex divide-x divide-slate-200">

                    {/* Left — Student info */}
                    <div className="flex-1 pr-10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <User size={15} className="text-slate-500" />
                        </div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          Informations Élève
                        </p>
                      </div>
                      <p className="text-[22px] font-black text-slate-900 leading-tight mb-4">
                        {feeData.student?.nomEtudiant || "—"}
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: "Classe", value: feeData.student?.classe },
                          { label: "Matricule", value: feeData.student?.numAdmission },
                          { label: "Année Scolaire", value: feeData.session?.sessionName || "2024 – 2025" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center gap-3 text-[12.5px]">
                            <span className="text-slate-500 font-medium w-28">{label}</span>
                            <span className="text-slate-400">:</span>
                            <span className="font-bold text-slate-700">{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right — Date */}
                    <div className="pl-10 flex flex-col justify-center min-w-[200px]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                          <Calendar size={15} className="text-emerald-600" />
                        </div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                          Date du Reçu
                        </p>
                      </div>
                      <p className="text-[26px] font-black text-slate-900 leading-tight">
                        {receiptDate}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── AMOUNTS TABLE ── */}
                <div className="border-b border-slate-100">

                  {/* Table header — dark navy */}
                  <div className="grid grid-cols-[1fr_220px] bg-[#0F172A] text-white px-8 py-4">
                    <p className="text-[10px] font-black uppercase tracking-widest">Description</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-right">Montant</p>
                  </div>

                  {/* Row 1: Total Attendu */}
                  <div className="grid grid-cols-[1fr_220px] px-8 py-4 items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <BookOpen size={18} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-slate-800">
                          Total Attendu{" "}
                          <span className="text-[10px] font-black text-slate-400">(ATTENDU)</span>
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Frais annuels de scolarité</p>
                      </div>
                    </div>
                    <p className="text-[14px] font-black text-slate-800 text-right">
                      {formatCfaAmount(totalExpected)}
                    </p>
                  </div>

                  {/* Row 2: Réduction (conditional) */}
                  {totalReduction > 0 && (
                    <div className="grid grid-cols-[1fr_220px] px-8 py-4 items-center border-b border-slate-100 bg-white">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                          <GraduationCap size={18} className="text-purple-500" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-800">Réduction / Bourse</p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Déduction accordée</p>
                        </div>
                      </div>
                      <p className="text-[14px] font-black text-purple-600 text-right">
                        - {formatCfaAmount(totalReduction)}
                      </p>
                    </div>
                  )}

                  {/* Row 3: Total Payé */}
                  <div className="grid grid-cols-[1fr_220px] px-8 py-4 items-center border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Wallet size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-slate-800">
                          Total Déjà Payé{" "}
                          <span className="text-[10px] font-black text-slate-400">(PAYÉ)</span>
                        </p>
                        {allPayments.length > 0 && (
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {allPayments.length} versement{allPayments.length > 1 ? "s" : ""} enregistré{allPayments.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-[14px] font-black text-slate-800 text-right">
                      {formatCfaAmount(totalPaid)}
                    </p>
                  </div>

                  {/* Balance row — light blue background, indigo amount */}
                  <div className="grid grid-cols-[1fr_220px] px-8 py-5 items-center bg-slate-50">
                    <p className="text-[13px] font-black text-slate-700 uppercase tracking-wider">Solde Restant</p>
                    <p className={cn(
                      "text-[22px] font-black text-right",
                      isSolde ? "text-emerald-600" : "text-indigo-600"
                    )}>
                      {formatCfaAmount(balance)}
                    </p>
                  </div>
                </div>

                {/* ── FOOTER: Status Badge | Stamp | Signature ── */}
                <div className="px-10 py-8 flex items-center justify-between gap-6">

                  {/* Status badge */}
                  <div className={cn(
                    "flex items-center gap-3 px-5 py-3 rounded-2xl border",
                    isSolde
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isSolde ? "bg-emerald-100" : "bg-amber-100"
                    )}>
                      {isSolde ? <CheckCircle2 size={16} /> : <Hourglass size={16} />}
                    </div>
                    <p className="text-[10.5px] font-black uppercase tracking-widest">
                      {isSolde ? "✓ SOLDÉ — PAIEMENT COMPLET" : "EN COURS – RESTE À PAYER"}
                    </p>
                  </div>

                  {/* Official circular stamp */}
                  <div className="flex items-center justify-center shrink-0">
                    <svg width="115" height="115" className="stamp-svg transition-all duration-300" viewBox="0 0 115 115" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <path id="topArc" d="M 10,57.5 A 47.5,47.5 0 0,1 105,57.5" />
                        <path id="bottomArc" d="M 21,74 A 40,40 0 0,0 94,74" />
                      </defs>
                      {/* Outer ring */}
                      <circle cx="57.5" cy="57.5" r="53" stroke="#1E40AF" strokeWidth="2.5" />
                      {/* Inner ring */}
                      <circle cx="57.5" cy="57.5" r="44" stroke="#1E40AF" strokeWidth="1.2" />
                      {/* Top text — School Name */}
                      <text fontSize="8.5" fill="#1E40AF" fontWeight="700" letterSpacing="1.5">
                        <textPath href="#topArc" startOffset="50%" textAnchor="middle">★ {schoolName.toUpperCase()} ★</textPath>
                      </text>
                      {/* Bottom text — Address */}
                      <text fontSize="7.5" fill="#1E40AF" fontWeight="700" letterSpacing="1.5">
                        <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">{schoolAddress.toUpperCase()}</textPath>
                      </text>
                      {/* Center: open book */}
                      <rect x="38" y="42" width="18" height="22" rx="2.5" fill="none" stroke="#1E40AF" strokeWidth="1.8"/>
                      <line x1="38" y1="52" x2="56" y2="52" stroke="#1E40AF" strokeWidth="1.2"/>
                      <line x1="38" y1="57" x2="56" y2="57" stroke="#1E40AF" strokeWidth="1.2"/>
                      <rect x="59" y="42" width="18" height="22" rx="2.5" fill="none" stroke="#1E40AF" strokeWidth="1.8"/>
                      <line x1="59" y1="52" x2="77" y2="52" stroke="#1E40AF" strokeWidth="1.2"/>
                      <line x1="59" y1="57" x2="77" y2="57" stroke="#1E40AF" strokeWidth="1.2"/>
                      <path d="M56,42 Q57.5,40 59,42" fill="none" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M56,64 L57.5,67 L59,64" fill="none" stroke="#1E40AF" strokeWidth="1.3" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Signature area */}
                  <div className="w-52 signature-area space-y-2 transition-all duration-300">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Signature &amp; Cachet
                    </p>
                    <div className="h-16 border-b border-slate-200 flex items-end justify-center pb-2">
                      <svg width="120" height="38" viewBox="0 0 120 38" className="text-slate-300">
                        <path
                          d="M8,28 C16,10 24,32 34,20 C44,8 52,30 62,22 C72,14 80,26 90,18 C98,12 108,20 114,16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <p className="text-[9px] text-center font-bold text-slate-400">Le Responsable Financier</p>
                  </div>
                </div>

                {/* Disclaimer bar */}
                <div className="px-10 pb-7">
                  <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Info size={13} className="text-slate-400 shrink-0" />
                    <p className="text-[11px] font-medium text-slate-400">
                      Merci pour votre confiance. Ce reçu est délivré à titre de preuve de paiement.
                    </p>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-indigo-600 to-slate-900" />
              </div>

              {/* ── WhatsApp Section ── */}
              <div className="mt-5 bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
                    <Send size={17} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">Envoyer par WhatsApp</p>
                    <p className="text-[10px] text-slate-400 font-medium">Envoi direct de la notification de paiement au parent</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Numéro WhatsApp (avec indicatif pays, ex: 22790000000)
                  </Label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <Input
                        value={phoneNumber}
                        onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(""); }}
                        placeholder="227 90 00 00 00"
                        className={cn(
                          "pl-11 rounded-2xl bg-slate-50 h-12 text-sm font-bold border-slate-100",
                          phoneError ? "border-rose-300 ring-1 ring-rose-200" : ""
                        )}
                      />
                    </div>
                    <Button
                      onClick={handleWhatsApp}
                      className="h-12 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all shrink-0"
                    >
                      <Send size={15} /> Envoyer
                    </Button>
                  </div>
                  {phoneError && (
                    <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 ml-1">
                      <AlertCircle size={11} /> {phoneError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── HISTORY TAB ── */
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Calendar size={15} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Historique des versements</p>
                  <p className="text-[10px] text-slate-400">{allPayments.length} versement(s) enregistré(s)</p>
                </div>
              </div>

              {allPayments.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-300">
                  <Wallet size={48} />
                  <p className="text-sm font-bold">Aucun versement enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allPayments.map((payment: any, idx: number) => (
                    <div
                      key={payment.id || idx}
                      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between hover:border-indigo-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          {getModeIcon(payment.paymentMode || "")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-black text-slate-800">{fmt(payment.amount || 0)}</p>
                            {payment.isProvisoire && (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[9px] font-black border border-amber-500/20 animate-pulse">
                                Provisoire (en attente)
                              </span>
                            )}
                            {payment.reduction > 0 && (
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[9px] font-black border border-purple-100">
                                -{fmt(payment.reduction)} réduc.
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-slate-400 font-medium">{payment.paymentMode || "—"}</span>
                            {payment.reference && (
                              <span className="text-[10px] text-indigo-500 font-bold">#{payment.reference}</span>
                            )}
                            {payment.monthConcerned && (
                              <span className="text-[10px] text-slate-400 font-medium">{payment.monthConcerned}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-slate-700">
                          {payment.datePaid
                            ? new Date(payment.datePaid).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </p>
                        {payment.recordedBy && (
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">par {payment.recordedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {allPayments.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { label: "Total attendu", value: fmt(totalExpected), color: "text-slate-700" },
                    { label: "Total versé", value: fmt(totalPaid), color: "text-emerald-600" },
                    { label: "Solde restant", value: fmt(balance), color: isSolde ? "text-emerald-600" : "text-amber-600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                      <p className={cn("text-base font-black", color)}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        <div className="p-5 bg-white border-t border-slate-100 flex justify-between items-center gap-4 shrink-0 no-print">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600"
          >
            Fermer
          </Button>
          <div className="flex gap-3 items-center">
            {/* Paper Size selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner mr-2">
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A4")}
                className={cn(
                  "h-8 px-4 rounded-xl text-xs font-black tracking-widest transition-all",
                  selectedPaperSize === "A4"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A5")}
                className={cn(
                  "h-8 px-4 rounded-xl text-xs font-black tracking-widest transition-all",
                  selectedPaperSize === "A5"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                A5
              </button>
            </div>

            <Button
              onClick={() => generatePDF(true)}
              disabled={!isDataComplete || isGenerating}
              variant="outline"
              className="h-11 px-5 rounded-2xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin" />
                  Génération...
                </span>
              ) : (
                <><Download size={15} /> PDF</>
              )}
            </Button>
            {isProvisoire ? (
              <Button
                onClick={handlePrint}
                className="h-11 px-7 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-amber-200 transition-all cursor-pointer"
              >
                <Printer size={15} /> Imprimer reçu provisoire
              </Button>
            ) : (
              <Button
                onClick={handlePrint}
                disabled={!isDataComplete}
                className="h-11 px-7 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-200 transition-all cursor-pointer"
              >
                <Printer size={15} /> Imprimer
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
