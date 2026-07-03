import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getSeances } from "@/domains/pedagogie/actions/cahier-textes.actions";
import { getPlanifications } from "@/domains/pedagogie/actions/planification.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import { getRemediationPlans } from "@/domains/pedagogie/actions/remediation.actions";
import { getInspectionVisits } from "@/domains/pedagogie/actions/inspection.actions";
import { db } from "@/infrastructure/database";
import RapportsClient from "./RapportsClient";

export const metadata = {
  title: "Centre de rapports pédagogiques | Pédagogie | Edut",
  description: "Génération et export de rapports détaillés sur les cahiers de textes, les programmes, les devoirs et les inspections",
};

export default async function RapportsPage() {
  const currentUser = await getCurrentUser();

  const [
    classesRes, subjectsRes, employeesRes, studentsRes,
    seancesRes, plansRes, assignmentsRes, remediationsRes, inspectionsRes
  ] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getSeances(),
    getPlanifications(),
    getAssignments(),
    getRemediationPlans(),
    getInspectionVisits(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const students = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];

  const seances = (seancesRes as any).data || [];
  const plans = (plansRes as any).data || [];
  const assignments = (assignmentsRes as any).data || [];
  const remediations = (remediationsRes as any).data || [];
  const inspections = (inspectionsRes as any).data || [];

  // Fetch all submissions for Devoir reporting
  const submissions = await db.query.lmsSubmissions.findMany({
    with: {
      student: true,
      assignment: {
        with: {
          class: true,
          subject: true,
        }
      }
    }
  });

  return (
    <RapportsClient
      currentUser={currentUser}
      classes={classes}
      subjects={subjects}
      employees={employees}
      students={students}
      seances={seances}
      plans={plans}
      assignments={assignments}
      submissions={submissions}
      remediations={remediations}
      inspections={inspections}
    />
  );
}
