"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses, schoolSubjects, exams, examResults, schoolSessions } from "@/infrastructure/database/schema/academics";
import { pedagogieRemediation } from "@/infrastructure/database/schema/pedagogie";
import { lmsAssignments } from "@/infrastructure/database/schema/lms";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { studentSchema, StudentFormData } from "../validators/student.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCompatibleLevels, getUserRoleType, getTeacherEmployee, getTeacherClassIds, checkEducationalLevelAccess } from "@/domains/auth/services/rbac";

export async function getStudents() {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    
    let whereClause = eq(students.schoolId, schoolId);
    
    if (roleType === "level_director") {
      // Always fetch fresh educationalLevel from DB — never trust the cached session value
      // because Redis may return stale data (e.g., right after account creation).
      let activeLevel: string | null | undefined = user.educationalLevel;
      if (!activeLevel && user.id) {
        const freshUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { educationalLevel: true },
        });
        activeLevel = freshUser?.educationalLevel;
      }

      if (activeLevel) {
        const compatibleLevels = getCompatibleLevels(activeLevel);
        whereClause = and(whereClause, inArray(students.educationalLevel, compatibleLevels)) as any;
      } else {
        // Safety: level_director without an assigned level sees nothing
        whereClause = and(whereClause, sql`FALSE`) as any;
      }
    } else if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        const classIds = await getTeacherClassIds(emp.id);
        if (classIds.length > 0) {
          const classesList = await db.select({ className: schoolClasses.className })
            .from(schoolClasses)
            .where(inArray(schoolClasses.id, classIds));
          const classNames = classesList.map(c => c.className);
          if (classNames.length > 0) {
            whereClause = and(whereClause, inArray(students.classe, classNames)) as any;
          } else {
            whereClause = and(whereClause, sql`FALSE`) as any;
          }
        } else {
          whereClause = and(whereClause, sql`FALSE`) as any;
        }
      } else {
        whereClause = and(whereClause, sql`FALSE`) as any;
      }
    } else if (
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur")
    ) {
      if (user.studentId) {
        whereClause = and(whereClause, eq(students.id, Number(user.studentId))) as any;
      } else {
        whereClause = and(whereClause, sql`FALSE`) as any;
      }
    }

    const data = await db.query.students.findMany({
      where: whereClause,
      orderBy: [desc(students.createdAt)],
    });
    return { data };
  });
}


export async function getStudentCategories() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.query.students.findMany({
      where: eq(students.schoolId, schoolId),
      columns: { categorie: true },
    });

    const defaults = ["G?n?ral", "Boursier", "Fils d'employ?"];
    const values = Array.from(new Set([
      ...defaults,
      ...rows.map((row) => row.categorie).filter((value): value is string => Boolean(value && value.trim()))
    ])).sort((a, b) => a.localeCompare(b, "fr"));

    return values.map((value, index) => ({ id: value || index, label: value, value }));
  });
}

export async function createStudent(formData: StudentFormData) {
  const validation = studentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const activeSession = await db.query.schoolSessions.findFirst({
      where: and(
        eq(schoolSessions.schoolId, schoolId),
        eq(schoolSessions.isActive, true)
      )
    });
    if (activeSession && (activeSession.status === "Clôturé" || activeSession.status === "Verrouillé")) {
      return { error: "Action impossible : l'année scolaire est verrouillée." };
    }

    const roleType = await getUserRoleType(user);
    
    // Check if admission number already exists for this school
    const existing = await db.query.students.findFirst({
      where: and(
        eq(students.schoolId, schoolId),
        eq(students.numAdmission, validation.data.numAdmission)
      )
    });
    if (existing) {
      return { error: "Ce numéro d'admission existe déjà pour cette école." };
    }

    const studentData = { 
      ...validation.data,
      schoolId: schoolId 
    };
    
    if (roleType === "level_director") {
      studentData.educationalLevel = user.educationalLevel;
    } else if (roleType === "teacher") {
      return { error: "Non autorisé à inscrire des élèves." };
    }

    const [newStudent] = await db.insert(students).values(studentData).returning({ id: students.id });
    revalidatePath("/dashboard/students");
    return { success: true, id: newStudent.id };
  });
}

export async function deleteStudent(id: number) {
  return protectedDbAction("Students", "canDelete", async (user) => {
    const schoolId = await getActiveSchoolId();
    const activeSession = await db.query.schoolSessions.findFirst({
      where: and(
        eq(schoolSessions.schoolId, schoolId),
        eq(schoolSessions.isActive, true)
      )
    });
    if (activeSession && (activeSession.status === "Clôturé" || activeSession.status === "Verrouillé")) {
      return { error: "Action impossible : l'année scolaire est verrouillée." };
    }

    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    if (roleType === "level_director") {
      const student = await db.query.students.findFirst({
        where: and(eq(students.id, id), eq(students.schoolId, schoolId))
      });
      if (!student || !checkEducationalLevelAccess(user, student.educationalLevel)) {
        return { error: "Accès refusé. Cet élève appartient à un autre secteur." };
      }
    }

    await db.delete(students).where(
      and(
        eq(students.id, id),
        eq(students.schoolId, schoolId)
      )
    );
    revalidatePath("/dashboard/students");
    return { success: true };
  });
}

export async function updateStudent(id: number, formData: StudentFormData, originalData?: any) {
  const validation = studentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const activeSession = await db.query.schoolSessions.findFirst({
      where: and(
        eq(schoolSessions.schoolId, schoolId),
        eq(schoolSessions.isActive, true)
      )
    });
    if (activeSession && (activeSession.status === "Clôturé" || activeSession.status === "Verrouillé")) {
      return { error: "Action impossible : l'année scolaire est verrouillée." };
    }

    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    if (originalData) {
      const current = await db.query.students.findFirst({
        where: and(eq(students.id, id), eq(students.schoolId, schoolId))
      });
      if (!current) {
        return { error: "Étudiant introuvable sur le serveur." };
      }
      const changed = 
        current.nomEtudiant !== originalData.nomEtudiant ||
        current.classe !== originalData.classe ||
        current.statut !== originalData.statut ||
        current.numAdmission !== originalData.numAdmission ||
        current.educationalLevel !== originalData.educationalLevel ||
        current.section !== originalData.section;

      if (changed) {
        return { 
          error: "Conflit : Cet étudiant a été modifié sur le serveur par un autre utilisateur.", 
          conflict: true 
        };
      }
    }

    // Check if admission number already exists for another student
    const existing = await db.query.students.findFirst({
      where: and(
        eq(students.schoolId, schoolId),
        eq(students.numAdmission, validation.data.numAdmission)
      )
    });
    
    if (existing && existing.id !== id) {
      return { error: "Ce numéro d'admission existe déjà pour un autre élève." };
    }

    if (roleType === "level_director") {
      const student = await db.query.students.findFirst({
        where: and(eq(students.id, id), eq(students.schoolId, schoolId))
      });
      if (!student || !checkEducationalLevelAccess(user, student.educationalLevel)) {
        return { error: "Accès refusé. Cet élève appartient à un autre secteur." };
      }
    }
    
    await db.update(students)
      .set(validation.data)
      .where(
        and(
          eq(students.id, id),
          eq(students.schoolId, schoolId)
        )
      );
    
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/students", "layout");
    revalidatePath("/");
    
    return { success: true };
  });
}

export async function getStudentsByClass(className: string) {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    
    let whereClause = and(
      eq(students.classe, className),
      eq(students.schoolId, schoolId)
    ) as any;
    
    if (roleType === "level_director") {
      const activeLevel = user.educationalLevel;
      if (activeLevel) {
        const compatibleLevels = getCompatibleLevels(activeLevel);
        whereClause = and(whereClause, inArray(students.educationalLevel, compatibleLevels)) as any;
      }
    } else if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        const classIds = await getTeacherClassIds(emp.id);
        if (classIds.length > 0) {
          const classesList = await db.select({ className: schoolClasses.className })
            .from(schoolClasses)
            .where(and(inArray(schoolClasses.id, classIds), eq(schoolClasses.className, className)));
          if (classesList.length === 0) {
            return { data: [] }; // Access denied
          }
        } else {
          return { data: [] };
        }
      } else {
        return { data: [] };
      }
    } else if (
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur")
    ) {
      const std = await db.query.students.findFirst({
        where: and(eq(students.id, Number(user.studentId)), eq(students.schoolId, schoolId))
      });
      if (!std || std.classe !== className) {
        return { data: [] }; // Access denied to other classes
      }
    }

    const data = await db.query.students.findMany({
      where: whereClause,
      orderBy: [students.nomEtudiant]
    });
    return { data };
  });
}

export async function fixStudentLevels() {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return { error: "Aucun contexte d'école trouvé." };
    }

    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    const allStudents = await db.query.students.findMany({
      where: eq(students.schoolId, schoolId),
    });
    let fixedCount = 0;

    for (const s of allStudents) {
      if (roleType === "level_director" && !checkEducationalLevelAccess(user, s.educationalLevel)) {
        continue;
      }

      let targetLevel = s.educationalLevel;
      const cls = s.classe || "";

      if (cls.startsWith("L-") || cls.includes("Licence")) targetLevel = "Licence";
      else if (cls.startsWith("M-") || cls.includes("Master")) targetLevel = "Master";
      else if (cls.includes("3EME") || cls.includes("6EME") || cls.includes("COLL")) targetLevel = "Collège";
      else if (cls.includes("TERM") || cls.includes("1ERE") || cls.includes("2NDE")) targetLevel = "Lycée";

      if (targetLevel !== s.educationalLevel) {
        await db.update(students)
          .set({ educationalLevel: targetLevel })
          .where(and(eq(students.id, s.id), eq(students.schoolId, schoolId)));
        fixedCount++;
      }
    }

    revalidatePath("/dashboard/students");
    return { success: true, fixedCount };
  });
}

export async function getStudentProfile(studentId: number) {
  return protectedDbAction("Students", "canView", async (user) => {
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    const isStudentOrParent = 
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur");

    if (isStudentOrParent && Number(user.studentId) !== Number(studentId)) {
      return { error: "Accès non autorisé à ce profil." };
    }

    // 1. Fetch student
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, user.schoolId)
      )
    });

    if (!student) return { error: "Étudiant non trouvé." };

    // 2. Fetch grades/exam results
    const gradesData = await db.select({
      id: examResults.id,
      marksObtained: examResults.marksObtained,
      remarks: examResults.remarks,
      examName: exams.examName,
      maxMarks: exams.maxMarks,
      examDate: exams.examDate,
      subjectName: schoolSubjects.subjectName
    })
    .from(examResults)
    .innerJoin(exams, eq(examResults.examId, exams.id))
    .innerJoin(schoolSubjects, eq(exams.subjectId, schoolSubjects.id))
    .where(eq(examResults.studentId, studentId))
    .orderBy(desc(exams.examDate));

    // 3. Fetch active/closed remediation plans
    const remediationsData = await db.select({
      id: pedagogieRemediation.id,
      difficulties: pedagogieRemediation.difficulties,
      currentGrade: pedagogieRemediation.currentGrade,
      targetGrade: pedagogieRemediation.targetGrade,
      remediationPlan: pedagogieRemediation.remediationPlan,
      sessionsPlanned: pedagogieRemediation.sessionsPlanned,
      sessionsCompleted: pedagogieRemediation.sessionsCompleted,
      status: pedagogieRemediation.status,
      alertLevel: pedagogieRemediation.alertLevel,
      createdAt: pedagogieRemediation.createdAt,
      subjectName: schoolSubjects.subjectName
    })
    .from(pedagogieRemediation)
    .innerJoin(schoolSubjects, eq(pedagogieRemediation.subjectId, schoolSubjects.id))
    .where(eq(pedagogieRemediation.studentId, studentId))
    .orderBy(desc(pedagogieRemediation.createdAt));

    // 4. Fetch individual LMS assignments
    const lmsAssignmentsData = await db.select({
      id: lmsAssignments.id,
      title: lmsAssignments.title,
      description: lmsAssignments.description,
      dueDate: lmsAssignments.dueDate,
      maxScore: lmsAssignments.maxScore,
      status: lmsAssignments.status,
      subjectName: schoolSubjects.subjectName
    })
    .from(lmsAssignments)
    .innerJoin(schoolSubjects, eq(lmsAssignments.subjectId, schoolSubjects.id))
    .where(
      eq(lmsAssignments.studentId, studentId)
    )
    .orderBy(desc(lmsAssignments.dueDate));

    return {
      student,
      grades: gradesData,
      remediations: remediationsData,
      assignments: lmsAssignmentsData
    };
  });
}
