"use server";

import { db } from "@/infrastructure/database";
import { lmsLessons, lmsVirtualClasses } from "@/infrastructure/database/schema/lms";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export async function getLmsLessons() {
  return protectedDbAction("LMS", "canView", async () => {
    const data = await db.query.lmsLessons.findMany({
      with: {
        class: true,
        subject: true
      },
      orderBy: [desc(lmsLessons.createdAt)]
    });
    return { data };
  });
}

export async function getLmsVirtualClasses() {
  return protectedDbAction("LMS", "canView", async () => {
    const data = await db.query.lmsVirtualClasses.findMany({
      with: {
        class: true,
        subject: true
      },
      orderBy: [desc(lmsVirtualClasses.sessionDate)]
    });
    return { data };
  });
}

export async function saveLmsLesson(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsLessons).set(data).where(eq(lmsLessons.id, id));
    } else {
      await db.insert(lmsLessons).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function saveVirtualClass(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsVirtualClasses).set(data).where(eq(lmsVirtualClasses.id, id));
    } else {
      await db.insert(lmsVirtualClasses).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteLmsLesson(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await db.delete(lmsLessons).where(eq(lmsLessons.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}
