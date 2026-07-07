import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { feePayments, studentFees } from "@/infrastructure/database/schema/finance";
import { sql, eq, and, inArray } from "drizzle-orm";
import DashboardUI, { type DashboardUIProps } from "./dashboard-ui";
import { getUnreadNotificationsCount } from "@/domains/messaging/actions/notifications.actions";
import { cache as redisCache } from "@/lib/redis";
import { getActiveSchoolId, getActiveBranchData } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveEducationalLevel, getCompatibleLevels } from "@/domains/auth/services/rbac";

async function getStats(user: any) {
  try {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return { students: 0, employees: 0, revenue: 0, expense: 0, studentGrowth: 0, revenueGrowth: 0 };
    }

    const activeLevel = await getActiveEducationalLevel(user);
    const cacheKey = `dashboard_stats:${schoolId}:${activeLevel || 'all'}`;
    
    // Try Redis Cache first
    const cachedStats = await redisCache.get<any>(cacheKey);
    if (cachedStats) {
      console.log(`🚀 [Redis Hit] Dashboard stats for School ${schoolId} (${activeLevel || 'all'})`);
      return cachedStats;
    }

    let studentWhere = eq(students.schoolId, schoolId);
    let employeeWhere = eq(employees.schoolId, schoolId);

    let queryRevenue;

    if (activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      studentWhere = and(studentWhere, inArray(students.educationalLevel, compatibleLevels)) as any;
      employeeWhere = and(employeeWhere, inArray(employees.educationalLevel, compatibleLevels)) as any;
      
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

    // Parallelize database queries using readDb
    const [studentCountRes, employeeCountRes, totalRevenueRes] = await Promise.all([
      readDb.select({ count: sql<number>`count(*)` }).from(students).where(studentWhere),
      readDb.select({ count: sql<number>`count(*)` }).from(employees).where(employeeWhere).catch(() => [{ count: 0 }]),
      queryRevenue.catch(() => [{ sum: 0 }])
    ]);

    const stats = {
      students: studentCountRes[0]?.count || 0,
      employees: employeeCountRes[0]?.count || 0,
      revenue: totalRevenueRes[0]?.sum || 0,
      expense: 0, 
      studentGrowth: 12.5, 
      revenueGrowth: 8.2,  
    };

    // Cache for 10 minutes (600 seconds)
    await redisCache.set(cacheKey, stats, 600);

    return stats;
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

function buildAnalyticSeries(revenueTotal: number, expenseTotal: number) {
  const months = monthLabelsFr();
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [stats, unreadCount, { branchData }] = await Promise.all([
    getStats(user),
    getUnreadNotificationsCount().catch(() => 0),
    getActiveBranchData(user)
  ]);

  const branding = {
    name: branchData?.branchName || user?.school?.name || "Edut Pro",
    logoPath: branchData?.logoPath || user?.school?.logoPath || null,
    level: branchData?.instType || user?.educationalLevel || "Gestion Scolaire"
  };

  const revenueTotal = stats.revenue;
  const expenseTotal = stats.expense;

  const props: DashboardUIProps = {
    user,
    branding,
    sessionLabel: "2024 - 2025",

    notificationsCount: unreadCount,
    stats: {
      students: stats.students,
      employees: stats.employees,
      revenue: revenueTotal,
      expense: expenseTotal,
    },
    analytic: buildAnalyticSeries(revenueTotal, expenseTotal),
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
    events: [
      {
        title: "Réunion Parents – Professeurs",
        date: "22 Mai 2024 • 10:00",
        pill: "Dans 3 jours",
        pillTone: "purple",
        icon: "meeting",
      },
      {
        title: "Examens de Fin d'Année",
        date: "10 Juin 2024 • 08:00",
        pill: "Dans 22 jours",
        pillTone: "green",
        icon: "exam",
      },
      {
        title: "Vacances Scolaires",
        date: "01 Juillet 2024",
        pill: "Dans 43 jours",
        pillTone: "orange",
        icon: "holiday",
      },
    ],
  };

  return <DashboardUI {...props} />;
}
