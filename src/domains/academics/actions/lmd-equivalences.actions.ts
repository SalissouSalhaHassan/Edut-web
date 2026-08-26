"use server";

import { db, readDb } from "@/infrastructure/database";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { 
  lmdCreditEquivalences, 
  universityPrograms, 
  lmdUnitesEnseignement,
  studentLmdUeResults,
  studentLmdSemesters
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface CreditEquivalenceInput {
  id?: number;
  studentId: number;
  originInstitution: string;
  originCountry?: string;
  originProgram?: string;
  academicYear?: string;
  targetProgramId: number;
  targetLevel: string; // L1, L2, L3, M1, M2
  targetSemester: string; // S1 .. S6
  creditsTransferred: number;
  equivalentUesJson?: string;
  decision?: string; // Validé | Rejeté | En Commission
  commissionPresident?: string;
  commissionComments?: string;
  certificateNumber?: string;
}

export async function getEquivalencesList() {
  try {
    const schoolId = await getActiveSchoolId();

    const records = await (readDb || db)
      .select({
        id: lmdCreditEquivalences.id,
        schoolId: lmdCreditEquivalences.schoolId,
        studentId: lmdCreditEquivalences.studentId,
        originInstitution: lmdCreditEquivalences.originInstitution,
        originCountry: lmdCreditEquivalences.originCountry,
        originProgram: lmdCreditEquivalences.originProgram,
        academicYear: lmdCreditEquivalences.academicYear,
        targetProgramId: lmdCreditEquivalences.targetProgramId,
        targetLevel: lmdCreditEquivalences.targetLevel,
        targetSemester: lmdCreditEquivalences.targetSemester,
        creditsTransferred: lmdCreditEquivalences.creditsTransferred,
        equivalentUesJson: lmdCreditEquivalences.equivalentUesJson,
        decision: lmdCreditEquivalences.decision,
        decisionDate: lmdCreditEquivalences.decisionDate,
        commissionPresident: lmdCreditEquivalences.commissionPresident,
        commissionComments: lmdCreditEquivalences.commissionComments,
        certificateNumber: lmdCreditEquivalences.certificateNumber,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        programName: universityPrograms.name,
      })
      .from(lmdCreditEquivalences)
      .leftJoin(students, eq(lmdCreditEquivalences.studentId, students.id))
      .leftJoin(universityPrograms, eq(lmdCreditEquivalences.targetProgramId, universityPrograms.id))
      .where(schoolId ? eq(lmdCreditEquivalences.schoolId, schoolId) : undefined)
      .orderBy(desc(lmdCreditEquivalences.id));

    return { success: true, data: records };
  } catch (error: any) {
    console.error("Error in getEquivalencesList:", error);
    return { success: false, error: error.message || "Erreur lors de la récupération des équivalences" };
  }
}

export async function saveCreditEquivalence(input: CreditEquivalenceInput) {
  try {
    const schoolId = await getActiveSchoolId();

    if (!input.studentId) {
      return { success: false, error: "Étudiant requis" };
    }
    if (!input.originInstitution) {
      return { success: false, error: "Établissement d'origine requis" };
    }
    if (!input.targetProgramId) {
      return { success: false, error: "Programme d'accueil requis" };
    }

    const certNum = input.certificateNumber || `EQ-ECTS-${Date.now().toString().slice(-6)}`;

    if (input.id) {
      // Update
      await db
        .update(lmdCreditEquivalences)
        .set({
          studentId: input.studentId,
          originInstitution: input.originInstitution,
          originCountry: input.originCountry || "International",
          originProgram: input.originProgram || "Licence",
          academicYear: input.academicYear || "2025-2026",
          targetProgramId: input.targetProgramId,
          targetLevel: input.targetLevel || "L2",
          targetSemester: input.targetSemester || "S3",
          creditsTransferred: Number(input.creditsTransferred || 60),
          equivalentUesJson: input.equivalentUesJson || "[]",
          decision: input.decision || "Validé",
          commissionPresident: input.commissionPresident || "Président de Commission",
          commissionComments: input.commissionComments || "",
          certificateNumber: certNum,
          updatedAt: new Date(),
        })
        .where(eq(lmdCreditEquivalences.id, input.id));
    } else {
      // Insert
      await db.insert(lmdCreditEquivalences).values({
        schoolId: schoolId || 1,
        studentId: input.studentId,
        originInstitution: input.originInstitution,
        originCountry: input.originCountry || "International",
        originProgram: input.originProgram || "Licence",
        academicYear: input.academicYear || "2025-2026",
        targetProgramId: input.targetProgramId,
        targetLevel: input.targetLevel || "L2",
        targetSemester: input.targetSemester || "S3",
        creditsTransferred: Number(input.creditsTransferred || 60),
        equivalentUesJson: input.equivalentUesJson || "[]",
        decision: input.decision || "Validé",
        commissionPresident: input.commissionPresident || "Président de Commission",
        commissionComments: input.commissionComments || "",
        certificateNumber: certNum,
      });
    }

    revalidatePath("/dashboard/academics/lmd/equivalences");
    revalidatePath("/dashboard/academics/lmd/student-trajectory");
    return { success: true };
  } catch (error: any) {
    console.error("Error in saveCreditEquivalence:", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement de l'équivalence" };
  }
}

export async function deleteCreditEquivalence(id: number) {
  try {
    await db.delete(lmdCreditEquivalences).where(eq(lmdCreditEquivalences.id, id));
    revalidatePath("/dashboard/academics/lmd/equivalences");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteCreditEquivalence:", error);
    return { success: false, error: error.message || "Erreur lors de la suppression" };
  }
}
