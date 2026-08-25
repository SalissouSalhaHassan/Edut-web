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
  Camera,
  Upload,
  BookOpen,
  Award,
  Globe,
  Check,
  Info,
  Clock,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  submitAdmissionApplicationAction,
  getPublicSchoolInfoForAdmissionsAction,
} from "@/domains/admissions/actions/admissions.actions";
import { UNIVERSITY_FACULTIES } from "@/domains/admissions/constants/admissions.constants";

function ApplyFormContent() {
  const searchParams = useSearchParams();
  const schoolParam = searchParams.get("school") || searchParams.get("schoolId") || "";

  const [pathway, setPathway] = useState<"university" | "general">("university");
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{
    id: number;
    name: string;
    slug?: string;
    logoPath?: string | null;
  }>({ id: 1, name: "Edut Pro • Pôle Universitaire & Scolaire", slug: "main" });

  const [facultiesList, setFacultiesList] = useState(UNIVERSITY_FACULTIES);
  const [classesList, setClassesList] = useState<string[]>([
    "Licence 1 Informatique & IA", "Licence 1 Gestion & Finance", "Licence 1 Droit Privé",
    "Licence 2 Génie Logiciel", "Licence 3 Audit & Finance", "Master 1 Data Science",
    "Terminale D", "Terminale C", "Terminale A", "1ère D", "2nde C",
    "3ème A", "4ème A", "5ème A", "6ème A"
  ]);

  const [submittedData, setSubmittedData] = useState<{
    applicationNumber: string;
    studentName: string;
    degreeProgram: string;
    schoolName: string;
    contactPhone: string;
  } | null>(null);

  const [selectedFacultyIndex, setSelectedFacultyIndex] = useState(0);

  const [formData, setFormData] = useState({
    educationLevel: "Université / Supérieur",
    faculty: "Faculté des Sciences & Technologies",
    department: "Informatique & Génie Logiciel",
    degreeProgram: "Licence Informatique & Génie Logiciel (L1-L3)",
    degreeLevel: "Licence 1",
    studyMode: "Présentiel / Temps plein",
    academicYear: "2026–2027",
    targetClass: "Licence 1 Informatique & Génie Logiciel",
    
    // Candidate details
    studentFirstName: "",
    studentLastName: "",
    dateOfBirth: "",
    gender: "M",
    placeOfBirth: "Niamey",
    nationality: "Nigérienne",
    candidateEmail: "",
    candidatePhone: "",
    candidateWhatsapp: "",
    address: "",
    city: "Niamey",

    // Baccalaureate & Academic Background
    bacSeries: "Série D",
    bacYear: "2026",
    bacMention: "Bien",
    bacRollNumber: "",
    previousSchool: "",
    previousGradeAvg: "",

    // Sponsor / Guardian
    parentName: "",
    parentRelation: "Père",
    parentPhone: "",
    parentWhatsapp: "",
    parentEmail: "",
    parentProfession: "",

    // Document links / uploads
    photoUrl: "",
    birthCertificateUrl: "",
    idCardPassportUrl: "",
    bacTranscriptUrl: "",
    bacCertificateUrl: "",
    higherEdTranscriptUrl: "",
    cvUrl: "",
    coverLetter: "",
    recommendationLetterUrl: "",
    medicalNotes: "",
    honorDeclaration: true,
  });

  useEffect(() => {
    async function loadSchoolData() {
      try {
        const res = await getPublicSchoolInfoForAdmissionsAction(schoolParam);
        if (res?.school) {
          setSchoolInfo(res.school);
        }
        if (res?.faculties && res.faculties.length > 0) {
          setFacultiesList(res.faculties);
        }
        if (res?.classes && res.classes.length > 0) {
          setClassesList(res.classes);
        }
      } catch (err) {
        console.error("Failed to load school admissions metadata:", err);
      }
    }
    loadSchoolData();
  }, [schoolParam]);

  const handleFacultyChange = (idx: number) => {
    setSelectedFacultyIndex(idx);
    const fac = facultiesList[idx];
    if (fac) {
      setFormData(prev => ({
        ...prev,
        faculty: fac.name,
        department: fac.departments[0] || "",
        degreeProgram: fac.programs[0] || "",
        targetClass: fac.programs[0] || "",
      }));
    }
  };

  const handlePathwayChange = (newPathway: "university" | "general") => {
    setPathway(newPathway);
    if (newPathway === "university") {
      const fac = facultiesList[0];
      setFormData(prev => ({
        ...prev,
        educationLevel: "Université / Supérieur",
        faculty: fac?.name || "Faculté des Sciences",
        department: fac?.departments[0] || "Informatique",
        degreeProgram: fac?.programs[0] || "Licence Informatique",
        targetClass: fac?.programs[0] || "Licence 1",
        degreeLevel: "Licence 1",
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        educationLevel: "Secondaire",
        faculty: "",
        department: "",
        degreeProgram: classesList[0] || "Terminale D",
        targetClass: classesList[0] || "Terminale D",
        degreeLevel: "Secondaire",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.studentFirstName.trim() ||
      !formData.studentLastName.trim() ||
      !formData.dateOfBirth.trim() ||
      !formData.parentName.trim() ||
      (!formData.parentPhone.trim() && !formData.candidatePhone.trim())
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
          degreeProgram: formData.degreeProgram || formData.targetClass,
          schoolName: res.schoolName || schoolInfo.name,
          contactPhone: formData.candidatePhone || formData.parentPhone,
        });
        toast.success(res.message || "Candidature enregistrée avec succès !");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(res.error || "Erreur lors de la soumission du dossier.");
      }
    } catch (err: any) {
      toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── SUCCESS CONFIRMATION SCREEN ─────────────────────────────────────────────
  if (submittedData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
        <div className="max-w-2xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 size-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 size-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="size-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <CheckCircle2 className="size-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20">
              Dossier de Candidature Enregistré
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-3">
              Candidature Soumise avec Succès !
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">
              Votre dossier a été transmis à la Commission des Admissions de <strong className="text-white">{submittedData.schoolName}</strong>.
            </p>
          </div>

          {/* Dossier Badge Box */}
          <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Numéro de Dossier Officiel</p>
                <p className="text-2xl font-mono font-black text-emerald-400 tracking-wider">{submittedData.applicationNumber}</p>
              </div>
              <div className="p-2 bg-white rounded-xl w-fit shadow-md">
                <QRCodeSVG
                  value={`https://edut.pro/admissions/status?app=${submittedData.applicationNumber}&phone=${encodeURIComponent(submittedData.contactPhone)}`}
                  size={68}
                  level="M"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Candidat :</span>{" "}
                <strong className="text-white font-bold">{submittedData.studentName}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Programme :</span>{" "}
                <strong className="text-white font-bold">{submittedData.degreeProgram}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Contact Notifié :</span>{" "}
                <strong className="text-white font-mono">{submittedData.contactPhone}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Statut :</span>{" "}
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
                  <Clock className="size-3.5" /> En cours d&apos;examen
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-2xl text-xs text-emerald-300 flex items-start gap-3 text-left">
            <Sparkles className="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              Un accusé de réception instantané contenant votre code de suivi et le lien direct a été expédié par <strong>SMS &amp; WhatsApp</strong>. Conservez précieusement ce code.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={`/admissions/status?app=${submittedData.applicationNumber}&phone=${encodeURIComponent(submittedData.contactPhone)}`}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
            >
              Suivre l&apos;Évolution du Dossier
              <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => window.print()}
              className="py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Printer className="size-4" />
              Imprimer le Récépissé
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN APPLICATION MULTI-STEP FORM ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="size-11 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              {schoolInfo.name}
              <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Portail Admissions
              </span>
            </h1>
            <p className="text-xs text-slate-400">Candidatures &amp; Nouvelles Inscriptions Universitaires et Scolaires</p>
          </div>
        </div>

        <Link
          href="/admissions/status"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 transition"
        >
          Déjà postulé ? Suivre mon dossier
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* ─── Main Form Container ───────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto w-full my-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden backdrop-blur-xl">

          {/* Pathway Selector Switcher */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => handlePathwayChange("university")}
              className={`flex-1 w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                pathway === "university"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GraduationCap className="size-4" />
              1. Enseignement Supérieur &amp; Universités (LMD)
            </button>
            <button
              type="button"
              onClick={() => handlePathwayChange("general")}
              className={`flex-1 w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all ${
                pathway === "general"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <School className="size-4" />
              2. Enseignement Général (Lycée • Collège • Primaire)
            </button>
          </div>

          {/* Progress Step Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="text-emerald-400 font-extrabold flex items-center gap-2">
                <span className="size-6 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center text-[11px] font-black">
                  {step}
                </span>
                {step === 1 && "Choix du Programme & Filière"}
                {step === 2 && "Identité & Contact du Candidat"}
                {step === 3 && "Parcours & Baccalauréat"}
                {step === 4 && "Pièces Justificatives Numérisées"}
                {step === 5 && "Tuteur & Engagement"}
              </span>
              <span>Étape {step} sur 5</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300 rounded-full"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 1: PROGRAM & FACULTY SELECTION
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <BookOpen className="size-5 text-emerald-400" />
                    Orientation &amp; Programme d&apos;Études
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Sélectionnez la faculté, la spécialité et le cycle universitaire convoité.</p>
                </div>

                {pathway === "university" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Faculty Select */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Faculté / UFR / École *</label>
                      <select
                        value={selectedFacultyIndex}
                        onChange={(e) => handleFacultyChange(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {facultiesList.map((fac, idx) => (
                          <option key={fac.name} value={idx} className="bg-slate-900 py-1">
                            {fac.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Département *</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {(facultiesList[selectedFacultyIndex]?.departments || ["Général"]).map(dep => (
                          <option key={dep} value={dep} className="bg-slate-900 py-1">
                            {dep}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Degree Program */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Filière / Programme de formation *</label>
                      <select
                        value={formData.degreeProgram}
                        onChange={(e) => setFormData({ ...formData, degreeProgram: e.target.value, targetClass: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {(facultiesList[selectedFacultyIndex]?.programs || ["Licence Générale"]).map(prog => (
                          <option key={prog} value={prog} className="bg-slate-900 py-1">
                            {prog}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Degree Level (Cycle) */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Cycle &amp; Niveau d&apos;admission *</label>
                      <select
                        value={formData.degreeLevel}
                        onChange={(e) => setFormData({ ...formData, degreeLevel: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Licence 1 (L1)" className="bg-slate-900">Licence 1 (L1) - Post-Bac</option>
                        <option value="Licence 2 (L2)" className="bg-slate-900">Licence 2 (L2) - Passerelle</option>
                        <option value="Licence 3 (L3)" className="bg-slate-900">Licence 3 (L3) - Diplômante</option>
                        <option value="Master 1 (M1)" className="bg-slate-900">Master 1 (M1) - Post-Licence</option>
                        <option value="Master 2 (M2)" className="bg-slate-900">Master 2 (M2) - Spécialisation</option>
                        <option value="Doctorat" className="bg-slate-900">Doctorat (PhD)</option>
                        <option value="BTS / DUT" className="bg-slate-900">BTS / DUT Professionnel</option>
                      </select>
                    </div>

                    {/* Study Mode */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300">Régime d&apos;études *</label>
                      <select
                        value={formData.studyMode}
                        onChange={(e) => setFormData({ ...formData, studyMode: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Présentiel / Temps plein" className="bg-slate-900">🏫 Présentiel / Temps plein (Journée)</option>
                        <option value="Cours du soir / Professionnels" className="bg-slate-900">🌙 Cours du soir (Professionnels)</option>
                        <option value="En ligne / Distanciel" className="bg-slate-900">💻 En ligne / Distanciel (Hybride)</option>
                        <option value="Alternance / Entreprise" className="bg-slate-900">💼 Alternance / Stage continu</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-slate-300">Classe d&apos;inscription demandée *</label>
                      <select
                        value={formData.targetClass}
                        onChange={(e) => setFormData({ ...formData, targetClass: e.target.value, degreeProgram: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                      >
                        {classesList.map(c => (
                          <option key={c} value={c} className="bg-slate-900 py-1">
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 2: CANDIDATE IDENTITY & DIRECT CONTACT
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <UserPlus className="size-5 text-emerald-400" />
                    État Civil &amp; Coordonnées du Candidat
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Renseignez scrupuleusement les informations d&apos;identité conformes à l&apos;acte de naissance ou passeport.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Nom de famille *</label>
                    <input
                      type="text"
                      required
                      value={formData.studentLastName}
                      onChange={(e) => setFormData({ ...formData, studentLastName: e.target.value })}
                      placeholder="Ex: OUSMANE"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Prénom(s) *</label>
                    <input
                      type="text"
                      required
                      value={formData.studentFirstName}
                      onChange={(e) => setFormData({ ...formData, studentFirstName: e.target.value })}
                      placeholder="Ex: Abdourahamane"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 capitalize"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Date de Naissance *</label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Genre / Sexe *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: "M" })}
                        className={`py-3 rounded-2xl text-xs font-bold border transition ${
                          formData.gender === "M"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Masculin (M)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: "F" })}
                        className={`py-3 rounded-2xl text-xs font-bold border transition ${
                          formData.gender === "F"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        Féminin (F)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Lieu de Naissance</label>
                    <input
                      type="text"
                      value={formData.placeOfBirth}
                      onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                      placeholder="Ex: Niamey"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Nationalité</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Ex: Nigérienne"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Email personnel du candidat</label>
                    <input
                      type="email"
                      value={formData.candidateEmail}
                      onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                      placeholder="candidat@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Téléphone Direct / WhatsApp du candidat *</label>
                    <input
                      type="tel"
                      value={formData.candidatePhone}
                      onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                      placeholder="+227 90 00 00 00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 3: ACADEMIC BACKGROUND & BACCALAUREATE
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Award className="size-5 text-emerald-400" />
                    Parcours Académique &amp; Baccalauréat
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Détaillez vos diplômes antérieurs pour l&apos;examen d&apos;éligibilité par le jury.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Série du Baccalauréat</label>
                    <select
                      value={formData.bacSeries}
                      onChange={(e) => setFormData({ ...formData, bacSeries: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Série D (Scientifique)" className="bg-slate-900">Série D (Sciences de la Vie &amp; Terre)</option>
                      <option value="Série C (Mathématiques/Physique)" className="bg-slate-900">Série C (Mathématiques &amp; Physiques)</option>
                      <option value="Série A (Littéraire)" className="bg-slate-900">Série A (Littératures &amp; Langues)</option>
                      <option value="Série E (Mathématiques/Technique)" className="bg-slate-900">Série E (Maths &amp; Technique)</option>
                      <option value="Série F (Technique/Génie)" className="bg-slate-900">Série F (Industrie &amp; Génie)</option>
                      <option value="Série G (Gestion/Tertiaire)" className="bg-slate-900">Série G (Gestion, Comptabilité &amp; Tertiaire)</option>
                      <option value="Baccalauréat International / Autre" className="bg-slate-900">Bac International / Autre équivalence</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Année d&apos;obtention du Bac</label>
                    <input
                      type="text"
                      value={formData.bacYear}
                      onChange={(e) => setFormData({ ...formData, bacYear: e.target.value })}
                      placeholder="Ex: 2026"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Mention obtenue</label>
                    <select
                      value={formData.bacMention}
                      onChange={(e) => setFormData({ ...formData, bacMention: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Très Bien (&gt;=16/20)" className="bg-slate-900">Très Bien (&gt;= 16/20)</option>
                      <option value="Bien (14-15.99/20)" className="bg-slate-900">Bien (14 - 15.99/20)</option>
                      <option value="Assez Bien (12-13.99/20)" className="bg-slate-900">Assez Bien (12 - 13.99/20)</option>
                      <option value="Passable (10-11.99/20)" className="bg-slate-900">Passable (10 - 11.99/20)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Numéro de table / Matricule Bac</label>
                    <input
                      type="text"
                      value={formData.bacRollNumber}
                      onChange={(e) => setFormData({ ...formData, bacRollNumber: e.target.value })}
                      placeholder="Ex: 2026-BAC-18492"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-300">Établissement / Lycée ou Université d&apos;origine</label>
                    <input
                      type="text"
                      value={formData.previousSchool}
                      onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                      placeholder="Ex: Lycée d'Excellence de Niamey / Université Abdou Moumouni"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 4: UPLOADED DIGITAL DOCUMENTS
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Upload className="size-5 text-emerald-400" />
                    Dossier Numérique &amp; Pièces Justificatives
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Collez les liens Cloud (Google Drive, Dropbox, Cloudinary) ou saisissez vos documents.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Photo d&apos;identité (URL)</label>
                    <input
                      type="url"
                      value={formData.photoUrl}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      placeholder="https://.../photo.jpg"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Pièce d&apos;identité / Passeport (URL)</label>
                    <input
                      type="url"
                      value={formData.idCardPassportUrl}
                      onChange={(e) => setFormData({ ...formData, idCardPassportUrl: e.target.value })}
                      placeholder="https://.../passport.pdf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Relevé de notes du Bac (URL)</label>
                    <input
                      type="url"
                      value={formData.bacTranscriptUrl}
                      onChange={(e) => setFormData({ ...formData, bacTranscriptUrl: e.target.value })}
                      placeholder="https://.../releve-bac.pdf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Diplôme / Attestation du Bac (URL)</label>
                    <input
                      type="url"
                      value={formData.bacCertificateUrl}
                      onChange={(e) => setFormData({ ...formData, bacCertificateUrl: e.target.value })}
                      placeholder="https://.../diplome-bac.pdf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-300">Lettre de motivation / Projet professionnel</label>
                    <textarea
                      rows={3}
                      value={formData.coverLetter}
                      onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                      placeholder="Expliquez brièvement les motivations qui guident votre choix pour cette filière et vos ambitions de carrière..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                STEP 5: SPONSOR / GUARDIAN & FINAL SUBMISSION
            ═══════════════════════════════════════════════════════════════════ */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <ShieldCheck className="size-5 text-emerald-400" />
                    Tuteur Légal / Répondant Financier &amp; Validation
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Personne responsable en cas d&apos;urgence ou garante des frais de scolarité.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Nom complet du Parent / Tuteur *</label>
                    <input
                      type="text"
                      required
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="Ex: Elhadj Ibrahim Ousmane"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Lien de parenté *</label>
                    <select
                      value={formData.parentRelation}
                      onChange={(e) => setFormData({ ...formData, parentRelation: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Père" className="bg-slate-900">Père</option>
                      <option value="Mère" className="bg-slate-900">Mère</option>
                      <option value="Tuteur Légal" className="bg-slate-900">Tuteur Légal</option>
                      <option value="Employeur / Sponsor" className="bg-slate-900">Employeur / Entreprise Sponsor</option>
                      <option value="Candidat Autonome" className="bg-slate-900">Candidat Autonome (Auto-financé)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Téléphone du Tuteur / Contact d&apos;Urgence *</label>
                    <input
                      type="tel"
                      required
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      placeholder="+227 96 00 00 00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Email du Tuteur</label>
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      placeholder="parent@email.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Final Agreement */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.honorDeclaration}
                      onChange={(e) => setFormData({ ...formData, honorDeclaration: e.target.checked })}
                      className="size-4 rounded mt-0.5 text-emerald-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-xs text-slate-300 leading-relaxed">
                      Je certifie sur l&apos;honneur l&apos;exactitude des renseignements et pièces fournis. J&apos;accepte le règlement intérieur et les conditions d&apos;admission de l&apos;établissement.
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* ─── Navigation Buttons ────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-800">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 border border-slate-700 transition"
                >
                  <ArrowLeft className="size-4" />
                  Précédent
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="py-3 px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  Suivant
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.honorDeclaration}
                  className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Transmission du Dossier...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Soumettre Définitivement ma Candidature
                    </>
                  )}
                </button>
              )}
            </div>

          </form>
        </div>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto w-full text-center py-6 text-xs text-slate-400 border-t border-slate-800/80">
        &copy; {new Date().getFullYear()} {schoolInfo.name} • Système d&apos;Admission Universitaire &amp; Scolaire Edut Pro.
      </footer>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400">
          <Loader2 className="size-8 animate-spin" />
        </div>
      }
    >
      <ApplyFormContent />
    </Suspense>
  );
}
