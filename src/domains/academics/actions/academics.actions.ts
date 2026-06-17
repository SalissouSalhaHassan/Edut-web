"use server";

import { db, readDb } from "@/infrastructure/database";
import { getCurrentUser } from "@/domains/auth/services/session";
import {
  getActiveEducationalLevel,
  getCompatibleLevels,
  getTeacherClassIds,
  getTeacherEmployee,
  getUserRoleType,
  verifyTeacherClassAccess,
  verifyTeacherClassSubjectAccess,
} from "@/domains/auth/services/rbac";
import { 
  schoolClasses, 
  schoolSections, 
  educationalLevels, 
  schoolSubjects, 
  academicPeriods, 
  schoolSessions, 
  gradingAppreciations, 
  schoolRemarks,
  classSubjects,
  sectionSubjects,
  studentResults,
  studentTermSummaries
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { eq, and, or, ilike, isNull, sql, inArray, desc } from "drizzle-orm";
import { revalidatePath, unstable_cache, revalidateTag as nextRevalidateTag } from "next/cache";
const revalidateTag = nextRevalidateTag as any;

const ACADEMICS_CACHE_TAG = "academics-cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

// Helper to get educational level filter - admins see all
function getLevelFilter() {
  return async () => {
    const user = await getCurrentUser();
    const schoolId = await getActiveSchoolId();
    const isAdmin = user?.admin === true;
    
    let conditions = [eq(schoolSections.schoolId, schoolId)];
    
    if (!isAdmin && user?.educationalLevel) {
      conditions.push(ilike(schoolSections.educationalLevel, user.educationalLevel));
    }
    
    return and(...conditions);
  };
}

const fetchFilterOptions = (
  schoolId: number,
  activeLevel: string | null,
  restrictedClassIds: number[] | null,
  employeeId: number | null = null
) =>
  unstable_cache(
    async () => {
      const compatibleLevels = activeLevel ? getCompatibleLevels(activeLevel) : null;
      const classIdRestriction = restrictedClassIds && restrictedClassIds.length > 0
        ? inArray(schoolClasses.id, restrictedClassIds)
        : undefined;

      if (restrictedClassIds && restrictedClassIds.length === 0) {
        return {
          classes: [],
          sessions: [],
          periods: [],
          subjects: [],
          sections: [],
          levels: [],
          classSubjectLinks: [],
          sectionSubjectLinks: []
        };
      }

      // Run all primary queries in parallel using db to reduce latency
      const [sections, sessions, periods, subjects, levels] = await Promise.all([
        db.query.schoolSections.findMany({
          where: and(
            eq(schoolSections.schoolId, schoolId),
            compatibleLevels ? inArray(schoolSections.educationalLevel, compatibleLevels) : undefined
          ),
          orderBy: schoolSections.sectionName
        }),
        db.query.schoolSessions.findMany({
          where: schoolId 
            ? or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId))
            : isNull(schoolSessions.schoolId)
        }),
        db.query.academicPeriods.findMany({
          where: eq(academicPeriods.schoolId, schoolId)
        }),
        db.query.schoolSubjects.findMany({
          where: eq(schoolSubjects.schoolId, schoolId),
          orderBy: schoolSubjects.subjectName 
        }),
        db.query.educationalLevels.findMany({
          where: and(
            eq(educationalLevels.schoolId, schoolId),
            compatibleLevels ? inArray(educationalLevels.levelName, compatibleLevels) : undefined
          ),
          orderBy: educationalLevels.levelName
        })
      ]);
      
      const sectionIds = sections.map(s => s.id);
      
      // Run secondary queries (dependent on sectionIds) in parallel
      const [classes, classSubjectLinks, sectionSubjectLinks] = await Promise.all([
        sectionIds.length > 0 
          ? db.query.schoolClasses.findMany({
              where: and(
                eq(schoolClasses.schoolId, schoolId),
                inArray(schoolClasses.sectionId, sectionIds),
                classIdRestriction
              ),
              with: { section: true },
              orderBy: schoolClasses.className
            })
          : Promise.resolve([]),
        sectionIds.length > 0
          ? db.query.classSubjects.findMany({
              where: employeeId
                ? and(eq(classSubjects.schoolId, schoolId), eq(classSubjects.employeeId, employeeId))
                : eq(classSubjects.schoolId, schoolId)
            })
          : Promise.resolve([]),
        sectionIds.length > 0
          ? db.query.sectionSubjects.findMany({
              where: inArray(sectionSubjects.sectionId, sectionIds)
            })
          : Promise.resolve([])
      ]);
      
      return {
        classes,
        sessions,
        periods,
        subjects,
        sections,
        levels,
        classSubjectLinks,
        sectionSubjectLinks
      };
    },
    [
      'academic-filter-options-v3',
      String(schoolId),
      activeLevel || 'all-levels',
      restrictedClassIds ? restrictedClassIds.join(',') || 'no-classes' : 'all-classes',
      employeeId ? String(employeeId) : 'no-employee'
    ],
    { tags: [ACADEMICS_CACHE_TAG], revalidate: 3600 }
  )();

// Filter Options - now filtered by educational level and schoolId
export async function getFilterOptions() {
  const user = await getCurrentUser();
  const schoolId = await getActiveSchoolId();
  const roleType = await getUserRoleType(user);
  let activeLevel = await getActiveEducationalLevel(user);
  let restrictedClassIds: number[] | null = null;
  let employeeId: number | null = null;

  if (roleType === "teacher") {
    const employee = await getTeacherEmployee(user);
    restrictedClassIds = employee ? await getTeacherClassIds(employee.id) : [];
    employeeId = employee ? employee.id : null;
    activeLevel = null;
  }
  
  return protectedDbAction("Academics", "canView", async () => {
    return await fetchFilterOptions(schoolId, activeLevel, restrictedClassIds, employeeId);
  });
}

// Basic Fetchers - filtered by educational level for non-admins
export async function getClasses(ignoreActiveFilter = false) {
  const schoolId = await getActiveSchoolId();
  
  return protectedDbAction("Academics", "canView", async (user) => {
    const roleType = await getUserRoleType(user);

    if (!ignoreActiveFilter && roleType === "teacher") {
      const employee = await getTeacherEmployee(user);
      if (!employee) return [];

      const classIds = await getTeacherClassIds(employee.id);
      if (classIds.length === 0) return [];

      return await db.query.schoolClasses.findMany({
        where: and(
          eq(schoolClasses.schoolId, schoolId),
          inArray(schoolClasses.id, classIds)
        ),
        orderBy: schoolClasses.className,
        with: { section: true }
      });
    }

    const activeLevel = ignoreActiveFilter ? null : await getActiveEducationalLevel(user);

    if (!activeLevel) {
      return await db.query.schoolClasses.findMany({
        where: eq(schoolClasses.schoolId, schoolId),
        orderBy: schoolClasses.className,
        with: { section: true }
      });
    }
    
    // Get compatible sections first
    const compatibleLevels = getCompatibleLevels(activeLevel);
    const userSections = await db.query.schoolSections.findMany({
      where: and(
        eq(schoolSections.schoolId, schoolId),
        inArray(schoolSections.educationalLevel, compatibleLevels)
      ),
      columns: { id: true }
    });
    const sectionIds = userSections.map(s => s.id);
    
    if (sectionIds.length === 0) return [];

    return await db.query.schoolClasses.findMany({
      where: and(
        eq(schoolClasses.schoolId, schoolId),
        inArray(schoolClasses.sectionId, sectionIds)
      ),
      orderBy: schoolClasses.className,
      with: { section: true }
    });
  });
}

export async function getSections(ignoreActiveFilter = false) {
  const user = await getCurrentUser();
  const schoolId = await getActiveSchoolId();
  const activeLevel = ignoreActiveFilter ? null : await getActiveEducationalLevel(user);
  
  return protectedDbAction("Academics", "canView", async () => {
    if (!activeLevel) {
      return await db.query.schoolSections.findMany({
        where: eq(schoolSections.schoolId, schoolId),
        orderBy: schoolSections.sectionName
      });
    }
    
    const compatibleLevels = getCompatibleLevels(activeLevel);
    return await db.query.schoolSections.findMany({
      where: and(
        eq(schoolSections.schoolId, schoolId),
        inArray(schoolSections.educationalLevel, compatibleLevels)
      ),
      orderBy: schoolSections.sectionName
    });
  });
}

export async function getEducationalLevels(ignoreActiveFilter = false) {
  const user = await getCurrentUser();
  const activeLevel = ignoreActiveFilter ? null : await getActiveEducationalLevel(user);
  
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    let whereClause = eq(educationalLevels.schoolId, schoolId);
    
    if (activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      whereClause = and(whereClause, inArray(educationalLevels.levelName, compatibleLevels)) as any;
    }
    
    return await db.query.educationalLevels.findMany({
      where: whereClause,
      orderBy: educationalLevels.levelName
    });
  });
}

export async function getSchoolRemarks() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    
    // Filter by sections of the school
    const sections = await db.query.schoolSections.findMany({
      where: eq(schoolSections.schoolId, schoolId),
      columns: { id: true }
    });
    const sectionIds = sections.map(s => s.id);

    if (sectionIds.length === 0) return [];

    return await db.query.schoolRemarks.findMany({
      where: inArray(schoolRemarks.sectionId, sectionIds),
      orderBy: schoolRemarks.displayOrder
    });
  });
}

export async function getSubjects() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    return await db.query.schoolSubjects.findMany({
      where: eq(schoolSubjects.schoolId, schoolId),
      orderBy: schoolSubjects.subjectName
    });
  });
}

export async function getPeriods() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    return await db.query.academicPeriods.findMany({
      where: eq(academicPeriods.schoolId, schoolId),
      orderBy: academicPeriods.name
    });
  });
}

export async function getSessions() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    return await db.query.schoolSessions.findMany({
      where: schoolId 
        ? or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId))
        : isNull(schoolSessions.schoolId),
      orderBy: schoolSessions.sessionName
    });
  });
}

// Cache for grading appreciations as they change rarely
const fetchGradingAppreciations = unstable_cache(
  async (schoolId: number) => {
    return await db.query.gradingAppreciations.findMany({
      orderBy: gradingAppreciations.displayOrder
    });
  },
  ['grading-appreciations'],
  { tags: [ACADEMICS_CACHE_TAG], revalidate: 3600 }
);

export async function getGradingAppreciations() {
  const schoolId = await getActiveSchoolId();
  return protectedDbAction("Academics", "canView", async () => {
    return await fetchGradingAppreciations(schoolId);
  });
}

export async function getSubjectsForClass(classId: number) {
  return protectedDbAction("Academics", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    // Teachers only see subjects they teach in this class
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (!emp) return [];

      const links = await db.query.classSubjects.findMany({
        where: and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.schoolId, schoolId),
          eq(classSubjects.employeeId, emp.id)
        ),
        with: { subject: true, teacher: true }
      });
      return links;
    }

    // Admin/Director sees all subjects for the class
    const links = await db.query.classSubjects.findMany({
      where: and(
        eq(classSubjects.classId, classId),
        eq(classSubjects.schoolId, schoolId)
      ),
      with: { subject: true, teacher: true }
    });
    return links;
  });
}

export async function getSectionSubjects() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    
    // Filter by joining with sections that belong to this school
    const sections = await db.query.schoolSections.findMany({
      where: eq(schoolSections.schoolId, schoolId),
      columns: { id: true }
    });
    
    const sectionIds = sections.map(s => s.id);
    if (sectionIds.length === 0) return [];

    const links = await db.query.sectionSubjects.findMany({
      where: inArray(sectionSubjects.sectionId, sectionIds),
      with: { subject: true, section: true }
    });
    return links;
  });
}

export async function getClassSubjects() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const links = await db.query.classSubjects.findMany({
      where: eq(classSubjects.schoolId, schoolId),
      with: {
        class: {
          with: { section: true }
        },
        subject: true
      }
    });
    return links;
  });
}

// CRUD Operations
export async function createClass(data: { className: string, sectionId?: number | null }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const existing = await readDb.query.schoolClasses.findFirst({
      where: and(
        eq(schoolClasses.schoolId, schoolId),
        ilike(schoolClasses.className, data.className)
      )
    });
    if (existing) return { error: "Cette classe existe déjà." };

    await db.insert(schoolClasses).values({
      className: data.className,
      sectionId: data.sectionId,
      schoolId: schoolId
    });
    revalidatePath("/dashboard/academics");
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function updateClass(id: number, data: { className: string, sectionId?: number | null }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.update(schoolClasses).set(data as any).where(
      and(
        eq(schoolClasses.id, id),
        eq(schoolClasses.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/academics");
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function deleteClass(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(schoolClasses).where(
      and(
        eq(schoolClasses.id, id),
        eq(schoolClasses.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/academics");
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function createSection(data: { sectionName: string, educationalLevel: string }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const existing = await readDb.query.schoolSections.findFirst({
      where: and(
        eq(schoolSections.schoolId, schoolId),
        ilike(schoolSections.sectionName, data.sectionName)
      )
    });
    if (existing) return { error: "Cette section existe déjà." };

    await db.insert(schoolSections).values({
      ...data,
      schoolId: schoolId
    });
    revalidatePath("/dashboard/academics");
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function updateSection(id: number, data: {
  sectionName?: string;
  educationalLevel?: string;
  minPassingGrade?: number;
  redoublementThreshold?: number;
  exclusionThreshold?: number;
  numTerms?: number;
  termLabels?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.update(schoolSections).set(data).where(
      and(
        eq(schoolSections.id, id),
        eq(schoolSections.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/academics");
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function deleteSection(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(schoolSections).where(
      and(
        eq(schoolSections.id, id),
        eq(schoolSections.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/academics");
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

// Grading Grid
export async function getGradingGrid(params: { classId: number, subjectId: number, sessionId: number, term: string }) {
  return protectedDbAction("Academics", "canView", async (user) => {
    // Verify teacher has access to this class and subject
    const hasAccess = await verifyTeacherClassSubjectAccess(user, params.classId, params.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
    }

    const cls = await readDb.query.schoolClasses.findFirst({ where: eq(schoolClasses.id, params.classId), with: { section: true } });
    if (!cls) return { error: "Classe non trouvée" };

    const classIdNum = Number(params.classId);
    const subjectIdNum = Number(params.subjectId);
    const sessionIdNum = Number(params.sessionId);

    // Fetch all dependent data in parallel using readDb
    const [studentList, attendanceStats, subLink, results] = await Promise.all([
      readDb.select()
        .from(students)
        .where(ilike(students.classe, cls.className.trim()))
        .orderBy(students.nomEtudiant),
      readDb.select({
        studentId: studentAttendance.studentId,
        presents: sql<number>`count(*) filter (where ${studentAttendance.status} = 'Présent')`,
        absents: sql<number>`count(*) filter (where ${studentAttendance.status} = 'Absent')`,
      })
      .from(studentAttendance)
      .where(and(
        eq(studentAttendance.classId, classIdNum),
        params.subjectId ? eq(studentAttendance.subjectId, subjectIdNum) : isNull(studentAttendance.subjectId)
      ))
      .groupBy(studentAttendance.studentId),
      params.subjectId && !isNaN(subjectIdNum)
        ? readDb.query.classSubjects.findFirst({
            where: and(
              eq(classSubjects.classId, classIdNum),
              eq(classSubjects.subjectId, subjectIdNum)
            )
          })
        : Promise.resolve(null),
      readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classIdNum),
          eq(studentResults.subjectId, subjectIdNum),
          eq(studentResults.sessionId, sessionIdNum),
          eq(studentResults.term, params.term)
        )
      })
    ]);

    const activeCoefficient = subLink?.coefficient || 1.0;
    const statsMap = new Map(attendanceStats.map(s => [s.studentId, s]));
    const resultsMap = new Map(results.map(r => [r.studentId, r]));

    const data = studentList.map(s => {
      const stats = statsMap.get(s.id);
      const res = resultsMap.get(s.id);
      return {
        id: s.id,
        numAdmission: s.numAdmission,
        nomEtudiant: s.nomEtudiant,
        attendance: {
          presents: Number(stats?.presents || 0),
          absents: Number(stats?.absents || 0),
        },
        existingResult: res ? {
          classWorkScore: res.classWorkScore,
          examScore: res.examScore,
          totalScore: res.totalScore,
          weightedScore: res.weightedScore,
          rank: res.rank,
          observation: res.observation,
          appreciation: res.appreciation,
        } : null,
        fullStudent: s
      };
    });

    return { data, level: cls.section?.educationalLevel || "Lycée", activeCoefficient };
  });
}

// Save Grades
export async function saveStudentGrades(resultsData: any[]) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    if (resultsData.length === 0) return { success: true };

    const first = resultsData[0];

    // Verify teacher has access to this class and subject
    const hasAccess = await verifyTeacherClassSubjectAccess(user, first.classId, first.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
    }

    const existing = await db.query.studentResults.findMany({
      where: and(
        eq(studentResults.classId, first.classId),
        eq(studentResults.subjectId, first.subjectId),
        eq(studentResults.sessionId, first.sessionId),
        eq(studentResults.term, first.term)
      )
    });

    const existingMap = new Map(existing.map(r => [r.studentId, r.id]));

    await Promise.all(resultsData.map(async (row) => {
      const { studentId, subjectId, classId, sessionId, term, ...scores } = row;
      
      const dbValues = {
        studentId,
        subjectId,
        classId,
        sessionId,
        term,
        classWorkScore: scores.classWorkScore,
        examScore: scores.examScore,
        totalScore: scores.totalScore,
        coefficient: scores.coefficient,
        weightedScore: scores.weightedScore,
        absences: scores.absences || 0,
        observation: scores.observation,
        appreciation: scores.appreciation,
        rank: scores.rank,
      };

      const existingId = existingMap.get(studentId);
      if (existingId) {
        await db.update(studentResults).set(dbValues).where(eq(studentResults.id, existingId));
      } else {
        await db.insert(studentResults).values(dbValues);
      }
    }));

    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

// Devoir Grid
export async function getDevoirGrid(params: { classId: number, subjectId: number, sessionId: number, term: string }) {
  return protectedDbAction("Academics", "canView", async (user) => {
    // Verify teacher has access to this class and subject
    const hasAccess = await verifyTeacherClassSubjectAccess(user, params.classId, params.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
    }

    const cls = await readDb.query.schoolClasses.findFirst({ where: eq(schoolClasses.id, params.classId), with: { section: true } });
    if (!cls) return { error: "Classe non trouvée" };

    const classIdNum = Number(params.classId);
    const subjectIdNum = Number(params.subjectId);
    const sessionIdNum = Number(params.sessionId);

    const [studentList, results] = await Promise.all([
      readDb.select()
        .from(students)
        .where(ilike(students.classe, cls.className.trim()))
        .orderBy(students.nomEtudiant),
      readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classIdNum),
          eq(studentResults.sessionId, sessionIdNum),
          eq(studentResults.subjectId, subjectIdNum),
          eq(studentResults.term, params.term)
        )
      })
    ]);

    const resultsMap = new Map(results.map(r => [r.studentId, r]));

    const data = studentList.map(s => {
      const res = resultsMap.get(s.id);
      return {
        id: s.id,
        numAdmission: s.numAdmission,
        nomEtudiant: s.nomEtudiant,
        devoirs: res ? [res.devoir1, res.devoir2, res.devoir3, res.devoir4, res.devoir5] : [null, null, null, null, null],
        moyenneDevoirs: res?.moyenneDevoirs || 0,
        fullStudent: s
      };
    });

    return { data };
  });
}

// Save Devoir Grades
export async function saveDevoirGrades(payload: any[]) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    if (payload.length === 0) return { success: true };

    const first = payload[0];

    // Verify teacher has access to this class and subject
    const hasAccess = await verifyTeacherClassSubjectAccess(user, first.classId, first.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
    }

    const existing = await db.query.studentResults.findMany({
      where: and(
        eq(studentResults.classId, first.classId),
        eq(studentResults.sessionId, first.sessionId),
        eq(studentResults.subjectId, first.subjectId),
        eq(studentResults.term, first.term)
      )
    });

    const existingMap = new Map(existing.map(r => [r.studentId, r.id]));

    await Promise.all(payload.map(async (row) => {
      const { studentId, subjectId, classId, sessionId, term, devoirs, moyenneDevoirs } = row;
      
      const dbValues = {
        studentId,
        subjectId,
        classId,
        sessionId,
        term,
        devoir1: devoirs[0] ?? null,
        devoir2: devoirs[1] ?? null,
        devoir3: devoirs[2] ?? null,
        devoir4: devoirs[3] ?? null,
        devoir5: devoirs[4] ?? null,
        moyenneDevoirs,
        classWorkScore: moyenneDevoirs, // Usually classWorkScore is the average of devoirs
      };

      const existingId = existingMap.get(studentId);
      if (existingId) {
        await db.update(studentResults).set(dbValues).where(eq(studentResults.id, existingId));
      } else {
        await db.insert(studentResults).values(dbValues);
      }
    }));

    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

// Broadsheet Matrix
const fetchBroadsheetMatrix = (params: { classId: number, sessionId: number, term: string }) =>
  unstable_cache(
    async () => {
      const cls = await readDb.query.schoolClasses.findFirst({ where: eq(schoolClasses.id, params.classId) });
      if (!cls) return { error: "Classe non trouvée" };

      const classIdNum = Number(params.classId);
      const sessionIdNum = Number(params.sessionId);

      // 1. Fetch all primary data components in parallel using readDb
      const [studentsWithResults, studentsByClassName, results, summaries] = await Promise.all([
        readDb.selectDistinct({ studentId: studentResults.studentId })
          .from(studentResults)
          .where(and(
            eq(studentResults.classId, classIdNum),
            eq(studentResults.sessionId, sessionIdNum),
            eq(studentResults.term, params.term)
          )),
        readDb.select({ id: students.id })
          .from(students)
          .where(ilike(students.classe, cls.className.trim())),
        readDb.query.studentResults.findMany({
          where: and(
            eq(studentResults.classId, classIdNum),
            eq(studentResults.sessionId, sessionIdNum),
            eq(studentResults.term, params.term)
          ),
          with: {
            subject: true
          }
        }),
        readDb.query.studentTermSummaries.findMany({
          where: and(
            eq(studentTermSummaries.classId, classIdNum),
            eq(studentTermSummaries.sessionId, sessionIdNum),
            eq(studentTermSummaries.term, params.term)
          )
        }).catch(e => {
          console.error("[getBroadsheetMatrix] Error fetching summaries:", e);
          return [];
        })
      ]);

      // 2. Process student IDs and fetch full student data
      const studentIdsFromResults = studentsWithResults.map(r => r.studentId).filter((id): id is number => id !== null);
      const studentIdsByClass = studentsByClassName.map(s => s.id);
      const allStudentIds = Array.from(new Set([...studentIdsFromResults, ...studentIdsByClass]));

      let studentList: any[] = [];
      if (allStudentIds.length > 0) {
        studentList = await readDb.select()
          .from(students)
          .where(inArray(students.id, allStudentIds))
          .orderBy(students.nomEtudiant);
      }

      // 3. Fetch unique subjects involved in these results
      const subjectIds = Array.from(new Set(results.map(r => r.subjectId).filter((id): id is number => id !== null)));
      let subjectsList: any[] = [];
      if (subjectIds.length > 0) {
        subjectsList = await readDb.query.schoolSubjects.findMany({
          where: inArray(schoolSubjects.id, subjectIds)
        });
      }

      // 4. Map data for UI using efficient Lookups
      const summariesMap = new Map(summaries.map(s => [s.studentId, s]));
      
      // Create a result map for O(1) lookup inside studentList.map
      const resultsByStudent = new Map<number, any[]>();
      results.forEach(r => {
        if (r.studentId) {
          if (!resultsByStudent.has(r.studentId)) resultsByStudent.set(r.studentId, []);
          resultsByStudent.get(r.studentId)!.push(r);
        }
      });
      
      const data = studentList.map(s => {
        const studentRes = resultsByStudent.get(s.id) || [];
        const summary = summariesMap.get(s.id);
        
        const resultsObj: Record<number, any> = {};
        let totalWeighted = 0;
        let totalCoef = 0;

        studentRes.forEach(r => {
          if (r.subjectId) {
            const cw = parseFloat(String(r.classWorkScore ?? "0")) || 0;
            const ex = parseFloat(String(r.examScore ?? "0")) || 0;
            const coef = parseFloat(String(r.coefficient ?? "1")) || 1;
            const avg = (cw + ex) / 2;
            const weighted = avg * coef;

            resultsObj[r.subjectId] = {
              n1: r.classWorkScore !== null ? String(r.classWorkScore) : "-",
              n2: r.examScore !== null ? String(r.examScore) : "-",
              total: r.totalScore !== null ? String(r.totalScore) : "-",
              moy: avg.toFixed(2),
              rank: r.rank !== null ? String(r.rank) : "-"
            };
            totalWeighted += weighted;
            totalCoef += coef;
          }
        });

        const average = summary?.average ?? (totalCoef > 0 ? totalWeighted / totalCoef : 0);
        const decision = summary?.decision ?? (average >= 10 ? "ADMIS ✅" : "REDOUBLE ❌");
        const rank = summary?.rank ?? "N/A";

        return {
          id: s.id,
          name: s.nomEtudiant,
          matricule: s.numAdmission,
          results: resultsObj,
          average,
          decision,
          rank,
          totalCoef,
          behaviorScore: s.behaviorScore || 20.0,
          conduite: summary?.conduite || 0.0,
          travail: summary?.travail || "-",
          tableauHonneur: summary?.tableauHonneur || false,
          history: []
        };
      });

      return { students: data, subjects: subjectsList };
    },
    ['broadsheet-matrix', String(params.classId), String(params.sessionId), params.term],
    { tags: [ACADEMICS_CACHE_TAG], revalidate: 3600 }
  )();

export async function getBroadsheetMatrix(params: { classId: number, sessionId: number, term: string }) {
  return protectedDbAction("Academics", "canView", async (user) => {
    // 1. Get raw matrix
    const matrix = await fetchBroadsheetMatrix(params);
    if ('error' in matrix) return matrix;

    // 2. Filter if user is teacher
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      const hasClassAccess = await verifyTeacherClassAccess(user, params.classId);
      if (!hasClassAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe." };
      }

      const employee = await getTeacherEmployee(user);
      if (!employee) return { students: [], subjects: [] };

      const teacherSubjects = await db.select({ subjectId: classSubjects.subjectId })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, params.classId),
          eq(classSubjects.employeeId, employee.id)
        ));
      
      const teacherSubIds = new Set(teacherSubjects.map(ts => ts.subjectId));

      // Filter subjects list
      const filteredSubjectsList = matrix.subjects.filter(sub => teacherSubIds.has(sub.id));

      // Filter students' grades details in results object
      const filteredStudents = matrix.students.map(stud => {
        const resultsObj: Record<number, any> = {};
        let totalWeighted = 0;
        let totalCoef = 0;
        
        filteredSubjectsList.forEach(sub => {
          const res = stud.results[sub.id];
          if (res) {
            resultsObj[sub.id] = res;
            totalWeighted += (res.totalScore || 0) * (res.coefficient || 1);
            totalCoef += (res.coefficient || 1);
          }
        });

        const newAverage = totalCoef > 0 ? totalWeighted / totalCoef : 0;

        return {
          ...stud,
          results: resultsObj,
          average: newAverage,
          rank: "-", // Rank cannot be determined for a subset of subjects
        };
      });

      return { students: filteredStudents, subjects: filteredSubjectsList };
    }

    return matrix;
  });
}

// Save Term Summaries
export async function saveTermSummaries(summaries: any[]) {
  return protectedDbAction("Academics", "canEdit", async () => {
    if (summaries.length === 0) return { success: true };

    const first = summaries[0];
    const existing = await db.query.studentTermSummaries.findMany({
      where: and(
        eq(studentTermSummaries.classId, first.classId),
        eq(studentTermSummaries.sessionId, first.sessionId),
        eq(studentTermSummaries.term, first.term)
      )
    });

    const existingMap = new Map(existing.map(r => [r.studentId, r.id]));

    await Promise.all(summaries.map(async (row) => {
      const { studentId, classId, sessionId, term, ...data } = row;
      
      const dbValues = {
        studentId,
        classId,
        sessionId,
        term,
        average: data.average,
        rank: data.rank,
        decision: data.decision,
        conduite: data.conduite,
        travail: data.travail,
        tableauHonneur: data.tableauHonneur,
      };

      const existingId = existingMap.get(studentId);
      if (existingId) {
        await db.update(studentTermSummaries).set(dbValues).where(eq(studentTermSummaries.id, existingId));
      } else {
        await db.insert(studentTermSummaries).values(dbValues);
      }
    }));

    return { success: true };
  });
}

// ─── Cached Data Fetchers ───────────────────────────────────────────────────

const fetchCachedStudentBulletinData = (sId: number, sessionId: number, term: string) =>
  unstable_cache(
    async () => {
      console.log(`🔄 [Cache Miss] Fetching bulletin data for Student ${sId}, Term ${term}...`);
      
      // 1. Fetch Student with current class info
      const student = await db.query.students.findFirst({
        where: eq(students.id, sId),
      });

      if (!student) return { error: "Étudiant non trouvé" };

      // 2. Fetch Results for this student
      const allResults = await db.query.studentResults.findMany({
        where: and(
          eq(studentResults.studentId, sId),
          eq(studentResults.sessionId, Number(sessionId))
        ),
        with: {
          subject: true
        }
      });

      if (allResults.length === 0) {
        return { error: `Aucune note trouvée pour cet élève. (ID: ${sId}, Session: ${sessionId})` };
      }

      const results = allResults.filter(r => r.term === term);

      let summaries: any[] = [];
      try {
        summaries = await db.query.studentTermSummaries.findMany({
          where: and(
            eq(studentTermSummaries.studentId, sId),
            eq(studentTermSummaries.sessionId, Number(sessionId))
          )
        });
      } catch (e: any) {
        console.warn("⚠️ Failed to fetch student summaries:", e.message);
      }

      let summary = summaries.find(s => s.term === term) || null;

      // Dynamic Rank Calculation
      const classId = results[0]?.classId;
      let computedGeneralRank = summary?.rank || "-";

      if (classId) {
        try {
          const allClassResults = await db.query.studentResults.findMany({
            where: and(
              eq(studentResults.classId, classId),
              eq(studentResults.sessionId, Number(sessionId)),
              eq(studentResults.term, term)
            )
          });

          const studentAverages = new Map<number, { totalWeighted: number; totalCoef: number }>();
          const subjectGroups = new Map<number, { studentId: number; avg: number }[]>();

          allClassResults.forEach(r => {
            // General Average Gathering
            if (!studentAverages.has(r.studentId as number)) {
              studentAverages.set(r.studentId as number, { totalWeighted: 0, totalCoef: 0 });
            }
            const sData = studentAverages.get(r.studentId as number)!;
            const cw = parseFloat(r.classWorkScore as any) || 0;
            const ex = parseFloat(r.examScore as any) || 0;
            const coef = parseFloat(r.coefficient as any) || 1;
            const avg = (cw + ex) / 2;
            sData.totalWeighted += (avg * coef);
            sData.totalCoef += coef;

            // Subject Average Gathering
            if (r.subjectId) {
              if (!subjectGroups.has(r.subjectId)) subjectGroups.set(r.subjectId, []);
              subjectGroups.get(r.subjectId)!.push({ studentId: r.studentId as number, avg });
            }
          });

          // Compute General Rank
          const averagesList = Array.from(studentAverages.entries()).map(([id, sData]) => ({
            studentId: id,
            average: sData.totalCoef > 0 ? (sData.totalWeighted / sData.totalCoef) : 0
          }));
          averagesList.sort((a, b) => b.average - a.average);

          let currentRank = 1;
          for (let i = 0; i < averagesList.length; i++) {
            if (i > 0 && averagesList[i].average < averagesList[i - 1].average) {
              currentRank = i + 1;
            }
            if (averagesList[i].studentId === sId) {
              computedGeneralRank = String(currentRank);
              break;
            }
          }

          // Compute Subject Ranks
          for (const r of results) {
            if (!r.subjectId) continue;
            const group = subjectGroups.get(r.subjectId) || [];
            group.sort((a, b) => b.avg - a.avg);
            
            let sRank = 1;
            for (let i = 0; i < group.length; i++) {
              if (i > 0 && group[i].avg < group[i - 1].avg) {
                sRank = i + 1;
              }
              if (group[i].studentId === sId) {
                r.rank = String(sRank); // Override stored rank with actual dynamic rank
                break;
              }
            }
          }
        } catch (err) {
          console.warn("⚠️ Failed to calculate dynamic ranks", err);
        }
      }

      if (!summary) {
        summary = { rank: computedGeneralRank } as any;
      } else {
        summary.rank = computedGeneralRank;
      }

      // Auto-calculate default behavior appreciations
      let studentTotalWeighted = 0;
      let studentTotalCoef = 0;
      results.forEach(r => {
        const cw = parseFloat(r.classWorkScore as any) || 0;
        const ex = parseFloat(r.examScore as any) || 0;
        const coef = parseFloat(r.coefficient as any) || 1;
        const avg = (cw + ex) / 2;
        studentTotalWeighted += (avg * coef);
        studentTotalCoef += coef;
      });
      const generalAverage = studentTotalCoef > 0 ? (studentTotalWeighted / studentTotalCoef) : 0;

      let defaultTravail = "-";
      if (generalAverage >= 16) defaultTravail = "Félicitation";
      else if (generalAverage >= 14) defaultTravail = "Bien";
      else if (generalAverage >= 12) defaultTravail = "Encouragement";
      else if (generalAverage >= 10) defaultTravail = "Passable";
      else if (generalAverage >= 8) defaultTravail = "Avertissement";
      else defaultTravail = "Blâme";

      summary.conduite = (summary.conduite && summary.conduite > 0) ? summary.conduite : (student.behaviorScore ?? 20.0);
      summary.travail = (summary.travail && summary.travail !== "-") ? summary.travail : defaultTravail;
      summary.tableauHonneur = summary.tableauHonneur || (generalAverage >= 14);

      const sessionRecord = await db.query.schoolSessions.findFirst({
        where: eq(schoolSessions.id, sessionId)
      });

      let totalStudents = 0;
      if (student?.classe) {
        const classStudents = await db.select({ count: sql`count(*)` })
          .from(students)
          .where(eq(students.classe, student.classe));
        totalStudents = Number(classStudents[0]?.count || 0);
      }

      // Fetch Branch Info
      let branchRecord = await db.query.schoolBranches.findFirst({
        where: ilike(schoolBranches.instType, student.educationalLevel || "Lycée")
      });

      if (!branchRecord) {
        branchRecord = await db.query.schoolBranches.findFirst({
          orderBy: [desc(schoolBranches.createdAt)]
        });
      }

      const branchInfo = {
        branchName: branchRecord?.branchName || "ÉCOLE GESTION PRO",
        registrationNo: branchRecord?.registrationNo || "N/A",
        contactNo: branchRecord?.contactNo || "",
        email: branchRecord?.email || "",
        address: branchRecord?.address || "",
        logoPath: branchRecord?.logoPath || ""
      };

      const resultsS1 = allResults.filter(r => r.term?.toLowerCase().includes("1") || r.term?.toLowerCase().includes("première") || r.term === "F1" || r.term?.toLowerCase().includes("a1") || r.term?.toLowerCase().includes("d1"));
      const resultsS2 = allResults.filter(r => r.term?.toLowerCase().includes("2") || r.term?.toLowerCase().includes("deuxième") || r.term === "F2" || r.term?.toLowerCase().includes("a2") || r.term?.toLowerCase().includes("d2"));
      const resultsS3 = allResults.filter(r => r.term?.toLowerCase().includes("3") || r.term?.toLowerCase().includes("troisième") || r.term === "F3" || r.term?.toLowerCase().includes("a3") || r.term?.toLowerCase().includes("d3"));
      const resultsS4 = allResults.filter(r => r.term?.toLowerCase().includes("4") || r.term?.toLowerCase().includes("quatrième") || r.term === "F4" || r.term?.toLowerCase().includes("a4") || r.term?.toLowerCase().includes("d4"));
      const resultsS5 = allResults.filter(r => r.term?.toLowerCase().includes("5") || r.term?.toLowerCase().includes("cinquième") || r.term === "F5" || r.term?.toLowerCase().includes("a5") || r.term?.toLowerCase().includes("d5"));
      const resultsS6 = allResults.filter(r => r.term?.toLowerCase().includes("6") || r.term?.toLowerCase().includes("sixième") || r.term === "F6" || r.term?.toLowerCase().includes("a6") || r.term?.toLowerCase().includes("d6"));

      const summaryS1 = summaries.find(s => s.term?.toLowerCase().includes("1") || s.term?.toLowerCase().includes("première") || s.term === "F1" || s.term?.toLowerCase().includes("a1") || s.term?.toLowerCase().includes("d1")) || null;
      const summaryS2 = summaries.find(s => s.term?.toLowerCase().includes("2") || s.term?.toLowerCase().includes("deuxième") || s.term === "F2" || s.term?.toLowerCase().includes("a2") || s.term?.toLowerCase().includes("d2")) || null;
      const summaryS3 = summaries.find(s => s.term?.toLowerCase().includes("3") || s.term?.toLowerCase().includes("troisième") || s.term === "F3" || s.term?.toLowerCase().includes("a3") || s.term?.toLowerCase().includes("d3")) || null;
      const summaryS4 = summaries.find(s => s.term?.toLowerCase().includes("4") || s.term?.toLowerCase().includes("quatrième") || s.term === "F4" || s.term?.toLowerCase().includes("a4") || s.term?.toLowerCase().includes("d4")) || null;
      const summaryS5 = summaries.find(s => s.term?.toLowerCase().includes("5") || s.term?.toLowerCase().includes("cinquième") || s.term === "F5" || s.term?.toLowerCase().includes("a5") || s.term?.toLowerCase().includes("d5")) || null;
      const summaryS6 = summaries.find(s => s.term?.toLowerCase().includes("6") || s.term?.toLowerCase().includes("sixième") || s.term === "F6" || s.term?.toLowerCase().includes("a6") || s.term?.toLowerCase().includes("d6")) || null;

      return {
        student,
        session: sessionRecord?.sessionName || sessionId,
        term,
        results,
        summary,
        resultsS1,
        resultsS2,
        resultsS3,
        resultsS4,
        resultsS5,
        resultsS6,
        summaryS1,
        summaryS2,
        summaryS3,
        summaryS4,
        summaryS5,
        summaryS6,
        totalStudents,
        branchInfo
      };
    },
    ["bulletin-data", String(sId), String(sessionId), term],
    { tags: [ACADEMICS_CACHE_TAG], revalidate: 600 } // Cache for 10 minutes
  )();

export async function getStudentBulletinData(sId: number, sessionId: number, term: string) {
  return protectedDbAction("Academics", "canView", async () => {
    return await fetchCachedStudentBulletinData(sId, sessionId, term);
  });
}

// ─── Batch Bulletin Generation (Optimization) ─────────────────────────────

export async function getBatchBulletinData(classId: number, sessionId: number, term: string) {
  return protectedDbAction("Academics", "canView", async () => {
    console.log(`📦 [Batch Processing] Fetching bulk bulletin data for Class ${classId}, Term ${term}...`);
    
    // 1. Fetch Class and Branch Info
    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true }
    });
    if (!cls) return { error: "Classe non trouvée" };

    const branchRecord = await db.query.schoolBranches.findFirst({
      where: ilike(schoolBranches.instType, cls.section?.educationalLevel || "Lycée")
    }) || await db.query.schoolBranches.findFirst({ orderBy: [desc(schoolBranches.createdAt)] });

    const branchInfo = {
      branchName: branchRecord?.branchName || "ÉCOLE GESTION PRO",
      registrationNo: branchRecord?.registrationNo || "N/A",
      contactNo: branchRecord?.contactNo || "",
      email: branchRecord?.email || "",
      address: branchRecord?.address || "",
      logoPath: branchRecord?.logoPath || ""
    };

    const sessionRecord = await db.query.schoolSessions.findFirst({ where: eq(schoolSessions.id, sessionId) });

    // 2. Fetch all students in this class
    const studentList = await db.select()
      .from(students)
      .where(ilike(students.classe, cls.className.trim()))
      .orderBy(students.nomEtudiant);

    if (studentList.length === 0) return { data: [] };

    // 3. Fetch all results and summaries for these students
    const studentIds = studentList.map(s => s.id);
    const allResults = await db.query.studentResults.findMany({
      where: and(
        inArray(studentResults.studentId, studentIds),
        eq(studentResults.sessionId, Number(sessionId)),
        eq(studentResults.term, term)
      ),
      with: { subject: true }
    });

    const allSummaries = await db.query.studentTermSummaries.findMany({
      where: and(
        inArray(studentTermSummaries.studentId, studentIds),
        eq(studentTermSummaries.sessionId, Number(sessionId)),
        eq(studentTermSummaries.term, term)
      )
    });

    // 4. Pre-calculate Ranks for all students
    const studentAverages = new Map<number, { totalWeighted: number; totalCoef: number }>();
    const subjectGroups = new Map<number, { studentId: number; avg: number }[]>();

    allResults.forEach(r => {
      if (!studentAverages.has(r.studentId as number)) {
        studentAverages.set(r.studentId as number, { totalWeighted: 0, totalCoef: 0 });
      }
      const sData = studentAverages.get(r.studentId as number)!;
      const cw = parseFloat(r.classWorkScore as any) || 0;
      const ex = parseFloat(r.examScore as any) || 0;
      const coef = parseFloat(r.coefficient as any) || 1;
      const avg = (cw + ex) / 2;
      sData.totalWeighted += (avg * coef);
      sData.totalCoef += coef;

      if (r.subjectId) {
        if (!subjectGroups.has(r.subjectId)) subjectGroups.set(r.subjectId, []);
        subjectGroups.get(r.subjectId)!.push({ studentId: r.studentId as number, avg });
      }
    });

    const averagesList = Array.from(studentAverages.entries()).map(([id, sData]) => ({
      studentId: id,
      average: sData.totalCoef > 0 ? (sData.totalWeighted / sData.totalCoef) : 0
    }));
    averagesList.sort((a, b) => b.average - a.average);

    const generalRanks = new Map<number, number>();
    let currentRank = 1;
    for (let i = 0; i < averagesList.length; i++) {
      if (i > 0 && averagesList[i].average < averagesList[i - 1].average) currentRank = i + 1;
      generalRanks.set(averagesList[i].studentId, currentRank);
    }

    // 5. Assemble data for each student
    const batchData = studentList.map(s => {
      const results = allResults.filter(r => r.studentId === s.id);
      const summary = allSummaries.find(sum => sum.studentId === s.id) || { rank: String(generalRanks.get(s.id) || "-") } as any;
      summary.rank = String(generalRanks.get(s.id) || "-");

      return {
        student: s,
        session: sessionRecord?.sessionName || sessionId,
        term,
        results,
        summary,
        totalStudents: studentList.length,
        branchInfo
      };
    });

    return { data: batchData };
  });
}
// ─── Sessions ───────────────────────────────────────────────────────────────
export async function createSession(sessionName: string) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const existing = await readDb.query.schoolSessions.findFirst({
      where: and(
        eq(schoolSessions.schoolId, schoolId),
        ilike(schoolSessions.sessionName, sessionName)
      )
    });
    if (existing) return { error: "Cette année scolaire existe déjà." };

    await db.insert(schoolSessions).values({ 
      sessionName,
      schoolId: schoolId 
    });
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function deleteSession(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(schoolSessions).where(
      and(
        eq(schoolSessions.id, id),
        eq(schoolSessions.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

// ─── Periods ─────────────────────────────────────────────────────────────────
export async function createPeriod(data: { name: string; periodType: string; sessionId?: number | null; isActive?: boolean }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.insert(academicPeriods).values({
      name: data.name,
      periodType: data.periodType,
      sessionId: data.sessionId || null,
      isActive: data.isActive ?? true,
      schoolId: schoolId,
    });
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function updatePeriod(id: number, data: { name: string; periodType: string; sessionId?: number | null; isActive?: boolean }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.update(academicPeriods).set({
      name: data.name,
      periodType: data.periodType,
      sessionId: data.sessionId || null,
      isActive: data.isActive ?? true,
    }).where(
      and(
        eq(academicPeriods.id, id),
        eq(academicPeriods.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function deletePeriod(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(academicPeriods).where(
      and(
        eq(academicPeriods.id, id),
        eq(academicPeriods.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

// ─── Educational Levels ───────────────────────────────────────────────────────
export async function createEducationalLevel(levelName: string) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const existing = await readDb.query.educationalLevels.findFirst({
      where: and(
        eq(educationalLevels.schoolId, schoolId),
        ilike(educationalLevels.levelName, levelName)
      )
    });
    if (existing) return { error: "Ce niveau existe déjà." };

    await db.insert(educationalLevels).values({ 
      levelName,
      schoolId: schoolId
    });
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function deleteEducationalLevel(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(educationalLevels).where(
      and(
        eq(educationalLevels.id, id),
        eq(educationalLevels.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

// ─── Subjects ─────────────────────────────────────────────────────────────────
export async function createSubject(data: { subjectName: string; subjectCode?: string; category?: string; sectionId?: number }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.insert(schoolSubjects).values({
      subjectName: data.subjectName,
      subjectCode: data.subjectCode || null,
      category: data.category || null,
      schoolId: schoolId,
    });
    revalidatePath("/dashboard/settings");
    revalidateTag(ACADEMICS_CACHE_TAG);
    return { success: true };
  });
}

export async function deleteSubject(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(schoolSubjects).where(
      and(
        eq(schoolSubjects.id, id),
        eq(schoolSubjects.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function importSubjects(names: string[], sectionId?: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = names.map(subjectName => ({ subjectName, schoolId }));
    await db.insert(schoolSubjects).values(rows).onConflictDoNothing();
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

// ─── Section ↔ Subject Links ──────────────────────────────────────────────────
export async function linkSubjectToSection(data: {
  sectionId: number;
  subjectId: number;
  term: string;
  defaultCoef: number;
  isEliminatory: boolean;
}) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await db.insert(sectionSubjects).values({
      sectionId: data.sectionId,
      subjectId: data.subjectId,
      term: data.term,
      defaultCoef: data.defaultCoef,
      isEliminatory: data.isEliminatory,
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function deleteSectionSubjectLink(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await db.delete(sectionSubjects).where(eq(sectionSubjects.id, id));
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

// ─── Class ↔ Subject Links (Plan d'études) ────────────────────────────────────
export async function addClassSubjectLink(data: { classId: number; subjectId: number; coefficient: number }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.insert(classSubjects).values({
      classId: data.classId,
      subjectId: data.subjectId,
      coefficient: data.coefficient,
      schoolId: schoolId,
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function deleteClassSubjectLink(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await db.delete(classSubjects).where(eq(classSubjects.id, id));
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

// ─── Grading Appreciations ────────────────────────────────────────────────────
export async function createGradingAppreciation(name: string, baseScore: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await db.insert(gradingAppreciations).values({ name, baseScore });
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function deleteGradingAppreciation(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await db.delete(gradingAppreciations).where(eq(gradingAppreciations.id, id));
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

// ─── School Remarks ───────────────────────────────────────────────────────────
export async function createSchoolRemark(data: { category: string; content: string; sectionId?: number }) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await db.insert(schoolRemarks).values({
      category: data.category,
      content: data.content,
      sectionId: data.sectionId || null,
    });
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function deleteSchoolRemark(id: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await db.delete(schoolRemarks).where(eq(schoolRemarks.id, id));
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}
// ─── Curriculum Matrix ──────────────────────────────────────────────────
// Batch save matrix (section ↔ subject coefs)
export async function batchSaveMatrixLinks(data: { subId: number; secId: number; coef: number; cred: number }[]) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await Promise.all(
      data.map(async ({ subId, secId, coef, cred }) => {
        // Check existing link
        const existing = await db.query.sectionSubjects.findFirst({
          where: and(
            eq(sectionSubjects.subjectId, subId),
            eq(sectionSubjects.sectionId, secId),
            isNull(sectionSubjects.term)
          )
        });

        if (existing) {
          await db.update(sectionSubjects)
            .set({ defaultCoef: coef, credits: cred })
            .where(eq(sectionSubjects.id, existing.id));
        } else if (coef > 0) {
          await db.insert(sectionSubjects).values({
            subjectId: subId,
            sectionId: secId,
            defaultCoef: coef,
            credits: cred,
            term: null as any,
          });
        }
      })
    );
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

// Auto-link subject to sections based on name/type detection
export async function autoLinkSubjectByType(subjectId: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const subject = await db.query.schoolSubjects.findFirst({
      where: and(
        eq(schoolSubjects.id, subjectId),
        eq(schoolSubjects.schoolId, schoolId)
      )
    });
    if (!subject) return { success: false, error: "Subject not found" };

    const allSections = await db.select().from(schoolSections).where(eq(schoolSections.schoolId, schoolId));
    const name = (subject.subjectName || "").toLowerCase();

    // Simple heuristic: link to all sections with coef=1 if not already linked
    await Promise.all(
      allSections.map(async (sec) => {
        const existing = await db.query.sectionSubjects.findFirst({
          where: and(
            eq(sectionSubjects.subjectId, subjectId),
            eq(sectionSubjects.sectionId, sec.id)
          )
        });
        if (!existing) {
          await db.insert(sectionSubjects).values({
            subjectId,
            sectionId: sec.id,
            defaultCoef: 1,
            term: null as any,
          });
        }
      })
    );

    revalidatePath("/dashboard/settings");
    return { success: true, message: `Matière liée à ${allSections.length} sections.` };
  });
}

// Apply standard curriculum templates (creates common subjects if they don't exist)
export async function applyStandardCurriculumTemplate() {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const standardSubjects = [
      { subjectName: "Français",             category: "Langues" },
      { subjectName: "Arabe",               category: "Langues" },
      { subjectName: "Anglais",             category: "Langues" },
      { subjectName: "Mathématiques",       category: "Sciences" },
      { subjectName: "Physique-Chimie",     category: "Sciences" },
      { subjectName: "Sciences Naturelles", category: "Sciences" },
      { subjectName: "Histoire-Géographie", category: "Sciences Humaines" },
      { subjectName: "Education Islamique", category: "Religion" },
      { subjectName: "Education Physique",  category: "Sport" },
      { subjectName: "Informatique",        category: "Technologie" },
    ];

    let created = 0;
    for (const sub of standardSubjects) {
      const existing = await db.query.schoolSubjects.findFirst({
        where: and(
          eq(schoolSubjects.subjectName, sub.subjectName),
          eq(schoolSubjects.schoolId, schoolId)
        )
      });
      if (!existing) {
        await db.insert(schoolSubjects).values({
          ...sub,
          schoolId: schoolId
        });
        created++;
      }
    }

    revalidatePath("/dashboard/settings");
    return {
      success: true,
      message: `Modèle appliqué ! ${created} matières créées, ${standardSubjects.length - created} déjà existantes.`
    };
  });
}
