"use server";

import { db } from "@/infrastructure/database";
import { homework } from "@/infrastructure/database/schema/homework";
import { eq, desc, inArray, and, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { homeworkSchema, HomeworkFormData } from "../validators/homework.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType, getTeacherEmployee, getTeacherClassIds, verifyTeacherClassAccess, verifyTeacherClassSubjectAccess } from "@/domains/auth/services/rbac";
import { classSubjects, schoolClasses, schoolSubjects } from "@/infrastructure/database/schema/academics";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export async function getHomeworks() {
  return protectedDbAction("Academics", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const roleType = await getUserRoleType(user);

    // Teachers only see homework for their assigned class-subject combinations
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (!emp) return { data: [] };

      const teacherSubjects = await db.select({
        classId: classSubjects.classId,
        subjectId: classSubjects.subjectId
      })
      .from(classSubjects)
      .where(eq(classSubjects.employeeId, emp.id));

      if (teacherSubjects.length === 0) return { data: [] };

      const orConditions = teacherSubjects.map(pair => 
        and(eq(homework.classId, pair.classId!), eq(homework.subjectId, pair.subjectId!))
      );

      const data = await db.query.homework.findMany({
        where: or(...orConditions),
        with: { class: true, subject: true },
        orderBy: [desc(homework.dateAssigned)],
      });

      const filtered = data.filter((h) => h.class?.schoolId === schoolId);
      return { data: filtered };
    }

    // Admin/Director sees all homework for their school
    const data = await db.query.homework.findMany({
      with: { class: true, subject: true },
      orderBy: [desc(homework.dateAssigned)],
    });

    const filtered = data.filter((h) => h.class?.schoolId === schoolId);
    return { data: filtered };
  });
}

export async function createHomework(formData: HomeworkFormData) {
  const validation = homeworkSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    // Verify teacher has access to this class and subject
    if (validation.data.classId && validation.data.subjectId) {
      const hasAccess = await verifyTeacherClassSubjectAccess(
        user, 
        validation.data.classId, 
        validation.data.subjectId
      );
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
      }
    }

    // Verify target class and subject belong to the school
    if (validation.data.classId && validation.data.subjectId) {
      const targetClass = await db.query.schoolClasses.findFirst({
        where: and(
          eq(schoolClasses.id, validation.data.classId),
          eq(schoolClasses.schoolId, schoolId)
        )
      });
      if (!targetClass) {
        return { error: "Classe introuvable ou non autorisée." };
      }

      const targetSubject = await db.query.schoolSubjects.findFirst({
        where: and(
          eq(schoolSubjects.id, validation.data.subjectId),
          eq(schoolSubjects.schoolId, schoolId)
        )
      });
      if (!targetSubject) {
        return { error: "Matière introuvable ou non autorisée." };
      }
    }

    await db.insert(homework).values({
      ...validation.data,
      dateDue: new Date(validation.data.dateDue),
    });
    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}

export async function updateHomework(id: number, formData: HomeworkFormData) {
  const validation = homeworkSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    // Verify existing homework belongs to the active school
    const existing = await db.query.homework.findFirst({
      where: eq(homework.id, id),
      with: { class: true }
    });
    if (!existing || existing.class?.schoolId !== schoolId) {
      return { error: "Devoir introuvable ou non autorisé." };
    }

    // Verify teacher has access to the target class and subject
    if (validation.data.classId && validation.data.subjectId) {
      const hasAccess = await verifyTeacherClassSubjectAccess(
        user, 
        validation.data.classId, 
        validation.data.subjectId
      );
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
      }
    }

    // Verify target class and subject belong to the school
    if (validation.data.classId && validation.data.subjectId) {
      const targetClass = await db.query.schoolClasses.findFirst({
        where: and(
          eq(schoolClasses.id, validation.data.classId),
          eq(schoolClasses.schoolId, schoolId)
        )
      });
      if (!targetClass) {
        return { error: "Classe cible introuvable ou non autorisée." };
      }

      const targetSubject = await db.query.schoolSubjects.findFirst({
        where: and(
          eq(schoolSubjects.id, validation.data.subjectId),
          eq(schoolSubjects.schoolId, schoolId)
        )
      });
      if (!targetSubject) {
        return { error: "Matière cible introuvable ou non autorisée." };
      }
    }

    await db.update(homework)
      .set({
        ...validation.data,
        dateDue: new Date(validation.data.dateDue),
      })
      .where(eq(homework.id, id));
    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}

export async function deleteHomework(id: number) {
  return protectedDbAction("Academics", "canDelete", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    // Verify existing homework belongs to the active school
    const existing = await db.query.homework.findFirst({
      where: eq(homework.id, id),
      with: { class: true }
    });
    if (!existing || existing.class?.schoolId !== schoolId) {
      return { error: "Devoir introuvable ou non autorisé." };
    }

    // Verify teacher owns the homework's class and subject before deleting
    if (existing.classId && existing.subjectId) {
      const hasAccess = await verifyTeacherClassSubjectAccess(user, existing.classId, existing.subjectId);
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe et cette matière." };
      }
    }

    await db.delete(homework).where(eq(homework.id, id));
    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}
