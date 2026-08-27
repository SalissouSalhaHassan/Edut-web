"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  GraduationCap, 
  Building2, 
  Calendar, 
  FileText, 
  Printer, 
  ArrowLeft,
  Download,
  Share2,
  Copy,
  Globe,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Loader2,
  QrCode,
  Check
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VerificationResult } from "@/domains/academics/actions/verification.actions";
import { generateVerificationCertificatePDF } from "@/domains/academics/utils/verification-certificate-generator";

type Language = "fr" | "en" | "ar";

const DICT = {
  fr: {
    portalBrand: "EDUT UNIVERSITÉ • PORTAIL PUBLIC DE VÉRIFICATION ACADÉMIQUE",
    backHome: "Accueil",
    docAuthentic: "DOCUMENT AUTHENTIQUE & OFFICIEL",
    certifiedTitle: "Authenticité Académique Certifiée",
    certifiedSub: "Les données ci-dessous correspondent fidèlement aux registres officiels de délibération de l'établissement et aux normes internationales CAMES & UNESCO.",
    downloadPdf: "Télécharger Certificat (PDF)",
    downloading: "Génération du PDF...",
    printCert: "Imprimer le Certificat",
    copyLink: "Copier le Lien Sécurisé",
    linkCopied: "Lien de vérification copié dans le presse-papier !",
    holderTitle: "Informations sur le Titulaire",
    fullName: "Nom & Prénoms",
    matricule: "Numéro Matricule / INE",
    birth: "Date & Lieu de Naissance",
    nationality: "Nationalité",
    gender: "Sexe",
    genderM: "Masculin",
    genderF: "Féminin",
    degreeTitle: "Titre & Qualification Délivrés",
    diplomaName: "Intitulé du Diplôme",
    fieldMention: "Domaine & Mention",
    decisionHonors: "Décision & Mention du Jury",
    creditsEcts: "Crédits ECTS Capitalisés",
    gpaScore: "Moyenne Cumulative (GPA)",
    promoYear: "Année Académique de Promotion",
    delibDate: "Date de Délibération",
    standardsTitle: "Normes & Reconnaissance Internationale",
    unescoIsced: "Classification UNESCO ISCED 2011",
    europeanEqf: "Cadre Européen des Certifications (EQF)",
    wesEquiv: "Équivalence WES / NACES (Amérique du Nord)",
    accreditation: "Accréditation Internationale",
    institutionTitle: "Établissement & Autorité de Tutelle",
    rectorat: "Direction & Registre",
    securityTitle: "Preuve Cryptographique & Registre Public Inviolable",
    shaHash: "Empreinte Numérique SHA-256 du Procès-Verbal",
    w3cId: "Identifiant Verifiable Credential W3C",
    trustAnchor: "Ancrage de Confiance & Signature Numérique",
    curriculumTitle: "Programme & Relevé des Unités d'Enseignement (UE)",
    showCurriculum: "Afficher le détail des 180 ECTS et des matières",
    hideCurriculum: "Masquer le détail du programme",
    securityNotice: "Portail de Certification & d'Intégrité Académique conforme aux normes CAMES, REESAO, Processus de Bologne et UNESCO. Système Sécurisé EDUT.",
    securityLevel: "Niveau 3 - Ancrage Cryptographique & Registre Public Inviolable",
    shareSuccess: "Lien partagé avec succès !",
  },
  en: {
    portalBrand: "EDUT UNIVERSITY • PUBLIC ACADEMIC VERIFICATION PORTAL",
    backHome: "Home",
    docAuthentic: "OFFICIALLY AUTHENTIC & CERTIFIED DOCUMENT",
    certifiedTitle: "Certified Academic Authenticity",
    certifiedSub: "The data below strictly matches the official academic deliberation records of the institution and international CAMES & UNESCO standards.",
    downloadPdf: "Download Certificate (PDF)",
    downloading: "Generating PDF...",
    printCert: "Print Certificate",
    copyLink: "Copy Secure Link",
    linkCopied: "Verification link copied to clipboard!",
    holderTitle: "Holder Information",
    fullName: "Full Name",
    matricule: "Student ID / National Student No.",
    birth: "Date & Place of Birth",
    nationality: "Nationality",
    gender: "Gender",
    genderM: "Male",
    genderF: "Female",
    degreeTitle: "Conferred Academic Qualification",
    diplomaName: "Conferred Degree Title",
    fieldMention: "Field of Study & Specialization",
    decisionHonors: "Jury Decision & Academic Honors",
    creditsEcts: "Capitalized ECTS Credits",
    gpaScore: "Cumulative Grade Point Average (GPA)",
    promoYear: "Academic Promotion Year",
    delibDate: "Deliberation Date",
    standardsTitle: "Global Standards & International Recognition",
    unescoIsced: "UNESCO ISCED 2011 Classification",
    europeanEqf: "European Qualifications Framework (EQF)",
    wesEquiv: "WES / NACES Equivalency (North America)",
    accreditation: "International Accreditation",
    institutionTitle: "Awarding Institution & Legal Authority",
    rectorat: "Registrar & Academic Registry",
    securityTitle: "Cryptographic Proof & Public Ledger",
    shaHash: "SHA-256 Fingerprint of Deliberation Record",
    w3cId: "W3C Verifiable Credential Identifier",
    trustAnchor: "Digital Trust Anchor & Cryptographic Signature",
    curriculumTitle: "Official Curriculum & Educational Units (UE) Breakdown",
    showCurriculum: "Show complete 180 ECTS course breakdown",
    hideCurriculum: "Hide course breakdown",
    securityNotice: "Academic Certification & Integrity Portal compliant with CAMES, REESAO, European Bologna Process, and UNESCO standards. Secured by EDUT.",
    securityLevel: "Security Level 3 - Cryptographically Anchored Public Record",
    shareSuccess: "Verification link shared successfully!",
  },
  ar: {
    portalBrand: "جامعة EDUT • البوابة العامة للتحقق والمصادقة الأكاديمية",
    backHome: "الرئيسية",
    docAuthentic: "وثيقة أصلية وموثقة رسمياً",
    certifiedTitle: "صحة أكاديمية معتمدة وموثقة",
    certifiedSub: "البيانات الواردة أدناه مطابقة تماماً لسجلات المداولات الرسمية الصادرة عن المؤسسة وتستوفي معايير اليونسكو وCAMES الدولية.",
    downloadPdf: "تحميل شهادة التحقق (PDF)",
    downloading: "جاري إنشاء وثيقة PDF...",
    printCert: "طباعة الشهادة الرسمية",
    copyLink: "نسخ الرابط الآمن",
    linkCopied: "تم نسخ رابط التحقق المباشر إلى الحافظة بنجاح!",
    holderTitle: "بيانات حامل المؤهل الأكاديمي",
    fullName: "الاسم الكامل",
    matricule: "رقم التسجيل / الرقم الوطني للطالب",
    birth: "تاريخ ومكان الميلاد",
    nationality: "الجنسية",
    gender: "الجنس",
    genderM: "ذكر",
    genderF: "أنثى",
    degreeTitle: "المؤهل والتخصص الممنوح",
    diplomaName: "عنوان الشهادة الأكاديمية",
    fieldMention: "المجال والتخصص الدقيق",
    decisionHonors: "قرار لجنة المداولات والتقدير",
    creditsEcts: "الأرصدة الأوروبية المكتسبة (ECTS)",
    gpaScore: "المعدل التراكمي الدولي (GPA)",
    promoYear: "السنة الأكاديمية للتخرج",
    delibDate: "تاريخ المداولة والتصديق",
    standardsTitle: "المعايير الدولية والاعتراف العالمي",
    unescoIsced: "تصنيف اليونسكو الدولي للتعليم (ISCED 2011)",
    europeanEqf: "إطار المؤهلات الأوروبي (EQF Level 6)",
    wesEquiv: "جاهزية المعادلة لدى WES / NACES (أمريكا الشمالية)",
    accreditation: "الاعتماد الأكاديمي الدولي",
    institutionTitle: "المؤسسة المانحة وسلطة الوصاية",
    rectorat: "إدارة الشؤون الأكاديمية والسجل العام",
    securityTitle: "الإثبات المشفر وسجل الأمان الرقمي غير القابل للتعديل",
    shaHash: "بصمة التشفير الرقمية SHA-256 للمحضر الرسمي",
    w3cId: "معرف الاعتماد الرقمي W3C Verifiable Credential",
    trustAnchor: "مرساة الثقة والتوقيع الرقمي المشفر",
    curriculumTitle: "السجل الدراسي المعتمد وتفاصيل الوحدات التعليمية (UE)",
    showCurriculum: "عرض تفاصيل المقررات و 180 نقطة ECTS",
    hideCurriculum: "إخفاء تفاصيل المقررات",
    securityNotice: "بوابة المصادقة والنزاهة الأكاديمية متوافقة مع معايير اليونسكو (UNESCO)، مسار بولونيا الأوروبي، وهيئات CAMES و REESAO. نظام EDUT الآمن.",
    securityLevel: "مستوى الأمان 3 - سجل موثق مشفراً ومقاوم للتلاعب (W3C Standard)",
    shareSuccess: "تمت مشاركة رابط التحقق بنجاح!",
  }
};

export function VerificationClient({ 
  data, 
  rawId 
}: { 
  data: VerificationResult | null; 
  rawId: string;
}) {
  const [lang, setLang] = useState<Language>("fr");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showCurriculum, setShowCurriculum] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const t = DICT[lang];
  const isRtl = lang === "ar";

  const currentUrl = typeof window !== "undefined" ? window.location.href : `https://niger.edut.pro/verify/${rawId}`;

  const handleDownloadPdf = async () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      await generateVerificationCertificatePDF(data, currentUrl);
      toast.success("Certificat officiel de vérification téléchargé avec succès !");
    } catch (e) {
      toast.error("Erreur lors de la génération du certificat PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(currentUrl);
      setHasCopied(true);
      toast.success(t.linkCopied);
      setTimeout(() => setHasCopied(false), 3000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Certification Académique - ${data?.student.nom || rawId}`,
          text: `Vérification officielle d'authenticité du diplôme pour ${data?.student.nom} (${data?.degree.title})`,
          url: currentUrl,
        });
        toast.success(t.shareSuccess);
      } catch (e) {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div 
      dir={isRtl ? "rtl" : "ltr"} 
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 selection:bg-indigo-500 selection:text-white transition-all ${
        isRtl ? "font-sans" : ""
      }`}
    >
      {/* ─── TOP BRAND & LANGUAGE SELECTOR BAR ─── */}
      <header className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs sm:text-sm tracking-wide">
          <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span>{t.portalBrand}</span>
        </div>

        {/* Language Switcher Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            onClick={() => setLang("fr")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              lang === "fr"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🇫🇷</span>
            <span>Français</span>
          </button>

          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              lang === "en"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🇬🇧</span>
            <span>English</span>
          </button>

          <button
            onClick={() => setLang("ar")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              lang === "ar"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>🇸🇦</span>
            <span>العربية</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN CERTIFICATION CONTAINER ─── */}
      <main className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-2.5 bg-gradient-to-r from-emerald-500 via-teal-400 via-indigo-500 to-amber-500 rounded-full blur-xs" />

        {data && data.isValid ? (
          <>
            {/* ─── HERO VERIFICATION BADGE ─── */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative mb-4">
                <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 animate-in zoom-in-90 duration-300">
                  <ShieldCheck className="h-11 w-11" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-emerald-500 text-slate-950 shadow-md">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-3 shadow-inner">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>{t.docAuthentic}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                {t.certifiedTitle}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
                {t.certifiedSub}
              </p>

              {/* Security Anchoring Pill */}
              <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t.securityLevel}</span>
              </div>
            </div>

            {/* ─── ACTION TOOLBAR ─── */}
            <div className="flex items-center justify-center flex-wrap gap-3 mb-8 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <Button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{isExportingPdf ? t.downloading : t.downloadPdf}</span>
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-2 transition-colors"
              >
                <Printer className="h-4 w-4 text-slate-400" />
                <span>{t.printCert}</span>
              </Button>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-2 transition-colors"
              >
                {hasCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                <span>{hasCopied ? "Copié !" : t.copyLink}</span>
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="h-11 px-4 rounded-xl border-indigo-700/60 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 text-xs font-bold gap-2 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Partager</span>
              </Button>
            </div>

            {/* ─── STRUCTURED DATA SECTIONS ─── */}
            <div className="space-y-6">
              
              {/* 1. HOLDER IDENTITY */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2.5 text-xs font-black text-indigo-400 uppercase tracking-wider mb-5 border-b border-slate-700/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <span>{t.holderTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400 font-medium">{t.fullName}</div>
                    <div className="font-black text-white text-lg mt-1 tracking-tight">{data.student.nom}</div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400 font-medium">{t.matricule}</div>
                    <div className="font-mono font-black text-indigo-300 text-lg mt-1 tracking-wider">{data.student.matricule}</div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400 font-medium">{t.birth}</div>
                    <div className="font-semibold text-slate-200 mt-1">{data.student.dateNaissance} à {data.student.lieuNaissance}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 font-medium">{t.nationality}</div>
                    <div className="font-semibold text-slate-200 mt-1">{data.student.nationalite || "Nigérienne"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 font-medium">{t.gender}</div>
                    <div className="font-semibold text-slate-200 mt-1">{data.student.sexe === "M" ? t.genderM : t.genderF}</div>
                  </div>
                </div>
              </div>

              {/* 2. CONFERRED ACADEMIC QUALIFICATION & DEGREE */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2.5 text-xs font-black text-amber-400 uppercase tracking-wider mb-5 border-b border-slate-700/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Award className="h-4 w-4" />
                  </div>
                  <span>{t.degreeTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-sm">
                  <div className="sm:col-span-2 md:col-span-3">
                    <div className="text-xs text-slate-400 font-medium">{t.diplomaName}</div>
                    <div className="font-black text-white text-lg sm:text-xl mt-1 text-emerald-300">
                      {lang === "en" ? data.degree.titleEn : lang === "ar" ? data.degree.titleAr : data.degree.title}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400 font-medium">{t.fieldMention}</div>
                    <div className="font-bold text-slate-200 mt-1">
                      {lang === "en" ? `${data.degree.fieldEn} — ${data.degree.mentionEn}` : lang === "ar" ? `${data.degree.fieldAr} — ${data.degree.mentionAr}` : `${data.degree.field} — ${data.degree.mention}`}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 font-medium">{t.decisionHonors}</div>
                    <div className="font-black text-emerald-400 mt-1 text-base">
                      {lang === "en" ? data.degree.statusEn : lang === "ar" ? data.degree.statusAr : data.degree.status}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 font-medium">{t.creditsEcts}</div>
                    <div className="font-mono font-black text-indigo-300 text-base mt-1">
                      {data.degree.ectsCredits} ECTS (100% Validé)
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 font-medium">{t.gpaScore}</div>
                    <div className="font-mono font-black text-amber-300 text-base mt-1">
                      {data.degree.gpa}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400 font-medium">{t.promoYear} / {t.delibDate}</div>
                    <div className="font-semibold text-slate-200 mt-1">
                      {data.degree.graduationYear} • {data.degree.deliberationDate}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. GLOBAL STANDARDS & INTERNATIONAL EQUIVALENCIES */}
              <div className="bg-gradient-to-br from-slate-800/80 via-slate-800/50 to-indigo-950/40 border border-indigo-500/30 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-black text-indigo-300 uppercase tracking-wider mb-5 border-b border-indigo-500/20 pb-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span>{t.standardsTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 font-bold text-xs mt-0.5">
                      UNESCO
                    </div>
                    <div>
                      <div className="font-bold text-slate-300">{t.unescoIsced}</div>
                      <div className="text-slate-400 mt-0.5 leading-relaxed">
                        {lang === "en" ? data.standards.unescoIscedEn : lang === "ar" ? data.standards.unescoIscedAr : data.standards.unescoIsced}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs mt-0.5">
                      BOLOGNA
                    </div>
                    <div>
                      <div className="font-bold text-slate-300">{t.europeanEqf}</div>
                      <div className="text-slate-400 mt-0.5 leading-relaxed">
                        {data.standards.eqfLevel} • {data.standards.bolognaCycle}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 font-bold text-xs mt-0.5">
                      WES / ECE
                    </div>
                    <div>
                      <div className="font-bold text-slate-300">{t.wesEquiv}</div>
                      <div className="text-slate-400 mt-0.5 leading-relaxed">
                        {data.standards.wesEquivalency}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 font-bold text-xs mt-0.5">
                      CAMES
                    </div>
                    <div>
                      <div className="font-bold text-slate-300">{t.accreditation}</div>
                      <div className="text-slate-400 mt-0.5 leading-relaxed">
                        {lang === "en" ? data.institution.accreditationEn : lang === "ar" ? data.institution.accreditationAr : data.institution.accreditation}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. INSTITUTION & LEGAL AUTHORITY */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2.5 text-xs font-black text-teal-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span>{t.institutionTitle}</span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="font-black text-white text-lg">
                    {lang === "en" ? data.institution.nameEn : lang === "ar" ? data.institution.nameAr : data.institution.name}
                  </div>
                  
                  <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{lang === "en" ? data.institution.ministryEn : lang === "ar" ? data.institution.ministryAr : data.institution.ministry}</span>
                    <span>•</span>
                    <span className="font-bold text-indigo-300">{lang === "en" ? data.institution.countryEn : lang === "ar" ? data.institution.countryAr : data.institution.country}</span>
                  </div>

                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{data.institution.accreditation}</span>
                    </div>

                    <a
                      href={data.institution.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                    >
                      <span>{data.institution.website}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* 5. INTERACTIVE CURRICULUM ACCORDION */}
              {data.curriculum && data.curriculum.length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setShowCurriculum(!showCurriculum)}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{t.curriculumTitle}</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">
                          {showCurriculum ? t.hideCurriculum : t.showCurriculum}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-900 text-slate-400">
                      {showCurriculum ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {showCurriculum && (
                    <div className="p-6 pt-0 border-t border-slate-700/60 overflow-x-auto animate-in fade-in-50 duration-200">
                      <table className="w-full text-xs text-left min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-400 font-bold">
                            <th className="py-2.5 px-2">Code UE</th>
                            <th className="py-2.5 px-2">Intitulé de l'Unité d'Enseignement</th>
                            <th className="py-2.5 px-2 text-center">ECTS</th>
                            <th className="py-2.5 px-2 text-center">Note /20</th>
                            <th className="py-2.5 px-2 text-center">Grade</th>
                            <th className="py-2.5 px-2 text-right">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {data.curriculum.map((ue, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                              <td className="py-3 px-2 font-mono font-bold text-indigo-300">{ue.codeUe}</td>
                              <td className="py-3 px-2 font-bold text-slate-200">{ue.nameUe}</td>
                              <td className="py-3 px-2 text-center font-mono font-bold text-slate-300">{ue.creditsEcts}</td>
                              <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">{ue.grade.toFixed(2)}</td>
                              <td className="py-3 px-2 text-center font-mono font-black text-amber-400">{ue.gradeEcts}</td>
                              <td className="py-3 px-2 text-right font-medium text-slate-300">{ue.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 6. CRYPTOGRAPHIC PROOF & W3C VERIFIABLE CREDENTIALS */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 font-mono text-xs space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-2">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span>{t.securityTitle}</span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-400 break-all">
                  <div>
                    <span className="text-slate-500 font-bold block">{t.shaHash} :</span>
                    <span className="text-emerald-400 font-bold">{data.degree.verificationHash}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block">{t.w3cId} :</span>
                    <span className="text-indigo-300">{data.degree.merkleProof}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-bold block">{t.trustAnchor} :</span>
                    <span className="text-slate-300">{data.degree.digitalSignature}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ─── NOT FOUND STATE ─── */
          <div className="flex flex-col items-center text-center py-16">
            <div className="h-20 w-20 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-400 flex items-center justify-center mb-5 shadow-xl shadow-rose-500/10">
              <FileText className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">Identifiant Non Trouvé / Invalid Record</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
              Aucun document officiel ne correspond à la référence <span className="text-white font-mono font-bold bg-slate-800 px-2 py-1 rounded">{rawId}</span>. Veuillez vérifier l'exactitude du QR Code ou contacter le secrétariat académique de l'établissement.
            </p>
            <Link
              href="/"
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30"
            >
              Retour à l'accueil
            </Link>
          </div>
        )}
      </main>

      {/* ─── FOOTER SECURITY NOTICE ─── */}
      <footer className="mt-8 text-center text-xs text-slate-500 max-w-xl leading-relaxed">
        {t.securityNotice}
      </footer>
    </div>
  );
}
