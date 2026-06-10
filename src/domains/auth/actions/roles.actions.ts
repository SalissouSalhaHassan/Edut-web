"use server";

import { db } from "@/infrastructure/database";
import { roles, rolePermissions, users } from "@/infrastructure/database/schema/auth";
import { eq, sql } from "drizzle-orm";
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
    
    // Insert new permissions (only those with at least one true value)
    const validPerms = permissions.filter(p => p.canView || p.canEdit || p.canDelete);
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
