import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const isParent = !user.admin && !user.teacherId && Boolean(user.parentId || user.parentPhone);
  if (isParent) {
    const isLinked = await verifyParentChildRelationship(user, studentId);
    if (!isLinked) {
      return mobileJsonError("Accès refusé.", 403);
    }
  }

  try {
    // 1. Fetch student grades
    const gradesRes = await readDb.execute(sql`
      SELECT r.subject_id, r.total_score, r.class_work_score, r.exam_score, r.moyenne_devoirs, r.coefficient,
             s.subject_name, s.subject_code
      FROM student_results r
      LEFT JOIN school_subjects s ON r.subject_id = s.id
      WHERE r.student_id = ${studentId}
      ORDER BY r.term DESC, r.subject_id
    `);
    const grades = ((gradesRes as any).rows || gradesRes) as any[];

    // 2. Fetch student attendance
    const attRes = await readDb.execute(sql`
      SELECT status, count(*) as count
      FROM student_attendance
      WHERE student_id = ${studentId}
      GROUP BY status
    `);
    const attStats = ((attRes as any).rows || attRes) as any[];
    
    let totalAbsences = 0;
    let totalLates = 0;
    for (const a of attStats) {
      const s = String(a.status || "").toLowerCase();
      const cnt = Number(a.count || 0);
      if (s.includes("abs")) totalAbsences += cnt;
      if (s.includes("retard") || s.includes("late")) totalLates += cnt;
    }

    // 3. Group and aggregate grades BY UNIQUE SUBJECT
    const subjectMap = new Map<string, {
      subjectName: string;
      totalWeightedScore: number;
      totalWeights: number;
      coefficient: number;
      evaluationsCount: number;
    }>();

    for (const g of grades) {
      const rawName = (g.subject_name || "Matière").trim();
      const normKey = rawName.toLowerCase();
      
      let score = Number(g.total_score ?? g.exam_score ?? g.moyenne_devoirs ?? g.class_work_score ?? 0);
      const coef = Math.max(1, Number(g.coefficient || 1));

      // Normalization to 20
      if (score > 20 && coef > 1 && (score / coef) <= 20) {
        score = score / coef;
      } else if (score > 20 && score <= 40) {
        score = score / 2;
      } else if (score > 20) {
        score = (score / 100) * 20;
      }

      if (score <= 0) continue; // Ignore empty / unrecorded grades

      if (!subjectMap.has(normKey)) {
        subjectMap.set(normKey, {
          subjectName: rawName,
          totalWeightedScore: score * coef,
          totalWeights: coef,
          coefficient: coef,
          evaluationsCount: 1,
        });
      } else {
        const existing = subjectMap.get(normKey)!;
        existing.totalWeightedScore += score * coef;
        existing.totalWeights += coef;
        existing.evaluationsCount += 1;
      }
    }

    const atRiskSubjects: any[] = [];
    const strongSubjects: any[] = [];
    let totalWeighted = 0;
    let totalCoeff = 0;

    for (const subj of subjectMap.values()) {
      const subjectAverage = Number((subj.totalWeightedScore / subj.totalWeights).toFixed(1));
      
      totalWeighted += subjectAverage * subj.coefficient;
      totalCoeff += subj.coefficient;

      if (subjectAverage < 10.0 && subjectAverage > 0) {
        atRiskSubjects.push({
          subjectName: subj.subjectName,
          score: subjectAverage,
          coefficient: subj.coefficient,
          severity: subjectAverage < 7.5 ? "Critique" : "Moyen",
          recommendation: `Séances de révision et exercices ciblés recommandés en ${subj.subjectName}.`,
        });
      } else if (subjectAverage >= 14.0) {
        strongSubjects.push({
          subjectName: subj.subjectName,
          score: subjectAverage,
          coefficient: subj.coefficient,
        });
      }
    }

    // Sort atRiskSubjects by lowest score first
    atRiskSubjects.sort((a, b) => a.score - b.score);
    strongSubjects.sort((a, b) => b.score - a.score);

    const overallAverage = totalCoeff > 0 ? Number((totalWeighted / totalCoeff).toFixed(1)) : 12.0;

    // 4. Calculate realistic risk level
    let riskLevel: "Faible" | "Modéré" | "Élevé" = "Faible";
    let riskSummary = `Excellent suivi général. Moyenne actuelle de ${overallAverage}/20 avec de très bons acquis.`;

    if (overallAverage < 9.5 || atRiskSubjects.length >= 4 || totalAbsences > 7) {
      riskLevel = "Élevé";
      riskSummary = `Attention : ${atRiskSubjects.length} matière(s) nécessitent un soutien d'urgence avant les examens finaux.`;
    } else if (atRiskSubjects.length > 0 || totalAbsences > 2 || totalLates > 3) {
      riskLevel = "Modéré";
      riskSummary = `Bonne dynamique globale (${overallAverage}/20). Renforcement conseillé en : ${atRiskSubjects.map((s) => s.subjectName).join(", ")}.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        riskLevel,
        riskSummary,
        overallAverage,
        atRiskCount: atRiskSubjects.length,
        atRiskSubjects,
        strongSubjects,
        attendanceAlerts: {
          absences: totalAbsences,
          lates: totalLates,
        },
        actionPlan: [
          "Organiser 2 sessions de soutien par semaine dans les matières prioritaires.",
          "Consulter le tuteur IA pour clarifier les notions difficiles.",
          "Suivre régulièrement les devoirs assignés sur l'application.",
        ],
      },
    });
  } catch (error: any) {
    console.error("[Early Warning API Error]:", error);
    return mobileJsonError(error?.message || "Erreur d'analyse prédictive", 500);
  }
}
