"use client";

import * as React from "react";
import { FileText, Printer, BarChart2, TrendingUp, Users, Filter, FileSpreadsheet, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";

interface ClassSummary {
  className: string;
  expected: number;
  paid: number;
  unpaid: number;
  count: number;
  rate: number;
}

interface FinanceReportsProps {
  fees?: any[];
  classes?: any[];
  classSummary: ClassSummary[];
  stats: {
    totalExpected: number;
    totalPaid: number;
    totalDebts: number;
    recoveryRate: number;
    countPaid: number;
    countUnpaid: number;
    countPartial: number;
    totalStudents: number;
    revenueMonth: number;
    revenueYear: number;
  };
  isMounted: boolean;
}

const ACCOUNTING_REPORTS = [
  { id: "journal", label: "Journal de caisse" },
  { id: "grandlivre", label: "Grand livre élèves" },
  { id: "balance", label: "Balance frais scolaires" },
  { id: "creances", label: "Créances élèves" },
  { id: "annulations", label: "Annulations et remises" },
  { id: "bourses", label: "Bourses" },
  { id: "audit", label: "Audit paiement" },
  { id: "caissier", label: "Rapports par caissier" },
  { id: "tresorerie", label: "Rapport trésorerie" },
  { id: "prevision", label: "Prévision encaissement" },
];

export default function FinanceReports({ fees = [], classes = [], classSummary = [], stats, isMounted }: FinanceReportsProps) {
  const [activeReport, setActiveReport] = React.useState("journal");

  // ── FILTER STATES ──
  const [classFilter, setClassFilter] = React.useState("Tous");
  const [levelFilter, setLevelFilter] = React.useState("Tous");
  const [studentSearch, setStudentSearch] = React.useState("");
  const [cashierFilter, setCashierFilter] = React.useState("Tous");
  const [modeFilter, setModeFilter] = React.useState("Tous");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("Tous");
  const [refSearch, setRefSearch] = React.useState("");
  const [selectedFeeId, setSelectedFeeId] = React.useState<number | null>(null);

  const fmt = (v: number) => isMounted ? `${Math.round(v).toLocaleString("fr-FR")} CFA` : "—";
  const today = isMounted ? new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "";

  // ── DERIVED DATA ──
  const uniqueLevels = React.useMemo(() => Array.from(new Set(fees.map((f: any) => f.student?.educationalLevel).filter(Boolean))), [fees]);
  const allPayments = React.useMemo(() => fees.flatMap((fee: any) => (fee.payments || []).map((p: any) => ({
    ...p,
    studentName: fee.student?.nomEtudiant || "Inconnu",
    classe: fee.student?.classe || "-",
    level: fee.student?.educationalLevel || "-",
    feeStatus: fee.status,
    totalExpected: fee.totalExpected || 0,
    mobile: fee.student?.mobile,
  }))), [fees]);

  const uniqueCashiers = React.useMemo(() => Array.from(new Set(allPayments.map((p: any) => p.recordedBy).filter(Boolean))), [allPayments]);
  const uniqueModes = React.useMemo(() => Array.from(new Set(allPayments.map((p: any) => p.paymentMode).filter(Boolean))), [allPayments]);

  React.useEffect(() => {
    if (fees.length > 0 && selectedFeeId === null) setSelectedFeeId(fees[0].id);
  }, [fees, selectedFeeId]);

  // ── FILTERS ──
  const filteredPayments = React.useMemo(() => allPayments.filter((p: any) => {
    if (classFilter !== "Tous" && p.classe !== classFilter) return false;
    if (levelFilter !== "Tous" && p.level !== levelFilter) return false;
    if (cashierFilter !== "Tous" && p.recordedBy !== cashierFilter) return false;
    if (modeFilter !== "Tous" && p.paymentMode !== modeFilter) return false;
    if (statusFilter !== "Tous" && p.feeStatus !== statusFilter) return false;
    if (studentSearch) {
      const s = studentSearch.toLowerCase();
      if (!p.studentName.toLowerCase().includes(s)) return false;
    }
    if (refSearch && !p.reference?.toLowerCase().includes(refSearch.toLowerCase())) return false;
    if (startDate && p.datePaid && new Date(p.datePaid) < new Date(startDate)) return false;
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      if (p.datePaid && new Date(p.datePaid) > e) return false;
    }
    return true;
  }), [allPayments, classFilter, levelFilter, cashierFilter, modeFilter, statusFilter, studentSearch, refSearch, startDate, endDate]);

  const filteredFees = React.useMemo(() => fees.filter((f: any) => {
    if (classFilter !== "Tous" && f.student?.classe !== classFilter) return false;
    if (levelFilter !== "Tous" && f.student?.educationalLevel !== levelFilter) return false;
    if (statusFilter !== "Tous" && f.status !== statusFilter) return false;
    if (studentSearch && !f.student?.nomEtudiant?.toLowerCase().includes(studentSearch.toLowerCase())) return false;
    return true;
  }), [fees, classFilter, levelFilter, statusFilter, studentSearch]);

  const totalCollected = React.useMemo(() => filteredPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0), [filteredPayments]);
  const totalReductions = React.useMemo(() => filteredFees.reduce((s: number, f: any) => s + (f.totalReduction || 0), 0), [filteredFees]);

  // ── CASHIER REPORT ──
  const cashierReports = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number; cash: number; mob: number; bank: number }>();
    filteredPayments.forEach((p: any) => {
      const c = p.recordedBy || "Inconnu";
      if (!map.has(c)) map.set(c, { count: 0, total: 0, cash: 0, mob: 0, bank: 0 });
      const e = map.get(c)!;
      e.count++; e.total += p.amount || 0;
      if (p.paymentMode === "Espèces") e.cash += p.amount || 0;
      else if (p.paymentMode === "Mobile Money") e.mob += p.amount || 0;
      else e.bank += p.amount || 0;
    });
    return Array.from(map.entries()).map(([cashier, data]) => ({ cashier, ...data }));
  }, [filteredPayments]);

  // ── TREASURY ──
  const treasuryReports = React.useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredPayments.forEach((p: any) => {
      const mode = p.paymentMode || "Espèces";
      if (!map.has(mode)) map.set(mode, { count: 0, total: 0 });
      const e = map.get(mode)!; e.count++; e.total += p.amount || 0;
    });
    const grandTotal = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
    return Array.from(map.entries()).map(([mode, data]) => ({
      mode, ...data, pct: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0
    }));
  }, [filteredPayments]);

  // ── FORECAST ──
  const forecastMonths = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
  const monthNumMap: Record<number, string> = { 8:"Sept",9:"Oct",10:"Nov",11:"Déc",0:"Jan",1:"Fév",2:"Mar",3:"Avr",4:"Mai",5:"Juin" };
  const monthlyFeeBase = fees.reduce((s: number, f: any) => s + (f.student?.fraisMensuels || 0), 0);
  const forecastData = forecastMonths.map(m => {
    const actual = allPayments.filter((p: any) => p.datePaid && monthNumMap[new Date(p.datePaid).getMonth()] === m).reduce((s: number, p: any) => s + (p.amount || 0), 0);
    return { month: m, expected: monthlyFeeBase, actual, gap: monthlyFeeBase - actual };
  });

  // ── EXPORTS ──
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) { toast.error("Aucune donnée."); return; }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const a = document.createElement("a"); a.href = encodeURI(csv); a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Export CSV réussi !");
  };

  const exportToExcel = () => {
    const data = filteredPayments.map((p: any) => ({
      Date: isMounted ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-",
      Référence: p.reference || "-", Élève: p.studentName, Classe: p.classe,
      Mode: p.paymentMode, Caissier: p.recordedBy || "-", Montant: p.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport");
    XLSX.writeFile(wb, `rapport_finance_${Date.now()}.xlsx`);
    toast.success("Export Excel réussi !");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(79, 70, 229);
    const label = ACCOUNTING_REPORTS.find(r => r.id === activeReport)?.label || activeReport;
    doc.text(`Rapport - ${label}`, 14, 20);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 116, 139);
    doc.text(`Généré le ${today}`, 14, 26);
    const rows = filteredPayments.map((p: any) => [
      isMounted ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-",
      p.reference || "-", p.studentName, p.classe, p.paymentMode, `${(p.amount || 0).toLocaleString()} CFA`
    ]);
    autoTable(doc, { head: [["Date","Référence","Élève","Classe","Mode","Montant"]], body: rows, startY: 32, headStyles: { fillColor: [79,70,229] }, styles: { fontSize: 8 } });
    doc.save(`rapport_finance_${Date.now()}.pdf`);
    toast.success("PDF généré !");
  };

  const handlePrint = () => {
    const el = document.getElementById("finance-report-print");
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const label = ACCOUNTING_REPORTS.find(r => r.id === activeReport)?.label || activeReport;
    win.document.write(`<!DOCTYPE html><html><head><title>${label}</title><style>body{font-family:sans-serif;padding:20px;color:#333}h1{color:#4f46e5;font-size:20px}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#f3f4f6;padding:8px;text-align:left;border-bottom:2px solid #e5e7eb}td{padding:8px;border-bottom:1px solid #f1f5f9}</style></head><body><h1>${label}</h1><p>Généré le ${today}</p>${el.innerHTML}</body></html>`);
    win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const currentFeeDetails = fees.find((f: any) => f.id === selectedFeeId);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      {/* ── SIDEBAR ── */}
      <aside className="rounded-[28px] border border-slate-200/50 bg-white p-5 shadow-sm">
        <div className="mb-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Centre Comptable</p>
          <h2 className="mt-1 text-base font-black tracking-tight">Rapports &amp; Balance</h2>
        </div>
        <div className="space-y-1 overflow-auto max-h-[70vh] pr-1">
          {ACCOUNTING_REPORTS.map((report) => (
            <button key={report.id} onClick={() => setActiveReport(report.id)}
              className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-[12px] font-black transition-all cursor-pointer",
                activeReport === report.id ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100" : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
              )}>
              <FileText size={14} className={activeReport === report.id ? "text-indigo-500" : "text-slate-400"} />
              <span className="flex-1 truncate">{report.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <section className="min-w-0 space-y-5">

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Filter size={15} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700">Filtres Avancés</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Classe</label>
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 outline-none">
                <option value="Tous">Toutes classes</option>
                {classes.map((c: any) => <option key={c.id} value={c.className}>{c.className}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Niveau</label>
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 outline-none">
                <option value="Tous">Tous niveaux</option>
                {uniqueLevels.map((l: any) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Caissier</label>
              <select value={cashierFilter} onChange={e => setCashierFilter(e.target.value)} className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 outline-none">
                <option value="Tous">Tous caissiers</option>
                {uniqueCashiers.map((c: any) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mode Paiement</label>
              <select value={modeFilter} onChange={e => setModeFilter(e.target.value)} className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 outline-none">
                <option value="Tous">Tous modes</option>
                {uniqueModes.map((m: any) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Statut</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-9 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 outline-none">
                <option value="Tous">Tous</option>
                <option value="Soldé">Soldé</option>
                <option value="Partiel">Partiel</option>
                <option value="Impayé">Impayé</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date Début</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-[11px] font-bold rounded-xl border-slate-100 bg-slate-50/50" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date Fin</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-[11px] font-bold rounded-xl border-slate-100 bg-slate-50/50" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Élève</label>
              <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Rechercher..." className="h-9 text-[11px] font-bold rounded-xl border-slate-100 bg-slate-50/50" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Référence</label>
              <Input value={refSearch} onChange={e => setRefSearch(e.target.value)} placeholder="REC-XXXX..." className="h-9 text-[11px] font-bold rounded-xl border-slate-100 bg-slate-50/50" />
            </div>
          </div>
        </div>

        {/* Action bar + Exports */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white px-6 py-4 rounded-3xl border border-slate-200/50 shadow-sm">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rapport Actuel</p>
            <h3 className="text-sm font-black text-slate-800 mt-0.5">{ACCOUNTING_REPORTS.find(r => r.id === activeReport)?.label}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportToPDF} className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-red-600 cursor-pointer transition-all">
              <FileText size={13} /> PDF
            </button>
            <button onClick={exportToExcel} className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-emerald-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-emerald-600 cursor-pointer transition-all">
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button onClick={() => exportToCSV(filteredPayments.map((p: any) => ({ Date: isMounted ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-", Référence: p.reference || "-", Élève: p.studentName, Classe: p.classe, Montant: p.amount })), `finance_${Date.now()}.csv`)} className="h-9 px-4 rounded-xl border border-slate-200 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-indigo-600 cursor-pointer transition-all">
              <FileText size={13} /> CSV
            </button>
            <button onClick={handlePrint} className="h-9 px-5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer transition-all">
              <Printer size={13} /> Imprimer
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Encaissé Filtré", value: fmt(totalCollected), color: "emerald" },
            { label: "Remises Filtrées", value: fmt(totalReductions), color: "amber" },
            { label: "Transactions", value: String(filteredPayments.length), color: "indigo" },
            { label: "Taux Recouvrement", value: `${stats.recoveryRate}%`, color: "slate" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className={cn("text-xl font-black mt-1",
                kpi.color === "emerald" && "text-emerald-600",
                kpi.color === "amber" && "text-amber-600",
                kpi.color === "indigo" && "text-indigo-600",
                kpi.color === "slate" && "text-slate-800"
              )}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── REPORT TABLE AREA ── */}
        <div id="finance-report-print" className="bg-white rounded-[2.5rem] border border-slate-200/50 shadow-sm overflow-hidden">

          {/* JOURNAL DE CAISSE */}
          {activeReport === "journal" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Date", "Référence", "Élève", "Classe", "Mode", "Caissier", "Montant"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-bold italic">Aucune transaction.</td></tr>
                  ) : filteredPayments.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-600">{isMounted ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-"}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{p.reference || "-"}</td>
                      <td className="px-5 py-3.5 font-black text-slate-800">{p.studentName}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500 uppercase text-[10px]">{p.classe}</td>
                      <td className="px-5 py-3.5 text-slate-600">{p.paymentMode}</td>
                      <td className="px-5 py-3.5 text-slate-500">{p.recordedBy || "-"}</td>
                      <td className="px-5 py-3.5 font-black text-emerald-600 text-right">{(p.amount||0).toLocaleString()} CFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* GRAND LIVRE ELEVES */}
          {activeReport === "grandlivre" && (
            <div className="p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sélectionner un élève</label>
                  <div className="relative">
                    <select value={selectedFeeId || ""} onChange={e => setSelectedFeeId(Number(e.target.value))} className="h-10 w-72 bg-slate-50 border border-slate-100 rounded-xl px-3 text-xs font-bold text-slate-700 outline-none appearance-none pr-8">
                      {fees.map((f: any) => <option key={f.id} value={f.id}>{f.student?.nomEtudiant} ({f.student?.classe})</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
                {currentFeeDetails && (
                  <div className="text-xs text-right ml-auto">
                    <p className="font-black text-slate-800">{currentFeeDetails.student?.nomEtudiant}</p>
                    <p className="text-slate-400 font-bold uppercase mt-0.5">Admission: {currentFeeDetails.student?.numAdmission}</p>
                  </div>
                )}
              </div>
              {currentFeeDetails && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Attendu", val: currentFeeDetails.totalExpected, color: "indigo" },
                      { label: "Bourse/Réduction", val: (currentFeeDetails.totalReduction || 0) + (currentFeeDetails.student?.bourse || 0), color: "amber" },
                      { label: "Total Payé", val: currentFeeDetails.totalPaid, color: "emerald" },
                      { label: "Solde Restant", val: currentFeeDetails.balance, color: "rose" },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
                        <p className={cn("text-lg font-black mt-1", `text-${m.color}-600`)}>{fmt(m.val)}</p>
                      </div>
                    ))}
                  </div>
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["Date", "Référence", "Libellé", "Débit (Attendu)", "Crédit (Payé)", "Réduction", "Mode"].map(h => (
                          <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3.5 text-slate-400 font-bold">-</td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">INIT</td>
                        <td className="px-4 py-3.5 font-black text-slate-700">Facturation Frais Annuels</td>
                        <td className="px-4 py-3.5 font-black text-indigo-600">{currentFeeDetails.totalExpected.toLocaleString()} CFA</td>
                        <td className="px-4 py-3.5 text-slate-400">-</td>
                        <td className="px-4 py-3.5 text-slate-400">-</td>
                        <td className="px-4 py-3.5 text-slate-400">-</td>
                      </tr>
                      {(currentFeeDetails.payments || []).map((pay: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-3.5 font-bold text-slate-500">{isMounted ? new Date(pay.datePaid).toLocaleDateString("fr-FR") : "-"}</td>
                          <td className="px-4 py-3.5 font-mono text-slate-500">{pay.reference || "-"}</td>
                          <td className="px-4 py-3.5 text-slate-600">{pay.monthConcerned}</td>
                          <td className="px-4 py-3.5 text-slate-400">-</td>
                          <td className="px-4 py-3.5 font-black text-emerald-600">{pay.amount.toLocaleString()} CFA</td>
                          <td className="px-4 py-3.5 font-bold text-amber-600">{pay.reduction ? `${pay.reduction.toLocaleString()} CFA` : "-"}</td>
                          <td className="px-4 py-3.5 text-slate-500">{pay.paymentMode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* BALANCE FRAIS SCOLAIRES */}
          {activeReport === "balance" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Classe", "Élèves", "Total Attendu", "Remises", "Total Encaissé", "Créance", "Taux"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classSummary.map((c, idx) => {
                    const totalReduc = fees.filter((f: any) => f.student?.classe === c.className).reduce((s: number, f: any) => s + (f.totalReduction || 0), 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-black text-slate-800">{c.className}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-500">{c.count}</td>
                        <td className="px-5 py-3.5 font-black text-indigo-600">{c.expected.toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5 font-bold text-amber-600">{totalReduc.toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5 font-black text-emerald-600">{c.paid.toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5 font-black text-rose-500">{c.unpaid.toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", c.rate>=80?"bg-emerald-400":c.rate>=50?"bg-amber-400":"bg-rose-400")} style={{ width:`${c.rate}%` }} />
                            </div>
                            <span className="text-[10px] font-black w-8 text-right">{c.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-indigo-50/50 border-t-2 border-indigo-100">
                    <td className="px-5 py-4 font-black text-indigo-700 text-[11px] uppercase">Total Général</td>
                    <td className="px-5 py-4 text-center font-black text-indigo-700">{stats.totalStudents}</td>
                    <td className="px-5 py-4 font-black text-indigo-700">{fmt(stats.totalExpected)}</td>
                    <td className="px-5 py-4 font-black text-amber-700">{fmt(totalReductions)}</td>
                    <td className="px-5 py-4 font-black text-emerald-700">{fmt(stats.totalPaid)}</td>
                    <td className="px-5 py-4 font-black text-rose-600">{fmt(stats.totalDebts)}</td>
                    <td className="px-5 py-4 font-black text-indigo-700">{stats.recoveryRate}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* CREANCES ELEVES */}
          {activeReport === "creances" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Élève", "Classe", "Dû Initial", "Remise", "Payé", "Créance", "Statut", "Contact Parent"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.filter((f: any) => f.balance > 0).length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-slate-400 font-bold italic">Félicitations, aucune créance en cours !</td></tr>
                  ) : filteredFees.filter((f: any) => f.balance > 0).map((f: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-black text-slate-800">{f.student?.nomEtudiant}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500 uppercase text-[10px]">{f.student?.classe}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">{(f.totalExpected||0).toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5 font-bold text-amber-600">{(f.totalReduction||0) > 0 ? `${f.totalReduction.toLocaleString()} CFA` : "-"}</td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600">{(f.totalPaid||0).toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5 font-black text-rose-500">{(f.balance||0).toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full font-bold text-[9px] uppercase">{f.status}</span></td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{f.student?.mobile || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ANNULATIONS ET REMISES */}
          {activeReport === "annulations" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Date", "Élève", "Classe", "Référence", "Remise (CFA)", "Caissier", "Motif"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.filter((p: any) => (p.reduction||0) > 0).length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-bold italic">Aucune remise enregistrée.</td></tr>
                  ) : filteredPayments.filter((p: any) => (p.reduction||0) > 0).map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-600">{isMounted ? new Date(p.datePaid).toLocaleDateString("fr-FR") : "-"}</td>
                      <td className="px-5 py-3.5 font-black text-slate-800">{p.studentName}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-500 uppercase text-[10px]">{p.classe}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{p.reference || "-"}</td>
                      <td className="px-5 py-3.5 font-black text-amber-600">{(p.reduction||0).toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5 text-slate-500">{p.recordedBy || "-"}</td>
                      <td className="px-5 py-3.5 italic text-slate-600">{p.notes || "Remise manuelle"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* BOURSES */}
          {activeReport === "bourses" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Élève", "Classe", "Frais Standard", "Bourse / Exon.", "Net Attendu", "Total Payé", "Solde"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.filter((f: any) => (f.student?.bourse||0) > 0 || (f.totalReduction||0) > 0).length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-slate-400 font-bold italic">Aucune bourse enregistrée.</td></tr>
                  ) : filteredFees.filter((f: any) => (f.student?.bourse||0) > 0 || (f.totalReduction||0) > 0).map((f: any, i: number) => {
                    const bv = (f.student?.bourse||0) + (f.totalReduction||0);
                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-black text-slate-800">{f.student?.nomEtudiant}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-500 uppercase text-[10px]">{f.student?.classe}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600">{(f.totalExpected||0).toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5 font-black text-amber-600">{bv.toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5 font-bold text-indigo-600">{((f.totalExpected||0) - bv).toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5 font-bold text-emerald-600">{(f.totalPaid||0).toLocaleString()} CFA</td>
                        <td className="px-5 py-3.5 font-black text-rose-500">{(f.balance||0).toLocaleString()} CFA</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* AUDIT PAIEMENT */}
          {activeReport === "audit" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Horodatage", "Type", "Référence", "Élève", "Montant", "Caissier", "Mode"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-mono text-slate-500">{isMounted ? new Date(p.datePaid).toLocaleString("fr-FR") : "-"}</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-[9px]">ENCAISSEMENT</span></td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">{p.reference || "-"}</td>
                      <td className="px-5 py-3.5 font-black text-slate-800">{p.studentName}</td>
                      <td className="px-5 py-3.5 font-black text-emerald-600">{(p.amount||0).toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">{p.recordedBy || "Système"}</td>
                      <td className="px-5 py-3.5 text-slate-400 uppercase text-[10px]">{p.paymentMode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* RAPPORTS PAR CAISSIER */}
          {activeReport === "caissier" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Caissier / Agent", "Transactions", "Espèces", "Mobile Money", "Autres Modes", "Total Collecté"].map(h => (
                      <th key={h} className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashierReports.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-bold italic">Aucun caissier enregistré.</td></tr>
                  ) : cashierReports.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-black text-slate-800">{item.cashier}</td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-500">{item.count}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">{item.cash.toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">{item.mob.toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">{item.bank.toLocaleString()} CFA</td>
                      <td className="px-5 py-3.5 font-black text-emerald-600">{item.total.toLocaleString()} CFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* RAPPORT TRESORERIE */}
          {activeReport === "tresorerie" && (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-4">Répartition par Canal</h4>
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {["Mode", "Transactions", "Total CFA", "%"].map(h => (
                        <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {treasuryReports.map((t, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3.5 font-black text-slate-700">{t.mode}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-500">{t.count}</td>
                        <td className="px-4 py-3.5 font-black text-emerald-600">{t.total.toLocaleString()} CFA</td>
                        <td className="px-4 py-3.5 font-bold text-indigo-600">{t.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col justify-center space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal Principal</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{[...treasuryReports].sort((a,b) => b.total-a.total)[0]?.mode || "—"}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Total global: {fmt(totalCollected)}</p>
                </div>
                <div className="h-3 bg-slate-200/50 rounded-full overflow-hidden flex">
                  {treasuryReports.map((t, i) => (
                    <div key={i} style={{ width:`${t.pct}%` }} title={`${t.mode}: ${t.pct}%`}
                      className={cn("h-full", t.mode==="Espèces"&&"bg-emerald-400", t.mode==="Mobile Money"&&"bg-indigo-400", t.mode==="Virement"&&"bg-amber-400", !["Espèces","Mobile Money","Virement"].includes(t.mode)&&"bg-slate-400")} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PREVISION ENCAISSEMENT */}
          {activeReport === "prevision" && (
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenus Mensuels Prévus</p>
                  <p className="text-xl font-black text-indigo-600 mt-1">{monthlyFeeBase.toLocaleString()} CFA / mois</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">sur {fees.length} élèves</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encaissements Réels</p>
                  <p className="text-xl font-black text-emerald-600 mt-1">{totalCollected.toLocaleString()} CFA</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Créances</p>
                  <p className="text-xl font-black text-rose-500 mt-1">{fmt(stats.totalDebts)}</p>
                </div>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["Mois Scolaire", "Prévision", "Encaissement Réel", "Écart", "Performance"].map(h => (
                      <th key={h} className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecastData.map((f, i) => {
                    const rate = f.expected > 0 ? Math.round((f.actual/f.expected)*100) : 0;
                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 font-black text-slate-700">{f.month}</td>
                        <td className="px-4 py-3.5 font-semibold text-indigo-600">{f.expected.toLocaleString()} CFA</td>
                        <td className="px-4 py-3.5 font-black text-emerald-600">{f.actual.toLocaleString()} CFA</td>
                        <td className="px-4 py-3.5 font-bold text-rose-500">{f.gap.toLocaleString()} CFA</td>
                        <td className="px-4 py-3.5"><span className={cn("px-2 py-0.5 rounded font-black text-[9px]", rate>=80?"bg-emerald-50 text-emerald-600":"bg-amber-50 text-amber-600")}>{rate}%</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Unused icon suppressor */}
          {false && <><BarChart2 /><TrendingUp /><Users /></>}

        </div>
      </section>
    </div>
  );
}
