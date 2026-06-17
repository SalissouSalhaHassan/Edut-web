"use server";

import { db } from "@/infrastructure/database";
import { exams, examResults, schoolClasses, schoolSubjects, academicPeriods, schoolSections, classSubjects } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and, inArray, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { examSchema, batchExamResultSchema, ExamFormData, BatchExamResultFormData } from "../validators/exams.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType, getCompatibleLevels, getTeacherEmployee, getTeacherClassIds, verifyTeacherClassAccess, verifyTeacherClassSubjectAccess } from "@/domains/auth/services/rbac";

// --- Exams ---
export async function getExams(filters?: { classId?: number; subjectId?: number; periodName?: string }) {
  return protectedDbAction("Exams", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    
    let query = db.select({
      id: exams.id,
      examName: exams.examName,
      classId: exams.classId,
      subjectId: exams.subjectId,
      examDate: exams.examDate,
      periodId: exams.periodId,
      maxMarks: exams.maxMarks,
      createdAt: exams.createdAt,
      class: {
        id: schoolClasses.id,
        className: schoolClasses.className,
      },
      subject: {
        id: schoolSubjects.id,
        subjectName: schoolSubjects.subjectName,
      },
      period: {
        id: academicPeriods.id,
        name: academicPeriods.name,
      }
    })
    .from(exams)
    .leftJoin(schoolClasses, eq(exams.classId, schoolClasses.id))
    .leftJoin(schoolSubjects, eq(exams.subjectId, schoolSubjects.id))
    .leftJoin(academicPeriods, eq(exams.periodId, academicPeriods.id))
    .leftJoin(schoolSections, eq(schoolClasses.sectionId, schoolSections.id));
    
    const conditions = [];
    if (filters?.classId) conditions.push(eq(exams.classId, filters.classId));
    if (filters?.subjectId) conditions.push(eq(exams.subjectId, filters.subjectId));
    if (filters?.periodName) conditions.push(eq(academicPeriods.name, filters.periodName));

    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      conditions.push(inArray(schoolSections.educationalLevel, compatibleLevels));
    } else if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        const teacherSubjects = await db.select({
          classId: classSubjects.classId,
          subjectId: classSubjects.subjectId
        })
        .from(classSubjects)
        .where(eq(classSubjects.employeeId, emp.id));

        if (teacherSubjects.length > 0) {
          const orConditions = teacherSubjects.map(pair => 
            and(eq(exams.classId, pair.classId!), eq(exams.subjectId, pair.subjectId!))
          );
          conditions.push(or(...orConditions));
        } else {
          conditions.push(sql`FALSE`);
        }
      } else {
        conditions.push(sql`FALSE`);
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const data = await query.orderBy(desc(exams.createdAt));
    
    return { data };
  });
}

export async function createExam(formData: ExamFormData) {
  const validation = examSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Exams", "canEdit", async (user) => {
    const { classId, subjectId } = validation.data;
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, classId, subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à créer un examen pour cette classe et cette matière." };
    }

    await db.insert(exams).values({
      ...validation.data,
      examDate: validation.data.examDate ? new Date(validation.data.examDate) : null,
    });
    revalidatePath("/dashboard/academics/exams");
    return { success: true };
  });
}

export async function deleteExam(id: number) {
  return protectedDbAction("Exams", "canDelete", async (user) => {
    const exam = await db.query.exams.findFirst({ where: eq(exams.id, id) });
    if (!exam || !exam.classId || !exam.subjectId) return { error: "Examen non trouvé." };
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, exam.classId, exam.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à supprimer cet examen." };
    }

    await db.delete(exams).where(eq(exams.id, id));
    revalidatePath("/dashboard/academics/exams");
    return { success: true };
  });
}

// --- Results ---
export async function getExamResults(examId: number) {
  return protectedDbAction("Exams", "canView", async (user) => {
    const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
    if (!exam || !exam.classId || !exam.subjectId) return { error: "Examen non trouvé." };
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, exam.classId, exam.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à voir ces résultats." };
    }

    const data = await db.select({
      id: examResults.id,
      examId: examResults.examId,
      studentId: examResults.studentId,
      marksObtained: examResults.marksObtained,
      remarks: examResults.remarks,
      student: {
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        numAdmission: students.numAdmission,
      }
    })
    .from(examResults)
    .leftJoin(students, eq(examResults.studentId, students.id))
    .where(eq(examResults.examId, examId));
    return { data };
  });
}

export async function saveBatchExamResults(formData: BatchExamResultFormData) {
  const validation = batchExamResultSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Exams", "canEdit", async (user) => {
    const { examId, results } = validation.data;
    const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
    if (!exam || !exam.classId || !exam.subjectId) return { error: "Examen non trouvé." };
    
    const hasAccess = await verifyTeacherClassSubjectAccess(user, exam.classId, exam.subjectId);
    if (!hasAccess) {
      return { error: "Accès refusé. Vous n'êtes pas autorisé à modifier ces résultats." };
    }

    for (const res of results) {
      const existing = await db.query.examResults.findFirst({
        where: and(
          eq(examResults.examId, examId),
          eq(examResults.studentId, res.studentId)
        )
      });

      if (existing) {
        await db.update(examResults)
          .set({
            marksObtained: res.marksObtained,
            remarks: res.remarks,
          })
          .where(eq(examResults.id, existing.id));
      } else {
        await db.insert(examResults).values({
          examId,
          studentId: res.studentId,
          marksObtained: res.marksObtained,
          remarks: res.remarks,
        });
      }
    }

    revalidatePath("/dashboard/academics/exams");
    return { success: true };
  });
}
