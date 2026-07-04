import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects, getSessions, getPeriods } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getSeances } from "@/domains/pedagogie/actions/cahier-textes.actions";
import { getPlanifications } from "@/domains/pedagogie/actions/planification.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import { getRemediationPlans } from "@/domains/pedagogie/actions/remediation.actions";
import { getInspectionVisits } from "@/domains/pedagogie/actions/inspection.actions";
import { db } from "@/infrastructure/database";
import RapportsClient from "./RapportsClient";
import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Centre de rapports pédagogiques | Pédagogie | Edut",
  description: "Génération et export de rapports détaillés sur les cahiers de textes, les programmes, les devoirs et les inspections",
};

export default async function RapportsPage() {
  const currentUser = await getCurrentUser();

  const role = getPedagogieRole(currentUser);
  if (role === "enseignant" || role === "eleve" || role === "parent" || role === "guest" || role === "consultation") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-8 border border-slate-150 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto">
            <X size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Accès non autorisé</h2>
          <p className="text-slate-500 text-sm font-medium">
            L’accès au Centre de rapports pédagogiques est réservé aux administrateurs et responsables pédagogiques.
          </p>
        </div>
      </div>
    );
  }

  const [
    classesRes, subjectsRes, employeesRes, studentsRes,
    seancesRes, plansRes, assignmentsRes, remediationsRes, inspectionsRes,
    sessionsRes, periodsRes
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
    getSessions(),
    getPeriods(),
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
  const sessions = (sessionsRes as any).data || sessionsRes || [];
  const periods = (periodsRes as any).data || periodsRes || [];

  const activeSession = sessions.find((s: any) => s.isActive) || sessions[0];
  const activeSessionName = activeSession?.sessionName || (new Date().getFullYear() + "-" + (new Date().getFullYear() + 1));

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
      sessions={sessions}
      activeSessionName={activeSessionName}
      periods={periods}
    />
  );
}
