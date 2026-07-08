"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ShieldCheck, ShieldAlert, FileText, Calendar, 
  User, Building2, Search, AlertTriangle, 
  XCircle, HelpCircle, Printer, ExternalLink
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface DocumentVerificationData {
  documentNumber: string;
  type: string;
  recipientName: string;
  classOrDetails: string;
  schoolName: string;
  schoolId: string;
  dateGeneration: string;
  utilisateur: string;
  statut: "provisoire" | "validé" | "annulé" | "hors ligne";
  hash: string;
  amount?: string;
}

const mockDatabase: Record<string, DocumentVerificationData> = {
  "DOC-BUL-2026-9901": {
    documentNumber: "DOC-BUL-2026-9901",
    type: "Bulletin Trimestriel de Notes (Trimestre 3)",
    recipientName: "Aminata Souleymane",
    classOrDetails: "CM2 - Moyenne: 16.45 / 20",
    schoolName: "Ecole Excellence",
    schoolId: "SCH-2026-001",
    dateGeneration: "28/06/2026 14:02",
    utilisateur: "Salissou Salha Hassan (Directeur)",
    statut: "validé",
    hash: "sha256-8a9d18fa4e28cd1f8a9d18fa4e28cd1f8a9d18fa4e28cd1f8a9d18fa4e28cd1f",
  },
  "DOC-REV-2026-4401": {
    documentNumber: "DOC-REV-2026-4401",
    type: "Relevé Provisoire de Notes d'Examen",
    recipientName: "Ibrahim Moussa",
    classOrDetails: "Terminale D - Bac Blanc",
    schoolName: "Complexe Scolaire Sahel",
    schoolId: "SCH-2026-002",
    dateGeneration: "27/06/2026 11:30",
    utilisateur: "M. Kallo (Prof Principal)",
    statut: "provisoire",
    hash: "sha256-4c281df2ea081b294c281df2ea081b294c281df2ea081b294c281df2ea081b29",
  },
  "DOC-REC-2026-0812": {
    documentNumber: "DOC-REC-2026-0812",
    type: "Reçu de Paiement de Scolarité",
    recipientName: "Mamane Sani",
    classOrDetails: "Frais Scolarité - Trimestre 1",
    schoolName: "Ecole Excellence",
    schoolId: "SCH-2026-001",
    dateGeneration: "24/06/2026 09:45",
    utilisateur: "Mme. Diallo (Caissière)",
    statut: "validé",
    hash: "sha256-a0b2d8f9ea081b29a0b2d8f9ea081b29a0b2d8f9ea081b29a0b2d8f9ea081b29",
    amount: "150 000 CFA"
  },
  "DOC-ATT-2026-7703": {
    documentNumber: "DOC-ATT-2026-7703",
    type: "Attestation Officielle de Scolarité",
    recipientName: "Ousmane Ali",
    classOrDetails: "CI - Élève inscrit à temps plein",
    schoolName: "Ecole Publique Lazaret",
    schoolId: "SCH-2026-003",
    dateGeneration: "12/06/2026 08:00",
    utilisateur: "M. Harouna (Secrétariat)",
    statut: "validé",
    hash: "sha256-f001e92dea081b29f001e92dea081b29f001e92dea081b29f001e92dea081b29",
  },
  "DOC-ADM-2026-5509": {
    documentNumber: "DOC-ADM-2026-5509",
    type: "Carte d'Admission aux Examens Nationaux",
    recipientName: "Fati Harouna",
    classOrDetails: "Session Normale 2026 - Numéro Place: 889201",
    schoolName: "Ecole Excellence",
    schoolId: "SCH-2026-001",
    dateGeneration: "18/06/2026 10:15",
    utilisateur: "Direction des Examens (Ministère)",
    statut: "validé",
    hash: "sha256-c301e892ea081b29c301e892ea081b29c301e892ea081b29c301e892ea081b29",
  },
  "DOC-PED-2026-1188": {
    documentNumber: "DOC-PED-2026-1188",
    type: "Rapport Pédagogique d'Inspection de Zone",
    recipientName: "Etablissement Ecole Excellence",
    classOrDetails: "Cycle Primaire - Audit trimestriel",
    schoolName: "Ecole Excellence",
    schoolId: "SCH-2026-001",
    dateGeneration: "27/06/2026 11:30",
    utilisateur: "Inspecteur Niamey IV",
    statut: "validé",
    hash: "sha256-9a28cd1fea081b299a28cd1fea081b299a28cd1fea081b299a28cd1fea081b29",
  },
  "DOC-FIN-2026-3021": {
    documentNumber: "DOC-FIN-2026-3021",
    type: "Rapport Financier Annuel Consolidé",
    recipientName: "Conseil d'Administration",
    classOrDetails: "Exercice Budgétaire 2025-2026",
    schoolName: "Ecole Excellence",
    schoolId: "SCH-2026-001",
    dateGeneration: "29/06/2026 08:30",
    utilisateur: "M. Sani (Comptable Principal)",
    statut: "annulé",
    hash: "sha256-b184ef93ea081b29b184ef93ea081b29b184ef93ea081b29b184ef93ea081b29",
  },
  "DOC-CAN-2026-0044": {
    documentNumber: "DOC-CAN-2026-0044",
    type: "Canevas Statistique Annuel d'Établissement",
    recipientName: "Ministère de l'Éducation Nationale",
    classOrDetails: "Dossier d'homologation 2025-2026",
    schoolName: "CES Kollo",
    schoolId: "SCH-2026-004",
    dateGeneration: "25/06/2026 10:14",
    utilisateur: "Directeur CES Kollo",
    statut: "validé",
    hash: "sha256-ea081b29ea081b29ea081b29ea081b29ea081b29ea081b29ea081b29ea081b29",
  }
};

export default function DocumentVerificationPage() {
  const params = useParams();
  const rawId = params?.id as string;
  const [docId, setDocId] = useState(rawId || "");
  const [docData, setDocData] = useState<DocumentVerificationData | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (rawId) {
      handleSearch(rawId);
    }
  }, [rawId]);

  const handleSearch = (idToSearch: string) => {
    const cleanId = idToSearch.trim();
    if (!cleanId) return;

    setSearched(true);
    const match = mockDatabase[cleanId];
    if (match) {
      setDocData(match);
    } else {
      // Fallback
      if (cleanId.startsWith("DOC-")) {
        const parts = cleanId.split("-");
        const docType = parts[1] || "DOC";
        
        let label = "Document Officiel";
        if (docType === "BUL") label = "Bulletin Trimestriel";
        if (docType === "REV") label = "Relevé de notes";
        if (docType === "REC") label = "Reçu Financier";
        if (docType === "ATT") label = "Attestation d'inscription";
        if (docType === "ADM") label = "Carte d'admission";
        if (docType === "PED") label = "Rapport pédagogique";
        if (docType === "FIN") label = "Rapport financier";
        if (docType === "CAN") label = "Rapport Canevas";

        setDocData({
          documentNumber: cleanId,
          type: label,
          recipientName: "Élève / Bénéficiaire Non Synchronisé",
          classOrDetails: `Vérification automatique (Génération hors-ligne)`,
          schoolName: "Établissement Autorisée",
          schoolId: "SCH-OFFLINE-000",
          dateGeneration: new Date().toLocaleString("fr-FR"),
          utilisateur: "Utilisateur Local",
          statut: "hors ligne",
          hash: `sha256-offline-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`
        });
      } else {
        setDocData(null);
      }
    }
  };

  const getStatusConfig = (statut: DocumentVerificationData["statut"]) => {
    const config = {
      validé: {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
        badge: "bg-emerald-600 text-white",
        text: "DOCUMENT AUTHENTIQUE ET VALIDÉ",
        icon: <ShieldCheck className="text-emerald-600 size-16" />,
        watermark: "VALIDÉ",
        watermarkColor: "text-emerald-500/5"
      },
      provisoire: {
        bg: "bg-amber-50 text-amber-800 border-amber-100",
        badge: "bg-amber-500 text-white",
        text: "DOCUMENT PROVISOIRE / EN COURS",
        icon: <AlertTriangle className="text-amber-500 size-16" />,
        watermark: "PROVISOIRE",
        watermarkColor: "text-amber-500/5"
      },
      annulé: {
        bg: "bg-rose-50 text-rose-700 border-rose-100",
        badge: "bg-rose-600 text-white",
        text: "DOCUMENT ANNULÉ / NON RECEVABLE",
        icon: <XCircle className="text-rose-600 size-16" />,
        watermark: "ANNULÉ",
        watermarkColor: "text-rose-500/5"
      },
      "hors ligne": {
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        badge: "bg-slate-500 text-white",
        text: "DOCUMENT GÉNÉRÉ HORS LIGNE",
        icon: <HelpCircle className="text-slate-500 size-16" />,
        watermark: "HORS LIGNE",
        watermarkColor: "text-slate-400/5"
      }
    };
    return config[statut] || config["hors ligne"];
  };

  const currentStatus = docData ? getStatusConfig(docData.statut) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Container card */}
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 md:p-10 space-y-8 relative overflow-hidden">
        
        {/* Background Watermark */}
        {docData && currentStatus && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
            <span className={`text-[9rem] font-black tracking-widest rotate-[30deg] uppercase ${currentStatus.watermarkColor}`}>
              {currentStatus.watermark}
            </span>
          </div>
        )}

        {/* Content Box */}
        <div className="relative z-10 space-y-8">

          {/* Niger Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 gap-4">
            <div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">République du Niger</p>
              <h2 className="text-sm font-black text-slate-900 uppercase">Ministère de l'Éducation Nationale</h2>
              <p className="text-[11px] font-bold text-slate-400">Système National d'Homologation des Diplômes et Documents</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="h-3 w-3 rounded-full bg-white border border-slate-200" />
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase text-slate-400 ml-1">MEN-NE</span>
            </div>
          </div>

          {/* Search box if navigated directly */}
          {!rawId && (
            <div className="space-y-3 bg-slate-50 border border-slate-100 p-5 rounded-3xl">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Entrez la référence de la pièce</Label>
              <div className="flex gap-2">
                <input
                  value={docId}
                  onChange={e => setDocId(e.target.value)}
                  placeholder="Ex: DOC-BUL-2026-9901..."
                  className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none placeholder:text-slate-350"
                />
                <button
                  onClick={() => handleSearch(docId)}
                  className="px-5 h-11 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition flex items-center gap-2"
                >
                  <Search size={14} /> Vérifier
                </button>
              </div>
            </div>
          )}

          {searched && !docData && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Document non référencé</h3>
                <p className="text-xs text-slate-500 font-bold max-w-md mx-auto leading-relaxed">
                  Cette référence ne correspond à aucun document authentifié ou enregistré dans la base centrale. Veuillez vérifier l'exactitude du code saisi.
                </p>
              </div>
              <button
                onClick={() => { setSearched(false); setDocId(""); }}
                className="px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest text-slate-600"
              >
                Rechercher à nouveau
              </button>
            </div>
          )}

          {/* Document verification details */}
          {docData && currentStatus && (
            <div className="space-y-6">
              
              {/* Main Badge Result */}
              <div className={`p-6 rounded-3xl border flex items-center gap-4 ${currentStatus.bg}`}>
                {currentStatus.icon}
                <div>
                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${currentStatus.badge}`}>
                    {docData.statut}
                  </span>
                  <h3 className="text-base font-black mt-2 leading-tight">{currentStatus.text}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Réf : {docData.documentNumber}</p>
                </div>
              </div>

              {/* Data list details */}
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                
                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type de document</p>
                  <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5"><FileText size={14} className="text-indigo-500" /> {docData.type}</p>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Élève / Bénéficiaire</p>
                  <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5"><User size={14} className="text-indigo-500" /> {docData.recipientName}</p>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Classe / Détails de la pièce</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{docData.classOrDetails}</p>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Établissement d'origine</p>
                  <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5"><Building2 size={14} className="text-indigo-500" /> {docData.schoolName} ({docData.schoolId})</p>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Généré le</p>
                  <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5"><Calendar size={14} className="text-indigo-500" /> {docData.dateGeneration}</p>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Opérateur / Signature</p>
                  <p className="text-xs font-black text-slate-900 mt-1">{docData.utilisateur}</p>
                </div>
              </div>

              {/* Cryptographic hash */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Empreinte numérique de sécurité (Hash SHA-256)</p>
                <p className="text-[10px] font-mono font-bold text-slate-600 break-all select-all">{docData.hash}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={() => window.print()}
                  className="px-4 h-11 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2"
                >
                  <Printer size={14} /> Imprimer reçu
                </button>
                <Link
                  href="/dashboard"
                  className="px-5 h-11 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  Accéder au Portail <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
