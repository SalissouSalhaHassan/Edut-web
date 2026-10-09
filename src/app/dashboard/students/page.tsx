export const dynamic = "force-dynamic";

import { getStudents, fixStudentLevels } from "@/domains/students/actions/students.actions";
import { getSessionUserAction } from "@/domains/auth/actions/users.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import StudentsClient from "./students-client";

export default async function StudentsPage() {
  let initialStudents: any[] = [];
  let currentUser: any = null;
  let activeSchoolId: number | null = null;
  let canEdit = false;
  let canDelete = false;

  try {
    const [studentsRes, userRes, schoolId] = await Promise.all([
      getStudents(),
      getSessionUserAction(),
      getActiveSchoolId(),
    ]);

    initialStudents = (studentsRes?.data as any)?.data || studentsRes?.data || [];
    currentUser = userRes?.data || null;
    activeSchoolId = schoolId;

    canEdit = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canEdit));
    canDelete = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canDelete));
  } catch (error: any) {
    console.warn("[StudentsPage] Failed to fetch server data, falling back to client-side offline cache", error);
  }

  // Debug query: Count all students in DB and per school
  let debugInfo: any = null;
  try {
    const { db } = await import("@/infrastructure/database");
    const { sql } = await import("drizzle-orm");
    const totalCountRes = await db.execute(sql`SELECT count(*)::int as count FROM students`);
    const totalInDb = Number((totalCountRes as any)[0]?.count ?? 0);
    const bySchool = await db.execute(sql`SELECT school_id, count(*)::int as count FROM students GROUP BY school_id`);
    debugInfo = {
      totalInDb,
      bySchool: (bySchool as any) || [],
      userSchoolId: currentUser?.schoolId,
      activeSchoolId,
      initialCount: initialStudents?.length ?? 0
    };
  } catch (e: any) {
    debugInfo = { error: e.message };
  }

  return (
    <StudentsClient 
      initialStudents={initialStudents}
      currentUser={currentUser}
      activeSchoolId={activeSchoolId}
      canEdit={canEdit}
      canDelete={canDelete}
      debugInfo={debugInfo}
    />
  );
}

