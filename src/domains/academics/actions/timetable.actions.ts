"use server";

import { db } from "@/infrastructure/database";
import { timetableEntries, timetableSettings, teacherConstraints, schoolClasses, schoolSubjects, classSubjects, sectionSubjects } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { eq, and, isNull, inArray, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType, getTeacherEmployee, verifyTeacherClassAccess } from "@/domains/auth/services/rbac";

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
  return protectedDbAction("Academics", "canEdit", async () => {
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

    if (!finalId) return [];

    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (!emp) return [];

      if (finalMode === "teacher") {
        finalId = emp.id;
      } else if (finalMode === "class") {
        const hasAccess = await verifyTeacherClassAccess(user, finalId);
        if (!hasAccess) return [];
      }
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
  return protectedDbAction("Academics", "canView", async () => {
    const [entries, classes, teachers, settings, branchInfo] = await Promise.all([
      db.query.timetableEntries.findMany({
        with: { subject: true, teacher: true, class: true }
      }),
      db.query.schoolClasses.findMany({
        with: { section: true }
      }),
      db.query.employees.findMany({
        where: eq(employees.statut, "Actif")
      }),
      db.query.timetableSettings.findFirst({
        where: isNull(timetableSettings.classId)
      }),
      db.query.schoolBranches.findFirst()
    ]);
    
    return { 
      entries, 
      classes, 
      teachers, 
      schoolInfo: branchInfo,
      settings: settings || {
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
  return protectedDbAction("Academics", "canView", async () => {
    const entries = await db.query.timetableEntries.findMany();
    const classesCount = await db.query.schoolClasses.findMany();
    
    return { entries, totalClasses: classesCount.length };
  });
}

export async function saveTimetableEntry(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
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
      await db.update(timetableEntries).set(data).where(eq(timetableEntries.id, data.id));
    } else {
      await db.insert(timetableEntries).values(data);
    }
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function deleteTimetableEntry(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    await db.delete(timetableEntries).where(eq(timetableEntries.id, id));
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function moveTimetableEntry(id: number, dayName: string, periodNumber: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const entry = await db.query.timetableEntries.findFirst({
      where: eq(timetableEntries.id, id)
    });
    if (!entry) throw new Error("Séance introuvable.");

    const conflict = await db.query.timetableEntries.findFirst({
      where: and(
        eq(timetableEntries.dayName, dayName),
        eq(timetableEntries.periodNumber, periodNumber),
        or(
          eq(timetableEntries.classId, entry.classId),
          eq(timetableEntries.employeeId, entry.employeeId)
        )
      )
    });

    if (conflict && conflict.id !== id) {
       const isClassBusy = conflict.classId === entry.classId;
       const msg = isClassBusy 
         ? "Cette classe a déjà un cours programmé à cette heure."
         : "Ce enseignant a déjà un cours programmé à cette heure.";
       throw new Error(`Conflit détecté : ${msg}`);
    }

    await db.update(timetableEntries)
      .set({ dayName, periodNumber, updatedAt: new Date() })
      .where(eq(timetableEntries.id, id));

    revalidatePath("/dashboard/academics/timetable");
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
    
    const allSubjects = await db.query.schoolSubjects.findMany({
      orderBy: (schoolSubjects, { asc }) => [asc(schoolSubjects.subjectName)]
    });

    return allSubjects.map(s => ({
      ...s,
      defaultCoef: sectionSubjectMap.get(s.id) || 2
    }));
  });
}

export async function saveTeacherConstraints(employeeId: number, data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
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
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      const hasAccess = await verifyTeacherClassAccess(user, classId);
      if (!hasAccess) return [];
    }

    const assignments = await db.query.classSubjects.findMany({
      where: eq(classSubjects.classId, classId),
      with: {
        subject: true,
        teacher: true
      }
    });
    return assignments;
  });
}

export async function saveClassAssignment(id: number | null, data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    if (id) {
      await db.update(classSubjects).set({ ...data }).where(eq(classSubjects.id, id));
    } else {
      await db.insert(classSubjects).values(data);
    }
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function getTeacherWorkloads() {
  return protectedDbAction("Academics", "canView", async () => {
    const workloads = await db
      .select({
        employeeId: classSubjects.employeeId,
        totalHours: sql<number>`sum(${classSubjects.coefficient})`,
      })
      .from(classSubjects)
      .groupBy(classSubjects.employeeId);
    
    const teachers = await db.query.employees.findMany({
      where: eq(employees.statut, "Actif")
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

export async function aiSyncCursus(classId: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId)
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
          await db.update(classSubjects).set({ coefficient: os.defaultCoef }).where(eq(classSubjects.id, existing.id));
          changes++;
        }
      } else {
        await db.insert(classSubjects).values({
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
  return protectedDbAction("Academics", "canEdit", async () => {
    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
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
  return protectedDbAction("Academics", "canDelete", async () => {
    await db.delete(classSubjects).where(eq(classSubjects.id, id));
    revalidatePath("/dashboard/academics/timetable");
    return { success: true };
  });
}

export async function runAISolver(sessionId: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    // 1. Clear existing for this session to avoid duplicates/conflicts
    await db.delete(timetableEntries).where(eq(timetableEntries.sessionId, sessionId));

    // 2. Fetch all required data
    const [assignments, teachers, settings] = await Promise.all([
      db.query.classSubjects.findMany({
        with: { subject: true, teacher: true }
      }),
      db.query.employees.findMany({
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
          if (p === recess) continue; 

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
