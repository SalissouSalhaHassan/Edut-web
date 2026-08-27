"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, GraduationCap, ArrowRight, Sparkles, Globe, Lock } from "lucide-react";
import Link from "next/link";

type Language = "fr" | "en" | "ar";

const SEARCH_DICT = {
  fr: {
    brand: "EDUT UNIVERSITÉ • PORTAIL PUBLIC DE VÉRIFICATION",
    badge: "AUTHENTIFICATION OFFICIELLE & ANCRAGE CRYPTOGRAPHIQUE",
    title: "Vérification Internationale de Titres & Diplômes",
    desc: "Entrez le numéro matricule de l'étudiant (INE) ou la référence du certificat pour vérifier instantanément son authenticité dans le registre public académique.",
    placeholder: "Ex: EDUT-2024-000345 ou 345",
    btnSubmit: "Vérifier le Document",
    standards: "Système conforme UNESCO CITE 2011 • Processus de Bologne (ECTS) • CAMES • REESAO",
  },
  en: {
    brand: "EDUT UNIVERSITY • PUBLIC ACADEMIC VERIFICATION PORTAL",
    badge: "OFFICIAL AUTHENTICATION & CRYPTOGRAPHIC ANCHORING",
    title: "International Degree & Academic Verification",
    desc: "Enter the student ID (INE) or certificate reference to instantly verify its authenticity against the official public academic records.",
    placeholder: "Ex: EDUT-2024-000345 or 345",
    btnSubmit: "Verify Document",
    standards: "Compliant with UNESCO ISCED 2011 • European Bologna Process (ECTS) • CAMES • WES Ready",
  },
  ar: {
    brand: "جامعة EDUT • البوابة العامة للتحقق والمصادقة الأكاديمية",
    badge: "مصادقة رسمية معتمدة وتوثيق مشفر",
    title: "التحقق الدولي من صحة الشهادات والمؤهلات الأكاديمية",
    desc: "أدخل رقم التسجيل الأكاديمي للطالب (INE) أو المرجع التعريفي للتأكد الفوري من صحة وموثوقية الوثيقة في السجل الجامعي الرسمي.",
    placeholder: "مثال: EDUT-2024-000345 أو 345",
    btnSubmit: "التحقق من الوثيقة",
    standards: "نظام متوافق مع معايير اليونسكو ISCED 2011 • نظام بولونيا الأوروبي (ECTS) • هيئات CAMES و REESAO",
  },
};

export default function VerifyIndexPage() {
  const [identifier, setIdentifier] = useState("");
  const [lang, setLang] = useState<Language>("fr");
  const router = useRouter();

  const t = SEARCH_DICT[lang];
  const isRtl = lang === "ar";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    router.push(`/verify/${encodeURIComponent(identifier.trim())}`);
  };

  return (
    <div 
      dir={isRtl ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 selection:bg-indigo-500 selection:text-white"
    >
      {/* Language Switcher */}
      <div className="w-full max-w-xl flex items-center justify-end mb-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            onClick={() => setLang("fr")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              lang === "fr" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🇫🇷 FR
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              lang === "en" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🇬🇧 EN
          </button>
          <button
            onClick={() => setLang("ar")}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              lang === "ar" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🇸🇦 AR
          </button>
        </div>
      </div>

      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden text-center">
        {/* Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-2.5 bg-gradient-to-r from-emerald-500 via-teal-400 via-indigo-500 to-amber-500 rounded-full blur-xs" />

        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
          <ShieldCheck className="h-9 w-9" />
        </div>

        <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-3 inline-block">
          {t.badge}
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          {t.title}
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
          {t.desc}
        </p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={t.placeholder}
              className={`w-full h-12 ${isRtl ? "pr-11 pl-4" : "pl-11 pr-4"} rounded-2xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-inner`}
            />
            <Search className={`absolute ${isRtl ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400`} />
          </div>

          <button
            type="submit"
            disabled={!identifier.trim()}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
          >
            <span>{t.btnSubmit}</span>
            <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <GraduationCap className="h-4 w-4 text-indigo-400 flex-shrink-0" />
          <span>{t.standards}</span>
        </div>
      </div>
    </div>
  );
}
