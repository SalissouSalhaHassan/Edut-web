"use server";

import { db } from "@/infrastructure/database";
import { users, roles } from "@/infrastructure/database/schema/auth";
import { eq, desc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import bcrypt from "bcryptjs";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getUserRoleType, getCompatibleLevels, checkEducationalLevelAccess } from "@/domains/auth/services/rbac";

export async function getUsers() {
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Non autorisé", success: false };

    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    console.log(`[getUsers] currentUser: id=${user.id}, superAdmin=${user.superAdmin}, schoolId=${user.schoolId}, activeSchoolId=${schoolId}, roleType=${roleType}`);

    // Multi-tenancy logic: 
    // Super Admins see everyone, regular users see only their school's users
    let whereClause: any;
    if (user.superAdmin) {
      // superAdmin sees ALL users across platform
      whereClause = undefined;
    } else if (schoolId) {
      // Regular users filtered by their school
      whereClause = eq(users.schoolId, schoolId);
    } else if (user.schoolId) {
      // Fallback to user's own schoolId
      whereClause = eq(users.schoolId, user.schoolId);
    } else {
      // No school context at all - return empty
      console.warn(`[getUsers] No school context found for non-superAdmin user`);
      return { data: [], success: true };
    }

    if (roleType === "level_director" && user.educationalLevel) {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      whereClause = whereClause 
        ? and(whereClause, inArray(users.educationalLevel, compatibleLevels))
        : inArray(users.educationalLevel, compatibleLevels);
    }

    const data = await db.query.users.findMany({
      where: whereClause,
      with: { 
        role: true,
        school: true
      },
      orderBy: [desc(users.createdAt)],
    });
    
    console.log(`[getUsers] Found ${data.length} users (SuperAdmin: ${user.superAdmin}, schoolId filter: ${schoolId ?? user.schoolId ?? 'none'})`);
    return { data, success: true };
  } catch (error: any) {
    console.error("getUsers Error:", error);
    return { error: error.message, success: false, data: [] };
  }
}

export async function saveUser(formData: any, id?: number) {
  console.log(`[saveUser] Attempting to save user. ID: ${id || 'NEW'}, Data:`, formData);
  
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Non autorisé. Veuillez vous connecter.", success: false };

    // SuperAdmins bypass the standard permission check (which requires a valid DB user id)
    const isSuperAdmin = currentUser.superAdmin === true || currentUser.superAdmin === 1;
    if (!isSuperAdmin) {
      // Check permission only for non-superAdmin users
      const { hasPermission } = await import("@/domains/auth/services/rbac");
      const permitted = await hasPermission(currentUser.id, "Security", "canEdit");
      if (!permitted) {
        return { error: "Accès refusé. Vous n'avez pas la permission d'éditer les utilisateurs.", success: false };
      }
    }

    const { utilisateur, nomPrenom, motDePasse, admin, superAdmin, roleId, langue, educationalLevel, supabaseId, schoolId } = formData;
    const roleType = await getUserRoleType(currentUser);

    // Basic validation
    if (!utilisateur) return { error: "L'identifiant est requis", success: false };
    if (!nomPrenom) return { error: "Le nom complet est requis", success: false };

    const data: any = {
      utilisateur,
      nomPrenom,
      admin: !!admin,
      superAdmin: isSuperAdmin ? !!superAdmin : undefined,
      roleId: roleId && roleId !== "" ? parseInt(roleId) : null,
      langue: langue || "FR",
      educationalLevel: educationalLevel || "Primaire",
      supabaseId: supabaseId || null,
      // Multi-tenancy: set schoolId.
      schoolId: isSuperAdmin && schoolId && schoolId !== "" ? parseInt(schoolId) : currentUser.schoolId,
    };

    if (roleType === "level_director") {
      data.educationalLevel = currentUser.educationalLevel;
    }

    if (motDePasse) {
      data.motDePasse = await bcrypt.hash(motDePasse, 10);
    }

    if (id) {
      console.log(`[saveUser] Updating existing user ${id} with:`, data);
      
      // Multi-tenancy and level check for update (non-superAdmins only)
      if (!isSuperAdmin) {
        const targetUser = await db.query.users.findFirst({
          where: eq(users.id, id),
          columns: { schoolId: true, educationalLevel: true }
        });
        
        if (!targetUser) return { error: "Utilisateur non trouvé", success: false };
        if (targetUser.schoolId !== currentUser.schoolId) {
          return { error: "Non autorisé : cet utilisateur appartient à une autre école", success: false };
        }
        if (roleType === "level_director" && !checkEducationalLevelAccess(currentUser, targetUser.educationalLevel)) {
          return { error: "Non autorisé : cet utilisateur appartient à un autre secteur", success: false };
        }
      }

      await db.update(users).set(data).where(eq(users.id, id));
      console.log(`[saveUser] Update success for user ${id}`);
    } else {
      if (!motDePasse) return { error: "Mot de passe requis pour un nouvel utilisateur", success: false };
      console.log(`[saveUser] Inserting new user with:`, data);
      await db.insert(users).values(data);
      console.log(`[saveUser] Insert success`);
    }

    revalidatePath("/dashboard/security/users");
    return { success: true };
  } catch (error: any) {
    console.error("[saveUser] Error saving user:", error);
    // Return proper error message instead of throwing
    if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
      return { error: "Cet identifiant existe déjà.", success: false };
    }
    return { error: error.message || "Erreur lors de l'enregistrement", success: false };
  }
}

export async function deleteUser(id: number) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { error: "Non autorisé. Veuillez vous connecter.", success: false };

    const isSuperAdmin = currentUser.superAdmin === true || currentUser.superAdmin === 1;
    if (!isSuperAdmin) {
      const { hasPermission } = await import("@/domains/auth/services/rbac");
      const permitted = await hasPermission(currentUser.id, "Security", "canDelete");
      if (!permitted) {
        return { error: "Accès refusé. Vous n'avez pas la permission de supprimer des utilisateurs.", success: false };
      }
    }

    const roleType = await getUserRoleType(currentUser);

    // Multi-tenancy and level check for deletion (non-superAdmins only)
    if (!isSuperAdmin) {
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { schoolId: true, educationalLevel: true }
      });
      
      if (!targetUser) return { error: "Utilisateur non trouvé", success: false };
      if (targetUser.schoolId !== currentUser.schoolId) {
        return { error: "Non autorisé : cet utilisateur appartient à une autre école", success: false };
      }
      if (roleType === "level_director" && !checkEducationalLevelAccess(currentUser, targetUser.educationalLevel)) {
        return { error: "Non autorisé : cet utilisateur appartient à un autre secteur", success: false };
      }
    }

    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/dashboard/security/users");
    return { success: true };
  } catch (error: any) {
    console.error("[deleteUser] Error:", error);
    return { error: error.message || "Erreur lors de la suppression", success: false };
  }
}
