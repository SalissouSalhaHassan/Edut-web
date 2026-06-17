import { db } from "@/infrastructure/database";
import { rolePermissions, users, roles } from "@/infrastructure/database/schema/auth";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { schoolClasses, classSubjects } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, sql, or, inArray, and } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type PermissionAction = "canView" | "canEdit" | "canDelete";

export type UserRoleType = "super_admin" | "general_director" | "level_director" | "teacher" | "regular_user";

// Classify user role type
export const getUserRoleType = cache(async (user: any): Promise<UserRoleType> => {
  if (!user) return "regular_user";
  if (user.superAdmin === true || user.superAdmin === 1) return "super_admin";
  
  let roleName = user.role?.roleName;
  if (!roleName && user.roleId) {
    const r = await db.query.roles.findFirst({ where: eq(roles.id, user.roleId) });
    roleName = r?.roleName;
  }
  
  const isAdmin = user.admin === true;
  const level = user.educationalLevel;
  const hasRestrictedLevel = level && level !== "Tous" && level !== "All" && level !== "";

  if (isAdmin) {
    if (hasRestrictedLevel) {
      return "level_director";
    }
    return "general_director";
  }
  
  if (roleName === "Professeur" || roleName === "Enseignant" ||
      roleName?.toLowerCase() === "teacher" ||
      roleName?.toLowerCase() === "enseignant" ||
      roleName?.toLowerCase() === "professeur") {
    return "teacher";
  }
  
  return "regular_user";
});

// Check if user has module-level permission
export const hasPermission = cache(async (
  userId: number,
  moduleName: string,
  action: PermissionAction
): Promise<boolean> => {
  const userBase = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true }
  });

  if (!userBase) return false;

  const roleType = await getUserRoleType(userBase);

  // 1. super_admin and general_director have full access
  if (roleType === "super_admin" || roleType === "general_director") return true;

  // 2. level_director has full module access (filtered at query/action level)
  if (roleType === "level_director") return true;

  // 3. teacher and regular_user are governed by role permissions
  const userWithPerms = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      role: {
        with: {
          permissions: {
            where: sql`LOWER(${rolePermissions.moduleName}) = LOWER(${moduleName})`,
          },
        },
      },
    },
  });

  if (!userWithPerms?.role?.permissions || userWithPerms.role.permissions.length === 0) {
    return false;
  }

  const permission = userWithPerms.role.permissions[0];
  return permission[action] ?? false;
});

export async function hasFieldPermission(
  userId: number,
  moduleName: string,
  fieldName: string,
  action: "view" | "edit"
): Promise<boolean> {
  const userBase = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true }
  });

  if (!userBase) return false;

  const roleType = await getUserRoleType(userBase);
  if (roleType === "super_admin" || roleType === "general_director" || roleType === "level_director") return true;

  const userWithPerms = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      role: {
        with: {
          permissions: {
            where: sql`LOWER(${rolePermissions.moduleName}) = LOWER(${moduleName})`,
          },
        },
      },
    },
  });

  const permission = userWithPerms?.role?.permissions?.[0];
  if (!permission?.fieldPermissions) return true; // Default to true if no field constraints defined

  try {
    const fields = JSON.parse(permission.fieldPermissions);
    if (fields[fieldName]) {
      return fields[fieldName][action] ?? true;
    }
  } catch (e) {
    console.error("Error parsing field permissions:", e);
  }

  return true;
}

export async function isAdmin(userId: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { admin: true, superAdmin: true },
  });
  return !!(user?.admin || user?.superAdmin);
}

export function normalizeLevel(level: string): string {
  return level
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getCompatibleLevels(level: string): string[] {
  const norm = normalizeLevel(level);
  let baseLevels: string[] = [];
  
  if (norm === "primaire" || norm === "maternelle" || norm === "elementaire") {
    baseLevels = ["Primaire", "Maternelle", "primaire", "maternelle", "Elémentaire", "elementaire"];
  } else if (norm === "college" || norm === "moyen") {
    baseLevels = ["Collège", "College", "collège", "college", "Moyen", "moyen"];
  } else if (norm === "lycee" || norm === "secondaire") {
    baseLevels = ["Lycée", "Lycee", "lycée", "lycee", "Secondaire", "secondaire"];
  } else if (["university", "universite", "licence", "master", "doctorat", "superieur"].includes(norm)) {
    baseLevels = ["Université", "Universite", "Licence", "Master", "université", "universite", "licence", "master", "Supérieur", "superieur"];
  } else {
    baseLevels = [level, level.toLowerCase(), level.toUpperCase(), level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()];
  }

  // Always include global levels to make sure global staff/resources are visible
  return [...baseLevels, "Tous", "All", "tous", "all", ""];
}

export async function getActiveEducationalLevel(user: any): Promise<string | null> {
  if (!user) return null;
  
  const roleType = await getUserRoleType(user);
  const isAdminUser = roleType === "super_admin" || roleType === "general_director" || roleType === "level_director";
  
  if (!isAdminUser) {
    return user.educationalLevel || "Primaire";
  }
  
  // Admin/Manager: check selected branch cookie
  try {
    const cookieStore = await cookies();
    const selectedBranchId = cookieStore.get("selected_branch_id")?.value;
    if (selectedBranchId) {
      const branch = await db.query.schoolBranches.findFirst({
        where: eq(schoolBranches.id, parseInt(selectedBranchId))
      });
      if (branch?.instType) {
        return branch.instType;
      }
    }
  } catch (e) {
    // cookies() can throw in some contexts (e.g. static generation)
  }
  
  if (roleType === "level_director") {
    return user.educationalLevel || "Primaire";
  }

  if (roleType === "super_admin" || roleType === "general_director") {
    return null;
  }
  
  return user.educationalLevel || "Primaire";
}

export function checkEducationalLevelAccess(user: any, resourceLevel: string | null | undefined): boolean {
  if (!user) return false;
  if (user.superAdmin) return true;
  
  const hasRestrictedLevel = user.educationalLevel && user.educationalLevel !== "Tous" && user.educationalLevel !== "All" && user.educationalLevel !== "";
  
  // General Director has access to all levels in school
  if (user.admin === true && !hasRestrictedLevel) {
    return true;
  }
  
  if (!resourceLevel) return true;
  
  const normUser = normalizeLevel(user.educationalLevel || "");
  const normResource = normalizeLevel(resourceLevel);
  
  if (normUser === normResource) return true;
  if (normResource === "tous" || normResource === "all" || normResource === "") return true;
  
  // Handlers for groupings
  const universityTerms = ["university", "universite", "licence", "master", "doctorat", "superieur"];
  if (universityTerms.includes(normUser) && universityTerms.includes(normResource)) return true;

  const primaryTerms = ["primaire", "maternelle", "elementaire"];
  if (primaryTerms.includes(normUser) && primaryTerms.includes(normResource)) return true;

  const middleTerms = ["college", "moyen"];
  if (middleTerms.includes(normUser) && middleTerms.includes(normResource)) return true;

  const secondaryTerms = ["lycee", "secondaire"];
  if (secondaryTerms.includes(normUser) && secondaryTerms.includes(normResource)) return true;

  return false;
}

// Get Teacher Employee record matching user's username or email
export const getTeacherEmployee = cache(async (user: any) => {
  if (!user) return null;
  const username = user.utilisateur || "";
  const email = user.email || "";
  
  const emp = await db.query.employees.findFirst({
    where: or(
      eq(employees.email, username),
      eq(employees.email, email)
    )
  });
  return emp || null;
});

// Get all class IDs taught by a teacher
export const getTeacherClassIds = cache(async (employeeId: number): Promise<number[]> => {
  const subjects = await db.select({ classId: classSubjects.classId })
    .from(classSubjects)
    .where(eq(classSubjects.employeeId, employeeId));
  
  return subjects
    .map(s => s.classId)
    .filter((id): id is number => id !== null);
});

// Verify teacher access to a specific class
export async function verifyTeacherClassAccess(user: any, classId: number): Promise<boolean> {
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "general_director") {
    return true;
  }
  
  if (roleType === "level_director") {
    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true }
    });
    if (!cls?.section?.educationalLevel) return true;
    return checkEducationalLevelAccess(user, cls.section.educationalLevel);
  }
  
  if (roleType === "teacher") {
    const emp = await getTeacherEmployee(user);
    if (!emp) return false;
    const classIds = await getTeacherClassIds(emp.id);
    return classIds.includes(classId);
  }
  
  return false;
}

// Verify teacher access to a specific class and subject
export async function verifyTeacherClassSubjectAccess(user: any, classId: number, subjectId: number): Promise<boolean> {
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "general_director") {
    return true;
  }
  
  if (roleType === "level_director") {
    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true }
    });
    if (!cls?.section?.educationalLevel) return true;
    return checkEducationalLevelAccess(user, cls.section.educationalLevel);
  }
  
  if (roleType === "teacher") {
    const emp = await getTeacherEmployee(user);
    if (!emp) return false;
    
    const assignment = await db.query.classSubjects.findFirst({
      where: and(
        eq(classSubjects.classId, classId),
        eq(classSubjects.subjectId, subjectId),
        eq(classSubjects.employeeId, emp.id)
      )
    });
    
    return !!assignment;
  }
  
  return false;
}

/**
 * Enforces educational level access at the routing/page level.
 * Redirects to dashboard if the user is unauthorized.
 */
export async function enforceLevelAccess(resourceLevel: string | null | undefined) {
  const { getCurrentUser } = await import("./session");
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  
  if (!checkEducationalLevelAccess(user, resourceLevel)) {
    redirect("/dashboard?error=unauthorized_level");
  }
}
