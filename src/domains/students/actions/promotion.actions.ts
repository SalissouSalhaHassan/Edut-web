"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

import { assertStudentSessionEditable } from "./students.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { schoolSessions } from "@/infrastructure/database/schema/academics";

export interface PromotionData {
  studentIds: number[];
  targetClass: string;
  targetSession: string;
  transferBalance: boolean;
}

export async function promoteStudents(data: PromotionData) {
  const { studentIds, targetClass, targetSession, transferBalance } = data;

  if (studentIds.length === 0) {
    return { error: "Aucun étudiant sélectionné." };
  }

  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const activeCheck = await assertStudentSessionEditable(null, schoolId);
    if (!activeCheck.editable) {
      return { error: activeCheck.error || "Action impossible : l'année scolaire active est clôturée ou verrouillée." };
    }

    if (targetSession) {
      const targetSessionRow = await db.query.schoolSessions.findFirst({
        where: (s, { eq, and, or, isNull }) => and(
          schoolId ? or(eq(s.schoolId, schoolId), isNull(s.schoolId)) : undefined,
          eq(s.sessionName, targetSession.trim())
        )
      });
      if (targetSessionRow && (!targetSessionRow.isActive || targetSessionRow.status === "Clôturé" || targetSessionRow.status === "Verrouillé" || targetSessionRow.status === "Archivé")) {
        return { error: `Impossible de promouvoir vers une session clôturée ou verrouillée (${targetSessionRow.sessionName}).` };
      }
    }
    
    await db.update(students)
      .set({
        classe: targetClass,
        session: targetSession,
      })
      .where(inArray(students.id, studentIds));

    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/students/promote");
    
    return { success: true, message: `${studentIds.length} étudiants ont été promus avec succès.` };
  });
}
