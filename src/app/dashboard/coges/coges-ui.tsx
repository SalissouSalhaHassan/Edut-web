"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createCogesPayment, searchStudents } from "@/domains/finance/actions/coges.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Banknote,
  User,
  FileText,
  FileCheck2,
  CalendarDays,
  Printer,
  Plus,
  Search,
  CheckCircle2,
  BookOpen,
  X,
  GraduationCap,
  ChevronDown,
  Loader2,
  Coins,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Filter,
  Info,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getBranchByLevel } from "@/domains/settings/actions/settings.actions";

// ─── Types ───────────────────────────────────────────────────────────────────
type Student = {
  id: number;
  nomEtudiant: string;
  numAdmission: string;
  classe: string | null;
  nomPere: string | null;
  mobile: string | null;
};

// ─── Number to French CFA letters ──────────────────────────────────────────
function numberToFrench(num: number): string {
  if (num === 0) return "Zéro Franc CFA";
  return new Intl.NumberFormat("fr-FR").format(num) + " Francs CFA";
}

// ─── Student Search Combobox ──────────────────────────────────────────────────
function StudentSearch({
  onSelect,
  selected,
  onClear,
}: {
  onSelect: (s: Student) => void;
  selected: Student | null;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const res = await searchStudents(q);
    if (res.success && res.data) {
      setResults(res.data as Student[]);
      setOpen(true);
    }
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center gap-3 h-14 px-4 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-left">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
          <GraduationCap className="size-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-900 text-sm leading-tight truncate">{selected.nomEtudiant}</p>
          <p className="text-xs font-semibold text-indigo-500 leading-tight">{selected.numAdmission} · {selected.classe || "Non Classé"}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-indigo-400 animate-spin" />}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher un élève par nom, N° ou père..."
          className="w-full h-14 pl-10 pr-12 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-sm outline-none"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">
              {results.length} élève(s) trouvé(s)
            </p>
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSelect(s);
                  setQuery("");
                  setOpen(false);
                  setResults([]);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 text-white font-black text-sm">
                  {s.nomEtudiant.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-700">
                    {s.nomEtudiant}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {s.numAdmission}
                    {s.classe && <span> · <span className="text-indigo-500 font-semibold">{s.classe}</span></span>}
                    {s.nomPere && <span> · Père: {s.nomPere}</span>}
                  </p>
                </div>
                <ChevronDown className="size-4 text-slate-300 rotate-[-90deg] group-hover:text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CogesUI({ initialPayments }: { initialPayments: any[] }) {
  const [payments, setPayments] = useState(initialPayments || []);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ─── FILTER STATES ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ─── WIZARD STATES ──────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    amountLetters: "",
    receivedFrom: "",
    purpose: "Cotisation Annuelle COGES",
  });
  const [customPurpose, setCustomPurpose] = useState("");
  const [wizardStatus, setWizardStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState<any>(null);

  // ─── REPORT STATES ─────────────────────────────────────────────────────────
  const [reportsOpen, setReportsOpen] = useState(false);
  const [activeReportType, setActiveReportType] = useState<"daily" | "weekly" | "monthly" | "yearly" | "class" | "purpose" | null>(null);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [branchInfo, setBranchInfo] = useState<any>(null);

  // Fetch branch info when lastReceipt changes (for printing)
  useEffect(() => {
    if (lastReceipt) {
      // Find the student's level from the student object if it exists
      const level = lastReceipt.student?.educationalLevel || "Lycée"; 
      getBranchByLevel(level).then(res => {
        if (res.data) setBranchInfo(res.data);
      });
    }
  }, [lastReceipt]);

  // When student is selected, auto-fill receivedFrom
  const handleSelectStudent = (s: Student) => {
    setSelectedStudent(s);
    setFormData((prev) => ({
      ...prev,
      receivedFrom: s.nomPere ? `${s.nomPere} (père de ${s.nomEtudiant})` : s.nomEtudiant,
    }));
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setFormData((prev) => ({ ...prev, receivedFrom: "" }));
  };

  const handlePrint = (receipt: any) => {
    setLastReceipt(receipt);
    setTimeout(() => window.print(), 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const finalPurpose = formData.purpose === "Autre" ? customPurpose : formData.purpose;
    const finalAmountLetters = formData.amountLetters || numberToFrench(Number(formData.amount));

    const result = await createCogesPayment({
      amount: Number(formData.amount),
      amountLetters: finalAmountLetters,
      receivedFrom: formData.receivedFrom,
      purpose: finalPurpose,
      studentId: selectedStudent?.id,
      classe: selectedStudent?.classe || undefined,
    });

    if (result.success && result.data) {
      const newPayment = result.data;
      setPayments([newPayment, ...payments]);
      setSuccessData(newPayment);
      setWizardStatus("success");
      setLastReceipt(newPayment);
    } else {
      setErrorMessage(result.error || "Une erreur est survenue lors de l'enregistrement.");
      setWizardStatus("error");
    }

    setLoading(false);
  };

  const openDialog = () => {
    setFormData({ amount: "", amountLetters: "", receivedFrom: "", purpose: "Cotisation Annuelle COGES" });
    setCustomPurpose("");
    setSelectedStudent(null);
    setStep(1);
    setWizardStatus("idle");
    setErrorMessage("");
    setSuccessData(null);
    setIsOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedClass("all");
    setSelectedPeriod("all");
    setSelectedStatus("all");
    setMinAmount("");
    setMaxAmount("");
    setStartDate("");
    setEndDate("");
  };

  // ─── FILTER LOGIC ──────────────────────────────────────────────────────────
  const filteredPayments = payments.filter((p: any) => {
    // 1. Text Search
    const matchesSearch = !search ||
      p.receivedFrom?.toLowerCase().includes(search.toLowerCase()) ||
      p.receiptNumber?.includes(search) ||
      p.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      p.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      p.studentNumAdmission?.toLowerCase().includes(search.toLowerCase());

    // 2. Class Filter
    const matchesClass = !selectedClass || selectedClass === "all" || p.classe === selectedClass;

    // 3. Status Filter
    const matchesStatus = !selectedStatus || selectedStatus === "all" || p.status === selectedStatus;

    // 4. Amount Range Filter
    const amt = p.amount || 0;
    const matchesMinAmount = !minAmount || amt >= Number(minAmount);
    const matchesMaxAmount = !maxAmount || amt <= Number(maxAmount);

    // 5. Date Period Filter
    let matchesDate = true;
    if (selectedPeriod !== "all") {
      const date = p.datePaid ? new Date(p.datePaid) : null;
      if (!date) {
        matchesDate = false;
      } else {
        const now = new Date();
        if (selectedPeriod === "today") {
          matchesDate = date.toDateString() === now.toDateString();
        } else if (selectedPeriod === "week") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          matchesDate = date >= oneWeekAgo;
        } else if (selectedPeriod === "month") {
          matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        } else if (selectedPeriod === "year") {
          matchesDate = date.getFullYear() === now.getFullYear();
        } else if (selectedPeriod === "custom") {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            matchesDate = matchesDate && date >= start;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && date <= end;
          }
        }
      }
    }

    return matchesSearch && matchesClass && matchesStatus && matchesMinAmount && matchesMaxAmount && matchesDate;
  });

  // ─── DYNAMIC STATISTICS ────────────────────────────────────────────────────
  const successfulPayments = filteredPayments.filter((p: any) => p.status !== "Annulé");
  const failedPayments = filteredPayments.filter((p: any) => p.status === "Annulé");

  const filteredTotal = successfulPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
  const successfulCount = successfulPayments.length;
  const failedCount = failedPayments.length;
  
  const averageAmount = successfulCount > 0 ? Math.round(filteredTotal / successfulCount) : 0;
  const successRate = filteredPayments.length > 0 ? Math.round((successfulCount / filteredPayments.length) * 100) : 100;

  // Dynamically extract unique classes from payment records for class filter dropdown
  const uniqueClasses = Array.from(
    new Set(payments.map((p: any) => p.classe).filter(Boolean))
  ) as string[];

  // ─── REPORT GENERATION LOGIC ───────────────────────────────────────────────
  const getReportDetails = () => {
    if (!activeReportType) return null;
    const now = new Date();
    let title = "";
    let arabicTitle = "";
    let dataRows: any[] = [];
    let headers: string[] = [];
    let periodText = "";

    let targetPayments = [...payments];

    if (activeReportType === "daily") {
      title = "Rapport Journalier COGES";
      arabicTitle = "Rapport Journalier des Paiements COGES";
      periodText = format(now, "dd MMMM yyyy", { locale: fr });
      targetPayments = payments.filter((p: any) => {
        const d = p.datePaid ? new Date(p.datePaid) : null;
        return d && d.toDateString() === now.toDateString();
      });
      headers = ["N° Reçu", "Élève / Payeur", "Classe", "Motif", "Montant", "Enregistré par"];
      dataRows = targetPayments.map(p => [
        `#${p.receiptNumber}`,
        p.studentName || p.receivedFrom,
        p.classe || "—",
        p.purpose || "—",
        `${p.amount.toLocaleString("fr-FR")} F CFA`,
        p.recordedBy || "System"
      ]);
    } else if (activeReportType === "weekly") {
      title = "Rapport Hebdomadaire COGES";
      arabicTitle = "Rapport Hebdomadaire des Paiements COGES";
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      periodText = `Du ${format(oneWeekAgo, "dd/MM/yyyy")} au ${format(now, "dd/MM/yyyy")}`;
      targetPayments = payments.filter((p: any) => {
        const d = p.datePaid ? new Date(p.datePaid) : null;
        return d && d >= oneWeekAgo;
      });
      headers = ["N° Reçu", "Date", "Élève / Payeur", "Classe", "Motif", "Montant"];
      dataRows = targetPayments.map(p => [
        `#${p.receiptNumber}`,
        p.datePaid ? format(new Date(p.datePaid), "dd/MM/yyyy") : "—",
        p.studentName || p.receivedFrom,
        p.classe || "—",
        p.purpose || "—",
        `${p.amount.toLocaleString("fr-FR")} F CFA`
      ]);
    } else if (activeReportType === "monthly") {
      title = "Rapport Mensuel COGES";
      arabicTitle = "Rapport Mensuel des Paiements COGES";
      periodText = format(now, "MMMM yyyy", { locale: fr });
      targetPayments = payments.filter((p: any) => {
        const d = p.datePaid ? new Date(p.datePaid) : null;
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      headers = ["N° Reçu", "Date", "Élève / Payeur", "Classe", "Motif", "Montant"];
      dataRows = targetPayments.map(p => [
        `#${p.receiptNumber}`,
        p.datePaid ? format(new Date(p.datePaid), "dd/MM/yyyy") : "—",
        p.studentName || p.receivedFrom,
        p.classe || "—",
        p.purpose || "—",
        `${p.amount.toLocaleString("fr-FR")} F CFA`
      ]);
    } else if (activeReportType === "yearly") {
      title = "Rapport Annuel COGES";
      arabicTitle = "Rapport Annuel des Paiements COGES";
      periodText = String(now.getFullYear());
      targetPayments = payments.filter((p: any) => {
        const d = p.datePaid ? new Date(p.datePaid) : null;
        return d && d.getFullYear() === now.getFullYear();
      });
      headers = ["Mois", "Nombre de Reçus", "Membres Payeurs uniques", "Montant Total"];
      
      const monthsMap = new Map<number, any>();
      for (let i = 0; i < 12; i++) {
        monthsMap.set(i, { count: 0, payers: new Set(), total: 0 });
      }
      targetPayments.forEach(p => {
        const d = p.datePaid ? new Date(p.datePaid) : null;
        if (d) {
          const m = d.getMonth();
          const monthData = monthsMap.get(m);
          monthData.count += 1;
          monthData.payers.add(p.studentId || p.receivedFrom);
          monthData.total += (p.amount || 0);
        }
      });
      
      const monthsFr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      dataRows = Array.from(monthsMap.entries()).map(([mIdx, val]) => [
        monthsFr[mIdx],
        val.count,
        val.payers.size,
        `${val.total.toLocaleString("fr-FR")} F CFA`
      ]).filter(row => parseInt(row[1]) > 0);
    } else if (activeReportType === "class") {
      title = "Rapport par Classe";
      arabicTitle = "Rapport des encaissements COGES par Classe";
      periodText = "Toutes périodes";
      headers = ["Classe", "Nombre de Paiements", "Montant Total", "Moyenne / Paiement"];
      
      const classMap = new Map<string, { count: number; total: number }>();
      payments.forEach(p => {
        const c = p.classe || "Non Spécifiée";
        const current = classMap.get(c) || { count: 0, total: 0 };
        current.count += 1;
        current.total += (p.amount || 0);
        classMap.set(c, current);
      });
      
      dataRows = Array.from(classMap.entries()).map(([cls, val]) => [
        cls,
        val.count,
        `${val.total.toLocaleString("fr-FR")} F CFA`,
        `${Math.round(val.total / val.count).toLocaleString("fr-FR")} F CFA`
      ]);
    } else if (activeReportType === "purpose") {
      title = "Rapport par Motif";
      arabicTitle = "Rapport des encaissements COGES par Motif de paiement";
      periodText = "Toutes périodes";
      headers = ["Motif", "Nombre de Paiements", "Montant Total", "Pourcentage"];
      
      const totalAll = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
      const purposeMap = new Map<string, { count: number; total: number }>();
      payments.forEach(p => {
        const prp = p.purpose || "Autre Motif";
        const current = purposeMap.get(prp) || { count: 0, total: 0 };
        current.count += 1;
        current.total += (p.amount || 0);
        purposeMap.set(prp, current);
      });
      
      dataRows = Array.from(purposeMap.entries()).map(([prp, val]) => [
        prp,
        val.count,
        `${val.total.toLocaleString("fr-FR")} F CFA`,
        `${totalAll > 0 ? Math.round((val.total / totalAll) * 100) : 0}%`
      ]);
    }

    const reportTotalAmount = targetPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const reportTotalCount = targetPayments.length;

    return {
      title,
      arabicTitle,
      periodText,
      headers,
      dataRows,
      totalAmount: reportTotalAmount,
      totalCount: reportTotalCount,
      payments: targetPayments
    };
  };

  const exportToCSV = (title: string, headers: string[], rows: any[][]) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const report = getReportDetails();
    if (!report) return;
    exportToCSV(report.title, report.headers, report.dataRows);
  };

  const handlePrintReport = () => {
    setTimeout(() => window.print(), 150);
  };

  return (
    <div className="h-full flex flex-col relative bg-slate-50/50">
      {/* ── PRINT STYLES ─────────────────────────────────────────────────── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #coges-print-area, #coges-print-area * { visibility: visible; }
          #coges-report-print-area, #coges-report-print-area * { visibility: visible; }
          
          #coges-print-area {
            position: fixed; left: 0; top: 0;
            width: 100vw; height: 100vh;
            background: white;
            display: flex; align-items: center; justify-content: center;
            z-index: 99999;
          }
          #coges-report-print-area {
            position: fixed; left: 0; top: 0;
            width: 100vw; height: 100vh;
            background: white;
            padding: 40px;
            box-sizing: border-box;
            z-index: 99999;
          }
          @page { size: A4 landscape; margin: 0; }
        }
      `}} />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="shrink-0 px-8 py-5 bg-white border-b border-slate-100 flex items-center justify-between z-20 print:hidden shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Paiement COGES</h1>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">École Plus</span>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-0.5">Comité de Gestion des Établissements Scolaires (COGES)</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Reports Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setReportsOpen(!reportsOpen)}
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 bg-white font-bold gap-2 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <FileText size={16} className="text-indigo-500" />
              <span>Rapports</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${reportsOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {reportsOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setReportsOpen(false)}></div>
                <div className="absolute right-0 top-[calc(100%+6px)] w-60 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-40 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="px-4 py-1.5 border-b border-slate-50 mb-1.5 text-left">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sélectionner un rapport</span>
                  </div>
                  <button
                    onClick={() => { setActiveReportType("daily"); setReportsOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <CalendarDays size={15} className="text-indigo-500" />
                    <span>Rapport Journalier</span>
                  </button>
                  <button
                    onClick={() => { setActiveReportType("weekly"); setReportsOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <CalendarDays size={15} className="text-indigo-500" />
                    <span>Rapport Hebdomadaire</span>
                  </button>
                  <button
                    onClick={() => { setActiveReportType("monthly"); setReportsOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <CalendarDays size={15} className="text-indigo-500" />
                    <span>Rapport Mensuel</span>
                  </button>
                  <button
                    onClick={() => { setActiveReportType("yearly"); setReportsOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <CalendarDays size={15} className="text-indigo-500" />
                    <span>Rapport Annuel</span>
                  </button>
                  <div className="h-px bg-slate-100/80 my-1.5"></div>
                  <button
                    onClick={() => { setActiveReportType("class"); setReportsOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <GraduationCap size={15} className="text-purple-500" />
                    <span>Rapport par Classe</span>
                  </button>
                  <button
                    onClick={() => { setActiveReportType("purpose"); setReportsOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <FileCheck2 size={15} className="text-emerald-500" />
                    <span>Rapport par Motif</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={openDialog}
            className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-md shadow-indigo-100 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus size={16} />
            Nouveau Reçu
          </Button>
        </div>
      </header>

      {/* ── STATS BAR (GLASSMORPHISM CARDS) ───────────────────────────────── */}
      <section className="shrink-0 px-8 py-6 grid grid-cols-1 md:grid-cols-4 gap-5 print:hidden">
        {/* Card 1: Total amount */}
        <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent border border-indigo-500/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group hover:scale-[1.01] text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-none">Total Collecté</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-700">
              <Coins className="size-4 group-hover:animate-bounce" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {filteredTotal.toLocaleString("fr-FR")}
              <span className="text-xs font-black text-indigo-600 ml-1.5">F CFA</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1.5">Sur {successfulCount} reçu(s) valide(s)</p>
          </div>
        </div>

        {/* Card 2: Successful */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group hover:scale-[1.01] text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Paiements Réussis</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {successfulCount}
              <span className="text-xs font-bold text-emerald-600 ml-1.5">reçu(s)</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1.5">Taux de réussite : {successRate}%</p>
          </div>
        </div>

        {/* Card 3: Failed/Cancelled */}
        <div className="bg-gradient-to-br from-rose-500/10 via-rose-600/5 to-transparent border border-rose-500/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group hover:scale-[1.01] text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest leading-none">Paiements Annulés</span>
            <div className="w-8 h-8 rounded-xl bg-rose-600/10 flex items-center justify-center text-rose-700">
              <AlertTriangle className="size-4 text-rose-600" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {failedCount}
              <span className="text-xs font-bold text-rose-600 ml-1.5">reçu(s)</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1.5">Sécurité des transactions 100%</p>
          </div>
        </div>

        {/* Card 4: Average amount */}
        <div className="bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-transparent border border-purple-500/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 group hover:scale-[1.01] text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-purple-700 uppercase tracking-widest leading-none">Panier Moyen</span>
            <div className="w-8 h-8 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-700">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {averageAmount.toLocaleString("fr-FR")}
              <span className="text-xs font-black text-purple-600 ml-1.5">F CFA</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1.5">Montant moyen par reçu</p>
          </div>
        </div>
      </section>

      {/* ── ADVANCED FILTER SYSTEM ───────────────────────────────────────── */}
      <section className="shrink-0 px-8 pb-4 print:hidden">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher un élève, N° reçu, motif..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-xs font-bold outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Core quick filters */}
            <div className="flex items-center gap-2">
              {/* Class Filter */}
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white font-bold text-xs text-slate-700 outline-none transition-all cursor-pointer appearance-none pr-8 min-w-[140px]"
                >
                  <option value="all">Toutes les classes</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Period Filter */}
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white font-bold text-xs text-slate-700 outline-none transition-all cursor-pointer appearance-none pr-8 min-w-[140px]"
                >
                  <option value="all">Toutes les périodes</option>
                  <option value="today">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                  <option value="year">Cette année</option>
                  <option value="custom">Personnalisé...</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Advanced toggle */}
              <Button
                variant="ghost"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`h-11 px-3 rounded-xl border ${showAdvancedFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} font-bold text-xs gap-1.5 transition-all`}
              >
                <Filter size={14} />
                <span>Filtres Avancés</span>
              </Button>

              {/* Reset button */}
              {(search || selectedClass !== "all" || selectedPeriod !== "all" || selectedStatus !== "all" || minAmount || maxAmount) && (
                <button
                  onClick={handleResetFilters}
                  className="h-11 w-11 rounded-xl border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-500 bg-white flex items-center justify-center transition-all cursor-pointer"
                  title="Réinitialiser"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Advanced collapsible items */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100/80 animate-in slide-in-from-top-2 duration-300">
              {/* Custom Date Range */}
              {selectedPeriod === "custom" && (
                <>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Du</Label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Au</Label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-xs font-bold text-slate-700 outline-none"
                    />
                  </div>
                </>
              )}

              {/* Status filter */}
              <div className="space-y-1.5 text-left">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Statut</Label>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white font-bold text-xs text-slate-700 outline-none transition-all cursor-pointer appearance-none pr-8"
                  >
                    <option value="all">Tous</option>
                    <option value="Validé">Validé</option>
                    <option value="Annulé">Annulé</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Amount range */}
              <div className="space-y-1.5 text-left">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Montant Min</Label>
                <input
                  type="number"
                  placeholder="Min F CFA"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-xs font-bold text-slate-700 outline-none"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Montant Max</Label>
                <input
                  type="number"
                  placeholder="Max F CFA"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white text-xs font-bold text-slate-700 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── TABLE ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-8 pb-8 print:hidden">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">N° Reçu</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Élève / Payeur</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Classe</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Motif</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Montant</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</th>
                <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPayments.map((p: any) => (
                <tr key={p.id} className="hover:bg-indigo-50/10 transition-colors group">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black tracking-wide">
                      #{p.receiptNumber}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-400">
                    {p.datePaid ? format(new Date(p.datePaid), "dd MMM yyyy HH:mm", { locale: fr }) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm shadow-indigo-100">
                        {(p.studentName || p.receivedFrom || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900 leading-tight truncate max-w-[180px]">{p.studentName || p.receivedFrom}</p>
                        {p.studentName && (
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5 leading-none">Payeur : {p.receivedFrom}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {p.classe ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
                        {p.classe}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs font-medium">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-slate-500 max-w-[140px] truncate">{p.purpose}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-black text-slate-900">
                      {(p.amount || 0).toLocaleString("fr-FR")}
                      <span className="text-[10px] font-semibold text-slate-400 ml-1">F CFA</span>
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {p.status === "Annulé" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-black">Annulé</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black">Validé</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handlePrint(p)}
                      className="opacity-0 group-hover:opacity-100 transition-all h-8 w-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center ml-auto cursor-pointer"
                      title="Imprimer le reçu"
                    >
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Banknote className="size-6 text-slate-300" />
                    </div>
                    <p className="font-bold text-sm text-slate-400">Aucun reçu COGES trouvé</p>
                    <p className="text-xs text-slate-300 mt-1">Ajustez vos filtres ou créez un nouveau reçu en cliquant sur 'Nouveau Reçu'.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── DIALOG STEPPER FORM (NEW PAYMENT WIZARD) ────────────────────── */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 rounded-3xl overflow-visible border-none shadow-2xl bg-white">
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-t-3xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 translate-y-1/4 translate-x-1/4 pointer-events-none">
              <Banknote size={180} />
            </div>

            <div className="flex items-center gap-4 relative z-10 text-left">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
                <Banknote className="size-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-1.5">
                  <span>Nouveau Reçu COGES</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">COGES Payment</span>
                </DialogTitle>
                <p className="text-indigo-100 text-xs mt-0.5 font-semibold">Enregistrement du paiement et émission du reçu</p>
              </div>
            </div>

            {/* Progress Stepper Bar */}
            {wizardStatus === "idle" && (
              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 1 ? 'bg-white text-indigo-700 shadow-sm' : 'bg-indigo-400/40 text-indigo-200'}`}>1</div>
                  <span className={`text-[10px] font-bold ${step >= 1 ? 'text-white' : 'text-indigo-200'}`}>Élève</span>
                </div>
                <div className="flex-1 h-0.5 bg-white/15 mx-2">
                  <div className="h-full bg-white transition-all duration-300" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 2 ? 'bg-white text-indigo-700 shadow-sm' : 'bg-indigo-400/40 text-indigo-200'}`}>2</div>
                  <span className={`text-[10px] font-bold ${step >= 2 ? 'text-white' : 'text-indigo-200'}`}>Informations</span>
                </div>
                <div className="flex-1 h-0.5 bg-white/15 mx-2">
                  <div className="h-full bg-white transition-all duration-300" style={{ width: step <= 2 ? '0%' : '100%' }}></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step >= 3 ? 'bg-white text-indigo-700 shadow-sm' : 'bg-indigo-400/40 text-indigo-200'}`}>3</div>
                  <span className={`text-[10px] font-bold ${step >= 3 ? 'text-white' : 'text-indigo-200'}`}>Confirmation</span>
                </div>
              </div>
            )}
          </div>

          {/* Form / Wizard Content */}
          <div className="p-0 overflow-hidden bg-white rounded-b-3xl">
            {wizardStatus === "success" && successData ? (
              /* Success screen */
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md border border-emerald-100 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900">Paiement enregistré avec succès !</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1">L'opération a été effectuée. Reçu N° #{successData.receiptNumber}</p>
                </div>
                
                {/* Transaction details card */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs font-bold text-slate-600">
                  <div className="flex justify-between border-b border-slate-100/80 pb-2">
                    <span className="text-slate-400">Payeur</span>
                    <span className="text-slate-800">{successData.receivedFrom}</span>
                  </div>
                  {selectedStudent && (
                    <div className="flex justify-between border-b border-slate-100/80 pb-2">
                      <span className="text-slate-400">Élève</span>
                      <span className="text-slate-800">{selectedStudent.nomEtudiant}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-100/80 pb-2">
                    <span className="text-slate-400">Motif</span>
                    <span className="text-slate-800">{successData.purpose}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="text-slate-400 font-bold">Montant</span>
                    <span className="text-indigo-600 font-black">{successData.amount.toLocaleString()} F CFA</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-3">
                  <Button
                    onClick={() => handlePrint(successData)}
                    className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs cursor-pointer shadow-lg shadow-indigo-100"
                  >
                    <Printer size={15} />
                    <span>Imprimer le reçu</span>
                  </Button>
                  <Button
                    onClick={openDialog}
                    variant="outline"
                    className="flex-1 h-11 rounded-xl border-slate-200 font-bold text-xs text-slate-700 cursor-pointer"
                  >
                    <Plus size={15} className="text-slate-400" />
                    <span>Nouveau Reçu</span>
                  </Button>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    className="h-11 rounded-xl font-bold text-xs text-slate-400 cursor-pointer"
                  >
                    <span>Fermer</span>
                  </Button>
                </div>
              </div>
            ) : wizardStatus === "error" ? (
              /* Error screen */
              <div className="p-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-md">
                  <AlertTriangle size={36} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-rose-600">Échec de l'enregistrement du reçu</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Une erreur est survenue lors du traitement en base de données.</p>
                </div>
                <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-4 text-xs font-bold text-rose-700 text-center leading-relaxed">
                  {errorMessage || "Échec inconnu. Veuillez contacter l'administrateur ou vérifier votre connexion."}
                </div>
                <div className="flex gap-3 pt-3">
                  <Button
                    onClick={() => setWizardStatus("idle")}
                    className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Retour et réessayer</span>
                  </Button>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    className="h-11 rounded-xl border-slate-200 font-bold text-xs text-slate-400 cursor-pointer"
                  >
                    <span>Fermer</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Wizard Steps */
              <form onSubmit={handleSubmit}>
                {step === 1 && (
                  /* Step 1: Student selection */
                  <div className="p-7 space-y-5 animate-in fade-in duration-200">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-3.5 items-start text-left">
                      <Info className="size-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="text-xs font-semibold text-slate-500 leading-relaxed">
                        <span className="font-bold text-indigo-700">Simplification & Précision</span>: Recherchez un élève pour pré-remplir ses données et sa classe, ou continuez sans sélectionner d'élève pour un paiement libre.
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <GraduationCap className="size-3.5 text-indigo-500" />
                        <span>Rechercher et sélectionner un élève (Optionnel)</span>
                      </Label>
                      <StudentSearch
                        selected={selectedStudent}
                        onSelect={handleSelectStudent}
                        onClear={handleClearStudent}
                      />
                    </div>

                    {selectedStudent && (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs font-bold text-indigo-700 space-y-1 animate-in fade-in duration-200 text-left">
                        <p>✓ Élève sélectionné : <span className="font-black text-slate-900">{selectedStudent.nomEtudiant}</span></p>
                        {selectedStudent.classe && <p>✓ Classe : <span className="font-black text-slate-900">{selectedStudent.classe}</span></p>}
                        {selectedStudent.nomPere && <p>✓ Nom du père : <span className="font-black text-slate-900">{selectedStudent.nomPere}</span></p>}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs cursor-pointer shadow-lg shadow-indigo-100/50"
                      >
                        <span>Continuer vers le paiement</span>
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  /* Step 2: Information input */
                  <div className="p-7 space-y-5 text-left animate-in fade-in duration-200">
                    {/* receivedFrom */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Reçu de M. / Mme *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          required
                          value={formData.receivedFrom}
                          onChange={(e) => setFormData({ ...formData, receivedFrom: e.target.value })}
                          placeholder="Nom complet du payeur"
                          className="h-12 pl-10 rounded-xl border-slate-200 bg-slate-50/50 font-bold focus:bg-white text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Amount + Purpose */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Montant (F CFA) *
                        </Label>
                        <Input
                          required
                          type="number"
                          min={1}
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="0"
                          className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-black text-lg text-indigo-600 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Motif du paiement *
                        </Label>
                        <div className="relative">
                          <select
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            className="w-full h-12 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 font-bold text-xs text-slate-700 outline-none focus:bg-white cursor-pointer appearance-none pr-8"
                          >
                            <option value="Cotisation Annuelle COGES">Cotisation Annuelle COGES</option>
                            <option value="Droit d'inscription">Frais d'inscription</option>
                            <option value="Frais de scolarité additionnels">Frais scolaires additionnels</option>
                            <option value="Autre">Autre motif...</option>
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {formData.purpose === "Autre" && (
                      <div className="space-y-2 animate-in fade-in duration-200">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Saisir le motif personnalisé *
                        </Label>
                        <Input
                          required
                          value={customPurpose}
                          onChange={(e) => setCustomPurpose(e.target.value)}
                          placeholder="Ex: Contribution peinture classe"
                          className="h-12 rounded-xl border-slate-200 bg-slate-50/50 font-bold focus:bg-white text-xs text-slate-800"
                        />
                      </div>
                    )}

                    {/* Amount in letters */}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                        <span>Montant en lettres</span>
                        <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 font-bold">Génération automatique</span>
                      </Label>
                      <Input
                        value={formData.amountLetters}
                        onChange={(e) => setFormData({ ...formData, amountLetters: e.target.value })}
                        placeholder={formData.amount ? numberToFrench(Number(formData.amount)) : "ex: Mille deux cents Francs CFA"}
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-semibold focus:bg-white text-xs text-slate-500 italic"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep(1)}
                        className="h-11 px-5 rounded-xl border-slate-200 font-bold text-xs text-slate-500 gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={14} />
                        <span>Précédent</span>
                      </Button>
                      <Button
                        type="button"
                        disabled={!formData.receivedFrom || !formData.amount}
                        onClick={() => setStep(3)}
                        className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs cursor-pointer shadow-lg shadow-indigo-100/50 disabled:opacity-50"
                      >
                        <span>Vérifier & Confirmer</span>
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  /* Step 3: Confirmation and summary preview */
                  <div className="p-7 space-y-5 text-left animate-in fade-in duration-200">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3.5 items-start">
                      <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div className="text-xs font-semibold text-amber-800 leading-relaxed">
                        <span className="font-bold">Veuillez confirmer les informations</span>: Veuillez vérifier les détails du reçu avant de valider. Après confirmation, le montant sera immédiatement enregistré dans les comptes du COGES.
                      </div>
                    </div>

                    {/* Summary cards */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {/* Big amount strip */}
                      <div className="p-5 text-center bg-indigo-50/30">
                        <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest leading-none mb-2">Montant Total du Paiement</p>
                        <h4 className="text-3xl font-black text-indigo-700 tracking-tight leading-none">
                          {Number(formData.amount).toLocaleString()}
                          <span className="text-sm font-black text-slate-900 ml-1.5">F CFA</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold italic mt-2.5">
                          « {formData.amountLetters || numberToFrench(Number(formData.amount))} »
                        </p>
                      </div>

                      {/* Details */}
                      <div className="p-5 space-y-3.5 text-xs font-bold text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Payeur :</span>
                          <span className="text-slate-800">{formData.receivedFrom}</span>
                        </div>
                        {selectedStudent && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Élève :</span>
                              <span className="text-indigo-600">{selectedStudent.nomEtudiant}</span>
                            </div>
                            {selectedStudent.classe && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Classe :</span>
                                <span className="text-slate-800 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full text-[10px]">{selectedStudent.classe}</span>
                              </div>
                            )}
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400">Motif :</span>
                          <span className="text-slate-800">{formData.purpose === "Autre" ? customPurpose : formData.purpose}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setStep(2)}
                        className="h-11 px-5 rounded-xl border-slate-200 font-bold text-xs text-slate-500 gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={14} />
                        <span>Modifier</span>
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black gap-2 text-xs cursor-pointer shadow-lg shadow-indigo-200"
                      >
                        {loading ? (
                          <><Loader2 className="size-4 animate-spin" /> Enregistrement...</>
                        ) : (
                          <><CheckCircle2 className="size-4" /> Confirmer le paiement</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG REPORT DETAILS ────────────────────────────────────────── */}
      <Dialog open={activeReportType !== null} onOpenChange={() => setActiveReportType(null)}>
        <DialogContent className="sm:max-w-[700px] p-0 rounded-3xl overflow-visible border-none shadow-2xl bg-white max-h-[85vh] flex flex-col">
          {activeReportType && getReportDetails() && (
            <>
              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 text-white rounded-t-3xl flex justify-between items-center relative overflow-hidden text-left">
                <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 opacity-15 pointer-events-none">
                  <FileText size={180} />
                </div>

                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight leading-none">{getReportDetails()?.title}</h3>
                    <p className="text-indigo-200 text-[10px] font-bold mt-1.5 leading-none">{getReportDetails()?.arabicTitle}</p>
                  </div>
                </div>

                <div className="text-right relative z-10 font-bold text-xs">
                  <span className="inline-block text-[9px] font-bold bg-white/15 px-2.5 py-1 rounded-full">{getReportDetails()?.periodText}</span>
                </div>
              </div>

              {/* Summary Metrics Strip */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100 p-4 text-center shrink-0">
                <div className="py-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total des Recettes</span>
                  <p className="text-xl font-black text-indigo-700 mt-1">{getReportDetails()?.totalAmount.toLocaleString()} F CFA</p>
                </div>
                <div className="py-1 col-span-1">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Nombre de reçus émis</span>
                  <p className="text-xl font-black text-slate-900 mt-1">{getReportDetails()?.totalCount} reçu(s)</p>
                </div>
              </div>

              {/* Table details (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {getReportDetails()?.headers.map((h, i) => (
                          <th key={i} className="p-3 font-black text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                      {getReportDetails()?.dataRows.map((row: any[], i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          {row.map((cell: any, j: number) => (
                            <td key={j} className="p-3 font-semibold">{cell}</td>
                          ))}
                        </tr>
                      ))}

                      {getReportDetails()?.dataRows.length === 0 && (
                        <tr>
                          <td colSpan={getReportDetails()?.headers.length || 5} className="p-10 text-center text-slate-400 font-bold">
                            Aucun paiement enregistré pour cette période.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-100 rounded-b-3xl flex justify-end gap-3 shrink-0">
                <Button
                  onClick={() => setActiveReportType(null)}
                  variant="ghost"
                  className="h-10 px-5 rounded-xl font-bold text-xs text-slate-500 cursor-pointer"
                >
                  Fermer
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  className="h-10 px-4 rounded-xl border-slate-200 font-bold text-xs text-slate-700 gap-2 cursor-pointer bg-white"
                >
                  <Download size={14} className="text-slate-400" />
                  <span>Exporter CSV</span>
                </Button>
                <Button
                  onClick={handlePrintReport}
                  className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 text-xs cursor-pointer shadow-md shadow-indigo-100"
                >
                  <Printer size={14} />
                  <span>Imprimer le rapport</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── PRINT RECEIPT AREA (A4 Landscape Layout) ────────────────────── */}
      {lastReceipt && (
        <div id="coges-print-area" className="hidden print:flex w-full h-full items-center justify-center bg-white">
          <div
            style={{
              width: "270mm",
              height: "185mm",
              border: "6px solid #0e2a4a",
              borderRadius: "14px",
              background: "white",
              display: "flex",
              flexDirection: "column",
              padding: "28px 32px",
              position: "relative",
              overflow: "hidden",
              fontFamily: "Arial, sans-serif",
            }}
          >
            {/* Watermark laurels */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.04, pointerEvents: "none" }}>
              <BookOpen style={{ width: 320, height: 320, color: "#0e2a4a" }} />
            </div>

            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "2px solid #0e2a4a22", paddingBottom: "16px", marginBottom: "16px", position: "relative", zIndex: 1 }}>
              {/* Shield logo */}
              {branchInfo?.logoPath ? (
                <div style={{ width: 86, height: 86, borderRadius: "12px", overflow: "hidden", border: "2px solid #0e2a4a22", flexShrink: 0 }}>
                  <img src={branchInfo.logoPath} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <svg viewBox="0 0 100 120" style={{ width: 72, height: 86, color: "#0e2a4a", fill: "none", stroke: "#0e2a4a", strokeWidth: 3, flexShrink: 0 }}>
                  <path d="M50 4 L96 22 L96 68 C96 93 50 116 50 116 C50 116 4 93 4 68 L4 22 Z" />
                  <circle cx="50" cy="60" r="26" strokeWidth="2" />
                  <path d="M37 66 L50 71 L63 66 L63 48 L50 53 L37 48 Z" fill="#0e2a4a" stroke="none" />
                  <line x1="50" y1="53" x2="50" y2="71" stroke="white" strokeWidth="2.5" />
                  <circle cx="50" cy="30" r="5" fill="#0e2a4a" stroke="none" />
                </svg>
              )}

              {/* School name */}
              <div style={{ flex: 1, textAlign: "center", padding: "0 16px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#0e2a4a", letterSpacing: "1px", margin: "0 0 4px 0" }}>
                  {branchInfo?.branchName || "C.ES FRANCO ARABE C.M.S.A"}
                </h1>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", letterSpacing: "3px", margin: "0 0 6px 0" }}>
                  {branchInfo?.branchAlias || "Assiduité – Travail – Discipline"}
                </p>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "#1e40af", fontStyle: "italic", margin: 0 }}>
                  Niveau Educatif : {(lastReceipt.student?.educationalLevel || "Lycée").toUpperCase()}
                </p>
              </div>

              {/* REÇU badge + N° */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                <div style={{ background: "#0e2a4a", color: "white", padding: "8px 22px", borderRadius: "10px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "3px" }}>REÇU</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 900, color: "#0e2a4a" }}>N°</span>
                  <span style={{ fontSize: "18px", fontWeight: 900, color: "#dc2626" }}>{lastReceipt.receiptNumber}</span>
                </div>
              </div>
            </div>

            {/* BODY ROWS */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", padding: "0 4px", position: "relative", zIndex: 1 }}>
              {/* Montant */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #0e2a4a33", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "white" }}>
                  <Banknote style={{ width: 18, height: 18, color: "#0e2a4a" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#0e2a4a", width: "150px", flexShrink: 0 }}>Montant :</span>
                <div style={{ flex: 1, borderBottom: "2px dotted #0e2a4a55", paddingBottom: "2px", display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: "6px" }}>
                  <span style={{ fontSize: "24px", fontWeight: 900, color: "#1d4ed8" }}>{lastReceipt.amount.toLocaleString()}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8", marginBottom: "2px" }}>F CFA</span>
                </div>
              </div>

              {/* Reçu de */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #0e2a4a33", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "white" }}>
                  <User style={{ width: 18, height: 18, color: "#0e2a4a" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#0e2a4a", width: "150px", flexShrink: 0 }}>Reçu de M. / Mme :</span>
                <div style={{ flex: 1, borderBottom: "2px dotted #0e2a4a55", paddingBottom: "2px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#0e2a4a", marginLeft: "8px" }}>{lastReceipt.receivedFrom}</span>
                </div>
              </div>

              {/* Montant en lettres */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #0e2a4a33", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "white" }}>
                  <FileText style={{ width: 18, height: 18, color: "#0e2a4a" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#0e2a4a", width: "150px", flexShrink: 0 }}>Montant en lettres :</span>
                <div style={{ flex: 1, borderBottom: "2px dotted #0e2a4a55", paddingBottom: "2px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#334155", fontStyle: "italic", marginLeft: "8px" }}>{lastReceipt.amountLetters}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "-4px" }}>
                <div style={{ width: 36, flexShrink: 0 }}></div>
                <div style={{ width: "162px", flexShrink: 0 }}></div>
                <div style={{ flex: 1, borderBottom: "2px dotted #0e2a4a55", height: "14px" }}></div>
              </div>

              {/* Pour */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #0e2a4a33", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "white" }}>
                  <FileCheck2 style={{ width: 18, height: 18, color: "#0e2a4a" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#0e2a4a", width: "60px", flexShrink: 0 }}>Pour :</span>
                <div style={{ flex: 1, borderBottom: "2px dotted #0e2a4a55", paddingBottom: "2px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, color: "#0e2a4a", marginLeft: "8px" }}>{lastReceipt.purpose}</span>
                </div>
              </div>

              {/* Date */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #0e2a4a33", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "white" }}>
                  <CalendarDays style={{ width: 18, height: 18, color: "#0e2a4a" }} />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#0e2a4a" }}>Maradi, le :</span>
                <div style={{ width: "200px", borderBottom: "2px dotted #0e2a4a55", paddingBottom: "2px", textAlign: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#0e2a4a" }}>
                    {lastReceipt.datePaid ? format(new Date(lastReceipt.datePaid), "dd  /  MM  /  yyyy") : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "12px", padding: "0 4px", position: "relative", zIndex: 1 }}>
              {/* Signature box */}
              <div style={{ width: "200px", height: "80px", border: "1.5px dashed #0e2a4a33", borderRadius: "10px", padding: "10px", position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <span style={{ fontSize: "11px", fontWeight: 700 }}>Signature</span>
                </div>
                <div style={{ position: "absolute", bottom: "14px", left: "12px", right: "12px", borderBottom: "1.5px dotted #0e2a4a44" }}></div>
              </div>

              {/* Watermark laurels center */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.15 }}>
                <BookOpen style={{ width: 56, height: 56, color: "#0e2a4a" }} />
              </div>

              {/* Stamp PAYÉ */}
              <div style={{ width: "110px", height: "110px", position: "relative" }}>
                <div style={{
                  position: "absolute", inset: 0, border: "4px solid #0e2a4a",
                  borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", flexDirection: "column",
                  transform: "rotate(-12deg)", background: "rgba(255,255,255,0.6)",
                }}>
                  <div style={{ position: "absolute", inset: "6px", border: "1px solid #0e2a4a66", borderRadius: "50%" }}></div>
                  <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                    <path id="pr" d="M 50 8 A 42 42 0 1 1 49.9 8" fill="none" />
                    <text style={{ fontSize: "9px", fontWeight: 900, fill: "#0e2a4a", letterSpacing: "1px" }} textAnchor="middle">
                      <textPath href="#pr" startOffset="50%">C.ES FRANCO ARABE C.M.S.A ★ ASSIDUITÉ ★</textPath>
                    </text>
                  </svg>
                  <span style={{ fontSize: "20px", fontWeight: 900, color: "#0e2a4a", letterSpacing: "1px", zIndex: 1 }}>PAYÉ</span>
                  <CheckCircle2 style={{ width: 22, height: 22, color: "#0e2a4a", zIndex: 1 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINT REPORT AREA ─────────────────────────────────────────────── */}
      {activeReportType && getReportDetails() && (
        <div id="coges-report-print-area" className="hidden print:block bg-white p-10 font-sans w-full h-full text-slate-800">
          <div style={{ borderBottom: "4px solid #0e2a4a", paddingBottom: "16px", marginBottom: "28px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 900, color: "#0e2a4a", textAlign: "center", margin: 0 }}>
              {getReportDetails()?.title}
            </h1>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "#4f46e5", textAlign: "center", marginTop: "6px", marginBottom: 0 }}>
              {getReportDetails()?.arabicTitle}
            </p>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#64748b", textAlign: "center", marginTop: "6px", marginBottom: 0 }}>
              Période : {getReportDetails()?.periodText}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>Total des Recettes</p>
              <p style={{ fontSize: "24px", fontWeight: 900, color: "#0e2a4a", margin: "6px 0 0 0" }}>
                {getReportDetails()?.totalAmount.toLocaleString("fr-FR")} F CFA
              </p>
            </div>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>Nombre de Reçus</p>
              <p style={{ fontSize: "24px", fontWeight: 900, color: "#0e2a4a", margin: "6px 0 0 0" }}>
                {getReportDetails()?.totalCount} reçu(s)
              </p>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1" }}>
            <thead>
              <tr style={{ backgroundColor: "#f1f5f9" }}>
                {getReportDetails()?.headers.map((h, i) => (
                  <th key={i} style={{ padding: "10px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#475569", border: "1px solid #cbd5e1", textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getReportDetails()?.dataRows.map((row: any[], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  {row.map((cell: any, j: number) => (
                    <td key={j} style={{ padding: "10px", fontSize: "11px", fontWeight: 600, color: "#334155", border: "1px solid #cbd5e1" }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              {getReportDetails()?.dataRows.length === 0 && (
                <tr>
                  <td colSpan={getReportDetails()?.headers.length || 5} style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "#94a3b8", fontWeight: 700 }}>
                    Aucune transaction trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: "60px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
            <p>Rapport généré par le système École Plus le {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
            <div style={{ borderTop: "1px solid #cbd5e1", width: "180px", textAlign: "center", paddingTop: "8px" }}>
              Signature Direction
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
