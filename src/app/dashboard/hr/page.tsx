export const dynamic = "force-dynamic";

import { getEmployees, deleteEmployee } from "@/domains/hr/actions/employees.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getDocumentHeaderConfig } from "@/domains/settings/actions/settings.actions";
import HrClient from "./HrClient";

export default async function HRPage({
  searchParams,
}: {
  searchParams?: Promise<{ sessionId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const [result, currentUser, headerConfigRes, activeSchoolId] = await Promise.all([
    getEmployees(),
    getCurrentUser(),
    getDocumentHeaderConfig().catch(() => null),
    getActiveSchoolId(),
  ]);

  const allEmployees = ((result as any)?.data?.data || (result as any)?.data || []) as any[];
  const headerConfig = (headerConfigRes as any)?.data?.data || (headerConfigRes as any)?.data || null;

  const canEdit = Boolean(
    (currentUser as any)?.admin ||
    (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canEdit)
  );

  const canDelete = Boolean(
    (currentUser as any)?.admin ||
    (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "HR" && p.canDelete)
  );

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
    console.warn("[HRPage] Failed to fetch session freeze status:", error);
  }

  return (
    <HrClient
      allEmployees={allEmployees}
      headerConfig={headerConfig}
      canEdit={canEdit}
      canDelete={canDelete}
      deleteEmployeeAction={deleteEmployee}
      sessions={allSessions}
      isSessionFrozen={isSessionFrozen}
      currentSessionId={currentSessionId}
    />
  );
}
