"use client";

import * as React from "react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  History, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Smartphone,
  CreditCard,
  Building,
  HelpCircle,
  Banknote,
  LayoutDashboard,
  CreditCard as CardIcon,
  BarChart3,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PaymentDialog from "@/domains/finance/components/PaymentDialog";
import ReceiptPreviewDialog from "@/domains/finance/components/ReceiptPreviewDialog";
import FinanceDashboard from "@/domains/finance/components/FinanceDashboard";
import FinanceReports from "@/domains/finance/components/FinanceReports";
import UnpaidAlerts from "@/domains/finance/components/UnpaidAlerts";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteStudentFee } from "@/domains/finance/actions/finance.actions";
import { toast } from "sonner";
import { localDb } from "@/infrastructure/local-db/dexie";

// --- Types ---
interface FinanceClientProps {
  fees: any[];
  stats: any;
  classes: any[];
  advancedStats: any | null;
  headerConfig?: any | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

type TabId = "dashboard" | "payments" | "reports" | "alerts";

const TABS: { id: TabId; label: string; icon: React.ElementType; badge?: (s: any) => number | null }[] = [
  { id: "dashboard", label: "Tableau de Bord", icon: LayoutDashboard },
  { id: "payments", label: "Paiements", icon: CardIcon },
  { id: "reports", label: "Rapports", icon: BarChart3 },
  { id: "alerts", label: "Alertes Impayées", icon: AlertTriangle, badge: (s) => s?.countUnpaid + s?.countPartial || null },
];

const getModeIcon = (mode: string) => {
  switch (mode) {
    case "Espèces": return <Banknote size={14} />;
    case "Mobile Money": return <Smartphone size={14} />;
    case "Virement": return <Building size={14} />;
    case "Carte Bancaire": return <CreditCard size={14} />;
    default: return <HelpCircle size={14} />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Soldé":
    case "Payé":
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Payé</span>
        </div>
      );
    case "Partiel":
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">Partiel</span>
        </div>
      );
    case "En retard":
    case "Impayé":
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">En Retard</span>
        </div>
      );
    default:
      return null;
  }
};

export default function FinanceClient({ fees, stats, classes, advancedStats, headerConfig, canEdit = true, canDelete = true }: FinanceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = React.useState<TabId>("dashboard");
  const [search, setSearch] = React.useState(searchParams.get("search") || "");
  const [selectedClass, setSelectedClass] = React.useState(searchParams.get("class") || "Toutes");
  const [selectedStatus, setSelectedStatus] = React.useState(searchParams.get("status") || "Tous");
  const [isMounted, setIsMounted] = React.useState(false);
  const [previewFee, setPreviewFee] = React.useState<any>(null);

  const [localFees, setLocalFees] = React.useState<any[]>(fees);
  const [isLocal, setIsLocal] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    async function loadData() {
      if (navigator.onLine && fees && fees.length > 0) {
        try {
          const { cacheStudentFees } = await import("@/infrastructure/local-db/cache");
          await cacheStudentFees(fees);
        } catch (e) {
          console.warn("Failed to update studentFees local cache:", e);
        }
      }

      let baseFees = fees;
      let isUsingLocal = false;

      if (!fees || fees.length === 0 || !navigator.onLine) {
        try {
          const { getCachedStudentFees } = await import("@/infrastructure/local-db/cache");
          const cached = await getCachedStudentFees();
          if (cached && cached.length > 0) {
            baseFees = cached;
            isUsingLocal = true;
          }
        } catch (e) {
          console.warn("Failed to read cached studentFees:", e);
        }
      }

      try {
        const outboxItems = await localDb.outbox
          .where("targetTable")
          .equals("feePayments")
          .toArray();

        const unsyncedPayments = outboxItems.filter(
          (item) => item.status !== "synced" && item.status !== "cancelled"
        );

        if (unsyncedPayments.length > 0 && baseFees?.length > 0) {
          const updatedFees = baseFees.map((fee: any) => {
            const studentOfflinePayments = unsyncedPayments
              .filter((item: any) => item.payload.feeId === fee.id)
              .map((item: any) => ({
                ...item.payload,
                isProvisoire: true,
                recordedBy: "Local Offline",
              }));

            if (studentOfflinePayments.length > 0) {
              const totalOfflinePaid = studentOfflinePayments.reduce((acc, p) => acc + p.amount, 0);
              const totalOfflineReduc = studentOfflinePayments.reduce((acc, p) => acc + (p.reduction || 0), 0);

              const mergedPayments = [...studentOfflinePayments, ...(fee.payments || [])];
              const updatedPaid = (fee.totalPaid || 0) + totalOfflinePaid;
              const updatedReduction = (fee.totalReduction || 0) + totalOfflineReduc;
              const updatedBalance = Math.max(0, fee.totalExpected - updatedPaid - updatedReduction);

              return {
                ...fee,
                payments: mergedPayments,
                totalPaid: updatedPaid,
                totalReduction: updatedReduction,
                balance: updatedBalance,
                status: updatedBalance <= 0 ? "Soldé" : "Partiel",
              };
            }
            return fee;
          });

          setLocalFees(updatedFees);
          setIsLocal(true);
          return;
        }
      } catch (e) {
        console.warn("Failed to merge offline outbox payments:", e);
      }

      setLocalFees(baseFees || []);
      setIsLocal(isUsingLocal);
    }
    loadData();
  }, [fees]);

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`?${params.toString()}`);
  };

  const formatAmount = (val: number) => {
    if (!isMounted) return "0 CFA";
    return `${Math.round(val).toLocaleString("fr-FR")} CFA`;
  };

  const formatDate = (dateStr?: string | Date | null) => {
    if (!isMounted || !dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return "-";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette opération ? Cette action est irréversible.")) return;
    const res = await deleteStudentFee(id);
    if (res.success) toast.success("Opération supprimée avec succès.");
    else toast.error("Erreur lors de la suppression.");
  };

  // Unpaid badge count
  const alertCount = advancedStats
    ? (advancedStats.countUnpaid || 0) + (advancedStats.countPartial || 0)
    : 0;

  const sideItems = [
    { label: "Tableau de bord", tab: "dashboard" as TabId, icon: LayoutDashboard },
    { label: "Paiements", tab: "payments" as TabId, icon: CardIcon },
    { label: "Rapports avancés", tab: "reports" as TabId, icon: BarChart3 },
    { label: "Alertes & Notifications", tab: "alerts" as TabId, icon: AlertTriangle, badge: alertCount },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fc] font-sans text-slate-950 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen flex-col border-r border-slate-200/70 bg-white/95 px-3 py-5 shadow-[12px_0_40px_rgba(15,23,42,0.04)] lg:flex">
        <div className="mb-5 flex items-center gap-2 rounded-2xl px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-tight text-slate-900">École Excellence</p>
            <p className="text-[11px] font-bold text-slate-500">Année 2024 - 2025</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {sideItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.tab;
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.tab)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[12px] font-black transition-all",
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                )}
              >
                <Icon size={17} />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px]", active ? "bg-white text-indigo-600" : "bg-rose-500 text-white")}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-indigo-600 p-5 text-white shadow-xl shadow-indigo-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Taux de recouvrement</p>
          <p className="mt-2 text-3xl font-black">{advancedStats?.recoveryRate || 0}%</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, advancedStats?.recoveryRate || 0)}%` }} />
          </div>
        </div>
      </aside>

      <main className="min-w-0 space-y-6 p-4 md:p-6 xl:p-8 2xl:p-10">
      <div className="flex flex-col gap-3 rounded-[24px] border border-indigo-100 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
            <Wallet size={23} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-950">École Excellence</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">Année 2024 - 2025</span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-slate-500">Centre de Reporting Financier Intelligent</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <span className="rounded-xl bg-slate-50 px-3 py-2">Total élèves: {advancedStats?.totalStudents || localFees.length}</span>
          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">Recouvrement: {advancedStats?.recoveryRate || 0}%</span>
          <span className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700">Alertes: {alertCount}</span>
        </div>
      </div>
      
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-5 rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestion Financière</h1>
              {isLocal && (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse">
                  Données locales
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium text-sm mt-1">Centre de Reporting Financier Intelligent</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {canEdit && (
            <PaymentDialog
              feeData={localFees[0] || { id: 0, balance: 0, totalExpected: 0, totalPaid: 0, student: null }}
              trigger={
                <Button className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all cursor-pointer">
                  <Plus size={18} /> Ajouter un paiement
                </Button>
              }
            />
          )}
          {activeTab === "reports" && (
            <Button
              variant="ghost"
              onClick={() => document.querySelector<HTMLButtonElement>("[data-print-btn]")?.click()}
              className="h-12 px-6 rounded-2xl text-slate-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100"
            >
              <Printer size={18} /> Exporter PDF
            </Button>
          )}
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm lg:hidden">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const badge = tab.badge ? tab.badge(advancedStats) : null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all",
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )}
            >
              <Icon size={14} />
              <span className="hidden sm:block">{tab.label}</span>
              {badge !== null && badge > 0 && (
                <span className={cn(
                  "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black",
                  activeTab === tab.id ? "bg-white text-indigo-600" : "bg-rose-500 text-white"
                )}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      
      {/* DASHBOARD TAB */}
      {activeTab === "dashboard" && (
        <FinanceDashboard
          stats={advancedStats || {
            totalExpected: stats?.totalExpected || 0,
            totalPaid: stats?.totalCollected || 0,
            totalDebts: stats?.totalDebts || 0,
            totalReductions: 0,
            currentBalance: stats?.totalCollected || 0,
            recoveryRate: stats?.totalExpected > 0 ? Math.round(((stats?.totalCollected || 0) / stats?.totalExpected) * 100) : 0,
            totalPaymentsCount: 0,
            countPaid: 0,
            countPartial: 0,
            countUnpaid: 0,
            totalStudents: localFees.length,
            revenueToday: 0,
            revenueWeek: 0,
            revenueMonth: 0,
            revenueYear: 0,
            monthlyData: [],
            classSummary: [],
            unpaidAlerts: [],
          }}
          isMounted={isMounted}
        />
      )}

      {/* PAYMENTS TAB */}
      {activeTab === "payments" && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6 items-end lg:items-center">
              <form onSubmit={handleSearch} className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <Input 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève, une classe, un paiement..." 
                  className="pl-12 rounded-2xl border-slate-100 bg-slate-50/50 h-12 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" 
                />
              </form>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Classe</label>
                  <div className="relative">
                    <select 
                      value={selectedClass}
                      onChange={(e) => { setSelectedClass(e.target.value); updateFilters({ class: e.target.value }); }}
                      className="w-full md:w-32 h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 appearance-none outline-none"
                    >
                      <option value="Toutes">Toutes</option>
                      {classes.map(c => <option key={c.id} value={c.className}>{c.className}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Statut</label>
                  <div className="relative">
                    <select 
                      value={selectedStatus}
                      onChange={(e) => { setSelectedStatus(e.target.value); updateFilters({ status: e.target.value }); }}
                      className="w-full md:w-32 h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 appearance-none outline-none"
                    >
                      <option value="Tous">Tous</option>
                      <option value="Soldé">Soldé</option>
                      <option value="Partiel">Partiel</option>
                      <option value="Impayé">Impayé</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Période</label>
                  <div className="relative">
                    <div className="w-full md:w-40 h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] font-bold text-slate-700">Ce mois-ci</span>
                      <Calendar className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={14} />
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <Button className="w-full md:w-auto h-11 px-6 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-100 transition-all">
                    <Filter size={14} /> Filtrer
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-y border-slate-100">
                  <th className="px-8 py-5 text-left">
                    <Checkbox className="rounded-md border-slate-200" />
                  </th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">ÉLÈVE / CLASSE</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">ATTENDU</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">PAYÉ</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">SOLDE</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">STATUT</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">DATE</th>
                  <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">MODE DE PAIEMENT</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {localFees.length > 0 ? (
                  localFees.map((fee) => {
                    const lastPayment = fee.payments?.[0];
                    const date = lastPayment?.datePaid ? new Date(lastPayment.datePaid).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "-";
                    const mode = lastPayment?.paymentMode || "Non spécifié";

                    return (
                      <tr key={fee.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <Checkbox className="rounded-md border-slate-200" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                              {fee.student?.photoPath && !fee.student.photoPath.startsWith("file://") ? (
                                <img src={fee.student.photoPath} alt={fee.student.nomEtudiant} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                  <span className="text-xs font-black text-indigo-300">{fee.student?.nomEtudiant?.[0]}</span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-black text-slate-900 leading-none truncate">{fee.student?.nomEtudiant}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{fee.student?.classe}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[11px] font-black text-indigo-600">{formatAmount(fee.totalExpected || 0)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[11px] font-black text-emerald-600">{formatAmount(fee.totalPaid || 0)}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className={cn(
                            "text-[11px] font-black",
                            fee.balance > 0 ? "text-rose-500" : "text-emerald-500"
                          )}>
                            {formatAmount(fee.balance || 0)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(fee.status)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-[11px] font-bold text-slate-600 whitespace-nowrap">{isMounted ? date : "-"}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            {getModeIcon(mode)}
                            <span className="text-[11px] font-bold">{mode}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => setPreviewFee(fee)}
                              className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Eye size={16} />
                            </button>
                            {canEdit && (
                              <PaymentDialog 
                                feeData={fee}
                                trigger={
                                  <div className="p-2 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer">
                                    <Edit size={16} />
                                  </div>
                                }
                              />
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => handleDelete(fee.id)}
                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors ml-1">
                              <History size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <Wallet size={64} />
                        <p className="text-xl font-bold italic">Aucune donnée financière trouvée</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Affichage</span>
                  <div className="relative">
                     <select className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[11px] font-black text-slate-700 appearance-none pr-8 outline-none">
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                     </select>
                     <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                  </div>
               </div>
               <p className="text-[11px] font-bold text-slate-400">Sur {fees.length} élèves</p>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 transition-all">
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-100">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 font-bold text-xs text-slate-600 transition-all">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 font-bold text-xs text-slate-600 transition-all">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === "reports" && (
        <FinanceReports
          fees={localFees}
          classes={classes}
          classSummary={advancedStats?.classSummary || []}
          stats={advancedStats || {
            totalExpected: stats?.totalExpected || 0,
            totalPaid: stats?.totalCollected || 0,
            totalDebts: stats?.totalDebts || 0,
            recoveryRate: 0,
            countPaid: 0,
            countUnpaid: 0,
            countPartial: 0,
            totalStudents: fees.length,
            revenueMonth: 0,
            revenueYear: 0,
          }}
          isMounted={isMounted}
        />
      )}

      {/* ALERTS TAB */}
      {activeTab === "alerts" && (
        <UnpaidAlerts
          alerts={advancedStats?.unpaidAlerts || []}
          isMounted={isMounted}
          canEdit={canEdit}
          fees={fees}
        />
      )}

      {/* Receipt Preview Dialog */}
      <ReceiptPreviewDialog 
        open={!!previewFee} 
        onOpenChange={(open) => !open && setPreviewFee(null)} 
        feeData={previewFee} 
        headerConfig={headerConfig}
      />
      </main>
    </div>
  );
}
