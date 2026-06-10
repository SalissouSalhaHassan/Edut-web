"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const GraduationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const CloudIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const HeadphonesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);
const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const ShieldBigIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" className="w-4 h-4">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const SchoolIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const BarChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
  </svg>
);
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#0f1117] text-gray-900 dark:text-white transition-colors duration-300 font-sans">

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-[#161b27] border-b border-gray-200 dark:border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <GraduationIcon />
              <span className="sr-only">Édut Pro</span>
            </div>
            <div>
              <p className="font-bold text-[15px] leading-tight text-gray-900 dark:text-white">Édut Pro</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Gestion Scolaire Intelligente</p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-7">
            {["Fonctionnalités", "À propos", "Tarifs", "Contact"].map(l => (
              <a key={l} href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                {l}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDark(d => !d)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <Link
              href="/login"
              className="text-sm font-semibold px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shadow-blue-300"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
        {/* Dot grid decoration top-right */}
        <div className="absolute right-0 top-8 hidden lg:block opacity-40 dark:opacity-20">
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-300 dark:bg-blue-700" />
            ))}
          </div>
        </div>

        {/* Left column */}
        <div className="space-y-6 z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-100 dark:border-blue-800">
            <CheckIcon />
            Solution complète pour les établissements scolaires
          </div>

          {/* Headline */}
          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white leading-[1.15] tracking-tight">
            Système de gestion scolaire{" "}
            <span className="text-blue-600 dark:text-blue-400">intelligent et complet</span>
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed max-w-md">
            Édut Pro simplifie la gestion de votre établissement scolaire.
            Gagnez du temps, améliorez la communication et concentrez-vous
            sur l'essentiel : la réussite de vos élèves.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/register-school"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-200 dark:shadow-blue-900 transition-all hover:-translate-y-0.5"
            >
              <LockIcon />
              Découvrir Édut Pro
            </Link>
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 font-semibold text-sm transition-all hover:-translate-y-0.5">
              <PlayIcon />
              Voir la démonstration
            </button>
          </div>

          {/* Mini badges */}
          <div className="flex flex-wrap gap-6 pt-2">
            {[
              { icon: <ShieldIcon />, label: "Sécurisé", sub: "Données protégées" },
              { icon: <CloudIcon />, label: "Sauvegarde", sub: "Automatique" },
              { icon: <HeadphonesIcon />, label: "Support 24/7", sub: "Assistance dédiée" },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2">
                <div className="text-blue-500 dark:text-blue-400">{b.icon}</div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{b.label}</p>
                  <p className="text-[10px] text-gray-400">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — hero image + floating card */}
        <div className="relative z-10">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white dark:border-white/10">
            <Image
              src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=1000&auto=format&fit=crop"
              alt="School library books"
              width={560}
              height={380}
              className="w-full h-72 lg:h-96 object-cover"
              priority
            />
          </div>

          {/* Floating stats card */}
          <div className="absolute -bottom-6 right-6 bg-white dark:bg-[#1e2535] rounded-2xl shadow-xl p-4 flex items-center gap-3 min-w-[190px] border border-gray-100 dark:border-white/10">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <SchoolIcon />
            </div>
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">Des établissements<br/>nous font confiance</p>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-white">120+</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} />
                ))}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">4.8/5</span>
              </div>
            </div>
          </div>

          {/* Circle decoration */}
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-gray-200 dark:border-white/10 hidden lg:block" />
        </div>
      </section>

      {/* ── STATS BAR ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 mt-14 mb-16">
        <div className="bg-white dark:bg-[#161b27] rounded-2xl shadow-sm border border-gray-100 dark:border-white/10 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100 dark:divide-white/10">
          {[
            { icon: <UsersIcon />, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", label: "Élèves", value: "12 540+", sub: "Inscrits" },
            { icon: <GraduationIcon />, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20", label: "Enseignants", value: "850+", sub: "Actifs" },
            { icon: <SchoolIcon />, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", label: "Établissements", value: "120+", sub: "Partenaires" },
            { icon: <BarChartIcon />, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", label: "Taux de satisfaction", value: "98%", sub: "de satisfaction" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 px-6 py-5">
              <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center ${s.color} shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">{s.label}</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">{s.value}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pourquoi choisir Édut Pro&nbsp;?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Une plateforme conçue pour répondre à tous les besoins de votre établissement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: <MonitorIcon />,
              color: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-600",
              label: "Gestion Centralisée",
              desc: "Gérez tous les aspects de votre établissement depuis une seule plateforme intuitive.",
            },
            {
              icon: <UsersIcon />,
              color: "text-green-600 dark:text-green-400",
              bg: "bg-green-500",
              label: "Communication Fluide",
              desc: "Facilitez les échanges entre enseignants, élèves et parents en temps réel.",
            },
            {
              icon: <ShieldBigIcon />,
              color: "text-purple-600 dark:text-purple-400",
              bg: "bg-purple-600",
              label: "Sécurité Avancée",
              desc: "Vos données sont protégées avec les meilleures normes de sécurité.",
            },
          ].map(f => (
            <div
              key={f.label}
              className="bg-white dark:bg-[#161b27] rounded-2xl border border-gray-100 dark:border-white/10 p-6 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center text-white shrink-0 shadow-md`}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{f.label}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#161b27] border-t border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + copyright */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <GraduationIcon />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">Édut Pro</p>
              <p className="text-[10px] text-gray-400">© 2024 Édut Pro. Tous droits réservés.</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap items-center gap-5">
            {["Fonctionnalités", "À propos", "Tarifs", "Contact", "Aide", "Confidentialité"].map(l => (
              <a key={l} href="#" className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {l}
              </a>
            ))}
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3">
            {[
              { icon: <FacebookIcon />, label: "Facebook" },
              { icon: <TwitterIcon />, label: "Twitter" },
              { icon: <LinkedInIcon />, label: "LinkedIn" },
              { icon: <YoutubeIcon />, label: "YouTube" },
            ].map(s => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
