"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  AlertCircle,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart3,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getUnifiedFinancialReport } from "@/domains/finance/actions/finance.actions";

interface UnifiedReportProps {
  schoolName?: string;
  activeSessionName?: string;
}

export function UnifiedFinancialReportView({
  schoolName = "Établissement",
  activeSessionName = "2025–2026",
}: UnifiedReportProps) {
  const [period, setPeriod] = useState<"daily" | "monthly" | "yearly" | "all">("monthly");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await getUnifiedFinancialReport({
        period,
        selectedDate,
      });
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err: any) {
      toast.error("Erreur lors de la génération du rapport financier unifié.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedDate]);

  const summary = reportData?.summary || {
    totalRevenueCollected: 0,
    totalExpensesSpent: 0,
    netCashFlow: 0,
    totalExpectedGlobal: 0,
    totalRemainingDebts: 0,
    expenseRatio: 0,
  };

  const breakdowns = reportData?.breakdowns || {
    expensesByCategory: [],
    paymentsByMode: [],
  };

  const formatCfa = (amount: number) => {
    return `${Math.round(amount || 0).toLocaleString("fr-FR")} CFA`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Export to Print / PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & PERIOD SELECTOR ── */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Scale className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Rapport Financier Unifié (Recettes vs Dépenses)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Bilan consolidé : Frais de scolarité perçus, Charges décaissées et Solde net de trésorerie.
          </p>
        </div>

        {/* PERIOD TOGGLES */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setPeriod("daily")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "daily"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "monthly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "yearly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Année
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Global
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type={period === "yearly" ? "number" : period === "monthly" ? "month" : "date"}
              value={
                period === "yearly"
                  ? selectedDate.slice(0, 4)
                  : period === "monthly"
                  ? selectedDate.slice(0, 7)
                  : selectedDate
              }
              onChange={(e) => {
                const val = e.target.value;
                if (period === "yearly") setSelectedDate(`${val}-01-01`);
                else if (period === "monthly") setSelectedDate(`${val}-01`);
                else setSelectedDate(val);
              }}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              Imprimer / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ── 3 PILLARS KPI CARDS: PAYÉ vs CONSOMMÉ vs SOLDE & DETTES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recettes Collectées (Payé) */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Recettes Encaissées (المدفوع)
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
            {formatCfa(summary.totalRevenueCollected)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
            Frais scolaires perçus sur la période
          </p>
        </div>

        {/* Dépenses Consommées (المصروف والمستهلك) */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Charges & Dépenses (المستهلك)
            </span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
            {formatCfa(summary.totalExpensesSpent)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
            Ratio d'absorption : {summary.expenseRatio}% des recettes
          </p>
        </div>

        {/* Solde Net Disponible (فائض أو عجز الخزينة) */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Solde Net / Trésorerie (الصافي)
            </span>
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                summary.netCashFlow >= 0
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                  : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
              }`}
            >
              <Wallet size={20} />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight font-mono ${
              summary.netCashFlow >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600"
            }`}
          >
            {formatCfa(summary.netCashFlow)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
            {summary.netCashFlow >= 0 ? "Excédent de trésorerie net" : "Déficit budgétaire"}
          </p>
        </div>

        {/* Reste à Recouvrer / Créances élèves (المتبقيات) */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Créances & Reste à Payer (المتبقيات)
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Receipt size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight font-mono">
            {formatCfa(summary.totalRemainingDebts)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
            Total des impayés élèves en attente
          </p>
        </div>
      </div>

      {/* ── SECTION 2: BREAKDOWNS (PAR CATÉGORIE ET MODE DE PAIEMENT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dépenses par Catégorie */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-rose-500" />
            Répartition des Dépenses par Catégorie
          </h3>

          <div className="space-y-3">
            {breakdowns.expensesByCategory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Aucune dépense sur cette période.</p>
            ) : (
              breakdowns.expensesByCategory.map((cat: any) => {
                const percent =
                  summary.totalExpensesSpent > 0
                    ? Math.round((cat.amount / summary.totalExpensesSpent) * 100)
                    : 0;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{cat.category}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCfa(cat.amount)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recettes par Mode de Paiement */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Canaux d'Encaissement des Recettes
          </h3>

          <div className="space-y-3">
            {breakdowns.paymentsByMode.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Aucun encaissement sur cette période.</p>
            ) : (
              breakdowns.paymentsByMode.map((m: any) => {
                const percent =
                  summary.totalRevenueCollected > 0
                    ? Math.round((m.amount / summary.totalRevenueCollected) * 100)
                    : 0;
                return (
                  <div key={m.mode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{m.mode}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCfa(m.amount)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: RECENT FLUX JOURNAL (RECETTES ET CHARGES RÉCENTES) ── */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          Journal d'Activité Récent (Flux Financiers)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Derniers Encaissements */}
          <div>
            <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-2">
              Dernières Recettes Perçues
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              {(reportData?.transactions?.recentPayments || []).length === 0 ? (
                <p className="text-xs text-slate-400 p-4">Aucune recette enregistrée.</p>
              ) : (
                reportData?.transactions?.recentPayments.map((p: any) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{p.studentName}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.classe} • {p.mode} • {formatDateDisplay(p.date)}
                      </div>
                    </div>
                    <div className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                      +{formatCfa(p.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dernières Dépenses */}
          <div>
            <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 mb-2">
              Dernières Dépenses Consommées
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
              {(reportData?.transactions?.recentExpenses || []).length === 0 ? (
                <p className="text-xs text-slate-400 p-4">Aucune dépense enregistrée.</p>
              ) : (
                reportData?.transactions?.recentExpenses.map((e: any) => (
                  <div key={e.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{e.category}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {e.description || e.reference} • {formatDateDisplay(e.date)}
                      </div>
                    </div>
                    <div className="font-mono font-black text-rose-600 dark:text-rose-400">
                      -{formatCfa(e.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
