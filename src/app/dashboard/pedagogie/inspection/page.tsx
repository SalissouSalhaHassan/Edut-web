import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { initInspectionTable, getInspectionVisits } from "@/domains/pedagogie/actions/inspection.actions";
import InspectionClient from "./InspectionClient";

export const metadata = {
  title: "Inspection pédagogique | Pédagogie | Edut",
  description: "Suivi des visites de classe, observations et rapports d'inspection pédagogique",
};

export default async function InspectionPage() {
  // 1. Provision table
  await initInspectionTable();

  const currentUser = await getCurrentUser();

  const [classesRes, subjectsRes, employeesRes, visitsRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getInspectionVisits(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const visits = (visitsRes as any).data || [];

  return (
    <InspectionClient
      currentUser={currentUser}
      initialVisits={visits}
      classes={classes}
      subjects={subjects}
      employees={employees}
    />
  );
}
