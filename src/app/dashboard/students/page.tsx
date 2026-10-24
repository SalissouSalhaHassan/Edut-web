export const dynamic = "force-dynamic";

import { getStudents, fixStudentLevels } from "@/domains/students/actions/students.actions";
import { getSessionUserAction } from "@/domains/auth/actions/users.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import StudentsClient from "./students-client";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ sessionId?: string; search?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  let initialStudents: any[] = [];
  let currentUser: any = null;
  let activeSchoolId: number | null = null;
  let canEdit = false;
  let canDelete = false;
  let allSessions: any[] = [];
  let isSessionFrozen = false;
  let currentSessionId: number | null = null;

  let getStudentsError = null;
  try {
    const [studentsRes, userRes, schoolId] = await Promise.all([
      getStudents(),
      getSessionUserAction(),
      getActiveSchoolId(),
    ]);

    getStudentsError = studentsRes?.error || null;
    initialStudents = (studentsRes?.data as any)?.data || (Array.isArray(studentsRes?.data) ? studentsRes?.data : []);
    currentUser = userRes?.data || null;
    activeSchoolId = schoolId;

    canEdit = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canEdit));
    canDelete = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canDelete));

    // Resolve sessions and academic year freeze status
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
  } catch (error: any) {
    getStudentsError = error.message;
    console.warn("[StudentsPage] Failed to fetch server data, falling back to client-side offline cache", error);
  }

  // Debug query: Count all students in DB and directly fetch students for schoolId 11 / activeSchoolId
  let debugInfo: any = null;
  try {
    const { db } = await import("@/infrastructure/database");
    const { sql, eq, or, isNull } = await import("drizzle-orm");
    const { students } = await import("@/infrastructure/database/schema/students");

    const totalCountRes = await db.execute(sql`SELECT count(*)::int as count FROM students`);
    const totalInDb = Number((totalCountRes as any)[0]?.count ?? 0);
    const bySchool = await db.execute(sql`SELECT school_id, count(*)::int as count FROM students GROUP BY school_id`);
    
    // Direct server-side fetch guarantee: if initialStudents is empty, load directly from DB
    if (!initialStudents || initialStudents.length === 0) {
      const targetSchoolId = activeSchoolId || currentUser?.schoolId || 11;
      const directRows = await db.select({
        id: students.id,
        schoolId: students.schoolId,
        numAdmission: students.numAdmission,
        nomEtudiant: students.nomEtudiant,
        nomArabe: students.nomArabe,
        sexe: students.sexe,
        dateNaissance: students.dateNaissance,
        classe: students.classe,
        educationalLevel: students.educationalLevel,
        statut: students.statut,
        fraisMensuels: students.fraisMensuels,
        fraisInscription: students.fraisInscription,
        fraisCogesCard: students.fraisCogesCard,
        fraisTransportInternat: students.fraisTransportInternat,
        ancienSolde: students.ancienSolde,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(targetSchoolId ? or(eq(students.schoolId, targetSchoolId), isNull(students.schoolId)) : sql`TRUE`);

      if (directRows && directRows.length > 0) {
        initialStudents = directRows as any;
      }
    }
  } catch (e: any) {
    console.error("[StudentsPage] direct DB fetch error:", e);
  }

  return (
    <StudentsClient 
      initialStudents={initialStudents}
      currentUser={currentUser}
      activeSchoolId={activeSchoolId}
      canEdit={canEdit}
      canDelete={canDelete}
      isSessionFrozen={isSessionFrozen}
      sessions={allSessions}
      currentSessionId={currentSessionId}
    />
  );
}


