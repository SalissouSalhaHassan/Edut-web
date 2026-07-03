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

export default function UniversalReport({ metadata, kpis = [], table, onSendEmail }: UniversalReportProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
        link.click();
        document.body.removeChild(link);
      }
      toast.success(`Fichier ${format.toUpperCase()} téléchargé avec succès.`);
    } catch (error) {
      toast.error("Erreur lors de la génération du fichier Excel/CSV.");
      console.error(error);
    }
  };

  // 2. jsPDF PDF Generation Handler
  const handleExportPDF = () => {
    try {
      toast.success("Génération du rapport PDF officiel...");
      const doc = new jsPDF({
        orientation: metadata.isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Draw header border & backgrounds
      doc.setFillColor(248, 250, 252); // bg-slate-50
      doc.rect(10, 10, pageWidth - 20, 35, "F");
      doc.setDrawColor(226, 232, 240); // border-slate-200
      doc.rect(10, 10, pageWidth - 20, 35, "S");

      // Left part of PDF header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(37, 99, 235);
      doc.text("EDUT PRO - GESTION SCOLAIRE", 15, 17);

      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(metadata.title, 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(metadata.subtitle || "Rapport administratif automatisé", 15, 29);
      doc.text(`Année scolaire : ${metadata.academicYear}`, 15, 34);

      // Right part of PDF header (metadata panel)
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMATIONS DOCUMENT", pageWidth - 80, 17);
      doc.setFont("helvetica", "normal");
      doc.text(`Date d'édition : ${formattedDate} ${formattedTime}`, pageWidth - 80, 22);
      doc.text(`Édité par : ${metadata.editorName}`, pageWidth - 80, 27);
      doc.text(`Réf Rapport : ${metadata.reportId}`, pageWidth - 80, 32);

      // Draw general summary section if KPIs exist
      let currentY = 52;
      if (kpis && kpis.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("RÉSUMÉ DES INDICATEURS CLÉS", 10, currentY);
        doc.setDrawColor(226, 232, 240);
        doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
        currentY += 8;

        // Draw KPI boxes
        const boxWidth = (pageWidth - 20 - (kpis.length - 1) * 4) / kpis.length;
        kpis.forEach((kpi, idx) => {
          const startX = 10 + idx * (boxWidth + 4);
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(241, 245, 249);
          doc.rect(startX, currentY, boxWidth, 20, "DF");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.label.toUpperCase(), startX + 3, currentY + 5);

          doc.setFontSize(12);
          doc.setTextColor(37, 99, 235);
          doc.text(String(kpi.value), startX + 3, currentY + 12);

          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(148, 163, 184);
          doc.text(kpi.subtext || "", startX + 3, currentY + 17);
        });

        currentY += 26;
      }

      // Draw description block if exists
      if (metadata.description) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(10, currentY, pageWidth - 20, 14, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235);
        doc.text("À PROPOS DE CE RAPPORT", 14, currentY + 5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(metadata.description, 14, currentY + 10);
        
        // Mock QR Code block
        doc.rect(pageWidth - 25, currentY + 2, 10, 10);
        doc.setFontSize(5);
        doc.text("[QR]", pageWidth - 23, currentY + 8);
        
        currentY += 20;
      }

      // Render the main table
      if (table) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("DONNÉES DÉTAILLÉES", 10, currentY);
        doc.line(10, currentY + 2, pageWidth - 10, currentY + 2);
        currentY += 6;

        const tableBody = table.rows.map(row => {
          return row.map(cell => {
            if (typeof cell === "object") {
              return "[Détail]";
            }
            return String(cell);
          });
        });

        autoTable(doc, {
          startY: currentY,
          head: [table.headers],
          body: tableBody,
          theme: "striped",
          headStyles: {
            fillColor: [37, 99, 235], // blue-600
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: "bold",
          },
          bodyStyles: {
            fontSize: 7.5,
            textColor: [51, 65, 85],
          },
          margin: { left: 10, right: 10 },
          didDrawPage: (data) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text("Edut Pro - Gestion Scolaire", 10, pageHeight - 8);
            doc.text("CONFIDENTIEL - Document officiel destiné à l'usage interne", pageWidth / 2 - 35, pageHeight - 8);
            doc.text(`Page ${pageCount}`, pageWidth - 20, pageHeight - 8);
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      if (table?.summary && table.summary.length > 0 && currentY + 25 < pageHeight) {
        doc.setFillColor(250, 250, 250);
        doc.rect(10, currentY, pageWidth - 20, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        
        let textX = 14;
        table.summary.forEach((sum) => {
          doc.text(`${sum.label}: ${sum.value}`, textX, currentY + 6);
          textX += 45;
        });
        currentY += 16;
      }

      if (currentY + 30 > pageHeight) {
        doc.addPage();
        currentY = 20;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(10, currentY, pageWidth - 10, currentY);
      currentY += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("CONTRÔLE & SIGNATURES", 10, currentY);
      currentY += 8;

      const columnWidth = (pageWidth - 20) / 3;

      doc.text("LE CLIENT (Inspecteur / IEFA)", 15, currentY);
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, currentY + 3, columnWidth - 10, 16, "S");
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text("Signature & Cachet", 17, currentY + 22);

      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.rect(columnWidth + 15, currentY + 3, columnWidth - 10, 16, "DF");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("SYSTEME DE GESTION", columnWidth + 20, currentY + 9);
      doc.text("EDUT PRO SCOLAIRE", columnWidth + 22, currentY + 13);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("LA DIRECTION GENERALE", columnWidth * 2 + 15, currentY);
      doc.setDrawColor(203, 213, 225);
      doc.rect(columnWidth * 2 + 15, currentY + 3, columnWidth - 10, 16, "S");
      doc.setFontSize(6);
      doc.setFont("helvetica", "italic");
      doc.text("Signature & Cachet", columnWidth * 2 + 17, currentY + 22);

      doc.save(`${metadata.reportId}_${metadata.title.replace(/\s+/g, "_")}.pdf`);
      toast.success("Rapport PDF exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF.");
    }
  };

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
      <article className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 print:p-0 print:border-none print:shadow-none space-y-8 print:bg-white print:text-black">
        
        {/* ─── PRINTABLE OFFICIAL HEADER ─── */}
        {metadata.documentHeaderConfig ? (
          <OfficialDocumentHeader config={metadata.documentHeaderConfig} title={metadata.title} />
        ) : (
        <div className="w-full border-b-2 border-indigo-600 pb-5">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            
            {/* Left side: Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-100 shrink-0">
                EP
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">{metadata.moduleName}</p>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">{metadata.title}</h1>
                <p className="text-xs font-bold text-slate-500 mt-0.5">{metadata.subtitle || "Registre centralisé informatisé"}</p>
              </div>
            </div>

            {/* Right side: parameters */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 min-w-[280px] space-y-1 text-xs font-bold text-slate-600 print:bg-white print:border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Date d'édition :</span>
                <span className="text-slate-800">{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Année scolaire :</span>
                <span className="text-slate-800">{metadata.academicYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Généré par :</span>
                <span className="text-slate-800">{metadata.editorName}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-indigo-600">ID Rapport :</span>
                <span className="font-mono text-slate-900">{metadata.reportId}</span>
              </div>
            </div>

          </div>
        </div>
        )}

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
