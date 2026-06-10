"use server";

import { db } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { eq, sql, count, desc } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { revalidatePath } from "next/cache";

/**
 * Get platform-wide statistics for Super Admin
 */
export async function getPlatformStats() {
  return protectedDbAction("Admin", "canView", async (user) => {
    if (!user.superAdmin) throw new Error("Accès non autorisé.");

    const [schoolsCount] = await db.select({ count: count() }).from(schools);
    const [studentsCount] = await db.select({ count: count() }).from(students);
    const [activeSchools] = await db.select({ count: count() }).from(schools).where(eq(schools.status, "active"));

    return {
      stats: {
        totalSchools: schoolsCount.count,
        totalStudents: studentsCount.count,
        activeSchools: activeSchools.count,
        revenue: 0, // Placeholder for subscription revenue
      }
    };
  });
}

/**
 * Get list of all schools for management
 */
export async function getAllSchools() {
  return protectedDbAction("Admin", "canView", async (user) => {
    if (!user.superAdmin) throw new Error("Accès non autorisé.");

    const data = await db.query.schools.findMany({
      orderBy: [desc(schools.createdAt)],
      with: {
        // We can add a relation to count users/students per school if needed
      }
    });

    return { data };
  });
}

/**
 * Update school status or plan
 */
export async function updateSchoolStatus(schoolId: number, data: { status?: string; plan?: string }) {
  return protectedDbAction("Admin", "canEdit", async (user) => {
    if (!user.superAdmin) throw new Error("Accès non autorisé.");

    await db.update(schools)
      .set({
        ...data,
      })
      .where(eq(schools.id, schoolId));

    revalidatePath("/dashboard/super-admin");
    return { success: true };
  });
}

/**
 * Create a new school manually
 */
export async function createSchoolAction(name: string, slug: string, plan: string, status: string) {
  return protectedDbAction("Admin", "canEdit", async (user) => {
    if (!user.superAdmin) throw new Error("Accès non autorisé.");

    if (!name || !name.trim()) throw new Error("Le nom de l'école est requis.");
    if (!slug || !slug.trim()) throw new Error("Le slug (sous-domaine) est requis.");

    const cleanSlug = slug.trim().toLowerCase();

    // Check if slug is unique
    const existing = await db.query.schools.findFirst({
      where: eq(schools.slug, cleanSlug),
    });

    if (existing) {
      throw new Error("Ce sous-domaine (slug) est déjà utilisé.");
    }

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1); // 1 year of validity by default for manual creation

    await db.insert(schools).values({
      name: name.trim(),
      slug: cleanSlug,
      plan: plan || "basic",
      status: status || "active",
      subscriptionExpiry: expiry,
    });

    revalidatePath("/dashboard/super-admin");
    return { success: true };
  });
}

