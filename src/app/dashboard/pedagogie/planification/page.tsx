import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initPlanificationTable, getPlanifications } from "@/domains/pedagogie/actions/planification.actions";
import PlanificationClient from "./PlanificationClient";

export const metadata = {
  title: "Planification pédagogique | Pédagogie | Edut",
  description: "Gestion des planifications pédagogiques annuelles, mensuelles et hebdomadaires",
};

export default async function PlanificationPage() {
  // 1. Initialize table
  await initPlanificationTable();

  // 2. Fetch current user context
  const currentUser = await getCurrentUser();

  // 3. Parallel fetch of reference data
  const [classesRes, subjectsRes, employeesRes, plansRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getPlanifications(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const plans = (plansRes as any).data || [];

  return (
    <PlanificationClient
      currentUser={currentUser}
      initialPlans={plans}
      classes={classes}
      subjects={subjects}
      employees={employees}
    />
  );
}
