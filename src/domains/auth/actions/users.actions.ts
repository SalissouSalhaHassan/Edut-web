"use server";

import { db } from "@/infrastructure/database";
import { users, roles } from "@/infrastructure/database/schema/auth";
import { eq, desc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
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

    // Multi-tenancy logic: 
    // Super Admins see everyone (or filtered by school if provided), 
    // regular users see only their school's users
    let whereClause = user.superAdmin ? undefined : eq(users.schoolId, schoolId);

    if (roleType === "level_director" && user.educationalLevel) {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      whereClause = and(whereClause, inArray(users.educationalLevel, compatibleLevels)) as any;
    }

    const data = await db.query.users.findMany({
      where: whereClause,
      with: { 
        role: true,
        school: true // Include school info for superAdmins
      },
      orderBy: [desc(users.createdAt)],
    });
    
    console.log(`[getUsers] Found ${data.length} users for school ${schoolId} (SuperAdmin: ${user.superAdmin})`);
    return { data, success: true };
  } catch (error: any) {
    console.error("getUsers Error:", error);
    return { error: error.message, success: false, data: [] };
  }
}

export async function saveUser(formData: any, id?: number) {
  console.log(`[saveUser] Attempting to save user. ID: ${id || 'NEW'}, Data:`, formData);
  
  return protectedDbAction("Security", "canEdit", async (currentUser) => {
    try {
      const { utilisateur, nomPrenom, motDePasse, admin, superAdmin, roleId, langue, educationalLevel, supabaseId, schoolId } = formData;
      const roleType = await getUserRoleType(currentUser);

      // Basic validation
      if (!utilisateur) throw new Error("L'identifiant est requis");
      if (!nomPrenom) throw new Error("Le nom complet est requis");

      const data: any = {
        utilisateur,
        nomPrenom,
        admin: !!admin,
        superAdmin: currentUser.superAdmin ? !!superAdmin : undefined,
        roleId: roleId && roleId !== "" ? parseInt(roleId) : null,
        langue: langue || "FR",
        educationalLevel: educationalLevel || "Primaire",
        supabaseId: supabaseId || null,
        // Multi-tenancy: set schoolId. 
        schoolId: currentUser.superAdmin && schoolId && schoolId !== "" ? parseInt(schoolId) : currentUser.schoolId,
      };

      if (roleType === "level_director") {
        data.educationalLevel = currentUser.educationalLevel;
      }

      if (motDePasse) {
        data.motDePasse = await bcrypt.hash(motDePasse, 10);
      }

      if (id) {
        console.log(`[saveUser] Updating existing user ${id} with:`, data);
        
        // Multi-tenancy and level check for update
        if (!currentUser.superAdmin) {
          const targetUser = await db.query.users.findFirst({
            where: eq(users.id, id),
            columns: { schoolId: true, educationalLevel: true }
          });
          
          if (!targetUser) throw new Error("Utilisateur non trouvé");
          if (targetUser.schoolId !== currentUser.schoolId) {
            throw new Error("Non autorisé : cet utilisateur appartient à une autre école");
          }
          if (roleType === "level_director" && !checkEducationalLevelAccess(currentUser, targetUser.educationalLevel)) {
            throw new Error("Non autorisé : cet utilisateur appartient à un autre secteur");
          }
        }

        const result = await db.update(users).set(data).where(eq(users.id, id));
        console.log(`[saveUser] Update result:`, result);
      } else {
        if (!motDePasse) throw new Error("Mot de passe requis pour un nouvel utilisateur");
        console.log(`[saveUser] Inserting new user with:`, data);
        const result = await db.insert(users).values(data);
        console.log(`[saveUser] Insert result:`, result);
      }

      revalidatePath("/dashboard/security/users");
      return { success: true };
    } catch (error: any) {
      console.error("[saveUser] Error saving user:", error);
      throw error; 
    }
  });
}

export async function deleteUser(id: number) {
  return protectedDbAction("Security", "canDelete", async (currentUser) => {
    const roleType = await getUserRoleType(currentUser);

    // Multi-tenancy and level check for deletion
    if (!currentUser.superAdmin) {
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: { schoolId: true, educationalLevel: true }
      });
      
      if (!targetUser) throw new Error("Utilisateur non trouvé");
      if (targetUser.schoolId !== currentUser.schoolId) {
        throw new Error("Non autorisé : cet utilisateur appartient à une autre école");
      }
      if (roleType === "level_director" && !checkEducationalLevelAccess(currentUser, targetUser.educationalLevel)) {
        throw new Error("Non autorisé : cet utilisateur appartient à un autre secteur");
      }
    }

    await db.delete(users).where(eq(users.id, id));
    revalidatePath("/dashboard/security/users");
    return { success: true };
  });
}
