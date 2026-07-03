import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import { db } from "@/infrastructure/database";
import DevoirsClient from "./DevoirsClient";

export const metadata = {
  title: "Devoirs & Corrections | Pédagogie | Edut",
  description: "Gestion des devoirs, dépôts des réponses, correction et notation des élèves",
};

export default async function DevoirsPage() {
  const currentUser = await getCurrentUser();

  const [classesRes, subjectsRes, employeesRes, studentsRes, assignmentsRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getAssignments(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const students = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];
  const assignments = (assignmentsRes as any).data || [];

  // Fetch all submissions with relations for easier tabular display
  const submissions = await db.query.lmsSubmissions.findMany({
    with: {
      student: true,
      assignment: {
        with: {
          class: true,
          subject: true,
        }
      }
    },
    orderBy: (t, { desc }) => [desc(t.submittedAt)]
  });

  return (
    <DevoirsClient
      currentUser={currentUser}
      initialAssignments={assignments}
      initialSubmissions={submissions}
      classes={classes}
      subjects={subjects}
      employees={employees}
      students={students}
    />
  );
}
