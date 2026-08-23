"use server";

import { db } from "@/infrastructure/database";
import { bulletinRecords, schoolClasses, academicPeriods, schoolSessions, exams, examResults } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { eq, and, inArray, or, isNull } from "drizzle-orm";
import { BulletinEngine, BatchOptions, BatchResult } from "@/domains/academics/services/bulletin-engine";

// ─── fetchBulletinDataForClass ─────────────────────────────────────────────────
// Récupère toutes les données nécessaires pour générer les bulletins d'une classe
export async function fetchBulletinDataForClass(
  classId: number,
  periodId: number,
  schoolId: number
) {
  try {
    // 1. Info classe + branchInfo + headerConfig
    const classInfo = await db.query.schoolClasses.findFirst({
      where: and(
        eq(schoolClasses.id, classId),
        schoolId ? or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)) : undefined
      ),
    });

    // 2. Période (semestre/trimestre)
    const period = await db.query.academicPeriods.findFirst({
      where: eq(academicPeriods.id, periodId),
      with: { session: true },
    });

    // 3. Élèves de la classe (via students.classId)
    const classStudents = await db.query.students.findMany({
      where: and(
        schoolId ? or(eq(students.schoolId, schoolId), isNull(students.schoolId)) : undefined,
        eq(students.classId, classId)
      ),
    });

    return {
      classInfo,
      period,
      session: period?.session,
      students: classStudents,
      total: classStudents.length,
    };
  } catch (err) {
    console.error("[bulletin-batch.actions] fetchBulletinDataForClass:", err);
    return null;
  }
}

// ─── startBulletinBatch ────────────────────────────────────────────────────────
// Server Action: Lance la génération en lot
export async function startBulletinBatch(
  bulletinsData: any[],
  opts: BatchOptions
): Promise<BatchResult & { ok: boolean; error?: string }> {
  try {
    const result = await BulletinEngine.generateBatch(bulletinsData, opts);
    return { ok: true, ...result };
  } catch (err: any) {
    console.error("[startBulletinBatch] Error:", err);
    return { ok: false, generated: 0, failed: bulletinsData.length, results: [], error: err?.message };
  }
}

// ─── getBulletinHistory ────────────────────────────────────────────────────────
// Récupère l'historique des bulletins pour un élève
export async function getBulletinHistory(studentId: number) {
  return BulletinEngine.listBulletinsForStudent(studentId);
}

// ─── getClassBulletinHistory ──────────────────────────────────────────────────
// Récupère l'historique de tous les bulletins d'une classe
export async function getClassBulletinHistory(classId: number, period?: string) {
  return BulletinEngine.listBulletinsForClass(classId, period);
}

// ─── cancelBulletin ────────────────────────────────────────────────────────────
// Annule un bulletin (le token QR renverra "annulé")
export async function cancelBulletin(verifyToken: string) {
  try {
    await db
      .update(bulletinRecords)
      .set({ status: "annulé" })
      .where(eq(bulletinRecords.verifyToken, verifyToken));
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

// ─── verifyBulletinByToken ─────────────────────────────────────────────────────
// Utilisé par la page /verify/bulletin/[token]
export async function verifyBulletinByToken(token: string) {
  return BulletinEngine.getBulletinByToken(token);
}

// ─── getStudentBulletinData ───────────────────────────────────────────────────
// Récupère et agrège toutes les notes, moyennes et métadonnées d'un élève pour le bulletin
export async function getStudentBulletinData(
  studentId: number,
  classId: number,
  periodId: number,
  schoolId: number
) {
  try {
    // 1. Info élève
    const student = await db.query.students.findFirst({
      where: and(eq(students.id, studentId), eq(students.schoolId, schoolId)),
    });

    // 2. Info classe
    const classInfo = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true },
    });

    // 3. Période & Session
    const period = await db.query.academicPeriods.findFirst({
      where: eq(academicPeriods.id, periodId),
      with: { session: true },
    });

    // 4. Nombre total d'élèves dans la classe
    const totalStudentsInClass = await db.query.students.findMany({
      where: and(
        schoolId ? or(eq(students.schoolId, schoolId), isNull(students.schoolId)) : undefined,
        eq(students.classId, classId)
      ),
    });

    // 5. Examens de la période pour cette classe
    const classExams = await db.query.exams.findMany({
      where: and(
        eq(exams.classId, classId),
        eq(exams.periodId, periodId),
        schoolId ? or(eq(exams.schoolId, schoolId), isNull(exams.schoolId)) : undefined
      ),
      with: {
        subject: true,
        results: {
          where: eq(examResults.studentId, studentId),
        },
      },
    });

    // 6. Transformer les examens en résultats par matière
    const results = classExams.map((ex: any) => {
      const mark = ex.results?.[0]?.marksObtained ?? 0;
      const remarks = ex.results?.[0]?.remarks ?? "";
      return {
        subjectName: ex.subject?.subjectName || ex.examName || "Matière",
        subject: ex.subject,
        classWorkScore: mark,
        examScore: mark,
        coefficient: 1,
        rank: "-",
        appreciation: remarks || (mark >= 16 ? "Très Bien" : mark >= 14 ? "Bien" : mark >= 12 ? "Assez Bien" : mark >= 10 ? "Passable" : "Insuffisant"),
      };
    });

    // 7. Calcul moyenne
    const totalCoef = results.length || 1;
    const totalWeighted = results.reduce((acc: number, r: any) => acc + ((r.classWorkScore + r.examScore) / 2), 0);
    const average = totalCoef > 0 ? totalWeighted / totalCoef : 0;

    const summary = {
      average,
      rank: "-",
      totalStudents: totalStudentsInClass.length,
      travail: average >= 14 ? "Tableau d'honneur" : average >= 12 ? "Encouragement" : average >= 10 ? "" : "Avertissement",
      conduite: 15,
      decision: average >= 10 ? "ADMIS(E)" : average >= 8 ? "REDOUBLEMENT" : "EXCLUSION",
      annualAverage: average,
      annualRank: "-",
    };

    return {
      studentId,
      student: {
        nomEtudiant: student ? ((student as any).nomEtudiant || `${(student as any).firstName || ''} ${(student as any).lastName || ''}`.trim() || "Élève") : "Élève",
        numAdmission: (student as any)?.numAdmission || (student as any)?.admissionNumber || `ADM-${studentId}`,
        classe: classInfo?.className || "Classe",
        educationalLevel: (classInfo as any)?.section?.educationalLevel || "Lycée",
      },
      session: period?.session?.sessionName || "2025-2026",
      term: period?.name || "Semestre",
      results,
      summary,
      totalStudents: totalStudentsInClass.length,
      branchInfo: {},
      headerConfig: {},
    };
  } catch (err) {
    console.error("[getStudentBulletinData] Error:", err);
    return null;
  }
}

