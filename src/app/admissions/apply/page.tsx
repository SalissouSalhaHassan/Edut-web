"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  CheckCircle2,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  School,
  Send,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
  Building,
  GraduationCap,
  HeartPulse,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  submitAdmissionApplicationAction,
  getPublicSchoolInfoForAdmissionsAction,
} from "@/domains/admissions/actions/admissions.actions";

function ApplyFormContent() {
  const searchParams = useSearchParams();
  const schoolParam = searchParams.get("school") || searchParams.get("schoolId") || "";

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{
    id: number;
    name: string;
    slug?: string;
    logoPath?: string | null;
  }>({ id: 1, name: "Edut Pro", slug: "main" });

  const [classesList, setClassesList] = useState<string[]>([
    "CI", "CP", "CE1", "CE2", "CM1", "CM2",
    "6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B", "3ème A", "3ème B",
    "2nde C", "2nde A", "1ère D", "1ère A", "Terminale D", "Terminale A", "Terminale C"
  ]);

  const [submittedData, setSubmittedData] = useState<{
    applicationNumber: string;
    studentName: string;
    targetClass: string;
    schoolName: string;
    parentPhone: string;
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

  useEffect(() => {
    async function loadSchoolData() {
      try {
        const res = await getPublicSchoolInfoForAdmissionsAction(schoolParam);
        if (res?.school) {
          setSchoolInfo(res.school);
        }
        if (res?.classes && res.classes.length > 0) {
          setClassesList(res.classes);
          setFormData((prev) => ({
            ...prev,
            targetClass: res.classes[0] || prev.targetClass,
          }));
        }
      } catch (err) {
        console.error("Failed to load school admissions metadata:", err);
      }
    }
    loadSchoolData();
  }, [schoolParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.studentFirstName.trim() ||
      !formData.studentLastName.trim() ||
      !formData.dateOfBirth.trim() ||
      !formData.parentName.trim() ||
      !formData.parentPhone.trim()
    ) {
      toast.error("Veuillez renseigner toutes les informations obligatoires (*).");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitAdmissionApplicationAction({
        ...formData,
        schoolId: schoolInfo.id,
      });

      if (res.success && res.applicationNumber) {
        setSubmittedData({
          applicationNumber: res.applicationNumber,
          studentName: `${formData.studentLastName.toUpperCase()} ${formData.studentFirstName}`,
          targetClass: formData.targetClass,
          schoolName: schoolInfo.name,
          parentPhone: formData.parentPhone,
        });
        setStep(4);
        toast.success("Dossier soumis avec succès !");
      } else {
        toast.error(res.error || "Erreur lors de l'enregistrement.");
      }
    } catch (err: any) {
      toast.error("Une erreur serveur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ─── Top Navbar ────────────────────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          {/* School logo or fallback icon */}
          {schoolInfo.logoPath ? (
            <img
              src={schoolInfo.logoPath}
              alt={`Logo ${schoolInfo.name}`}
              className="size-11 rounded-2xl object-contain bg-white/10 p-0.5 shadow-lg shadow-emerald-500/10 border border-white/10"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "flex");
              }}
            />
          ) : null}
          <div
            className="size-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20"
            style={{ display: schoolInfo.logoPath ? "none" : "flex" }}
          >
            <School className="size-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              {schoolInfo.name}
              <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Inscriptions {new Date().getFullYear()}–{new Date().getFullYear() + 1}
              </span>
            </h1>
            <p className="text-xs text-slate-400">Portail Officiel d'Admission & Pré-inscription en Ligne</p>
          </div>
        </div>


        <Link
          href="/admissions/status"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition"
        >
          <QrCode className="size-3.5" />
          Suivre mon Dossier
        </Link>
      </header>

      {/* ─── Main Form Container ───────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto w-full my-8">
        {step < 4 ? (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              {[
                { num: 1, title: "Élève" },
                { num: 2, title: "Parent" },
                { num: 3, title: "Validation" },
              ].map((s) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div
                    className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      step === s.num
                        ? "bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30"
                        : step > s.num
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {step > s.num ? "✓" : s.num}
                  </div>
                  <span
                    className={`text-xs font-bold hidden sm:inline ${
                      step === s.num ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ─── STEP 1: INFORMATIONS DE L'ÉLÈVE ────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="border-b border-slate-800/60 pb-2">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <GraduationCap className="size-5 text-emerald-400" />
                      Informations de l'Élève Candidat
                    </h2>
                    <p className="text-xs text-slate-400">Renseignez l'identité exacte de l'enfant.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Nom de Famille *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: MAHAMADOU"
                        value={formData.studentLastName}
                        onChange={(e) => setFormData({ ...formData, studentLastName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Prénom(s) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ibrahim"
                        value={formData.studentFirstName}
                        onChange={(e) => setFormData({ ...formData, studentFirstName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Date de Naissance *</label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Genre *</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="M">Masculin (Garçon)</option>
                        <option value="F">Féminin (Fille)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Lieu de Naissance</label>
                      <input
                        type="text"
                        placeholder="Ex: Niamey"
                        value={formData.placeOfBirth}
                        onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Classe Demandée *</label>
                      <select
                        value={formData.targetClass}
                        onChange={(e) => setFormData({ ...formData, targetClass: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        {classesList.map((cl, idx) => (
                          <option key={idx} value={cl}>
                            {cl}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Établissement Précédent</label>
                      <input
                        type="text"
                        placeholder="Ex: Complexe Al-Nour"
                        value={formData.previousSchool}
                        onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.studentLastName || !formData.studentFirstName || !formData.dateOfBirth) {
                          toast.error("Veuillez renseigner les champs obligatoires (*)");
                          return;
                        }
                        setStep(2);
                      }}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
                    >
                      Suivant : Responsable légal
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: PARENT / TUTEUR ─────────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="border-b border-slate-800/60 pb-2">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <UserPlus className="size-5 text-emerald-400" />
                      Informations du Parent / Tuteur Légal
                    </h2>
                    <p className="text-xs text-slate-400">Coordonnées pour la réception des notifications et convocations.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Nom & Prénom du Responsable *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Mahamadou Abdoulaye"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Lien de Parenté *</label>
                      <select
                        value={formData.parentRelation}
                        onChange={(e) => setFormData({ ...formData, parentRelation: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="Père">Père</option>
                        <option value="Mère">Mère</option>
                        <option value="Tuteur">Tuteur / Tutrice</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Téléphone Principal (SMS) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: +227 90 00 00 00"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-mono text-emerald-400 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Numéro WhatsApp (Optionnel)</label>
                      <input
                        type="text"
                        placeholder="Ex: +227 90 00 00 00"
                        value={formData.parentWhatsapp}
                        onChange={(e) => setFormData({ ...formData, parentWhatsapp: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Email (Optionnel)</label>
                      <input
                        type="email"
                        placeholder="parent@exemple.com"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Adresse / Quartier</label>
                      <input
                        type="text"
                        placeholder="Ex: Yantala, Niamey"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-1.5"
                    >
                      <ArrowLeft className="size-3.5" />
                      Précédent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.parentName || !formData.parentPhone) {
                          toast.error("Veuillez renseigner le nom et le téléphone du parent (*)");
                          return;
                        }
                        setStep(3);
                      }}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
                    >
                      Suivant : Récapitulatif
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: RÉCAPITULATIF & SOUMISSION ───────────────────────── */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="border-b border-slate-800/60 pb-2">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <ShieldCheck className="size-5 text-emerald-400" />
                      Vérification et Soumission du Dossier
                    </h2>
                    <p className="text-xs text-slate-400">Veuillez vérifier les informations avant d'envoyer votre candidature.</p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500">Candidat :</span>
                        <div className="font-bold text-white text-sm">
                          {formData.studentLastName.toUpperCase()} {formData.studentFirstName}
                        </div>
                        <div className="text-slate-400">Né(e) le {formData.dateOfBirth} ({formData.gender === "M" ? "Garçon" : "Fille"})</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Classe Sollicitée :</span>
                        <div className="font-bold text-emerald-400 text-sm">{formData.targetClass}</div>
                        <div className="text-slate-400">{schoolInfo.name}</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500">Responsable :</span>
                        <div className="font-bold text-white">{formData.parentName} ({formData.parentRelation})</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Contact d'Alerte :</span>
                        <div className="font-mono font-bold text-emerald-400">{formData.parentPhone}</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/60 pt-3">
                      <label className="text-slate-400 block mb-1 font-semibold">
                        Remarques Médicales / Allergies (Facultatif) :
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Asthme léger, port de lunettes..."
                        value={formData.medicalNotes}
                        onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-1.5"
                    >
                      <ArrowLeft className="size-3.5" />
                      Modifier
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition active:scale-[0.99] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="size-4" />
                          Confirmer & Déposer ma Candidature
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* ─── STEP 4: SUCCESS CONFIRMATION & RECEIPT ────────────────────────── */
          submittedData && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-800 pb-6">
                <div className="size-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center font-black">
                  <CheckCircle2 className="size-8" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Candidature Enregistrée avec Succès !
                  </span>
                  <h2 className="text-2xl font-black text-white">{submittedData.studentName}</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Un accusé de réception a été expédié par SMS / WhatsApp au{" "}
                    <span className="font-mono font-bold text-white">{submittedData.parentPhone}</span>.
                  </p>
                </div>
              </div>

              {/* Official Digital Badge / Receipt */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Numéro de Dossier Officiel
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-wider">
                    {submittedData.applicationNumber}
                  </div>
                  <div className="text-xs text-slate-300">
                    Établissement : <span className="font-bold text-white">{submittedData.schoolName}</span> | Classe :{" "}
                    <span className="font-bold text-white">{submittedData.targetClass}</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center">
                  <QRCodeSVG
                    value={`https://edut.pro/admissions/status?app=${submittedData.applicationNumber}&phone=${submittedData.parentPhone}`}
                    size={96}
                    level="H"
                  />
                  <span className="text-[9px] font-mono font-bold text-slate-900 mt-1">SCAN POUR SUIVI</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 print:hidden">
                <Link
                  href={`/admissions/status?app=${submittedData.applicationNumber}&phone=${submittedData.parentPhone}`}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <QrCode className="size-4" />
                  Accéder au Suivi en Direct
                </Link>

                <button
                  onClick={() => window.print()}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
                >
                  <Printer className="size-4" />
                  Imprimer le Récépissé Officiel
                </button>
              </div>

              {/* ─── PRINT ONLY: OFFICIAL SUBMISSION VOUCHER ─── */}
              <div className="hidden print:block text-black bg-white p-6 font-sans space-y-6">
                <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{submittedData.schoolName || schoolInfo.name || "ÉTABLISSEMENT SCOLAIRE"}</h2>
                    <p className="text-xs font-bold text-slate-700 uppercase">Portail Admissions & Inscriptions Officielles</p>
                    <p className="text-[10px] text-slate-500">Année Scolaire {new Date().getFullYear()} - {new Date().getFullYear() + 1}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <QRCodeSVG
                      value={`https://edut.pro/admissions/status?app=${submittedData.applicationNumber}&phone=${submittedData.parentPhone}`}
                      size={64}
                      level="H"
                    />
                    <span className="text-[8px] font-mono font-bold mt-1">SCAN POUR SUIVI</span>
                  </div>
                </div>

                <div className="text-center py-2 bg-slate-100 border border-slate-300 rounded-lg">
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    ACCUSÉ D'ENREGISTREMENT DE CANDIDATURE
                  </h3>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold text-slate-600 w-1/3 bg-slate-50">N° de Dossier Officiel :</td>
                      <td className="p-2.5 font-mono font-black text-emerald-800">{submittedData.applicationNumber}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Élève Candidat :</td>
                      <td className="p-2.5 font-bold uppercase">{formData.studentLastName} {formData.studentFirstName}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Classe sollicitée :</td>
                      <td className="p-2.5 font-bold">{formData.targetClass}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Parent / Tuteur :</td>
                      <td className="p-2.5">{formData.parentName} ({formData.parentPhone})</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-600 bg-slate-50">Date de dépôt :</td>
                      <td className="p-2.5">
                        {new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs font-black">
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Signature du Parent</p>
                    <div className="border-t border-slate-400 pt-1 text-[9px] text-slate-500 font-normal">
                      Mention manuscrite
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="uppercase text-slate-600">Visa de Réception de l'Établissement</p>
                    <div className="border-t border-slate-400 pt-1 text-[9px] text-slate-500 font-normal">
                      Service des admissions
                    </div>
                  </div>
                </div>

                <div className="text-center pt-4 border-t border-slate-200 text-[9px] text-slate-400">
                  Document généré par Edut Pro • Suivi de dossier en direct disponible sur edut.pro/admissions/status
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto w-full text-center py-6 border-t border-slate-800/60 text-xs text-slate-500 print:hidden">
        <p>© {new Date().getFullYear()} {schoolInfo.name} • Propulsé par Edut Pro</p>
      </footer>
    </div>
  );
}

export default function PublicAdmissionsApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Chargement...</div>}>
      <ApplyFormContent />
    </Suspense>
  );
}
