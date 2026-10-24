export const dynamic = "force-dynamic";

import { getPayrollDashboard, getSalaryRecords, getPayrollRules } from "@/domains/hr/actions/payroll.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import PayrollClient from "./payroll-client";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams?: Promise<{ sessionId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const [dashRes, recordsRes, rulesRes, empRes, currentUser, headerConfigRes, activeSchoolId] = await Promise.all([
    getPayrollDashboard(),
    getSalaryRecords(),
    getPayrollRules(),
    getEmployees(),
    getCurrentUser(),
    getDocumentHeaderConfig().catch(() => null),
    getActiveSchoolId(),
  ]);

  const dashboard  = (dashRes as any).data?.data  || (dashRes as any).data  || {};
  const records    = (recordsRes as any).data?.data || (recordsRes as any).data || [];
  const rules      = (rulesRes as any).data?.data   || (rulesRes as any).data  || { leaveAllowPerMonth: 1, latePenalty: 0.5 };
  const employees  = ((empRes as any).data?.data    || (empRes as any).data    || []) as any[];
  const headerConfig = (headerConfigRes as any)?.data?.data || (headerConfigRes as any)?.data || null;

  const canEdit   = !!((currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canEdit));
  const canDelete = !!((currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canDelete));

  let allSessions: any[] = [];
  let isSessionFrozen = false;
  let currentSessionId: number | null = null;

  try {
    const { db } = await import("@/infrastructure/database");
    const { sql, desc } = await import("drizzle-orm");
    const { schoolSessions } = await import("@/infrastructure/database/schema/academics");

    allSessions = await db.query.schoolSessions.findMany({
      where: (s, { eq, or, isNull }) => activeSchoolId ? or(eq(s.schoolId, activeSchoolId), isNull(s.schoolId)) : undefined,
      orderBy: [
        sql`CASE WHEN ${schoolSessions.isActive} = TRUE THEN 0 WHEN LOWER(TRIM(${schoolSessions.status})) = 'actif' THEN 1 ELSE 2 END`,
        desc(schoolSessions.id),
      ],
    }).catch(() => []);

    const requestedSessionId = params.sessionId ? Number(params.sessionId) : null;
    let currentSession = requestedSessionId
      ? allSessions.find((s: any) => s.id === requestedSessionId)
      : null;

    if (!currentSession) {
      currentSession =
        allSessions.find((s: any) => s.isActive || s.status?.toLowerCase().trim() === "actif") ||
        allSessions[0] ||
        null;
    }

    currentSessionId = currentSession?.id || null;

    isSessionFrozen = Boolean(
      currentSession &&
      (!currentSession.isActive ||
        currentSession.status === "Clôturé" ||
        currentSession.status === "Verrouillé" ||
        currentSession.status === "Archivé")
    );
  } catch (error) {
    console.warn("[PayrollPage] Failed to fetch session freeze status:", error);
  }

  return (
    <PayrollClient
      dashboard={dashboard}
      initialRecords={records}
      rules={rules}
      employees={employees}
      headerConfig={headerConfig}
      canEdit={canEdit}
      canDelete={canDelete}
      sessions={allSessions}
      isSessionFrozen={isSessionFrozen}
      currentSessionId={currentSessionId}
    />
  );
}
