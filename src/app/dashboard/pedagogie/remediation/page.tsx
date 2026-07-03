import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { initRemediationTable, getRemediationPlans } from "@/domains/pedagogie/actions/remediation.actions";
import RemediationClient from "./RemediationClient";

export const metadata = {
  title: "Plan de remédiation pédagogique | Pédagogie | Edut",
  description: "Accompagnement personnalisé des élèves en difficulté d'apprentissage",
};

export default async function RemediationPage() {
  // 1. Provision table
  await initRemediationTable();

  const currentUser = await getCurrentUser();

  const [classesRes, subjectsRes, employeesRes, studentsRes, plansRes] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getRemediationPlans(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const students = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];
  const plans = (plansRes as any).data || [];

  return (
    <RemediationClient
      currentUser={currentUser}
      initialPlans={plans}
      classes={classes}
      subjects={subjects}
      employees={employees}
      students={students}
    />
  );
}
