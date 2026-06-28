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
  Calendar,
  Building,
  CheckCircle,
  Clock,
  Stamp,
  Award,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock database for students & staff
const mockStudents = [
  { id: "STD-2026-0091", name: "Ali Moctar", class: "6ème A", dob: "12/04/2012", pob: "Niamey", year: "2025 - 2026", status: "Inscrit", registrationDate: "15/09/2025" },
  { id: "STD-2026-0043", name: "Fati Sani", class: "CM2 B", dob: "05/08/2014", pob: "Maradi", year: "2025 - 2026", status: "Inscrit", registrationDate: "10/09/2025" },
  { id: "STD-2026-0104", name: "Boubacar Issa", class: "3ème M1", dob: "22/11/2010", pob: "Zinder", year: "2025 - 2026", status: "Inscrit", registrationDate: "18/09/2025" },
  { id: "STD-2026-0218", name: "Zeinabou Bako", class: "Terminale D", dob: "30/01/2008", pob: "Tahoua", year: "2025 - 2026", status: "Inscrit", registrationDate: "11/09/2025" },
];

const mockStaff = [
  { id: "STF-2026-012", name: "M. Kazi Kossi", role: "Enseignant Mathématiques", serviceStart: "01/10/2021", status: "Actif", salaryGrade: "A2" },
  { id: "STF-2026-034", name: "Mme Sani Rahila", role: "Enseignante Français", serviceStart: "15/09/2022", status: "Actif", salaryGrade: "A1" },
];

const docTypes = [
  { id: "scolarite", label: "Certificat de Scolarité", arLabel: "شهادة مدرسية", desc: "Attestation officielle prouvant la scolarisation régulière de l'élève.", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
  { id: "inscription", label: "Certificat d'Inscription", arLabel: "شهادة تسجيل", desc: "Prouve l'inscription administrative de l'élève pour l'année scolaire.", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: "reussite", label: "Attestation de Réussite", arLabel: "شهادة نجاح مؤقتة", desc: "Attestation provisoire après délibération de fin d'année.", icon: Award, color: "text-amber-600", bg: "bg-amber-50" },
  { id: "travail", label: "Attestation de Travail", arLabel: "شهادة عمل", desc: "Destinée au personnel enseignant et administratif actif.", icon: Clock, color: "text-rose-600", bg: "bg-rose-50" },
];

export default function AdminDocsPage() {
  const [selectedDoc, setSelectedDoc] = useState("scolarite");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState(mockStudents[0].id);
  const [signatoryRole, setSignatoryRole] = useState("Le Directeur de l'Établissement");
  const [signatoryName, setSignatoryName] = useState("M. Bako Sani");
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
      toast.success("Génération du document officiel...");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Official République Header (FRENCH / ARABIC)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("RÉPUBLIQUE DU NIGER", 20, 15);
      doc.text("الجمهورية النيجر", pageWidth - 45, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Ministère de l'Éducation Nationale", 20, 19);
      doc.text("وزارة التربية الوطنية", pageWidth - 45, 19);
      
      doc.text("Direction Régionale de Niamey", 20, 23);
      doc.text("المكتب الإقليمي للتعليم نيامي", pageWidth - 45, 23);

      // Coat of Arms placeholder (Circle)
      doc.setDrawColor(226, 232, 240);
      doc.circle(pageWidth / 2, 22, 10, "S");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.text("SCEAU", pageWidth / 2 - 4, 21);
      doc.text("OFFICIEL", pageWidth / 2 - 5, 24);

      // Divider line
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.line(20, 36, pageWidth - 20, 36);

      // Title Card
      doc.setFillColor(248, 250, 252);
      doc.rect(20, 42, pageWidth - 40, 20, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(20, 42, pageWidth - 40, 20, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text(activeDoc.label.toUpperCase(), pageWidth / 2 - doc.getTextWidth(activeDoc.label) / 2, 51);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(activeDoc.arLabel, pageWidth / 2 - doc.getTextWidth(activeDoc.arLabel) / 2, 58);

      // Main Text Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);

      let contentY = 78;
      
      if (selectedDoc === "scolarite") {
        const student = activeEntity as any;
        const text = `Je soussigné, ${signatoryName}, agissant en qualité de ${signatoryRole}, certifie par la présente que l'élève :`;
        doc.text(text, 20, contentY);
        
        contentY += 12;
        doc.setFont("helvetica", "bold");
        doc.text(`Nom et Prénom : ${student.name.toUpperCase()}`, 25, contentY);
        doc.text(`Code Matricule : ${student.id}`, 25, contentY + 6);
        doc.text(`Né(e) le : ${student.dob} à ${student.pob}`, 25, contentY + 12);
        doc.text(`Classe active : ${student.class}`, 25, contentY + 18);
        doc.text(`Année Académique : ${student.year}`, 25, contentY + 24);

        doc.setFont("helvetica", "normal");
        contentY += 36;
        const bodyText = `Est régulièrement inscrit(e) dans notre établissement scolaire pour l'année académique susmentionnée et suit assidûment les cours de son niveau d'études.`;
        const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
        doc.text(splitBody, 20, contentY);

      } else if (selectedDoc === "inscription") {
        const student = activeEntity as any;
        const text = `Il est certifié par la présente attestation officielle que l'élève ci-dessous désigné(e) :`;
        doc.text(text, 20, contentY);
        
        contentY += 12;
        doc.setFont("helvetica", "bold");
        doc.text(`Nom de l'élève : ${student.name.toUpperCase()}`, 25, contentY);
        doc.text(`Code Inscription : ${student.id}`, 25, contentY + 6);
        doc.text(`Classe / Niveau : ${student.class}`, 25, contentY + 12);
        doc.text(`Date d'inscription : ${student.registrationDate}`, 25, contentY + 18);

        doc.setFont("helvetica", "normal");
        contentY += 30;
        const bodyText = `Est officiellement inscrit(e) au registre de notre établissement sous la direction du Ministère de l'Éducation Nationale pour l'année scolaire ${student.year}.`;
        const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
        doc.text(splitBody, 20, contentY);

      } else if (selectedDoc === "reussite") {
        const student = activeEntity as any;
        const text = `Après examen des notes et délibération finale du jury, il est certifié que :`;
        doc.text(text, 20, contentY);
        
        contentY += 12;
        doc.setFont("helvetica", "bold");
        doc.text(`L'élève : ${student.name.toUpperCase()}`, 25, contentY);
        doc.text(`Classe : ${student.class}`, 25, contentY + 6);
        doc.text(`Moyenne Générale : 14.50 / 20`, 25, contentY + 12);
        doc.text(`Décision du Jury : ADMIS(E) avec mention Bien`, 25, contentY + 18);

        doc.setFont("helvetica", "normal");
        contentY += 30;
        const bodyText = `A validé l'année académique active et est promu(e) au niveau d'études supérieur pour l'année suivante. En foi de quoi, cette attestation de réussite provisoire lui est délivrée pour servir et valoir ce que de droit.`;
        const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
        doc.text(splitBody, 20, contentY);

      } else { // Attestation de travail
        const staff = activeEntity as any;
        const text = `Je soussigné, ${signatoryName}, certifie par la présente que :`;
        doc.text(text, 20, contentY);
        
        contentY += 12;
        doc.setFont("helvetica", "bold");
        doc.text(`Nom complet : ${staff.name.toUpperCase()}`, 25, contentY);
        doc.text(`Fonction / Rôle : ${staff.role}`, 25, contentY + 6);
        doc.text(`Date d'entrée en service : ${staff.serviceStart}`, 25, contentY + 12);
        doc.text(`Statut Actuel : ${staff.status}`, 25, contentY + 18);

        doc.setFont("helvetica", "normal");
        contentY += 30;
        const bodyText = `Fait partie du personnel actif de notre établissement scolaire et exerce ses fonctions avec professionnalisme et dévouement conformes aux règlements intérieurs.`;
        const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
        doc.text(splitBody, 20, contentY);
      }

      if (customComment) {
        contentY += 18;
        doc.setFont("helvetica", "oblique");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Observation : ${customComment}`, 20, contentY);
      }

      // Legal disclaimer & Date
      contentY += 24;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`Fait à Niamey, le ${new Date().toLocaleDateString("fr-FR")}`, pageWidth - 80, contentY);

      // Signatures
      contentY += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(signatoryRole, pageWidth - 85, contentY);
      doc.setFont("helvetica", "normal");
      doc.text(signatoryName, pageWidth - 75, contentY + 22);

      // Stamp representation
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.circle(50, contentY + 12, 14, "DF");
      doc.setFontSize(5);
      doc.setTextColor(37, 99, 235);
      doc.text("EDUT PRO", 44, contentY + 9);
      doc.text("SCEAU DE L'IEFA", 41, contentY + 13);
      doc.text("★", 49, contentY + 17);

      // Bottom Footer
      doc.setDrawColor(226, 232, 240);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Document officiel généré numériquement via le système Edut Pro.", 20, pageHeight - 15);
      doc.text(`Réf: DOC-${selectedDoc.toUpperCase()}-${Date.now().toString().slice(-6)}`, pageWidth - 60, pageHeight - 15);

      doc.save(`Attestation_${activeDoc.id}_${activeEntity.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Document PDF téléchargé avec succès !");
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
            margin: 15mm !important;
          }
          nav, aside, header, button, .no-print, input, select, textarea, .breadcrumbs {
            display: none !important;
          }
          .print-container {
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
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
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">Administration & Attestations</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">الأوراق الرسمية والشهادات</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">Générez et imprimez des attestations officielles bilingues</p>
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
            <Printer size={15} /> Imprimer Attestation
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

            <div className="max-h-[220px] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
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
                <span className="text-[9px] font-black text-slate-400 uppercase">Observation / Note spécifique (optionnel)</span>
                <textarea
                  placeholder="Ex: Délivré pour constitution de dossier de bourse"
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
          
          <div className="print-container bg-white border border-slate-200 rounded-[32px] shadow-sm max-w-[800px] w-full p-12 md:p-16 aspect-[1/1.414] flex flex-col justify-between text-slate-900">
            
            {/* OFFICIAL DOCUMENT HEADER */}
            <div className="w-full border-b border-indigo-600 pb-5">
              <div className="flex justify-between items-start text-[10px] font-bold text-slate-800">
                <div className="text-center space-y-0.5">
                  <p className="font-black">RÉPUBLIQUE DU NIGER</p>
                  <p className="text-[8px] text-slate-400 uppercase">Ministère de l'Éducation Nationale</p>
                  <p className="text-[8px] text-slate-400">Direction Régionale de Niamey</p>
                </div>
                <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-[7px] font-mono text-slate-400 select-none">
                  [ARMOIRIES]
                </div>
                <div className="text-center space-y-0.5">
                  <p className="font-black">الجمهورية النيجر</p>
                  <p className="text-[8px] text-slate-400">وزارة التربية الوطنية</p>
                  <p className="text-[8px] text-slate-400">المكتب الإقليمي للتعليم نيامي</p>
                </div>
              </div>
            </div>

            {/* DOCUMENT TITLE */}
            <div className="text-center my-8">
              <h2 className="text-2xl font-black uppercase tracking-wide text-indigo-600 underline underline-offset-4 decoration-2">
                {activeDoc.label}
              </h2>
              <p className="text-xs font-black text-slate-400 uppercase mt-1">{activeDoc.arLabel}</p>
            </div>

            {/* DOCUMENT BODY */}
            <div className="flex-1 space-y-6 text-sm text-slate-800 leading-relaxed font-medium">
              
              {selectedDoc === "scolarite" && (
                <>
                  <p>
                    Je soussigné, <span className="font-black text-slate-950">{signatoryName}</span>, agissant en qualité de <span className="font-black text-slate-950">{signatoryRole}</span>, certifie par la présente attestation que l'élève :
                  </p>
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100/80 space-y-2 text-xs font-bold pl-8">
                    <p>Nom et Prénom : <span className="font-black text-slate-950 uppercase">{activeEntity.name}</span></p>
                    <p>Matricule / Identifiant : <span className="font-mono text-indigo-600 font-black">{activeEntity.id}</span></p>
                    <p>Né(e) le : <span className="text-slate-950">{(activeEntity as any).dob}</span> à <span className="text-slate-950">{(activeEntity as any).pob}</span></p>
                    <p>Classe actuelle : <span className="text-slate-950">{(activeEntity as any).class}</span></p>
                    <p>Année Scolaire : <span className="text-slate-950">{(activeEntity as any).year}</span></p>
                  </div>
                  <p>
                    Est inscrit(e) et suit régulièrement les cours dans notre établissement scolaire pour l'année scolaire active.
                  </p>
                </>
              )}

              {selectedDoc === "inscription" && (
                <>
                  <p>
                    Il est officiellement certifié que l'élève désigné(e) ci-dessous est inscrit(e) dans les registres académiques de notre établissement scolaire :
                  </p>
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100/80 space-y-2 text-xs font-bold pl-8">
                    <p>Nom de l'élève : <span className="font-black text-slate-950 uppercase">{activeEntity.name}</span></p>
                    <p>ID Inscription : <span className="font-mono text-indigo-600 font-black">{activeEntity.id}</span></p>
                    <p>Classe / Section : <span className="text-slate-950">{(activeEntity as any).class}</span></p>
                    <p>Date d'inscription : <span className="text-slate-950">{(activeEntity as any).registrationDate}</span></p>
                    <p>Année Académique : <span className="text-slate-950">{(activeEntity as any).year}</span></p>
                  </div>
                  <p>
                    Cette inscription est validée sous le contrôle direct du Ministère de l'Éducation Nationale pour la période active.
                  </p>
                </>
              )}

              {selectedDoc === "reussite" && (
                <>
                  <p>
                    Le Directeur de l'Établissement certifie qu'après délibérations des notes scolaires et évaluations annuelles de fin d'année :
                  </p>
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100/80 space-y-2 text-xs font-bold pl-8">
                    <p>L'élève : <span className="font-black text-slate-950 uppercase">{activeEntity.name}</span></p>
                    <p>ID Élève : <span className="font-mono text-indigo-600 font-black">{activeEntity.id}</span></p>
                    <p>Classe : <span className="text-slate-950">{(activeEntity as any).class}</span></p>
                    <p>Moyenne Générale : <span className="text-slate-950">14.50 / 20</span></p>
                    <p>Résultat : <span className="text-emerald-700 font-black">PROMU(E) - ADMIS(E) AVEC MENTION BIEN</span></p>
                  </div>
                  <p>
                    Cette attestation provisoire de réussite lui est accordée pour faire valoir ses droits académiques d'accès au niveau supérieur.
                  </p>
                </>
              )}

              {selectedDoc === "travail" && (
                <>
                  <p>
                    Je soussigné, <span className="font-black text-slate-950">{signatoryName}</span>, certifie par la présente que :
                  </p>
                  <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-100/80 space-y-2 text-xs font-bold pl-8">
                    <p>Nom complet : <span className="font-black text-slate-950 uppercase">{activeEntity.name}</span></p>
                    <p>Matricule Employé : <span className="font-mono text-indigo-600 font-black">{activeEntity.id}</span></p>
                    <p>Rôle / Fonction : <span className="text-slate-950">{(activeEntity as any).role}</span></p>
                    <p>Date de début : <span className="text-slate-950">{(activeEntity as any).serviceStart}</span></p>
                    <p>Statut Actuel : <span className="text-slate-950">{(activeEntity as any).status}</span></p>
                  </div>
                  <p>
                    Est employé(e) actif(ve) au sein de notre personnel et s'acquitte de ses obligations professionnelles avec assiduité et efficacité.
                  </p>
                </>
              )}

              {customComment && (
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-bold italic">
                    Note additionnelle : {customComment}
                  </p>
                </div>
              )}

            </div>

            {/* DATE & SIGNATURES BLOCK */}
            <div className="pt-10 border-t border-slate-100">
              <div className="flex justify-between items-start text-xs font-bold text-slate-600">
                <div className="space-y-4">
                  <p className="underline">Sceau Officiel</p>
                  <div className="w-20 h-20 rounded-full border-4 border-double border-indigo-200 bg-indigo-50/20 flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[7px] font-black text-indigo-600">EDUT PRO</span>
                    <span className="text-[6px] text-slate-500">IEFA SEAL</span>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <p>Fait le : {new Date().toLocaleDateString("fr-FR")}</p>
                  <p className="underline font-black text-slate-800">{signatoryRole}</p>
                  <p className="pt-12 text-slate-900 font-black">{signatoryName}</p>
                </div>
              </div>
            </div>

            {/* DOCUMENT FOOTER */}
            <div className="border-t border-slate-200 pt-4 mt-8 flex justify-between items-center text-[8px] font-bold text-slate-400">
              <span>Edut Pro - Centre d'Attestations Scolaires Officiel</span>
              <span className="font-mono">Réf: DOC-{selectedDoc.toUpperCase()}-{Date.now().toString().slice(-6)}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
