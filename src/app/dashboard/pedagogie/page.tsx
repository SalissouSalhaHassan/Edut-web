import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import {
  getPedagogieClassOverview,
  getPedagogieOverview,
  getPedagogieSubjectOverview,
} from "@/domains/pedagogie/actions/analytics.actions";
import PedagogieDashboardClient from "./PedagogieDashboardClient";

import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { X } from "lucide-react";

export const metadata = {
  title: "Pédagogie & Enseignement | Edut",
  description: "Tableau de bord pédagogique - suivi progression, devoirs, ressources et rapports",
};

export default async function PedagogiePage() {
  const currentUser = await getCurrentUser();

  const role = getPedagogieRole(currentUser);
  if (role === "eleve" || role === "parent" || role === "guest" || role === "consultation") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-8 border border-slate-150 max-w-md text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto">
            <X size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800">Accès non autorisé</h2>
          <p className="text-slate-500 text-sm font-medium">
            Vous ne disposez pas des permissions nécessaires pour accéder au Tableau de bord pédagogique.
          </p>
        </div>
      </div>
    );
  }

  const [
    classesRes,
    subjectsRes,
    employeesRes,
    studentsRes,
    assignmentsRes,
    overviewRes,
    classOverviewRes,
    subjectOverviewRes,
  ] = await Promise.all([
    getClasses(true),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getAssignments(),
    getPedagogieOverview(),
    getPedagogieClassOverview(),
    getPedagogieSubjectOverview(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const students = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];
  const assignments = (assignmentsRes as any).data?.data || (assignmentsRes as any).data || assignmentsRes || [];
  const overview = (overviewRes as any).data || null;
  const classOverview = (classOverviewRes as any).data || [];
  const subjectOverview = (subjectOverviewRes as any).data || [];

  const teachers = employees.filter((employee: any) =>
    (employee.poste || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (employee.fonction || "").toLowerCase().match(/profess|enseign|teacher|instit/) ||
    (employee.role?.roleName || "").toLowerCase().match(/profess|enseign/)
  );

  return (
    <PedagogieDashboardClient
      currentUser={currentUser}
      classes={classes}
      subjects={subjects}
      teachers={teachers.length > 0 ? teachers : employees}
      students={students}
      assignments={assignments}
      overview={overview}
      classOverview={classOverview}
      subjectOverview={subjectOverview}
    />
  );
}
