import { db } from "@/infrastructure/database";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType, getCompatibleLevels } from "@/domains/auth/services/rbac";
import { eq, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import ClassroomQRCodes from "./qrcodes-client";

export default async function ClassroomQRCodesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const roleType = await getUserRoleType(currentUser);
  if (roleType === "teacher") {
    redirect("/dashboard?error=unauthorized");
  }

  const schoolId = await getActiveSchoolId();

  // Load branch/school details
  const branch = await db.query.schoolBranches.findFirst({
    where: eq(schoolBranches.schoolId, schoolId),
  });

  const schoolName = branch?.branchName || "Mon École";

  // Build where clause for level directors
  let classWhere = eq(schoolClasses.schoolId, schoolId);
  
  const classes = await db.query.schoolClasses.findMany({
    where: classWhere,
    with: {
      section: true,
    },
    orderBy: (schoolClasses, { asc }) => [asc(schoolClasses.className)],
  });

  // Filter classes by level director's level access if applicable
  const filteredClasses = classes.filter((cls) => {
    if (roleType === "level_director") {
      return checkEducationalLevelAccessLocal(currentUser, cls.section?.educationalLevel);
    }
    return true;
  });

  return (
    <ClassroomQRCodes
      classes={filteredClasses}
      schoolName={schoolName}
    />
  );
}

// Local helper to avoid importing checkEducationalLevelAccess which is cached
function checkEducationalLevelAccessLocal(user: any, resourceLevel: string | null | undefined): boolean {
  if (!user) return false;
  if (user.superAdmin) return true;
  
  const hasRestrictedLevel = user.educationalLevel && user.educationalLevel !== "Tous" && user.educationalLevel !== "All" && user.educationalLevel !== "";
  if (user.admin === true && !hasRestrictedLevel) {
    return true;
  }
  
  if (!resourceLevel) return true;
  
  const normUser = (user.educationalLevel || "").toLowerCase().trim();
  const normResource = resourceLevel.toLowerCase().trim();
  
  if (normUser === normResource) return true;
  if (normResource === "tous" || normResource === "all" || normResource === "") return true;
  
  const primaryTerms = ["primaire", "maternelle", "elementaire"];
  if (primaryTerms.includes(normUser) && primaryTerms.includes(normResource)) return true;

  const middleTerms = ["college", "moyen"];
  if (middleTerms.includes(normUser) && middleTerms.includes(normResource)) return true;

  const secondaryTerms = ["lycee", "secondaire"];
  if (secondaryTerms.includes(normUser) && secondaryTerms.includes(normResource)) return true;

  return false;
}
