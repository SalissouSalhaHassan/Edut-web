"use client";

import * as React from "react";
import { FileText, Printer, Filter, FileSpreadsheet, ChevronDown, Download, CheckCircle2, ShieldCheck, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Layers, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import { amiriFontBase64 } from "@/domains/printing/utils/amiri-font";
import { hasArabicCharacters, reshapeArabicText } from "@/domains/printing/utils/arabic-reshaper";

interface ClassSummary {
  className: string;
  expected: number;
  paid: number;
  unpaid: number;
  count: number;
  rate: number;
}

interface FinanceReportsProps {
  fees?: any[];
  classes?: any[];
  classSummary: ClassSummary[];
  stats: {
    totalExpected: number;
    totalPaid: number;
    totalDebts: number;
    recoveryRate: number;
    countPaid: number;
    countUnpaid: number;
    countPartial: number;
    totalStudents: number;
    revenueMonth: number;
    revenueYear: number;
  };
  isMounted: boolean;
}

export const ACCOUNTING_REPORTS = [
  { id: "journal", label: "Journal de caisse", desc: "Historique chronologique détaillé de tous les encaissements" },
  { id: "grandlivre", label: "Grand livre élèves", desc: "Fiche de compte individuel par élève avec débits et crédits" },
  { id: "balance", label: "Balance frais scolaires", desc: "État récapitulatif par classe : attendu, encaissé, créances et taux" },
  { id: "creances", label: "Créances élèves", desc: "Liste nominative des impayés et reliquats avec contacts parents" },
  { id: "annulations", label: "Annulations et remises", desc: "Registre des réductions accordées et motifs appliqués" },
  { id: "bourses", label: "Bourses & Exonérations", desc: "Suivi des élèves boursiers, taux d'exonération et net attendu" },
  { id: "audit", label: "Audit paiement", desc: "Journal de traçabilité des opérations de paiement et agents" },
  { id: "caissier", label: "Rapports par caissier", desc: "Performance et ventilation par mode de paiement par caissier" },
  { id: "tresorerie", label: "Rapport trésorerie", desc: "Ventilation des flux financiers par canal (Espèces, Mobile, Virement)" },
  { id: "prevision", label: "Prévision encaissement", desc: "Comparatif mensuel prévisions vs encaissements réels" },
];

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
    console.warn("Failed to check or register Amiri font in FinanceReports:", e);
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
  const address = headerConfig?.address || "Niamey, Niger";
  const phone = headerConfig?.phone || "+227 90 12 34 56";
  const email = headerConfig?.email || "contact@edutacademy.ne";
  const registrationNo = headerConfig?.registrationNo || "";
  const schoolYear = headerConfig?.schoolYear || "2024–2025";
  const ministry = headerConfig?.ministry || "Ministère de l'Éducation Nationale";
  const service = headerConfig?.service || "Service de la Scolarité & Comptabilité";
  const bp = headerConfig?.bp || "";
  const motto = headerConfig?.motto || "Discipline - Travail - Succès";
  
  const leftLogo = headerConfig?.leftLogo || "";
  const rightLogo = headerConfig?.rightLogo || leftLogo;
  const centerLogo = headerConfig?.centerLogo || leftLogo;

  const W = doc.internal.pageSize.getWidth();
  const isA5 = W <= 150;
  const margin = isA5 ? 8 : 12;
  const rightX = W - margin;
  const centerX = W / 2;

  // Draw institutional top banner
  if (style === "modern_card") {
    doc.setFillColor(15, 23, 42); // dark navy
    doc.roundedRect(margin, 8, W - 2 * margin, isA5 ? 20 : 26, 2, 2, "F");
    
    if (leftLogo) {
      try {
        doc.addImage(leftLogo, 'PNG', margin + 3, isA5 ? 9.5 : 11, isA5 ? 17 : 20, isA5 ? 17 : 20);
      } catch (e) {}
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA5 ? 10 : 13);
    drawWrappedText(doc, schoolName.toUpperCase(), margin + (isA5 ? 22 : 28), isA5 ? 13 : 16, W - 2 * margin - 35, "left");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(isA5 ? 6.5 : 8);
    doc.setTextColor(203, 213, 225);
    drawWrappedText(doc, `Année Scolaire : ${schoolYear} | ${service}`, margin + (isA5 ? 22 : 28), isA5 ? 18 : 22, W - 2 * margin - 35, "left");
    drawWrappedText(doc, `${address} ${phone ? '| Tél: ' + phone : ''}`, margin + (isA5 ? 22 : 28), isA5 ? 22.5 : 27, W - 2 * margin - 35, "left");
    
    doc.setTextColor(15, 23, 42);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 11 : 13);
      drawWrappedText(doc, title.toUpperCase(), centerX, isA5 ? 36 : 44, W - 2 * margin, "center");
      return isA5 ? 42 : 50;
    }
    return isA5 ? 32 : 38;
  }
  
  if (style === "bilingual_center_logo") {
    if (centerLogo) {
      try {
        doc.addImage(centerLogo, 'PNG', centerX - (isA5 ? 10 : 13), 8, isA5 ? 20 : 26, isA5 ? 20 : 26);
      } catch (e) {}
    }
    
    const leftLines = [
      headerConfig?.country || "RÉPUBLIQUE DU NIGER",
      ministry,
      schoolName,
      service,
      address,
      phone ? `Tél: ${phone}` : "",
      email ? `Email: ${email}` : "",
    ].filter(Boolean);

    const rightLines = [
      headerConfig?.countryAr || "جمهورية النيجر",
      headerConfig?.ministryAr || "وزارة التربية الوطنية",
      headerConfig?.schoolNameAr || schoolName,
      headerConfig?.serviceAr || "مصلحة الشؤون المالية",
      headerConfig?.addressAr || "",
      phone ? `الهاتف: ${phone}` : "",
      email ? `البريد: ${email}` : "",
    ].filter(Boolean);

    const colWidth = centerLogo ? (centerX - margin - (isA5 ? 12 : 15)) : (centerX - margin - 4);
    
    let leftY = isA5 ? 9 : 11;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(isA5 ? 6 : 7.5);
    doc.setTextColor(15, 23, 42);
    for (const line of leftLines) {
      const height = drawWrappedText(doc, line, margin, leftY, colWidth, "left");
      leftY += height + 0.5;
    }
    
    let rightY = isA5 ? 9 : 11;
    for (const line of rightLines) {
      const height = drawWrappedText(doc, line, rightX, rightY, colWidth, "right");
      rightY += height + 0.5;
    }
    
    const maxY = Math.max(leftY, rightY);
    doc.setLineWidth(0.4);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, maxY + 2, rightX, maxY + 2);
    
    if (title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 11 : 13);
      doc.setTextColor(15, 23, 42);
      drawWrappedText(doc, title.toUpperCase(), centerX, maxY + (isA5 ? 8 : 10), W - 2 * margin, "center");
      return maxY + (isA5 ? 13 : 16);
    }
    return maxY + 4;
  }
  
  // DEFAULT / CLASSIC DUAL LOGO
  if (leftLogo) {
    try {
      doc.addImage(leftLogo, 'PNG', margin, 8, isA5 ? 16 : 22, isA5 ? 16 : 22);
    } catch (e) {}
  }
  if (rightLogo && rightLogo !== leftLogo) {
    try {
      doc.addImage(rightLogo, 'PNG', rightX - (isA5 ? 16 : 22), 8, isA5 ? 16 : 22, isA5 ? 16 : 22);
    } catch (e) {}
  }
  
  const centerLines = [
    schoolName,
    motto ? `« ${motto} »` : "",
    [registrationNo && `Agrément : ${registrationNo}`, `Année Scolaire : ${schoolYear}`].filter(Boolean).join(" | "),
    [phone && `Tél : ${phone}`, email && `Email : ${email}`].filter(Boolean).join(" | "),
    address ? `Adresse : ${address}` : "",
  ].filter(Boolean);

  let centerY = isA5 ? 9 : 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA5 ? 9.5 : 12);
  doc.setTextColor(15, 23, 42);
  const height0 = drawWrappedText(doc, centerLines[0].toUpperCase(), centerX, centerY, W - 2 * margin - (isA5 ? 36 : 50), "center");
  centerY += height0 + 1;

  doc.setFontSize(isA5 ? 6 : 7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  for (let i = 1; i < centerLines.length; i++) {
    if (i === 1 && motto) {
      doc.setFont("helvetica", "italic");
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - (isA5 ? 36 : 50), "center");
      centerY += height + 0.5;
      doc.setFont("helvetica", "normal");
    } else {
      const height = drawWrappedText(doc, centerLines[i], centerX, centerY, W - 2 * margin - (isA5 ? 36 : 50), "center");
      centerY += height + 0.5;
    }
  }
  
  const finalY = Math.max(centerY + 2, isA5 ? 24 : 32);
  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, finalY, rightX, finalY);
  
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA5 ? 10.5 : 13);
    doc.setTextColor(15, 23, 42);
    drawWrappedText(doc, title.toUpperCase(), centerX, finalY + (isA5 ? 7 : 9), W - 2 * margin, "center");
    return finalY + (isA5 ? 12 : 15);
  }
  return finalY + 2;
}

export default function FinanceReports({ fees = [], classes = [], classSummary = [], stats, isMounted }: FinanceReportsProps) {
  const [activeReport, setActiveReport] = React.useState("journal");
  const [headerConfig, setHeaderConfig] = React.useState<any>(null);
  const [selectedPaperSize, setSelectedPaperSize] = React.useState<"A4" | "A5">("A4");

  React.useEffect(() => {
    import("@/domains/settings/actions/settings.actions").then(({ getDocumentHeaderConfig }) => {
      getDocumentHeaderConfig().then((res) => {
        if (res?.data) {
          const cfg = (res.data as any).data || res.data;
          setHeaderConfig(cfg);
        }
      });
    });
  }, []);

  React.useEffect(() => {
    const styleId = "finance-report-size-print-style";
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    const pageMargin = selectedPaperSize === "A5" ? "8mm" : "12mm";
    style.innerHTML = `
      @media print {
        @page { size: ${selectedPaperSize} portrait; margin: ${pageMargin}; }
        body { background: white !important; color: black !important; }
        body > *:not(#finance-report-print-root) { display: none !important; }
        #finance-report-print-root {
          display: block !important;
          position: absolute;
          inset: 0;
          z-index: 9999;
          background: white;
          padding: 0;
          margin: 0;
        }
        #finance-report-print {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
        }
        #finance-report-print table {
          font-size: ${selectedPaperSize === "A5" ? "7.5px" : "9px"} !important;
        }
        #finance-report-print th {
          background-color: #0F172A !important;
          color: #ffffff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          padding: ${selectedPaperSize === "A5" ? "3px 4px" : "5px 6px"} !important;
        }
        #finance-report-print td {
          padding: ${selectedPaperSize === "A5" ? "3px 4px" : "4px 6px"} !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        #finance-report-print .no-print {
          display: none !important;
        }
      }
    `;
  }, [selectedPaperSize]);

  // ── FILTER STATES ──
  const [classFilter, setClassFilter] = React.useState("Tous");
  const [levelFilter, setLevelFilter] = React.useState("Tous");
  const [studentSearch, setStudentSearch] = React.useState("");
  const [cashierFilter, setCashierFilter] = React.useState("Tous");
  const [modeFilter, setModeFilter] = React.useState("Tous");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("Tous");
  const [refSearch, setRefSearch] = React.useState("");
  const [selectedFeeId, setSelectedFeeId] = React.useState<number | null>(null);

  const fmt = (v: number) => isMounted ? `${Math.round(v).toLocaleString("fr-FR")} CFA` : "—";
  const today = isMounted ? new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "";

  // ── DERIVED DATA ──
  const uniqueLevels = React.useMemo(() => Array.from(new Set(fees.map((f: any) => f.student?.educationalLevel).filter(Boolean))), [fees]);
  const allPayments = React.useMemo(() => fees.flatMap((fee: any) => (fee.payments || []).map((p: any) => ({
    ...p,
    studentName: fee.student?.nomEtudiant || "Inconnu",
    classe: fee.student?.classe || "-",
    level: fee.student?.educationalLevel || "-",
    feeStatus: fee.status,
    totalExpected: fee.totalExpected || 0,
    mobile: fee.student?.mobile,
  }))), [fees]);

  const uniqueCashiers = React.useMemo(() => Array.from(new Set(allPayments.map((p: any) => p.recordedBy).filter(Boolean))), [allPayments]);
  const uniqueModes = React.useMemo(() => Array.from(new Set(allPayments.map((p: any) => p.paymentMode).filter(Boolean))), [allPayments]);

  React.useEffect(() => {
    if (fees.length > 0 && selectedFeeId === null) setSelectedFeeId(fees[0].id);
  }, [fees, selectedFeeId]);

  // ── FILTERS ──
  const filteredPayments = React.useMemo(() => allPayments.filter((p: any) => {
    if (classFilter !== "Tous" && p.classe !== classFilter) return false;
    if (levelFilter !== "Tous" && p.level !== levelFilter) return false;
    if (cashierFilter !== "Tous" && p.recordedBy !== cashierFilter) return false;
    if (modeFilter !== "Tous" && p.paymentMode !== modeFilter) return false;
    if (statusFilter !== "Tous" && p.feeStatus !== statusFilter) return false;
    if (studentSearch) {
      const s = studentSearch.toLowerCase();
      if (!p.studentName.toLowerCase().includes(s)) return false;
    }
    if (refSearch && !p.reference?.toLowerCase().includes(refSearch.toLowerCase())) return false;
    if (startDate && p.datePaid && new Date(p.datePaid) < new Date(startDate)) return false;
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      if (p.datePaid && new Date(p.datePaid) > e) return false;
    }
    return true;
  }), [allPayments, classFilter, levelFilter, cashierFilter, modeFilter, statusFilter, studentSearch, refSearch, startDate, endDate]);

  const filteredFees = React.useMemo(() => fees.filter((f: any) => {
    if (classFilter !== "Tous" && f.student?.classe !== classFilter) return false;
    if (levelFilter !== "Tous" && f.student?.educationalLevel !== levelFilter) return false;
    if (statusFilter !== "Tous" && f.status !== statusFilter) return false;
    if (studentSearch && !f.student?.nomEtudiant?.toLowerCase().includes(studentSearch.toLowerCase())) return false;
    return true;
  }), [fees, classFilter, levelFilter, statusFilter, studentSearch]);

  const totalCollected = React.useMemo(() => filteredPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0), [filteredPayments]);
  const totalReductions = React.useMemo(() => filteredFees.reduce((s: number, f: any) => s + (f.totalReduction || 0), 0), [filteredFees]);

  // ── CASHIER REPORT ──
  const cashierReports = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number; cash: number; mob: number; bank: number }>();
    filteredPayments.forEach((p: any) => {
      const c = p.recordedBy || "Admin Scolarité";
      if (!map.has(c)) map.set(c, { count: 0, total: 0, cash: 0, mob: 0, bank: 0 });
      const e = map.get(c)!;
      e.count++; e.total += p.amount || 0;
      if (p.paymentMode === "Espèces") e.cash += p.amount || 0;
      else if (p.paymentMode === "Mobile Money") e.mob += p.amount || 0;
      else e.bank += p.amount || 0;
    });
    return Array.from(map.entries()).map(([cashier, data]) => ({ cashier, ...data }));
  }, [filteredPayments]);

  // ── TREASURY ──
  const treasuryReports = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredPayments.forEach((p: any) => {
      const mode = p.paymentMode || "Espèces";
      if (!map.has(mode)) map.set(mode, { count: 0, total: 0 });
      const e = map.get(mode)!; e.count++; e.total += p.amount || 0;
    });
    const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
    return Array.from(map.entries()).map(([mode, data]) => ({
      mode, ...data, pct: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0
    }));
  }, [filteredPayments]);

  // ── FORECAST ──
  const forecastMonths = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
  const monthNumMap: Record<number, string> = { 8:"Sept",9:"Oct",10:"Nov",11:"Déc",0:"Jan",1:"Fév",2:"Mar",3:"Avr",4:"Mai",5:"Juin" };
  const monthlyFeeBase = fees.reduce((s: number, f: any) => s + (f.student?.fraisMensuels || 0), 0);
  const forecastData = forecastMonths.map(m => {
    const actual = allPayments.filter((p: any) => p.datePaid && monthNumMap[new Date(p.datePaid).getMonth()] === m).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    return { month: m, expected: monthlyFeeBase, actual, gap: monthlyFeeBase - actual };
  });

  const currentFeeDetails = fees.find((f: any) => f.id === selectedFeeId) || fees[0];

  // ── REPORT SPECIFIC EXPORT DATA GENERATOR ──
  const getActiveReportDataset = (): {
    title: string;
    headers: string[];
    rows: (string | number)[][];
    kpis: { label: string; value: string }[];
  } => {
    const currentReportMeta = ACCOUNTING_REPORTS.find(r => r.id === activeReport) || ACCOUNTING_REPORTS[0];
    
    switch (activeReport) {
      case "journal": {
        const headers = ["N°", "Date", "Référence", "Élève", "Classe", "Mode", "Caissier", "Montant (CFA)"];
        const rows: (string | number)[][] = filteredPayments.map((p: any, idx: number) => [
          idx + 1,
          isMounted && p.datePaid ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-",
          p.reference || `REC-${p.id}`,
          p.studentName,
          p.classe,
          p.paymentMode || "Espèces",
          p.recordedBy || "Admin",
          `${(p.amount || 0).toLocaleString("fr-FR")} CFA`,
        ]);
        const kpis = [
          { label: "Total Encaissé", value: fmt(totalCollected) },
          { label: "Nombre de Reçus", value: `${filteredPayments.length}` },
          { label: "Taux Global", value: `${stats.recoveryRate}%` },
        ];
        return { title: "Journal de Caisse", headers, rows, kpis };
      }

      case "grandlivre": {
        const student = currentFeeDetails?.student;
        const headers = ["Date", "Réf", "Libellé de l'Opération", "Débit (Attendu)", "Crédit (Payé)", "Réduction", "Mode"];
        const rows: (string | number)[][] = [
          [
            "-",
            "INIT",
            "Facturation Frais Scolaires Annuels",
            `${(currentFeeDetails?.totalExpected || 0).toLocaleString("fr-FR")} CFA`,
            "-",
            "-",
            "-"
          ],
          ...(currentFeeDetails?.payments || []).map((pay: any) => [
            isMounted && pay.datePaid ? new Date(pay.datePaid).toLocaleDateString("fr-FR") : "-",
            pay.reference || `PAY-${pay.id}`,
            pay.monthConcerned || "Versement scolarité",
            "-",
            `${(pay.amount || 0).toLocaleString("fr-FR")} CFA`,
            pay.reduction ? `${(pay.reduction || 0).toLocaleString("fr-FR")} CFA` : "-",
            pay.paymentMode || "Espèces"
          ])
        ];
        const kpis = [
          { label: "Élève", value: student?.nomEtudiant || "—" },
          { label: "Total Attendu", value: fmt(currentFeeDetails?.totalExpected || 0) },
          { label: "Total Déjà Versé", value: fmt(currentFeeDetails?.totalPaid || 0) },
          { label: "Solde Restant Dû", value: fmt(currentFeeDetails?.balance || 0) },
        ];
        return { title: `Grand Livre - ${student?.nomEtudiant || "Élève"}`, headers, rows, kpis };
      }

      case "balance": {
        const headers = ["Classe", "Élèves", "Total Attendu", "Remises", "Total Encaissé", "Créances Dues", "Taux"];
        const rows: (string | number)[][] = classSummary.map((c) => {
          const totalReduc = fees.filter((f: any) => f.student?.classe === c.className).reduce((s: number, f: any) => s + (f.totalReduction || 0), 0);
          return [
            c.className,
            c.count,
            `${c.expected.toLocaleString("fr-FR")} CFA`,
            `${totalReduc.toLocaleString("fr-FR")} CFA`,
            `${c.paid.toLocaleString("fr-FR")} CFA`,
            `${c.unpaid.toLocaleString("fr-FR")} CFA`,
            `${c.rate}%`
          ];
        });
        const kpis = [
          { label: "Total Général Attendu", value: fmt(stats.totalExpected) },
          { label: "Total Général Encaissé", value: fmt(stats.totalPaid) },
          { label: "Créances Globales", value: fmt(stats.totalDebts) },
          { label: "Taux de Recouvrement", value: `${stats.recoveryRate}%` }
        ];
        return { title: "Balance des Frais Scolaires par Classe", headers, rows, kpis };
      }

      case "creances": {
        const unpaidFees = filteredFees.filter((f: any) => f.balance > 0);
        const headers = ["Élève", "Classe", "Total Attendu", "Remise", "Payé", "Créance Restante", "Statut", "Contact"];
        const rows: (string | number)[][] = unpaidFees.map((f: any) => [
          f.student?.nomEtudiant || "—",
          f.student?.classe || "—",
          `${(f.totalExpected || 0).toLocaleString("fr-FR")} CFA`,
          (f.totalReduction || 0) > 0 ? `${f.totalReduction.toLocaleString("fr-FR")} CFA` : "-",
          `${(f.totalPaid || 0).toLocaleString("fr-FR")} CFA`,
          `${(f.balance || 0).toLocaleString("fr-FR")} CFA`,
          f.status || "Impayé",
          f.student?.mobile || "-"
        ]);
        const totalDebt = unpaidFees.reduce((s: number, f: any) => s + (f.balance || 0), 0);
        const kpis = [
          { label: "Total Créances Dues", value: fmt(totalDebt) },
          { label: "Élèves en Dette", value: `${unpaidFees.length}` },
          { label: "Taux Recouvrement", value: `${stats.recoveryRate}%` }
        ];
        return { title: "État des Créances et Reliquats Élèves", headers, rows, kpis };
      }

      case "annulations": {
        const remises = filteredPayments.filter((p: any) => (p.reduction || 0) > 0);
        const headers = ["Date", "Élève", "Classe", "Référence", "Montant Remise", "Caissier", "Motif"];
        const rows: (string | number)[][] = remises.map((p: any) => [
          isMounted && p.datePaid ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-",
          p.studentName,
          p.classe,
          p.reference || "-",
          `${(p.reduction || 0).toLocaleString("fr-FR")} CFA`,
          p.recordedBy || "Admin",
          p.notes || "Remise exceptionnelle"
        ]);
        const totalRemise = remises.reduce((s: number, p: any) => s + (p.reduction || 0), 0);
        const kpis = [
          { label: "Total Remises Accordées", value: fmt(totalRemise) },
          { label: "Nombre d'Opérations", value: `${remises.length}` }
        ];
        return { title: "Registre des Annulations et Remises Accordées", headers, rows, kpis };
      }

      case "bourses": {
        const boursiers = filteredFees.filter((f: any) => (f.student?.bourse || 0) > 0 || (f.totalReduction || 0) > 0);
        const headers = ["Élève", "Classe", "Frais Standard", "Bourse / Exonération", "Net Attendu", "Total Versé", "Solde Restant"];
        const rows: (string | number)[][] = boursiers.map((f: any) => {
          const bv = (f.student?.bourse || 0) + (f.totalReduction || 0);
          return [
            f.student?.nomEtudiant || "—",
            f.student?.classe || "—",
            `${(f.totalExpected || 0).toLocaleString("fr-FR")} CFA`,
            `${bv.toLocaleString("fr-FR")} CFA`,
            `${((f.totalExpected || 0) - bv).toLocaleString("fr-FR")} CFA`,
            `${(f.totalPaid || 0).toLocaleString("fr-FR")} CFA`,
            `${(f.balance || 0).toLocaleString("fr-FR")} CFA`
          ];
        });
        const totalBourses = boursiers.reduce((s: number, f: any) => s + ((f.student?.bourse || 0) + (f.totalReduction || 0)), 0);
        const kpis = [
          { label: "Total Bourses & Exonérations", value: fmt(totalBourses) },
          { label: "Effectif Boursiers", value: `${boursiers.length}` }
        ];
        return { title: "Registre des Bourses et Exonérations", headers, rows, kpis };
      }

      case "audit": {
        const headers = ["Date & Heure", "Type d'Opération", "Référence", "Élève", "Montant (CFA)", "Agent / Caissier", "Canal"];
        const rows: (string | number)[][] = filteredPayments.map((p: any) => [
          isMounted && p.datePaid ? new Date(p.datePaid).toLocaleString("fr-FR") : "-",
          "ENCAISSEMENT",
          p.reference || `REC-${p.id}`,
          p.studentName,
          `${(p.amount || 0).toLocaleString("fr-FR")} CFA`,
          p.recordedBy || "Système",
          p.paymentMode || "Espèces"
        ]);
        const kpis = [
          { label: "Volume Audité", value: fmt(totalCollected) },
          { label: "Transactions", value: `${filteredPayments.length}` }
        ];
        return { title: "Journal d'Audit et Traçabilité des Paiements", headers, rows, kpis };
      }

      case "caissier": {
        const headers = ["Caissier / Agent", "Transactions", "Espèces", "Mobile Money", "Virements / Autres", "Total Collecté"];
        const rows: (string | number)[][] = cashierReports.map((c) => [
          c.cashier,
          c.count,
          `${c.cash.toLocaleString("fr-FR")} CFA`,
          `${c.mob.toLocaleString("fr-FR")} CFA`,
          `${c.bank.toLocaleString("fr-FR")} CFA`,
          `${c.total.toLocaleString("fr-FR")} CFA`
        ]);
        const grandTotal = cashierReports.reduce((s, c) => s + c.total, 0);
        const kpis = [
          { label: "Total Encaissements Agents", value: fmt(grandTotal) },
          { label: "Agents Actifs", value: `${cashierReports.length}` }
        ];
        return { title: "Rapport d'Encaissement par Caissier", headers, rows, kpis };
      }

      case "tresorerie": {
        const headers = ["Moyen / Canal de Paiement", "Nombre de Transactions", "Total Encaissé", "Part de Marché (%)"];
        const rows: (string | number)[][] = treasuryReports.map((t) => [
          t.mode,
          t.count,
          `${t.total.toLocaleString("fr-FR")} CFA`,
          `${t.pct}%`
        ]);
        const kpis = [
          { label: "Total Trésorerie Encaissée", value: fmt(totalCollected) },
          { label: "Transactions Globales", value: `${filteredPayments.length}` }
        ];
        return { title: "Rapport de Trésorerie & Ventilation par Canal", headers, rows, kpis };
      }

      case "prevision": {
        const headers = ["Mois Scolaire", "Revenu Mensuel Prévu", "Encaissement Réel", "Écart de Recouvrement", "Taux de Réalisation"];
        const rows: (string | number)[][] = forecastData.map((f) => {
          const rate = f.expected > 0 ? Math.round((f.actual / f.expected) * 100) : 0;
          return [
            f.month,
            `${f.expected.toLocaleString("fr-FR")} CFA`,
            `${f.actual.toLocaleString("fr-FR")} CFA`,
            `${f.gap.toLocaleString("fr-FR")} CFA`,
            `${rate}%`
          ];
        });
        const totalActual = forecastData.reduce((s, f) => s + f.actual, 0);
        const kpis = [
          { label: "Base Mensuelle Prévue", value: fmt(monthlyFeeBase) },
          { label: "Total Encaissé Cumulé", value: fmt(totalActual) },
          { label: "Créances Restantes", value: fmt(stats.totalDebts) }
        ];
        return { title: "Prévision d'Encaissement et Suivi Budgétaire", headers, rows, kpis };
      }

      default: {
        const headers = ["Date", "Référence", "Élève", "Classe", "Mode", "Montant"];
        const rows: (string | number)[][] = filteredPayments.map((p: any) => [
          isMounted && p.datePaid ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-",
          p.reference || "-",
          p.studentName,
          p.classe,
          p.paymentMode,
          `${(p.amount || 0).toLocaleString("fr-FR")} CFA`
        ]);
        return { title: currentReportMeta.label, headers, rows, kpis: [] };
      }
    }
  };

  // ── EXPORT CSV ──
  const exportToCSV = () => {
    const { title, headers, rows } = getActiveReportDataset();
    if (!rows.length) {
      toast.error("Aucune donnée à exporter.");
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [
      headers.join(","),
      ...rows.map((row: (string | number)[]) => row.map((v: string | number) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const a = document.createElement("a");
    a.href = encodeURI(csvContent);
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Export CSV réussi !");
  };

  // ── EXPORT EXCEL ──
  const exportToExcel = () => {
    const { title, headers, rows } = getActiveReportDataset();
    if (!rows.length) {
      toast.error("Aucune donnée à exporter.");
      return;
    }
    const data = rows.map((row: (string | number)[]) => {
      const obj: Record<string, any> = {};
      headers.forEach((h: string, i: number) => {
        obj[h] = row[i];
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport");
    XLSX.writeFile(wb, `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.xlsx`);
    toast.success("Export Excel réussi !");
  };

  // ── EXPORT PDF (UNIVERSAL FOR ALL 10 REPORTS) ──
  const exportToPDF = () => {
    try {
      const isA5 = selectedPaperSize === "A5";
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: isA5 ? "a5" : "a4"
      });

      ensureAmiriRegistered(doc);

      const { title, headers, rows, kpis } = getActiveReportDataset();
      const startY = drawPDFHeader(doc, headerConfig, title);

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const margin = isA5 ? 8 : 12;

      // Filter summary metadata badge
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, startY + 2, W - 2 * margin, isA5 ? 7 : 9, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA5 ? 5.5 : 7.5);
      doc.setTextColor(71, 85, 105);

      const filterParts = [
        `Classe : ${classFilter}`,
        `Niveau : ${levelFilter}`,
        `Caissier : ${cashierFilter}`,
        `Mode : ${modeFilter}`,
        `Édité le : ${today}`
      ];
      doc.text(filterParts.join("   |   "), margin + 3, startY + (isA5 ? 6.5 : 8));

      // KPI boxes at top of PDF
      let tableStartY = startY + (isA5 ? 12 : 14);
      if (kpis && kpis.length > 0) {
        const kpiBoxWidth = (W - 2 * margin - (kpis.length - 1) * 3) / kpis.length;
        kpis.forEach((kpi: { label: string; value: string }, i: number) => {
          const kpiX = margin + i * (kpiBoxWidth + 3);
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(kpiX, tableStartY, kpiBoxWidth, isA5 ? 9 : 12, 1.5, 1.5, "FD");

          doc.setFont("helvetica", "normal");
          doc.setFontSize(isA5 ? 4.5 : 6);
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.label.toUpperCase(), kpiX + 2, tableStartY + (isA5 ? 3.5 : 4.5));

          doc.setFont("helvetica", "bold");
          doc.setFontSize(isA5 ? 6.5 : 8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(kpi.value, kpiX + 2, tableStartY + (isA5 ? 7.5 : 9.5));
        });
        tableStartY += isA5 ? 12 : 16;
      }

      // Prepare Arabic reshaped rows
      const reshapedRows = rows.map((row: (string | number)[]) => row.map((cell: string | number) => {
        const str = String(cell);
        return hasArabicCharacters(str) ? reshapeArabicText(str) : str;
      }));

      const reshapedHeaders = headers.map((h: string) => hasArabicCharacters(h) ? reshapeArabicText(h) : h);

      autoTable(doc, {
        head: [reshapedHeaders],
        body: reshapedRows,
        startY: tableStartY,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [15, 23, 42], // dark navy #0F172A
          textColor: [255, 255, 255],
          font: "Amiri",
          fontStyle: "bold",
          fontSize: isA5 ? 6.5 : 8,
          halign: "center",
          valign: "middle",
          cellPadding: isA5 ? 2 : 3.5,
        },
        styles: {
          font: "Amiri",
          fontSize: isA5 ? 6 : 7.5,
          textColor: [30, 41, 59],
          cellPadding: isA5 ? 1.8 : 3,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didDrawPage: (data) => {
          // Bottom security and legal footer on every page
          const footerY = H - (isA5 ? 6 : 8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(isA5 ? 4.5 : 6);
          doc.setTextColor(148, 163, 184);
          doc.text(`Document comptable officiel — ${headerConfig?.schoolName || "ÉCOLE EXCELLENCE"}`, margin, footerY);
          doc.text(`Page ${doc.internal.pages.length - 1}`, W - margin, footerY, { align: "right" });
        }
      });

      // Bottom Stamp & Signature Block on final page
      const finalTableY = (doc as any).lastAutoTable.finalY || (tableStartY + 30);
      if (finalTableY + (isA5 ? 25 : 32) < H - 15) {
        const sigY = finalTableY + (isA5 ? 6 : 8);
        
        // Left: Signature block
        doc.setFont("helvetica", "bold");
        doc.setFontSize(isA5 ? 5.5 : 7);
        doc.setTextColor(71, 85, 105);
        doc.text("Le Chef Comptable / Service Financier", margin + 5, sigY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(isA5 ? 4.5 : 6);
        doc.text("Signature & Cachet autorisés", margin + 5, sigY + (isA5 ? 3.5 : 4.5));
        doc.setDrawColor(203, 213, 225);
        doc.line(margin + 5, sigY + (isA5 ? 12 : 16), margin + (isA5 ? 45 : 60), sigY + (isA5 ? 12 : 16));

        // Center: Circular stamp
        const stampX = W / 2;
        const stampY = sigY + (isA5 ? 6 : 8);
        const stampR = isA5 ? 8 : 11;
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.circle(stampX, stampY, stampR, "S");
        doc.circle(stampX, stampY, stampR - 1.5, "S");
        doc.setFontSize(isA5 ? 3 : 4);
        doc.setFont("helvetica", "bold");
        doc.text("★ SERVICE COMPTABILITÉ ★", stampX, stampY - 1, { align: "center" });
        doc.text("ÉCOLE EXCELLENCE", stampX, stampY + 2.5, { align: "center" });

        // Right: Certified date
        doc.setFont("helvetica", "bold");
        doc.setFontSize(isA5 ? 5.5 : 7);
        doc.text(`Certifié conforme le ${today}`, W - margin - (isA5 ? 45 : 60), sigY);
      }

      doc.save(`${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${selectedPaperSize}_${Date.now()}.pdf`);
      toast.success(`PDF ${selectedPaperSize} généré avec succès !`);
    } catch (e: any) {
      console.error("PDF generation error:", e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  const handlePrint = () => {
    const printArea = document.getElementById("finance-report-print");
    if (!printArea) return;
    const clone = printArea.cloneNode(true) as HTMLElement;
    let root = document.getElementById("finance-report-print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "finance-report-print-root";
      document.body.appendChild(root);
    }
    root.innerHTML = "";
    root.appendChild(clone);
    window.print();
    setTimeout(() => {
      if (root) root.innerHTML = "";
    }, 1500);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
      {/* ── SIDEBAR (CENTRE COMPTABLE - RAPPORTS & BALANCE) ── */}
      <aside className="rounded-[28px] border border-slate-200/50 dark:border-slate-800 bg-white dark:bg-[#131622]/90 p-5 shadow-sm">
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-4 text-white shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-300" />
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Centre Comptable</p>
          </div>
          <h2 className="mt-1 text-base font-black tracking-tight">Rapports &amp; Balance</h2>
          <p className="text-[10px] text-slate-300 font-medium mt-0.5">10 états financiers &amp; comptables</p>
        </div>
        
        <div className="space-y-1 overflow-auto max-h-[70vh] pr-1">
          {ACCOUNTING_REPORTS.map((report) => {
            const isActive = activeReport === report.id;
            return (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all cursor-pointer",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800 shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-indigo-600 dark:hover:text-indigo-400"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                  isActive ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                )}>
                  <FileText size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black truncate">{report.label}</p>
                  <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{report.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <section className="min-w-0 space-y-5">

        {/* Filters */}
        <div className="bg-white dark:bg-[#131622]/90 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Filtres Avancés</span>
            </div>
            {(classFilter !== "Tous" || levelFilter !== "Tous" || cashierFilter !== "Tous" || modeFilter !== "Tous" || statusFilter !== "Tous" || studentSearch || refSearch || startDate || endDate) && (
              <button
                onClick={() => {
                  setClassFilter("Tous");
                  setLevelFilter("Tous");
                  setCashierFilter("Tous");
                  setModeFilter("Tous");
                  setStatusFilter("Tous");
                  setStudentSearch("");
                  setRefSearch("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Classe</label>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none">
                <option value="Tous">Toutes classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.className}>{c.className}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Niveau</label>
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none">
                <option value="Tous">Tous niveaux</option>
                {uniqueLevels.map((l: any) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Caissier</label>
              <select value={cashierFilter} onChange={e => setCashierFilter(e.target.value)} className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none">
                <option value="Tous">Tous caissiers</option>
                {uniqueCashiers.map((c: any) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Mode Paiement</label>
              <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none">
                <option value="Tous">Tous modes</option>
                {uniqueModes.map((m: any) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Statut</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none">
                <option value="Tous">Tous</option>
                <option value="Soldé">Soldé</option>
                <option value="Partiel">Partiel</option>
                <option value="Impayé">Impayé</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Date Début</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-[11px] font-bold rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Date Fin</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-[11px] font-bold rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Élève</label>
              <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Rechercher..." className="h-9 text-[11px] font-bold rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest block mb-1">Référence</label>
              <Input value={refSearch} onChange={e => setRefSearch(e.target.value)} placeholder="REC-XXXX..." className="h-9 text-[11px] font-bold rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-slate-100" />
            </div>
          </div>
        </div>

        {/* Action bar + Exports */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#131622]/90 px-6 py-4 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
          <div>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">Rapport Actuel</p>
            <h3 className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{ACCOUNTING_REPORTS.find(r => r.id === activeReport)?.label}</h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Size selector (A4 / A5) */}
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A4")}
                className={cn(
                  "h-7 px-3 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer",
                  selectedPaperSize === "A4"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaperSize("A5")}
                className={cn(
                  "h-7 px-3 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer",
                  selectedPaperSize === "A5"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
              >
                A5
              </button>
            </div>

            {/* PDF Export button */}
            <button
              onClick={exportToPDF}
              className="h-9 px-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-rose-700 dark:text-rose-400 cursor-pointer transition-all shadow-sm"
            >
              <FileText size={13} /> PDF ({selectedPaperSize})
            </button>

            {/* Excel Export button */}
            <button
              onClick={exportToExcel}
              className="h-9 px-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 cursor-pointer transition-all shadow-sm"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>

            {/* CSV Export button */}
            <button
              onClick={exportToCSV}
              className="h-9 px-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 cursor-pointer transition-all shadow-sm"
            >
              <Download size={13} /> CSV
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="h-9 px-5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <Printer size={13} /> Imprimer
            </button>
          </div>
        </div>

        {/* Dynamic KPI summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Encaissé Filtré", value: fmt(totalCollected), color: "emerald", icon: DollarSign },
            { label: "Remises Filtrées", value: fmt(totalReductions), color: "amber", icon: ArrowDownRight },
            { label: "Transactions", value: String(filteredPayments.length), color: "indigo", icon: Layers },
            { label: "Taux Recouvrement", value: `${stats.recoveryRate}%`, color: "slate", icon: CheckCircle2 },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white dark:bg-[#131622]/90 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className={cn("text-xl font-black mt-1",
                    kpi.color === "emerald" && "text-emerald-600 dark:text-emerald-400",
                    kpi.color === "amber" && "text-amber-600 dark:text-amber-400",
                    kpi.color === "indigo" && "text-indigo-600 dark:text-indigo-400",
                    kpi.color === "slate" && "text-slate-800 dark:text-white"
                  )}>{kpi.value}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Icon size={18} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── REPORT TABLE AREA (SCREEN + PRINT CONTAINER) ── */}
        <div id="finance-report-print" data-paper-size={selectedPaperSize} className="bg-white dark:bg-[#131622]/90 rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-6">
          
          {/* Printable Official Institutional Header */}
          <div className="hidden print:block mb-6">
            <OfficialDocumentHeader config={headerConfig} title={ACCOUNTING_REPORTS.find(r => r.id === activeReport)?.label || "Rapport Financier"} />
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold border-b border-slate-200 pb-2 mb-4">
              <span>Classe : {classFilter} | Niveau : {levelFilter} | Caissier : {cashierFilter}</span>
              <span>Date d'édition : {today}</span>
            </div>
          </div>

          {/* 1. JOURNAL DE CAISSE */}
          {activeReport === "journal" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["N°", "Date", "Référence", "Élève", "Classe", "Mode", "Caissier", "Montant"].map(h => (
                      <th key={h} className="px-4 py-3.5 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-bold italic">Aucune transaction enregistrée avec ces filtres.</td></tr>
                  ) : filteredPayments.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">{isMounted ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-"}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{p.reference || "-"}</td>
                      <td className="px-4 py-3 font-black text-slate-800 dark:text-slate-100">{p.studentName}</td>
                      <td className="px-4 py-3 font-bold text-slate-500 uppercase text-[10px]">{p.classe}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">{p.paymentMode || "Espèces"}</td>
                      <td className="px-4 py-3 text-slate-500">{p.recordedBy || "Admin"}</td>
                      <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 text-right">{(p.amount||0).toLocaleString("fr-FR")} CFA</td>
                    </tr>
                  ))}
                </tbody>
                {filteredPayments.length > 0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 font-black">
                    <tr>
                      <td colSpan={7} className="px-4 py-3.5 text-right uppercase tracking-wider text-slate-700 dark:text-slate-200">Total Encaissé :</td>
                      <td className="px-4 py-3.5 text-right text-emerald-600 dark:text-emerald-400 text-sm font-black">{fmt(totalCollected)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 2. GRAND LIVRE ELEVES */}
          {activeReport === "grandlivre" && (
            <div className="p-4 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 no-print">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sélectionner un élève</label>
                  <div className="relative">
                    <select value={selectedFeeId || ""} onChange={e => setSelectedFeeId(Number(e.target.value))} className="h-10 w-80 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none pr-8">
                      {fees.map((f: any) => <option key={f.id} value={f.id}>{f.student?.nomEtudiant} ({f.student?.classe})</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
                {currentFeeDetails && (
                  <div className="text-xs text-right ml-auto">
                    <p className="font-black text-slate-800 dark:text-white text-base">{currentFeeDetails.student?.nomEtudiant}</p>
                    <p className="text-slate-400 font-bold uppercase mt-0.5">Classe : {currentFeeDetails.student?.classe} | Matricule : {currentFeeDetails.student?.numAdmission}</p>
                  </div>
                )}
              </div>

              {currentFeeDetails && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Attendu Annuel", val: currentFeeDetails.totalExpected, color: "indigo" },
                      { label: "Bourse / Remise", val: (currentFeeDetails.totalReduction || 0) + (currentFeeDetails.student?.bourse || 0), color: "amber" },
                      { label: "Total Déjà Payé", val: currentFeeDetails.totalPaid, color: "emerald" },
                      { label: "Solde Restant Dû", val: currentFeeDetails.balance, color: "rose" },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                        <p className={cn("text-lg font-black mt-1", `text-${m.color}-600`)}>{fmt(m.val)}</p>
                      </div>
                    ))}
                  </div>

                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-[#0F172A] text-white">
                      <tr>
                        {["Date", "Référence", "Libellé de l'Opération", "Débit (Attendu)", "Crédit (Payé)", "Réduction", "Mode"].map(h => (
                          <th key={h} className="px-4 py-3 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr>
                        <td className="px-4 py-3.5 text-slate-400 font-bold">-</td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">INIT</td>
                        <td className="px-4 py-3.5 font-black text-slate-700 dark:text-slate-200">Facturation Frais Scolaires Annuels</td>
                        <td className="px-4 py-3.5 font-black text-indigo-600 dark:text-indigo-400">{currentFeeDetails.totalExpected.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-4 py-3.5 text-slate-400">-</td>
                        <td className="px-4 py-3.5 text-slate-400">-</td>
                        <td className="px-4 py-3.5 text-slate-400">-</td>
                      </tr>
                      {(currentFeeDetails.payments || []).map((pay: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5 font-bold text-slate-500">{isMounted ? new Date(pay.datePaid).toLocaleDateString("fr-FR") : "-"}</td>
                          <td className="px-4 py-3.5 font-mono text-slate-500">{pay.reference || "-"}</td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{pay.monthConcerned || "Versement scolarité"}</td>
                          <td className="px-4 py-3.5 text-slate-400">-</td>
                          <td className="px-4 py-3.5 font-black text-emerald-600 dark:text-emerald-400">{pay.amount.toLocaleString("fr-FR")} CFA</td>
                          <td className="px-4 py-3.5 font-bold text-amber-600">{pay.reduction ? `${pay.reduction.toLocaleString("fr-FR")} CFA` : "-"}</td>
                          <td className="px-4 py-3.5 text-slate-500">{pay.paymentMode || "Espèces"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* 3. BALANCE FRAIS SCOLAIRES */}
          {activeReport === "balance" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["Classe", "Élèves", "Total Attendu", "Remises", "Total Encaissé", "Créances Dues", "Taux"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classSummary.map((c, idx) => {
                    const totalReduc = fees.filter((f: any) => f.student?.classe === c.className).reduce((s: number, f: any) => s + (f.totalReduction || 0), 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-black text-slate-800 dark:text-slate-100">{c.className}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-500">{c.count}</td>
                        <td className="px-5 py-3.5 font-black text-indigo-600 dark:text-indigo-400">{c.expected.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5 font-bold text-amber-600">{totalReduc.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5 font-black text-emerald-600 dark:text-emerald-400">{c.paid.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5 font-black text-rose-500">{c.unpaid.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", c.rate >= 80 ? "bg-emerald-500" : c.rate >= 50 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${c.rate}%` }} />
                            </div>
                            <span className="text-[10px] font-black w-8 text-right text-slate-700 dark:text-slate-300">{c.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-indigo-50/60 dark:bg-indigo-950/50 border-t-2 border-indigo-200 dark:border-indigo-800 font-black">
                    <td className="px-5 py-4 font-black text-indigo-900 dark:text-indigo-300 text-[11px] uppercase">Total Général</td>
                    <td className="px-5 py-4 text-center font-black text-indigo-900 dark:text-indigo-300">{stats.totalStudents}</td>
                    <td className="px-5 py-4 font-black text-indigo-900 dark:text-indigo-300">{fmt(stats.totalExpected)}</td>
                    <td className="px-5 py-4 font-black text-amber-700 dark:text-amber-400">{fmt(totalReductions)}</td>
                    <td className="px-5 py-4 font-black text-emerald-700 dark:text-emerald-400">{fmt(stats.totalPaid)}</td>
                    <td className="px-5 py-4 font-black text-rose-600">{fmt(stats.totalDebts)}</td>
                    <td className="px-5 py-4 font-black text-indigo-900 dark:text-indigo-300">{stats.recoveryRate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 4. CREANCES ELEVES */}
          {activeReport === "creances" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["Élève", "Classe", "Total Dû", "Remise", "Total Payé", "Créance Restante", "Statut", "Contact Parent"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFees.filter((f: any) => f.balance > 0).length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-bold italic">Félicitations, aucune créance en cours !</td></tr>
                  ) : filteredFees.filter((f: any) => f.balance > 0).map((f: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-black text-slate-800 dark:text-slate-100">{f.student?.nomEtudiant}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500 uppercase text-[10px]">{f.student?.classe}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{(f.totalExpected||0).toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5 font-bold text-amber-600">{(f.totalReduction||0) > 0 ? `${f.totalReduction.toLocaleString("fr-FR")} CFA` : "-"}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600">{(f.totalPaid||0).toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5 font-black text-rose-500">{(f.balance||0).toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full font-bold text-[9px] uppercase">{f.status}</span></td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{f.student?.mobile || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. ANNULATIONS ET REMISES */}
          {activeReport === "annulations" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["Date", "Élève", "Classe", "Référence", "Montant Remise", "Caissier", "Motif"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.filter((p: any) => (p.reduction||0) > 0).length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-bold italic">Aucune remise enregistrée.</td></tr>
                  ) : filteredPayments.filter((p: any) => (p.reduction||0) > 0).map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-bold text-slate-600 dark:text-slate-300">{isMounted ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-"}</td>
                      <td className="px-5 py-3.5 font-black text-slate-800 dark:text-slate-100">{p.studentName}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500 uppercase text-[10px]">{p.classe}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{p.reference || "-"}</td>
                      <td className="px-5 py-3.5 font-black text-amber-600">{(p.reduction||0).toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5 text-slate-500">{p.recordedBy || "-"}</td>
                      <td className="px-5 py-3.5 italic text-slate-600 dark:text-slate-300">{p.notes || "Remise exceptionnelle"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. BOURSES */}
          {activeReport === "bourses" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["Élève", "Classe", "Frais Standard", "Bourse / Exon.", "Net Attendu", "Total Payé", "Solde"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFees.filter((f: any) => (f.student?.bourse||0) > 0 || (f.totalReduction||0) > 0).length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-bold italic">Aucune bourse enregistrée.</td></tr>
                  ) : filteredFees.filter((f: any) => (f.student?.bourse||0) > 0 || (f.totalReduction||0) > 0).map((f: any, i: number) => {
                    const bv = (f.student?.bourse||0) + (f.totalReduction||0);
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5 font-black text-slate-800 dark:text-slate-100">{f.student?.nomEtudiant}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-500 uppercase text-[10px]">{f.student?.classe}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{(f.totalExpected||0).toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5 font-black text-amber-600">{bv.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">{((f.totalExpected||0) - bv).toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5 font-bold text-emerald-600">{(f.totalPaid||0).toLocaleString("fr-FR")} CFA</td>
                        <td className="px-5 py-3.5 font-black text-rose-500">{(f.balance||0).toLocaleString("fr-FR")} CFA</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. AUDIT PAIEMENT */}
          {activeReport === "audit" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["Horodatage", "Type", "Référence", "Élève", "Montant", "Caissier", "Mode"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPayments.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-mono text-slate-500">{isMounted ? new Date(p.datePaid).toLocaleString("fr-FR") : "-"}</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-black text-[9px]">ENCAISSEMENT</span></td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">{p.reference || "-"}</td>
                      <td className="px-5 py-3.5 font-black text-slate-800 dark:text-slate-100">{p.studentName}</td>
                      <td className="px-5 py-3.5 font-black text-emerald-600 dark:text-emerald-400">{(p.amount||0).toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300">{p.recordedBy || "Système"}</td>
                      <td className="px-5 py-3.5 text-slate-500 uppercase text-[10px]">{p.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 8. RAPPORTS PAR CAISSIER */}
          {activeReport === "caissier" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["Caissier / Agent", "Transactions", "Espèces", "Mobile Money", "Autres Modes", "Total Collecté"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cashierReports.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-bold italic">Aucun caissier enregistré.</td></tr>
                  ) : cashierReports.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 font-black text-slate-800 dark:text-slate-100">{item.cashier}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-500">{item.count}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{item.cash.toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{item.mob.toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">{item.bank.toLocaleString("fr-FR")} CFA</td>
                      <td className="px-5 py-3.5 font-black text-emerald-600 dark:text-emerald-400">{item.total.toLocaleString("fr-FR")} CFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 9. RAPPORT TRESORERIE */}
          {activeReport === "tresorerie" && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-4">Répartition par Canal</h4>
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-[#0F172A] text-white">
                    <tr>
                      {["Mode", "Transactions", "Total CFA", "%"].map(h => (
                        <th key={h} className="px-4 py-3 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {treasuryReports.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-black text-slate-700 dark:text-slate-200">{t.mode}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-500">{t.count}</td>
                        <td className="px-4 py-3.5 font-black text-emerald-600 dark:text-emerald-400">{t.total.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-4 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">{t.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 flex flex-col justify-center space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal Principal</p>
                  <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{[...treasuryReports].sort((a,b) => b.total-a.total)[0]?.mode || "—"}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Total global collecté : {fmt(totalCollected)}</p>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  {treasuryReports.map((t, i) => (
                    <div key={i} style={{ width:`${t.pct}%` }} title={`${t.mode}: ${t.pct}%`}
                      className={cn("h-full", t.mode==="Espèces"&&"bg-emerald-500", t.mode==="Mobile Money"&&"bg-indigo-500", t.mode==="Virement"&&"bg-amber-500", !["Espèces","Mobile Money","Virement"].includes(t.mode)&&"bg-slate-400")} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10. PREVISION ENCAISSEMENT */}
          {activeReport === "prevision" && (
            <div className="p-4 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenus Mensuels Prévus</p>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{monthlyFeeBase.toLocaleString("fr-FR")} CFA / mois</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">sur {fees.length} élèves</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encaissements Réels</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalCollected.toLocaleString("fr-FR")} CFA</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Créances</p>
                  <p className="text-xl font-black text-rose-500 mt-1">{fmt(stats.totalDebts)}</p>
                </div>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead className="bg-[#0F172A] text-white">
                  <tr>
                    {["Mois Scolaire", "Prévision", "Encaissement Réel", "Écart", "Performance"].map(h => (
                      <th key={h} className="px-4 py-3 text-[9.5px] font-black uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {forecastData.map((f, i) => {
                    const rate = f.expected > 0 ? Math.round((f.actual/f.expected)*100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5 font-black text-slate-700 dark:text-slate-200">{f.month}</td>
                        <td className="px-4 py-3.5 font-semibold text-indigo-600 dark:text-indigo-400">{f.expected.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-4 py-3.5 font-black text-emerald-600 dark:text-emerald-400">{f.actual.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-4 py-3.5 font-bold text-rose-500">{f.gap.toLocaleString("fr-FR")} CFA</td>
                        <td className="px-4 py-3.5"><span className={cn("px-2 py-0.5 rounded font-black text-[9px]", rate >= 80 ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200")}>{rate}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Printable Signature & Cachet Section */}
          <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-slate-200">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-600">Le Responsable Financier</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Signature &amp; Cachet</p>
              <div className="h-16 border-b border-dashed border-slate-300 mt-2" />
            </div>
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[8px] text-slate-400 uppercase text-center p-2">
                Cachet Officiel Établissement
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-600">Le Chef d'Établissement</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Vu et approuvé</p>
              <div className="h-16 border-b border-dashed border-slate-300 mt-2" />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
