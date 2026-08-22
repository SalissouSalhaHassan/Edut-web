"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  School,
  FileText,
  Phone,
  Calendar,
  Printer,
  QrCode,
  ArrowRight,
  ShieldCheck,
  User,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicApplicationStatusAction } from "@/domains/admissions/actions/admissions.actions";
import { QRCodeSVG } from "qrcode.react";

function StatusTrackingContent() {
  const searchParams = useSearchParams();
  const initialAppNumber = searchParams.get("app") || searchParams.get("num") || "";
  const initialPhone = searchParams.get("phone") || "";

  const [applicationNumber, setApplicationNumber] = useState(initialAppNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!applicationNumber.trim() || !phone.trim()) {
      toast.error("Veuillez renseigner le numéro de dossier et votre numéro de téléphone.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await getPublicApplicationStatusAction({
        applicationNumber,
        phone,
      });

      if (res.success && res.application) {
        setResult(res.application);
      } else {
        setResult(null);
        toast.error(res.error || "Dossier introuvable.");
      }
    } catch (err) {
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialAppNumber && initialPhone) {
      handleSearch();
    }
  }, [initialAppNumber, initialPhone]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="size-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <School className="size-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              Edut Pro • Admissions
              <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Suivi en direct
              </span>
            </h1>
            <p className="text-xs text-slate-400">Portail de consultation et suivi de candidature</p>
          </div>
        </div>

        <Link
          href="/admissions/apply"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition"
        >
          Nouvelle Inscription
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto w-full my-8 space-y-8">
        {/* Search Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-black text-white tracking-tight">Suivre l'état de votre dossier</h2>
            <p className="text-sm text-slate-400">
              Saisissez le numéro de dossier reçu lors du dépôt et le numéro de téléphone du responsable.
            </p>
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Numéro de Candidature *</label>
              <input
                type="text"
                required
                placeholder="Ex: ADM-2026-001-4921"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-mono text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Téléphone du Parent *</label>
              <input
                type="text"
                required
                placeholder="Ex: +227 90 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Vérification en cours...
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    Consulter l'état de la candidature
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ─── Result Section ──────────────────────────────────────────────── */}
        {result && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                {result.photoUrl ? (
                  <img
                    src={result.photoUrl}
                    alt="Photo Candidat"
                    className="size-16 rounded-2xl object-cover border-2 border-emerald-500/30 shadow-md shadow-emerald-500/10 shrink-0"
                  />
                ) : (
                  <div className="size-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                    Photo
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Établissement : {result.schoolName}
                  </span>
                  <h3 className="text-xl font-black text-white">{result.studentName}</h3>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                    Classe sollicitée : <span className="font-bold text-white">{result.targetClass}</span>
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Statut Actuel</span>
                {result.status === "Admis / Accepté" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
                    <CheckCircle2 className="size-4" />
                    Candidature Acceptée
                  </span>
                )}
                {result.status === "En attente" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Clock className="size-4" />
                    Dossier en attente d'examen
                  </span>
                )}
                {result.status === "En examen" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    <Clock className="size-4" />
                    Examen & Entretien en cours
                  </span>
                )}
                {result.status === "Liste d'attente" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    <AlertCircle className="size-4" />
                    Sur Liste d'Attente
                  </span>
                )}
                {result.status === "Refusé" && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <XCircle className="size-4" />
                    Candidature Non Retenue
                  </span>
                )}
              </div>
            </div>

            {/* If Admitted: Congratulatory Box + Matricule */}
            {result.status === "Admis / Accepté" && (
              <div className="bg-gradient-to-br from-emerald-950/80 to-teal-950/60 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-300">Félicitations ! L'élève est admis.</h4>
                    <p className="text-xs text-slate-300">
                      Le dossier a été officiellement validé par la direction de l'établissement.
                    </p>
                  </div>
                </div>

                {result.generatedMatricule && (
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Matricule Scolaire Attribué
                      </span>
                      <div className="text-lg font-mono font-black text-emerald-400">{result.generatedMatricule}</div>
                    </div>
                    <span className="text-xs text-slate-400">
                      Conservez ce numéro pour le paiement des droits d'inscription.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Review Notes from School */}
            {result.reviewNotes && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Remarques de la Commission :
                </span>
                <p className="text-slate-200 font-medium italic">"{result.reviewNotes}"</p>
              </div>
            )}

            {/* Candidate Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500">Numéro de dossier :</span>
                <div className="font-mono font-bold text-slate-200">{result.applicationNumber}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Date de soumission :</span>
                <div className="font-medium text-slate-200">
                  {result.createdAt ? new Date(result.createdAt).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "N/A"}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Responsable / Tuteur :</span>
                <div className="font-medium text-slate-200">{result.parentName}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500">Contact enregistré :</span>
                <div className="font-mono text-slate-200">{result.parentPhone}</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-md shadow-emerald-600/20"
              >
                <Printer className="size-4" />
                Imprimer le Récépissé Officiel
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Suivi d'inscription Edut Pro : Dossier ${result.applicationNumber} pour ${result.studentName} (${result.status}).`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs flex items-center gap-2 border border-emerald-500/30 transition"
              >
                <MessageCircle className="size-4" />
                Partager sur WhatsApp
              </a>
            </div>

            {/* ─── PRINT ONLY: OFFICIAL RECEIPT VOUCHER ─── */}
            <div className="hidden print:block text-black bg-white p-6 font-sans space-y-6">
              <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">{result.schoolName || "ÉTABLISSEMENT SCOLAIRE"}</h2>
                  <p className="text-xs font-bold text-slate-700 uppercase">Portail Admissions & Inscriptions Officielles</p>
                  <p className="text-[10px] text-slate-500">Année Scolaire {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <QRCodeSVG
                    value={`https://edut.pro/admissions/status?app=${result.applicationNumber}&phone=${result.parentPhone}`}
                    size={64}
                    level="H"
                  />
                  <span className="text-[8px] font-mono font-bold mt-1">AUTHENTICITÉ VÉRIFIÉE</span>
                </div>
              </div>

              <div className="text-center py-2 bg-slate-100 border border-slate-300 rounded-lg">
                <h3 className="text-sm font-black uppercase tracking-wider">
                  RÉCÉPISSÉ OFFICIEL DE {result.status === "Admis / Accepté" ? "DÉCISION D'ADMISSION" : "DÉPÔT DE CANDIDATURE"}
                </h3>
              </div>

              <table className="w-full text-xs border-collapse border border-slate-300">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-600 w-1/3 bg-slate-50">N° de Dossier :</td>
                    <td className="p-2.5 font-mono font-black">{result.applicationNumber}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Candidat :</td>
                    <td className="p-2.5 font-bold uppercase">{result.studentName}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Classe sollicitée :</td>
                    <td className="p-2.5 font-bold">{result.targetClass}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Statut de la Candidature :</td>
                    <td className="p-2.5 font-black text-emerald-700">{result.status}</td>
                  </tr>
                  {result.generatedMatricule && (
                    <tr className="border-b border-slate-200 bg-emerald-50">
                      <td className="p-2.5 font-bold text-emerald-800">Matricule Attribué :</td>
                      <td className="p-2.5 font-mono font-black text-emerald-900">{result.generatedMatricule}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-200">
                    <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Parent / Tuteur :</td>
                    <td className="p-2.5">{result.parentName} ({result.parentPhone})</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Date d'enregistrement :</td>
                    <td className="p-2.5">
                      {result.createdAt ? new Date(result.createdAt).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {result.reviewNotes && (
                <div className="p-2.5 rounded border border-slate-300 bg-slate-50 text-[11px] italic">
                  <strong>Note de la commission :</strong> {result.reviewNotes}
                </div>
              )}

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-black">
                <div className="space-y-12">
                  <p className="uppercase text-slate-600">Signature du Parent</p>
                  <div className="border-t border-slate-400 pt-1 text-[9px] text-slate-500 font-normal">
                    Mention manuscrite
                  </div>
                </div>
                <div className="space-y-12">
                  <p className="uppercase text-slate-600">Cachet & Visa Établissement</p>
                  <div className="border-t border-slate-400 pt-1 text-[9px] text-slate-500 font-normal">
                    Pour la direction des admissions
                  </div>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-slate-200 text-[9px] text-slate-400">
                Ce document officiel fait foi de preuve d'enregistrement auprès du service des admissions.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto w-full text-center py-6 border-t border-slate-800/60 text-xs text-slate-500 print:hidden">
        <p>© {new Date().getFullYear()} Edut Pro • Système Intégré de Gestion Scolaire & Admissions</p>
      </footer>
    </div>
  );
}

export default function AdmissionsStatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Chargement...</div>}>
      <StatusTrackingContent />
    </Suspense>
  );
}
