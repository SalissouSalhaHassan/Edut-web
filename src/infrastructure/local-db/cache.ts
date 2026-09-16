import { localDb } from "./dexie";
import { cacheReferenceItems, getCachedReferenceItems } from "./references";

// 1. Students Caching
export async function cacheStudents(items: any[], schoolId?: number | null) {
  if (!schoolId) return;

  const unsyncedItems = await localDb.outbox
    .where("targetTable")
    .equals("students")
    .toArray();
  const unsynced = unsyncedItems.filter(item =>
    item.status !== "synced" &&
    item.status !== "cancelled" &&
    Number(item.schoolId || item.payload?.schoolId) === Number(schoolId)
  );
  const unsyncedAdmissions = new Set(unsynced.map(item => item.payload.numAdmission));

  const currentStudents = await localDb.students.where("schoolId").equals(schoolId).toArray();
  const unsyncedStudents = currentStudents.filter(s => s.numAdmission && unsyncedAdmissions.has(s.numAdmission));

  await localDb.students.where("schoolId").equals(schoolId).delete();

  if (unsyncedStudents.length > 0) {
    await localDb.students.bulkPut(unsyncedStudents);
  }

  if (items.length > 0) {
    const toPut = items
      .filter(item => !unsyncedAdmissions.has(item.numAdmission))
      .map((item) => ({
        ...item,
        schoolId,
        updatedAt: Date.now(),
      }));
    if (toPut.length > 0) {
      await localDb.students.bulkPut(toPut);
    }
  }
}

export async function getCachedStudents(schoolId?: number | null) {
  if (!schoolId) return [];
  return localDb.students.where("schoolId").equals(schoolId).toArray();
}

// 2. Student Fees Caching
export async function cacheStudentFees(items: any[]) {
  if (!items || items.length === 0) return;
  await cacheReferenceItems("studentFees" as any, items, "id");

  try {
    const allPayments: any[] = [];
    for (const item of items) {
      if (Array.isArray(item.payments) && item.payments.length > 0) {
        for (const p of item.payments) {
          allPayments.push({
            id: p.id ? Number(p.id) : undefined,
            feeId: Number(p.feeId || item.id),
            amount: Number(p.amount || 0),
            reduction: Number(p.reduction || 0),
            paymentMode: p.paymentMode || "Espèces",
            reference: p.reference || `REC-${p.id || Date.now()}`,
            monthConcerned: p.monthConcerned || "Général",
            notes: p.notes || "",
            datePaid: p.datePaid || new Date().toISOString(),
            isProvisoire: Boolean(p.isProvisoire),
            updatedAt: Date.now(),
          });
        }
      }
    }
    if (allPayments.length > 0) {
      await localDb.feePayments.bulkPut(allPayments);
    }
  } catch (e) {
    console.warn("Failed to cache feePayments in localDb:", e);
  }
}

export async function getCachedStudentFees() {
  const fees = await getCachedReferenceItems<any>("studentFees" as any);
  if (!fees || fees.length === 0) return [];

  try {
    // Enrich with local payments from localDb.feePayments and localDb.outbox
    const [storedPayments, outboxItems] = await Promise.all([
      localDb.feePayments.toArray().catch(() => []),
      localDb.outbox.where("targetTable").equals("feePayments").toArray().catch(() => []),
    ]);

    const unsyncedOutbox = outboxItems.filter(
      (item) => item.status !== "synced" && item.status !== "cancelled"
    );

    const paymentsByFeeId = new Map<number, any[]>();

    for (const p of storedPayments) {
      const fId = Number(p.feeId);
      if (!paymentsByFeeId.has(fId)) paymentsByFeeId.set(fId, []);
      paymentsByFeeId.get(fId)!.push(p);
    }

    for (const o of unsyncedOutbox) {
      const fId = Number(o.payload?.feeId);
      if (!fId) continue;
      if (!paymentsByFeeId.has(fId)) paymentsByFeeId.set(fId, []);
      paymentsByFeeId.get(fId)!.push({
        ...o.payload,
        isProvisoire: true,
        recordedBy: "Local Offline",
      });
    }

    return fees.map((fee) => {
      const localPayments = paymentsByFeeId.get(Number(fee.id)) || [];
      const basePayments = Array.isArray(fee.payments) ? fee.payments : [];

      // Deduplicate payments by reference or id
      const seenPaymentKeys = new Set<string>();
      const combinedPayments: any[] = [];

      for (const p of [...localPayments, ...basePayments]) {
        const key = p.reference ? `ref:${p.reference}` : `id:${p.id}`;
        if (!seenPaymentKeys.has(key)) {
          seenPaymentKeys.add(key);
          combinedPayments.push(p);
        }
      }

      const totalPaid = combinedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalReduction = combinedPayments.reduce((sum, p) => sum + (Number(p.reduction) || 0), 0);
      const expected = Number(fee.totalExpected || 0);

      const resolvedPaid = Math.max(totalPaid, Number(fee.totalPaid || 0));
      const resolvedReduction = Math.max(totalReduction, Number(fee.totalReduction || 0));
      const balance = Math.max(0, expected - resolvedPaid - resolvedReduction);
      const status = balance <= 0 && expected > 0 ? "Soldé" : resolvedPaid > 0 ? "Partiel" : "Impayé";

      return {
        ...fee,
        totalPaid: resolvedPaid,
        totalReduction: resolvedReduction,
        balance,
        status,
        payments: combinedPayments,
      };
    });
  } catch (e) {
    console.warn("Error reconciling cached studentFees with local payments:", e);
    return fees;
  }
}

// 3. Exam Results Caching
export async function cacheExamResults(items: any[]) {
  await localDb.examResults.clear();
  if (items.length > 0) {
    const prepared = items.map((item) => ({
      ...item,
      updatedAt: Date.now(),
    }));
    await localDb.examResults.bulkPut(prepared);
  }
}

export async function getCachedExamResults() {
  return localDb.examResults.toArray();
}

// 4. Attendance Caching
export async function cacheAttendance(classId: number, date: string, subjectId: number | undefined, records: any[]) {
  const list = await localDb.attendanceBatches.where("classId").equals(classId).toArray();
  const existing = list.find(item => item.date === date && item.subjectId === (subjectId || 0));
  if (existing?.id) {
    await localDb.attendanceBatches.delete(existing.id);
  }
  await localDb.attendanceBatches.put({
    classId,
    subjectId: subjectId || 0,
    date,
    records,
    updatedAt: Date.now()
  });
}

export async function getCachedAttendance(classId: number, date: string, subjectId: number | undefined) {
  const list = await localDb.attendanceBatches.where("classId").equals(classId).toArray();
  const match = list.find(item => item.date === date && item.subjectId === (subjectId || 0));
  return match ? match.records : [];
}
