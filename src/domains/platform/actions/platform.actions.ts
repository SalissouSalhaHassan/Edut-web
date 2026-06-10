"use server";

import { db, readDb } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { feePayments } from "@/infrastructure/database/schema/finance";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { eq, sql, desc, count } from "drizzle-orm";
import { superAdminAction } from "@/lib/protected-action";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Global stats across all schools
 */
export async function getGlobalPlatformStats() {
  return superAdminAction(async () => {
    const [schoolsCount] = await readDb.select({ value: count() }).from(schools);
    const [studentsCount] = await readDb.select({ value: count() }).from(students);
    const [usersCount] = await readDb.select({ value: count() }).from(users);
    
    // Sum of all revenue across all schools
    const [totalRevenue] = await readDb.select({ 
      value: sql<number>`coalesce(sum(amount), 0)` 
    }).from(feePayments);

    return {
      schools: schoolsCount.value,
      students: studentsCount.value,
      users: usersCount.value,
      revenue: totalRevenue.value,
    };
  });
}

/**
 * Impersonate a school (Super Admin only)
 */
export async function impersonateSchool(schoolId: number | null) {
  return superAdminAction(async () => {
    const cookieStore = await cookies();
    if (schoolId) {
      cookieStore.set("impersonated_school_id", schoolId.toString(), {
        maxAge: 3600, // 1 hour
        httpOnly: true,
      });
    } else {
      cookieStore.delete("impersonated_school_id");
    }
    
    revalidatePath("/", "layout");
    return { success: true };
  });
}

/**
 * List all schools with their details
 */
export async function getAllSchools() {
  return superAdminAction(async () => {
    return await readDb.query.schools.findMany({
      orderBy: [desc(schools.createdAt)],
    });
  });
}

/**
 * Update school status (active/suspended)
 */
export async function updateSchoolStatus(id: number, status: "active" | "suspended") {
  return superAdminAction(async () => {
    await db.update(schools)
      .set({ status })
      .where(eq(schools.id, id));
    
    revalidatePath("/platform-admin");
    return { success: true };
  });
}

/**
 * Update school plan
 */
export async function updateSchoolPlan(id: number, plan: "basic" | "premium" | "enterprise") {
  return superAdminAction(async () => {
    await db.update(schools)
      .set({ plan })
      .where(eq(schools.id, id));
    
    revalidatePath("/platform-admin");
    return { success: true };
  });
}

/**
 * Create a new school
 */
export async function createSchool(data: {
  name: string;
  slug: string;
  plan: "basic" | "premium" | "enterprise";
}) {
  return superAdminAction(async () => {
    // Check if slug already exists
    const existing = await readDb.query.schools.findFirst({
      where: eq(schools.slug, data.slug.toLowerCase()),
    });

    if (existing) {
      throw new Error("Ce nom de domaine (slug) est déjà utilisé.");
    }

    const [newSchool] = await db.insert(schools).values({
      name: data.name,
      slug: data.slug.toLowerCase(),
      plan: data.plan,
      status: "active",
      createdAt: new Date(),
    }).returning();

    revalidatePath("/platform-admin");
    return { success: true, data: newSchool };
  });
}

/**
 * Get recent audit logs across all schools
 */
export async function getGlobalAuditLogs() {
  return superAdminAction(async () => {
    return await readDb.query.auditLogs.findMany({
      with: {
        user: {
          columns: {
            nomPrenom: true,
            utilisateur: true,
          }
        },
        school: {
          columns: {
            name: true,
          }
        }
      },
      orderBy: [desc(auditLogs.timestamp)],
      limit: 50,
    });
  });
}
