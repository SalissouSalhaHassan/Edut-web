"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function VerifyIndexPage() {
  const [identifier, setIdentifier] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    router.push(`/verify/${encodeURIComponent(identifier.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden text-center">
        {/* Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full blur-xs" />

        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/10">
          <ShieldCheck className="h-9 w-9" />
        </div>

        <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 mb-3 inline-block">
          Authentification Officielle
        </span>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Vérification de Diplômes & Titres
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-md mx-auto">
          Entrez le numéro matricule de l'étudiant ou la référence du document pour vérifier son authenticité dans le registre universitaire officiel.
        </p>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ex: EDUT-2024-000341 ou 12"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          </div>

          <button
            type="submit"
            disabled={!identifier.trim()}
            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            <span>Vérifier le Document</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-center gap-2">
          <GraduationCap className="h-4 w-4 text-slate-400" />
          <span>Plateforme Universitaire LMD • Conforme CAMES / REESAO</span>
        </div>
      </div>
    </div>
  );
}
