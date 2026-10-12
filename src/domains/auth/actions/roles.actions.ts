"use server";

import { db } from "@/infrastructure/database";
import { roles, rolePermissions, users } from "@/infrastructure/database/schema/auth";
import { eq, sql, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";

export const getRoles = async () => {
  try {
    const user = await getCurrentUser();
    const schoolId = await getActiveSchoolId();

    const data = await db.query.roles.findMany({
      with: {
        permissions: true,
        users: {
          where: user?.superAdmin ? undefined : eq(users.schoolId, schoolId),
          columns: {
            id: true
          }
        },
      },
    });
    return { success: true, data };
  } catch (error: any) {
    console.error("getRoles Error:", error);
    return { success: false, error: error.message, data: [] };
  }
};

export const createRole = async (roleName: string, description?: string) => {
  return protectedDbAction("Security", "canEdit", async () => {
    const [newRole] = await db.insert(roles).values({
      roleName,
      description,
    }).returning();
    
    revalidatePath("/dashboard/security");
    return newRole;
  });
};

/** Inline version — returns the created role directly (no page revalidation needed for modal use) */
export const createRoleInline = async (roleName: string) => {
  "use server";
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false as const, error: "Non autorisé" };

    const { getUserRoleType, hasAllEducationalLevels } = await import("@/domains/auth/services/rbac");
    const roleType = await getUserRoleType(user);
    const hasRestrictedLevel = user.educationalLevel && !hasAllEducationalLevels(user.educationalLevel);
    if (!user.superAdmin && (roleType === "level_director" || hasRestrictedLevel)) {
      return { success: false as const, error: "Non autorisé : la création de rôles est réservée à la direction générale." };
    }

    const trimmed = roleName.trim();
    if (!trimmed) return { success: false as const, error: "Nom de rôle requis" };

    // 1. Direct SQL check if role already exists
    const existing = await db.execute(sql`
      SELECT "id", "role_name" AS "roleName" 
      FROM "roles" 
      WHERE LOWER(TRIM("role_name")) = LOWER(TRIM(${trimmed}))
      LIMIT 1
    `) as any;

    const existingRow = Array.isArray(existing) ? (Array.isArray(existing[0]) ? existing[0][0] : existing[0]) : existing;
    if (existingRow && existingRow.id) {
      return { success: true as const, data: { id: Number(existingRow.id), roleName: String(existingRow.roleName || trimmed) } };
    }

    // 2. Direct atomic insert with conflict resolution
    const inserted = await db.execute(sql`
      INSERT INTO "roles" ("role_name")
      VALUES (${trimmed})
      ON CONFLICT ("role_name") DO UPDATE SET "role_name" = EXCLUDED."role_name"
      RETURNING "id", "role_name" AS "roleName"
    `) as any;

    const row = Array.isArray(inserted) ? (Array.isArray(inserted[0]) ? inserted[0][0] : inserted[0]) : inserted;
    revalidatePath("/dashboard/security");
    revalidatePath("/dashboard/security/users");
    return { success: true as const, data: { id: Number(row.id), roleName: String(row.roleName || trimmed) } };
  } catch (error: any) {
    console.error("[createRole] Error:", error);
    // Ultimate fallback: direct fetch by name
    try {
      const fallback = await db.execute(sql`
        SELECT "id", "role_name" AS "roleName" 
        FROM "roles" 
        WHERE LOWER(TRIM("role_name")) = LOWER(TRIM(${roleName.trim()}))
        LIMIT 1
      `) as any;
      const fRow = Array.isArray(fallback) ? (Array.isArray(fallback[0]) ? fallback[0][0] : fallback[0]) : fallback;
      if (fRow && fRow.id) {
        return { success: true as const, data: { id: Number(fRow.id), roleName: String(fRow.roleName || roleName.trim()) } };
      }
    } catch (_) {}

    const msg: string = error?.message || "Erreur lors de la création du rôle";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { success: false as const, error: "Ce nom de rôle existe déjà" };
    }
    return { success: false as const, error: msg };
  }
};

export const deleteRole = async (roleId: number) => {
  return protectedDbAction("Security", "canDelete", async () => {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));
    
    revalidatePath("/dashboard/security");
    return { success: true };
  });
};

export const updateRolePermissions = async (roleId: number, permissions: any[]) => {
  return protectedDbAction("Security", "canEdit", async () => {
    // Delete existing permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    
    // Insert new permissions (only those with at least one true value or custom fieldPermissions)
    const validPerms = permissions.filter(p => p.canView || p.canEdit || p.canDelete || (p.fieldPermissions && Object.keys(p.fieldPermissions).length > 0));
    if (validPerms.length > 0) {
      await db.insert(rolePermissions).values(
        validPerms.map(p => ({
          roleId,
          moduleName: p.moduleName,
          canView: p.canView ?? false,
          canEdit: p.canEdit ?? false,
          canDelete: p.canDelete ?? false,
          fieldPermissions: p.fieldPermissions ? JSON.stringify(p.fieldPermissions) : null,
        }))
      );
    }
    
    revalidatePath("/dashboard/security");
    return { success: true };
  });
};
