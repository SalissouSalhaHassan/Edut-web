"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
];

const docTypes = [
  { id: "reussite", label: "Attestation de Réussite", arLabel: "شهادة نجاح مؤقتة", desc: "Attestation provisoire après délibération de fin d'année.", icon: Award, color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "scolarite", label: "Attestation de Scolarité", arLabel: "شهادة مدرسية", desc: "Attestation officielle prouvant la scolarisation régulière de l'élève.", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  { id: "inscription", label: "Attestation d'Inscription", arLabel: "شهادة تسجيل", desc: "Prouve l'inscription administrative de l'élève pour l'année scolaire.", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "travail", label: "Attestation de Travail", arLabel: "شهادة عمل", desc: "Destinée au personnel enseignant et administratif actif.", icon: Clock, color: "text-rose-600", bg: "bg-rose-50" },
];

export default function AdminDocsPage() {
  const [selectedDoc, setSelectedDoc] = useState("reussite");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState(mockStudents[0].id);
  const [signatoryRole, setSignatoryRole] = useState("LE DIRECTEUR DE L'ÉTABLISSEMENT");
  const [signatoryName, setSignatoryName] = useState("M. BAKO SANI");
  const [customComment, setCustomComment] = useState("");

  const activeDoc = docTypes.find((d) => d.id === selectedDoc) || docTypes[0];

  // Resolve active student or staff member
  const isStaffDoc = selectedDoc === "travail";
  const entities = isStaffDoc ? mockStaff : mockStudents;
  const filteredEntities = entities.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const activeEntity = entities.find((e) => e.id === selectedEntityId) || entities[0];

  const handleExportPDF = () => {
    try {
      toast.success("Génération du document officiel en haute résolution...");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top colored bar
      doc.setFillColor(30, 58, 138); // Institutional blue
      doc.rect(0, 0, pageWidth, 4, "F");

      // Left Header: French Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text("RÉPUBLIQUE DU NIGER", 20, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE", 20, 21);
      doc.setFont("helvetica", "bold");
      doc.text("Direction Régionale de Niamey", 20, 26);

      // Right Header: Arabic Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 58, 138);
      doc.text("الجمهورية النيجر", pageWidth - 20, 16, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text("وزارة التربية الوطنية", pageWidth - 20, 21, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text("المديرية الجهوية لنيامي", pageWidth - 20, 26, { align: "right" });

      // Center logo placeholder (Circle)
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(248, 250, 252);
      doc.circle(pageWidth / 2, 21, 9, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text("(ARMOIRIES)", pageWidth / 2, 28, { align: "center" });

      // Horizontal Divider
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.6);
      doc.line(20, 36, pageWidth - 20, 36);

      // Title Section
      let titleY = 48;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138);
      const titleText = activeDoc.label.toUpperCase();
      doc.text(`— • ${titleText} • —`, pageWidth / 2, titleY, { align: "center" });

      // Arabic title under french title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(99, 102, 241);
      doc.text(`* ${activeDoc.arLabel} *`, pageWidth / 2, titleY + 7, { align: "center" });

      // Body text introduction
      let bodyY = 70;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(51, 65, 85);
      
      let introText = "";
      if (selectedDoc === "reussite") {
        introText = "Le Directeur de l'Établissement certifie qu'après délibérations des notes scolaires et évaluations annuelles de fin d'année :";
      } else if (selectedDoc === "scolarite") {
        introText = `Je soussigné, ${signatoryName}, agissant en qualité de ${signatoryRole}, certifie par la présente attestation officielle que l'élève :`;
      } else if (selectedDoc === "inscription") {
        introText = "Il est officiellement certifié que l'élève désigné(e) ci-dessous est inscrit(e) dans les registres académiques de notre établissement :";
      } else {
        introText = `Je soussigné, ${signatoryName}, agissant en qualité de ${signatoryRole}, certifie par la présente attestation officielle que :`;
      }
      
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 40);
      doc.text(splitIntro, 20, bodyY);
      bodyY += splitIntro.length * 5 + 5;

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
        doc.text(student.name, 75, lineY);
        doc.setDrawColor(241, 245, 249);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 2: ID
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("ID ÉLÈVE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text(student.id, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 3: Classe
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("CLASSE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(`${student.class} (${student.year})`, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 4: Moyenne
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(selectedDoc === "reussite" ? "MOYENNE" : "SECTEUR", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.text(selectedDoc === "reussite" ? student.gpa : student.sector, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 5: Resultat / Status
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("RÉSULTAT", 30, lineY);
        doc.setFont("helvetica", "bold");
        if (student.status.includes("PROMU") || student.status.includes("ADMIS")) {
          doc.setTextColor(22, 163, 74); // Green
        } else {
          doc.setTextColor(220, 38, 38); // Red
        }
        doc.text(student.status, 75, lineY);
      } else {
        const staff = activeEntity as any;
        
        // Line 1: Nom
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("NOM COMPLET", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(staff.name, 75, lineY);
        doc.setDrawColor(241, 245, 249);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 2: ID
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("MATRICULE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text(staff.id, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 3: Role
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("FONCTION", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(staff.role, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 4: Service start
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("ENTRÉE EN SERVICE", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.text(staff.serviceStart, 75, lineY);
        doc.line(30, lineY + 3, pageWidth - 30, lineY + 3);

        // Line 5: Statut
        lineY += 10;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("STATUT", 30, lineY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text(staff.status.toUpperCase(), 75, lineY);
      }

      bodyY += 65;

      // Bottom Paragraph
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      let bottomText = "";
      if (selectedDoc === "reussite") {
        bottomText = "Cette attestation provisoire de réussite lui est accordée pour faire valoir ses droits académiques d'accès au niveau supérieur.";
      } else if (selectedDoc === "scolarite") {
        bottomText = "En foi de quoi, ce certificat de scolarité lui est délivré pour servir et valoir ce que de droit auprès des instances administratives.";
      } else if (selectedDoc === "inscription") {
        bottomText = "Cette attestation officielle confirme le statut d'inscription active pour toute l'année scolaire et administrative en cours.";
      } else {
        bottomText = "Cette attestation de travail lui est délivrée sur sa demande pour servir et valoir ce que de droit.";
      }
      
      const splitBottom = doc.splitTextToSize(bottomText, pageWidth - 40);
      doc.text(splitBottom, 20, bodyY);

      // Signatures section coordinates
      let sigY = pageHeight - 65;
      
      // Sceau Officiel
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text("SCEAU OFFICIEL", 35, sigY, { align: "center" });
      
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.4);
      doc.circle(35, sigY + 15, 12, "S");
      doc.setFontSize(5.5);
      doc.text("EDUT PRO", 35, sigY + 13, { align: "center" });
      doc.text("S.A.R.L", 35, sigY + 17, { align: "center" });

      // Verification Center (QR code placeholder)
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("VÉRIFICATION EN LIGNE", pageWidth / 2, sigY + 28, { align: "center" });
      
      // Simple representation of QR code
      doc.setDrawColor(148, 163, 184);
      doc.rect(pageWidth / 2 - 8, sigY + 4, 16, 16);
      doc.setFillColor(148, 163, 184);
      doc.rect(pageWidth / 2 - 7, sigY + 5, 4, 4, "F");
      doc.rect(pageWidth / 2 + 3, sigY + 5, 4, 4, "F");
      doc.rect(pageWidth / 2 - 7, sigY + 15, 4, 4, "F");

      // Right: Director Signature
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`FAIT LE : ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 20, sigY, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text(signatoryRole, pageWidth - 20, sigY + 5, { align: "right" });
      
      // Simulated Signature Path (Lines)
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(pageWidth - 55, sigY + 16, pageWidth - 25, sigY + 11);
      doc.line(pageWidth - 45, sigY + 12, pageWidth - 35, sigY + 18);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(signatoryName, pageWidth - 20, sigY + 24, { align: "right" });

      // Bottom colored Footer
      doc.setFillColor(79, 70, 229); // Purple-indigo footer
      doc.rect(0, pageHeight - 8, pageWidth, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text("Edut Pro – Centre d'Attestation Scolaire Officiel", 10, pageHeight - 3);
      
      const refText = `Réf : DOC-${activeDoc.id.toUpperCase()}-${Date.now().toString().slice(-6)}`;
      doc.text(refText, pageWidth - 10, pageHeight - 3, { align: "right" });

      doc.save(`Attestation_${activeDoc.id}_${activeEntity.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Document PDF exporté avec succès !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-4 md:p-8 space-y-6 print:p-0 print:bg-white print:text-black">
      
      {/* ─── PRINT PAGE SIZE CONFIGURATION ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: portrait !important;
            margin: 0 !important;
          }
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
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 18mm !important;
            box-sizing: border-box !important;
          }
        }
      `}} />

      {/* ─── WEB HEADER (Hidden on print) ─── */}
      <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50">
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            <FileText size={26} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600 font-sans">Administration & Attestations</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">الأوراق الرسمية والشهادات</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">Générez et imprimez des attestations officielles bilingues premium</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPDF}
            className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <Download size={15} /> Télécharger PDF
          </button>
          <button 
            onClick={() => window.print()}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Printer size={15} /> Imprimer
          </button>
        </div>
      </header>

      {/* ─── WEB DOCK LAYOUT ─── */}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr] print:block">
        
        {/* Left Control Panel (Hidden on print) */}
        <div className="space-y-6 print:hidden">
          
          {/* Document Types Selector */}
          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">1. Type de Document</h3>
            <div className="space-y-2">
              {docTypes.map((doc) => {
                const Icon = doc.icon;
                return (
                  <button
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoc(doc.id);
                      const currentList = doc.id === "travail" ? mockStaff : mockStudents;
                      setSelectedEntityId(currentList[0].id);
                    }}
                    className={cn(
                      "w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3",
                      selectedDoc === doc.id
                        ? "border-indigo-200 bg-indigo-50/40 text-indigo-700 font-bold"
                        : "border-slate-100 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", doc.bg, doc.color)}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black">{doc.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{doc.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Selector */}
          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {isStaffDoc ? "2. Sélectionner l'Employé" : "2. Sélectionner l'Élève"}
            </h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                placeholder={isStaffDoc ? "Rechercher un membre du personnel..." : "Rechercher un élève..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs"
              />
            </div>

            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
              {filteredEntities.map((ent) => (
                <button
                  key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border text-xs font-bold transition flex items-center gap-3",
                    selectedEntityId === ent.id
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-700"
                      : "border-slate-50 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <User size={16} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black truncate uppercase">{ent.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{ent.id} • {isStaffDoc ? (ent as any).role : (ent as any).class}</p>
                  </div>
                </button>
              ))}
              {filteredEntities.length === 0 && (
                <p className="text-[11px] text-slate-400 italic text-center py-4">Aucun résultat trouvé.</p>
              )}
            </div>
          </div>

          {/* Document Signatory Settings */}
          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">3. Paramètres de Signature</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase">Qualité du signataire</span>
                <input
                  value={signatoryRole}
                  onChange={(e) => setSignatoryRole(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase">Nom complet du signataire</span>
                <input
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase">Note / Observation spécifique (optionnel)</span>
                <textarea
                  placeholder="Ex: Délivré pour servir et valoir ce que de droit."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  className="w-full min-h-[60px] p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-700 text-xs bg-white resize-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Preview Panel (A4 simulated paper) */}
        <div className="flex justify-center print:block">
          
          <div className="print-container bg-white border border-slate-200 shadow-xl rounded-[32px] max-w-[800px] w-full p-12 md:p-14 aspect-[1/1.414] flex flex-col justify-between text-slate-900 relative overflow-hidden">
            
            {/* Top blue accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-900" />

            {/* WATERMARK BACKGROUND (Laurel & Graduation Cap) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none z-0">
              <svg width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-950">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>

            {/* 1. OFFICIAL DOCUMENT HEADER */}
            <div className="w-full border-b-[1.5px] border-blue-900 pb-5 z-10">
              <div className="flex justify-between items-start text-[10px] font-sans">
                {/* Left: French Header */}
                <div className="text-left space-y-1 text-slate-800">
                  <div className="flex items-center gap-2">
                    {/* Republic Niger Seal */}
                    <svg width="22" height="22" viewBox="0 0 100 100" className="text-amber-500">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" />
                      <circle cx="50" cy="50" r="28" fill="orange" />
                      <circle cx="50" cy="50" r="14" fill="green" />
                    </svg>
                    <p className="font-extrabold text-blue-900 text-xs tracking-tight">RÉPUBLIQUE DU NIGER</p>
                  </div>
                  <p className="text-[8px] font-bold text-slate-500 tracking-wider">MINISTÈRE DE L'ÉDUCATION NATIONALE</p>
                  <p className="text-[9px] font-extrabold text-slate-800">Direction Régionale de Niamey</p>
                </div>

                {/* Center: School Emblem */}
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border border-slate-200 bg-slate-50/50 flex items-center justify-center text-[7px] text-blue-900 flex-col">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <span className="text-[7px] font-black text-slate-400 mt-1 uppercase tracking-widest">(ARMOIRIES)</span>
                </div>

                {/* Right: Arabic Header */}
                <div className="text-right space-y-1 text-slate-800">
                  <p className="font-extrabold text-blue-900 text-xs">الجمهورية النيجر</p>
                  <p className="text-[8px] font-bold text-slate-500">وزارة التربية الوطنية</p>
                  <p className="text-[9px] font-extrabold text-slate-800">المديرية الجهوية لنيامي</p>
                </div>
              </div>
            </div>

            {/* 2. TITLE SECTION (Institutional & Decorated) */}
            <div className="text-center my-6 z-10">
              <div className="flex items-center justify-center gap-4">
                <span className="h-[1.5px] w-12 bg-indigo-300 rounded-full" />
                <h2 className="text-2xl font-black uppercase tracking-wider text-blue-900">
                  {activeDoc.label}
                </h2>
                <span className="h-[1.5px] w-12 bg-indigo-300 rounded-full" />
              </div>
              <p className="text-xs font-black text-indigo-500 uppercase mt-1 tracking-widest flex items-center justify-center gap-2.5">
                🌿 {activeDoc.arLabel} 🌿
              </p>
            </div>

            {/* 3. INTRODUCTION TEXT */}
            <div className="text-sm text-slate-700 leading-relaxed font-semibold mb-3 z-10">
              {selectedDoc === "reussite" && (
                <p>
                  Le Directeur de l'Établissement certifie qu'après délibérations des notes scolaires et évaluations annuelles de fin d'année :
                </p>
              )}
              {selectedDoc === "scolarite" && (
                <p>
                  Je soussigné, <span className="font-extrabold text-slate-900">{signatoryName}</span>, agissant en qualité de <span className="font-extrabold text-slate-900">{signatoryRole}</span>, certifie par la présente attestation officielle que l'élève :
                </p>
              )}
              {selectedDoc === "inscription" && (
                <p>
                  Il est officiellement certifié que l'élève désigné(e) ci-dessous est inscrit(e) dans les registres académiques de notre établissement :
                </p>
              )}
              {selectedDoc === "travail" && (
                <p>
                  Je soussigné, <span className="font-extrabold text-slate-900">{signatoryName}</span>, agissant en qualité de <span className="font-extrabold text-slate-900">{signatoryRole}</span>, certifie par la présente attestation officielle que :
                </p>
              )}
            </div>

            {/* 4. BLOC INFORMATIONS ÉLÈVE (Rounded details card) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4 z-10 relative">
              
              {!isStaffDoc ? (
                <>
                  {/* Row 1: Nom */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <User size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">L'ÉLÈVE</span>
                    </div>
                    <span className="font-extrabold text-sm text-slate-900 uppercase">{activeEntity.name}</span>
                  </div>

                  {/* Row 2: ID */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <IdCard size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ID ÉLÈVE</span>
                    </div>
                    <span className="font-mono text-xs text-indigo-600 font-extrabold">{activeEntity.id}</span>
                  </div>

                  {/* Row 3: Classe */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <BookOpen size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">CLASSE</span>
                    </div>
                    <span className="text-slate-950 font-black">{(activeEntity as any).class}</span>
                  </div>

                  {/* Row 4: Moyenne / Secteur */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <BarChart3 size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {selectedDoc === "reussite" ? "MOYENNE GÉNÉRALE" : "SECTEUR"}
                      </span>
                    </div>
                    <span className="text-slate-950 font-black">
                      {selectedDoc === "reussite" ? (activeEntity as any).gpa : (activeEntity as any).sector}
                    </span>
                  </div>

                  {/* Row 5: Resultat (Badge Premium) */}
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Award size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">RÉSULTAT</span>
                    </div>
                    <span className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase",
                      (activeEntity as any).status.includes("AJOURNÉ")
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    )}>
                      {(activeEntity as any).status}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Row 1: Nom Staff */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <User size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">NOM COMPLET</span>
                    </div>
                    <span className="font-extrabold text-sm text-slate-900 uppercase">{activeEntity.name}</span>
                  </div>

                  {/* Row 2: ID Staff */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <IdCard size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">MATRICULE</span>
                    </div>
                    <span className="font-mono text-xs text-indigo-600 font-extrabold">{activeEntity.id}</span>
                  </div>

                  {/* Row 3: Role */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <Building size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">FONCTION</span>
                    </div>
                    <span className="text-slate-950 font-black">{(activeEntity as any).role}</span>
                  </div>

                  {/* Row 4: Service start */}
                  <div className="flex items-center justify-between text-xs font-bold pb-2.5 border-b border-dotted border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Calendar size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ENTRÉE EN SERVICE</span>
                    </div>
                    <span className="text-slate-950 font-black">{(activeEntity as any).serviceStart}</span>
                  </div>

                  {/* Row 5: Status */}
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Award size={15} />
                      </div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">STATUT</span>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                      {(activeEntity as any).status}
                    </span>
                  </div>
                </>
              )}

            </div>

            {/* 5. BOTTOM PARAGRAPH */}
            <div className="text-sm text-slate-700 leading-relaxed font-semibold mt-4 z-10">
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
              {selectedDoc === "travail" && (
                <p>
                  Cette attestation de travail lui est délivrée sur sa demande pour servir et valoir ce que de droit.
                </p>
              )}

              {customComment && (
                <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-bold italic">
                    Note additionnelle : {customComment}
                  </p>
                </div>
              )}
            </div>

            {/* 6. SIGNATURE & SEALS BLOCK (Double seal & realistic signatures) */}
            <div className="pt-6 border-t-[1.5px] border-slate-100 z-10">
              <div className="grid grid-cols-3 items-start text-[11px] font-bold text-slate-700">
                
                {/* Column 1: Sceau Officiel */}
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-blue-900 font-extrabold uppercase tracking-wide">Sceau Officiel</p>
                  {/* Concentric Circle Stamp */}
                  <div className="w-20 h-20 rounded-full border-[3px] border-double border-blue-600 bg-white flex flex-col items-center justify-center text-center p-2 relative shadow-inner select-none">
                    <div className="absolute inset-1 rounded-full border border-blue-400 border-dashed" />
                    <span className="text-[7.5px] font-black text-blue-700 uppercase">EDUT PRO</span>
                    <span className="text-[6px] font-bold text-blue-500">S.A.R.L</span>
                    <span className="text-[5.5px] text-blue-400">★★★★★</span>
                  </div>
                </div>

                {/* Column 2: Online Verification & QR */}
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 text-indigo-500 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="7" />
                      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                    </svg>
                  </div>
                  {/* Simulating a real QR code */}
                  <div className="w-16 h-16 border border-slate-300 p-1 bg-white rounded-lg flex flex-col justify-between">
                    <div className="flex justify-between">
                      <span className="w-3.5 h-3.5 bg-slate-900 rounded" />
                      <span className="w-3.5 h-3.5 bg-slate-900 rounded" />
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="w-3.5 h-3.5 bg-slate-900 rounded" />
                      <span className="w-2.5 h-2.5 bg-slate-900 rounded-[1px]" />
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">VÉRIFICATION EN LIGNE</span>
                </div>
                
                {/* Column 3: Director signature */}
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-slate-400">FAIT LE : {new Date().toLocaleDateString("fr-FR")}</p>
                  <p className="text-[10px] font-black text-blue-900 uppercase leading-tight">{signatoryRole}</p>
                  {/* Handwritten realistic signature vector */}
                  <div className="h-12 w-full flex items-center justify-end pr-2 overflow-hidden relative">
                    <svg width="100" height="40" className="text-blue-600 opacity-85">
                      <path d="M10,20 Q30,5 50,22 T90,15" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M25,25 L75,10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <p className="text-slate-900 font-extrabold text-xs uppercase">{signatoryName}</p>
                </div>

              </div>
            </div>

            {/* 7. DIGNIFIED FOOTER BAR */}
            <div className="absolute bottom-0 left-0 right-0 bg-indigo-600 h-8 flex items-center justify-between px-6 text-[8.5px] font-bold text-white z-20">
              <span>Edut Pro – Centre d'Attestation Scolaire Officiel</span>
              <span className="font-mono uppercase">Réf : DOC-{activeDoc.id.toUpperCase()}-{Date.now().toString().slice(-6)}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
