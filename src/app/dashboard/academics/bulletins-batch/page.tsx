import { redirect } from "next/navigation";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { fetchBulletinDataForClass } from "@/domains/academics/actions/bulletin-batch.actions";
import { db } from "@/infrastructure/database";
import { schoolClasses, academicPeriods, schoolSessions } from "@/infrastructure/database/schema/academics";
import { and, eq, or, isNull } from "drizzle-orm";
import BulletinBatchClient from "./batch-client";

export const metadata = {
  title: "Impression Groupée des Bulletins — Edut",
  description: "Générer, imprimer et distribuer les bulletins scolaires en lot",
};

interface Props {
  searchParams: Promise<{ classId?: string; periodId?: string }>;
}

async function getBulletinDataForStudent(studentId: number, classId: number, periodId: number, schoolId: number) {
  "use server";
  const { getStudentBulletinData } = await import("@/domains/academics/actions/bulletin-batch.actions");
  return getStudentBulletinData(studentId, classId, periodId, schoolId);
}

export default async function BulletinsBatchPage({ searchParams }: Props) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;
  const classId = params.classId ? parseInt(params.classId) : null;
  const periodId = params.periodId ? parseInt(params.periodId) : null;

  // Fetch all classes for this school (flexible matching)
  const classes = await db.query.schoolClasses.findMany({
    where: or(
      eq(schoolClasses.schoolId, schoolId),
      isNull(schoolClasses.schoolId)
    ),
    orderBy: (t, { asc }) => [asc(t.className)],
  });

  // Fetch all active periods
  const activeSessions = await db.query.schoolSessions.findMany({
    where: or(
      eq(schoolSessions.schoolId, schoolId),
      isNull(schoolSessions.schoolId)
    ),
    with: { periods: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  let periods = activeSessions.flatMap((s: any) =>
    (s.periods || []).map((p: any) => ({ ...p, sessionName: s.sessionName, sessionId: s.id }))
  );

  if (periods.length === 0) {
    try {
      const allPeriods = await db.query.academicPeriods.findMany();
      periods = allPeriods.map((p: any) => ({ ...p, sessionName: "Année Scolaire" }));
    } catch (_) {}
  }

  // If class + period selected, load students
  let batchData: any = null;
  let selectedClass: any = null;
  let selectedPeriod: any = null;

  if (classId && periodId) {
    batchData = await fetchBulletinDataForClass(classId, periodId, schoolId);
    selectedClass = classes.find((c: any) => c.id === classId);
    selectedPeriod = periods.find((p: any) => p.id === periodId);
  }

  // Fetch branchInfo & headerConfig
  let branchInfo: any = {};
  let headerConfig: any = {};
  try {
    const { schoolBranches } = await import("@/infrastructure/database/schema/settings");
    const branchRes = await db.query.schoolBranches.findFirst({
      where: eq(schoolBranches.schoolId, schoolId),
    });
    branchInfo = branchRes || {};
  } catch (_) {}

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Selector Header (when no class/period selected) */}
      {(!classId || !periodId) && (
        <div className="mx-auto max-w-2xl p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">🖨️ Impression Groupée des Bulletins</h1>
            <p className="text-slate-500 text-sm mt-1">
              Sélectionnez une classe et une période pour commencer
            </p>
          </div>

          <form className="rounded-xl border bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Classe
              </label>
              <select
                name="classId"
                defaultValue={classId ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choisir une classe --</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.className}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Période / Trimestre
              </label>
              <select
                name="periodId"
                defaultValue={periodId ?? ""}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choisir une période --</option>
                {periods.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sessionName ? `(${p.sessionName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Charger les bulletins de la classe →
            </button>
          </form>
        </div>
      )}

      {/* Main Print Batch View */}
      {classId && periodId && batchData && (
        <BulletinBatchClient
          classId={classId}
          periodId={periodId}
          schoolId={schoolId}
          className={selectedClass?.className || "Classe"}
          periodName={selectedPeriod?.name || "Période"}
          students={batchData.students || []}
          schoolInfo={{
            name: (user as any)?.school?.name || "GROUP AIIU-NIGER",
            logoPath: (user as any)?.school?.logoPath || null,
          }}
          branchInfo={branchInfo}
          headerConfig={headerConfig}
          fetchStudentData={getBulletinDataForStudent}
        />
      )}
    </div>
  );
}
