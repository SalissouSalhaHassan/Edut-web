import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, and, or, ilike } from "drizzle-orm";

export async function getParentChildrenIds(user: any): Promise<number[]> {
  const currentStudentId = user?.studentId || (user as any)?.student_id;
  if (!currentStudentId) return [];

  const primaryChild = await readDb.query.students.findFirst({
    where: eq(students.id, Number(currentStudentId)),
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
      user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
      or(...cond)
    ),
    columns: { id: true },
  });

  return siblings.map((s) => s.id);
}

export async function verifyParentChildRelationship(user: any, studentId: number): Promise<boolean> {
  const currentStudentId = user?.studentId || (user as any)?.student_id;
  if (currentStudentId && Number(currentStudentId) === Number(studentId)) {
    return true;
  }

  // Admin, director, or staff bypass
  if (user?.admin || user?.superAdmin) {
    return true;
  }

  // Check if student matches user's login username, admission number, or email
  const cleanUser = String(user?.utilisateur || "").trim();
  const login = cleanUser.includes("@") ? cleanUser.split("@")[0] : cleanUser;

  if (cleanUser || login) {
    const student = await readDb.query.students.findFirst({
      where: and(
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
        or(
          eq(students.id, studentId),
          eq(students.numAdmission, cleanUser),
          eq(students.numAdmission, cleanUser.toUpperCase()),
          eq(students.numAdmission, cleanUser.toLowerCase()),
          eq(students.numAdmission, login),
          eq(students.numAdmission, login.toUpperCase()),
          eq(students.numAdmission, login.toLowerCase()),
          ilike(students.numAdmission, cleanUser),
          ilike(students.numAdmission, login)
        )
      ),
      columns: { id: true },
    });

    if (student && student.id === studentId) {
      // Auto-heal studentId link in users table if missing
      if (!currentStudentId && user.id) {
        try {
          await db.update(users).set({ studentId: student.id }).where(eq(users.id, user.id));
        } catch (_) {}
      }
      return true;
    }
  }

  const allowedIds = await getParentChildrenIds(user);
  return allowedIds.includes(studentId);
}
