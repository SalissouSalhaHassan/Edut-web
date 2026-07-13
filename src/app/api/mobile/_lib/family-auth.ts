import { readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, or } from "drizzle-orm";

export async function getParentChildrenIds(user: any): Promise<number[]> {
  if (!user.studentId) return [];

  const primaryChild = await readDb.query.students.findFirst({
    where: eq(students.id, user.studentId)
  });

  if (!primaryChild) return [];

  const cond = [eq(students.id, primaryChild.id)];

  if (primaryChild.cnicPere) {
    cond.push(eq(students.cnicPere, primaryChild.cnicPere));
  }
  if (primaryChild.mobile) {
    cond.push(eq(students.mobile, primaryChild.mobile));
  }
  if (primaryChild.whatsapp) {
    cond.push(eq(students.whatsapp, primaryChild.whatsapp));
  }

  const siblings = await readDb.query.students.findMany({
    where: and(
      eq(students.schoolId, user.schoolId),
      or(...cond)
    ),
    columns: { id: true }
  });

  return siblings.map((s) => s.id);
}

export async function verifyParentChildRelationship(user: any, studentId: number): Promise<boolean> {
  const allowedIds = await getParentChildrenIds(user);
  return allowedIds.includes(studentId);
}
