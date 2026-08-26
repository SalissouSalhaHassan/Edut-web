import { Metadata } from "next";
import { getAcademicVerificationData } from "@/domains/academics/actions/verification.actions";
import { CheckCircle2, ShieldCheck, Award, GraduationCap, Building2, Calendar, FileText, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface VerifyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Vérification d'authenticité - ${id} | EDUT Academic Portal`,
    description: "Portail officiel de vérification d'authenticité des diplômes et attestations LMD",
  };
}

export default async function VerifyPage({ params }: VerifyPageProps) {
  const { id } = await params;
  const data = await getAcademicVerificationData(id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Top Brand / Back link */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
          <GraduationCap className="h-5 w-5" />
          <span>EDUT UNIVERSITÉ • PORTAIL PUBLIC DE VÉRIFICATION</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Accueil</span>
        </Link>
      </div>

      {/* Main Verification Card */}
      <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full blur-xs" />

        {data && data.isValid ? (
          <>
            {/* Status Header Badge */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3.5 shadow-lg shadow-emerald-500/10">
                <ShieldCheck className="h-9 w-9" />
              </div>
              <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-2">
                Document Authentique & Officiel
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Authenticité Académique Certifiée
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
                Les données ci-dessous correspondent fidèlement aux registres officiels de délibération de l'établissement.
              </p>
            </div>

            {/* Verification Content Grid */}
            <div className="space-y-6">
              {/* 1. Student Identity Section */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>Informations sur le Titulaire</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Nom & Prénoms</div>
                    <div className="font-bold text-white text-base mt-0.5">{data.student.nom}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Numéro Matricule / INE</div>
                    <div className="font-mono font-bold text-indigo-300 text-base mt-0.5">{data.student.matricule}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Date & Lieu de naissance</div>
                    <div className="font-medium text-slate-200 mt-0.5">{data.student.dateNaissance} à {data.student.lieuNaissance}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Nationalité</div>
                    <div className="font-medium text-slate-200 mt-0.5">{data.student.nationalite || "Nigérienne"}</div>
                  </div>
                </div>
              </div>

              {/* 2. Conferred Degree Section */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-2">
                  <Award className="h-4 w-4" />
                  <span>Titre & Qualification Délivrés</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Intitulé du Diplôme</div>
                    <div className="font-bold text-white text-base mt-0.5">{data.degree.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Domaine & Mention</div>
                    <div className="font-medium text-slate-200 mt-0.5">{data.degree.field} — {data.degree.mention}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Décision & Mention du Jury</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{data.degree.status}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Crédits ECTS Capitalisés</div>
                    <div className="font-bold text-indigo-300 mt-0.5">{data.degree.ectsCredits} ECTS (100% Validé)</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Année Académique de Promotion</div>
                    <div className="font-medium text-slate-200 mt-0.5">{data.degree.graduationYear}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Date de Délibération</div>
                    <div className="font-medium text-slate-200 mt-0.5">{data.degree.deliberationDate}</div>
                  </div>
                </div>
              </div>

              {/* 3. Institution & Legal Authority */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-2">
                  <Building2 className="h-4 w-4" />
                  <span>Établissement & Autorité de Tutelle</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="font-bold text-white">{data.institution.name}</div>
                  <div className="text-xs text-slate-300">{data.institution.ministry} • {data.institution.country}</div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold mt-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{data.institution.accreditation}</span>
                  </div>
                </div>
              </div>

              {/* 4. Digital Fingerprint / Hash */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 break-all">
                <span className="text-slate-500 font-bold block mb-1">EMPREINTE NUMÉRIQUE SHA-256 :</span>
                {data.degree.verificationHash}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Identifiant Non Trouvé</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">
              Aucun document officiel ne correspond à la référence <span className="text-white font-mono">{id}</span>. Veuillez vérifier l'exactitude du QR Code ou contacter l'administration universitaire.
            </p>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              Retour à l'accueil
            </Link>
          </div>
        )}
      </div>

      {/* Footer Security Notice */}
      <div className="mt-8 text-center text-xs text-slate-500 max-w-md">
        Portail de Certification & d'Intégrité Académique conforme aux normes CAMES & REESAO. Système Sécurisé EDUT.
      </div>
    </div>
  );
}
