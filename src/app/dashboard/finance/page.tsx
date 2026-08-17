export const dynamic = "force-dynamic";

import { getStudentFees, getAdvancedFinanceStats } from "@/domains/finance/actions/finance.actions";
import { getClasses } from "@/domains/academics/actions/academics.actions";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { studentFees, feePayments, cogesPayments } from "@/infrastructure/database/schema/finance";
import { eq, and, or } from "drizzle-orm";
import FinanceClient from "./finance-client";
import StudentFinanceView from "@/domains/finance/components/StudentFinanceView";

export default async function FinancePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string, class?: string, status?: string }> 
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
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

  // 2. IF ADMIN / STAFF: Render general school financial management
  let fees: any[] = [];
  let classes: any[] = [];
  let advancedStats: any = null;
  let headerConfig: any = null;

  try {
    const [feesRes, classesRes, advancedStatsRes, headerConfigRes] = await Promise.all([
      getStudentFees({
        search: params.search,
        class: params.class,
        status: params.status
      }).catch(() => ({ data: [] })),
      getClasses(true).catch(() => ({ data: [] })),
      getAdvancedFinanceStats().catch(() => ({ data: null })),
      getDocumentHeaderConfig().catch(() => ({ data: null })),
    ]);

    fees = ((feesRes?.data ?? []) as unknown) as any[];
    classes = ((classesRes?.data ?? []) as unknown) as any[];
    advancedStats = (advancedStatsRes?.data ?? null) as any;
    headerConfig = (headerConfigRes?.data ?? null) as any;

  } catch (error) {
    console.warn("FinancePage Parallel Fetch Warning:", error);
  }

  const stats = {
    totalExpected: advancedStats?.totalExpected || 0,
    totalCollected: advancedStats?.totalPaid || 0,
    totalDebts: advancedStats?.totalDebts || 0,
  };

  return (
    <FinanceClient 
      fees={fees}
      stats={stats}
      classes={classes}
      advancedStats={advancedStats}
      headerConfig={headerConfig}
    />
  );
}
