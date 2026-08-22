"use client";

import { useState, useRef, useMemo } from "react";
import {
  Printer,
  Download,
  FileText,
  X,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Users,
  Award,
  Calendar,
  Building,
  School,
  QrCode,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import OfficialDocumentHeader from "@/domains/printing/components/OfficialDocumentHeader";
import {
  type DocumentHeaderConfig,
  mergeDocumentHeaderConfig,
} from "@/domains/printing/document-header";

export type AdmissionsDocType = "letter" | "fiche" | "pv";

interface AdmissionsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  headerConfig?: Partial<DocumentHeaderConfig> | null;
  selectedApp?: any | null;
  applicationsList?: any[];
  stats?: {
    totalApplications: number;
    pendingReview: number;
    admitted: number;
    rejected: number;
  };
  filterInfo?: {
    status?: string;
    targetClass?: string;
    query?: string;
  };
  initialDocType?: AdmissionsDocType;
}

export default function AdmissionsPrintModal({
  isOpen,
  onClose,
  headerConfig,
  selectedApp,
  applicationsList = [],
  stats,
  filterInfo,
  initialDocType = "letter",
}: AdmissionsPrintModalProps) {
  const [docType, setDocType] = useState<AdmissionsDocType>(initialDocType);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const cfg = useMemo(() => mergeDocumentHeaderConfig(headerConfig), [headerConfig]);

  if (!isOpen) return null;

  const currentApp = selectedApp || applicationsList[0] || null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: docType === "pv" ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;

      // Extract colors from config
      const primaryHex = cfg.primaryColor || "#047857";
      const secondaryHex = cfg.secondaryColor || "#10b981";

      const schoolName = cfg.schoolName || "ÉTABLISSEMENT SCOLAIRE";
      const schoolNameAr = cfg.schoolNameAr || "";
      const country = cfg.country || "RÉPUBLIQUE DU NIGER";
      const ministry = cfg.ministry || "Ministère de l'Éducation Nationale";
      const motto = cfg.motto || "Discipline - Travail - Réussite";
      const schoolYear = cfg.schoolYear || "2024 - 2025";
      const currentYear = new Date().getFullYear();

      // ─── Header Rendering for PDF ─────────────────────────────
      let curY = 14;

      // Top bar strip
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(country.toUpperCase(), margin, curY);

      if (cfg.schoolCode) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Code : ${cfg.schoolCode}`, pageW - margin, curY, { align: "right" });
      }

      curY += 4.5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      doc.text(ministry, margin, curY);

      if (motto) {
        doc.setFont("helvetica", "italic");
        doc.text(motto, pageW - margin, curY, { align: "right" });
      }

      curY += 4.5;
      if (cfg.regionalDirection) {
        doc.setFont("helvetica", "normal");
        doc.text(cfg.regionalDirection, margin, curY);
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Année Scolaire : ${schoolYear}`, pageW - margin, curY, { align: "right" });

      curY += 6;
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.8);
      doc.line(margin, curY, pageW - margin, curY);
      curY += 2;
      doc.setLineWidth(0.3);
      doc.line(margin, curY, pageW - margin, curY);

      curY += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(schoolName.toUpperCase(), pageW / 2, curY, { align: "center" });

      if (cfg.address || cfg.phone || cfg.email) {
        curY += 4.5;
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const contactInfo = [cfg.address, cfg.bp ? `BP: ${cfg.bp}` : "", cfg.phone ? `Tél: ${cfg.phone}` : "", cfg.email ? `Email: ${cfg.email}` : ""].filter(Boolean).join("  •  ");
        doc.text(contactInfo, pageW / 2, curY, { align: "center" });
      }

      curY += 8;

      // ─── DOC TYPE SPECIFIC BODY ───────────────────────────────
      if (docType === "letter" && currentApp) {
        const studentName = `${(currentApp.studentLastName || "").toUpperCase()} ${currentApp.studentFirstName || ""}`;
        const matricule = currentApp.generatedMatricule || currentApp.matricule || "EN ATTENTE";
        const targetClass = currentApp.targetClass || "—";
        const decisionDate = currentApp.reviewedAt
          ? new Date(currentApp.reviewedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })
          : new Date().toLocaleDateString("fr-FR", { dateStyle: "long" });

        // Title box
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(16, 185, 129);
        doc.roundedRect(pageW / 2 - 50, curY, 100, 11, 2, 2, "FD");
        doc.setTextColor(4, 120, 87);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("LETTRE OFFICIELLE D'ADMISSION", pageW / 2, curY + 7.5, { align: "center" });

        curY += 18;

        // Intro
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        const intro = `La Direction de l'établissement ${schoolName} a le plaisir de vous notifier que le dossier de candidature déposé sous le numéro ${currentApp.applicationNumber} a été validé avec succès par la Commission d'Admission pour la rentrée scolaire en cours.`;
        const introLines = doc.splitTextToSize(intro, contentW);
        doc.text(introLines, margin, curY);
        curY += introLines.length * 4.8 + 6;

        // Candidate Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, curY, contentW, 44, 2, 2, "FD");

        const dataRows = [
          ["Élève Bénéficiaire :", studentName],
          ["Date & Lieu de Naissance :", `${currentApp.dateOfBirth || "N/A"} (${currentApp.placeOfBirth || "N/A"}) - Sexe: ${currentApp.gender === "M" ? "Masculin" : "Féminin"}`],
          ["Classe d'Admission :", targetClass],
          ["Matricule Scolaire Attribué :", matricule],
          ["Parent / Responsable Légal :", `${currentApp.parentName || "N/A"} (${currentApp.parentPhone || "N/A"})`],
        ];

        dataRows.forEach(([lbl, val], idx) => {
          const rowY = curY + 7 + idx * 7.5;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          doc.text(lbl, margin + 5, rowY);
          doc.setTextColor(15, 23, 42);
          if (lbl === "Matricule Scolaire Attribué :") {
            doc.setTextColor(4, 120, 87);
            doc.setFontSize(9.5);
          }
          doc.text(val, margin + 60, rowY);
        });

        curY += 52;

        if (currentApp.reviewNotes) {
          doc.setFillColor(254, 252, 232);
          doc.setDrawColor(250, 204, 21);
          doc.roundedRect(margin, curY, contentW, 14, 2, 2, "FD");
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(161, 98, 7);
          doc.text(`Observations de la commission : ${currentApp.reviewNotes}`, margin + 4, curY + 8);
          curY += 19;
        }

        // Instructions
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        const instruct = "Formalités obligatoires : Le parent ou tuteur légal est prié de se présenter au secrétariat de l'établissement muni de ce document officiel, d'une copie de l'acte de naissance, du dernier relevé de notes / carnet scolaire ainsi que du reçu de règlement des frais d'inscription.";
        const instructLines = doc.splitTextToSize(instruct, contentW);
        doc.text(instructLines, margin, curY);
        curY += instructLines.length * 4.5 + 10;

        // Signatures
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, curY, pageW - margin, curY);
        curY += 8;

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Le Parent / Tuteur Légal", margin + 15, curY);
        doc.text("Pour la Direction / Commission", pageW - margin - 55, curY);

        curY += 18;
        doc.setDrawColor(148, 163, 184);
        doc.line(margin + 5, curY, margin + 65, curY);
        doc.line(pageW - margin - 65, curY, pageW - margin - 5, curY);

        curY += 4;
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(148, 163, 184);
        doc.text("Signature du responsable", margin + 15, curY);
        doc.text("Cachet & Signature officielle", pageW - margin - 55, curY);
      } else if (docType === "fiche" && currentApp) {
        // Individual Registration Form
        const studentName = `${(currentApp.studentLastName || "").toUpperCase()} ${currentApp.studentFirstName || ""}`;
        
        doc.setFillColor(238, 242, 255);
        doc.setDrawColor(99, 102, 241);
        doc.roundedRect(pageW / 2 - 60, curY, 120, 11, 2, 2, "FD");
        doc.setTextColor(67, 56, 202);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("FICHE OFFICIELLE DE CANDIDATURE & INSCRIPTION", pageW / 2, curY + 7.5, { align: "center" });

        curY += 17;

        // Candidate Section Title
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("1. IDENTITÉ DU CANDIDAT", margin, curY);
        curY += 3;
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.4);
        doc.line(margin, curY, margin + 60, curY);
        curY += 5;

        const infoItems = [
          ["N° Dossier :", currentApp.applicationNumber || "N/A", "Classe souhaitée :", currentApp.targetClass || "N/A"],
          ["Nom & Prénom :", studentName, "Sexe :", currentApp.gender === "M" ? "Masculin (M)" : "Féminin (F)"],
          ["Date de Naissance :", currentApp.dateOfBirth || "N/A", "Lieu de Naissance :", currentApp.placeOfBirth || "Niamey"],
          ["Nationalité :", currentApp.nationality || "Nigérienne", "Matricule attribué :", currentApp.generatedMatricule || "—"],
          ["École de provenance :", currentApp.previousSchool || "N/A", "Moyenne précédente :", currentApp.previousGradeAvg ? `${currentApp.previousGradeAvg}/20` : "N/A"],
        ];

        doc.setFontSize(8.5);
        infoItems.forEach((row) => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text(row[0], margin, curY);
          doc.setTextColor(15, 23, 42);
          doc.text(row[1], margin + 35, curY);

          doc.setTextColor(100, 116, 139);
          doc.text(row[2], margin + 100, curY);
          doc.setTextColor(15, 23, 42);
          doc.text(row[3], margin + 140, curY);
          curY += 6;
        });

        curY += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("2. FAMILLE & CONTACTS D'URGENCE", margin, curY);
        curY += 3;
        doc.setDrawColor(99, 102, 241);
        doc.line(margin, curY, margin + 70, curY);
        curY += 5;

        const familyItems = [
          ["Parent / Tuteur :", currentApp.parentName || "N/A", "Lien de parenté :", currentApp.parentRelation || "Père"],
          ["Téléphone principal :", currentApp.parentPhone || "N/A", "WhatsApp :", currentApp.parentWhatsapp || currentApp.parentPhone || "N/A"],
          ["Email :", currentApp.parentEmail || "N/A", "Profession :", currentApp.parentProfession || "N/A"],
          ["Adresse / Quartier :", currentApp.address || "N/A", "Ville :", currentApp.city || "Niamey"],
        ];

        doc.setFontSize(8.5);
        familyItems.forEach((row) => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text(row[0], margin, curY);
          doc.setTextColor(15, 23, 42);
          doc.text(row[1], margin + 35, curY);

          doc.setTextColor(100, 116, 139);
          doc.text(row[2], margin + 100, curY);
          doc.setTextColor(15, 23, 42);
          doc.text(row[3], margin + 140, curY);
          curY += 6;
        });

        curY += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("3. DÉCISION DE LA COMMISSION", margin, curY);
        curY += 3;
        doc.setDrawColor(99, 102, 241);
        doc.line(margin, curY, margin + 65, curY);
        curY += 6;

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("Statut du dossier :", margin, curY);
        doc.setTextColor(currentApp.status === "Admis / Accepté" ? 4 : 220, currentApp.status === "Admis / Accepté" ? 120 : 38, currentApp.status === "Admis / Accepté" ? 87 : 38);
        doc.text(currentApp.status || "En attente", margin + 35, curY);

        doc.setTextColor(100, 116, 139);
        doc.text("Date de décision :", margin + 100, curY);
        doc.setTextColor(15, 23, 42);
        doc.text(currentApp.reviewedAt ? new Date(currentApp.reviewedAt).toLocaleDateString("fr-FR") : "En attente", margin + 140, curY);
        curY += 6;

        if (currentApp.reviewNotes) {
          doc.setTextColor(100, 116, 139);
          doc.text("Avis / Observations :", margin, curY);
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "normal");
          doc.text(currentApp.reviewNotes, margin + 35, curY);
          curY += 7;
        }

        curY += 10;
        doc.setDrawColor(203, 213, 225);
        doc.line(margin, curY, pageW - margin, curY);
        curY += 8;

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Signature du Déposant", margin + 15, curY);
        doc.text("Validation Commission / Direction", pageW - margin - 60, curY);

        curY += 18;
        doc.setDrawColor(148, 163, 184);
        doc.line(margin + 5, curY, margin + 65, curY);
        doc.line(pageW - margin - 65, curY, pageW - margin - 5, curY);
      } else {
        // PV / List of applications
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(148, 163, 184);
        doc.roundedRect(pageW / 2 - 80, curY, 160, 11, 2, 2, "FD");
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("PROCÈS-VERBAL DES ADMISSIONS & INSCRIPTIONS", pageW / 2, curY + 7.5, { align: "center" });

        curY += 16;

        // Metrics Summary Banner
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, curY, contentW, 12, 1.5, 1.5, "FD");
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        const statsSummary = `Total Dossiers : ${stats?.totalApplications || applicationsList.length}   |   Admis : ${stats?.admitted || 0}   |   En attente : ${stats?.pendingReview || 0}   |   Refusés : ${stats?.rejected || 0}   |   Classe : ${filterInfo?.targetClass || "Toutes"}   |   Statut : ${filterInfo?.status || "Tous"}`;
        doc.text(statsSummary, margin + 4, curY + 7.5);

        curY += 16;

        // Table Header
        const cols = [
          { title: "N° DOSSIER", w: 32 },
          { title: "CANDIDAT", w: 55 },
          { title: "SEXE / NÉ(E) LE", w: 35 },
          { title: "CLASSE", w: 25 },
          { title: "STATUT", w: 30 },
          { title: "MATRICULE", w: 35 },
          { title: "CONTACT PARENT", w: 45 },
        ];

        doc.setFillColor(15, 23, 42);
        doc.rect(margin, curY, contentW, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");

        let curX = margin + 2;
        cols.forEach((col) => {
          doc.text(col.title, curX, curY + 5);
          curX += col.w;
        });

        curY += 7;

        // Rows
        const rows = applicationsList.slice(0, 25);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");

        rows.forEach((app, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, curY, contentW, 6.5, "F");
          }
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, curY + 6.5, margin + contentW, curY + 6.5);

          curX = margin + 2;
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "bold");
          doc.text(app.applicationNumber || "-", curX, curY + 4.5);
          curX += cols[0].w;

          doc.setFont("helvetica", "normal");
          const name = `${(app.studentLastName || "").toUpperCase()} ${app.studentFirstName || ""}`.substring(0, 28);
          doc.text(name, curX, curY + 4.5);
          curX += cols[1].w;

          doc.text(`${app.gender || "-"} • ${app.dateOfBirth || "-"}`, curX, curY + 4.5);
          curX += cols[2].w;

          doc.text(app.targetClass || "-", curX, curY + 4.5);
          curX += cols[3].w;

          if (app.status === "Admis / Accepté") {
            doc.setTextColor(4, 120, 87);
            doc.setFont("helvetica", "bold");
          } else if (app.status === "Refusé") {
            doc.setTextColor(225, 29, 72);
          } else {
            doc.setTextColor(217, 119, 6);
          }
          doc.text(app.status || "En attente", curX, curY + 4.5);
          curX += cols[4].w;

          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "bold");
          doc.text(app.generatedMatricule || app.matricule || "—", curX, curY + 4.5);
          curX += cols[5].w;

          doc.setFont("helvetica", "normal");
          doc.text(`${app.parentName || ""} (${app.parentPhone || ""})`.substring(0, 24), curX, curY + 4.5);

          curY += 6.5;
        });

        curY += 12;
        doc.setDrawColor(15, 23, 42);
        doc.line(margin, curY, pageW - margin, curY);
        curY += 6;

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Le Secrétaire de Séance", margin + 20, curY);
        doc.text("Membres de la Commission", pageW / 2 - 20, curY);
        doc.text("Le Président du Jury / Directeur", pageW - margin - 60, curY);
      }

      // Footer
      doc.setFontSize(6.5);
      doc.setTextColor(156, 163, 175);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Document généré avec l'En-tête Officiel ${cfg.schoolName} · Edut Pro Système Intégré · ${new Date().toLocaleString("fr-FR")}`,
        pageW / 2,
        pageH - 6,
        { align: "center" }
      );

      const fileName = `${docType.toUpperCase()}_Admissions_${(currentApp?.studentLastName || "Registre").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      toast.success("Document PDF officiel téléchargé avec succès !");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("Erreur lors de la génération du PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden print:max-h-none print:border-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Top Action Header (Hidden when printing) */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <Printer size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Centre d'Impression & Documents Officiels
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  En-tête lié : {cfg.style}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Documents conformes avec la charte officielle de l'établissement configurée dans{" "}
                <Link
                  href="/dashboard/settings/headers"
                  target="_blank"
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  En-têtes Officiels & Designer <ExternalLink size={11} />
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="rounded-xl font-black text-xs bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 gap-1.5"
            >
              <Download size={15} />
              {isGeneratingPdf ? "Génération..." : "Télécharger PDF"}
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="rounded-xl font-black text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
            >
              <Printer size={15} />
              Imprimer (A4)
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Document Selector Pills (Hidden when printing) */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDocType("letter")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                docType === "letter"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Award size={15} />
              Lettre d'Admission Officielle
            </button>
            <button
              onClick={() => setDocType("fiche")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                docType === "fiche"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <FileText size={15} />
              Fiche Individuelle d'Inscription
            </button>
            <button
              onClick={() => setDocType("pv")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                docType === "pv"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Users size={15} />
              Procès-Verbal des Admissions (PV)
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-500" />
            Modèle A4 Normalisé • Prêt pour signature & cachet
          </div>
        </div>

        {/* ─── A4 PAPER PREVIEW CONTAINER ─────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printContainerRef}
            className="w-full max-w-[794px] min-h-[1050px] bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-2xl border border-slate-200/80 font-sans print:shadow-none print:border-none print:p-0 print:rounded-none print:max-w-none print:w-full"
          >
            {/* 1. Official Header from Designer */}
            <OfficialDocumentHeader
              config={cfg}
              title={
                docType === "letter"
                  ? "ATTESTATION OFFICIELLE D'ADMISSION"
                  : docType === "fiche"
                  ? "FICHE D'INSCRIPTION & DOSSIER SCOLAIRE"
                  : "PROCÈS-VERBAL DE LA COMMISSION D'ADMISSION"
              }
              variant="full"
              printDate={new Date().toLocaleDateString("fr-FR")}
              operatorName="Direction des Admissions"
              qrData={
                currentApp
                  ? `EDUT-ADM-${currentApp.applicationNumber}-${currentApp.generatedMatricule || "VAL"}`
                  : `EDUT-PV-ADMISSIONS-${new Date().getFullYear()}`
              }
            />

            {/* 2. Document Specific Body */}
            {docType === "letter" && currentApp && (
              <div className="mt-8 space-y-6 text-slate-800">
                {/* Formal Statement */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs font-semibold leading-relaxed text-emerald-950">
                  La Direction et la Commission des Admissions de l'établissement{" "}
                  <strong className="text-emerald-900">{cfg.schoolName}</strong> ont le plaisir d'informer le parent
                  ou tuteur légal que le dossier de candidature n°{" "}
                  <strong className="font-mono">{currentApp.applicationNumber}</strong> a été favorablement retenu
                  pour l'année scolaire <strong className="font-bold">{cfg.schoolYear}</strong>.
                </div>

                {/* Candidate Info Table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-between">
                    <span>Données de l'élève admis</span>
                    <span className="font-mono text-emerald-400">
                      Matricule : {currentApp.generatedMatricule || currentApp.matricule || "Nouveau"}
                    </span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-bold text-slate-500 w-1/3 bg-slate-50">Nom et Prénom :</td>
                        <td className="p-3 font-black text-slate-900 uppercase">
                          {currentApp.studentLastName} {currentApp.studentFirstName}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-bold text-slate-500 bg-slate-50">Classe d'Admission :</td>
                        <td className="p-3 font-bold text-emerald-700">{currentApp.targetClass}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-bold text-slate-500 bg-slate-50">Date et Lieu de Naissance :</td>
                        <td className="p-3 font-medium">
                          {currentApp.dateOfBirth} ({currentApp.placeOfBirth || "Niamey"}) • Sexe :{" "}
                          {currentApp.gender === "M" ? "Masculin" : "Féminin"}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-bold text-slate-500 bg-slate-50">Parent / Tuteur :</td>
                        <td className="p-3 font-medium">
                          {currentApp.parentName} ({currentApp.parentRelation || "Père"}) • Tél :{" "}
                          <span className="font-mono font-bold">{currentApp.parentPhone}</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-slate-500 bg-slate-50">Date de délibération :</td>
                        <td className="p-3 font-medium">
                          {currentApp.reviewedAt
                            ? new Date(currentApp.reviewedAt).toLocaleDateString("fr-FR", { dateStyle: "long" })
                            : new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {currentApp.reviewNotes && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 italic">
                    <strong>Observations de la commission :</strong> {currentApp.reviewNotes}
                  </div>
                )}

                {/* Instructions */}
                <div className="text-xs text-slate-600 leading-relaxed space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-slate-900">Modalités d'inscription définitive :</p>
                  <p>
                    1. Présentez-vous auprès de la scolarité avec la présente attestation officielle d'admission.
                  </p>
                  <p>2. Fournissez l'acte de naissance de l'élève et 2 photos d'identité récentes.</p>
                  <p>
                    3. Procédez au versement des droits d'inscription et de la première mensualité auprès de la caisse.
                  </p>
                </div>

                {/* Signatures & Stamps */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-black">
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Le Responsable / Parent</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Signature précédée de la mention "Lu et approuvé"
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Pour la Direction & Commission</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Cachet officiel et Signature autorisée
                    </div>
                  </div>
                </div>
              </div>
            )}

            {docType === "fiche" && currentApp && (
              <div className="mt-8 space-y-6 text-slate-800">
                {/* Student Photo and Core Dossier Header */}
                <div className="flex items-start justify-between gap-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Dossier de Candidature
                    </span>
                    <h4 className="text-base font-black text-slate-900">
                      {currentApp.studentLastName?.toUpperCase()} {currentApp.studentFirstName}
                    </h4>
                    <p className="font-semibold text-emerald-700">
                      Classe sollicitée : <span className="font-black">{currentApp.targetClass}</span>
                    </p>
                    <p className="font-mono text-slate-500">N° Dossier : {currentApp.applicationNumber}</p>
                  </div>

                  <div className="w-24 h-28 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-[10px] text-slate-400 text-center p-1 bg-white">
                    <span>Photo d'identité</span>
                    <span className="text-[8px] text-slate-300 mt-1">4 x 4 cm</span>
                  </div>
                </div>

                {/* Section 1: Civil State */}
                <div className="space-y-2">
                  <h5 className="text-xs font-black uppercase text-indigo-900 border-b border-indigo-200 pb-1">
                    1. État Civil & Scolarité Antérieure
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Date de naissance</span>
                      <span className="font-bold text-slate-900">{currentApp.dateOfBirth || "N/A"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Lieu de naissance</span>
                      <span className="font-bold text-slate-900">{currentApp.placeOfBirth || "Niamey"}</span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Sexe & Nationalité</span>
                      <span className="font-bold text-slate-900">
                        {currentApp.gender === "M" ? "Masculin" : "Féminin"} • {currentApp.nationality || "Nigérienne"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Établissement d'origine & Moyenne
                      </span>
                      <span className="font-bold text-slate-900">
                        {currentApp.previousSchool || "N/A"}{" "}
                        {currentApp.previousGradeAvg ? `(${currentApp.previousGradeAvg}/20)` : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Parent / Guardian */}
                <div className="space-y-2">
                  <h5 className="text-xs font-black uppercase text-indigo-900 border-b border-indigo-200 pb-1">
                    2. Coordonnées des Parents / Tuteurs
                  </h5>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Nom complet du responsable
                      </span>
                      <span className="font-bold text-slate-900">
                        {currentApp.parentName} ({currentApp.parentRelation || "Père"})
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">
                        Téléphone / WhatsApp
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {currentApp.parentPhone} {currentApp.parentWhatsapp ? `• WA: ${currentApp.parentWhatsapp}` : ""}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Email & Profession</span>
                      <span className="font-bold text-slate-900">
                        {currentApp.parentEmail || "N/A"} • {currentApp.parentProfession || "N/A"}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Adresse / Domicile</span>
                      <span className="font-bold text-slate-900">
                        {currentApp.address || "N/A"}, {currentApp.city || "Niamey"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Commission Decision */}
                <div className="space-y-2">
                  <h5 className="text-xs font-black uppercase text-indigo-900 border-b border-indigo-200 pb-1">
                    3. Décision Administrative
                  </h5>
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Statut de la demande</span>
                      <span
                        className={`font-black text-sm ${
                          currentApp.status === "Admis / Accepté"
                            ? "text-emerald-700"
                            : currentApp.status === "Refusé"
                            ? "text-rose-600"
                            : "text-amber-600"
                        }`}
                      >
                        {currentApp.status || "En attente"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block uppercase font-bold">Matricule Définitif</span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {currentApp.generatedMatricule || currentApp.matricule || "NON ATTRIBUÉ"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs font-black">
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Signature de l'agent d'accueil</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Date & Visa du secrétariat
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Signature & Cachet du Chef d'Établissement</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Décision d'inscription définitive
                    </div>
                  </div>
                </div>
              </div>
            )}

            {docType === "pv" && (
              <div className="mt-8 space-y-6 text-slate-800">
                {/* PV Summary stats */}
                <div className="grid grid-cols-4 gap-3 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Candidatures</span>
                    <span className="text-base font-black text-slate-900">
                      {stats?.totalApplications || applicationsList.length}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-600 block text-[10px] uppercase font-bold">Admis / Retenus</span>
                    <span className="text-base font-black text-emerald-700">{stats?.admitted || 0}</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-amber-600 block text-[10px] uppercase font-bold">En Examen / Attente</span>
                    <span className="text-base font-black text-amber-700">{stats?.pendingReview || 0}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-600 block text-[10px] uppercase font-bold">Non Retenus</span>
                    <span className="text-base font-black text-rose-700">{stats?.rejected || 0}</span>
                  </div>
                </div>

                {/* Candidate list table */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                        <th className="p-2.5">N° Dossier</th>
                        <th className="p-2.5">Candidat</th>
                        <th className="p-2.5">Classe</th>
                        <th className="p-2.5">Statut</th>
                        <th className="p-2.5">Matricule</th>
                        <th className="p-2.5">Contact Parent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {applicationsList.map((app, i) => (
                        <tr key={app.id || i} className={i % 2 === 1 ? "bg-slate-50/50" : ""}>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{app.applicationNumber}</td>
                          <td className="p-2.5 font-bold">
                            {app.studentLastName?.toUpperCase()} {app.studentFirstName}
                          </td>
                          <td className="p-2.5">{app.targetClass}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                app.status === "Admis / Accepté"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : app.status === "Refusé"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {app.status || "En attente"}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">
                            {app.generatedMatricule || app.matricule || "—"}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-500">{app.parentPhone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signatures of Deliberation Committee */}
                <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs font-black">
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Le Secrétaire du Jury</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Signature
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Membres de la Commission</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Signatures
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Le Président / Directeur</p>
                    <div className="border-t border-slate-300 pt-2 text-[10px] text-slate-400 font-normal">
                      Signature & Cachet
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
