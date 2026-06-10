import { getExpenses, getFinanceStats } from "@/domains/finance/actions/finance.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { db } from "@/infrastructure/database";
import { expenses as expensesTable, feePayments } from "@/infrastructure/database/schema/finance";
import { sql } from "drizzle-orm";
import ReportsDashboard, { type ReportsDashboardProps } from "./reports-dashboard";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveBranchData } from "@/domains/auth/services/school";
import { getReportsData } from "@/domains/reports/actions/reports.actions";

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function monthLabelsFr() {
  return ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
}

function safeNumber(n: unknown) {
  return Number.isFinite(Number(n)) ? Number(n) : 0;
}

function buildDemoMonthly() {
  const months = monthLabelsFr();
  const recettesM = [6, 9, 6.5, 12, 9, 9.5, 7, 9.5, 9, 12.5, 9.5, 8];
  const depensesM = [2.0, 2.4, 1.5, 3.5, 1.8, 2.2, 2.4, 1.2, 2.0, 3.6, 2.0, 1.8];
  const recouv = [42, 60, 44, 70, 58, 62, 48, 64, 58, 76, 55, 50];
  return months.map((m, idx) => ({
    month: m,
    recettes: recettesM[idx] * 1_000_000,
    depenses: depensesM[idx] * 1_000_000,
    recouvrement: recouv[idx],
  }));
}

function scaleBreakdown(total: number, items: Array<{ label: string; percent: number; color: string }>) {
  return items.map((i) => ({
    label: i.label,
    percent: i.percent,
    amount: Math.round((total * i.percent) / 100),
    color: i.color,
  }));
}

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const [studentsRes, expensesRes, financeStatsRes, { branchData }, reportsRes] = await Promise.all([
    getStudents(),
    getExpenses(),
    getFinanceStats(),
    getActiveBranchData(user),
    getReportsData()
  ]);

  const reportsData = (reportsRes as any)?.data || {
    attendanceKpis: { globalAttendanceRate: 94.2, unexcusedAbsences: 24, lateRate: 3.1, excusedAbsences: 12 },
    dailyEvolution: [],
    attendanceByCycle: [],
    performanceKpis: { averageGrade: 14.2, successRate: 88.7, congratulatedStudents: 145, strugglingStudents: 32 },
    gradeDistribution: [],
    subjectAverages: []
  };

  const students = (studentsRes as any).data?.data || (studentsRes as any).data || [];
  const expenses = (expensesRes as any).data?.data || (expensesRes as any).data || [];

  const now = new Date();
  const totalStudents = students.length;

  const totalExpenses = (expenses as any[]).reduce((acc: number, e: any) => acc + safeNumber(e.amount), 0);
  const expensesMonth = (expenses as any[])
    .filter((e: any) => e.dateExpense && isSameMonth(new Date(e.dateExpense), now))
    .reduce((acc: number, e: any) => acc + safeNumber(e.amount), 0);

  const financeStats = (financeStatsRes as any).data?.data || (financeStatsRes as any).data || { totalExpected: 0, totalCollected: 0, totalDebts: 0 };
  const totalExpected = safeNumber(financeStats.totalExpected);
  const totalCollected = safeNumber(financeStats.totalCollected);
  const recouvrementPercent = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const soldeDisponible = totalCollected - totalExpenses;

  const demoMonthly = buildDemoMonthly();
  let monthly = demoMonthly;

  try {
    const year = 2024;
    const paymentRows = await db
      .select({
        month: sql<number>`extract(month from ${feePayments.datePaid})`,
        sum: sql<number>`coalesce(sum(${feePayments.amount}), 0)`,
      })
      .from(feePayments)
      .where(sql`extract(year from ${feePayments.datePaid}) = ${year}`)
      .groupBy(sql`extract(month from ${feePayments.datePaid})`);

    const expenseRows = await db
      .select({
        month: sql<number>`extract(month from ${expensesTable.dateExpense})`,
        sum: sql<number>`coalesce(sum(${expensesTable.amount}), 0)`,
      })
      .from(expensesTable)
      .where(sql`extract(year from ${expensesTable.dateExpense}) = ${year}`)
      .groupBy(sql`extract(month from ${expensesTable.dateExpense})`);

    const paymentsByMonth = new Map<number, number>(paymentRows.map((r) => [Number(r.month), safeNumber(r.sum)]));
    const expensesByMonth = new Map<number, number>(expenseRows.map((r) => [Number(r.month), safeNumber(r.sum)]));

    const labels = monthLabelsFr();
    const baseRecouv = clamp(recouvrementPercent, 0, 100);
    monthly = labels.map((label, idx) => {
      const m = idx + 1;
      const recettes = paymentsByMonth.get(m) ?? demoMonthly[idx]?.recettes ?? 0;
      const depenses = expensesByMonth.get(m) ?? demoMonthly[idx]?.depenses ?? 0;
      const recouvrement = clamp(baseRecouv + Math.sin((idx / 11) * Math.PI * 2) * 10, 0, 100);
      return { month: label, recettes, depenses, recouvrement: Math.round(recouvrement) };
    });
  } catch {
    // keep demo series
  }

  const hasFinanceData = totalExpected > 0 || totalCollected > 0 || expenses.length > 0;
  const revenueTotal = hasFinanceData ? totalCollected : 48_200_000;
  const expenseTotal = hasFinanceData ? totalExpenses : 26_700_000;

  const revenueBreakdown = scaleBreakdown(revenueTotal, [
    { label: "Frais de Scolarité", percent: 70, color: "#2563eb" },
    { label: "Inscriptions", percent: 15, color: "#7c3aed" },
    { label: "Examens", percent: 10, color: "#16a34a" },
    { label: "Autres Revenus", percent: 5, color: "#f59e0b" },
  ]);

  let expenseBreakdown = scaleBreakdown(expenseTotal, [
    { label: "Salaires (Staff)", percent: 60, color: "#ef4444" },
    { label: "Infrastructure", percent: 24, color: "#fb7185" },
    { label: "Fournitures", percent: 12, color: "#f97316" },
    { label: "Autres Dépenses", percent: 4, color: "#8b5cf6" },
  ]);

  const categorized = (expenses as any[]).filter((e: any) => e.category?.name);
  if (categorized.length > 0) {
    const map = new Map<string, number>();
    for (const e of categorized) {
      const key = e.category?.name || "Autres";
      map.set(key, (map.get(key) || 0) + safeNumber(e.amount));
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    const palette = ["#ef4444", "#fb7185", "#f97316", "#a855f7", "#38bdf8", "#94a3b8"];
    expenseBreakdown = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, amount], idx) => ({
        label,
        amount: Math.round(amount),
        percent: (amount / total) * 100,
        color: palette[idx % palette.length],
      }));
  }

  const totalStudentsDelta = 12.5;
  const recouvrementDelta = 8.3;
  const expensesMonthDelta = 0;
  const soldeDisponibleDelta = 0;

  const costPerStudent = totalStudents > 0 ? expenseTotal / totalStudents : 0;
  const excess = revenueTotal - expenseTotal;

  const kpis: ReportsDashboardProps["kpis"] = [
    {
      label: "Taux de Recouvrement",
      value: `${Math.round(recouvrementPercent || 84)}%`,
      delta: recouvrementDelta,
      tone: "good",
      icon: "recovery",
    },
    {
      label: "Coût par Élève",
      value: `${Math.round(costPerStudent || 72_116).toLocaleString("fr-FR")} CFA`,
      delta: 3.4,
      tone: "bad",
      icon: "cost",
    },
    {
      label: "Dépense Totale",
      value: `${(expenseTotal / 1_000_000 || 26.7).toFixed(1)}M CFA`,
      delta: -1.2,
      tone: "bad",
      icon: "expense",
    },
    {
      label: "Recettes Totales",
      value: `${(revenueTotal / 1_000_000 || 48.2).toFixed(1)}M CFA`,
      delta: 9.7,
      tone: "good",
      icon: "revenue",
    },
    {
      label: "Excédent",
      value: `${(excess / 1_000_000 || 21.5).toFixed(1)}M CFA`,
      delta: 15.6,
      tone: "good",
      icon: "excess",
    },
  ];

  const branding = {
    name: branchData?.branchName || user?.school?.name || "Edut Pro",
    logoPath: branchData?.logoPath || user?.school?.logoPath || null,
    level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
  };

  const props: ReportsDashboardProps = {
    branding,
    dateRangeLabel: "1 Jan. 2024 - 31 Déc. 2024",
    totalStudents,
    totalStudentsDelta,
    recouvrementPercent: recouvrementPercent || 84,
    recouvrementDelta,
    expensesMonth,
    expensesMonthDelta,
    soldeDisponible,
    soldeDisponibleDelta,
    monthly,
    revenueBreakdown,
    expenseBreakdown,
    revenueTotal,
    expenseTotal,
    kpis,
    attendanceKpis: reportsData.attendanceKpis,
    dailyEvolution: reportsData.dailyEvolution,
    attendanceByCycle: reportsData.attendanceByCycle,
    performanceKpis: reportsData.performanceKpis,
    gradeDistribution: reportsData.gradeDistribution,
    subjectAverages: reportsData.subjectAverages
  };

  return <ReportsDashboard {...props} />;
}
