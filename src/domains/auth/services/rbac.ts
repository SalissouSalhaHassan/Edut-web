import { db } from "@/infrastructure/database";
import { rolePermissions, users, roles } from "@/infrastructure/database/schema/auth";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { classSubjects } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { students } from "@/infrastructure/database/schema/students";
import { eq, sql, or, and } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type PermissionAction = "canView" | "canEdit" | "canDelete";

export type UserRoleType = 
  | "super_admin" 
  | "general_director"
  | "level_director"
  | "level_comptable"    // Comptable assigned to a specific level
  | "level_caissier"    // Caissier assigned to a specific level
  | "teacher"
  | "ministere"
  | "dren"
  | "dden"
  | "inspection"
  | "directeur"
  | "censeur"
  | "surveillant"
  | "comptable"
  | "caissier"
  | "enseignant"
  | "eleve"
  | "parent"
  | "consultation"
  | "regular_user";

const GLOBAL_LEVEL_TERMS = [
  "tous",
  "all",
  "tous les niveaux",
  "toutes les etapes",
  "tous les cycles",
  "\u0627\u0644\u0643\u0644",
  "\u0643\u0644",
  "\u062c\u0645\u064a\u0639",
  "\u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062a",
];

const PRIMARY_LEVEL_TERMS = [
  "primaire",
  "maternelle",
  "elementaire",
  "\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
  "\u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a",
  "\u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0647",
];

const MIDDLE_LEVEL_TERMS = [
  "college",
  "moyen",
  "middle",
  "cem",
  "college general",
  "college_general",
  "premier cycle",
  "premier_cycle",
  "\u0627\u0639\u062f\u0627\u062f\u064a",
  "\u0627\u0639\u062f\u0627\u062f\u064a\u0647",
  "\u0627\u0644\u0627\u0639\u062f\u0627\u062f\u064a",
  "\u0627\u0644\u0627\u0639\u062f\u0627\u062f\u064a\u0647",
  "\u0645\u062a\u0648\u0633\u0637",
  "\u0627\u0644\u0645\u062a\u0648\u0633\u0637",
  "\u0645\u062a\u0648\u0633\u0637\u0647",
  "\u0627\u0644\u0645\u062a\u0648\u0633\u0637\u0647",
];

const SECONDARY_LEVEL_TERMS = [
  "lycee",
  "secondaire",
  "high school",
  "second cycle",
  "second_cycle",
  "\u062b\u0627\u0646\u0648\u064a",
  "\u062b\u0627\u0646\u0648\u064a\u0647",
  "\u0627\u0644\u062b\u0627\u0646\u0648\u064a",
  "\u0627\u0644\u062b\u0627\u0646\u0648\u064a\u0647",
];

const UNIVERSITY_LEVEL_TERMS = [
  "university",
  "universite",
  "licence",
  "master",
  "doctorat",
  "superieur",
  "\u062c\u0627\u0645\u0639\u0647",
  "\u0627\u0644\u062c\u0627\u0645\u0639\u0647",
  "\u062c\u0627\u0645\u0639\u064a",
  "\u0639\u0627\u0644\u064a",
];

type EducationalLevelFamily = "primary" | "middle" | "secondary" | "university";

function getEducationalLevelFamily(level: string | null | undefined): EducationalLevelFamily | null {
  const norm = normalizeLevel(level || "");
  if (!norm) return null;
  if (PRIMARY_LEVEL_TERMS.includes(norm)) return "primary";
  if (MIDDLE_LEVEL_TERMS.includes(norm)) return "middle";
  if (SECONDARY_LEVEL_TERMS.includes(norm)) return "secondary";
  if (UNIVERSITY_LEVEL_TERMS.includes(norm)) return "university";
  return null;
}

// Classify user role type
export const getUserRoleType = cache(async (user: any): Promise<UserRoleType> => {
  if (!user) return "regular_user";
  if (user.superAdmin === true || user.superAdmin === 1) return "super_admin";
  
  if (user.studentId || user.student_id) return "eleve";
  
  let roleName = user.role?.roleName;
  if (!roleName && user.roleId) {
    const r = await db.query.roles.findFirst({ where: eq(roles.id, user.roleId) });
    roleName = r?.roleName;
  }
  
  const norm = (roleName || "").toLowerCase().trim();
  if (norm.includes("super_admin") || norm.includes("super admin")) return "super_admin";
  if (norm.includes("ministere") || norm.includes("ministère")) return "ministere";
  if (norm.includes("dren")) return "dren";
  if (norm.includes("dden")) return "dden";
  if (norm.includes("inspection")) return "inspection";
  const hasRestrictedLevel = !hasAllEducationalLevels(user.educationalLevel);
  if (norm.includes("directeur") || norm.includes("dirigeant") || norm.includes("\u0645\u062f\u064a\u0631")) {
    if (hasRestrictedLevel) {
      return "level_director";
    }
    return "directeur";
  }
  if (norm.includes("censeur")) return "censeur";
  if (norm.includes("surveillant")) return "surveillant";
  if (norm.includes("comptable")) {
    // Comptable with a specific level (not Tous) → level-scoped: sees only finance for their level
    if (hasRestrictedLevel) return "level_comptable";
    return "comptable";
  }
  if (norm.includes("caissier")) {
    // Caissier with a specific level (not Tous) → level-scoped: sees only finance for their level
    if (hasRestrictedLevel) return "level_caissier";
    return "caissier";
  }
  if (norm.includes("enseignant") || norm.includes("professeur") || norm.includes("teacher")) return "teacher";
  if (norm.includes("eleve") || norm.includes("etudiant") || norm.includes("student")) return "eleve";
  if (norm.includes("parent") || norm.includes("tuteur")) return "parent";
  if (norm.includes("consultation") || norm.includes("viewer")) return "consultation";

  if (user.employeeId || user.employee_id) return "teacher";

  // Legacy compatibility check
  const isAdmin = user.admin === true;

  if (isAdmin) {
    if (hasRestrictedLevel) {
      return "level_director";
    }
    return "general_director";
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
  const modLower = moduleName.toLowerCase().trim();

  // 1. Super Admin: full access to everything
  if (roleType === "super_admin") return true;

  // 2. Ministère: full view/edit/delete access for all modules (national scope)
  if (roleType === "ministere") return true;

  // 3. DREN (Regional): sees all except security. Can only edit canevas & reports.
  if (roleType === "dren") {
    if (modLower === "security") return false;
    if (action === "canView") return true;
    return ["canevas", "reports"].includes(modLower);
  }

  // 4. DDEN (Departmental): same as DREN
  if (roleType === "dden") {
    if (modLower === "security") return false;
    if (action === "canView") return true;
    return ["canevas", "reports"].includes(modLower);
  }

  // 5. Inspection: sees all in its schools except finance and security. Can only edit canevas/reports.
  if (roleType === "inspection") {
    if (["finance", "security"].includes(modLower)) return false;
    if (action === "canView") return true;
    return ["canevas", "reports"].includes(modLower);
  }

  // 6. Directeur / General Director / Level Director: full access to school modules including Security/Users
  if (roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    return true;
  }

  // 7. Censeur: academics, HR, attendance, discipline, pedagogy, lms. No finance/security.
  if (roleType === "censeur") {
    const isAllowed = ["pedagogie", "pedagogy", "academics", "hr", "attendance", "discipline", "students", "lms"].includes(modLower);
    if (!isAllowed) return false;
    return true;
  }

  // 8. Surveillant: attendance, discipline, students. Students is read-only.
  if (roleType === "surveillant") {
    const isAllowed = ["attendance", "discipline", "students"].includes(modLower);
    if (!isAllowed) return false;
    if (modLower === "students" && action !== "canView") return false;
    return true;
  }

  // 9. Comptable: finance and coges only
  if (roleType === "comptable" || roleType === "level_comptable") {
    return ["finance", "coges"].includes(modLower);
  }

  // 10. Caissier: finance payments only. No edit/delete of configs.
  if (roleType === "caissier" || roleType === "level_caissier") {
    if (modLower !== "finance") return false;
    return action === "canView" || action === "canEdit";
  }

  // 11. Enseignant / Teacher: pedagogy, academics, attendance, lms. Read/write for classes.
  if (roleType === "enseignant" || roleType === "teacher") {
    return ["pedagogie", "pedagogy", "academics", "attendance", "lms", "library"].includes(modLower);
  }

  // 12. Élève: academics, homework, attendance, lms. Read-only.
  if (roleType === "eleve") {
    const isAllowed = ["academics", "homework", "devoirs", "attendance", "lms", "library"].includes(modLower);
    if (!isAllowed) return false;
    return action === "canView";
  }

  // 13. Parent: academics, homework, attendance, lms. Read-only.
  if (roleType === "parent") {
    const isAllowed = ["academics", "homework", "devoirs", "attendance", "lms", "library"].includes(modLower);
    if (!isAllowed) return false;
    return action === "canView";
  }

  // 14. Consultation: read-only access for permitted modules
  if (roleType === "consultation") {
    return action === "canView";
  }

  // Fallback to database-configured role permissions
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

// ─── HIERARCHICAL ACCESS CONTROL CHECKS (RECORD-LEVEL) ───

function normalizeScopeValue(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function scopeEquals(userValue: string | null | undefined, resourceValue: string | null | undefined): boolean {
  const resource = normalizeScopeValue(resourceValue);
  if (!resource) return true;
  const userScope = normalizeScopeValue(userValue);
  return Boolean(userScope) && userScope === resource;
}

type ScopedUser = {
  region?: string | null;
  departement?: string | null;
  department?: string | null;
  inspection?: string | null;
  emplacement?: string | null;
};

function getUserScopeValue(user: ScopedUser, keys: Array<keyof ScopedUser>): string {
  for (const key of keys) {
    const value = user?.[key];
    if (normalizeScopeValue(value)) return String(value);
  }
  return "";
}

export async function verifyRegionAccess(user: any, regionName: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  return scopeEquals(getUserScopeValue(user, ["region", "emplacement"]), regionName);
}

export async function verifyDepartmentAccess(user: any, region: string | null | undefined, department: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  // Check region scope first
  if (!await verifyRegionAccess(user, region)) return false;
  if (roleType === "dren") return true; // DREN sees everything in region

  return scopeEquals(getUserScopeValue(user, ["departement", "department", "emplacement"]), department);
}

export async function verifyInspectionAccess(user: any, region: string | null | undefined, department: string | null | undefined, inspection: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  // Check department scope first
  if (!await verifyDepartmentAccess(user, region, department)) return false;
  if (roleType === "dren" || roleType === "dden") return true; // DREN/DDEN sees everything in department

  return scopeEquals(getUserScopeValue(user, ["inspection", "emplacement"]), inspection);
}

export async function verifySchoolAccess(user: any, schoolId: string | null | undefined): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere") return true;

  if (!schoolId) return true;

  if (roleType === "dren" || roleType === "dden" || roleType === "inspection") {
    const numericSchoolId = Number(schoolId);
    if (!Number.isInteger(numericSchoolId)) return false;

    const branch = await db.query.schoolBranches.findFirst({
      where: eq(schoolBranches.schoolId, numericSchoolId),
      orderBy: [schoolBranches.createdAt],
    });

    if (!branch) return false;

    const region = branch.region || branch.dren;
    const department = branch.department || branch.dden;

    if (roleType === "dren") {
      return await verifyRegionAccess(user, region);
    }

    if (roleType === "dden") {
      return await verifyDepartmentAccess(user, region, department);
    }

    return await verifyInspectionAccess(user, region, department, branch.inspection);
  }

  return String(user.schoolId) === String(schoolId);
}

export async function verifyStudentAccess(user: any, studentId: string | number): Promise<boolean> {
  if (!user) return false;
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere" || roleType === "dren" || roleType === "dden" || roleType === "inspection") return true;

  if (roleType === "directeur" || roleType === "censeur" || roleType === "surveillant" ||
      roleType === "comptable" || roleType === "caissier" ||
      roleType === "level_comptable" || roleType === "level_caissier") {
    return true; // Subject to schoolId and level matching in database query
  }

  if (roleType === "eleve") {
    return String(user.studentId || user.id) === String(studentId);
  }

  if (roleType === "parent") {
    if (!user.studentId || String(user.studentId) !== String(studentId)) {
      return false;
    }

    if (!user.schoolId) {
      return true;
    }

    const child = await db.query.students.findFirst({
      where: and(
        eq(students.id, Number(studentId)),
        eq(students.schoolId, user.schoolId)
      ),
      columns: { id: true },
    });

    return Boolean(child);
  }

  return false;
}

export async function verifyClassAccess(user: any, classId: number): Promise<boolean> {
  const roleType = await getUserRoleType(user);
  if (roleType === "super_admin" || roleType === "ministere" || roleType === "dren" || roleType === "dden" || roleType === "inspection" || roleType === "directeur" || roleType === "censeur") {
    return true;
  }
  
  if (roleType === "teacher" || roleType === "enseignant") {
    const emp = await getTeacherEmployee(user);
    if (!emp) return false;
    const classIds = await getTeacherClassIds(emp.id);
    return classIds.includes(classId);
  }
  
  return false;
}

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
  if (roleType === "super_admin" || roleType === "directeur" || roleType === "ministere") return true;

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
  return String(level || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseEducationalLevels(level: string | null | undefined): string[] {
  if (!level) return [];
  return level.split(",").map((item) => item.trim()).filter(Boolean);
}

export function hasAllEducationalLevels(level: string | null | undefined): boolean {
  const levels = parseEducationalLevels(level);
  return levels.length === 0 || levels.some((item) => {
    const norm = normalizeLevel(item);
    return GLOBAL_LEVEL_TERMS.includes(norm);
  });
}

export function getCompatibleLevels(level: string): string[] {
  const selectedLevels = parseEducationalLevels(level);
  if (selectedLevels.length > 1) {
    return Array.from(new Set(selectedLevels.flatMap((item) => getCompatibleLevels(item))));
  }

  const family = getEducationalLevelFamily(level);
  if (family === "primary") {
    return Array.from(new Set(["Primaire", "Maternelle", "primaire", "maternelle", "Elémentaire", "elementaire", "ابتدائي", "الابتدائي", "Tous", "All", "tous", "all", ""]));
  }
  if (family === "middle") {
    return Array.from(new Set(["Collège", "College", "collège", "college", "Moyen", "moyen", "Collège Général", "college general", "Premier Cycle", "premier cycle", "إعدادي", "الإعدادية", "اعدادي", "متوسط", "المتوسط", "Tous", "All", "tous", "all", ""]));
  }
  if (family === "secondary") {
    return Array.from(new Set(["Lycée", "Lycee", "lycée", "lycee", "Secondaire", "secondaire", "Second Cycle", "second cycle", "ثانوي", "الثانوية", "Tous", "All", "tous", "all", ""]));
  }
  if (family === "university") {
    return Array.from(new Set(["Université", "Universite", "Licence", "Master", "université", "universite", "licence", "master", "Supérieur", "superieur", "جامعة", "جامعي", "عالي", "Tous", "All", "tous", "all", ""]));
  }

  const norm = normalizeLevel(level);
  let baseLevels: string[] = [];
  
  if (norm === "primaire" || norm === "maternelle" || norm === "elementaire") {
    baseLevels = ["Primaire", "Maternelle", "primaire", "maternelle", "Elémentaire", "elementaire"];
  } else if (norm === "college" || norm === "moyen" || norm === "college general" || norm === "premier cycle") {
    baseLevels = ["Collège", "College", "collège", "college", "Moyen", "moyen", "Collège Général", "college general", "Premier Cycle", "premier cycle"];
  } else if (norm === "lycee" || norm === "secondaire" || norm === "second cycle") {
    baseLevels = ["Lycée", "Lycee", "lycée", "lycee", "Secondaire", "secondaire", "Second Cycle", "second cycle"];
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
  const isAdminUser = roleType === "super_admin" || roleType === "directeur" || roleType === "general_director" || roleType === "level_director" || roleType === "ministere";
  
  if (!isAdminUser) {
    return user.educationalLevel || "Primaire";
  }
  
  // Admin/Manager: check selected branch cookie
  try {
    const cookieStore = await cookies();
    const selectedBranchId = cookieStore.get("selected_branch_id")?.value;
    if (selectedBranchId && selectedBranchId !== "all" && !isNaN(parseInt(selectedBranchId))) {
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

  // If we are a global admin and no specific branch instType was determined,
  // return the user's explicit educationalLevel or null (which means see all levels).
  if (roleType === "super_admin" || roleType === "directeur" || roleType === "general_director" || roleType === "ministere") {
    return user.educationalLevel || null;
  }
  
  return user.educationalLevel || "Primaire";
}

export function checkEducationalLevelAccess(user: any, resourceLevel: string | null | undefined): boolean {
  if (!user) return false;
  if (user.superAdmin) return true;
  
  const hasRestrictedLevel = !hasAllEducationalLevels(user.educationalLevel);
  
  if (user.admin === true && !hasRestrictedLevel) {
    return true;
  }
  
  if (!resourceLevel) return true;
  
  const normResource = normalizeLevel(resourceLevel);
  
  if (GLOBAL_LEVEL_TERMS.includes(normResource) || normResource === "") return true;
  const userLevels = parseEducationalLevels(user.educationalLevel);
  if (userLevels.some((level) => normalizeLevel(level) === normResource)) return true;

  const resourceFamily = getEducationalLevelFamily(resourceLevel);
  if (resourceFamily && userLevels.some((level) => getEducationalLevelFamily(level) === resourceFamily)) {
    return true;
  }
  
  const universityTerms = ["university", "universite", "licence", "master", "doctorat", "superieur"];
  const primaryTerms = ["primaire", "maternelle", "elementaire"];
  const middleTerms = ["college", "moyen"];
  const secondaryTerms = ["lycee", "secondaire"];
  return userLevels.some((level) => {
    const normUser = normalizeLevel(level);
    if (universityTerms.includes(normUser) && universityTerms.includes(normResource)) return true;
    if (primaryTerms.includes(normUser) && primaryTerms.includes(normResource)) return true;
    if (middleTerms.includes(normUser) && middleTerms.includes(normResource)) return true;
    if (secondaryTerms.includes(normUser) && secondaryTerms.includes(normResource)) return true;
    return false;
  });
}

// Get Teacher Employee record matching user's username or email
export const getTeacherEmployee = cache(async (user: any) => {
  if (!user) return null;
  
  // 1. Prefer explicit employeeId link if present
  if (user.employeeId) {
    const emp = await db.query.employees.findFirst({
      where: eq(employees.id, Number(user.employeeId))
    });
    if (emp) return emp;
  }
  
  // 2. Fallback to username/email matching
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
  if (roleType === "super_admin" || roleType === "ministere" || roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    return true;
  }
  
  if (roleType === "teacher" || roleType === "enseignant") {
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
  if (roleType === "super_admin" || roleType === "ministere" || roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    return true;
  }
  
  if (roleType === "teacher" || roleType === "enseignant") {
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
