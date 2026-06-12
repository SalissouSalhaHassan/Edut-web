"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  BarChart3, Calendar, Search, Printer, ChevronLeft, ChevronRight,
  TrendingUp, BookOpen, Clock, Users, Eye, ClipboardCheck, ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportsClientProps {
  teachers: any[];
  globalStats: {
    totalTeachers: number;
    totalScheduled: number;
    totalAttended: number;
    totalAbsent: number;
    overallRate: number;
  };
  filterType: "day" | "week" | "month" | "year";
  date: string;
}

export default function ReportsClient({
  teachers,
  globalStats,
  filterType,
  date,
}: ReportsClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleDateChange = (newDate: string) => {
    router.push(`?date=${newDate}&filter=${filterType}`);
  };

  const handleFilterChange = (newFilter: "day" | "week" | "month" | "year") => {
    router.push(`?date=${date}&filter=${newFilter}`);
  };

  const shiftDate = (amount: number) => {
    const d = new Date(date);
    if (filterType === "day") {
      d.setDate(d.getDate() + amount);
    } else if (filterType === "week") {
      d.setDate(d.getDate() + amount * 7);
    } else if (filterType === "month") {
      d.setMonth(d.getMonth() + amount);
    } else {
      d.setFullYear(d.getFullYear() + amount);
    }
    handleDateChange(d.toISOString().split("T")[0]);
  };

  const filteredTeachers = teachers.filter((t) =>
    t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.departement.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFilterLabel = () => {
    const d = new Date(date);
    if (filterType === "day") {
      return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (filterType === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d.setDate(diff));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return `Semaine du ${mon.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${sun.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    if (filterType === "month") {
      return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    }
    return `Année Académique ${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 lg:p-10 space-y-8 print:p-0 print:bg-white">
      {/* Print-only layout stylesheet */}
      <style jsx global>{`
        @media print {
          nav, aside, header, footer, button, .no-print, input, select, .breadcrumbs {
            display: none !important;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          .print-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 20px !important;
          }
          .print-table th, .print-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 8px !important;
            font-size: 10px !important;
          }
        }
      `}</style>

      {/* Header (Hidden in Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centre de Rapports (RH)</h1>
            <span className="text-xl font-bold text-slate-400 font-arabic">مركز التقارير</span>
          </div>
          <p className="text-slate-500 font-medium text-sm">Vue d'ensemble de l'assiduité, présence et heures de cours assurées par vos enseignants.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/hr/attendance/qrcodes"
            className="h-11 px-5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 shadow-sm text-sm transition-all"
          >
            <Printer size={16} />
            Gérer les QR Codes
          </Link>
          <button
            onClick={() => window.print()}
            className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all text-sm"
          >
            <BarChart3 size={16} /> Exporter le Rapport
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Enseignants Actifs", value: globalStats.totalTeachers, color: "text-slate-700", bg: "bg-slate-50", desc: "Effectif total" },
          { label: "Séances Programmées", value: globalStats.totalScheduled, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Total heures" },
          { label: "Séances Assurées", value: globalStats.totalAttended, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Professeur présent" },
          { label: "Séances Absentes", value: globalStats.totalAbsent, color: "text-rose-600", bg: "bg-rose-50", desc: "Professeur absent" },
          { label: "Assiduité Globale", value: `${globalStats.overallRate}%`, color: "text-indigo-600", bg: "bg-indigo-50/50", desc: "Taux moyen", isRate: true },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{s.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn("text-3xl font-black leading-tight", s.color)}>{s.value}</span>
            </div>
            <span className="text-[9px] font-medium text-slate-500 mt-1 leading-none no-print">{s.desc}</span>
          </div>
        ))}
      </div>

      {/* Filters (Hidden in Print) */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
        {/* Filter Selection */}
        <div className="flex bg-slate-100/75 p-1 rounded-2xl border border-slate-200/40 w-full lg:w-auto h-12">
          {[
            { val: "day", label: "Jour" },
            { val: "week", label: "Semaine" },
            { val: "month", label: "Mois" },
            { val: "year", label: "Année" },
          ].map((tab) => (
            <button
              key={tab.val}
              onClick={() => handleFilterChange(tab.val as any)}
              className={cn(
                "flex-1 lg:flex-none px-6 h-full rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                filterType === tab.val
                  ? "bg-white text-indigo-600 shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
          <button
            onClick={() => shiftDate(-1)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-sm font-black text-slate-700 whitespace-nowrap">
              {getFilterLabel()}
            </span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          
          <div className="relative border-l border-slate-200 pl-4">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) handleDateChange(e.target.value);
              }}
              className="outline-none text-xs font-bold text-slate-600 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-3 h-10"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden print-area">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
          <div className="relative w-full md:w-[380px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              placeholder="Rechercher par enseignant ou département..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-11 bg-slate-50/50 rounded-2xl border border-slate-200 outline-none text-xs font-medium placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="text-xs font-bold text-slate-400">
            Affichage de {filteredTeachers.length} sur {teachers.length} enseignants
          </div>
        </div>

        <table className="w-full text-left border-collapse print-table">
          <thead>
            <tr className="bg-white border-b border-slate-100">
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">
                Enseignant <span className="text-slate-300 ml-1 font-arabic">الأستاذ</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Département <span className="text-slate-300 ml-1 font-arabic">القسم</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Heures Prog. <span className="text-slate-300 ml-1 font-arabic">المبرمجة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Heures Assurées <span className="text-slate-300 ml-1 font-arabic">المحاضرة</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Absences <span className="text-slate-300 ml-1 font-arabic">الغياب</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                Taux de Présence <span className="text-slate-300 ml-1 font-arabic">معدل الحضور</span>
              </th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right no-print">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 font-bold flex items-center justify-center text-sm uppercase shrink-0">
                        {t.nom.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-wide">{t.nom}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {t.empId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="px-2.5 py-1 bg-indigo-50/60 text-indigo-600 border border-indigo-100 text-[10px] font-black uppercase tracking-wider rounded-xl">
                      {t.departement}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center text-xs font-bold text-slate-700">
                    {t.scheduled}h
                  </td>
                  <td className="px-8 py-5 text-center text-xs font-bold text-emerald-600">
                    {t.attended}h
                  </td>
                  <td className="px-8 py-5 text-center text-xs font-bold text-rose-600">
                    {t.absent}h
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className={cn(
                        "text-xs font-black",
                        t.rate >= 90 ? "text-emerald-600" : t.rate >= 75 ? "text-amber-500" : "text-rose-500"
                      )}>
                        {t.rate}%
                      </span>
                      {/* Mini progress bar */}
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden no-print">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            t.rate >= 90 ? "bg-emerald-500" : t.rate >= 75 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${t.rate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right no-print">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/hr/attendance/teacher/${t.id}?date=${date}&filter=${filterType}`}
                        className="h-8 px-3.5 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Eye size={12} />
                        Détails
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <Users size={64} />
                    <p className="text-lg font-bold">Aucun enseignant trouvé</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
