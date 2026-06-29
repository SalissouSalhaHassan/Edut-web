"use server";

import { db } from "@/infrastructure/database";
import { graduationProjects } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export async function getGraduationProjects() {
  return protectedDbAction("Academics", "canView", async () => {
    const data = await db.query.graduationProjects.findMany({
      with: {
        student: true,
        supervisor: true,
        president: true,
        examiner: true
      },
      orderBy: desc(graduationProjects.id)
    });
    return { data };
  });
}

export async function saveGraduationProject(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, createdAt, ...rest } = data;
    
    // Parse numeric fields
    if (rest.studentId) rest.studentId = parseInt(rest.studentId);
    if (rest.supervisorId) rest.supervisorId = parseInt(rest.supervisorId);
    if (rest.presidentId) rest.presidentId = rest.presidentId ? parseInt(rest.presidentId) : null;
    if (rest.examinerId) rest.examinerId = rest.examinerId ? parseInt(rest.examinerId) : null;
    if (rest.grade !== undefined && rest.grade !== null) rest.grade = parseFloat(rest.grade);
    if (rest.defenseDate) rest.defenseDate = new Date(rest.defenseDate);

    if (id) {
      await db.update(graduationProjects)
        .set(rest)
        .where(eq(graduationProjects.id, id));
    } else {
      await db.insert(graduationProjects).values({
        ...rest,
        schoolId
      });
    }
    
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

export async function deleteGraduationProject(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    await db.delete(graduationProjects).where(eq(graduationProjects.id, id));
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

export async function searchStudentsForGraduation(query: string) {
  return protectedDbAction("Academics", "canView", async () => {
    if (!query || query.trim() === "") return { data: [] };
    const data = await db.query.students.findMany({
      where: or(
        ilike(students.nomEtudiant, `%${query}%`),
        ilike(students.numAdmission, `%${query}%`)
      ),
      limit: 10
    });
    return { data };
  });
}
