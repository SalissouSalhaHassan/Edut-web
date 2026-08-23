import { redirect } from "next/navigation";
import { getSession } from "@/domains/auth/services/session";
import { db } from "@/infrastructure/database";
import { exams, schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq } from "drizzle-orm";
import AiCameraGraderClient from "./ai-grader-client";

export const metadata = {
  title: "Correcteur d'Examens IA Caméra — Edut",
  description: "Correction automatique des copies d'examen par intelligence artificielle et vision par ordinateur",
};

export default async function AiCameraGraderPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = ((session.user as any)?.schoolId as number) || 1;

  // Fetch available exams
  const examList = await db.query.exams.findMany({
    where: eq(exams.schoolId, schoolId),
    with: {
      class: true,
      subject: true,
      period: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  // Fetch classes & students
  const classList = await db.query.schoolClasses.findMany({
    where: eq(schoolClasses.schoolId, schoolId),
    orderBy: (t, { asc }) => [asc(t.className)],
  });

  const studentList = await db.query.students.findMany({
    where: eq(students.schoolId, schoolId),
    orderBy: (t, { asc }) => [asc(t.nomEtudiant)],
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-8">
      <AiCameraGraderClient
        schoolId={schoolId}
        exams={examList as any}
        classes={classList as any}
        students={studentList as any}
      />
    </div>
  );
}
