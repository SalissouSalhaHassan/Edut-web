"use server";

import { db } from "@/infrastructure/database";
import { timetableEntries, timetableSettings, teacherConstraints, schoolClasses, schoolSubjects, classSubjects, sectionSubjects, schoolSessions } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { schoolBranches, settings } from "@/infrastructure/database/schema/settings";
import { eq, and, isNull, inArray, sql, or, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType, getTeacherEmployee, verifyTeacherClassAccess } from "@/domains/auth/services/rbac";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";

async function assertTimetableAdminAccess(user: any) {
  const roleType = await getUserRoleType(user);
  if (roleType === "eleve" || roleType === "parent" || roleType === "consultation") {
    throw new Error("Accès refusé. Vous n'avez pas l'autorisation d'administrer ou modifier l'emploi du temps.");
  }
}

async function assertClassInActiveSchool(classId: number | null | undefined) {
  if (!classId) throw new Error("Classe invalide.");
  const schoolId = await getActiveSchoolId();
  if (!schoolId) throw new Error("Aucun contexte d'école trouvé.");

  const cls = await db.query.schoolClasses.findFirst({
    where: and(eq(schoolClasses.id, classId), eq(schoolClasses.schoolId, schoolId)),
  });
  if (!cls) throw new Error("Accès refusé pour cette école.");
  return { schoolId, cls };
}

async function assertSubjectInActiveSchool(subjectId: number | null | undefined, schoolId: number) {
  if (!subjectId) throw new Error("Matiere invalide.");

  const subject = await db.query.schoolSubjects.findFirst({
    where: and(
      eq(schoolSubjects.id, subjectId),
      or(eq(schoolSubjects.schoolId, schoolId), isNull(schoolSubjects.schoolId))
    ),
  });

  if (!subject) throw new Error("Matiere introuvable dans cette ecole.");
  return subject;
}

async function assertTeacherInActiveSchool(employeeId: number | null | undefined, schoolId: number) {
  if (!employeeId) return null;

  const teacher = await db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.schoolId, schoolId)),
  });

  if (!teacher) throw new Error("Professeur introuvable dans cette ecole.");
  return teacher;
}

async function assertTimetableEntryInActiveSchool(id: number) {
  const entry = await db.query.timetableEntries.findFirst({
    where: eq(timetableEntries.id, id),
  });
  if (!entry) throw new Error("Séance introuvable.");
  await assertClassInActiveSchool(entry.classId);
  return entry;
}

export async function getTimetableSettings(classId?: number) {
  return protectedDbAction("Academics", "canView", async () => {
    const settings = await db.query.timetableSettings.findFirst({
      where: classId ? eq(timetableSettings.classId, classId) : isNull(timetableSettings.classId)
    });
    
    // Default values if not found
    if (!settings) {
      return {
        days: "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
        periods: 6,
        recessAfter: 3,
        recessDuration: 30,
        periodDuration: 60,
        dayStart: "08:00",
        hideSaturday: true,
        dailyPeriods: "{}"
      };
    }
    return settings;
  });
}

export async function saveTimetableSettings(data: any, classId?: number) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);

    const existing = await db.query.timetableSettings.findFirst({
      where: classId ? eq(timetableSettings.classId, classId) : isNull(timetableSettings.classId)
    });

    if (existing) {
      await db.update(timetableSettings).set({ ...data, updatedAt: new Date() }).where(eq(timetableSettings.id, existing.id));
    } else {
      await db.insert(timetableSettings).values({ ...data, classId: classId || null });
    }
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function getTimetableEntries(modeOrId: "class" | "teacher" | number, id?: number) {
  return protectedDbAction("Academics", "canView", async (user) => {
    let finalMode: "class" | "teacher" = "class";
    let finalId: number | undefined = id;

    if (typeof modeOrId === "number") {
      finalId = modeOrId;
      finalMode = "class";
    } else {
      finalMode = modeOrId;
    }

    const roleType = await getUserRoleType(user);

    // 1. ELEVE (Student) — Strictly lock to their own class
    if (roleType === "eleve") {
      const studentId = user.studentId || (user as any).student_id;
      let studentRecord: any = null;
      if (studentId) {
        studentRecord = await db.query.students.findFirst({ where: eq(students.id, Number(studentId)) });
      }
      if (!studentRecord && (user as any).utilisateur) {
        studentRecord = await db.query.students.findFirst({ where: eq(students.numAdmission, String((user as any).utilisateur)) });
      }
      if (!studentRecord || !studentRecord.classe) return [];

      const schoolId = user.schoolId || await getActiveSchoolId();
      const classRow = await db.query.schoolClasses.findFirst({
        where: and(
          schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
          eq(schoolClasses.className, studentRecord.classe)
        )
      });
      if (!classRow) return [];
      finalMode = "class";
      finalId = classRow.id;
    } else if (roleType === "parent") {
      // 2. PARENT — Strictly lock to their child's class
      const childId = user.studentId;
      if (!childId) return [];
      const studentRecord = await db.query.students.findFirst({ where: eq(students.id, Number(childId)) });
      if (!studentRecord || !studentRecord.classe) return [];
      const schoolId = user.schoolId || await getActiveSchoolId();
      const classRow = await db.query.schoolClasses.findFirst({
        where: and(
          schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
          eq(schoolClasses.className, studentRecord.classe)
        )
      });
      if (!classRow) return [];
      finalMode = "class";
      finalId = classRow.id;
    } else if (roleType === "teacher") {
      // 3. TEACHER — Only own schedule or assigned classes
      const emp = await getTeacherEmployee(user);
      if (!emp) return [];

      if (finalMode === "teacher") {
        finalId = emp.id;
      } else if (finalMode === "class") {
        if (!finalId) return [];
        const hasAccess = await verifyTeacherClassAccess(user, finalId);
        if (!hasAccess) return [];
      }
    }

    if (!finalId) return [];

    if (finalMode === "class") {
      await assertClassInActiveSchool(finalId);
    }

    const entries = await db.query.timetableEntries.findMany({
      where: finalMode === "class" ? eq(timetableEntries.classId, finalId) : eq(timetableEntries.employeeId, finalId),
      with: {
        subject: true,
        teacher: true,
        class: true
      }
    });
    return entries;
  });
}

export async function getTimetableReportData() {
  return protectedDbAction("Academics", "canView", async (user) => {
    await assertTimetableAdminAccess(user);

    const schoolId = user.schoolId || await getActiveSchoolId();
    const [entries, classes, teachers, settingsData, branchInfo, headerConfigRecord] = await Promise.all([
      db.query.timetableEntries.findMany({
        where: inArray(
          timetableEntries.classId,
          db.select({ id: schoolClasses.id })
            .from(schoolClasses)
            .where(eq(schoolClasses.schoolId, schoolId))
        ),
        with: { subject: true, teacher: true, class: true }
      }),
      db.query.schoolClasses.findMany({
        where: eq(schoolClasses.schoolId, schoolId),
        with: { section: true }
      }),
      db.query.employees.findMany({
        where: and(eq(employees.statut, "Actif"), eq(employees.schoolId, schoolId))
      }),
      db.query.timetableSettings.findFirst({
        where: isNull(timetableSettings.classId)
      }),
      db.query.schoolBranches.findFirst({
        where: eq(schoolBranches.schoolId, schoolId)
      }),
      db.query.settings.findFirst({
        where: and(
          eq(settings.key, "official_document_header"),
          eq(settings.schoolId, schoolId)
        )
      })
    ]);

    let documentHeaderConfig = null;
    if (headerConfigRecord?.value) {
      try {
        documentHeaderConfig = JSON.parse(headerConfigRecord.value);
      } catch (e) {}
    }

    return { 
      entries, 
      classes, 
      teachers, 
      schoolInfo: branchInfo,
      documentHeaderConfig,
      settings: settingsData || {
        days: "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
        periods: 6,
        recessAfter: 3,
        dayStart: "08:00"
      }
    };
  });
}

// Helper for dashboard overview
export async function getGlobalOccupancy() {
  return protectedDbAction("Academics", "canView", async (user) => {
    await assertTimetableAdminAccess(user);

    const schoolId = await getActiveSchoolId();
    const entries = await db.query.timetableEntries.findMany({
      where: inArray(
        timetableEntries.classId,
        db.select({ id: schoolClasses.id })
          .from(schoolClasses)
          .where(eq(schoolClasses.schoolId, schoolId))
      )
    });
    const classesCount = await db.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId)
    });
    
    return { entries, totalClasses: classesCount.length };
  });
}

export async function saveTimetableEntry(data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);
    await assertClassInActiveSchool(data.classId);

    // Check for conflicts: either class is busy OR teacher is busy at the same day/period
    const conflict = await db.query.timetableEntries.findFirst({
      where: and(
        eq(timetableEntries.dayName, data.dayName),
        eq(timetableEntries.periodNumber, data.periodNumber),
        or(
          eq(timetableEntries.classId, data.classId),
          eq(timetableEntries.employeeId, data.employeeId)
        )
      )
    });

    if (conflict && conflict.id !== data.id) {
       // Identify which conflict occurred for better error message
       const isClassBusy = conflict.classId === data.classId;
       const msg = isClassBusy 
         ? "Cette classe a déjà un cours programmé à cette heure."
         : "Ce enseignant a déjà un cours programmé à cette heure.";
       throw new Error(`Conflit détecté : ${msg}`);
    }

    if (data.id) {
      await assertTimetableEntryInActiveSchool(data.id);
      await db.update(timetableEntries).set(data).where(eq(timetableEntries.id, data.id));
    } else {
      await db.insert(timetableEntries).values(data);
    }
    revalidatePath("/dashboard/academics/timetable");
    revalidatePath("/dashboard/hr/attendance/qrcodes");
    return { success: true };
  });
}

export async function deleteTimetableEntry(id: number) {
  return protectedDbAction("Academics", "canDelete", async (user) => {
    await assertTimetableAdminAccess(user);
    await assertTimetableEntryInActiveSchool(id);
    await db.delete(timetableEntries).where(eq(timetableEntries.id, id));
    revalidatePath("/dashboard/academics/timetable");
    revalidatePath("/dashboard/hr/attendance/qrcodes");
    return { success: true };
  });
}

export async function moveTimetableEntry(id: number, dayName: string, periodNumber: number) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);
    const entry = await assertTimetableEntryInActiveSchool(id);

    if (!entry) throw new Error("Séance introuvable.");

    const classId = entry.classId;
    const employeeId = entry.employeeId;
    if (!classId || !employeeId) {
      throw new Error("Séance incomplète (classe ou enseignant manquant).");
    }

    const conflict = await db.query.timetableEntries.findFirst({
      where: and(
        eq(timetableEntries.dayName, dayName),
        eq(timetableEntries.periodNumber, periodNumber),
        or(
          eq(timetableEntries.classId, classId),
          eq(timetableEntries.employeeId, employeeId)
        )
      )
    });

    if (conflict && conflict.id !== id) {
       const isClassBusy = conflict.classId === classId;
       const msg = isClassBusy 
         ? "Cette classe a déjà un cours programmé à cette heure."
         : "Ce enseignant a déjà un cours programmé à cette heure.";
       throw new Error(`Conflit détecté : ${msg}`);
    }

    await db.update(timetableEntries)
      .set({ dayName, periodNumber })
      .where(eq(timetableEntries.id, id));

    revalidatePath("/dashboard/academics/timetable");
    revalidatePath("/dashboard/hr/attendance/qrcodes");
    return { success: true };
  });
}

export async function getTeacherConstraints(employeeId: number) {
  return protectedDbAction("Academics", "canView", async () => {
    const constraints = await db.query.teacherConstraints.findFirst({
      where: eq(teacherConstraints.employeeId, employeeId)
    });
    return constraints || {
       offDays: "",
       maxPeriodsPerDay: 5,
       forceConsecutive: false
    };
  });
}

export async function getAllSubjects(classId?: number) {
  return protectedDbAction("Academics", "canView", async () => {
    let sectionSubjectMap = new Map<number, number>();
    
    if (classId) {
      const cls = await db.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
      });
      if (cls?.sectionId) {
        const official = await db.query.sectionSubjects.findMany({
          where: eq(sectionSubjects.sectionId, cls.sectionId)
        });
        official.forEach(o => {
          if (o.subjectId) {
            sectionSubjectMap.set(o.subjectId, o.defaultCoef || 2);
          }
        });
      }
    }
    
    const schoolId = await getActiveSchoolId();
    const allSubjects = await db.query.schoolSubjects.findMany({
      where: eq(schoolSubjects.schoolId, schoolId),
      orderBy: (schoolSubjects, { asc }) => [asc(schoolSubjects.subjectName)]
    });

    return allSubjects.map(s => ({
      ...s,
      defaultCoef: sectionSubjectMap.get(s.id) || 2
    }));
  });
}

export async function saveTeacherConstraints(employeeId: number, data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);
    const existing = await db.query.teacherConstraints.findFirst({
      where: eq(teacherConstraints.employeeId, employeeId)
    });

    if (existing) {
      await db.update(teacherConstraints).set({ ...data, updatedAt: new Date() }).where(eq(teacherConstraints.id, existing.id));
    } else {
      await db.insert(teacherConstraints).values({ ...data, employeeId });
    }
    return { success: true };
  });
}

export async function getClassAssignments(classId: number) {
  return protectedDbAction("Academics", "canView", async (user) => {
    const { schoolId } = await assertClassInActiveSchool(classId);
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      const hasAccess = await verifyTeacherClassAccess(user, classId);
      if (!hasAccess) return [];
    }

    const assignments = await db.query.classSubjects.findMany({
      where: and(eq(classSubjects.classId, classId), eq(classSubjects.schoolId, schoolId)),
      with: {
        subject: true,
        teacher: true
      }
    });
    return assignments;
  });
}

export async function saveClassAssignment(id: number | null, data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);
    const existing = id
      ? await db.query.classSubjects.findFirst({ where: eq(classSubjects.id, id) })
      : null;

    if (id && !existing) {
      throw new Error("Affectation introuvable.");
    }

    const classId = Number(data.classId ?? existing?.classId);
    const subjectId = Number(data.subjectId ?? existing?.subjectId);
    const { schoolId } = await assertClassInActiveSchool(classId);
    await assertSubjectInActiveSchool(subjectId, schoolId);

    const employeeId =
      data.employeeId === undefined
        ? existing?.employeeId ?? null
        : data.employeeId === null || data.employeeId === ""
          ? null
          : Number(data.employeeId);
    await assertTeacherInActiveSchool(employeeId, schoolId);

    const rawCoefficient = Number(data.coefficient ?? existing?.coefficient ?? 1);
    const payload = {
      schoolId,
      classId,
      subjectId,
      employeeId,
      coefficient: Number.isFinite(rawCoefficient) ? rawCoefficient : 1,
      credits: data.credits ?? existing?.credits,
      semester: data.semester ?? existing?.semester,
    };

    if (id) {
      await db.update(classSubjects).set(payload).where(and(eq(classSubjects.id, id), eq(classSubjects.schoolId, schoolId)));
    } else {
      const duplicate = await db.query.classSubjects.findFirst({
        where: and(
          eq(classSubjects.schoolId, schoolId),
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId)
        ),
      });

      if (duplicate) {
        await db.update(classSubjects).set(payload).where(and(eq(classSubjects.id, duplicate.id), eq(classSubjects.schoolId, schoolId)));
      } else {
        await db.insert(classSubjects).values(payload);
      }
    }
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function getTeacherWorkloads() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const workloads = await db
      .select({
        employeeId: classSubjects.employeeId,
        totalHours: sql<number>`sum(${classSubjects.coefficient})`,
      })
      .from(classSubjects)
      .where(eq(classSubjects.schoolId, schoolId))
      .groupBy(classSubjects.employeeId);
    
    const teachers = await db.query.employees.findMany({
      where: and(eq(employees.statut, "Actif"), eq(employees.schoolId, schoolId))
    });

    const workloadMap: Record<number, number> = {};
    workloads.forEach(w => {
      if (w.employeeId) workloadMap[w.employeeId] = Number(w.totalHours);
    });

    return teachers.map(t => ({
      ...t,
      workload: workloadMap[t.id] || 0
    }));
  });
}

/**
 * Normalizes educational level strings to clean lowercase ASCII
 */
function normalizeEduLevel(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Checks if a teacher's HR educationalLevel (comma-separated, e.g. "Supérieur, Lycée")
 * matches a target class section level (e.g. "Licence", "Master", "Collège").
 */
function isLevelCompatible(teacherLevelStr: string | null | undefined, targetLevelStr: string | null | undefined): boolean {
  if (!targetLevelStr) return true;
  if (!teacherLevelStr) return false;

  const teacherLevels = teacherLevelStr.split(",").map(normalizeEduLevel);
  const target = normalizeEduLevel(targetLevelStr);

  const globalTerms = ["tous", "all", "global", "tous niveaux", "administration generale"];
  if (teacherLevels.some(l => globalTerms.includes(l))) return true;

  const familyGroups: string[][] = [
    // University / Higher Ed
    ["supeur", "superieur", "universite", "university", "licence", "master", "doctorat", "bts", "dts", "lmd", "faculte", "sup"],
    // Lycée / High School
    ["lycee", "secondaire", "high school"],
    // Collège / Middle School
    ["college", "moyen", "middle school"],
    // Primaire / Primary
    ["primaire", "elementaire", "fondamental", "basic"],
    // Maternelle / Preschool
    ["maternelle", "prescolaire", "jardin d'enfants"]
  ];

  for (const tL of teacherLevels) {
    if (!tL) continue;
    if (tL === target || tL.includes(target) || target.includes(tL)) return true;

    for (const group of familyGroups) {
      const teacherInGroup = group.some(g => tL.includes(g) || g.includes(tL));
      const targetInGroup = group.some(g => target.includes(g) || g.includes(tL));
      if (teacherInGroup && targetInGroup) return true;
    }
  }

  return false;
}

/**
 * Returns teachers whose educationalLevel (set in HR) includes
 * or is compatible with the educationalLevel of the given class's section.
 * e.g. if class section is "Licence", matches teachers with "Supérieur", "Licence", "Université", etc.
 * Falls back to ALL active teachers if the class has no section level or none match.
 */
export async function getTeachersByClassLevel(classId: number) {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    // 1. Resolve the educationalLevel of the target class via its section
    const targetClass = await db.query.schoolClasses.findFirst({
      where: and(eq(schoolClasses.id, classId), eq(schoolClasses.schoolId, schoolId)),
      with: { section: true }
    });

    const targetLevel: string | null = (targetClass as any)?.section?.educationalLevel ?? null;

    // 2. Workload map for all teachers in this school
    const workloads = await db
      .select({
        employeeId: classSubjects.employeeId,
        totalHours: sql<number>`sum(${classSubjects.coefficient})`,
      })
      .from(classSubjects)
      .where(eq(classSubjects.schoolId, schoolId))
      .groupBy(classSubjects.employeeId);

    const workloadMap: Record<number, number> = {};
    workloads.forEach(w => {
      if (w.employeeId) workloadMap[w.employeeId] = Number(w.totalHours);
    });

    // 3. Fetch ALL active teachers
    const allTeachers = await db.query.employees.findMany({
      where: and(eq(employees.statut, "Actif"), eq(employees.schoolId, schoolId))
    });

    // 4. Filter by HR educationalLevel field using fuzzy family compatibility
    let filteredTeachers = allTeachers;
    let isFiltered = false;

    if (targetLevel) {
      const matched = allTeachers.filter(t => isLevelCompatible(t.educationalLevel, targetLevel));

      // Only apply filter if we actually found matching teachers
      if (matched.length > 0) {
        filteredTeachers = matched;
        isFiltered = true;
      }
    }

    return {
      teachers: filteredTeachers.map(t => ({
        ...t,
        workload: workloadMap[t.id] || 0
      })),
      educationalLevel: targetLevel,
      isFiltered
    };
  });
}

export async function aiSyncCursus(classId: number) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);
    const { schoolId } = await assertClassInActiveSchool(classId);
    const cls = await db.query.schoolClasses.findFirst({
      where: and(eq(schoolClasses.id, classId), eq(schoolClasses.schoolId, schoolId))
    });

    if (!cls || !cls.sectionId) throw new Error("Classe non liée à une section.");

    const officialSubjects = await db.query.sectionSubjects.findMany({
      where: eq(sectionSubjects.sectionId, cls.sectionId)
    });

    let changes = 0;
    for (const os of officialSubjects) {
      if (!os.subjectId) continue;
      const existing = await db.query.classSubjects.findFirst({
        where: and(eq(classSubjects.classId, classId), eq(classSubjects.subjectId, os.subjectId))
      });

      if (existing) {
        if (existing.coefficient !== os.defaultCoef) {
          await db.update(classSubjects).set({ coefficient: os.defaultCoef }).where(and(eq(classSubjects.id, existing.id), eq(classSubjects.schoolId, schoolId)));
          changes++;
        }
      } else {
        await db.insert(classSubjects).values({
          schoolId,
          classId,
          subjectId: os.subjectId,
          coefficient: os.defaultCoef || 2
        });
        changes++;
      }
    }

    revalidatePath("/dashboard/academics/timetable");
    return { success: true, changes };
  });
}

export async function addSubjectsToClass(classId: number, subjectIds: number[]) {
  if (subjectIds.length === 0) return { success: true };
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);
    const { schoolId } = await assertClassInActiveSchool(classId);
    const cls = await db.query.schoolClasses.findFirst({
      where: and(eq(schoolClasses.id, classId), eq(schoolClasses.schoolId, schoolId)),
    });

    if (!cls || !cls.sectionId) throw new Error("Classe non valide.");

    const official = await db.query.sectionSubjects.findMany({
      where: and(
        eq(sectionSubjects.sectionId, cls.sectionId!),
        inArray(sectionSubjects.subjectId, subjectIds)
      )
    });

    const coefMap: Record<number, number> = {};
    official.forEach(o => {
      if (o.subjectId) {
        coefMap[o.subjectId] = o.defaultCoef || 2;
      }
    });

    const values = subjectIds.map(subjectId => ({
      schoolId,
      classId,
      subjectId,
      coefficient: coefMap[subjectId] || 2
    }));
    
    await db.insert(classSubjects).values(values);
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function deleteClassAssignment(id: number) {
  return protectedDbAction("Academics", "canDelete", async (user) => {
    await assertTimetableAdminAccess(user);
    const schoolId = await getActiveSchoolId();
    if (!schoolId) throw new Error("Aucun contexte d'école trouvé.");
    await db.delete(classSubjects).where(and(eq(classSubjects.id, id), eq(classSubjects.schoolId, schoolId)));
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function runAISolver(sessionId: number) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    await assertTimetableAdminAccess(user);
    const schoolId = await getActiveSchoolId();

    await db.delete(timetableEntries).where(
      and(
        eq(timetableEntries.sessionId, sessionId),
        inArray(
          timetableEntries.classId,
          db.select({ id: schoolClasses.id })
            .from(schoolClasses)
            .where(eq(schoolClasses.schoolId, schoolId))
        )
      )
    );

    const [assignments, teachers, settings] = await Promise.all([
      db.query.classSubjects.findMany({
        where: eq(classSubjects.schoolId, schoolId),
        with: { subject: true, teacher: true }
      }),
      db.query.employees.findMany({
        where: eq(employees.schoolId, schoolId),
        with: { constraints: true }
      }),
      db.query.timetableSettings.findFirst({
        where: isNull(timetableSettings.classId)
      })
    ]);

    if (assignments.length === 0) {
       throw new Error("Aucune affectation trouvée. Veuillez d'abord ajouter des matières aux classes.");
    }

    const periods = settings?.periods || 6;
    const recess = settings?.recessAfter || 0;
    const days = (settings?.days || "Lundi,Mardi,Mercredi,Jeudi,Vendredi").split(",");

    const constraintMap = new Map(teachers.map(t => [t.id, t.constraints[0]]));

    const isScience = (name: string) => {
      const n = (name || "").toLowerCase();
      return ["math", "physique", "chimie", "pc", "svt", "science"].some(s => n.includes(s));
    };
    
    const isLanguage = (name: string) => {
      const n = (name || "").toLowerCase();
      return ["français", "french", "anglais", "english", "arabe", "arabic", "langue"].some(s => n.includes(s));
    };

    const newEntries: any[] = [];
    const teacherBusy: Record<string, boolean> = {}; 
    const classBusy: Record<string, boolean> = {}; 
    const classDailySubjCount: Record<string, number> = {}; 
    const teacherDailyLoad: Record<string, number> = {}; 

    const sortedAssignments = [...assignments]
      .filter(a => a.subject != null) 
      .sort((a, b) => {
        const scoreA = (a.subject ? (isScience(a.subject.subjectName || "") ? 100 : 0) + (isLanguage(a.subject.subjectName || "") ? 50 : 0) : 0) + (a.coefficient || 0);
        const scoreB = (b.subject ? (isScience(b.subject.subjectName || "") ? 100 : 0) + (isLanguage(b.subject.subjectName || "") ? 50 : 0) : 0) + (b.coefficient || 0);
        return scoreB - scoreA;
      });

    for (const a of sortedAssignments) {
      if (!a.employeeId || !a.subject) continue;
      
      const teacherConst = constraintMap.get(a.employeeId);
      const offDays = (teacherConst?.offDays || "").split(",");
      
      let hoursNeeded = a.coefficient || 1;
      let scheduled = 0;

      const preferredPeriods = isScience(a.subject.subjectName) 
        ? [1, 2, 3, 4, 5, 6, 7, 8].filter(p => p <= periods) 
        : [1, 2, 3, 4, 5, 6, 7, 8].filter(p => p <= periods);

      for (const day of days) {
        if (offDays.includes(day)) continue; 

        for (const p of preferredPeriods) {
          if (scheduled >= hoursNeeded) break;

          const dailySubjKey = `${a.classId}_${day}_${a.subjectId}`;
          if (isLanguage(a.subject.subjectName) && (classDailySubjCount[dailySubjKey] || 0) >= 1) continue;
          if ((classDailySubjCount[dailySubjKey] || 0) >= 2) continue;
          const tDayKey = `${a.employeeId}_${day}`;
          if (teacherConst?.maxPeriodsPerDay && (teacherDailyLoad[tDayKey] || 0) >= teacherConst.maxPeriodsPerDay) continue;

          const tKey = `${a.employeeId}_${day}_${p}`;
          const cKey = `${a.classId}_${day}_${p}`;

          if (!teacherBusy[tKey] && !classBusy[cKey]) {
            newEntries.push({
              sessionId,
              classId: a.classId,
              subjectId: a.subjectId,
              employeeId: a.employeeId,
              dayName: day,
              periodNumber: p
            });
            teacherBusy[tKey] = true;
            classBusy[cKey] = true;
            classDailySubjCount[dailySubjKey] = (classDailySubjCount[dailySubjKey] || 0) + 1;
            teacherDailyLoad[tDayKey] = (teacherDailyLoad[tDayKey] || 0) + 1;
            scheduled++;
          }
        }
        if (scheduled >= hoursNeeded) break;
      }
    }

    if (newEntries.length > 0) {
      await db.insert(timetableEntries).values(newEntries);
    }

    revalidatePath("/dashboard/academics/timetable");
    return { 
      success: true, 
      message: `Génération terminée : ${newEntries.length} heures programmées intelligemment.` 
    };
  });
}

// ─── Student Personal Timetable Action (Secure Isolation) ─────────────────────

export async function getStudentPersonalTimetableAction() {
  return protectedDbAction("Academics", "canView", async (user) => {
    const schoolId = user.schoolId || await getActiveSchoolId();
    if (!schoolId) return { success: false, error: "Contexte scolaire introuvable." };

    // Resolve student record
    let studentRecord: any = null;
    const rawStudentId = (user as any).studentId || (user as any).student_id;
    if (rawStudentId) {
      studentRecord = await db.query.students.findFirst({
        where: eq(students.id, Number(rawStudentId)),
      });
    }

    const usernameStr = typeof (user as any).utilisateur === "string"
      ? ((user as any).utilisateur as string)
      : typeof (user as any).username === "string"
        ? ((user as any).username as string)
        : "";

    if (!studentRecord && usernameStr.trim().length > 0) {
      studentRecord = await db.query.students.findFirst({
        where: and(
          eq(students.schoolId, schoolId),
          eq(students.numAdmission, usernameStr.trim())
        ),
      });
    }

    if (!studentRecord || !studentRecord.classe) {
      return { success: false, error: "Profil étudiant ou classe introuvable pour ce compte." };
    }

    // Resolve student class
    const classRow = await db.query.schoolClasses.findFirst({
      where: and(
        eq(schoolClasses.schoolId, schoolId),
        eq(schoolClasses.className, studentRecord.classe)
      ),
      with: { section: true },
    });

    if (!classRow) {
      return { success: false, error: "Classe introuvable pour cet élève." };
    }

    // Active session
    const activeSession = (await db.query.schoolSessions.findFirst({
      where: and(
        eq(schoolSessions.schoolId, schoolId),
        eq(schoolSessions.isActive, true)
      )
    })) || (await db.query.schoolSessions.findFirst({
      where: eq(schoolSessions.schoolId, schoolId),
      orderBy: desc(schoolSessions.id)
    }));

    // Timetable settings
    const settingsData = (await db.query.timetableSettings.findFirst({
      where: eq(timetableSettings.classId, classRow.id)
    })) || (await db.query.timetableSettings.findFirst({
      where: isNull(timetableSettings.classId)
    })) || {
      days: "Lundi,Mardi,Mercredi,Jeudi,Vendredi",
      periods: 6,
      recessAfter: 3,
      recessDuration: 30,
      periodDuration: 60,
      dayStart: "08:00",
      hideSaturday: true,
      dailyPeriods: "{}"
    };

    // Fetch entries strictly for this student's class
    const entries = await db.query.timetableEntries.findMany({
      where: eq(timetableEntries.classId, classRow.id),
      with: {
        subject: true,
        teacher: true,
      },
    });

    // School info
    const branchInfo = await db.query.schoolBranches.findFirst({
      where: eq(schoolBranches.schoolId, schoolId)
    });

    return {
      success: true,
      data: {
        student: {
          id: studentRecord.id,
          nomEtudiant: studentRecord.nomEtudiant,
          numAdmission: studentRecord.numAdmission,
          classe: studentRecord.classe,
        },
        class: {
          id: classRow.id,
          name: classRow.className,
          section: classRow.section?.sectionName || "",
          level: classRow.section?.educationalLevel || studentRecord.educationalLevel || "Lycée",
        },
        session: activeSession ? { id: activeSession.id, name: activeSession.sessionName } : null,
        settings: settingsData,
        entries: entries.map(e => ({
          id: e.id,
          dayName: e.dayName,
          periodNumber: e.periodNumber,
          roomName: e.roomName || "Salle de cours",
          subjectName: e.subject?.subjectName || "Cours",
          subjectCode: e.subject?.subjectCode || "",
          teacherName: e.teacher?.nom || "Professeur",
        })),
        school: {
          name: branchInfo?.branchName || "ÉCOLE GESTION PRO",
          contact: branchInfo?.contactNo || "",
          email: branchInfo?.email || "",
          address: branchInfo?.address || "",
          logoPath: branchInfo?.logoPath || "",
        }
      }
    };
  });
}
