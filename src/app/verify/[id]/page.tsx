import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  HelpCircle,
  Printer,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  User,
} from "lucide-react";
import {
  DocumentVerificationData,
  verifyOfficialDocument,
} from "@/domains/verification/actions/document-verification.actions";

type VerificationPageProps = {
  params: Promise<{ id: string }>;
};

function getStatusConfig(statut: DocumentVerificationData["statut"]) {
  const config = {
    validé: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      badge: "bg-emerald-600 text-white",
      text: "DOCUMENT AUTHENTIQUE ET VALIDÉ",
      icon: <ShieldCheck className="text-emerald-600 size-16" />,
      watermark: "VALIDÉ",
      watermarkColor: "text-emerald-500/5",
    },
    provisoire: {
      bg: "bg-amber-50 text-amber-800 border-amber-100",
      badge: "bg-amber-500 text-white",
      text: "DOCUMENT PROVISOIRE OU EN ATTENTE DE SYNCHRONISATION",
      icon: <AlertTriangle className="text-amber-500 size-16" />,
      watermark: "PROVISOIRE",
      watermarkColor: "text-amber-500/5",
    },
    annulé: {
      bg: "bg-rose-50 text-rose-700 border-rose-100",
      badge: "bg-rose-600 text-white",
      text: "DOCUMENT ANNULÉ OU NON RECEVABLE",
      icon: <XCircle className="text-rose-600 size-16" />,
      watermark: "ANNULÉ",
      watermarkColor: "text-rose-500/5",
    },
    introuvable: {
      bg: "bg-rose-50 text-rose-700 border-rose-100",
      badge: "bg-rose-600 text-white",
      text: "DOCUMENT NON RÉFÉRENCÉ",
      icon: <ShieldAlert className="text-rose-600 size-16" />,
      watermark: "NON RÉFÉRENCÉ",
      watermarkColor: "text-rose-500/5",
    },
    erreur: {
      bg: "bg-slate-50 text-slate-700 border-slate-200",
      badge: "bg-slate-600 text-white",
      text: "VÉRIFICATION TEMPORAIREMENT INDISPONIBLE",
      icon: <HelpCircle className="text-slate-500 size-16" />,
      watermark: "INDISPONIBLE",
      watermarkColor: "text-slate-400/5",
    },
  };

  return config[statut] || config.introuvable;
}

export default async function DocumentVerificationPage({ params }: VerificationPageProps) {
  const { id } = await params;
  const cleanId = decodeURIComponent(id || "").trim();
  const verifiedDocument = await verifyOfficialDocument(cleanId);
  const docData: DocumentVerificationData = verifiedDocument || {
    documentNumber: cleanId,
    type: "Document officiel",
    recipientName: "Non disponible",
    classOrDetails: "Cette référence n'existe pas dans la base officielle.",
    schoolName: "Base centrale",
    schoolId: "N/A",
    dateGeneration: "Non disponible",
    utilisateur: "Système de vérification",
    statut: "introuvable",
    hash: "Non disponible",
  };

  const currentStatus = getStatusConfig(docData.statut);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 md:p-10 space-y-8 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <span className={`text-[7rem] md:text-[9rem] font-black tracking-widest rotate-[30deg] uppercase ${currentStatus.watermarkColor}`}>
            {currentStatus.watermark}
          </span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-6 gap-4">
            <div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">République du Niger</p>
              <h2 className="text-sm font-black text-slate-900 uppercase">Ministère de l'Éducation Nationale</h2>
              <p className="text-[11px] font-bold text-slate-400">Vérification officielle des documents enregistrés</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="h-3 w-3 rounded-full bg-white border border-slate-200" />
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase text-slate-400 ml-1">MEN-NE</span>
            </div>
          </div>

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

          {docData.statut === "introuvable" && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl p-4 text-xs font-bold leading-relaxed">
              Cette référence ne correspond à aucun document enregistré dans la base centrale. Les documents générés localement ou hors ligne ne sont pas considérés comme officiels tant qu'ils ne sont pas synchronisés.
            </div>
          )}

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type de document</p>
              <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-500" /> {docData.type}
              </p>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Élève / Bénéficiaire</p>
              <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <User size={14} className="text-indigo-500" /> {docData.recipientName}
              </p>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Classe / Détails de la pièce</p>
              <p className="text-xs font-black text-slate-900 mt-1">{docData.classOrDetails}</p>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Établissement d'origine</p>
              <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-500" /> {docData.schoolName} ({docData.schoolId})
              </p>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Généré le</p>
              <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-500" /> {docData.dateGeneration}
              </p>
            </div>

            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Opérateur / Signature</p>
              <p className="text-xs font-black text-slate-900 mt-1">{docData.utilisateur}</p>
            </div>
          </div>

          {docData.amount && (
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Montant enregistré</p>
              <p className="text-sm font-black text-emerald-900 mt-1">{docData.amount}</p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Empreinte numérique de sécurité</p>
            <p className="text-[10px] font-mono font-bold text-slate-600 break-all select-all">{docData.hash}</p>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
            <div className="px-4 h-11 border border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Printer size={14} /> Vérification officielle
            </div>
            <Link
              href="/dashboard"
              className="px-5 h-11 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition flex items-center gap-2"
            >
              Accéder au portail <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
