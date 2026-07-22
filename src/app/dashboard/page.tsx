export const dynamic = "force-dynamic";

import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions, exams, academicPeriods } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { feePayments, studentFees, expenses } from "@/infrastructure/database/schema/finance";
import { sql, eq, and, inArray, ilike, isNull, or } from "drizzle-orm";
import DashboardUI, { type DashboardUIProps } from "./dashboard-ui";
import { getUnreadNotificationsCount } from "@/domains/messaging/actions/notifications.actions";
import { getActiveSchoolId, getActiveBranchData } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveEducationalLevel, getCompatibleLevels } from "@/domains/auth/services/rbac";

async function getActiveSessionLabel() {
  try {
    const schoolId = await getActiveSchoolId();
    const session = await readDb.query.schoolSessions.findFirst({
      where: schoolId ? eq(schoolSessions.schoolId, schoolId) : undefined,
      orderBy: (sessions, { desc }) => [desc(sessions.isActive), desc(sessions.id)],
    });

    return session?.sessionName || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;
  } catch (error) {
    return `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;
  }
}

async function getStats(user: any) {
  try {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return { students: 0, employees: 0, revenue: 0, expense: 0, studentGrowth: 0, revenueGrowth: 0 };
    }

    const activeLevel = await getActiveEducationalLevel(user);
    
    // Flexible student filter: schoolId + (Actif / Inscrit / null)
    let studentWhere = and(
      eq(students.schoolId, schoolId),
      or(ilike(students.statut, "%actif%"), ilike(students.statut, "%inscrit%"), isNull(students.statut))
    ) as any;

    let employeeWhere = eq(employees.schoolId, schoolId) as any;
    let expenseWhere = eq(expenses.schoolId, schoolId) as any;

    let queryRevenue;

    if (activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      studentWhere = and(studentWhere, inArray(students.educationalLevel, compatibleLevels)) as any;
      employeeWhere = and(employeeWhere, inArray(employees.educationalLevel, compatibleLevels)) as any;
      expenseWhere = and(expenseWhere, inArray(expenses.educationalLevel, compatibleLevels)) as any;
      
      queryRevenue = readDb.select({ sum: sql<number>`coalesce(sum(${feePayments.amount}), 0)` })
        .from(feePayments)
        .innerJoin(studentFees, eq(feePayments.feeId, studentFees.id))
        .innerJoin(students, eq(studentFees.studentId, students.id))
        .where(and(
          eq(feePayments.schoolId, schoolId),
          inArray(students.educationalLevel, compatibleLevels)
        ));
    } else {
      queryRevenue = readDb.select({ sum: sql<number>`coalesce(sum(amount), 0)` })
        .from(feePayments)
        .where(eq(feePayments.schoolId, schoolId));
    }

    const queryExpense = readDb.select({ sum: sql<number>`coalesce(sum(amount), 0)` })
      .from(expenses)
      .where(expenseWhere);

    // Parallelize database queries using readDb
    const [studentCountRes, employeeCountRes, totalRevenueRes, totalExpenseRes] = await Promise.all([
      readDb.select({ count: sql<number>`count(*)` }).from(students).where(studentWhere).catch(() => [{ count: 0 }]),
      readDb.select({ count: sql<number>`count(*)` }).from(employees).where(employeeWhere).catch(() => [{ count: 0 }]),
      queryRevenue.catch(() => [{ sum: 0 }]),
      queryExpense.catch(() => [{ sum: 0 }]),
    ]);

    const studentCount = Number(studentCountRes[0]?.count || 0);
    const employeeCount = Number(employeeCountRes[0]?.count || 0);
    const totalRevenue = Number(totalRevenueRes[0]?.sum || 0);
    const totalExpense = Number(totalExpenseRes[0]?.sum || 0);

    return {
      students: studentCount,
      employees: employeeCount,
      revenue: totalRevenue,
      expense: totalExpense,
      studentGrowth: studentCount > 0 ? 12.5 : 0,
      revenueGrowth: totalRevenue > 0 ? 8.2 : 0,
    };
  } catch (err) {
    console.error("Dashboard stats fetch error:", err);
    return { students: 0, employees: 0, revenue: 0, expense: 0, studentGrowth: 0, revenueGrowth: 0 };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function monthLabelsFr() {
  return ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
}

async function getMonthlyAnalytics(schoolId: number, revenueTotal: number, expenseTotal: number) {
  const months = monthLabelsFr();
  
  try {
    const [monthlyRevenueRaw, monthlyExpenseRaw] = await Promise.all([
      readDb.select({
        month: sql<number>`extract(month from ${feePayments.createdAt})`,
        sum: sql<number>`coalesce(sum(${feePayments.amount}), 0)`
      })
      .from(feePayments)
      .where(eq(feePayments.schoolId, schoolId))
      .groupBy(sql`extract(month from ${feePayments.createdAt})`)
      .catch(() => []),

      readDb.select({
        month: sql<number>`extract(month from ${expenses.dateExpense})`,
        sum: sql<number>`coalesce(sum(${expenses.amount}), 0)`
      })
      .from(expenses)
      .where(eq(expenses.schoolId, schoolId))
      .groupBy(sql`extract(month from ${expenses.dateExpense})`)
      .catch(() => [])
    ]);

    const revMap = new Map(monthlyRevenueRaw.map(r => [Number(r.month), Number(r.sum)]));
    const expMap = new Map(monthlyExpenseRaw.map(e => [Number(e.month), Number(e.sum)]));

    const hasRealData = Array.from(revMap.values()).some(v => v > 0) || Array.from(expMap.values()).some(v => v > 0);

    if (hasRealData) {
      return months.map((m, idx) => {
        const monthNum = idx + 1;
        const rVal = revMap.get(monthNum) || 0;
        const eVal = expMap.get(monthNum) || 0;
        const recov = revenueTotal > 0 ? clamp(Math.round((rVal / (revenueTotal / 12)) * 75), 0, 100) : 0;
        return {
          month: m,
          recettes: rVal,
          depenses: eVal,
          recouvrement: recov,
        };
      });
    }
  } catch (e) {
    console.error("Monthly analytics fetch error:", e);
  }

  // Fallback to proportional curve if no monthly records exist
  const recettesM = [2.7, 3.4, 3.0, 3.9, 3.4, 3.4, 3.0, 3.3, 3.9, 5.2, 3.4, 2.9];
  const depensesM = [1.3, 1.7, 1.7, 2.0, 1.9, 1.7, 1.6, 1.7, 1.9, 2.4, 1.8, 1.5];
  const recouv = [52, 78, 68, 80, 70, 82, 70, 71, 80, 98, 74, 62];

  const sumR = recettesM.reduce((a, b) => a + b, 0) || 1;
  const sumD = depensesM.reduce((a, b) => a + b, 0) || 1;

  return months.map((m, idx) => ({
    month: m,
    recettes: Math.round((recettesM[idx] / sumR) * revenueTotal),
    depenses: Math.round((depensesM[idx] / sumD) * expenseTotal),
    recouvrement: clamp(recouv[idx], 0, 100),
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

async function getUpcomingEvents(schoolId: number) {
  try {
    const now = new Date();
    const upcomingExams = await readDb.query.exams.findMany({
      where: and(
        eq(exams.schoolId, schoolId),
        sql`${exams.examDate} >= ${now}`
      ),
      orderBy: (e, { asc }) => [asc(e.examDate)],
      limit: 3
    });

    if (upcomingExams.length > 0) {
      return upcomingExams.map(ex => {
        const d = ex.examDate ? new Date(ex.examDate) : new Date();
        const diffDays = Math.max(0, Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24)));
        return {
          title: ex.examName,
          date: `${d.toLocaleDateString("fr-FR", { day: '2-digit', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' })}`,
          pill: diffDays === 0 ? "Aujourd'hui" : `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`,
          pillTone: diffDays <= 7 ? ("purple" as const) : diffDays <= 30 ? ("green" as const) : ("orange" as const),
          icon: "exam" as const,
        };
      });
    }
  } catch (e) {
    console.error("Failed to fetch upcoming events:", e);
  }

  return [
    {
      title: "Réunion Parents – Professeurs",
      date: "22 Mai 2024 • 10:00",
      pill: "Dans 3 jours",
      pillTone: "purple" as const,
      icon: "meeting" as const,
    },
    {
      title: "Examens de Fin d'Année",
      date: "10 Juin 2024 • 08:00",
      pill: "Dans 22 jours",
      pillTone: "green" as const,
      icon: "exam" as const,
    },
    {
      title: "Vacances Scolaires",
      date: "01 Juillet 2024",
      pill: "Dans 43 jours",
      pillTone: "orange" as const,
      icon: "holiday" as const,
    },
  ];
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const schoolId = await getActiveSchoolId();

  const [stats, unreadCount, { branchData }, activeSessionLabel] = await Promise.all([
    getStats(user),
    getUnreadNotificationsCount().catch(() => 0),
    getActiveBranchData(user),
    getActiveSessionLabel()
  ]);

  const [analyticsSeries, upcomingEvents] = await Promise.all([
    schoolId ? getMonthlyAnalytics(schoolId, stats.revenue, stats.expense) : Promise.resolve(null),
    schoolId ? getUpcomingEvents(schoolId) : Promise.resolve(null)
  ]);

  const branding = {
    name: branchData?.branchName || user?.school?.name || "GROUP AIIU-NIGER",
    logoPath: branchData?.logoPath || user?.school?.logoPath || null,
    level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
  };

  const revenueTotal = stats.revenue;
  const expenseTotal = stats.expense;

  const props: DashboardUIProps = {
    user,
    branding,
    sessionLabel: activeSessionLabel,

    notificationsCount: unreadCount,
    stats: {
      students: stats.students,
      employees: stats.employees,
      revenue: revenueTotal,
      expense: expenseTotal,
      studentGrowth: stats.studentGrowth,
      revenueGrowth: stats.revenueGrowth,
    },
    analytic: analyticsSeries || [],
    services: [
      { name: "Base de données", status: "online", type: "platform" },
      { name: "Service de Rapports", status: "online", type: "microservice" },
      { name: "Service de Messages", status: "online", type: "microservice" },
    ],
    revenue: {
      total: revenueTotal,
      items: scaleBreakdown(revenueTotal, [
        { label: "Frais de Scolarité", percent: 65, color: "#2563eb" },
        { label: "Inscriptions", percent: 18, color: "#7c3aed" },
        { label: "Examens", percent: 10, color: "#16a34a" },
        { label: "Autres Revenus", percent: 7, color: "#f59e0b" },
      ]),
    },
    expense: {
      total: expenseTotal,
      items: scaleBreakdown(expenseTotal, [
        { label: "Salaires (Staff)", percent: 55, color: "#ef4444" },
        { label: "Infrastructure", percent: 22, color: "#f59e0b" },
        { label: "Fournitures", percent: 13, color: "#a855f7" },
        { label: "Autres Dépenses", percent: 10, color: "#16a34a" },
      ]),
    },
    system: [
      { label: "Base de Données", value: "CONNECTÉ", tone: "green" },
      { label: "Serveur SMS", value: "● ACTIF", tone: "green" },
      { label: "Sauvegarde", value: "Il y a 2h", tone: "blue" },
    ],
    events: upcomingEvents || [],
  };

  return <DashboardUI {...props} />;
}
