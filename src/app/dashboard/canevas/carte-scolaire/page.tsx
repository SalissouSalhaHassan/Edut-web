"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Compass,
  Layers,
  Sparkles,
  MapPin,
  Download,
  Share2,
  ShieldAlert,
  Droplets,
  Zap,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sun,
  Moon,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SchoolGisMap, { GisSchoolPoint } from "@/components/gis/SchoolGisMap";
import { localDb } from "@/infrastructure/local-db/dexie";
import { toast } from "sonner";

export default function CarteScolairePage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [schools, setSchools] = useState<GisSchoolPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync dark mode preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("edut_theme") || localStorage.getItem("edut_canevas_dark_mode");
      if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDarkMode(true);
      }
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("edut_canevas_dark_mode", String(next));
        localStorage.setItem("edut_theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  };

  // Load schools from IndexedDB or defaults
  useEffect(() => {
    async function loadSchools() {
      try {
        const local = await localDb.canevasDeclarations.toArray();
        if (local && local.length > 0) {
          const mapped: GisSchoolPoint[] = local.map((s, idx) => ({
            code: s.code,
            name: s.name,
            type: s.type || "Public",
            cycle: s.cycle || "Primaire",
            region: s.region || "Niamey",
            commune: s.commune || "Niamey I",
            quartier: s.quartier || "Centre",
            eleves: s.eleves || 300,
            filles: s.filles || Math.floor((s.eleves || 300) / 2),
            garcons: s.garcons || Math.ceil((s.eleves || 300) / 2),
            enseignants: s.enseignants || 12,
            salles: s.salles || 8,
            eau: s.eau,
            electricite: s.electricite,
            statut: s.statut || "Validé",
            completion: s.completion || 85,
            lat: 13.51 + (idx * 0.015) % 0.1,
            lng: 2.11 + (idx * 0.02) % 0.1,
            phone: "+227 90 00 00 00",
          }));
          setSchools(mapped);
        }
      } catch (err) {
        console.warn("Could not load local schools for GIS map:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchools();
  }, []);

  return (
    <div className={cn("min-h-screen p-4 md:p-8 space-y-6 transition-colors duration-300", isDarkMode ? "dark bg-[#08090e] text-slate-100" : "bg-slate-50 text-slate-900")}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/canevas/etablissements"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12151f] text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Carte Scolaire SIG / GIS
              </h1>
              <span className="rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Géo-Référencement
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Système d'Information Géographique du Ministère de l'Éducation Nationale
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
            href="/dashboard/canevas/early-warning"
            className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-orange-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <Sparkles size={16} />
            <span>IA & Décrochage</span>
          </Link>

          <Link
            href="/dashboard/messaging/whatsapp-hub"
            className="flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition"
          >
            <MessageSquare size={16} />
            <span>Hub WhatsApp</span>
          </Link>
        </div>
      </div>

      {/* Main Interactive GIS Component */}
      <SchoolGisMap
        schools={schools.length > 0 ? schools : undefined}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
