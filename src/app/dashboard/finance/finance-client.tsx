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
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Smartphone,
  CreditCard,
  Building,
  HelpCircle,
  Banknote
} from "lucide-react";
import { Guard } from "@/components/rbac/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PaymentDialog from "@/domains/finance/components/PaymentDialog";
import ReceiptPreviewDialog from "@/domains/finance/components/ReceiptPreviewDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteStudentFee } from "@/domains/finance/actions/finance.actions";
import { toast } from "sonner";

// --- Types ---
interface FinanceClientProps {
  fees: any[];
  stats: any;
  classes: any[];
  canEdit?: boolean;
  canDelete?: boolean;
}

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
    case "Partiel":
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">{status === "Partiel" ? "En Cours" : "En Retard"}</span>
        </div>
      );
    default:
      return null;
  }
};

export default function FinanceClient({ fees, stats, classes, canEdit = true, canDelete = true }: FinanceClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") || "");
  const [selectedClass, setSelectedClass] = React.useState(searchParams.get("class") || "Toutes");
  const [selectedStatus, setSelectedStatus] = React.useState(searchParams.get("status") || "Tous");
  const [isMounted, setIsMounted] = React.useState(false);
  const [previewFee, setPreviewFee] = React.useState<any>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`?${params.toString()}`);
  };

  // Helper to safely format numbers and dates to avoid hydration mismatch
  const formatAmount = (val: number) => {
    if (!isMounted) return "0 CFA";
    return `${val.toLocaleString()} CFA`;
  };

  const formatDate = (dateStr?: string) => {
    if (!isMounted || !dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch (e) {
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

  return (
    <div className="p-8 space-y-8 bg-[#fdfdff] min-h-screen font-sans">
      
      {/* Header matching image */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestion Financière</h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Suivi des recouvrements et de la santé financière</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {canEdit && (
            <Button className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all">
              <Plus size={18} /> Ajouter un paiement
            </Button>
          )}
          <Button variant="ghost" className="h-12 px-6 rounded-2xl text-slate-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100">
            <History size={18} /> Rapports
          </Button>
        </div>
      </div>

      {/* Stats Cards matching image */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
              <Wallet size={24} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ATTENDU TOTAL</p>
            <h2 className="text-3xl font-black text-slate-900 mt-1">{formatAmount(stats?.totalExpected || 0)}</h2>
            <p className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 mt-2">
              <TrendingUp size={12} /> +12,5% <span className="text-slate-400">vs mois dernier</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ENCAISSÉ</p>
            <h2 className="text-3xl font-black text-slate-900 mt-1">{formatAmount(stats?.totalCollected || 0)}</h2>
            <p className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 mt-2">
              <TrendingUp size={12} /> +8,4% <span className="text-slate-400">vs mois dernier</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <TrendingDown size={24} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IMPAYÉS</p>
            <h2 className="text-3xl font-black text-slate-900 mt-1">{formatAmount(stats?.totalDebts || 0)}</h2>
            <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-2">
              <TrendingDown size={12} /> -3,2% <span className="text-slate-400">vs mois dernier</span>
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters matching image */}
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

        {/* Table matching image */}
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
              {fees.length > 0 ? (
                fees.map((fee) => {
                  const lastPayment = fee.payments?.[0];
                  const date = lastPayment?.datePaid ? new Date(lastPayment.datePaid).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : "-";
                  const mode = lastPayment?.paymentMode || "Non spécifié";

                  return (
                    <tr key={fee.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <Checkbox className="rounded-md border-slate-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                            {fee.student?.photoPath && !fee.student.photoPath.startsWith('file://') ? (
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
                        <p className="text-[11px] font-bold text-slate-600 whitespace-nowrap">{formatDate(lastPayment?.datePaid)}</p>
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

        {/* Pagination matching image */}
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
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 font-bold text-xs text-slate-600 transition-all">4</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 font-bold text-xs text-slate-600 transition-all">5</button>
            <span className="text-slate-300 font-bold px-1">...</span>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 font-bold text-xs text-slate-600 transition-all">7</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <ReceiptPreviewDialog 
        open={!!previewFee} 
        onOpenChange={(open) => !open && setPreviewFee(null)} 
        feeData={previewFee} 
      />
    </div>
  );
}
