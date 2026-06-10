"use server";

import { db } from "@/infrastructure/database";
import { homework } from "@/infrastructure/database/schema/homework";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { homeworkSchema, HomeworkFormData } from "../validators/homework.schema";
import { protectedDbAction } from "@/lib/protected-action";

export async function getHomeworks() {
  return protectedDbAction("Academics", "canView", async () => {
    const data = await db.query.homework.findMany({
      with: {
        class: true,
        subject: true,
      },
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

  return protectedDbAction("Academics", "canEdit", async () => {
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

  return protectedDbAction("Academics", "canEdit", async () => {
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
  return protectedDbAction("Academics", "canDelete", async () => {
    await db.delete(homework).where(eq(homework.id, id));
    revalidatePath("/dashboard/academics/homework");
    return { success: true };
  });
}
