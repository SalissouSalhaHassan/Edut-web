"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
  Send,
  Sun,
  Moon,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WhatsAppAutomationHub from "@/components/messaging/WhatsAppAutomationHub";

export default function WhatsAppHubPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("edut_theme");
      if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("edut_theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  return (
    <div className={cn("min-h-screen p-4 md:p-8 space-y-6 transition-colors duration-300", isDarkMode ? "dark bg-[#08090e] text-slate-100" : "bg-slate-50 text-slate-900")}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/messaging"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12151f] text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Centre d'Automatisation WhatsApp & SMS
              </h1>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Official Broadcast
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Diffusion instantanée et sécurisée vers les parents d'élèves, les enseignants et les directions
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12151f] px-4 text-xs font-black text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-500" />}
            <span>{isDarkMode ? "Clair" : "Sombre"}</span>
          </button>

          <Link
            href="/dashboard/canevas/carte-scolaire"
            className="flex h-11 items-center gap-2 rounded-2xl border border-teal-500/30 bg-teal-950/20 px-4 text-xs font-black uppercase tracking-wider text-teal-400 shadow-sm hover:bg-teal-900/30 transition"
          >
            <Compass size={16} />
            <span>Carte SIG</span>
          </Link>

          <Link
            href="/dashboard/canevas/early-warning"
            className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-orange-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <Sparkles size={16} />
            <span>IA & Décrochage</span>
          </Link>
        </div>
      </div>

      {/* Main WhatsApp Hub Component */}
      <WhatsAppAutomationHub isDarkMode={isDarkMode} />
    </div>
  );
}
