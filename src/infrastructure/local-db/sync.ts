import { localDb } from "./dexie";
import { toast } from "sonner";

let syncInProgress = false;

export async function syncOutbox() {
  if (syncInProgress) return false;
  syncInProgress = true;

  try {
    const items = (await localDb.outbox.orderBy("timestamp").toArray())
      .filter((item) => !item.status || item.status === "pending" || item.status === "failed");
    if (items.length === 0) return false;

    console.log(`[Sync] Starting sync for ${items.length} outbox items.`);

    let processedCount = 0;

    for (const item of items) {
      try {
        let success = false;
        let error = "";
        await localDb.outbox.update(item.id!, {
          status: "syncing",
          updatedAt: Date.now(),
          lastError: null,
        });

        if (item.targetTable === "students") {
          const { importStudentRow } = await import("@/domains/importation/actions/import.actions");
          const res = await importStudentRow(item.payload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "exams") {
          const { createExam } = await import("@/domains/academics/actions/exams.actions");
          const res = await createExam(item.payload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "examResults") {
          const { saveBatchExamResults } = await import("@/domains/academics/actions/exams.actions");
          const res = await saveBatchExamResults({
            examId: item.payload.examId,
            results: [
              {
                studentId: item.payload.studentId,
                marksObtained: item.payload.marksObtained,
                remarks: item.payload.remarks || "",
              },
            ],
          });
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "feePayments") {
          const { recordPayment } = await import("@/domains/finance/actions/finance.actions");
          const { id: _localId, updatedAt: _updatedAt, ...paymentPayload } = item.payload;
          const res = await recordPayment(paymentPayload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else if (item.targetTable === "attendanceBatches") {
          const { saveBatchAttendance } = await import("@/domains/attendance/actions/attendance.actions");
          const { id: _localId, updatedAt: _updatedAt, idempotencyKey: _key, ...attendancePayload } = item.payload;
          const res = await saveBatchAttendance(attendancePayload);
          success = !!res?.success;
          error = res?.error || "Unknown error";
        } else {
          error = `Table hors-ligne non supportee: ${item.targetTable}`;
        }

        if (success) {
          await localDb.outbox.delete(item.id!);
          processedCount++;
        } else {
          await localDb.outbox.update(item.id!, {
            status: "failed",
            updatedAt: Date.now(),
            retryCount: (item.retryCount || 0) + 1,
            lastError: error,
          });
          console.error(`[Sync] Error syncing item ${item.id}: ${error}`);
          toast.error(`Erreur de synchronisation : ${error}`);
          break;
        }
      } catch (error: any) {
        await localDb.outbox.update(item.id!, {
          status: "failed",
          updatedAt: Date.now(),
          retryCount: (item.retryCount || 0) + 1,
          lastError: error?.message || "Erreur de connexion au serveur.",
        });
        console.error("[Sync] System exception during sync:", error);
        toast.error("Erreur de connexion au serveur.");
        break;
      }
    }

    if (processedCount > 0) {
      toast.success(`${processedCount} modification(s) synchronisee(s) avec succes.`);
      return true;
    }

    return false;
  } finally {
    syncInProgress = false;
  }
}
