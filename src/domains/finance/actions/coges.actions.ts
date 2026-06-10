"use server";

import { db } from "@/infrastructure/database";
import { cogesPayments } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { desc, ilike, or, eq, and, inArray } from "drizzle-orm";
import { protectedDbAction } from "@/lib/protected-action";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { revalidatePath } from "next/cache";
import { getActiveEducationalLevel, getCompatibleLevels } from "@/domains/auth/services/rbac";

export async function createCogesPayment(data: {
  amount: number;
  amountLetters: string;
  receivedFrom: string;
  purpose: string;
  studentId?: number;
  classe?: string;
  session?: string;
}) {
  return protectedDbAction("Finance", "canEdit", async () => {
    const user = await getCurrentUser();
    const schoolId = await getActiveSchoolId();
    
    // Generate a receipt number
    const existing = await db.select().from(cogesPayments).where(eq(cogesPayments.schoolId, schoolId)).orderBy(desc(cogesPayments.id)).limit(1);
    let nextId = 1;
    if (existing && existing.length > 0) {
      nextId = existing[0].id + 1;
    }
    const receiptNumber = String(nextId).padStart(6, "0");

    let studentClasse = data.classe || null;
    if (data.studentId && !studentClasse) {
      const [student] = await db
        .select({ classe: students.classe })
        .from(students)
        .where(and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)));
      if (student) {
        studentClasse = student.classe;
      }
    }

    const [payment] = await db
      .insert(cogesPayments)
      .values({
        schoolId,
        receiptNumber,
        amount: data.amount,
        amountLetters: data.amountLetters,
        receivedFrom: data.receivedFrom,
        purpose: data.purpose,
        studentId: data.studentId,
        classe: studentClasse,
        session: data.session || "2025/2026",
        recordedBy: user?.utilisateur || "System",
      })
      .returning();

    revalidatePath("/dashboard/coges");
    return payment;
  });
}

export async function getCogesPayments() {
  return protectedDbAction("Finance", "canView", async () => {
    const user = await getCurrentUser();
    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = await getActiveSchoolId();
    
    let whereClause = eq(cogesPayments.schoolId, schoolId);
    if (activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      whereClause = and(whereClause, inArray(students.educationalLevel, compatibleLevels)) as any;
    }

    return await db
      .select({
        id: cogesPayments.id,
        receiptNumber: cogesPayments.receiptNumber,
        studentId: cogesPayments.studentId,
        classe: cogesPayments.classe,
        session: cogesPayments.session,
        amount: cogesPayments.amount,
        amountLetters: cogesPayments.amountLetters,
        receivedFrom: cogesPayments.receivedFrom,
        purpose: cogesPayments.purpose,
        datePaid: cogesPayments.datePaid,
        status: cogesPayments.status,
        recordedBy: cogesPayments.recordedBy,
        createdAt: cogesPayments.createdAt,
        studentName: students.nomEtudiant,
        studentNumAdmission: students.numAdmission,
      })
      .from(cogesPayments)
      .leftJoin(students, eq(cogesPayments.studentId, students.id))
      .where(whereClause)
      .orderBy(desc(cogesPayments.createdAt));
  });
}

export async function searchStudents(query: string) {
  return protectedDbAction("Finance", "canView", async () => {
    if (!query || query.trim().length < 2) return [];
    const user = await getCurrentUser();
    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = await getActiveSchoolId();
    const term = `%${query.trim()}%`;
    
    let conditions = [
      eq(students.schoolId, schoolId),
      or(
        ilike(students.nomEtudiant, term),
        ilike(students.numAdmission, term),
        ilike(students.nomPere, term)
      )
    ];
    
    if (activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      conditions.push(inArray(students.educationalLevel, compatibleLevels));
    }

    return await db
      .select({
        id: students.id,
        nomEtudiant: students.nomEtudiant,
        numAdmission: students.numAdmission,
        classe: students.classe,
        nomPere: students.nomPere,
        mobile: students.mobile,
      })
      .from(students)
      .where(and(...conditions))
      .limit(10);
  });
}

