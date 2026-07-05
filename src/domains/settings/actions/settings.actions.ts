"use server";

import { db } from "@/infrastructure/database";
import { settings, schoolBranches } from "@/infrastructure/database/schema/settings";
import { schools } from "@/infrastructure/database/schema/auth";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { revalidatePath, unstable_cache, revalidateTag as nextRevalidateTag } from "next/cache";
const revalidateTag = nextRevalidateTag as any;
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  DOCUMENT_HEADER_SETTING_KEY,
  mergeDocumentHeaderConfig,
  type DocumentHeaderConfig,
} from "@/domains/printing/document-header";

const SETTINGS_TAG = "settings-cache";
const BRANCHES_TAG = "branches-cache";

// --- Cached Data Fetchers ---

const fetchCachedBranches = (schoolId: number) =>
  unstable_cache(
    async () => {
      console.log(`🔄 [Cache Miss] Fetching branches from DB for School ${schoolId}...`);
      return await db.query.schoolBranches.findMany({
        where: eq(schoolBranches.schoolId, schoolId),
        orderBy: [desc(schoolBranches.createdAt)]
      });
    },
    ["all-branches", String(schoolId)],
    { tags: [BRANCHES_TAG], revalidate: 3600 } // Cache for 1 hour
  )();

const fetchCachedSettings = (schoolId: number) =>
  unstable_cache(
    async () => {
      console.log(`🔄 [Cache Miss] Fetching settings from DB for School ${schoolId}...`);
      try {
        return await db.query.settings.findMany({
          where: eq(settings.schoolId, schoolId)
        });
      } catch (e) {
        return [];
      }
    },
    ["all-settings", String(schoolId)],
    { tags: [SETTINGS_TAG], revalidate: 3600 }
  )();

export async function getBranches() {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const data = await fetchCachedBranches(schoolId);
    return { data };
  });
}

export async function getBranchByLevel(level: string) {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const allBranches = await fetchCachedBranches(schoolId);
    
    let branch = allBranches.find(b => 
      b.instType?.toLowerCase() === (level || "Lycée").toLowerCase()
    );

    if (!branch && allBranches.length > 0) {
      branch = allBranches[0];
    }

    return { data: branch || null };
  });
}

export async function saveBranch(data: any) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, createdAt, ...rest } = data;
    
    // Automatically alter database column types to support longer prefixes, padding, and ports
    try {
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "adm_prefix" TYPE varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "adm_padding" TYPE varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "smtp_port" TYPE varchar(100)`);
      await db.execute(sql`ALTER TABLE "school_branches" ALTER COLUMN "working_days" TYPE varchar(255)`);
      console.log("Database schema altered successfully inside saveBranch action.");
    } catch (err) {
      console.error("Error altering database columns inside saveBranch:", err);
    }
    
    // Sanitize workingDays array to a comma-separated string
    if (rest.workingDays && Array.isArray(rest.workingDays)) {
      rest.workingDays = rest.workingDays.join(",");
    }
    
    if (id) {
      await db.update(schoolBranches)
        .set(rest)
        .where(and(
          eq(schoolBranches.id, id),
          eq(schoolBranches.schoolId, schoolId)
        ));
    } else {
      await db.insert(schoolBranches).values({
        ...rest,
        schoolId: schoolId
      });
    }
    
    revalidateTag(BRANCHES_TAG);
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function deleteBranch(id: number) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(schoolBranches).where(and(
      eq(schoolBranches.id, id),
      eq(schoolBranches.schoolId, schoolId)
    ));
    
    revalidateTag(BRANCHES_TAG);
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function updateSchoolDomain(customDomain: string) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) throw new Error("School not found");

    await db.update(schools)
      .set({ customDomain: customDomain?.toLowerCase() || null })
      .where(eq(schools.id, schoolId));
    
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function getSettings() {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const data = await fetchCachedSettings(schoolId);
    return { data };
  });
}

export async function updateSetting(key: string, value: string) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, key),
        eq(settings.schoolId, schoolId)
      )
    });

    if (existing) {
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        key,
        value,
        schoolId: schoolId
      });
    }

    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function getDocumentHeaderConfig() {
  return protectedDbAction("Settings", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      )
    });

    if (!existing?.value) return { data: mergeDocumentHeaderConfig() };

    try {
      return { data: mergeDocumentHeaderConfig(JSON.parse(existing.value)) };
    } catch {
      return { data: mergeDocumentHeaderConfig() };
    }
  });
}

export async function saveDocumentHeaderConfig(config: DocumentHeaderConfig) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const value = JSON.stringify(mergeDocumentHeaderConfig(config));
    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      )
    });

    if (existing) {
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        key: DOCUMENT_HEADER_SETTING_KEY,
        value,
        schoolId,
      });
    }

    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard/settings");
    return { success: true };
  });
}

export async function saveSettings(data: Record<string, string>) {
  return protectedDbAction("Settings", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    
    for (const [k, v] of Object.entries(data)) {
      const existing = await db.query.settings.findFirst({ 
        where: and(
          eq(settings.key, k),
          eq(settings.schoolId, schoolId)
        )
      });

      if (existing) {
        await db.update(settings)
          .set({ value: v, updatedAt: new Date() })
          .where(and(
            eq(settings.key, k),
            eq(settings.schoolId, schoolId)
          ));
      } else {
        await db.insert(settings).values({ 
          key: k, 
          value: v,
          schoolId: schoolId 
        });
      }
    }
    
    revalidateTag(SETTINGS_TAG);
    revalidatePath("/dashboard", "layout");
    return { success: true };
  });
}

import { downloadArabicFontIfNeeded } from "@/domains/printing/utils/font-downloader";

export async function downloadArabicFontAction() {
  try {
    await downloadArabicFontIfNeeded();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false };
  }
}
