"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  UserPlus,
  CheckCircle2,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileText,
  School,
  HeartPulse,
  Send,
  Loader2,
} from "lucide-react";
import { submitAdmissionApplicationAction } from "@/domains/admissions/actions/admissions.actions";

export default function PublicAdmissionsApplyPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    applicationNumber: string;
    studentName: string;
    targetClass: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    studentFirstName: "",
    studentLastName: "",
    dateOfBirth: "",
    gender: "M",
    placeOfBirth: "Niamey",
    nationality: "Nigérienne",
    targetClass: "6ème A",
    previousSchool: "",
    previousGradeAvg: "",
    parentName: "",
    parentRelation: "Père",
    parentPhone: "",
    parentWhatsapp: "",
    parentEmail: "",
    parentProfession: "",
    address: "",
    city: "Niamey",
    medicalNotes: "",
    birthCertificateUrl: "",
    photoUrl: "",
    reportCardUrl: "",
  });

  const CLASSES_LIST = [
    "CI", "CP", "CE1", "CE2", "CM1", "CM2",
    "6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B", "3ème A", "3ème B",
    "2nde C", "2nde A", "1ère D", "1ère A", "Terminale D", "Terminale A", "Terminale C"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentFirstName || !formData.studentLastName || !formData.dateOfBirth || !formData.parentPhone) {
      toast.error("Veuillez renseigner toutes les informations obligatoires.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitAdmissionApplicationAction(formData);

      if (res.success) {
        setSubmittedData({
          applicationNumber: res.applicationNumber || "ADM-2026",
          studentName: `${formData.studentLastName.toUpperCase()} ${formData.studentFirstName}`,
          targetClass: formData.targetClass,
        });
        setStep(4);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg">
            <School className="size-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base tracking-tight text-white">Edut Pro • Inscriptions</h2>
            <p className="text-[11px] text-emerald-400 font-semibold">Portail Officiel d'Admission en Ligne</p>
          </div>
        </div>

        <a
          href="/dashboard"
          className="text-xs font-bold text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl border border-slate-800"
        >
          Espace Administration 🔐
        </a>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto w-full my-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        {step < 4 && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className={step >= 1 ? "text-emerald-400" : ""}>1. Élève</span>
              <span className={step >= 2 ? "text-emerald-400" : ""}>2. Parents</span>
              <span className={step >= 3 ? "text-emerald-400" : ""}>3. Scolarité & Documents</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 1: ÉLÈVE */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Identité du Candidat 👤</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Renseignez les données d'état civil de l'enfant.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nom de famille *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: TANDJA"
                  value={formData.studentLastName}
                  onChange={(e) => setFormData({ ...formData, studentLastName: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-semibold text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Prénom(s) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Abdourahamane"
                  value={formData.studentFirstName}
                  onChange={(e) => setFormData({ ...formData, studentFirstName: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-semibold text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Date de naissance *</label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Genre</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-none"
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Lieu de naissance</label>
                <input
                  type="text"
                  value={formData.placeOfBirth}
                  onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white outline-none"
                  placeholder="Niamey, Zinder..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-400 mb-1.5">Classe souhaitée à la rentrée *</label>
              <select
                value={formData.targetClass}
                onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                className="w-full p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-sm font-black text-emerald-300 outline-none"
              >
                {CLASSES_LIST.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  if (!formData.studentFirstName || !formData.studentLastName || !formData.dateOfBirth) {
                    toast.error("Veuillez renseigner le nom, prénom et date de naissance.");
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-2xl text-sm flex items-center gap-2 shadow-lg transition transform active:scale-95"
              >
                Suivant : Coordonnées des Parents <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PARENTS */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Responsable Légal & Contact 👨‍👩‍👧</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Coordonnées pour le suivi et les notifications SMS/WhatsApp.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nom complet du Responsable *</label>
                <input
                  type="text"
                  required
                  placeholder="M. ou Mme ..."
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-semibold text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Lien de parenté</label>
                <select
                  value={formData.parentRelation}
                  onChange={(e) => setFormData({ ...formData, parentRelation: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-bold text-white outline-none"
                >
                  <option value="Père">Père</option>
                  <option value="Mère">Mère</option>
                  <option value="Tuteur">Tuteur / Tutrice</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Téléphone Principal (SMS / Appel) *</label>
                <input
                  type="tel"
                  required
                  placeholder="+227 90 00 00 00"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-semibold text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Numéro WhatsApp (Pour confirmation instantanée)</label>
                <input
                  type="tel"
                  placeholder="+227 90 00 00 00"
                  value={formData.parentWhatsapp}
                  onChange={(e) => setFormData({ ...formData, parentWhatsapp: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-semibold text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Ville & Quartier de résidence</label>
                <input
                  type="text"
                  placeholder="Ex: Niamey, Koubia"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Profession</label>
                <input
                  type="text"
                  placeholder="Ex: Fonctionnaire, Commerçant..."
                  value={formData.parentProfession}
                  onChange={(e) => setFormData({ ...formData, parentProfession: e.target.value })}
                  className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="size-4" /> Retour
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!formData.parentName || !formData.parentPhone) {
                    toast.error("Veuillez renseigner le nom et le téléphone du parent.");
                    return;
                  }
                  setStep(3);
                }}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-2xl text-sm flex items-center gap-2 shadow-lg transition transform active:scale-95"
              >
                Suivant : Parcours & Santé <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SCOLARITÉ & SOUMISSION */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Antécédents & Remarques 🎓</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Dernière étape avant la soumission officielle du dossier.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Établissement scolaire d'origine</label>
              <input
                type="text"
                placeholder="Nom de l'ancienne école ou collège..."
                value={formData.previousSchool}
                onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Moyenne annuelle précédente (/20)</label>
              <input
                type="text"
                placeholder="Ex: 14.50"
                value={formData.previousGradeAvg}
                onChange={(e) => setFormData({ ...formData, previousGradeAvg: e.target.value })}
                className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Allergies, Régime ou Pathologies à signaler</label>
              <textarea
                rows={2}
                placeholder="Ex: Asthme, allergie aux arachides, etc."
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                className="w-full p-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-3">
              <Sparkles className="size-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="font-extrabold text-sm text-emerald-200">Confirmation automatique & Notification</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Dès l'envoi de votre demande, un accusé de réception vous sera adressé par WhatsApp & SMS. Après examen par la commission, vous recevrez le matricule officiel de l'élève.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-3 text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5"
              >
                <ArrowLeft className="size-4" /> Retour
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-2xl text-sm flex items-center gap-2 shadow-xl transition transform active:scale-95"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Déposer la Candidature Officielle ✨
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 4 && submittedData && (
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95 duration-500">
            <div className="size-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500 shadow-2xl">
              <CheckCircle2 className="size-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Demande Enregistrée avec Succès ! 🎉</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Votre dossier d'admission pour <strong className="text-white">{submittedData.studentName}</strong> en classe de <strong className="text-emerald-400">{submittedData.targetClass}</strong> a été transmis à la commission.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700 max-w-md mx-auto space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Numéro de Dossier Officiel</p>
              <p className="text-2xl font-black text-emerald-400 tracking-wider font-mono">
                {submittedData.applicationNumber}
              </p>
              <p className="text-xs text-slate-400">Conservez ce numéro pour le suivi de votre inscription.</p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setStep(1);
                  setSubmittedData(null);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Inscrire un autre enfant
              </button>

              <a
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow"
              >
                Retour à l'accueil
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-600 py-4 border-t border-slate-900">
        © 2026 Edut Pro • Système Intégré de Gestion Scolaire & Universitaire au Niger 🇳🇪
      </div>
    </div>
  );
}
