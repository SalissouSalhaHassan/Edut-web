"use server";

import { db } from "@/infrastructure/database";
import { readDb } from "@/infrastructure/database";
import { schools, users } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { schoolClasses, schoolSections } from "@/infrastructure/database/schema/academics";
import { eq, count, and } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { revalidatePath } from "next/cache";
import { getActiveSchoolId, getCurrentSchool } from "@/domains/auth/services/school";

/**
 * Get active school's subscription info
 */
export async function getSchoolSubscription() {
  return protectedDbAction("Settings", "canView", async () => {
    const school = await getCurrentSchool();
    return { school };
  });
}

/**
 * Get real usage statistics for a school
 */
export async function getSchoolStats(schoolId: number) {
  try {
    const [
      studentCountRes,
      activeStudentCountRes,
      employeeCountRes,
      classCountRes,
      sectionCountRes,
      userCountRes,
    ] = await Promise.all([
      // Total students
      readDb.select({ count: count() }).from(students).where(eq(students.schoolId, schoolId)),
      // Active students only
      readDb.select({ count: count() }).from(students).where(
        and(eq(students.schoolId, schoolId), eq(students.statut, "Actif"))
      ),
      // Total employees (teachers + staff)
      readDb.select({ count: count() }).from(employees).where(eq(employees.schoolId, schoolId)),
      // Total classes
      readDb.select({ count: count() }).from(schoolClasses).where(eq(schoolClasses.schoolId, schoolId)),
      // Total sections
      readDb.select({ count: count() }).from(schoolSections).where(eq(schoolSections.schoolId, schoolId)),
      // Total user accounts
      readDb.select({ count: count() }).from(users).where(eq(users.schoolId, schoolId)),
    ]);

    return {
      totalStudents: studentCountRes[0]?.count ?? 0,
      activeStudents: activeStudentCountRes[0]?.count ?? 0,
      totalEmployees: employeeCountRes[0]?.count ?? 0,
      totalClasses: classCountRes[0]?.count ?? 0,
      totalSections: sectionCountRes[0]?.count ?? 0,
      totalUsers: userCountRes[0]?.count ?? 0,
    };
  } catch (e) {
    console.error("[getSchoolStats] Error:", e);
    return {
      totalStudents: 0,
      activeStudents: 0,
      totalEmployees: 0,
      totalClasses: 0,
      totalSections: 0,
      totalUsers: 0,
    };
  }
}

/**
 * Update the subscription of the active school (for self-serve upgrading)
 * @param plan - The plan to upgrade to
 * @param schoolId - Optional: pass schoolId directly (for Super Admin managing a specific school)
 */
export async function updateMySchoolSubscription(plan: string, schoolId?: number) {
  return protectedDbAction("Settings", "canEdit", async () => {
    // Use provided schoolId or fall back to session context
    const targetSchoolId = schoolId ?? await getActiveSchoolId();
    if (!targetSchoolId) throw new Error("Aucun contexte d'école trouvé.");

    // Set expiry based on plan
    const expiry = new Date();
    if (plan === "enterprise") {
      expiry.setFullYear(expiry.getFullYear() + 1); // 1 year for Enterprise
    } else {
      expiry.setDate(expiry.getDate() + 30); // 30 days for Basic/Pro
    }

    await db.update(schools)
      .set({
        plan,
        subscriptionExpiry: expiry,
        status: "active"
      })
      .where(eq(schools.id, targetSchoolId));

    revalidatePath("/dashboard/subscription");
    revalidatePath("/dashboard", "layout");
    
    return { success: true };
  });
}
