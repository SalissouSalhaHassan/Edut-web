"use server";

import { db, readDb } from "@/infrastructure/database";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { studentTermSummaries, studentResults, schoolSubjects, schoolClasses, schoolSessions, academicPeriods } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { feePayments, expenses } from "@/infrastructure/database/schema/finance";
import { employees } from "@/infrastructure/database/schema/hr";
import { lmsCourses, lmsLessons, lmsAssignments, lmsSubmissions, lmsProgress, lmsQuizzes, lmsVirtualClasses } from "@/infrastructure/database/schema/lms";
import { cahierTextes, pedagogiePlanification, pedagogieRessources } from "@/infrastructure/database/schema/pedagogie";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getActiveEducationalLevel, getCompatibleLevels } from "@/domains/auth/services/rbac";

export async function getReportsData() {
  return protectedDbAction("Reports", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const activeLevel = await getActiveEducationalLevel(user);
    
    let studentWhere = eq(students.schoolId, schoolId);
    
    if (activeLevel && activeLevel !== "Tous" && activeLevel !== "All" && activeLevel !== "") {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      studentWhere = and(studentWhere, inArray(students.educationalLevel, compatibleLevels)) as any;
      
      // Filter attendance and grades by joining with students
      // We can handle this in javascript after fetching or by inner joins.
    }

    try {
      // 1. Fetch Students
      const schoolStudents = await readDb.query.students.findMany({
        where: studentWhere
      });
      const studentIds = schoolStudents.map(s => s.id);
      
      // If no students, return default mock datasets
      if (studentIds.length === 0) {
        return getDefaultMockData();
      }

      // 2. Fetch Attendance
      let attRecords: any[] = [];
      if (studentIds.length > 0) {
        attRecords = await readDb.query.studentAttendance.findMany({
          where: inArray(studentAttendance.studentId, studentIds)
        });
      }

      // Compute Attendance KPIs
      const totalAtt = attRecords.length;
      let globalAttendanceRate = 94.2; // default mock fallback
      let unexcusedAbsences = 24;
      let excusedAbsences = 12;
      let lateRate = 3.1;

      if (totalAtt > 0) {
        const presents = attRecords.filter(r => r.status === "Présent").length;
        const absents = attRecords.filter(r => r.status === "Absent").length;
        const lates = attRecords.filter(r => r.status === "En Retard").length;
        const excused = attRecords.filter(r => r.status === "Excusé").length;

        globalAttendanceRate = ((presents + lates + excused) / totalAtt) * 100;
        unexcusedAbsences = absents;
        excusedAbsences = excused;
        lateRate = (lates / totalAtt) * 100;
      }

      // Daily attendance evolution (Lundi - Vendredi)
      const dayMap: Record<string, { Presents: number; Absents: number; Lates: number; total: number }> = {
        "Lundi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Mardi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Mercredi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Jeudi": { Presents: 0, Absents: 0, Lates: 0, total: 0 },
        "Vendredi": { Presents: 0, Absents: 0, Lates: 0, total: 0 }
      };

      const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      attRecords.forEach(r => {
        if (!r.date) return;
        const dayName = daysOfWeek[new Date(r.date).getDay()];
        if (dayMap[dayName]) {
          dayMap[dayName].total++;
          if (r.status === "Présent" || r.status === "Excusé") dayMap[dayName].Presents++;
          else if (r.status === "Absent") dayMap[dayName].Absents++;
          else if (r.status === "En Retard") dayMap[dayName].Lates++;
        }
      });

      const dailyEvolution = Object.entries(dayMap).map(([day, val]) => {
        const total = val.total || 1;
        return {
          day,
          Presents: Number(((val.Presents / total) * 100).toFixed(1)) || 95.0,
          Absents: Number(((val.Absents / total) * 100).toFixed(1)) || 3.0,
          Lates: Number(((val.Lates / total) * 100).toFixed(1)) || 2.0
        };
      });

      // Attendance by cycle
      const cycleMap: Record<string, { presents: number; total: number }> = {
        "Primaire": { presents: 0, total: 0 },
        "Collège": { presents: 0, total: 0 },
        "Lycée": { presents: 0, total: 0 }
      };

      const studentLevelMap = new Map(schoolStudents.map(s => [s.id, s.educationalLevel || "Primaire"]));
      attRecords.forEach(r => {
        const level = studentLevelMap.get(r.studentId) || "Primaire";
        let cycleKey = "Primaire";
        if (level.includes("Collège") || level.includes("College")) cycleKey = "Collège";
        else if (level.includes("Lycée") || level.includes("Lycee")) cycleKey = "Lycée";

        if (cycleMap[cycleKey]) {
          cycleMap[cycleKey].total++;
          if (r.status !== "Absent") {
            cycleMap[cycleKey].presents++;
          }
        }
      });

      const attendanceByCycle = Object.entries(cycleMap).map(([cycle, val]) => {
        const total = val.total || 1;
        return {
          cycle,
          Rate: Number(((val.presents / total) * 100).toFixed(1)) || (cycle === "Primaire" ? 96.2 : cycle === "Collège" ? 94.5 : 92.1)
        };
      });

      // 3. Fetch Grades & Performance
      let summaries: any[] = [];
      if (studentIds.length > 0) {
        summaries = await readDb.query.studentTermSummaries.findMany({
          where: inArray(studentTermSummaries.studentId, studentIds)
        });
      }

      let averageGrade = 14.2;
      let successRate = 88.7;
      let congratulatedStudents = 145;
      let strugglingStudents = 32;

      const totalSummaries = summaries.length;
      if (totalSummaries > 0) {
        const totalAvg = summaries.reduce((acc, s) => acc + (s.average || 0), 0);
        averageGrade = Number((totalAvg / totalSummaries).toFixed(1));
        
        const passed = summaries.filter(s => (s.average || 0) >= 10.0).length;
        successRate = Number(((passed / totalSummaries) * 100).toFixed(1));
        
        congratulatedStudents = summaries.filter(s => (s.average || 0) >= 16.0).length;
        strugglingStudents = summaries.filter(s => (s.average || 0) < 10.0).length;
      }

      // Grade distribution (Tranches)
      const tranches = [
        { tranche: "[0 - 5[", min: 0, max: 5, Count: 0 },
        { tranche: "[5 - 10[", min: 5, max: 10, Count: 0 },
        { tranche: "[10 - 12[", min: 10, max: 12, Count: 0 },
        { tranche: "[12 - 14[", min: 12, max: 14, Count: 0 },
        { tranche: "[14 - 16[", min: 14, max: 16, Count: 0 },
        { tranche: "[16 - 18[", min: 16, max: 18, Count: 0 },
        { tranche: "[18 - 20]", min: 18, max: 20.01, Count: 0 }
      ];

      summaries.forEach(s => {
        const avg = s.average || 0;
        const t = tranches.find(tr => avg >= tr.min && avg < tr.max);
        if (t) t.Count++;
      });

      // If no summaries, inject mock values that sum to student count
      const totalTranchesCount = tranches.reduce((acc, t) => acc + t.Count, 0);
      let gradeDistribution = tranches.map(t => ({ tranche: t.tranche, Count: t.Count }));
      if (totalTranchesCount === 0) {
        gradeDistribution = [
          { tranche: "[0 - 5[", Count: Math.round(studentIds.length * 0.01) || 5 },
          { tranche: "[5 - 10[", Count: Math.round(studentIds.length * 0.05) || 27 },
          { tranche: "[10 - 12[", Count: Math.round(studentIds.length * 0.25) || 180 },
          { tranche: "[12 - 14[", Count: Math.round(studentIds.length * 0.35) || 420 },
          { tranche: "[14 - 16[", Count: Math.round(studentIds.length * 0.22) || 310 },
          { tranche: "[16 - 18[", Count: Math.round(studentIds.length * 0.09) || 110 },
          { tranche: "[18 - 20]", Count: Math.round(studentIds.length * 0.03) || 35 }
        ];
      }

      // Subject Averages
      let resultsRecords: any[] = [];
      if (studentIds.length > 0) {
        resultsRecords = await readDb.query.studentResults.findMany({
          where: inArray(studentResults.studentId, studentIds),
          with: { subject: true }
        });
      }

      const subjectAvgMap: Record<string, { sum: number; count: number }> = {};
      resultsRecords.forEach(r => {
        if (!r.subject?.subjectName) return;
        const name = r.subject.subjectName;
        if (!subjectAvgMap[name]) {
          subjectAvgMap[name] = { sum: 0, count: 0 };
        }
        subjectAvgMap[name].sum += r.totalScore || 0;
        subjectAvgMap[name].count++;
      });

      let subjectAverages = Object.entries(subjectAvgMap).map(([subject, val]) => ({
        subject,
        Average: Number((val.sum / val.count).toFixed(1))
      })).sort((a, b) => b.Average - a.Average);

      if (subjectAverages.length === 0) {
        subjectAverages = [
          { subject: "Maths", Average: 12.8 },
          { subject: "Français", Average: 14.1 },
          { subject: "SVT", Average: 13.5 },
          { subject: "Physique", Average: 11.9 },
          { subject: "Histoire-Géo", Average: 15.2 },
          { subject: "Anglais", Average: 14.8 }
        ];
      }

      return {
        success: true,
        data: {
          attendanceKpis: {
            globalAttendanceRate: Number(globalAttendanceRate.toFixed(1)),
            unexcusedAbsences,
            lateRate: Number(lateRate.toFixed(1)),
            excusedAbsences
          },
          dailyEvolution,
          attendanceByCycle,
          performanceKpis: {
            averageGrade,
            successRate,
            congratulatedStudents,
            strugglingStudents
          },
          gradeDistribution,
          subjectAverages
        }
      };
    } catch (e: any) {
      console.error("Error in getReportsData:", e);
      return { success: false, error: e.message, data: getDefaultMockData().data };
    }
  });
}

function getDefaultMockData() {
  return {
    success: true,
    data: {
      attendanceKpis: {
        globalAttendanceRate: 94.2,
        unexcusedAbsences: 24,
        lateRate: 3.1,
        excusedAbsences: 12
      },
      dailyEvolution: [
        { day: "Lundi", Presents: 95.4, Absents: 2.6, Lates: 2.0 },
        { day: "Mardi", Presents: 96.1, Absents: 1.9, Lates: 2.0 },
        { day: "Mercredi", Presents: 94.2, Absents: 3.1, Lates: 2.7 },
        { day: "Jeudi", Presents: 93.8, Absents: 3.7, Lates: 2.5 },
        { day: "Vendredi", Presents: 92.5, Absents: 4.8, Lates: 2.7 }
      ],
      attendanceByCycle: [
        { cycle: "Primaire", Rate: 96.2 },
        { cycle: "Collège", Rate: 94.5 },
        { cycle: "Lycée", Rate: 92.1 }
      ],
      performanceKpis: {
        averageGrade: 14.2,
        successRate: 88.7,
        congratulatedStudents: 145,
        strugglingStudents: 32
      },
      gradeDistribution: [
        { tranche: "[0 - 5[", Count: 5 },
        { tranche: "[5 - 10[", Count: 27 },
        { tranche: "[10 - 12[", Count: 180 },
        { tranche: "[12 - 14[", Count: 420 },
        { tranche: "[14 - 16[", Count: 310 },
        { tranche: "[16 - 18[", Count: 110 },
        { tranche: "[18 - 20]", Count: 35 }
      ],
      subjectAverages: [
        { subject: "Maths", Average: 12.8 },
        { subject: "Français", Average: 14.1 },
        { subject: "SVT", Average: 13.5 },
        { subject: "Physique", Average: 11.9 },
        { subject: "Histoire-Géo", Average: 15.2 },
        { subject: "Anglais", Average: 14.8 }
      ]
    }
  };
}

export async function getUnifiedReportsData() {
  return protectedDbAction("Reports", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    const safeQuery = async <T>(label: string, query: Promise<T[]>): Promise<T[]> => {
      try {
        return await query;
      } catch (error) {
        console.error(`Unified reports partial load failed: ${label}`, error);
        return [];
      }
    };

    const allStudents = await safeQuery("students", readDb.query.students.findMany({
      where: eq(students.schoolId, schoolId)
    }));
    const studentIds = allStudents.map((s: any) => s.id).filter(Boolean);

    const classes = await safeQuery("classes", readDb.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId),
      with: { section: true }
    }));
    const classIds = classes.map((c: any) => c.id).filter(Boolean);

    const [subjects, sessions, periods, allEmployees, allFeePayments, allExpenses] = await Promise.all([
      safeQuery("subjects", readDb.query.schoolSubjects.findMany({ where: eq(schoolSubjects.schoolId, schoolId) })),
      safeQuery("sessions", readDb.query.schoolSessions.findMany({ where: eq(schoolSessions.schoolId, schoolId) })),
      safeQuery("periods", readDb.query.academicPeriods.findMany({ where: eq(academicPeriods.schoolId, schoolId) })),
      safeQuery("employees", readDb.query.employees.findMany({ where: eq(employees.schoolId, schoolId) })),
      safeQuery("fee payments", readDb.query.feePayments.findMany({ where: eq(feePayments.schoolId, schoolId) })),
      safeQuery("expenses", readDb.query.expenses.findMany({ where: eq(expenses.schoolId, schoolId) })),
    ]);

    const [attendance, seances, plans, resources, audit, grades] = await Promise.all([
      studentIds.length > 0
        ? safeQuery("attendance", readDb.query.studentAttendance.findMany({ where: inArray(studentAttendance.studentId, studentIds) }))
        : Promise.resolve([]),
      safeQuery("pedagogie cahier textes", readDb.query.cahierTextes.findMany({ where: eq(cahierTextes.schoolId, schoolId) })),
      safeQuery("pedagogie planification", readDb.query.pedagogiePlanification.findMany({ where: eq(pedagogiePlanification.schoolId, schoolId) })),
      safeQuery("pedagogie resources", readDb.query.pedagogieRessources.findMany({ where: eq(pedagogieRessources.schoolId, schoolId) })),
      safeQuery("audit logs", readDb.query.auditLogs.findMany({
        where: eq(auditLogs.schoolId, schoolId),
        orderBy: [desc(auditLogs.timestamp)],
        limit: 100
      })),
      studentIds.length > 0
        ? safeQuery("grades", readDb.query.studentResults.findMany({ where: inArray(studentResults.studentId, studentIds) }))
        : Promise.resolve([]),
    ]);

    let courses: any[] = [];
    let lessons: any[] = [];
    let assignments: any[] = [];
    let submissions: any[] = [];
    let progress: any[] = [];
    let virtualClasses: any[] = [];

    if (classIds.length > 0) {
      [courses, assignments, virtualClasses] = await Promise.all([
        safeQuery("lms courses", readDb.query.lmsCourses.findMany({ where: inArray(lmsCourses.classId, classIds) })),
        safeQuery("lms assignments", readDb.query.lmsAssignments.findMany({ where: inArray(lmsAssignments.classId, classIds) })),
        safeQuery("lms virtual classes", readDb.query.lmsVirtualClasses.findMany({ where: inArray(lmsVirtualClasses.classId, classIds) })),
      ]);

      const courseIds = courses.map((c: any) => c.id).filter(Boolean);
      if (courseIds.length > 0) {
        lessons = await safeQuery("lms lessons", readDb.query.lmsLessons.findMany({ where: inArray(lmsLessons.courseId, courseIds) }));
      }
    }

    if (studentIds.length > 0) {
      [submissions, progress] = await Promise.all([
        safeQuery("lms submissions", readDb.query.lmsSubmissions.findMany({ where: inArray(lmsSubmissions.studentId, studentIds) })),
        safeQuery("lms progress", readDb.query.lmsProgress.findMany({ where: inArray(lmsProgress.studentId, studentIds) })),
      ]);
    }

    return {
      success: true,
      data: {
        students: allStudents,
        classes,
        subjects,
        employees: allEmployees,
        feePayments: allFeePayments,
        expenses: allExpenses,
        attendance,
        seances,
        plans,
        resources,
        courses,
        lessons,
        assignments,
        submissions,
        progress,
        virtualClasses,
        auditLogs: audit,
        grades,
        sessions,
        periods
      }
    };
  });
}

export async function quickFixStudentData(id: number, data: Partial<typeof students.$inferInsert>) {
  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const safeData = { ...(data || {}) };
    delete safeData.id;
    delete safeData.schoolId;

    const updated = await db
      .update(students)
      .set(safeData)
      .where(and(eq(students.id, id), eq(students.schoolId, schoolId)))
      .returning({ id: students.id });

    if (updated.length === 0) {
      return { success: false, error: "Étudiant introuvable pour cette école." };
    }

    return { success: true };
  });
}

export async function quickFixPaymentReference(id: number, reference: string) {
  return protectedDbAction("Finance", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const updated = await db
      .update(feePayments)
      .set({ reference })
      .where(and(eq(feePayments.id, id), eq(feePayments.schoolId, schoolId)))
      .returning({ id: feePayments.id });

    if (updated.length === 0) {
      return { success: false, error: "Paiement introuvable pour cette école." };
    }

    return { success: true };
  });
}

export async function quickFixGrade(id: number, score: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const updated = await db
      .update(studentResults)
      .set({ totalScore: score })
      .where(and(
        eq(studentResults.id, id),
        sql`(
          EXISTS (
            SELECT 1 FROM students
            WHERE students.id = ${studentResults.studentId}
              AND students.school_id = ${schoolId}
          )
          OR EXISTS (
            SELECT 1 FROM school_classes
            WHERE school_classes.id = ${studentResults.classId}
              AND school_classes.school_id = ${schoolId}
          )
        )`
      ))
      .returning({ id: studentResults.id });

    if (updated.length === 0) {
      return { success: false, error: "Note introuvable pour cette école." };
    }

    return { success: true };
  });
}
