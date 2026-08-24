export const dynamic = "force-dynamic";

import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions, schoolClasses } from "@/infrastructure/database/schema/academics";
import { studentFees, feePayments, cogesPayments } from "@/infrastructure/database/schema/finance";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import FinanceClient from "./finance-client";
import StudentFinanceView from "@/domains/finance/components/StudentFinanceView";

export default async function FinancePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string, class?: string, status?: string }> 
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
        readDb.query.cogesPayments.findMany({
          where: and(
            eq(cogesPayments.schoolId, user.schoolId),
            eq(cogesPayments.studentId, linkedStudent.id)
          ),
          orderBy: (c, { desc }) => [desc(c.datePaid)],
        }).catch(() => []),
        getDocumentHeaderConfig().catch(() => ({ data: null })),
      ]);

      let payments: any[] = [];
      if (studentFee?.id) {
        payments = await readDb.query.feePayments.findMany({
          where: and(
            eq(feePayments.schoolId, user.schoolId),
            eq(feePayments.feeId, studentFee.id)
          ),
          orderBy: (p, { desc }) => [desc(p.datePaid)],
        }).catch(() => []);
      }

      return (
        <StudentFinanceView
          student={linkedStudent}
          fee={studentFee}
          payments={payments}
          cogesPayments={coges}
          headerConfig={headerConfigRes?.data ?? null}
          user={user}
        />
      );
    }
  }

  // 2. IF ADMIN / STAFF: General School Financial Management
  // Find active session for school
  const activeSessionRow = await db.query.schoolSessions.findFirst({
    where: and(
      or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
      or(eq(schoolSessions.isActive, true), eq(schoolSessions.status, "Actif"))
    ),
    orderBy: [desc(schoolSessions.id)],
  });

  const sessionRow = activeSessionRow || await db.query.schoolSessions.findFirst({
    where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
    orderBy: [desc(schoolSessions.id)],
  });

  // Query all studentFees for this school (prefer active session if available, else all fees)
  let rawFees = await db.query.studentFees.findMany({
    where: and(
      sessionRow?.id ? eq(studentFees.sessionId, sessionRow.id) : undefined,
      or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId))
    ),
    with: {
      student: {
        columns: {
          id: true,
          nomEtudiant: true,
          numAdmission: true,
          classe: true,
          educationalLevel: true,
          photoPath: true,
          sexe: true,
          statut: true,
        },
      },
      payments: {
        columns: {
          id: true,
          feeId: true,
          amount: true,
          reduction: true,
          paymentMode: true,
          reference: true,
          datePaid: true,
          recordedBy: true,
          monthConcerned: true,
        },
        orderBy: (p, { desc }) => [desc(p.datePaid)],
      },
    },
  });

  // Fallback: if no fees for the specific session, fetch all fees for school
  if (rawFees.length === 0) {
    rawFees = await db.query.studentFees.findMany({
      where: or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId)),
      with: {
        student: {
          columns: {
            id: true,
            nomEtudiant: true,
            numAdmission: true,
            classe: true,
            educationalLevel: true,
            photoPath: true,
            sexe: true,
            statut: true,
          },
        },
        payments: {
          columns: {
            id: true,
            feeId: true,
            amount: true,
            reduction: true,
            paymentMode: true,
            reference: true,
            datePaid: true,
            recordedBy: true,
            monthConcerned: true,
          },
          orderBy: (p, { desc }) => [desc(p.datePaid)],
        },
      },
    });
  }

  // Deduplicate: keep fee row with highest totalPaid if duplicate student fees exist
  const seenStudents = new Map<number, typeof rawFees[0]>();
  for (const row of rawFees) {
    if (!row.studentId) continue;
    const existing = seenStudents.get(row.studentId);
    if (!existing || (row.totalPaid || 0) > (existing.totalPaid || 0)) {
      seenStudents.set(row.studentId, row);
    }
  }
  const fees = Array.from(seenStudents.values());

  // Fetch classes
  const classes = await db.query.schoolClasses.findMany({
    where: or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)),
    orderBy: (t, { asc }) => [asc(t.className)],
  });

  // Header config
  let headerConfig: any = null;
  try {
    const headerConfigRes = await getDocumentHeaderConfig();
    headerConfig = (headerConfigRes as any)?.data || null;
  } catch (_) {}

  // Compute Advanced Stats directly
  const totalExpected = fees.reduce((s, f) => s + (f.totalExpected || 0), 0);
  const totalPaid = fees.reduce((s, f) => s + (f.totalPaid || 0), 0);
  const totalDebts = fees.reduce((s, f) => s + Math.max(0, f.balance || 0), 0);
  const totalReductions = fees.reduce((s, f) => s + (f.totalReduction || 0), 0);
  const countPaid = fees.filter(f => f.status === "Soldé" || f.status === "Payé").length;
  const countPartial = fees.filter(f => f.status === "Partiel").length;
  const countUnpaid = fees.filter(f => f.status === "Impayé" || f.status === "En retard").length;
  const totalStudents = fees.length;
  const recoveryRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
  const allPayments = fees.flatMap(f => f.payments || []);
  const totalPaymentsCount = allPayments.length;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const revenueToday = allPayments
    .filter(p => p.datePaid && new Date(p.datePaid) >= todayStart)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const revenueWeek = allPayments
    .filter(p => p.datePaid && new Date(p.datePaid) >= weekStart)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const revenueMonth = allPayments
    .filter(p => p.datePaid && new Date(p.datePaid) >= monthStart)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const revenueYear = allPayments
    .filter(p => p.datePaid && new Date(p.datePaid) >= yearStart)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const schoolMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
  const monthNames = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
  const isAfterAug = now.getMonth() >= 8;
  const schoolYearStartYear = isAfterAug ? now.getFullYear() : now.getFullYear() - 1;
  const monthlyData = schoolMonths.map((m, i) => {
    const targetYear = m >= 8 ? schoolYearStartYear : schoolYearStartYear + 1;
    const monthPayments = allPayments.filter(p => {
      if (!p.datePaid) return false;
      const d = new Date(p.datePaid);
      return d.getMonth() === m && d.getFullYear() === targetYear;
    });
    return {
      month: monthNames[i],
      amount: monthPayments.reduce((s, p) => s + (p.amount || 0), 0),
      count: monthPayments.length
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
  const classSummary = Array.from(classMap.entries()).map(([className, d]) => ({
    className,
    ...d,
    rate: d.expected > 0 ? Math.round((d.paid / d.expected) * 100) : 0,
  })).sort((a, b) => b.expected - a.expected);

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
  };

  const activeSessionName = sessionRow?.sessionName || headerConfig?.schoolYear || "2025–2026";
  const schoolName = (user as any)?.school?.name || headerConfig?.schoolName || "GROUP AIIU-NIGER";

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
