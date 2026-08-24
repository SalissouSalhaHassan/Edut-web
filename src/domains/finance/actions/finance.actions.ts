"use server";

import { db } from "@/infrastructure/database";
import { studentFees, feePayments, expenses, expenseCategories } from "@/infrastructure/database/schema/finance";
import { eq, desc, sql, and, ilike, or, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { paymentSchema, expenseSchema, PaymentFormData, ExpenseFormData } from "../validators/finance.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { schoolClasses, schoolSessions } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { users } from "@/infrastructure/database/schema/auth";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveEducationalLevel, getCompatibleLevels, getUserRoleType, checkEducationalLevelAccess, normalizeLevel } from "@/domains/auth/services/rbac";

export async function getStudentFees(params?: {
  search?: string;
  class?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return protectedDbAction("Finance", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    const activeLevel = await getActiveEducationalLevel(user);
    const schoolId = (await getActiveSchoolId()) || user?.schoolId || 9;
    const { search, class: className, status } = params || {};

    // Get active session first
    const activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and, isNull }) => and(
        schoolId ? or(eq(s.schoolId, schoolId), isNull(s.schoolId)) : undefined,
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: [desc(schoolSessions.id)]
    });

    const session = activeSession || await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and, isNull }) => schoolId ? or(eq(s.schoolId, schoolId), isNull(s.schoolId)) : undefined,
      orderBy: [desc(schoolSessions.id)]
    });

    let data = await db.query.studentFees.findMany({
      where: (fees, { and, eq, or, isNull }) => {
        const conditions = [
          session?.id ? eq(fees.sessionId, session.id) : undefined,
          schoolId ? or(eq(fees.schoolId, schoolId), isNull(fees.schoolId)) : undefined
        ].filter(Boolean);
        if (status && status !== "Tous") conditions.push(eq(fees.status, status));
        return and(...(conditions as any[]));
      },
      with: {
        student: {
          columns: {
            id: true,
            nomEtudiant: true,
            numAdmission: true,
            classe: true,
            educationalLevel: true,
            photoPath: true,
            sexe: true,
            statut: true,
          }
        },
        payments: {
          columns: {
            id: true,
            feeId: true,
            amount: true,
            reduction: true,
            paymentMode: true,
            reference: true,
            datePaid: true,
            recordedBy: true,
            monthConcerned: true,
          },
          orderBy: [desc(feePayments.datePaid)]
        },
      }
    });

    if (data.length === 0) {
      data = await db.query.studentFees.findMany({
        where: (fees, { and, eq, or, isNull }) => {
          return schoolId ? or(eq(fees.schoolId, schoolId), isNull(fees.schoolId)) : undefined;
        },
        with: {
          student: {
            columns: {
              id: true,
              nomEtudiant: true,
              numAdmission: true,
              classe: true,
              educationalLevel: true,
              photoPath: true,
              sexe: true,
              statut: true,
            }
          },
          payments: {
            columns: {
              id: true,
              feeId: true,
              amount: true,
              reduction: true,
              paymentMode: true,
              reference: true,
              datePaid: true,
              recordedBy: true,
              monthConcerned: true,
            },
            orderBy: [desc(feePayments.datePaid)]
          },
        }
      });
    }

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

    // Apply level isolation for level_director, level_comptable, level_caissier
    const isLevelScoped = (roleType === "level_director" || roleType === "level_comptable" || roleType === "level_caissier") && !!activeLevel;
    if (isLevelScoped) {
      // Use normalizeLevel for accent-insensitive comparison (e.g. 'Collège Général' == 'college general')
      const compatibleNorms = getCompatibleLevels(activeLevel).map(l => normalizeLevel(l));
      filteredData = filteredData.filter(item =>
        item.student && item.student.educationalLevel &&
        compatibleNorms.includes(normalizeLevel(item.student.educationalLevel))
      );
    }

    function cleanString(val?: string | null): string {
      if (!val) return "";
      return String(val)
        .replace(/\u00a0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    if (search || (className && className !== "Toutes")) {
      const searchNorm = cleanString(search).toLowerCase();
      const classNorm = cleanString(className).toLowerCase();
      filteredData = filteredData.filter(item => {
        const studentName = cleanString(item.student?.nomEtudiant).toLowerCase();
        const numAdmission = cleanString(item.student?.numAdmission).toLowerCase();
        const studentClass = cleanString(item.student?.classe).toLowerCase();
        
        const matchesSearch = !searchNorm ||
          studentName.includes(searchNorm) ||
          numAdmission.includes(searchNorm) ||
          studentClass.includes(searchNorm);
        
        const matchesClass = !classNorm || classNorm === "toutes" ||
          studentClass === classNorm ||
          (studentClass && classNorm && (studentClass.includes(classNorm) || classNorm.includes(studentClass)));

        return matchesSearch && matchesClass;
      });
    }

    const isPaginated = typeof params?.page === "number" || typeof params?.limit === "number";
    const limit = params?.limit ? Math.min(Math.max(1, params.limit), 100) : (isPaginated ? 25 : undefined);
    const page = Math.max(1, params?.page || 1);
    const offset = limit ? (page - 1) * limit : 0;

    const pagedData = limit ? filteredData.slice(offset, offset + limit) : filteredData;

    return { 
      data: pagedData,
      total: filteredData.length,
      page: isPaginated ? page : 1,
      limit: limit || filteredData.length,
      totalPages: limit ? Math.ceil(filteredData.length / limit) : 1
    };
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

    // Enforce level isolation for level_director, level_comptable, level_caissier
    const isLevelScoped = roleType === "level_director" || roleType === "level_comptable" || roleType === "level_caissier";
    if (isLevelScoped) {
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

    // 4. Create in-app notification for student & parents
    try {
      const studentInfo = fee.student;
      if (studentInfo) {
        const amountFmt = Math.round(amount).toLocaleString("fr-FR");
        const notifTitle = `💳 Paiement Reçu / إيصال دفع: ${amountFmt} CFA`;
        const notifContent = `Un versement de ${amountFmt} CFA a été enregistré pour l'élève ${studentInfo.nomEtudiant} (Reçu: ${reference || `#${payment?.id}`}). Solde restant: ${Math.round(newBalance).toLocaleString("fr-FR")} CFA.`;

        const targetUsers = await db.query.users.findMany({
          where: eq(users.studentId, studentInfo.id),
        });

        if (targetUsers.length > 0) {
          for (const u of targetUsers) {
            await db.insert(notifications).values({
              title: notifTitle,
              content: notifContent,
              type: "success",
              category: "Finance",
              userId: u.id,
              isRead: false,
            });
          }
        }
      }
    } catch (e) {
      console.warn("Payment notification error:", e);
    }

    revalidatePath("/dashboard/finance");
    return { success: true, id: payment?.id };
  });
}

export async function deleteStudentFee(id: number) {
  return protectedDbAction("Finance", "canDelete", async (user) => {
    const roleType = await getUserRoleType(user);
    const schoolId = await getActiveSchoolId();

    const isLevelScoped = roleType === "level_director" || roleType === "level_comptable" || roleType === "level_caissier";
    if (isLevelScoped) {
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

export async function cancelFeePayment(paymentId: number, reason?: string) {
  return protectedDbAction("Finance", "canDelete", async (user) => {
    const roleType = await getUserRoleType(user);
    const isAdminUser = 
      roleType === "super_admin" || 
      roleType === "directeur" || 
      roleType === "general_director" || 
      roleType === "level_director" ||
      user.admin === true || 
      user.superAdmin === true || 
      user.superAdmin === 1;

    if (!isAdminUser) {
      return { 
        error: "Accès refusé. Seuls les Administrateurs et Directeurs ont l'autorisation d'annuler un versement.", 
        success: false 
      };
    }

    const schoolId = (await getActiveSchoolId()) || user.schoolId;

    // 1. Fetch the payment record
    const payment = await db.query.feePayments.findFirst({
      where: and(
        eq(feePayments.id, paymentId),
        schoolId ? eq(feePayments.schoolId, schoolId) : undefined
      ),
    });

    if (!payment) {
      return { error: "Versement introuvable.", success: false };
    }

    // 2. Fetch associated student fee record
    const fee = await db.query.studentFees.findFirst({
      where: eq(studentFees.id, payment.feeId),
      with: { student: true }
    });

    if (!fee) {
      return { error: "Dossier financier associé introuvable.", success: false };
    }

    // 3. Recalculate totals
    const currentPaid = fee.totalPaid || 0;
    const currentReduc = fee.totalReduction || 0;
    const amountToDeduct = payment.amount || 0;
    const reductionToDeduct = payment.reduction || 0;

    const newPaid = Math.max(0, currentPaid - amountToDeduct);
    const newReduction = Math.max(0, currentReduc - reductionToDeduct);
    const newBalance = (fee.totalExpected || 0) - newPaid - newReduction;
    const newStatus = newBalance <= 0 ? "Soldé" : newPaid > 0 ? "Partiel" : "Impayé";

    // 4. Update student fee record
    await db.update(studentFees)
      .set({
        totalPaid: newPaid,
        totalReduction: newReduction,
        balance: newBalance,
        status: newStatus,
      })
      .where(eq(studentFees.id, payment.feeId));

    // 5. Delete the payment record
    await db.delete(feePayments).where(eq(feePayments.id, paymentId));

    // 6. Audit logging
    try {
      await db.insert(auditLogs).values({
        schoolId: fee.schoolId || schoolId,
        userId: user.id,
        action: "CANCEL_PAYMENT",
        tableName: "fee_payments",
        recordId: String(paymentId),
        oldData: JSON.stringify({
          paymentId: payment.id,
          amount: payment.amount,
          reference: payment.reference,
          feeId: payment.feeId,
          studentName: fee.student?.nomEtudiant,
          reason: reason || "Annulation par l'administrateur",
          cancelledBy: user.nomPrenom || user.utilisateur || "Admin",
        }),
        newData: JSON.stringify({
          newPaid,
          newBalance,
          newStatus,
        }),
      });
    } catch (auditErr) {
      console.warn("[Cancel Payment] Audit log warning:", auditErr);
    }

    revalidatePath("/dashboard/finance");
    return { 
      success: true, 
      paymentId, 
      newPaid, 
      newBalance, 
      newStatus,
      message: `Versement de ${Math.round(amountToDeduct).toLocaleString("fr-FR")} CFA annulé avec succès.` 
    };
  });
}

export async function syncStudentFees(revalidate: boolean = true) {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    const roleType = await getUserRoleType(user);
    const schoolId = await getActiveSchoolId();
    console.log("Starting syncStudentFees...");
    
    // Match active or newly registered students
    let studentWhere = and(
      or(
        eq(students.statut, "Actif"),
        isNull(students.statut),
        ilike(students.statut, "actif%"),
        eq(students.statut, "Inscrit")
      ),
      eq(students.schoolId, schoolId)
    );
    const isLevelScoped = roleType === "level_director" || roleType === "level_comptable" || roleType === "level_caissier";
    if (isLevelScoped) {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      studentWhere = and(studentWhere, inArray(students.educationalLevel, compatibleLevels)) as any;
    }

    const allStudents = await db.query.students.findMany({
      where: studentWhere
    });
    
    console.log(`Found ${allStudents.length} active/enrolled students to sync.`);

    function cleanString(val?: string | null): string {
      if (!val) return "";
      return String(val)
        .replace(/\u00a0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Pre-fetch class fee templates for fallback defaults
    const allClasses = await db.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId)
    });
    const classMapByName = new Map(allClasses.map(c => [cleanString(c.className).toLowerCase(), c]));
    const classMapById = new Map(allClasses.map(c => [c.id, c]));

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
      const sClassNorm = cleanString(s.classe).toLowerCase();
      const classObj = (s.classId ? classMapById.get(s.classId) : null) || 
                       (sClassNorm ? classMapByName.get(sClassNorm) : null);

      const monthly = Number(s.fraisMensuels || classObj?.scolariteMensuelle || 0);
      const inscr = Number(s.fraisInscription || classObj?.droitsInscription || 0);
      const oldBal = Number(s.ancienSolde || classObj?.ancienSolde || 0);
      const cogesCard = Number(s.fraisCogesCard || classObj?.cogesCarteId || 0);
      const transpInternat = Number(s.fraisTransportInternat || classObj?.transportInternat || 0);
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

    if ((roleType === "level_director" || roleType === "level_comptable" || roleType === "level_caissier") && activeLevel) {
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

export async function getExpenses(params?: {
  page?: number;
  limit?: number;
  categoryId?: number;
  search?: string;
}) {
  return protectedDbAction("Finance", "canView", async (user) => {
    const schoolId = (await getActiveSchoolId()) || user?.schoolId || 1;
    const roleType = await getUserRoleType(user);
    let whereClause = (schoolId ? or(eq(expenses.schoolId, schoolId), isNull(expenses.schoolId)) : sql`TRUE`) as any;
    
    if (roleType === "level_director") {
      const compatibleLevels = getCompatibleLevels(user.educationalLevel);
      whereClause = and(whereClause, inArray(expenses.educationalLevel, compatibleLevels)) as any;
    }

    if (params?.categoryId) {
      whereClause = and(whereClause, eq(expenses.categoryId, params.categoryId)) as any;
    }

    if (params?.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      whereClause = and(
        whereClause,
        or(
          ilike(expenses.reference, q),
          ilike(expenses.description, q),
          ilike(expenses.recordedBy, q)
        )
      ) as any;
    }

    const isPaginated = typeof params?.page === "number" || typeof params?.limit === "number";
    const limit = params?.limit ? Math.min(Math.max(1, params.limit), 100) : (isPaginated ? 25 : undefined);
    const page = Math.max(1, params?.page || 1);
    const offset = limit ? (page - 1) * limit : undefined;

    let totalCount = 0;
    if (isPaginated) {
      const countRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(expenses)
        .where(whereClause);
      totalCount = Number(countRes[0]?.count || 0);
    }

    const data = await db.query.expenses.findMany({
      where: whereClause,
      with: {
        category: true
      },
      orderBy: [desc(expenses.dateExpense)],
      limit: limit,
      offset: offset,
    });

    return { 
      data,
      total: isPaginated ? totalCount : data.length,
      page: isPaginated ? page : 1,
      limit: limit || data.length,
      totalPages: isPaginated && limit ? Math.ceil(totalCount / limit) : 1
    };
  });
}

export async function getExpenseCategories() {
  return protectedDbAction("Finance", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    let categories = await db.query.expenseCategories.findMany({
      where: or(eq(expenseCategories.schoolId, schoolId), isNull(expenseCategories.schoolId)),
      orderBy: [expenseCategories.name]
    });

    if (categories.length === 0) {
      const defaultCats = [
        "Fournitures de Bureau",
        "Électricité & Eau",
        "Maintenance & Réparations",
        "Transport & Logistique",
        "Salaires & Honoraires",
        "Équipements & Matériel",
        "Événements & COGES",
        "Divers Dépenses"
      ];
      for (const catName of defaultCats) {
        try {
          await db.insert(expenseCategories).values({ schoolId, name: catName, description: catName });
        } catch (_) {}
      }
      categories = await db.query.expenseCategories.findMany({
        where: or(eq(expenseCategories.schoolId, schoolId), isNull(expenseCategories.schoolId)),
        orderBy: [expenseCategories.name]
      });
    }

    return { data: categories };
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
      recordedBy: user.nomComplet || user.email || "Admin",
    };

    if (roleType === "level_director") {
      expenseData.educationalLevel = user.educationalLevel;
    }

    await db.insert(expenses).values(expenseData);
    revalidatePath("/dashboard/finance/expenses");
    revalidatePath("/dashboard/finance");
    return { success: true };
  });
}

export async function deleteExpense(expenseId: number) {
  return protectedDbAction("Finance", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.schoolId, schoolId)));
    revalidatePath("/dashboard/finance/expenses");
    revalidatePath("/dashboard/finance");
    return { success: true };
  });
}

export async function getAdvancedFinanceStats() {
  return protectedDbAction("Finance", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    const schoolId = (await getActiveSchoolId()) || user?.schoolId || 9;
    const activeLevel = await getActiveEducationalLevel(user);

    const activeSession = await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and, isNull }) => and(
        schoolId ? or(eq(s.schoolId, schoolId), isNull(s.schoolId)) : undefined,
        or(eq(s.isActive, true), eq(s.status, "Actif"))
      ),
      orderBy: [desc(schoolSessions.id)]
    });

    const session = activeSession || await db.query.schoolSessions.findFirst({
      where: (s, { eq, or, and, isNull }) => schoolId ? or(eq(s.schoolId, schoolId), isNull(s.schoolId)) : undefined,
      orderBy: [desc(schoolSessions.id)]
    });

    // Base where clause for student fees
    let feesWhere = and(
      session?.id ? eq(studentFees.sessionId, session.id) : undefined,
      schoolId ? or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId)) : undefined
    );

    // Get all fees with payments for this session (optimized column selection)
    let allFees = await db.query.studentFees.findMany({
      where: feesWhere,
      with: {
        student: {
          columns: {
            educationalLevel: true,
            classe: true,
            nomEtudiant: true,
            photoPath: true,
          }
        },
        payments: {
          columns: {
            amount: true,
            datePaid: true,
          },
          orderBy: [desc(feePayments.datePaid)]
        }
      }
    });

    if (allFees.length === 0) {
      allFees = await db.query.studentFees.findMany({
        where: schoolId ? or(eq(studentFees.schoolId, schoolId), isNull(studentFees.schoolId)) : undefined,
        with: {
          student: {
            columns: {
              educationalLevel: true,
              classe: true,
              nomEtudiant: true,
              photoPath: true,
            }
          },
          payments: {
            columns: {
              amount: true,
              datePaid: true,
            },
            orderBy: [desc(feePayments.datePaid)]
          }
        }
      });
    }

    // Filter by level for level_director, level_comptable, level_caissier
    let fees = allFees;
    const needsLevelFilter = (roleType === "level_director" || roleType === "level_comptable" || roleType === "level_caissier") && !!activeLevel;
    if (needsLevelFilter) {
      // Use normalizeLevel for accent-insensitive comparison
      const compatibleNorms = getCompatibleLevels(activeLevel).map(l => normalizeLevel(l));
      fees = fees.filter(f => f.student?.educationalLevel && compatibleNorms.includes(normalizeLevel(f.student.educationalLevel)));
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

    // 6. Class breakdown for reports (normalized so whitespace variations merge together)
    const classMap = new Map<string, { className: string; expected: number; paid: number; unpaid: number; count: number }>();
    for (const fee of fees) {
      const rawCls = fee.student?.classe || "Inconnue";
      const displayCls = String(rawCls)
        .replace(/\u00a0/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "Inconnue";
      const normalizedKey = displayCls.toLowerCase();

      if (!classMap.has(normalizedKey)) {
        classMap.set(normalizedKey, { className: displayCls, expected: 0, paid: 0, unpaid: 0, count: 0 });
      }
      const entry = classMap.get(normalizedKey)!;
      entry.expected += fee.totalExpected || 0;
      entry.paid += fee.totalPaid || 0;
      entry.unpaid += Math.max(0, fee.balance || 0);
      entry.count += 1;
    }
    const classSummary = Array.from(classMap.values())
      .map((data) => ({ 
        className: data.className,
        expected: data.expected,
        paid: data.paid,
        unpaid: data.unpaid,
        count: data.count,
        rate: data.expected > 0 ? Math.round((data.paid / data.expected) * 100) : 0 
      }))
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
