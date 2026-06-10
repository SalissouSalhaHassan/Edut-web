"use server";

import { db } from "@/infrastructure/database";
import { schools } from "@/infrastructure/database/schema/auth";
import { eq } from "drizzle-orm";
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
 * Update the subscription of the active school (for self-serve upgrading)
 */
export async function updateMySchoolSubscription(plan: string) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) throw new Error("Aucun contexte d'école trouvé.");

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
      .where(eq(schools.id, schoolId));

    revalidatePath("/dashboard/subscription");
    revalidatePath("/dashboard", "layout");
    
    return { success: true };
  });
}
