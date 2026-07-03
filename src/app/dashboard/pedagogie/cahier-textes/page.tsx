import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initCahierTextesTable, getSeances } from "@/domains/pedagogie/actions/cahier-textes.actions";
import CahierTextesClient from "./CahierTextesClient";

export const metadata = {
  title: "Cahier de textes numérique | Pédagogie | Edut",
  description: "Gestion numérique du cahier de textes par classe, matière et enseignant",
};

export default async function CahierTextesPage() {
  // 1. Init table on first access
  await initCahierTextesTable();

  // 2. Fetch current user
  const currentUser = await getCurrentUser();

  // 3. Fetch reference data in parallel
  const [classesRes, subjectsRes, employeesRes, seancesRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getSeances(),
  ]);

  const classes   = (classesRes   as any).data?.data || (classesRes   as any).data || classesRes   || [];
  const subjects  = (subjectsRes  as any).data?.data || (subjectsRes  as any).data || subjectsRes  || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const seances   = (seancesRes   as any).data || [];

  return (
    <CahierTextesClient
      currentUser={currentUser}
      initialSeances={seances}
      classes={classes}
      subjects={subjects}
      employees={employees}
    />
  );
}
