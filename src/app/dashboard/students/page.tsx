export const dynamic = "force-dynamic";

import { getStudents, fixStudentLevels } from "@/domains/students/actions/students.actions";
import { getSessionUserAction } from "@/domains/auth/actions/users.actions";
import StudentsClient from "./students-client";

export default async function StudentsPage() {
  let initialStudents: any[] = [];
  let currentUser: any = null;
  let canEdit = false;
  let canDelete = false;

  try {
    const [studentsRes, userRes] = await Promise.all([
      getStudents(),
      getSessionUserAction(),
    ]);

    initialStudents = (studentsRes?.data as any)?.data || studentsRes?.data || [];
    currentUser = userRes?.data || null;

    canEdit = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canEdit));
    canDelete = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Students" && p.canDelete));
  } catch (error) {
    console.warn("[StudentsPage] Failed to fetch server data, falling back to client-side offline cache", error);
  }

  return (
    <StudentsClient 
      initialStudents={initialStudents}
      currentUser={currentUser}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
