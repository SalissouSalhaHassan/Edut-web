"use server";

import { db } from "@/infrastructure/database";
import { studentFees, feePayments, expenses, expenseCategories } from "@/infrastructure/database/schema/finance";
import { eq, desc, sql, and, ilike, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { paymentSchema, expenseSchema, PaymentFormData, ExpenseFormData } from "../validators/finance.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { schoolClasses, schoolSessions } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveEducationalLevel, getCompatibleLevels, getUserRoleType, checkEducationalLevelAccess } from "@/domains/auth/services/rbac";

export async function getStudentFees(params?: { search?: string, class?: string, status?: string }) {
  return protectedDbAction("Finance", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      return { data: [] };
    }

    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = await getActiveSchoolId();
    const { search, class: className, status } = params || {};

    // Get active session first
    const activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and }) => and(
        eq(s.schoolId, schoolId),
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: [desc(schoolSessions.id)]
    });

    if (!activeSession) return { data: [] };

    const data = await db.query.studentFees.findMany({
      where: (fees, { and, eq, or, ilike }) => {
        const conditions = [
          eq(fees.sessionId, activeSession.id),
          eq(fees.schoolId, schoolId)
        ];
        if (status && status !== "Tous") conditions.push(eq(fees.status, status));
        
        return and(...conditions);
      },
      with: {
        student: true,
        session: true,
        payments: {
          orderBy: [desc(feePayments.datePaid)]
        },
      }
    });

    let filteredData = data;

    if (roleType === "level_director" && activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel).map(l => l.toLowerCase());
      filteredData = filteredData.filter(item => 
        item.student && item.student.educationalLevel && 
        compatibleLevels.includes(item.student.educationalLevel.toLowerCase())
      );
    }

    if (search || (className && className !== "Toutes")) {
      const searchLower = search?.toLowerCase();
      filteredData = filteredData.filter(item => {
        const matchesSearch = !searchLower || 
          item.student?.nomEtudiant?.toLowerCase().includes(searchLower) ||
          item.student?.numAdmission?.toLowerCase().includes(searchLower);
        const matchesClass = !className || className === "Toutes" || item.student?.classe === className;
        return matchesSearch && matchesClass;
      });
    }

    return { data: filteredData };
  });
}

export async function recordPayment(formData: PaymentFormData) {
  const validation = paymentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Finance", "canEdit", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    const { feeId, amount, reduction, paymentMode, reference, monthConcerned, notes, datePaid } = validation.data;
    const schoolId = await getActiveSchoolId();

    // 1. Get current fee state
    const fee = await db.query.studentFees.findFirst({
      where: and(eq(studentFees.id, feeId), eq(studentFees.schoolId, schoolId)),
      with: { student: true }
    });

    if (!fee) throw new Error("Dossier financier introuvable.");

    // Enforce Level Director isolation
    if (roleType === "level_director") {
      if (!fee.student || !checkEducationalLevelAccess(user, fee.student.educationalLevel)) {
        return { error: "Accès refusé. Cet élève appartient à un autre secteur." };
      }
    }

    // Validation: prevent paying more than expected
    const currentPaid = (fee.totalPaid || 0);
    const currentReduc = (fee.totalReduction || 0);
    if (currentPaid + currentReduc + amount + reduction > fee.totalExpected) {
      throw new Error(`Le montant total (${amount + reduction}) dépasse le solde restant (${fee.balance}).`);
    }

    // 2. Record the payment
    await db.insert(feePayments).values({
      schoolId,
      feeId,
      amount,
      reduction,
      paymentMode,
      reference,
      monthConcerned,
      datePaid: datePaid ? new Date(datePaid) : new Date(),
      recordedBy: user.nomPrenom || user.utilisateur || "Admin",
    });

    // 3. Update the student fee totals
    const newPaid = currentPaid + amount;
    const newReduction = currentReduc + reduction;
    const newBalance = fee.totalExpected - newPaid - newReduction;
    const newStatus = newBalance <= 0 ? "Soldé" : newPaid > 0 ? "Partiel" : "Impayé";

    await db.update(studentFees)
      .set({
        totalPaid: newPaid,
        totalReduction: newReduction,
        balance: newBalance,
        status: newStatus,
      })
      .where(eq(studentFees.id, feeId));

    revalidatePath("/dashboard/finance");
    return { success: true };
  });
}

export async function deleteStudentFee(id: number) {
  return protectedDbAction("Finance", "canDelete", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    const schoolId = await getActiveSchoolId();

    if (roleType === "level_director") {
      const fee = await db.query.studentFees.findFirst({
        where: and(eq(studentFees.id, id), eq(studentFees.schoolId, schoolId)),
        with: { student: true }
      });
      if (!fee || !fee.student || !checkEducationalLevelAccess(user, fee.student.educationalLevel)) {
        return { error: "Accès refusé. Cet élève appartient à un autre secteur." };
      }
    }

    await db.delete(studentFees).where(and(eq(studentFees.id, id), eq(studentFees.schoolId, schoolId)));
    revalidatePath("/dashboard/finance");
    return { success: true };
  });
}

export async function syncStudentFees(revalidate: boolean = true) {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    const schoolId = await getActiveSchoolId();
    console.log("Starting syncStudentFees...");
    
    // Filter active students by level director's level
    let studentWhere = and(eq(students.statut, "Actif"), eq(students.schoolId, schoolId));
    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      studentWhere = and(studentWhere, inArray(students.educationalLevel, compatibleLevels)) as any;
    }

    const allStudents = await db.query.students.findMany({
      where: studentWhere
    });
    
    console.log(`Found ${allStudents.length} active students to sync.`);

    // Get current active session
    let activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and }) => and(
        eq(s.schoolId, schoolId),
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: [desc(schoolSessions.id)]
    });

    if (!activeSession) {
      console.log("No active session found, creating default...");
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const [newSession] = await db.insert(schoolSessions).values({
        schoolId,
        sessionName: `${currentYear} - ${nextYear}`,
        startDate: new Date(`${currentYear}-09-01`),
        endDate: new Date(`${nextYear}-06-30`),
        status: "Actif",
        isActive: true
      }).returning();
      activeSession = newSession;
      console.log("Default session created:", activeSession.sessionName);
    }

    if (!activeSession) return { error: "Impossible de créer ou trouver une session active." };

    const existingFees = await db.query.studentFees.findMany({
      where: and(eq(studentFees.sessionId, activeSession.id), eq(studentFees.schoolId, schoolId))
    });
    const feeMap = new Map(existingFees.map(f => [f.studentId, f]));

    const toInsert = [];
    const toUpdate = [];

    for (const s of allStudents) {
      const monthly = Number(s.fraisMensuels || 0);
      const inscr = Number(s.fraisInscription || 0);
      const oldBal = Number(s.ancienSolde || 0);
      const cogesCard = Number(s.fraisCogesCard || 0);
      const transpInternat = Number(s.fraisTransportInternat || 0);
      const expected = inscr + oldBal + cogesCard + transpInternat + (monthly * 9);

      const existing = feeMap.get(s.id);

      if (existing) {
        if (existing.totalExpected !== expected) {
          toUpdate.push({
            id: existing.id,
            totalExpected: expected,
            balance: expected - (existing.totalPaid || 0) - (existing.totalReduction || 0)
          });
        }
      } else {
        toInsert.push({
          schoolId,
          studentId: s.id,
          sessionId: activeSession.id,
          totalExpected: expected,
          totalPaid: 0,
          totalReduction: 0,
          balance: expected,
          status: "Impayé"
        });
      }
    }

    if (toInsert.length > 0) {
      await db.insert(studentFees).values(toInsert);
    }

    if (toUpdate.length > 0) {
      const chunks = [];
      for (let i = 0; i < toUpdate.length; i += 50) {
        chunks.push(toUpdate.slice(i, i + 50));
      }
      
      for (const chunk of chunks) {
        await Promise.all(chunk.map(item => 
          db.update(studentFees)
            .set({ 
              totalExpected: item.totalExpected,
              balance: item.balance
            })
            .where(eq(studentFees.id, item.id))
        ));
      }
    }
    
    console.log(`Sync complete. Created: ${toInsert.length}, Updated: ${toUpdate.length}`);
    if (revalidate) {
      revalidatePath("/dashboard/finance");
    }
    return { success: true };
  });
}

export async function getFinanceStats() {
  return protectedDbAction("Finance", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    if (roleType === "teacher") {
      return { data: { totalExpected: 0, totalCollected: 0, totalDebts: 0 } };
    }

    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = await getActiveSchoolId();
    
    const activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and }) => and(
        eq(s.schoolId, schoolId),
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: [desc(schoolSessions.id)]
    });

    if (!activeSession) {
      return { data: { totalExpected: 0, totalCollected: 0, totalDebts: 0 } };
    }

    let whereClause = and(eq(studentFees.sessionId, activeSession.id), eq(studentFees.schoolId, schoolId));
    
    let query = db
      .select({
        totalExpected: sql<number>`COALESCE(SUM(${studentFees.totalExpected}), 0)`,
        totalCollected: sql<number>`COALESCE(SUM(${studentFees.totalPaid}), 0)`,
        totalDebts: sql<number>`COALESCE(SUM(${studentFees.balance}), 0)`,
      })
      .from(studentFees);

    if (roleType === "level_director" && activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel);
      query = query.innerJoin(students, eq(studentFees.studentId, students.id)) as any;
      whereClause = and(whereClause, inArray(students.educationalLevel, compatibleLevels)) as any;
    }

    const stats = await query.where(whereClause);

    return { 
      data: stats[0] || { totalExpected: 0, totalCollected: 0, totalDebts: 0 } 
    };
  });
}

export async function getExpenses() {
  return protectedDbAction("Finance", "canView", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { data: [] };
    }

    let whereClause = eq(expenses.schoolId, schoolId);
    
    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      whereClause = and(whereClause, inArray(expenses.educationalLevel, compatibleLevels)) as any;
    }

    const data = await db.query.expenses.findMany({
      where: whereClause,
      with: {
        category: true
      },
      orderBy: [desc(expenses.dateExpense)]
    });
    return { data };
  });
}

export async function createExpense(formData: ExpenseFormData) {
  const validation = expenseSchema.safeParse(formData);
  if (!validation.success) return { error: validation.error.message };

  return protectedDbAction("Finance", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé" };
    }

    const expenseData: any = {
      ...validation.data,
      schoolId,
      dateExpense: new Date(validation.data.dateExpense),
    };

    if (roleType === "level_director") {
      expenseData.educationalLevel = user.educationalLevel;
    }

    await db.insert(expenses).values(expenseData);
    revalidatePath("/dashboard/finance/expenses");
    return { success: true };
  });
}
