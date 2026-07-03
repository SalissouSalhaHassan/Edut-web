import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import PedagogieDashboardClient from "./PedagogieDashboardClient";

export const metadata = {
  title: "Pédagogie & Enseignement | Edut",
  description: "Tableau de bord pédagogique — suivi progression, devoirs, ressources et rapports",
};

export default async function PedagogiePage() {
  const currentUser = await getCurrentUser();

  const [classesRes, subjectsRes, employeesRes, studentsRes, assignmentsRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getAssignments(),
  ]);

  const classes     = (classesRes     as any).data?.data || (classesRes     as any).data || classesRes     || [];
  const subjects    = (subjectsRes    as any).data?.data || (subjectsRes    as any).data || subjectsRes    || [];
  const employees   = (employeesRes   as any).data?.data || (employeesRes   as any).data || employeesRes   || [];
  const students    = (studentsRes    as any).data?.data || (studentsRes    as any).data || studentsRes    || [];
  const assignments = (assignmentsRes as any).data?.data || (assignmentsRes as any).data || assignmentsRes || [];

  // Detect teachers (by role name or position)
  const teachers = employees.filter((e: any) =>
    (e.poste     || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (e.fonction  || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (e.role?.roleName || "").toLowerCase().match(/profess|enseign/)
  );

  return (
    <PedagogieDashboardClient
      currentUser={currentUser}
      classes={classes}
      subjects={subjects}
      teachers={teachers.length > 0 ? teachers : employees}
      students={students}
      assignments={assignments}
    />
  );
}
