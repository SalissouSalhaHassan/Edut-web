"use server";

import { db } from "@/infrastructure/database";
import { homework } from "@/infrastructure/database/schema/homework";
import { eq, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { homeworkSchema, HomeworkFormData } from "../validators/homework.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType, getTeacherEmployee, getTeacherClassIds, verifyTeacherClassAccess } from "@/domains/auth/services/rbac";

export async function getHomeworks() {
  return protectedDbAction("Academics", "canView", async (user) => {
    const roleType = await getUserRoleType(user);

    // Teachers only see homework for their assigned classes
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (!emp) return { data: [] };

      const classIds = await getTeacherClassIds(emp.id);
      if (classIds.length === 0) return { data: [] };

      const data = await db.query.homework.findMany({
        where: inArray(homework.classId, classIds),
        with: { class: true, subject: true },
        orderBy: [desc(homework.dateAssigned)],
      });
      return { data };
    }

    // Admin/Director sees all homework
    const data = await db.query.homework.findMany({
      with: { class: true, subject: true },
      orderBy: [desc(homework.dateAssigned)],
    });
    return { data };
  });
}

export async function createHomework(formData: HomeworkFormData) {
  const validation = homeworkSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Academics", "canEdit", async (user) => {
    // Verify teacher has access to this class
    if (validation.data.classId) {
      const hasAccess = await verifyTeacherClassAccess(user, validation.data.classId);
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe." };
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
    // Verify teacher has access to the target class
    if (validation.data.classId) {
      const hasAccess = await verifyTeacherClassAccess(user, validation.data.classId);
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe." };
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
    // Verify teacher owns the homework's class before deleting
    const existing = await db.query.homework.findFirst({ where: eq(homework.id, id) });
    if (existing?.classId) {
      const hasAccess = await verifyTeacherClassAccess(user, existing.classId);
      if (!hasAccess) {
        return { error: "Accès refusé. Vous n'êtes pas autorisé pour cette classe." };
      }
    }

    await db.delete(homework).where(eq(homework.id, id));
    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}
