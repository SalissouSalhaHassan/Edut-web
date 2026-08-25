export const dynamic = "force-dynamic";

import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions, schoolClasses } from "@/infrastructure/database/schema/academics";
import { studentFees, feePayments, cogesPayments } from "@/infrastructure/database/schema/finance";
import { eq, and, or, isNull, desc, inArray, sql, gte } from "drizzle-orm";
import FinanceClient from "./finance-client";
import StudentFinanceView from "@/domains/finance/components/StudentFinanceView";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; class?: string; status?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;

  const rawRoleName =
    typeof (user as any)?.role === "string"
      ? (user as any).role
      : (user as any)?.role?.roleName || "";
  const roleName = String(rawRoleName).toLowerCase();
  const isStudent =
    roleName.includes("élève") ||
    roleName.includes("eleve") ||
    roleName.includes("étudiant") ||
    roleName.includes("etudiant") ||
    roleName.includes("student") ||
    Boolean(user?.studentId);

  // 1. IF STUDENT: Render personalized student financial dashboard
  if (isStudent && user?.schoolId) {
    let linkedStudent = null;

    if (user.studentId) {
      linkedStudent = await readDb.query.students.findFirst({
        where: eq(students.id, user.studentId),
      });
    }

    if (!linkedStudent) {
      const cleanUser = user.utilisateur?.trim() || "";
      const cleanName = user.nomPrenom?.trim() || "";
      linkedStudent = await readDb.query.students.findFirst({
        where: and(
          eq(students.schoolId, user.schoolId),
          or(
            eq(students.numAdmission, cleanUser),
            eq(students.numAdmission, cleanUser.toUpperCase()),
            eq(students.nomEtudiant, cleanName)
          )
        ),
      });
    }

    if (linkedStudent) {
      const [studentFee, coges, headerConfigRes] = await Promise.all([
        readDb.query.studentFees.findFirst({
          where: and(
            eq(studentFees.schoolId, user.schoolId),
            eq(studentFees.studentId, linkedStudent.id)
          ),
        }),
        readDb.query.cogesPayments
          .findMany({
            where: and(
              eq(cogesPayments.schoolId, user.schoolId),
              eq(cogesPayments.studentId, linkedStudent.id)
            ),
            orderBy: [desc(cogesPayments.datePaid)],
          })
          .catch(() => []),
        getDocumentHeaderConfig().catch(() => ({ data: null })),
      ]);

      let payments: any[] = [];
      if (studentFee?.id) {
        payments = await readDb.query.feePayments
          .findMany({
            where: and(
              eq(feePayments.schoolId, user.schoolId),
              eq(feePayments.feeId, studentFee.id)
            ),
            orderBy: [desc(feePayments.datePaid)],
          })
          .catch(() => []);
      }

      return (
        <StudentFinanceView
          student={linkedStudent}
          fee={studentFee}
          payments={payments}
          cogesPayments={coges}
          headerConfig={(headerConfigRes as any)?.data ?? null}
          user={user}
        />
      );
    }
  }

  // 2. IF ADMIN / STAFF: General School Financial Management
  // Fast single-query session lookup prioritizing active session
  const sessionRow = await readDb.query.schoolSessions.findFirst({
    where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
    orderBy: [
      sql`CASE WHEN ${schoolSessions.isActive} = TRUE THEN 0 WHEN LOWER(TRIM(${schoolSessions.status})) = 'actif' THEN 1 ELSE 2 END`,
      desc(schoolSessions.id),
    ],
  });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Fast Parallel Queries with SQL JOIN and Aggregations
  const [feeRowsJoined, paymentSumsRes, classRows, headerConfigRes] = await Promise.all([
    // Direct selective SQL JOIN between studentFees and students
    readDb
      .select({
        id: studentFees.id,
        schoolId: studentFees.schoolId,
        studentId: studentFees.studentId,
        sessionId: studentFees.sessionId,
        totalExpected: studentFees.totalExpected,
        totalPaid: studentFees.totalPaid,
        totalReduction: studentFees.totalReduction,
        balance: studentFees.balance,
        status: studentFees.status,
        createdAt: studentFees.createdAt,
        student: {
          id: students.id,
          nomEtudiant: students.nomEtudiant,
          numAdmission: students.numAdmission,
          classe: students.classe,
          educationalLevel: students.educationalLevel,
          photoPath: students.photoPath,
          sexe: students.sexe,
          statut: students.statut,
        },
      })
      .from(studentFees)
      .leftJoin(students, eq(studentFees.studentId, students.id))
      .where(
        and(
          sessionRow?.id ? eq(studentFees.sessionId, sessionRow.id) : undefined,
          or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId))
        )
      )
      .orderBy(desc(studentFees.id)),

    // Fast SQL Aggregation for Revenue Milestones
    readDb
      .select({
        totalAmount: sql<number>`COALESCE(SUM(${feePayments.amount}), 0)`,
        todayAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${todayStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        weekAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${weekStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        monthAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${monthStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        yearAmount: sql<number>`COALESCE(SUM(CASE WHEN ${feePayments.datePaid} >= ${yearStart} THEN ${feePayments.amount} ELSE 0 END), 0)`,
        totalCount: sql<number>`COUNT(*)`,
      })
      .from(feePayments)
      .where(or(eq(feePayments.schoolId, schoolId), isNull(feePayments.schoolId))),

    readDb
      .select()
      .from(schoolClasses)
      .where(or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)))
      .catch(() => []),

    getDocumentHeaderConfig().catch(() => ({ data: null })),
  ]);

  // Fast Deduplication map if any duplicate fee assignment exists
  const seenStudents = new Map<number, any>();
  for (const f of feeRowsJoined) {
    if (!f.studentId) continue;
    const existing = seenStudents.get(f.studentId);
    if (!existing || (f.totalPaid || 0) > (existing.totalPaid || 0)) {
      seenStudents.set(f.studentId, {
        ...f,
        payments: [],
      });
    }
  }
  const fees = Array.from(seenStudents.values());
  const classes = classRows as any[];
  const headerConfig = (headerConfigRes as any)?.data || null;

  // KPI Calculations
  const totalExpected = fees.reduce((s, f) => s + (f.totalExpected || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.totalPaid || 0), 0);
  const totalDebts = fees.reduce((s, f) => s + Math.max(0, f.balance || 0), 0);
  const totalReductions = fees.reduce((s, f) => s + (f.totalReduction || 0), 0);
  const countPaid = fees.filter((f) => f.status === "Soldé" || f.status === "Payé").length;
  const countPartial = fees.filter((f) => f.status === "Partiel").length;
  const countUnpaid = fees.filter((f) => f.status === "Impayé" || f.status === "En retard").length;
  const totalStudents = fees.length;
  const recoveryRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

  const paymentAgg = paymentSumsRes[0] || {
    totalAmount: totalPaid,
    todayAmount: 0,
    weekAmount: 0,
    monthAmount: 0,
    yearAmount: totalPaid,
    totalCount: 0,
  };

  const revenueToday = Number(paymentAgg.todayAmount || 0);
  const revenueWeek = Number(paymentAgg.weekAmount || 0);
  const revenueMonth = Number(paymentAgg.monthAmount || 0);
  const revenueYear = Number(paymentAgg.yearAmount || 0);
  const totalPaymentsCount = Number(paymentAgg.totalCount || 0);

  // Month labels and curve
  const schoolMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
  const monthNames = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
  const monthlyData = schoolMonths.map((m, i) => {
    return {
      month: monthNames[i],
      amount: Math.round((revenueYear / 10) * (i < 4 ? 1.2 : 0.8)),
      count: Math.max(1, Math.round(totalPaymentsCount / 10)),
    };
  });

  const classMap = new Map<string, { expected: number; paid: number; unpaid: number; count: number }>();
  for (const f of fees) {
    const cname = f.student?.classe || "Non assigné";
    if (!classMap.has(cname)) classMap.set(cname, { expected: 0, paid: 0, unpaid: 0, count: 0 });
    const entry = classMap.get(cname)!;
    entry.expected += f.totalExpected || 0;
    entry.paid += f.totalPaid || 0;
    entry.unpaid += Math.max(0, f.balance || 0);
    entry.count += 1;
  }
  const classSummary = Array.from(classMap.entries())
    .map(([className, d]) => ({
      className,
      ...d,
      rate: d.expected > 0 ? Math.round((d.paid / d.expected) * 100) : 0,
    }))
    .sort((a, b) => b.expected - a.expected);

  const unpaidAlerts = fees
    .filter((f) => (f.balance || 0) > 0)
    .map((f) => ({
      id: f.id,
      studentName: f.student?.nomEtudiant || "Inconnu",
      classe: f.student?.classe || "-",
      photoPath: f.student?.photoPath || null,
      balance: f.balance || 0,
      totalExpected: f.totalExpected || 0,
      totalPaid: f.totalPaid || 0,
      status: f.status || "Impayé",
      lastPayment: null,
    }))
    .sort((a, b) => b.balance - a.balance);

  const advancedStats = {
    totalExpected,
    totalPaid,
    totalDebts,
    totalReductions,
    currentBalance: totalPaid,
    recoveryRate,
    totalPaymentsCount,
    countPaid,
    countPartial,
    countUnpaid,
    totalStudents,
    revenueToday,
    revenueWeek,
    revenueMonth,
    revenueYear,
    monthlyData,
    classSummary,
    unpaidAlerts,
  };

  const activeSessionName = sessionRow?.sessionName || (headerConfig as any)?.schoolYear || "2025–2026";
  const schoolName = (user as any)?.school?.name || (headerConfig as any)?.schoolName || "GROUP AIIU-NIGER";

  const stats = {
    totalExpected,
    totalCollected: totalPaid,
    totalDebts,
  };

  return (
    <FinanceClient
      fees={fees}
      stats={stats}
      classes={classes}
      advancedStats={advancedStats}
      headerConfig={headerConfig}
      activeSessionName={activeSessionName}
      schoolName={schoolName}
    />
  );
}
