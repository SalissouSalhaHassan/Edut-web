import { localDb } from './dexie';
import { toast } from 'sonner';

export async function syncOutbox() {
  const items = await localDb.outbox.orderBy('timestamp').toArray();
  if (items.length === 0) return false;

  console.log(`[Sync] Starting sync for ${items.length} outbox items.`);

  let processedCount = 0;

  for (const item of items) {
    try {
      let success = false;
      let error = '';

      if (item.targetTable === 'students') {
        const { importStudentRow } = await import('@/domains/importation/actions/import.actions');
        const res = await importStudentRow(item.payload);
        success = !!res?.success;
        error = res?.error || 'Unknown error';
      } else if (item.targetTable === 'exams') {
        const { createExam } = await import('@/domains/academics/actions/exams.actions');
        const res = await createExam(item.payload);
        success = !!res?.success;
        error = res?.error || 'Unknown error';
      } else if (item.targetTable === 'examResults') {
        const { saveBatchExamResults } = await import('@/domains/academics/actions/exams.actions');
        const res = await saveBatchExamResults({
          examId: item.payload.examId,
          results: [
            {
              studentId: item.payload.studentId,
              marksObtained: item.payload.marksObtained,
              remarks: item.payload.remarks || '',
            },
          ],
        });
        success = !!res?.success;
        error = res?.error || 'Unknown error';
      } else {
        success = true; // Unsupported tables auto-bypass
      }

      if (success) {
        await localDb.outbox.delete(item.id!);
        processedCount++;
      } else {
        console.error(`[Sync] Error syncing item ${item.id}: ${error}`);
        toast.error(`Erreur de synchronisation : ${error}`);
        break; // Pause outbox processing to prevent order dependencies from breaking
      }
    } catch (e: any) {
      console.error(`[Sync] System exception during sync:`, e);
      toast.error(`Erreur de connexion au serveur.`);
      break;
    }
  }

  if (processedCount > 0) {
    toast.success(`${processedCount} modification(s) synchronisée(s) avec succès.`);
    return true;
  }
  return false;
}
