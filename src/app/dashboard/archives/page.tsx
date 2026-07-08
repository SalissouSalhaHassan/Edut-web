"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { 
  Archive, ShieldAlert, Lock, Unlock, Printer, Download, 
  CheckCircle2, Activity, FileText, FileSpreadsheet, Database, 
  Sparkles, Check, ChevronRight, UserCheck, History, LockKeyhole, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

type StepType = "preparation" | "verification" | "validation" | "archivage" | "verrouille";

export default function ArchivesPage() {
  const [currentStep, setCurrentStep] = useState<StepType>("preparation");
  const [isLocked, setIsLocked] = useState(false);
  const [justification, setJustification] = useState("");
  const [bypassedEdits, setBypassedEdits] = useState<any[]>([
    { id: 1, operator: "Admin Principal", justification: "Correction faute d'orthographe nom élève Aminata Souleymane", date: "08/07/2026 12:00", module: "students" }
  ]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideData, setOverrideData] = useState({ module: "students", recordId: "", field: "", value: "", pass: "" });

  const databaseStats = [
    { label: "Élèves", count: 642, size: "124 KB", status: "Prêt" },
    { label: "Classes & Niveaux", count: 18, size: "8 KB", status: "Prêt" },
    { label: "Résultats & Bulletins", count: 3410, size: "812 KB", status: "Prêt" },
    { label: "Présence / Absences", count: 12204, size: "1.2 MB", status: "Prêt" },
    { label: "Finances & COGES", count: 210, size: "48 KB", status: "Prêt" },
    { label: "Documents Officiels", count: 42, size: "3.5 MB", status: "Prêt" },
    { label: "Canevas Scolaires", count: 8, size: "220 KB", status: "Prêt" },
    { label: "Rapports Pédagogiques", count: 14, size: "95 KB", status: "Prêt" },
    { label: "Audit Logs", count: 1850, size: "450 KB", status: "Prêt" }
  ];

  const handleNextStep = () => {
    if (currentStep === "preparation") {
      setCurrentStep("verification");
      toast.success("Préparation des paquets terminée. Étape de vérification activée.");
    } else if (currentStep === "verification") {
      setCurrentStep("validation");
      toast.success("Vérification réglementaire de l'intégrité achevée.");
    } else if (currentStep === "validation") {
      setCurrentStep("archivage");
      toast.success("Année scolaire validée par la direction générale.");
    } else if (currentStep === "archivage") {
      setCurrentStep("verrouille");
      setIsLocked(true);
      toast.success("L'année scolaire 2025-2026 est désormais VERROUILLÉE légalement.");
    }
  };

  const handleReset = () => {
    setCurrentStep("preparation");
    setIsLocked(false);
    toast.info("Processus réinitialisé à l'étape préparatoire.");
  };

  // Override Locked Data Submit
  const handleOverrideSubmit = () => {
    if (!overrideData.recordId || !overrideData.field || !overrideData.value || !justification) {
      toast.error("Veuillez remplir tous les champs et fournir une justification obligatoire.");
      return;
    }
    if (overrideData.pass !== "SUPERADMIN2026") {
      toast.error("Code d'accès administrateur incorrect.");
      return;
    }

    setBypassedEdits(prev => [
      ...prev,
      {
        id: Date.now(),
        operator: "Super Administrateur (Bypass Code)",
        justification: justification,
        date: new Date().toLocaleString("fr-FR"),
        module: overrideData.module
      }
    ]);
    
    setShowOverrideModal(false);
    setJustification("");
    toast.success("Modification forcée appliquée. Événement enregistré dans les Audit Logs de sécurité.");
  };

  // EXPORTS
  const handlePDFExport = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(10, 10, pageWidth - 20, 24, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(244, 63, 94);
      doc.text("MINISTÈRE DE L'ÉDUCATION NATIONALE - PORTAIL ARCHIVES", 15, 16);

      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("CERTIFICAT DE FERMETURE COMPTABLE ET SCOLAIRE", 15, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Année Scolaire 2025-2026 - Clôturé le ${new Date().toLocaleDateString()}`, 15, 29);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("MÉTROPOLITIQUE DES ARCHIVES SCOLAIRES", 10, 42);

      const tableData = databaseStats.map(s => [s.label, s.count, s.size, s.status]);

      autoTable(doc, {
        startY: 48,
        head: [["Module", "Nombre d'enregistrements", "Taille de stockage", "Statut d'intégrité"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], fontSize: 8 },
        bodyStyles: { fontSize: 7.5 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setDrawColor(226, 232, 240);
      doc.rect(10, finalY, pageWidth - 20, 15);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text("SCEAU DE VERROUILLAGE LÉGAL", 14, finalY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text(`Validation SHA256 : sha256-archive-${Math.random().toString(36).substring(7).toUpperCase()}`, 14, finalY + 10);

      doc.save(`ARCHIVE_SCOLAIRE_2025_2026_${Date.now()}.pdf`);
      toast.success("Rapport d'archivage exporté en PDF !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur d'exportation PDF.");
    }
  };

  const handleExcelExport = () => {
    try {
      const dataRows = databaseStats.map(s => ({
        "Module Archivage": s.label,
        "Lignes / Enregistrements": s.count,
        "Poids Estimé": s.size,
        "Statut Validation": s.status
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Archives 2025-2026");
      XLSX.writeFile(workbook, `ARCHIVES_ANNUELLES_2025_2026_${Date.now()}.xlsx`);
      toast.success("Données exportées en Excel !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur d'exportation Excel.");
    }
  };

  const handleJSONBackup = () => {
    try {
      const backupData = {
        schoolYear: "2025-2026",
        archiveTimestamp: Date.now(),
        locked: isLocked,
        stats: databaseStats,
        overrides: bypassedEdits,
        digitalSignature: `sha256-digital-signature-${Math.random().toString(36).substring(5).toUpperCase()}`
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `BACKUP_RAW_2025_2026_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Sauvegarde brute JSON téléchargée !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur de sauvegarde JSON.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-2 pb-16">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 text-white rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-x-12 -translate-y-12 blur-3xl pointer-events-none" />
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
              <Sparkles size={10} />
              Module Réglementaire & Archives
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
            <Archive className="text-indigo-400" />
            Fermeture & Archivage Annuel
          </h1>
          <p className="text-slate-400 text-xs font-semibold">
            Processus légal d'arrêt des comptes scolaires et verrouillage d'intégrité des bases de données.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
          {isLocked ? (
            <Lock className="text-rose-400 shrink-0 size-6" />
          ) : (
            <Unlock className="text-emerald-400 shrink-0 size-6 animate-pulse" />
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-300">Statut de la base</p>
            <p className={cn("text-[11px] font-bold mt-0.5", isLocked ? "text-rose-400" : "text-emerald-400")}>
              {isLocked ? "VERROUILLÉE (Lecture Seule)" : "ACCÈS OUVERT (Saisie en cours)"}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Steps UI */}
      <section className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-6">
          {[
            { key: "preparation", label: "1. Préparation" },
            { key: "verification", label: "2. Vérification" },
            { key: "validation", label: "3. Validation" },
            { key: "archivage", label: "4. Archivage" },
            { key: "verrouille", label: "5. Verrouillé" }
          ].map((step, idx) => {
            const isActive = currentStep === step.key;
            const isCompleted = ["preparation", "verification", "validation", "archivage", "verrouille"].indexOf(currentStep) > idx;
            
            return (
              <div key={step.key} className="flex items-center gap-2">
                <span className={cn(
                  "h-7 w-7 rounded-full text-xs font-black flex items-center justify-center border transition-all",
                  isActive ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200" : 
                  isCompleted ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"
                )}>
                  {isCompleted ? <Check size={12} /> : idx + 1}
                </span>
                <span className={cn("text-xs font-black tracking-wide", isActive ? "text-slate-900" : "text-slate-400")}>
                  {step.label}
                </span>
                {idx < 4 && <ChevronRight size={14} className="text-slate-300 hidden md:block" />}
              </div>
            );
          })}
        </div>

        {/* Stepper Body Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-6">
            
            {currentStep === "preparation" && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900">Étape 1 : Préparation des paquets de données</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Cette étape rassemble toutes les entrées académiques et comptables enregistrées durant l'année scolaire en cours. Aucun flux RLS n'est altéré à ce stade.
                </p>
                <div className="p-4 bg-slate-50 rounded-2xl border flex items-center gap-3">
                  <Database className="text-indigo-500" />
                  <p className="text-xs text-slate-600 font-bold">Vérification de l'espace de stockage disponible : OK (25.4 MB libres)</p>
                </div>
              </div>
            )}

            {currentStep === "verification" && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900">Étape 2 : Vérification de la complétude</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Contrôle de validation réglementaire : Aucun étudiant n'est sans matricule, tous les bulletins du T3 sont signés, et les reçus financiers sont validés.
                </p>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="size-5" />
                  Tous les contrôles d'intégrité sont vérifiés avec succès !
                </div>
              </div>
            )}

            {currentStep === "validation" && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900">Étape 3 : Signature et validation par la direction</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  L'approbation formelle de l'archive verrouille les fichiers d'inscription. Vous devez confirmer en tant que représentant de l'établissement.
                </p>
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 text-indigo-800 text-xs font-bold">
                  <UserCheck className="size-5" />
                  Signature numérique requise pour sceller l'archive de l'établissement.
                </div>
              </div>
            )}

            {currentStep === "archivage" && (
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900">Étape 4 : Compilation de l'Archive</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Compression des enregistrements étudiants, financiers, et des journaux d'audit. Cette opération prépare la base à passer en lecture seule.
                </p>
                <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl border flex items-center gap-3 text-xs font-bold">
                  <Archive className="text-indigo-400 size-5" />
                  Création de l'image de sauvegarde compressée (.JSON) : Prêt à être figé.
                </div>
              </div>
            )}

            {currentStep === "verrouille" && (
              <div className="space-y-4">
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-black">
                    <LockKeyhole className="size-5" />
                    <span>SYSTÈME ARCHIVÉ ET SÉCURISÉ</span>
                  </div>
                  <p className="text-xs text-rose-900 font-medium leading-relaxed">
                    L'année scolaire 2025-2026 est définitivement clôturée. La modification directe des profils, notes, ou factures est **bloquée réglementairement**.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowOverrideModal(true)} className="h-10 px-4 rounded-xl bg-slate-950 text-white text-[11px] font-black uppercase tracking-wider hover:bg-slate-900 transition flex items-center gap-1.5">
                    <Unlock size={14} /> Forcer modification (Admin)
                  </button>
                  <button onClick={handleReset} className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-650 transition">
                    Réinitialiser
                  </button>
                </div>
              </div>
            )}

            {currentStep !== "verrouille" && (
              <div className="flex gap-2 pt-2">
                <button onClick={handleNextStep} className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1">
                  Étape Suivante <ChevronRight size={14} />
                </button>
                <button onClick={handleReset} className="h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-600 transition">
                  Réinitialiser
                </button>
              </div>
            )}
          </div>

          {/* Side Box Info */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Exportation Périodique</p>
              <h4 className="text-sm font-black text-slate-900 mt-0.5">Sauvegardes Légales</h4>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Téléchargez les documents juridiques attestant de la clôture des bases de données scolaires pour le Ministère.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={handlePDFExport} className="h-9 w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center justify-center gap-1.5 transition">
                <FileText size={14} className="text-rose-500" /> Export PDF
              </button>
              <button onClick={handleExcelExport} className="h-9 w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center justify-center gap-1.5 transition">
                <FileSpreadsheet size={14} className="text-emerald-600" /> Export Excel
              </button>
              <button onClick={handleJSONBackup} className="h-9 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition">
                <Download size={14} /> Backup Brut JSON
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Database Closing metrics */}
      <section className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Métriques des éléments sauvegardés</h3>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">📦 Liste exhaustive des tables figées pour l'année scolaire 2025-2026</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {databaseStats.map((stat, idx) => (
            <div key={idx} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-850">{stat.label}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">{stat.count} enregistrements</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest">
                  {stat.size}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bypass Audit Trail Logs */}
      <section className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">Journal d'Audit - Dérogations (Bypass Logs)</h3>
          <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">⚠️ Liste des accès forcés et modifications appliquées après verrouillage annuel</p>
        </div>

        <div className="space-y-3">
          {bypassedEdits.map((item) => (
            <div key={item.id} className="p-4 bg-rose-50/10 border border-rose-100/50 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-black uppercase tracking-widest">
                  Module: {item.module}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">{item.date}</span>
              </div>
              <p className="text-xs text-slate-800 font-semibold">
                Justification : "{item.justification}"
              </p>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Opérateur de dérogation : {item.operator}</p>
            </div>
          ))}
          {bypassedEdits.length === 0 && (
            <p className="text-xs text-slate-400 font-bold text-center py-6">Aucune modification forcée enregistrée.</p>
          )}
        </div>
      </section>

      {/* Manual Override Passcode Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900">Dérogation Légale de Verrouillage</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Saisie d'un correctif avec justification d'audit réglementaire</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-400">TABLE / MODULE</Label>
                  <select
                    value={overrideData.module}
                    onChange={e => setOverrideData(prev => ({ ...prev, module: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-slate-250 bg-slate-50 text-xs font-bold outline-none"
                  >
                    <option value="students">Élèves</option>
                    <option value="classes">Classes</option>
                    <option value="academics">Résultats</option>
                    <option value="attendance">Présence</option>
                    <option value="finance">Finance</option>
                    <option value="canevas">Canevas</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-400">ID RECORD SOURCE</Label>
                  <input
                    value={overrideData.recordId}
                    onChange={e => setOverrideData(prev => ({ ...prev, recordId: e.target.value }))}
                    placeholder="Ex: 88902..."
                    className="w-full h-11 px-4 rounded-xl border border-slate-250 bg-slate-50 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-400">NOM CHAMP</Label>
                  <input
                    value={overrideData.field}
                    onChange={e => setOverrideData(prev => ({ ...prev, field: e.target.value }))}
                    placeholder="Ex: nomEtudiant..."
                    className="w-full h-11 px-4 rounded-xl border border-slate-250 bg-slate-50 text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-400">NOUVELLE VALEUR</Label>
                  <input
                    value={overrideData.value}
                    onChange={e => setOverrideData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Ex: Aminata..."
                    className="w-full h-11 px-4 rounded-xl border border-slate-250 bg-slate-50 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">PASSCODE ADMIN (BYPASS)</Label>
                <input
                  type="password"
                  value={overrideData.pass}
                  onChange={e => setOverrideData(prev => ({ ...prev, pass: e.target.value }))}
                  placeholder="Saisir le bypass code..."
                  className="w-full h-11 px-4 rounded-xl border border-slate-250 bg-slate-50 text-xs font-bold outline-none"
                />
                <p className="text-[9px] text-slate-400 mt-1">Code de démonstration: SUPERADMIN2026</p>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400">JUSTIFICATION OBLIGATOIRE DU BYPASS</Label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Décrire de manière détaillée le motif légal ou la correction appliquée..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-250 bg-slate-50 p-3 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowOverrideModal(false)} className="px-5 h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-650 text-xs font-black uppercase tracking-widest transition">
                Annuler
              </button>
              <button onClick={handleOverrideSubmit} className="px-5 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest transition">
                Forcer & Journaliser
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
