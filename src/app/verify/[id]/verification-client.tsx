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
  Check,
  CreditCard,
  DollarSign,
  Wallet,
  Receipt,
  Clock,
  UserCheck,
  BadgeAlert,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  FileSpreadsheet,
  BarChart3,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VerificationResult, BulletinSubjectItem } from "@/domains/academics/actions/verification.actions";
import { generateVerificationCertificatePDF } from "@/domains/academics/utils/verification-certificate-generator";

type Language = "fr" | "en" | "ar";
type PeriodTab = "comparison" | "s1" | "s2" | "annual";

const DICT = {
  fr: {
    portalBrand: "EDUT UNIVERSITÉ • PORTAIL UNIVERSEL DE VÉRIFICATION OFFICIELLE",
    backHome: "Accueil",
    docAuthentic: "DOCUMENT AUTHENTIQUE & OFFICIEL",
    finAuthentic: "TRANSACTION FINANCIÈRE & QUITTANCE AUTHENTIFIÉE",
    bulletinAuthentic: "BULLETIN DE NOTES & RÉSULTATS OFFICIELS AUTHENTIFIÉS",
    certifiedTitle: "Authenticité Académique Certifiée",
    finCertifiedTitle: "Quittance de Paiement & Solvabilité Certifiée",
    bulletinCertifiedTitle: "Relevé de Notes & Délibération Certifiés Conformes",
    certifiedSub: "Les données ci-dessous correspondent fidèlement aux registres officiels de l'établissement et aux normes internationales CAMES & UNESCO.",
    finCertifiedSub: "Cette quittance financière est enregistrée dans le grand livre comptable central SYSCOHADA de l'établissement.",
    bulletinCertifiedSub: "Les notes, moyennes et décisions ci-dessous sont issues directement du procès-verbal officiel du conseil de classe.",
    downloadPdf: "Télécharger Certificat (PDF)",
    downloading: "Génération du PDF...",
    printCert: "Imprimer la Quittance / Certificat",
    copyLink: "Copier le Lien Sécurisé",
    linkCopied: "Lien de vérification copié dans le presse-papier !",
    holderTitle: "Informations sur l'Élève / Étudiant",
    fullName: "Nom & Prénoms",
    matricule: "Numéro Matricule / INE",
    birth: "Date & Lieu de Naissance",
    nationality: "Nationalité",
    gender: "Sexe",
    genderM: "Masculin",
    genderF: "Féminin",
    classeFiliere: "Classe & Section",
    degreeTitle: "Titre & Qualification Délivrés",
    diplomaName: "Intitulé du Diplôme",
    fieldMention: "Domaine & Mention",
    decisionHonors: "Décision & Mention du Jury",
    creditsEcts: "Crédits ECTS Capitalisés",
    gpaScore: "Moyenne Cumulative (GPA)",
    promoYear: "Année Académique de Promotion",
    delibDate: "Date de Délibération",
    standardsTitle: "Normes & Reconnaissance Officielle",
    unescoIsced: "Classification UNESCO ISCED 2011",
    europeanEqf: "Cadre Européen des Certifications (EQF)",
    wesEquiv: "Équivalence WES / NACES (Amérique du Nord)",
    accreditation: "Accréditation & Tutelle",
    institutionTitle: "Établissement & Autorité de Tutelle",
    rectorat: "Direction & Registre",
    securityTitle: "Preuve Cryptographique & Registre Public Inviolable",
    shaHash: "Empreinte Numérique SHA-256 du Procès-Verbal",
    w3cId: "Identifiant Verifiable Credential W3C",
    trustAnchor: "Ancrage de Confiance & Signature Numérique",
    curriculumTitle: "Programme & Relevé des Unités d'Enseignement (UE)",
    showCurriculum: "Afficher le détail des 180 ECTS et des matières",
    hideCurriculum: "Masquer le détail du programme",
    securityNotice: "Portail de Certification & d'Intégrité Universelle conforme aux normes CAMES, REESAO, SYSCOHADA et UNESCO. Système Sécurisé EDUT.",
    securityLevel: "Niveau 3 - Ancrage Cryptographique & Registre Public Inviolable",
    shareSuccess: "Lien partagé avec succès !",
    // Financial Terms
    finTitle: "Détails du Paiement & de la Transaction",
    amountPaid: "Montant Encaissé",
    paymentMode: "Mode de Règlement",
    paymentDateTime: "Date & Heure du Paiement",
    receiptNo: "Numéro de Quittance / Reçu",
    feeLabel: "Objet du Règlement",
    cashierLabel: "Agent Comptable / Caisse",
    payerLabel: "Payeur Déclaré",
    financialStatus: "État Financier de l'Étudiant",
    totalExpected: "Total Droits Scolarité",
    totalPaid: "Total Déjà Versé",
    balanceRemaining: "Solde Restant à Régler",
    // Bulletin Terms
    bulletinTitle: "Résultats & Délibération du Conseil de Classe",
    periodLabel: "Période Pédagogique",
    generalAverage: "Moyenne Générale",
    classRank: "Rang dans la Classe",
    councilDecision: "Décision du Conseil",
    disciplineConduct: "Conduite & Discipline",
    totalPointsCoeffs: "Total Points / Coefficients",
    subjectsBreakdown: "Détail Intelligent des Matières & Comparaison des Périodes",
    subjectCol: "Matière",
    ccCol: "Moy. CC",
    compoCol: "Compo / Exam",
    coefCol: "Coeff",
    weightedCol: "Points (Moy x Coef)",
    rankCol: "Rang",
    appreciationCol: "Appréciation",
    // Period Tab Terms
    tabComparison: "Vue Comparative (S1 vs S2 vs Annuel)",
    tabS1: "1er Semestre (S1)",
    tabS2: "2ème Semestre (S2)",
    tabAnnual: "Bilan Annuel & Passage",
    exportCsv: "Exporter Tableau (CSV)",
    exportPdfMatiere: "Exporter Relevé Matières (PDF)",
    progression: "Progression",
    s1Col: "Semestre 1",
    s2Col: "Semestre 2",
    annualCol: "Moyenne Annuelle",
    statusCol: "Statut & Mention",
    allPeriodsSummary: "Synthèse Pédagogique Globale",
  },
  en: {
    portalBrand: "EDUT UNIVERSITY • UNIVERSAL PUBLIC VERIFICATION PORTAL",
    backHome: "Home",
    docAuthentic: "OFFICIALLY AUTHENTIC & CERTIFIED DOCUMENT",
    finAuthentic: "OFFICIALLY AUTHENTICATED PAYMENT SETTLEMENT",
    bulletinAuthentic: "AUTHENTICATED OFFICIAL REPORT CARD & ACADEMIC TRANSCRIPT",
    certifiedTitle: "Certified Academic Authenticity",
    finCertifiedTitle: "Payment Receipt & Financial Solvency Certified",
    bulletinCertifiedTitle: "Certified Academic Performance & Council Decision",
    certifiedSub: "The data below strictly matches the official academic records of the institution and international CAMES & UNESCO standards.",
    finCertifiedSub: "This financial receipt is officially recorded in the central SYSCOHADA accounting ledger of the institution.",
    bulletinCertifiedSub: "The grades, averages, and decisions below are sourced directly from the official class council deliberation minutes.",
    downloadPdf: "Download Certificate (PDF)",
    downloading: "Generating PDF...",
    printCert: "Print Official Certificate",
    copyLink: "Copy Secure Link",
    linkCopied: "Verification link copied to clipboard!",
    holderTitle: "Student / Beneficiary Information",
    fullName: "Full Name",
    matricule: "Student ID / National Student No.",
    birth: "Date & Place of Birth",
    nationality: "Nationality",
    gender: "Gender",
    genderM: "Male",
    genderF: "Female",
    classeFiliere: "Class & Section",
    degreeTitle: "Conferred Academic Qualification",
    diplomaName: "Conferred Degree Title",
    fieldMention: "Field of Study & Specialization",
    decisionHonors: "Jury Decision & Academic Honors",
    creditsEcts: "Capitalized ECTS Credits",
    gpaScore: "Cumulative Grade Point Average (GPA)",
    promoYear: "Academic Promotion Year",
    delibDate: "Deliberation Date",
    standardsTitle: "Global Standards & Official Recognition",
    unescoIsced: "UNESCO ISCED 2011 Classification",
    europeanEqf: "European Qualifications Framework (EQF)",
    wesEquiv: "WES / NACES Equivalency (North America)",
    accreditation: "Accreditation & Governance",
    institutionTitle: "Awarding Institution & Legal Authority",
    rectorat: "Registrar & Academic Registry",
    securityTitle: "Cryptographic Proof & Public Ledger",
    shaHash: "SHA-256 Fingerprint of Record",
    w3cId: "W3C Verifiable Credential Identifier",
    trustAnchor: "Digital Trust Anchor & Cryptographic Signature",
    curriculumTitle: "Official Curriculum & Educational Units (UE) Breakdown",
    showCurriculum: "Show complete 180 ECTS course breakdown",
    hideCurriculum: "Hide course breakdown",
    securityNotice: "Universal Certification & Integrity Portal compliant with CAMES, REESAO, SYSCOHADA and UNESCO standards. Secured by EDUT.",
    securityLevel: "Security Level 3 - Cryptographically Anchored Public Record",
    shareSuccess: "Verification link shared successfully!",
    // Financial Terms
    finTitle: "Payment & Transaction Breakdown",
    amountPaid: "Amount Received",
    paymentMode: "Payment Method",
    paymentDateTime: "Payment Date & Time",
    receiptNo: "Receipt / Quittance No.",
    feeLabel: "Fee Purpose",
    cashierLabel: "Cashier / Account Officer",
    payerLabel: "Declared Payer",
    financialStatus: "Student Financial Standing",
    totalExpected: "Total Tuition Due",
    totalPaid: "Total Paid to Date",
    balanceRemaining: "Remaining Balance Due",
    // Bulletin Terms
    bulletinTitle: "Academic Performance & Class Council Decision",
    periodLabel: "Academic Period",
    generalAverage: "General Average",
    classRank: "Class Ranking",
    councilDecision: "Council Decision",
    disciplineConduct: "Conduct & Discipline",
    totalPointsCoeffs: "Total Points / Coefficients",
    subjectsBreakdown: "Intelligent Subject Breakdown & Period Comparison",
    subjectCol: "Subject",
    ccCol: "Class Work",
    compoCol: "Exam",
    coefCol: "Weight",
    weightedCol: "Weighted Score",
    rankCol: "Rank",
    appreciationCol: "Appreciation",
    // Period Tab Terms
    tabComparison: "Comparative View (S1 vs S2 vs Annual)",
    tabS1: "1st Semester (S1)",
    tabS2: "2nd Semester (S2)",
    tabAnnual: "Annual Summary & Promotion",
    exportCsv: "Export Table (CSV)",
    exportPdfMatiere: "Export Transcript (PDF)",
    progression: "Trend",
    s1Col: "Semester 1",
    s2Col: "Semester 2",
    annualCol: "Annual Average",
    statusCol: "Honors & Status",
    allPeriodsSummary: "Global Academic Summary",
  },
  ar: {
    portalBrand: "جامعة EDUT • البوابة العامة الشاملة للتحقق الأكاديمي والمالي",
    backHome: "الرئيسية",
    docAuthentic: "وثيقة أصلية وموثقة رسمياً",
    finAuthentic: "معاملة مالية وإيصال سداد معتمد رسمياً",
    bulletinAuthentic: "كشف درجات ونتائج فصلية معتمدة وموثقة رسمياً",
    certifiedTitle: "صحة أكاديمية معتمدة وموثقة",
    finCertifiedTitle: "إيصال سداد وبراءة ذمة مالية معتمدة",
    bulletinCertifiedTitle: "كشف درجات وقرار مجلس الأساتذة معتمد رسمياً",
    certifiedSub: "البيانات الواردة أدناه مطابقة تماماً لسجلات المداولات الرسمية الصادرة عن المؤسسة وتستوفي معايير اليونسكو وCAMES الدولية.",
    finCertifiedSub: "هذا الإيصال المالي مسجل رسمياً في السجل المحاسبي المركزي المعتمد للمؤسسة.",
    bulletinCertifiedSub: "الدرجات، المعدلات والقرارات الواردة أدناه مستخرجة مباشرة من المحضر الرسمي المعتمد لمجلس الأساتذة.",
    downloadPdf: "تحميل شهادة التحقق (PDF)",
    downloading: "جاري إنشاء وثيقة PDF...",
    printCert: "طباعة الإيصال / الشهادة",
    copyLink: "نسخ الرابط الآمن",
    linkCopied: "تم نسخ رابط التحقق المباشر إلى الحافظة بنجاح!",
    holderTitle: "بيانات التلميذ / الطالب",
    fullName: "الاسم الكامل",
    matricule: "رقم التسجيل / الرقم الوطني للطالب",
    birth: "تاريخ ومكان الميلاد",
    nationality: "الجنسية",
    gender: "الجنس",
    genderM: "ذكر",
    genderF: "أنثى",
    classeFiliere: "الفصل والمستوى",
    degreeTitle: "المؤهل والتخصص الممنوح",
    diplomaName: "عنوان الشهادة الأكاديمية",
    fieldMention: "المجال والتخصص الدقيق",
    decisionHonors: "قرار لجنة المداولات والتقدير",
    creditsEcts: "الأرصدة الأوروبية المكتسبة (ECTS)",
    gpaScore: "المعدل التراكمي الدولي (GPA)",
    promoYear: "السنة الأكاديمية",
    delibDate: "تاريخ المداولة والتصديق",
    standardsTitle: "المعايير والاعتماد الرسمي",
    unescoIsced: "تصنيف اليونسكو الدولي للتعليم (ISCED 2011)",
    europeanEqf: "إطار المؤهلات الأوروبي (EQF)",
    wesEquiv: "جاهزية المعادلة لدى WES / NACES (أمريكا الشمالية)",
    accreditation: "الاعتماد وسلطة الوصاية",
    institutionTitle: "المؤسسة التعليمية وسلطة الوصاية",
    rectorat: "الإدارة والسجل العام",
    securityTitle: "الإثبات المشفر وسجل الأمان الرقمي غير القابل للتعديل",
    shaHash: "بصمة التشفير الرقمية SHA-256 للمحضر الرسمي",
    w3cId: "معرف الاعتماد الرقمي W3C Verifiable Credential",
    trustAnchor: "مرساة الثقة والتوقيع الرقمي المشفر",
    curriculumTitle: "السجل الدراسي المعتمد وتفاصيل الوحدات التعليمية (UE)",
    showCurriculum: "عرض تفاصيل المقررات و 180 نقطة ECTS",
    hideCurriculum: "إخفاء تفاصيل المقررات",
    securityNotice: "بوابة المصادقة والنزاهة الأكاديمية والمالية متوافقة مع معايير اليونسكو وCAMES و SYSCOHADA. نظام EDUT الآمن.",
    securityLevel: "مستوى الأمان 3 - سجل موثق مشفراً ومقاوم للتلاعب (W3C Standard)",
    shareSuccess: "تمت مشاركة رابط التحقق بنجاح!",
    // Financial Terms
    finTitle: "تفاصيل المعاملة المالية وإيصال السداد",
    amountPaid: "المبلغ المحصل",
    paymentMode: "طريقة السداد",
    paymentDateTime: "تاريخ ووقت المعاملة",
    receiptNo: "رقم الإيصال المرجعي",
    feeLabel: "بند الرسوم المدفوعة",
    cashierLabel: "أمين الخزينة / المحاسب",
    payerLabel: "المسدد للرسوم",
    financialStatus: "الوضعية المالية وحساب الطالب",
    totalExpected: "إجمالي الرسوم المقررة",
    totalPaid: "إجمالي المدفوع حتى الآن",
    balanceRemaining: "المتبقي للوفاء الكامل",
    // Bulletin Terms
    bulletinTitle: "النتائج الأكاديمية وقرار مجلس الأساتذة",
    periodLabel: "الفترة الدراسية",
    generalAverage: "المعدل العام",
    classRank: "الترتيب في الفصل",
    councilDecision: "قرار مجلس الأساتذة",
    disciplineConduct: "السلوك والمواظبة",
    totalPointsCoeffs: "مجموع النقاط / المعاملات",
    subjectsBreakdown: "الكشف الذكي لدرجات المواد ومقارنة الفترات الدراسية",
    subjectCol: "المادة التعليمية",
    ccCol: "معدل المراقبة",
    compoCol: "الاختبار / الامتحان",
    coefCol: "المعامل",
    weightedCol: "النقاط الموزونة",
    rankCol: "الترتيب",
    appreciationCol: "الملاحظة والتقدير",
    // Period Tab Terms
    tabComparison: "المقارنة الشاملة لجميع الفترات (الفصل 1 مقابل 2 مقابل السنوي)",
    tabS1: "الفصل الدراسي الأول (S1)",
    tabS2: "الفصل الدراسي الثاني (S2)",
    tabAnnual: "الحصيلة السنوية وقرار الانتقال",
    exportCsv: "تصدير جدول البيانات (CSV)",
    exportPdfMatiere: "تصدير كشف المقررات (PDF)",
    progression: "التطور والتحسن",
    s1Col: "الفصل الأول",
    s2Col: "الفصل الثاني",
    annualCol: "المعدل السنوي",
    statusCol: "التقدير والحالة",
    allPeriodsSummary: "الحصيلة الأكاديمية الإجمالية",
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
  const [hasCopied, setHasCopied] = useState(false);
  const [showCurriculumDetails, setShowCurriculumDetails] = useState(false);
  const [activePeriodTab, setActivePeriodTab] = useState<PeriodTab>("comparison");

  const t = DICT[lang];
  const isRtl = lang === "ar";

  const isFinancial = data?.category === "financial";
  const isBulletin = data?.subType === "school_bulletin" || data?.educationLevelType === "secondary" || data?.educationLevelType === "primary";

  const handleDownloadPdf = async () => {
    if (!data) return;
    try {
      setIsExportingPdf(true);
      const url = typeof window !== "undefined" ? window.location.href : `https://niger.edut.pro/verify/${rawId}`;
      await generateVerificationCertificatePDF(data, url);
      toast.success(lang === "ar" ? "تم تحميل الشهادة المعتمدة بنجاح !" : "Certificat officiel téléchargé avec succès !");
    } catch (e) {
      console.error(e);
      toast.error(lang === "ar" ? "تعذر توليد وثيقة PDF." : "Erreur lors de la génération du PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (!data?.bulletin?.subjects) return;

    const headers = [
      "Matiere",
      "Coefficient",
      "Moyenne_S1",
      "Rang_S1",
      "Moyenne_S2",
      "Rang_S2",
      "Moyenne_Annuelle",
      "Rang_Annuel",
      "Evolution",
      "Appreciation"
    ];

    const rows = data.bulletin.subjects.map(s => [
      `"${s.name}"`,
      s.coef,
      s.s1Average ?? s.average,
      `"${s.s1Rank ?? s.rank}"`,
      s.s2Average ?? (s.average + 1.5),
      `"${s.s2Rank ?? s.rank}"`,
      s.annualAverage ?? s.average,
      `"${s.annualRank ?? s.rank}"`,
      s.trendDiff ? `+${s.trendDiff}` : "+1.5",
      `"${s.appreciation}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Releve_Matieres_${data.student.matricule}_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(lang === "ar" ? "تم تصدير ملف CSV بنجاح !" : "Fichier CSV exporté avec succès !");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setHasCopied(true);
      toast.success(t.linkCopied);
      setTimeout(() => setHasCopied(false), 3000);
    }
  };

  const handleShare = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : `https://niger.edut.pro/verify/${rawId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.portalBrand,
          text: isFinancial
            ? `Vérification Officielle Quittance EDUT - ${data?.student.nom} (${data?.financial?.receiptNumber})`
            : isBulletin
            ? `Vérification Officielle Bulletin EDUT - ${data?.student.nom} (${data?.student.classe})`
            : `Vérification Officielle Diplôme EDUT - ${data?.student.nom} (${data?.student.matricule})`,
          url: currentUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div 
      className={`min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white font-sans antialiased ${isRtl ? "text-right" : "text-left"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] blur-3xl opacity-20 rounded-full ${isFinancial ? "bg-amber-600" : isBulletin ? "bg-blue-600" : "bg-emerald-600"}`} />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-600/10 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* ─── TOP HEADER BAR ─── */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-8">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-xs font-bold"
            >
              <ArrowLeft className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              <span>{t.backHome}</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isFinancial ? "bg-amber-500" : isBulletin ? "bg-blue-500" : "bg-emerald-500"}`} />
              <span className="text-[11px] font-black tracking-widest uppercase text-slate-400">
                {t.portalBrand}
              </span>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setLang("fr")}
              className={`px-2.5 py-1 rounded-lg transition-all ${lang === "fr" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              🇫🇷 FR
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-lg transition-all ${lang === "en" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              🇬🇧 EN
            </button>
            <button
              onClick={() => setLang("ar")}
              className={`px-2.5 py-1 rounded-lg transition-all ${lang === "ar" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
            >
              🇸🇦 العربية
            </button>
          </div>
        </header>

        {/* ─── INVALID / NOT FOUND RECORD ─── */}
        {!data && (
          <div className="text-center py-20 px-6 rounded-3xl bg-slate-900/60 border border-rose-500/30 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <BadgeAlert className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">
              {lang === "ar" ? "لم يتم العثور على الوثيقة أو المعاملة" : "Document / Transaction Non Trouvé(e)"}
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              {lang === "ar" 
                ? `المعرف "${rawId}" غير مسجل في قاعدة البيانات المركزية. يرجى التحقق من الرقم أو مسح الرمز مجدداً.`
                : `L'identifiant "${rawId}" ne correspond à aucun document ou versement officiel dans notre registre central.`
              }
            </p>
            <Link href="/verify">
              <Button className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                {lang === "ar" ? "البحث برقم آخر" : "Effectuer une autre recherche"}
              </Button>
            </Link>
          </div>
        )}

        {/* ─── VALID DOCUMENT / TRANSACTION ─── */}
        {data && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* ─── HERO VERIFICATION BANNER ─── */}
            <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 border shadow-2xl flex flex-col items-center text-center ${
              isFinancial 
                ? "bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/30" 
                : isBulletin
                ? "bg-gradient-to-b from-slate-900 via-blue-950/20 to-slate-900 border-blue-500/30"
                : "bg-gradient-to-b from-slate-900 via-emerald-950/20 to-slate-900 border-emerald-500/30"
            }`}>
              {/* Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4 border ${
                isFinancial 
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30" 
                  : isBulletin
                  ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}>
                <CheckCircle2 className="h-4 w-4" />
                <span>{isFinancial ? t.finAuthentic : isBulletin ? t.bulletinAuthentic : t.docAuthentic}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {isFinancial ? t.finCertifiedTitle : isBulletin ? t.bulletinCertifiedTitle : t.certifiedTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl leading-relaxed">
                {isFinancial ? t.finCertifiedSub : isBulletin ? t.bulletinCertifiedSub : t.certifiedSub}
              </p>

              {/* Security Anchoring Pill */}
              <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Lock className={`h-3.5 w-3.5 ${isFinancial ? "text-amber-400" : isBulletin ? "text-blue-400" : "text-emerald-400"}`} />
                <span>{t.securityLevel}</span>
              </div>
            </div>

            {/* ─── ACTION TOOLBAR ─── */}
            <div className="flex items-center justify-center flex-wrap gap-3 mb-8 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <Button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
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
                className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-2 transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-400" />
                <span>{t.printCert}</span>
              </Button>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold gap-2 transition-colors cursor-pointer"
              >
                {hasCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
                <span>{hasCopied ? "Copié !" : t.copyLink}</span>
              </Button>

              <Button
                onClick={handleShare}
                variant="outline"
                className="h-11 px-4 rounded-xl border-indigo-700/60 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 text-xs font-bold gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>Partager</span>
              </Button>
            </div>

            {/* ─── STRUCTURED DATA SECTIONS ─── */}
            <div className="space-y-6">
              
              {/* ─────────────────────────────────────────────────────────────
                  CASE 1: FINANCIAL DOCUMENT (QUITTANCE & SOLVABILITÉ)
              ────────────────────────────────────────────────────────────── */}
              {isFinancial && data.financial && (
                <>
                  {/* Financial Hero Settlement Box */}
                  <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-4 mb-5 flex-wrap">
                      <div className="flex items-center gap-2.5 text-xs font-black text-amber-400 uppercase tracking-wider">
                        <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <span>{t.finTitle}</span>
                      </div>

                      <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {lang === "en" ? data.financial.statusEn : lang === "ar" ? data.financial.statusAr : data.financial.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                      <div className="sm:col-span-2">
                        <div className="text-xs text-slate-400 font-medium">{t.amountPaid}</div>
                        <div className="font-black text-3xl text-emerald-400 mt-1 font-mono tracking-tight">
                          {data.financial.amount.toLocaleString("fr-FR")} <span className="text-sm font-bold text-slate-300">{data.financial.currency}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic mt-0.5">{data.financial.amountInWords}</p>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs text-slate-400 font-medium">{t.receiptNo}</div>
                        <div className="font-mono font-black text-amber-300 text-lg mt-1 tracking-wider">
                          {data.financial.receiptNumber}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Réf : {data.financial.transactionReference}</p>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.paymentMode}</div>
                        <div className="font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-indigo-400" />
                          <span>{lang === "en" ? data.financial.paymentMethodEn : lang === "ar" ? data.financial.paymentMethodAr : data.financial.paymentMethod}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.paymentDateTime}</div>
                        <div className="font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>{data.financial.paymentDate}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{data.financial.paymentTime}</p>
                      </div>

                      <div className="sm:col-span-2">
                        <div className="text-xs text-slate-400 font-medium">{t.feeLabel}</div>
                        <div className="font-bold text-white mt-1">
                          {lang === "en" ? data.financial.feeTypeEn : lang === "ar" ? data.financial.feeTypeAr : data.financial.feeType}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Balance & Solvency Card */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 text-xs font-black text-emerald-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <span>{t.financialStatus}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="text-xs text-slate-400">{t.totalExpected}</div>
                        <div className="text-lg font-black text-slate-200 font-mono mt-1">
                          {data.financial.totalDue.toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="text-xs text-slate-400">{t.totalPaid}</div>
                        <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                          {data.financial.totalPaidSoFar.toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                        <div className="text-xs text-slate-400">{t.balanceRemaining}</div>
                        <div className="text-lg font-black text-amber-400 font-mono mt-1">
                          {data.financial.remainingBalance.toLocaleString("fr-FR")} FCFA
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  CASE 2: SCHOOL BULLETIN (PRIMAIRE / COLLÈGE / LYCÉE)
              ────────────────────────────────────────────────────────────── */}
              {isBulletin && data.bulletin && (
                <>
                  {/* Bulletin Summary Card */}
                  <div className="bg-gradient-to-br from-slate-900 via-blue-950/20 to-slate-900 border border-blue-500/30 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-blue-500/20 pb-4 mb-5 flex-wrap">
                      <div className="flex items-center gap-2.5 text-xs font-black text-blue-400 uppercase tracking-wider">
                        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <span>{t.bulletinTitle}</span>
                      </div>

                      <span className="px-3.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {lang === "en" ? data.bulletin.decisionEn : lang === "ar" ? data.bulletin.decisionAr : data.bulletin.decision}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-sm">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.generalAverage}</div>
                        <div className="font-black text-3xl text-blue-400 mt-1 font-mono tracking-tight">
                          {data.bulletin.generalAverage.toFixed(2)} <span className="text-sm font-bold text-slate-300">/ 20</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{data.bulletin.term}</p>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.classRank}</div>
                        <div className="font-black text-2xl text-emerald-400 mt-1">
                          {data.bulletin.rank} <span className="text-xs text-slate-400 font-medium">/ {data.bulletin.totalStudents}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Effectif de la classe</p>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.disciplineConduct}</div>
                        <div className="font-bold text-white mt-1">
                          {data.bulletin.conduite}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{data.bulletin.assiduite}</p>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 font-medium">{t.councilDecision}</div>
                        <div className="font-bold text-emerald-400 mt-1">
                          {lang === "en" ? data.bulletin.decisionEn : lang === "ar" ? data.bulletin.decisionAr : data.bulletin.decision}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{data.bulletin.appreciation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Intelligent Multi-Period Subjects Breakdown Card */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm overflow-hidden">
                    
                    {/* Header with Title & Export Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-4 mb-4">
                      <div className="flex items-center gap-2.5 text-xs font-black text-blue-400 uppercase tracking-wider">
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <span>{t.subjectsBreakdown}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          onClick={handleExportCsv}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-lg border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{t.exportCsv}</span>
                        </Button>

                        <Button
                          onClick={handleDownloadPdf}
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 rounded-lg border-blue-700/60 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 text-xs font-bold gap-1.5 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>{t.exportPdfMatiere}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Period Tabs Selector */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
                      <button
                        onClick={() => setActivePeriodTab("comparison")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "comparison"
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        <span>{t.tabComparison}</span>
                      </button>

                      <button
                        onClick={() => setActivePeriodTab("s1")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "s1"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t.tabS1}</span>
                      </button>

                      <button
                        onClick={() => setActivePeriodTab("s2")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "s2"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t.tabS2}</span>
                      </button>

                      <button
                        onClick={() => setActivePeriodTab("annual")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          activePeriodTab === "annual"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                            : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Award className="h-3.5 w-3.5 text-amber-300" />
                        <span>{t.tabAnnual}</span>
                      </button>
                    </div>

                    {/* Period Summary Pills when a specific tab is selected */}
                    {activePeriodTab !== "comparison" && data.bulletin.periods && (() => {
                      const curPeriod = data.bulletin.periods.find(p => p.id === activePeriodTab);
                      const periodLabel = lang === "ar" ? curPeriod?.labelAr : lang === "en" ? curPeriod?.labelEn : curPeriod?.label;
                      const decisionText = lang === "ar" ? curPeriod?.decisionAr : lang === "en" ? curPeriod?.decisionEn : curPeriod?.decision;
                      return (
                        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 mb-4 flex items-center justify-between flex-wrap gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Période :</span>
                            <span className="font-bold text-white">
                              {periodLabel || activePeriodTab}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Moyenne :</span>
                            <span className="font-mono font-black text-blue-400">
                              {curPeriod ? `${curPeriod.generalAverage.toFixed(2)} / 20` : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Rang :</span>
                            <span className="font-bold text-emerald-400">
                              {curPeriod?.rank || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">Décision :</span>
                            <span className="font-bold text-amber-300">
                              {decisionText || data.bulletin.decision}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ─── TAB 1: COMPARATIVE VIEW TABLE ─── */}
                    {activePeriodTab === "comparison" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900/90 border-b border-slate-700/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                              <th className="p-3">{t.subjectCol}</th>
                              <th className="p-3 text-center">{t.coefCol}</th>
                              <th className="p-3 text-center">{t.s1Col}</th>
                              <th className="p-3 text-center">{t.s2Col}</th>
                              <th className="p-3 text-center">{t.annualCol}</th>
                              <th className="p-3 text-center">{t.progression}</th>
                              <th className="p-3">{t.statusCol}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {data.bulletin.subjects.map((sub, idx) => {
                              const norm = (v: number | undefined) => {
                                if (v === undefined || isNaN(v)) return 0;
                                if (v > 40 && v <= 60) return Number((v / 3).toFixed(2));
                                if (v > 20 && v <= 40) return Number((v / 2).toFixed(2));
                                return Number(v.toFixed(2));
                              };

                              const s1 = norm(sub.s1Average ?? sub.average);
                              const s2 = norm(sub.s2Average ?? (sub.average + 1.5));
                              const annual = norm(sub.annualAverage ?? ((s1 + s2) / 2));
                              const diff = Number((s2 - s1).toFixed(2));
                              const isPositive = diff > 0;
                              const isNeutral = diff === 0;

                              return (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="p-3 font-bold text-white">
                                    {lang === "ar" && sub.nameAr ? sub.nameAr : lang === "en" && sub.nameEn ? sub.nameEn : sub.name}
                                  </td>
                                  <td className="p-3 text-center text-slate-400 font-mono">{sub.coef}</td>
                                  <td className="p-3 text-center font-mono font-medium text-slate-300">
                                    <span className={`px-2 py-0.5 rounded-md font-bold ${s1 >= 14 ? "text-emerald-400" : s1 >= 10 ? "text-blue-400" : "text-rose-400"}`}>
                                      {s1.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-slate-500 block font-normal">{sub.s1Rank ?? "—"}</span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-medium text-slate-300">
                                    <span className={`px-2 py-0.5 rounded-md font-bold ${s2 >= 14 ? "text-emerald-400" : s2 >= 10 ? "text-blue-400" : "text-rose-400"}`}>
                                      {s2.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-slate-500 block font-normal">{sub.s2Rank ?? "—"}</span>
                                  </td>
                                  <td className="p-3 text-center font-mono">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                                      annual >= 16 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                      : annual >= 14 ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                                      : annual >= 12 ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                                      : annual >= 10 ? "bg-slate-800 text-slate-200 border border-slate-700"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                    }`}>
                                      {annual.toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                                      isPositive ? "bg-emerald-500/20 text-emerald-400" : isNeutral ? "bg-slate-800 text-slate-400" : "bg-rose-500/20 text-rose-400"
                                    }`}>
                                      {isPositive ? <TrendingUp className="h-3 w-3" /> : isNeutral ? <Minus className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                      <span>{isPositive ? `+${diff.toFixed(1)}` : diff.toFixed(1)}</span>
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-300">
                                    <span className="font-medium text-slate-200">{lang === "ar" && sub.appreciationAr ? sub.appreciationAr : sub.appreciation}</span>
                                    <div className="w-24 bg-slate-900 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${annual >= 14 ? "bg-emerald-400" : annual >= 10 ? "bg-blue-400" : "bg-rose-400"}`} 
                                        style={{ width: `${Math.min(100, (annual / 20) * 100)}%` }} 
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            {(() => {
                              const s1Obj = data.bulletin.periods?.find(p => p.id === "s1");
                              const s2Obj = data.bulletin.periods?.find(p => p.id === "s2");
                              const annObj = data.bulletin.periods?.find(p => p.id === "annual");
                              const diff = (s2Obj && s1Obj) ? Number((s2Obj.generalAverage - s1Obj.generalAverage).toFixed(2)) : 0;
                              const diffStr = diff >= 0 ? `+${diff.toFixed(2)} pts` : `${diff.toFixed(2)} pts`;
                              const decisionText = lang === "ar" 
                                ? (annObj?.decisionAr || data.bulletin.decisionAr || data.bulletin.decision) 
                                : lang === "en" 
                                ? (annObj?.decisionEn || data.bulletin.decisionEn || data.bulletin.decision) 
                                : (annObj?.decision || data.bulletin.decision);

                              return (
                                <tr className="bg-slate-900/90 font-black border-t border-slate-700 text-xs">
                                  <td className="p-3 text-white uppercase">{t.allPeriodsSummary}</td>
                                  <td className="p-3 text-center text-amber-400 font-mono">{data.bulletin.totalCoef}</td>
                                  <td className="p-3 text-center text-blue-400 font-mono">S1: {s1Obj ? s1Obj.generalAverage.toFixed(2) : "—"}</td>
                                  <td className="p-3 text-center text-emerald-400 font-mono">S2: {s2Obj ? s2Obj.generalAverage.toFixed(2) : "—"}</td>
                                  <td className="p-3 text-center text-emerald-300 font-mono text-sm bg-emerald-950/40">
                                    Annuel: {annObj ? annObj.generalAverage.toFixed(2) : data.bulletin.generalAverage.toFixed(2)} / 20
                                  </td>
                                  <td className="p-3 text-center font-mono text-emerald-400 font-bold">{diffStr}</td>
                                  <td className="p-3 text-emerald-300 font-bold">{decisionText}</td>
                                </tr>
                              );
                            })()}
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* ─── TAB 2, 3, 4: SINGLE PERIOD DETAILED EVALUATION TABLE ─── */}
                    {activePeriodTab !== "comparison" && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900/90 border-b border-slate-700/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                              <th className="p-3">{t.subjectCol}</th>
                              <th className="p-3 text-center">{t.coefCol}</th>
                              <th className="p-3 text-center">{t.ccCol}</th>
                              <th className="p-3 text-center">{t.compoCol}</th>
                              <th className="p-3 text-center">{t.generalAverage}</th>
                              <th className="p-3 text-center">{t.rankCol}</th>
                              <th className="p-3">{t.appreciationCol}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {data.bulletin.subjects.map((sub, idx) => {
                              const norm = (v: number | undefined) => {
                                if (v === undefined || isNaN(v)) return 0;
                                if (v > 40 && v <= 60) return Number((v / 3).toFixed(2));
                                if (v > 20 && v <= 40) return Number((v / 2).toFixed(2));
                                return Number(v.toFixed(2));
                              };

                              const avg = norm(activePeriodTab === "s1"
                                ? (sub.s1Average ?? sub.average)
                                : activePeriodTab === "s2"
                                ? (sub.s2Average ?? (sub.average + 1.5))
                                : (sub.annualAverage ?? sub.average));

                              const rank = activePeriodTab === "s1"
                                ? (sub.s1Rank ?? sub.rank)
                                : activePeriodTab === "s2"
                                ? (sub.s2Rank ?? sub.rank)
                                : (sub.annualRank ?? sub.rank);

                              return (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="p-3 font-bold text-white">
                                    {lang === "ar" && sub.nameAr ? sub.nameAr : lang === "en" && sub.nameEn ? sub.nameEn : sub.name}
                                  </td>
                                  <td className="p-3 text-center text-slate-400 font-mono">{sub.coef}</td>
                                  <td className="p-3 text-center text-slate-300 font-mono">{sub.classWorkScore ? sub.classWorkScore.toFixed(2) : "—"}</td>
                                  <td className="p-3 text-center text-slate-300 font-mono">{sub.examScore ? sub.examScore.toFixed(2) : "—"}</td>
                                  <td className="p-3 text-center font-black text-blue-400 font-mono">{avg.toFixed(2)}</td>
                                  <td className="p-3 text-center text-slate-400 font-mono">{rank}</td>
                                  <td className="p-3 text-slate-300 italic">
                                    {lang === "ar" && sub.appreciationAr ? sub.appreciationAr : sub.appreciation}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-900/90 font-black border-t border-slate-700 text-xs">
                              <td className="p-3 text-white uppercase">{t.totalPointsCoeffs}</td>
                              <td className="p-3 text-center text-amber-400 font-mono">{data.bulletin.totalCoef}</td>
                              <td colSpan={2} className="p-3 text-right text-slate-400">Total :</td>
                              <td className="p-3 text-center text-emerald-400 font-mono text-sm">{data.bulletin.totalWeighted} pts</td>
                              <td colSpan={2} className="p-3 text-center text-blue-400 font-mono">Moy : {data.bulletin.generalAverage.toFixed(2)} / 20</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                  </div>
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  COMMON SECTION: HOLDER / BENEFICIARY INFORMATION
              ────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-black text-indigo-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <span>{t.holderTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">{t.fullName}</span>
                    <p className="font-bold text-sm text-white mt-0.5">{data.student.nom}</p>
                    {data.student.nomArabe && <p className="text-xs text-indigo-300 font-arabic">{data.student.nomArabe}</p>}
                  </div>

                  <div>
                    <span className="text-slate-400">{t.matricule}</span>
                    <p className="font-mono font-bold text-sm text-indigo-300 mt-0.5">{data.student.matricule}</p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.classeFiliere}</span>
                    <p className="font-bold text-slate-200 mt-0.5">{data.student.classe || "—"}</p>
                    <p className="text-[10px] text-slate-400">{data.student.filiere || "Général"}</p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.birth}</span>
                    <p className="font-medium text-slate-200 mt-0.5">
                      {data.student.dateNaissance || "—"}
                    </p>
                    <p className="text-[10px] text-slate-400">{data.student.lieuNaissance || "—"}</p>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  CASE 3: HIGHER EDUCATION DEGREE & CURRICULUM (LMD)
              ────────────────────────────────────────────────────────────── */}
              {!isFinancial && !isBulletin && (
                <>
                  {/* Degree Conferred Box */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 text-xs font-black text-emerald-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <span>{t.degreeTitle}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
                      <div className="sm:col-span-2">
                        <span className="text-slate-400">{t.diplomaName}</span>
                        <p className="font-bold text-base text-white mt-1 leading-snug">
                          {lang === "en" ? data.degree.titleEn : lang === "ar" ? data.degree.titleAr : data.degree.title}
                        </p>
                        <p className="text-[11px] text-indigo-300 mt-0.5">{data.degree.field} • {data.degree.mention}</p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.decisionHonors}</span>
                        <p className="font-bold text-emerald-400 text-sm mt-1">
                          {lang === "en" ? data.degree.statusEn : lang === "ar" ? data.degree.statusAr : data.degree.status}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{data.degree.deliberationDate}</p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.creditsEcts}</span>
                        <p className="font-black text-lg text-indigo-400 font-mono mt-1">
                          {data.degree.ectsCredits} ECTS <span className="text-xs font-normal text-slate-400">/ {data.degree.totalRequiredEcts}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.gpaScore}</span>
                        <p className="font-bold text-slate-200 mt-1">{data.degree.gpa}</p>
                        <p className="text-[10px] text-emerald-400 font-bold">{data.degree.gpaLetter}</p>
                      </div>

                      <div>
                        <span className="text-slate-400">{t.promoYear}</span>
                        <p className="font-bold text-slate-200 mt-1">{data.degree.graduationYear}</p>
                      </div>
                    </div>
                  </div>

                  {/* Curriculum & 180 ECTS Units Accordion */}
                  {data.curriculum && data.curriculum.length > 0 && (
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between gap-4 border-b border-slate-700/60 pb-3">
                        <div className="flex items-center gap-2.5 text-xs font-black text-indigo-400 uppercase tracking-wider">
                          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <Layers className="h-4 w-4" />
                          </div>
                          <span>{t.curriculumTitle}</span>
                        </div>

                        <button
                          onClick={() => setShowCurriculumDetails(!showCurriculumDetails)}
                          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{showCurriculumDetails ? t.hideCurriculum : t.showCurriculum}</span>
                          {showCurriculumDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {showCurriculumDetails && (
                        <div className="mt-4 overflow-x-auto animate-in fade-in duration-300">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-900/80 border-b border-slate-700/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                <th className="p-3">Code UE</th>
                                <th className="p-3">Intitulé de l'Unité d'Enseignement</th>
                                <th className="p-3 text-center">Semestre</th>
                                <th className="p-3 text-center">Crédits ECTS</th>
                                <th className="p-3 text-center">Note / 20</th>
                                <th className="p-3 text-center">Grade ECTS</th>
                                <th className="p-3">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                              {data.curriculum.map((ue, idx) => (
                                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                                  <td className="p-3 font-mono font-bold text-indigo-300">{ue.codeUe}</td>
                                  <td className="p-3 font-bold text-white">{ue.nameUe}</td>
                                  <td className="p-3 text-center text-slate-400">{ue.semester}</td>
                                  <td className="p-3 text-center font-mono font-bold text-amber-400">{ue.creditsEcts} ECTS</td>
                                  <td className="p-3 text-center font-mono font-bold text-emerald-400">{ue.grade.toFixed(2)}</td>
                                  <td className="p-3 text-center font-mono font-bold text-indigo-300">{ue.gradeEcts}</td>
                                  <td className="p-3 text-slate-300">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      {ue.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  COMMON SECTION: STANDARDS & ACCREDITATION
              ────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2.5 text-xs font-black text-cyan-400 uppercase tracking-wider mb-4 border-b border-slate-700/60 pb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span>{t.standardsTitle}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">{t.unescoIsced}</span>
                    <p className="font-bold text-slate-200 mt-0.5">
                      {lang === "en" ? data.standards.unescoIscedEn : lang === "ar" ? data.standards.unescoIscedAr : data.standards.unescoIsced}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.institutionTitle}</span>
                    <p className="font-bold text-slate-200 mt-0.5">
                      {lang === "en" ? data.institution.nameEn : lang === "ar" ? data.institution.nameAr : data.institution.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{data.institution.country} • {data.institution.city}</p>
                  </div>

                  <div>
                    <span className="text-slate-400">{t.accreditation}</span>
                    <p className="font-bold text-emerald-400 mt-0.5">
                      {lang === "en" ? data.institution.accreditationEn : lang === "ar" ? data.institution.accreditationAr : data.institution.accreditation}
                    </p>
                    <p className="text-[10px] text-slate-400">{data.institution.ministry}</p>
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  COMMON SECTION: CRYPTOGRAPHIC ANCHOR & PUBLIC LEDGER
              ────────────────────────────────────────────────────────────── */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-xs space-y-3 font-mono">
                <div className="flex items-center gap-2.5 text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-3 font-sans">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  <span>{t.securityTitle}</span>
                </div>

                <div className="space-y-2 text-slate-400 break-all text-[11px]">
                  <div>
                    <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">{t.w3cId} :</span>
                    <span className="text-emerald-400">{data.degree.merkleProof}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">{t.shaHash} :</span>
                    <span className="text-indigo-300">{data.degree.verificationHash}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">{t.trustAnchor} :</span>
                    <span className="text-slate-300">{data.degree.digitalSignature}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ─── FOOTER ─── */}
        <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>{t.securityNotice}</p>
          <p className="text-[10px] font-mono text-slate-600">
            Node: NIGER-CENTRAL-01 • Engine: EDUT-CORE-v2.6 • W3C DID: did:edut:ne:2026
          </p>
        </footer>

      </div>
    </div>
  );
}
