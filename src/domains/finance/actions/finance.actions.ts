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
      where: (fees, { and, eq }) => {
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

    // ── DEDUP GUARD: if duplicates exist in DB, keep the row with highest totalPaid ──
    const seenStudents = new Map<number, typeof data[0]>();
    for (const row of data) {
      if (!row.studentId) continue;
      const existing = seenStudents.get(row.studentId);
      if (!existing || (row.totalPaid || 0) > (existing.totalPaid || 0)) {
        seenStudents.set(row.studentId, row);
      }
    }
    const dedupedData = Array.from(seenStudents.values());
    // ─────────────────────────────────────────────────────────────────────────────

    let filteredData = dedupedData;

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
    const { feeId, amount, reduction, paymentMode, reference, monthConcerned, notes, datePaid } = validation.data;
    const schoolId = await getActiveSchoolId();

    if (reference) {
      const existingPayment = await db.query.feePayments.findFirst({
        where: and(eq(feePayments.schoolId, schoolId), eq(feePayments.reference, reference)),
      });

      if (existingPayment) {
        return { success: true, id: existingPayment.id, action: "duplicate_ignored" };
      }
    }

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
    const [payment] = await db.insert(feePayments).values({
      schoolId,
      feeId,
      amount,
      reduction,
      paymentMode,
      reference,
      monthConcerned,
      datePaid: datePaid ? new Date(datePaid) : new Date(),
      recordedBy: user.nomPrenom || user.utilisateur || "Admin",
    }).returning({ id: feePayments.id });

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
    return { success: true, id: payment?.id };
  });
}

export async function deleteStudentFee(id: number) {
  return protectedDbAction("Finance", "canDelete", async (user) => {
    const roleType = await getUserRoleType(user);
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

    // ────────────────────────────────────────────────────────────────────────────
    // DEDUP PASS: remove duplicate (student_id, session_id) rows before processing
    // A duplicate is any row that is NOT the canonical row (highest totalPaid, lowest id)
    // ────────────────────────────────────────────────────────────────────────────
    try {
      await db.execute(sql`
        DELETE FROM student_fees
        WHERE school_id = ${schoolId}
          AND session_id = ${activeSession.id}
          AND id NOT IN (
            SELECT DISTINCT ON (student_id, session_id) id
            FROM student_fees
            WHERE school_id = ${schoolId} AND session_id = ${activeSession.id}
            ORDER BY student_id, session_id, total_paid DESC NULLS LAST, id ASC
          )
      `);
    } catch (dedupErr) {
      console.warn("[syncStudentFees] Dedup pass failed (non-fatal):", dedupErr);
    }
    // ────────────────────────────────────────────────────────────────────────────

    const existingFees = await db.query.studentFees.findMany({
      where: and(eq(studentFees.sessionId, activeSession.id), eq(studentFees.schoolId, schoolId))
    });
    const feeMap = new Map(existingFees.map(f => [f.studentId, f]));

    const toInsert = [];
    const toUpdate = [];

    // Fetch all actual payments for the current session fees in one query
    const existingFeeIds = existingFees.map(f => f.id);
    let paymentsMap = new Map<number, { totalPaid: number; totalReduction: number }>();

    if (existingFeeIds.length > 0) {
      const paymentRows = await db.query.feePayments.findMany({
        where: (p, { inArray }) => inArray(p.feeId, existingFeeIds),
        columns: { feeId: true, amount: true, reduction: true },
      });

      for (const p of paymentRows) {
        const fid = p.feeId!;
        if (!paymentsMap.has(fid)) paymentsMap.set(fid, { totalPaid: 0, totalReduction: 0 });
        const entry = paymentsMap.get(fid)!;
        entry.totalPaid += Number(p.amount || 0);
        entry.totalReduction += Number(p.reduction || 0);
      }
    }

    for (const s of allStudents) {
      const monthly = Number(s.fraisMensuels || 0);
      const inscr = Number(s.fraisInscription || 0);
      const oldBal = Number(s.ancienSolde || 0);
      const cogesCard = Number(s.fraisCogesCard || 0);
      const transpInternat = Number(s.fraisTransportInternat || 0);
      const expected = inscr + oldBal + cogesCard + transpInternat + monthly;

      const existing = feeMap.get(s.id);

      if (existing) {
        // Re-aggregate from actual payment rows to prevent stale/zero values
        const actualPayments = paymentsMap.get(existing.id) || { totalPaid: 0, totalReduction: 0 };
        const realPaid = actualPayments.totalPaid;
        const realReduction = actualPayments.totalReduction;
        const realBalance = expected - realPaid - realReduction;
        const realStatus = realBalance <= 0 ? "Soldé" : realPaid > 0 ? "Partiel" : "Impayé";

        // Update if expected changed OR if stored totals are out of sync with actual payments
        const paidDrift = Math.abs((existing.totalPaid || 0) - realPaid) > 0.01;
        const reductionDrift = Math.abs((existing.totalReduction || 0) - realReduction) > 0.01;
        const expectedChanged = existing.totalExpected !== expected;

        if (expectedChanged || paidDrift || reductionDrift) {
          toUpdate.push({
            id: existing.id,
            totalExpected: expected,
            totalPaid: realPaid,
            totalReduction: realReduction,
            balance: realBalance,
            status: realStatus,
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
              totalPaid: item.totalPaid,
              totalReduction: item.totalReduction,
              balance: item.balance,
              status: item.status,
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


/**
 * repairStudentFeeTotals
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-phase repair:
 *   Phase 1 — Remove duplicate (student_id, session_id) rows keeping the one
 *              with the highest totalPaid.  This fixes the "multiplied amounts"
 *              bug caused by missing UNIQUE constraint on student_fees.
 *   Phase 2 — Re-aggregate every fee_payments row and write the correct
 *              totalPaid / totalReduction / balance / status into every record.
 */
export async function repairStudentFeeTotals() {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();

    const activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and }) => and(
        eq(s.schoolId, schoolId),
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: [desc(schoolSessions.id)]
    });

    if (!activeSession) return { error: "Aucune session active trouvée." };

    // ── Phase 1: Remove duplicate rows ─────────────────────────────────────
    let duplicatesRemoved = 0;
    try {
      const result = await db.execute(sql`
        DELETE FROM student_fees
        WHERE school_id = ${schoolId}
          AND session_id = ${activeSession.id}
          AND id NOT IN (
            SELECT DISTINCT ON (student_id, session_id) id
            FROM student_fees
            WHERE school_id = ${schoolId} AND session_id = ${activeSession.id}
            ORDER BY student_id, session_id, total_paid DESC NULLS LAST, id ASC
          )
      `);
      duplicatesRemoved = (result as any)?.rowCount ?? 0;
      console.log(`[repairStudentFeeTotals] Phase 1: removed ${duplicatesRemoved} duplicate row(s).`);
    } catch (e) {
      console.warn("[repairStudentFeeTotals] Phase 1 dedup failed:", e);
    }


    // Load all fee rows for this session
    const allFees = await db.query.studentFees.findMany({
      where: and(eq(studentFees.sessionId, activeSession.id), eq(studentFees.schoolId, schoolId)),
    });

    if (allFees.length === 0) return { success: true, repaired: 0 };

    const feeIds = allFees.map(f => f.id);

    // Aggregate payments per fee
    const paymentRows = await db.query.feePayments.findMany({
      where: (p, { inArray }) => inArray(p.feeId, feeIds),
      columns: { feeId: true, amount: true, reduction: true },
    });

    const paymentsMap = new Map<number, { totalPaid: number; totalReduction: number }>();
    for (const p of paymentRows) {
      const fid = p.feeId!;
      if (!paymentsMap.has(fid)) paymentsMap.set(fid, { totalPaid: 0, totalReduction: 0 });
      const entry = paymentsMap.get(fid)!;
      entry.totalPaid += Number(p.amount || 0);
      entry.totalReduction += Number(p.reduction || 0);
    }

    // Build update list for any fee whose stored values differ from aggregated
    const repairs: Array<{
      id: number; totalPaid: number; totalReduction: number; balance: number; status: string;
    }> = [];

    for (const fee of allFees) {
      const agg = paymentsMap.get(fee.id) || { totalPaid: 0, totalReduction: 0 };
      const realPaid = agg.totalPaid;
      const realReduction = agg.totalReduction;
      const realBalance = (fee.totalExpected || 0) - realPaid - realReduction;
      const realStatus = realBalance <= 0 ? "Soldé" : realPaid > 0 ? "Partiel" : "Impayé";

      const paidDrift = Math.abs((fee.totalPaid || 0) - realPaid) > 0.01;
      const reductDrift = Math.abs((fee.totalReduction || 0) - realReduction) > 0.01;

      if (paidDrift || reductDrift) {
        repairs.push({ id: fee.id, totalPaid: realPaid, totalReduction: realReduction, balance: realBalance, status: realStatus });
      }
    }

    // Apply in chunks of 50
    for (let i = 0; i < repairs.length; i += 50) {
      const chunk = repairs.slice(i, i + 50);
      await Promise.all(chunk.map(r =>
        db.update(studentFees)
          .set({ totalPaid: r.totalPaid, totalReduction: r.totalReduction, balance: r.balance, status: r.status })
          .where(eq(studentFees.id, r.id))
      ));
    }

    revalidatePath("/dashboard/finance");
    console.log(`[repairStudentFeeTotals] Phase 1: ${duplicatesRemoved} duplicates removed. Phase 2: ${repairs.length} records re-aggregated.`);
    return { success: true, repaired: repairs.length, duplicatesRemoved };

  });
}

export async function getFinanceStats() {
  return protectedDbAction("Finance", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
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

export async function getAdvancedFinanceStats() {
  return protectedDbAction("Finance", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    const schoolId = await getActiveSchoolId();
    const activeLevel = await getActiveEducationalLevel(user);

    const activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and }) => and(
        eq(s.schoolId, schoolId),
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: [desc(schoolSessions.id)]
    });

    if (!activeSession) {
      return { data: null };
    }

    // Base where clause for student fees
    let feesWhere = and(eq(studentFees.sessionId, activeSession.id), eq(studentFees.schoolId, schoolId));

    // Level director isolation
    const needsJoin = roleType === "level_director" && !!activeLevel;

    // Get all fees with payments for this session
    const allFees = await db.query.studentFees.findMany({
      where: feesWhere,
      with: {
        student: true,
        payments: { orderBy: [desc(feePayments.datePaid)] }
      }
    });

    // Filter by level director if needed
    let fees = allFees;
    if (needsJoin && activeLevel) {
      const compatibleLevels = getCompatibleLevels(activeLevel).map(l => l.toLowerCase());
      fees = fees.filter(f => f.student?.educationalLevel && compatibleLevels.includes(f.student.educationalLevel.toLowerCase()));
    }

    // 1. Core financials
    const totalExpected = fees.reduce((s, f) => s + (f.totalExpected || 0), 0);
    const totalPaid = fees.reduce((s, f) => s + (f.totalPaid || 0), 0);
    const totalDebts = fees.reduce((s, f) => s + Math.max(0, f.balance || 0), 0);
    const totalReductions = fees.reduce((s, f) => s + (f.totalReduction || 0), 0);

    // 2. Counts
    const countPaid = fees.filter(f => f.status === "Soldé").length;
    const countPartial = fees.filter(f => f.status === "Partiel").length;
    const countUnpaid = fees.filter(f => f.status === "Impayé").length;
    const totalStudents = fees.length;

    // 3. Recovery rate
    const recoveryRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    // 4. All payments flat list for temporal stats
    const allPayments = fees.flatMap(f => f.payments || []);
    const totalPaymentsCount = allPayments.length;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const revenueToday = allPayments
      .filter(p => p.datePaid && new Date(p.datePaid) >= todayStart)
      .reduce((s, p) => s + (p.amount || 0), 0);

    const revenueWeek = allPayments
      .filter(p => p.datePaid && new Date(p.datePaid) >= weekStart)
      .reduce((s, p) => s + (p.amount || 0), 0);

    const revenueMonth = allPayments
      .filter(p => p.datePaid && new Date(p.datePaid) >= monthStart)
      .reduce((s, p) => s + (p.amount || 0), 0);

    const revenueYear = allPayments
      .filter(p => p.datePaid && new Date(p.datePaid) >= yearStart)
      .reduce((s, p) => s + (p.amount || 0), 0);

    // 5. Monthly breakdown for charts (school year: Sep to Jun)
    const schoolMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // Sept=8 ... Jun=5
    const monthNames = ["Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin"];
    // For school year: Sept-Dec belong to current year (if now >= Sept) or previous year
    const isAfterAug = now.getMonth() >= 8;
    const schoolYearStartYear = isAfterAug ? now.getFullYear() : now.getFullYear() - 1;
    const monthlyData = schoolMonths.map((m, i) => {
      // Sept(8)-Dec(11) = schoolYearStartYear, Jan(0)-Jun(5) = schoolYearStartYear + 1
      const targetYear = m >= 8 ? schoolYearStartYear : schoolYearStartYear + 1;
      const monthPayments = allPayments.filter(p => {
        if (!p.datePaid) return false;
        const d = new Date(p.datePaid);
        return d.getMonth() === m && d.getFullYear() === targetYear;
      });
      return {
        month: monthNames[i],
        amount: monthPayments.reduce((s, p) => s + (p.amount || 0), 0),
        count: monthPayments.length
      };
    });

    // 6. Class breakdown for reports
    const classMap = new Map<string, { expected: number; paid: number; unpaid: number; count: number }>();
    for (const fee of fees) {
      const cls = fee.student?.classe || "Inconnue";
      if (!classMap.has(cls)) classMap.set(cls, { expected: 0, paid: 0, unpaid: 0, count: 0 });
      const entry = classMap.get(cls)!;
      entry.expected += fee.totalExpected || 0;
      entry.paid += fee.totalPaid || 0;
      entry.unpaid += Math.max(0, fee.balance || 0);
      entry.count += 1;
    }
    const classSummary = Array.from(classMap.entries())
      .map(([className, data]) => ({ className, ...data, rate: data.expected > 0 ? Math.round((data.paid / data.expected) * 100) : 0 }))
      .sort((a, b) => b.paid - a.paid);

    // 7. Unpaid alerts (balance > 0, sorted by balance desc)
    const unpaidAlerts = fees
      .filter(f => (f.balance || 0) > 0)
      .map(f => ({
        id: f.id,
        studentName: f.student?.nomEtudiant || "Inconnu",
        classe: f.student?.classe || "-",
        photoPath: f.student?.photoPath,
        balance: f.balance || 0,
        totalExpected: f.totalExpected || 0,
        totalPaid: f.totalPaid || 0,
        status: f.status,
        lastPayment: f.payments?.[0]?.datePaid
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 50);

    return {
      data: {
        // Core
        totalExpected,
        totalPaid,
        totalDebts,
        totalReductions,
        currentBalance: totalPaid - totalReductions,
        // Rates
        recoveryRate,
        totalPaymentsCount,
        countPaid,
        countPartial,
        countUnpaid,
        totalStudents,
        // Temporal
        revenueToday,
        revenueWeek,
        revenueMonth,
        revenueYear,
        // Charts
        monthlyData,
        classSummary,
        // Alerts
        unpaidAlerts,
      }
    };
  });
}
