export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc } from "drizzle-orm";
import { getBoursesAndEcheanciersDashboardData } from "@/domains/finance/actions/bourses-echeanciers.actions";
import { BoursesEcheanciersClient } from "./bourses-echeanciers-client";

export default async function BoursesEcheanciersPage() {
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;

  // 1. Fetch dashboard data
  const dashRes = await getBoursesAndEcheanciersDashboardData();
  const initialData = dashRes.success && dashRes.data ? dashRes.data : {
    scholarships: [],
    allocations: [],
    schedules: [],
    metrics: {
      boursiersCount: 0,
      totalAllocatedBourses: 0,
      totalGrossSchedules: 0,
      totalNetSchedules: 0,
      totalPaidSchedules: 0,
      totalOverdueSchedules: 0,
      recoveryRate: 0,
    },
  };

  // 2. Fetch students list for dropdowns
  const studentsListRaw = await (readDb || db)
    .select({
      id: students.id,
      nom: students.nomEtudiant,
      matricule: students.numAdmission,
      classe: students.classe,
    })
    .from(students)
    .where(schoolId ? eq(students.schoolId, schoolId) : undefined)
    .orderBy(students.nomEtudiant)
    .limit(300);

  const studentsList = studentsListRaw.map((s) => ({
    id: s.id,
    nom: s.nom || "Étudiant",
    matricule: s.matricule || `MAT-${s.id}`,
    classe: s.classe || "Licence",
  }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <BoursesEcheanciersClient
        initialData={initialData}
        studentsList={studentsList}
      />
    </div>
  );
}
