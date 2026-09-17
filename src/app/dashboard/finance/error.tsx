"use client";

import { useEffect } from "react";
import { ShieldAlert, RefreshCw, ArrowLeft, Banknote } from "lucide-react";
import Link from "next/link";

export default function FinanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[FinanceError] Unhandled finance module error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0A0C10] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-[#131622] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl max-w-lg w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <Banknote size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Gestion Financière
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
            Une interruption temporaire est survenue lors de l'affichage ou de la mise à jour des transactions financières. Vos données locales restent sécurisées.
          </p>
          {error?.message && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-left text-[11px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto border border-slate-200/60 dark:border-slate-800">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw size={15} />
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            Tableau de Bord
          </Link>
        </div>
      </div>
    </div>
  );
}
