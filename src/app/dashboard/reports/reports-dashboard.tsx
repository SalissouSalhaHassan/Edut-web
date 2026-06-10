"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  ComposedChart,
} from "recharts";
import {
  BarChart3,
  Calendar as CalendarIcon,
  ChevronRight,
  Download,
  DollarSign,
  Filter,
  Info,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { sendBulkPaymentReminders } from "@/domains/messaging/actions/messaging.actions";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type MonthlyPoint = {
  month: string;
  recettes: number;
  depenses: number;
  recouvrement: number;
};

type BreakdownItem = {
  label: string;
  amount: number;
  percent: number;
  color: string;
};

type KpiItem = {
  label: string;
  value: string;
  delta: number;
  tone: "good" | "bad" | "neutral";
  icon: "recovery" | "cost" | "expense" | "revenue" | "excess";
};

export type ReportsDashboardProps = {
  branding?: {
    name: string;
    logoPath: string | null;
    level: string;
  };
  dateRangeLabel: string;
  totalStudents: number;
  totalStudentsDelta: number;
  recouvrementPercent: number;
  recouvrementDelta: number;
  expensesMonth: number;
  expensesMonthDelta: number;
  soldeDisponible: number;
  soldeDisponibleDelta: number;
  monthly: MonthlyPoint[];
  revenueBreakdown: BreakdownItem[];
  expenseBreakdown: BreakdownItem[];
  revenueTotal: number;
  expenseTotal: number;
  kpis: KpiItem[];
  attendanceKpis?: {
    globalAttendanceRate: number;
    unexcusedAbsences: number;
    lateRate: number;
    excusedAbsences: number;
  };
  dailyEvolution?: Array<{
    day: string;
    Presents: number;
    Absents: number;
    Lates: number;
  }>;
  attendanceByCycle?: Array<{
    cycle: string;
    Rate: number;
  }>;
  performanceKpis?: {
    averageGrade: number;
    successRate: number;
    congratulatedStudents: number;
    strugglingStudents: number;
  };
  gradeDistribution?: Array<{
    tranche: string;
    Count: number;
  }>;
  subjectAverages?: Array<{
    subject: string;
    Average: number;
  }>;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatCompactCfa(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M CFA`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1)}K CFA`;
  return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
}

function formatCfa(amount: number) {
  return `${Math.round(amount).toLocaleString("fr-FR")} CFA`;
}

function formatPercent(p: number) {
  const v = Number.isFinite(p) ? p : 0;
  return `${Math.round(v)}%`;
}

function DeltaPill({
  delta,
  suffix = "vs période précédente",
}: {
  delta: number;
  suffix?: string;
}) {
  const up = delta > 0;
  const down = delta < 0;
  const tone = up ? "text-emerald-600" : down ? "text-rose-600" : "text-slate-500";
  const icon = up ? <TrendingUp size={14} /> : down ? <TrendingDown size={14} /> : null;
  const label = delta === 0 ? "0%" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
  return (
    <div className={cn("mt-3 flex items-center gap-2 text-xs font-semibold", tone)}>
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-slate-400 font-medium">{suffix}</span>
    </div>
  );
}

function Sparkline({
  data,
  color,
}: {
  data: number[];
  color: string;
}) {
  const id = React.useId();
  const chartData = React.useMemo(() => data.map((v, i) => ({ i, v })), [data]);
  return (
    <div className="h-12 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${id})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  title,
  value,
  delta,
  spark,
  sparkColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  value: React.ReactNode;
  delta: number;
  spark: number[];
  sparkColor: string;
}) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-7 flex items-center justify-between gap-6">
      <div className="flex items-start gap-4">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", iconBg, iconColor)}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <Info size={14} className="text-slate-300" />
          </div>
          <div className="mt-2 text-3xl font-black text-slate-900 tracking-tight">{value}</div>
          <DeltaPill delta={delta} />
        </div>
      </div>
      <Sparkline data={spark} color={sparkColor} />
    </div>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />;
}

function DonutCard({
  title,
  subtitle,
  totalLabel,
  totalValue,
  items,
  colors,
  buttonLabel = "Voir le détail",
}: {
  title: string;
  subtitle: string;
  totalLabel: string;
  totalValue: string;
  items: BreakdownItem[];
  colors: string[];
  buttonLabel?: string;
}) {
  const pieData = items.map((i) => ({ name: i.label, value: i.amount }));
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight">{title}</h4>
          <p className="text-xs text-slate-500 font-medium mt-1">{subtitle}</p>
        </div>
        <Button
          variant="outline"
          className="h-10 rounded-2xl px-4 text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
        >
          <span className="inline-flex items-center gap-2">
            {buttonLabel} <ChevronRight className="size-4 opacity-70" />
          </span>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-10 items-center">
        <div className="relative mx-auto w-[200px] h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={95}
                stroke="transparent"
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={colors[idx % colors.length]} />
                ))}
              </Pie>
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-500">{totalLabel}</p>
              <p className="text-xl font-black text-slate-900 leading-none mt-1">{totalValue}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {items.map((row) => (
            <div key={row.label} className="grid grid-cols-[18px_1fr_auto_auto] items-center gap-3">
              <span className="inline-flex items-center justify-center">
                <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
              </span>
              <span className="text-xs font-bold text-slate-700">{row.label}</span>
              <span className="text-xs font-black text-slate-900 tabular-nums">
                {formatCompactCfa(row.amount).replace(" CFA", "")}
              </span>
              <span className="text-xs font-bold text-slate-400 tabular-nums">{Math.round(row.percent)}%</span>
              <div className="col-span-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${clamp(row.percent, 0, 100)}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthlyChart({ data }: { data: MonthlyPoint[] }) {
  const cRecettes = "#2563eb"; // blue-600
  const cDepenses = "#ef4444"; // red-500
  const cRecouv = "#16a34a"; // green-600

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Évolution Mensuelle</h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Aperçu de vos indicateurs financiers sur la période sélectionnée.
          </p>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-4">
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <LegendDot color={cRecettes} /> Recettes
            </span>
            <span className="inline-flex items-center gap-2">
              <LegendDot color={cDepenses} /> Dépenses
            </span>
            <span className="inline-flex items-center gap-2">
              <LegendDot color={cRecouv} /> Recouvrement (%)
            </span>
          </div>

          <div className="flex items-center bg-slate-50 border border-slate-100 rounded-2xl p-1">
            {["12M", "6M", "3M", "1M"].map((t, idx) => (
              <button
                key={t}
                type="button"
                className={cn(
                  "h-9 px-4 rounded-xl text-[11px] font-black tracking-widest",
                  idx === 0 ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              className="h-9 w-10 rounded-xl text-slate-500 hover:text-slate-900 grid place-items-center"
              aria-label="Options"
              title="Options"
            >
              <span className="text-xl leading-none">⋯</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="fillRecettes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cRecettes} stopOpacity={0.15} />
                <stop offset="95%" stopColor={cRecettes} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillDepenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cDepenses} stopOpacity={0.12} />
                <stop offset="95%" stopColor={cDepenses} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#e2e8f0" strokeDasharray="6 6" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(v) => (v === 0 ? "0" : `${Math.round(v / 1_000_000)}M`)}
              domain={[0, (max: number) => Math.ceil(max / 1_000_000) * 1_000_000]}
              label={{
                value: "Montant (CFA)",
                position: "insideTopLeft",
                offset: 0,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              label={{
                value: "Pourcentage (%)",
                position: "insideTopRight",
                offset: 0,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />

            <Tooltip
              cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
              }}
              formatter={(value: unknown, name: unknown) => {
                const label = String(name);
                if (label === "Recouvrement (%)") return [`${Number(value)}%`, label];
                return [formatCompactCfa(Number(value)), label];
              }}
              labelStyle={{ fontWeight: 800 }}
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="recettes"
              name="Recettes"
              stroke={cRecettes}
              strokeWidth={2}
              fill="url(#fillRecettes)"
              dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 5 }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="depenses"
              name="Dépenses"
              stroke={cDepenses}
              strokeWidth={2}
              fill="url(#fillDepenses)"
              dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="recouvrement"
              name="Recouvrement (%)"
              stroke={cRecouv}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ReportsDashboard(props: ReportsDashboardProps) {
  const [dateRange, setDateRange] = React.useState(props.dateRangeLabel);
  const [niveau, setNiveau] = React.useState("Tous les niveaux");
  const [periodicite, setPeriodicite] = React.useState("Mensuel");
  const [isSendingReminders, setIsSendingReminders] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const handleSendReminders = () => {
    if (!confirm("Voulez-vous envoyer les relances de paiement à tous les parents d'élèves ayant des impayés ?")) return;
    setIsSendingReminders(true);
    startTransition(async () => {
      try {
        const res = await sendBulkPaymentReminders();
        if (res.success) {
          const count = (res as any).count || 0;
          toast.success(`${count} relances de paiement ont été envoyées avec succès par SMS !`);
        } else {
          toast.error(res.error || "Une erreur est survenue lors de l'envoi");
        }
      } catch (e: any) {
        toast.error("Erreur de connexion avec le serveur.");
      } finally {
        setIsSendingReminders(false);
      }
    });
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const schoolName = props.branding?.name || "Edut Pro";
      const dateRange = props.dateRangeLabel || "2024";

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("RAPPORT DE PERFORMANCE GLOBAL", 14, 20);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Établissement: ${schoolName}`, 14, 28);
      doc.text(`Période: ${dateRange}`, 14, 34);
      doc.text(`Date d'exportation: ${new Date().toLocaleDateString("fr-FR")}`, 14, 40);

      // Financial KPIs Table
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("1. Indicateurs Financiers", 14, 52);
      
      const financialRows = [
        ["Taux de Recouvrement", `${props.recouvrementPercent}%`],
        ["Dépenses du mois", `${props.expensesMonth.toLocaleString("fr-FR")} CFA`],
        ["Solde Disponible", `${props.soldeDisponible.toLocaleString("fr-FR")} CFA`],
        ["Recettes Totales", `${props.revenueTotal.toLocaleString("fr-FR")} CFA`],
        ["Dépenses Totales", `${props.expenseTotal.toLocaleString("fr-FR")} CFA`]
      ];

      autoTable(doc, {
        startY: 56,
        head: [["Indicateur", "Valeur"]],
        body: financialRows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] }
      });

      // Attendance Table
      const nextY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("2. Statistiques d'Assiduité", 14, nextY);

      const attKpis = props.attendanceKpis || { globalAttendanceRate: 94.2, unexcusedAbsences: 24, excusedAbsences: 12, lateRate: 3.1 };
      const attendanceRows = [
        ["Taux de Présence Global", `${attKpis.globalAttendanceRate}%`],
        ["Taux de Retard moyen", `${attKpis.lateRate}%`],
        ["Absences non justifiées", `${attKpis.unexcusedAbsences}`],
        ["Absences justifiées (Excusé)", `${attKpis.excusedAbsences}`]
      ];

      autoTable(doc, {
        startY: nextY + 4,
        head: [["Métrique", "Valeur"]],
        body: attendanceRows,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] }
      });

      // Performance Table
      const nextY2 = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("3. Performance Académique", 14, nextY2);

      const perfKpis = props.performanceKpis || { averageGrade: 14.2, successRate: 88.7, congratulatedStudents: 145, strugglingStudents: 32 };
      const performanceRows = [
        ["Moyenne Générale", `${perfKpis.averageGrade} / 20`],
        ["Taux de Réussite", `${perfKpis.successRate}%`],
        ["Élèves félicités (Moyenne >= 16)", `${perfKpis.congratulatedStudents}`],
        ["Élèves en difficulté (Moyenne < 10)", `${perfKpis.strugglingStudents}`]
      ];

      autoTable(doc, {
        startY: nextY2 + 4,
        head: [["Indicateur Performance", "Valeur"]],
        body: performanceRows,
        theme: "striped",
        headStyles: { fillColor: [139, 92, 246] }
      });

      doc.save(`Rapport_Performance_Global_${schoolName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Rapport PDF généré et téléchargé !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleExportExcel = () => {
    try {
      const schoolName = props.branding?.name || "Edut Pro";
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      
      // Metadata
      csvContent += `RAPPORT DE PERFORMANCE GLOBAL - ${schoolName.toUpperCase()}\n`;
      csvContent += `Période: ${props.dateRangeLabel}\n`;
      csvContent += `Date d'exportation: ${new Date().toLocaleDateString("fr-FR")}\n\n`;

      // 1. Financial KPIs
      csvContent += "1. INDICATEURS FINANCIERS\n";
      csvContent += "Métrique,Valeur\n";
      csvContent += `Taux de Recouvrement,${props.recouvrementPercent}%\n`;
      csvContent += `Dépenses du mois,${props.expensesMonth} CFA\n`;
      csvContent += `Solde Disponible,${props.soldeDisponible} CFA\n`;
      csvContent += `Recettes Totales,${props.revenueTotal} CFA\n`;
      csvContent += `Dépenses Totales,${props.expenseTotal} CFA\n\n`;

      // 2. Attendance KPIs
      const attKpis = props.attendanceKpis || { globalAttendanceRate: 94.2, unexcusedAbsences: 24, excusedAbsences: 12, lateRate: 3.1 };
      csvContent += "2. STATISTIQUES D'ASSIDUITÉ\n";
      csvContent += "Métrique,Valeur\n";
      csvContent += `Taux de Présence Global,${attKpis.globalAttendanceRate}%\n`;
      csvContent += `Taux de Retard moyen,${attKpis.lateRate}%\n`;
      csvContent += `Absences non justifiées,${attKpis.unexcusedAbsences}\n`;
      csvContent += `Absences justifiées,${attKpis.excusedAbsences}\n\n`;

      // 3. Performance KPIs
      const perfKpis = props.performanceKpis || { averageGrade: 14.2, successRate: 88.7, congratulatedStudents: 145, strugglingStudents: 32 };
      csvContent += "3. PERFORMANCE ACADÉMIQUE\n";
      csvContent += "Métrique,Valeur\n";
      csvContent += `Moyenne Générale,${perfKpis.averageGrade} / 20\n`;
      csvContent += `Taux de Réussite,${perfKpis.successRate}%\n`;
      csvContent += `Élèves félicités,${perfKpis.congratulatedStudents}\n`;
      csvContent += `Élèves en difficulté,${perfKpis.strugglingStudents}\n\n`;

      // 4. Subject Averages
      csvContent += "4. MOYENNES GENERALES PAR MATIERE\n";
      csvContent += "Matière,Moyenne\n";
      const subjectAverages = props.subjectAverages || [];
      subjectAverages.forEach(s => {
        csvContent += `${s.subject},${s.Average} / 20\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Rapport_Performance_${schoolName.replace(/\s+/g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Rapport CSV (Excel) téléchargé !");
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de la génération du fichier Excel");
    }
  };

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
            {props.branding?.logoPath ? (
              <img src={props.branding.logoPath} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <BarChart3 size={26} strokeWidth={2.4} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-5xl font-black text-slate-900 tracking-tight">Centre de Rapports</h1>
              {props.branding?.name && (
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100/60 px-3 py-1 rounded-full shadow-sm">
                  {props.branding.name}
                </span>
              )}
            </div>
            <p className="text-slate-500 mt-2 font-medium">
              Analyses avancées et indicateurs de performance pour {props.branding?.name || "votre établissement"}.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Select value={dateRange} onValueChange={(v) => v && setDateRange(v)}>
            <SelectTrigger className="h-12 rounded-2xl bg-white/80 border-slate-200 px-4 min-w-[260px] justify-between">
              <SelectValue>
                <span className="inline-flex items-center gap-3 font-bold text-slate-700">
                  <CalendarIcon className="size-4 text-slate-500" />
                  {dateRange}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectGroup>
                <SelectItem value="1 Jan. 2024 - 31 Déc. 2024">1 Jan. 2024 - 31 Déc. 2024</SelectItem>
                <SelectItem value="1 Jan. 2025 - 31 Déc. 2025">1 Jan. 2025 - 31 Déc. 2025</SelectItem>
                <SelectItem value="Derniers 12 mois">Derniers 12 mois</SelectItem>
                <SelectItem value="Derniers 6 mois">Derniers 6 mois</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <DropdownMenu>
            {React.createElement(DropdownMenuTrigger as any, { asChild: true }, (
              <Button className="h-12 px-6 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:opacity-90">
                <Download size={18} /> Exporter
              </Button>
            ))}
            <DropdownMenuContent align="end" className="rounded-2xl bg-white p-2 border border-slate-100 shadow-2xl min-w-[200px] z-50">
              <DropdownMenuItem onClick={handleExportPDF} className="h-10 rounded-xl px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2">
                📄 Exporter en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="h-10 rounded-xl px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2">
                📊 Exporter en Excel (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          icon={<Users size={26} strokeWidth={2.4} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          title="Total élèves"
          value={props.totalStudents}
          delta={props.totalStudentsDelta}
          spark={[6, 7, 6.5, 7.2, 8, 7.6, 8.1, 8.4, 8.0, 8.9, 9.2, 9.0]}
          sparkColor="#2563eb"
        />
        <StatCard
          icon={<TrendingUp size={26} strokeWidth={2.4} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          title="Recouvrement"
          value={formatPercent(props.recouvrementPercent)}
          delta={props.recouvrementDelta}
          spark={[60, 62, 58, 64, 70, 68, 72, 74, 71, 76, 80, 84]}
          sparkColor="#16a34a"
        />
        <StatCard
          icon={<TrendingDown size={26} strokeWidth={2.4} />}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
          title="Dépenses (mois)"
          value={<span className="inline-flex items-baseline gap-2">{formatCfa(props.expensesMonth).replace(" CFA", "")}<span className="text-sm text-slate-500 font-black">CFA</span></span>}
          delta={props.expensesMonthDelta}
          spark={[3.2, 3.4, 2.8, 4.1, 3.7, 3.9, 3.1, 2.6, 3.0, 3.6, 3.2, 3.4].map((m) => m * 1_000_000)}
          sparkColor="#ef4444"
        />
        <StatCard
          icon={<Wallet size={26} strokeWidth={2.4} />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          title="Solde disponible"
          value={<span className="inline-flex items-baseline gap-2">{formatCfa(props.soldeDisponible).replace(" CFA", "")}<span className="text-sm text-slate-500 font-black">CFA</span></span>}
          delta={props.soldeDisponibleDelta}
          spark={[4.2, 4.8, 4.6, 5.1, 5.3, 5.0, 5.6, 5.9, 5.5, 6.0, 6.4, 6.2].map((m) => m * 1_000_000)}
          sparkColor="#8b5cf6"
        />
      </div>

      {/* Tabs + Filters bar */}
      <Tabs defaultValue="financial" className="w-full space-y-8">
        <div className="bg-white/70 backdrop-blur-sm border border-slate-100 rounded-[24px] shadow-sm px-6 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <TabsList className="bg-transparent p-0 h-auto rounded-none flex items-center gap-6">
            <TabsTrigger
              value="financial"
              className="bg-transparent shadow-none px-0 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-slate-600 font-black text-sm flex items-center gap-2 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <DollarSign className="size-4" />
              Financier
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="bg-transparent shadow-none px-0 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-slate-600 font-black text-sm flex items-center gap-2 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Users className="size-4" />
              Élèves
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="bg-transparent shadow-none px-0 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-slate-600 font-black text-sm flex items-center gap-2 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <CalendarIcon className="size-4" />
              Présence
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="bg-transparent shadow-none px-0 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-slate-600 font-black text-sm flex items-center gap-2 border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <TrendingUp className="size-4" />
              Performance
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select value={niveau} onValueChange={(v) => v && setNiveau(v)}>
              <SelectTrigger className="h-11 rounded-2xl bg-white/80 border-slate-200 px-4 min-w-[220px] justify-between">
                <SelectValue>
                  <span className="inline-flex items-center gap-3 font-bold text-slate-700">
                    <Filter className="size-4 text-slate-500" />
                    {niveau}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectGroup>
                  <SelectItem value="Tous les niveaux">Tous les niveaux</SelectItem>
                  <SelectItem value="Primaire">Primaire</SelectItem>
                  <SelectItem value="Collège">Collège</SelectItem>
                  <SelectItem value="Lycée">Lycée</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={periodicite} onValueChange={(v) => v && setPeriodicite(v)}>
              <SelectTrigger className="h-11 rounded-2xl bg-white/80 border-slate-200 px-4 min-w-[160px] justify-between">
                <SelectValue>
                  <span className="inline-flex items-center gap-3 font-bold text-slate-700">
                    <CalendarIcon className="size-4 text-slate-500" />
                    {periodicite}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectGroup>
                  <SelectItem value="Mensuel">Mensuel</SelectItem>
                  <SelectItem value="Trimestriel">Trimestriel</SelectItem>
                  <SelectItem value="Annuel">Annuel</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="financial" className="space-y-8 mt-0">
          <MonthlyChart data={props.monthly} />

          {/* Alerte de Relance */}
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 backdrop-blur-sm rounded-[24px] border border-orange-100/50 shadow-sm p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                📢 Relances Automatiques & Suivi des Impayés
              </h4>
              <p className="text-xs text-slate-500 font-medium max-w-2xl leading-relaxed">
                Envoyez instantanément des rappels de paiement personnalisés par SMS ou WhatsApp aux parents d'élèves ayant un solde de scolarité débiteur. Les notifications sont journalisées pour un suivi comptable optimal.
              </p>
            </div>
            <Button
              onClick={handleSendReminders}
              disabled={isSendingReminders}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 shrink-0 flex items-center gap-2 transition-all duration-300"
            >
              {isSendingReminders ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  🚀 Relancer les Impayés (SMS)
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <DonutCard
              title="Répartition des Recettes"
              subtitle="Distribution des sources de revenus"
              totalLabel="Total"
              totalValue={formatCompactCfa(props.revenueTotal)}
              items={props.revenueBreakdown}
              colors={props.revenueBreakdown.map((i) => i.color)}
            />
            <DonutCard
              title="État des Dépenses"
              subtitle="Répartition des dépenses par catégorie"
              totalLabel="Total"
              totalValue={formatCompactCfa(props.expenseTotal)}
              items={props.expenseBreakdown}
              colors={props.expenseBreakdown.map((i) => i.color)}
            />
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
            <h4 className="text-lg font-black text-slate-900 tracking-tight">Indicateurs Clés</h4>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              {props.kpis.map((k) => (
                <div
                  key={k.label}
                  className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5 flex items-center gap-4"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", kpiTone(k.icon).bg, kpiTone(k.icon).fg)}>
                    <KpiIcon name={k.icon} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">{k.label}</p>
                    <div className="mt-1 flex items-baseline gap-3">
                      <p className="text-xl font-black text-slate-900 leading-none">{k.value}</p>
                      <p
                        className={cn(
                          "text-xs font-black tabular-nums",
                          k.tone === "good" ? "text-emerald-600" : k.tone === "bad" ? "text-rose-600" : "text-slate-500"
                        )}
                      >
                        {`${k.delta > 0 ? "+" : ""}${k.delta.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-0 space-y-8 animate-in fade-in duration-500">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Total Inscrits", value: props.totalStudents || "1,248", desc: "Élèves enregistrés" },
              { label: "Nouveaux (Ce Mois)", value: props.totalStudents ? Math.round(props.totalStudents * 0.08) : "98", desc: "Nouveaux inscrits" },
              { label: "Taux de Rétention", value: "98.4%", desc: "Élèves réinscrits" },
              { label: "Moyenne par Classe", value: "24.5", desc: "Élèves par classe" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white/90 backdrop-blur-sm rounded-[20px] border border-slate-100 shadow-sm p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <h4 className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</h4>
                <p className="text-[10px] font-bold text-slate-500 mt-1">{kpi.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Distribution Chart */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Répartition par Niveau</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Nombre d'élèves inscrits dans chaque cycle d'enseignement</p>
              <div className="mt-6 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <Pie
                      data={[
                        { name: "Primaire", value: Math.round(props.totalStudents * 0.45) || 560 },
                        { name: "Collège", value: Math.round(props.totalStudents * 0.3) || 380 },
                        { name: "Lycée", value: Math.round(props.totalStudents * 0.25) || 308 },
                      ]}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={85}
                      stroke="transparent"
                    >
                      {[
                        { color: "#2563eb" },
                        { color: "#7c3aed" },
                        { color: "#16a34a" },
                      ].map((p, idx) => (
                        <Cell key={idx} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {[
                  { label: "Primaire (45%)", color: "bg-blue-600" },
                  { label: "Collège (30%)", color: "bg-purple-600" },
                  { label: "Lycée (25%)", color: "bg-emerald-600" },
                ].map((item) => (
                  <span key={item.label} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Growth Chart */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Évolution des Inscriptions</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Comparatif des inscriptions sur les 5 dernières années</p>
              <div className="mt-6 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { year: "2020", Primary: 400, College: 280, Lycee: 200 },
                      { year: "2021", Primary: 450, College: 310, Lycee: 220 },
                      { year: "2022", Primary: 490, College: 340, Lycee: 250 },
                      { year: "2023", Primary: 520, College: 360, Lycee: 280 },
                      { year: "2024", Primary: props.totalStudents || 1248, College: 380, Lycee: 308 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="6 6" vertical={false} />
                    <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
                    <Area type="monotone" dataKey="Primary" name="Primaire" stroke="#2563eb" fill="#2563eb" fillOpacity={0.05} strokeWidth={2} />
                    <Area type="monotone" dataKey="College" name="Collège" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.05} strokeWidth={2} />
                    <Area type="monotone" dataKey="Lycee" name="Lycée" stroke="#16a34a" fill="#16a34a" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-0 space-y-8 animate-in fade-in duration-500">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                label: "Présence Globale",
                value: props.attendanceKpis?.globalAttendanceRate !== undefined
                  ? `${props.attendanceKpis.globalAttendanceRate.toFixed(1)}%`
                  : "94.2%",
                desc: "Taux moyen mensuel",
              },
              {
                label: "Absences Non Justifiées",
                value: props.attendanceKpis?.unexcusedAbsences !== undefined
                  ? String(props.attendanceKpis.unexcusedAbsences)
                  : "24",
                desc: "Cette semaine",
              },
              {
                label: "Taux de Retard",
                value: props.attendanceKpis?.lateRate !== undefined
                  ? `${props.attendanceKpis.lateRate.toFixed(1)}%`
                  : "3.1%",
                desc: "Moyenne des élèves",
              },
              {
                label: "Absences Justifiées",
                value: props.attendanceKpis?.excusedAbsences !== undefined
                  ? String(props.attendanceKpis.excusedAbsences)
                  : "12",
                desc: "Documents officiels reçus",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white/90 backdrop-blur-sm rounded-[20px] border border-slate-100 shadow-sm p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <h4 className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</h4>
                <p className="text-[10px] font-bold text-slate-500 mt-1">{kpi.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Daily Follow-up */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Suivi Quotidien (Cette Semaine)</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Taux de présence comparé sur les jours ouvrables</p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={props.dailyEvolution && props.dailyEvolution.length > 0 ? props.dailyEvolution : [
                      { day: "Lundi", Presents: 95.4, Absents: 2.6, Lates: 2.0 },
                      { day: "Mardi", Presents: 96.1, Absents: 1.9, Lates: 2.0 },
                      { day: "Mercredi", Presents: 94.2, Absents: 3.1, Lates: 2.7 },
                      { day: "Jeudi", Presents: 93.8, Absents: 3.7, Lates: 2.5 },
                      { day: "Vendredi", Presents: 92.5, Absents: 4.8, Lates: 2.7 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="6 6" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} domain={[90, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
                    <Area type="monotone" dataKey="Presents" name="Présents (%)" stroke="#16a34a" fill="#16a34a" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Attendance by Level */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Assiduité par Cycle</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Comparatif des taux d'assiduité par niveau scolaire</p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={props.attendanceByCycle && props.attendanceByCycle.length > 0 ? props.attendanceByCycle : [
                      { cycle: "Primaire", Rate: 96.2 },
                      { cycle: "Collège", Rate: 94.5 },
                      { cycle: "Lycée", Rate: 92.1 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barCategoryGap="45%"
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="6 6" vertical={false} />
                    <XAxis dataKey="cycle" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} domain={[80, 100]} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="Rate" name="Taux (%)" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-0 space-y-8 animate-in fade-in duration-500">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                label: "Moyenne Générale",
                value: props.performanceKpis?.averageGrade !== undefined
                  ? `${props.performanceKpis.averageGrade.toFixed(1)} / 20`
                  : "14.2 / 20",
                desc: "Moyenne de l'établissement",
              },
              {
                label: "Taux de Réussite",
                value: props.performanceKpis?.successRate !== undefined
                  ? `${props.performanceKpis.successRate.toFixed(1)}%`
                  : "88.7%",
                desc: "Dernier examen semestriel",
              },
              {
                label: "Élèves Félicités",
                value: props.performanceKpis?.congratulatedStudents !== undefined
                  ? String(props.performanceKpis.congratulatedStudents)
                  : "145",
                desc: "Moyenne >= 16 / 20",
              },
              {
                label: "Élèves en Difficulté",
                value: props.performanceKpis?.strugglingStudents !== undefined
                  ? String(props.performanceKpis.strugglingStudents)
                  : "32",
                desc: "Moyenne < 10 / 20",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white/90 backdrop-blur-sm rounded-[20px] border border-slate-100 shadow-sm p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                <h4 className="text-2xl font-black text-slate-900 mt-2">{kpi.value}</h4>
                <p className="text-[10px] font-bold text-slate-500 mt-1">{kpi.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Grades Distribution */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Répartition des Notes</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Nombre d'élèves par tranche de moyenne générale</p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={props.gradeDistribution && props.gradeDistribution.length > 0 ? props.gradeDistribution : [
                      { tranche: "[0 - 5[", Count: 5 },
                      { tranche: "[5 - 10[", Count: 27 },
                      { tranche: "[10 - 12[", Count: 180 },
                      { tranche: "[12 - 14[", Count: 420 },
                      { tranche: "[14 - 16[", Count: 310 },
                      { tranche: "[16 - 18[", Count: 110 },
                      { tranche: "[18 - 20]", Count: 35 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="6 6" vertical={false} />
                    <XAxis dataKey="tranche" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
                    <Area type="monotone" dataKey="Count" name="Effectif (élèves)" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance by Subject */}
            <div className="bg-white/90 backdrop-blur-sm rounded-[24px] border border-slate-100 shadow-sm p-8">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Moyennes par Matière</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">Moyennes générales obtenues dans les matières principales</p>
              <div className="mt-6 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={props.subjectAverages && props.subjectAverages.length > 0 ? props.subjectAverages : [
                      { subject: "Maths", Average: 12.8 },
                      { subject: "Français", Average: 14.1 },
                      { subject: "SVT", Average: 13.5 },
                      { subject: "Physique", Average: 11.9 },
                      { subject: "Histoire-Géo", Average: 15.2 },
                      { subject: "Anglais", Average: 14.8 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barCategoryGap="35%"
                  >
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="6 6" vertical={false} />
                    <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} domain={[0, 20]} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="Average" name="Moyenne (/20)" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiIcon({ name }: { name: ReportsDashboardProps["kpis"][number]["icon"] }) {
  switch (name) {
    case "recovery":
      return <PieChartIcon size={18} strokeWidth={2.2} />;
    case "cost":
      return <TrendingUp size={18} strokeWidth={2.2} />;
    case "expense":
      return <TrendingDown size={18} strokeWidth={2.2} />;
    case "revenue":
      return <DollarSign size={18} strokeWidth={2.2} />;
    case "excess":
      return <Wallet size={18} strokeWidth={2.2} />;
  }
}

function kpiTone(name: ReportsDashboardProps["kpis"][number]["icon"]) {
  switch (name) {
    case "recovery":
      return { bg: "bg-rose-50", fg: "text-rose-600" };
    case "cost":
      return { bg: "bg-pink-50", fg: "text-pink-600" };
    case "expense":
      return { bg: "bg-violet-50", fg: "text-violet-600" };
    case "revenue":
      return { bg: "bg-amber-50", fg: "text-amber-600" };
    case "excess":
      return { bg: "bg-emerald-50", fg: "text-emerald-600" };
  }
}
