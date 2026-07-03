import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initRessourcesTable, getRessources } from "@/domains/pedagogie/actions/ressources.actions";
import RessourcesClient from "./RessourcesClient";

export const metadata = {
  title: "Bibliothèque de ressources pédagogiques | Pédagogie | Edut",
  description: "Fichiers PDF, vidéos, présentations et exercices scolaires",
};

export default async function RessourcesPage() {
  // 1. Initialize table
  await initRessourcesTable();

  // 2. Fetch current user context
  const currentUser = await getCurrentUser();

  // 3. Parallel fetch of reference data
  const [classesRes, subjectsRes, employeesRes, ressourcesRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getRessources(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const resources = (ressourcesRes as any).data || [];

  return (
    <RessourcesClient
      currentUser={currentUser}
      initialResources={resources}
      classes={classes}
      subjects={subjects}
      employees={employees}
    />
  );
}
