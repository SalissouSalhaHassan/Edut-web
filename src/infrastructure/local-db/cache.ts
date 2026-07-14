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
  await cacheReferenceItems("studentFees" as any, items, "id");
}

export async function getCachedStudentFees() {
  return getCachedReferenceItems<any>("studentFees" as any);
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
