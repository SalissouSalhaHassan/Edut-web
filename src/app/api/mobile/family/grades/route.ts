import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { studentResults } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));
  const sessionId = searchParams.get("sessionId") ? Number(searchParams.get("sessionId")) : null;

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    const cond = [eq(studentResults.studentId, studentId)];
    if (sessionId) {
      cond.push(eq(studentResults.sessionId, sessionId));
    }

    const rows = await readDb.query.studentResults.findMany({
      where: and(...cond),
      with: {
        subject: true,
      },
      orderBy: [studentResults.term, studentResults.subjectId]
    });

    const data = rows.map((r) => ({
      id: r.id,
      student_id: r.studentId,
      subject_id: r.subjectId,
      class_id: r.classId,
      session_id: r.sessionId,
      term: r.term,
      class_work_score: r.classWorkScore,
      exam_score: r.examScore,
      total_score: r.totalScore,
      coefficient: r.coefficient,
      weighted_score: r.weightedScore,
      rank: r.rank,
      absences: r.absences,
      observation: r.observation,
      appreciation: r.appreciation,
      school_subjects: r.subject ? {
        subject_name: r.subject.subjectName,
        subject_code: r.subject.subjectCode,
      } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
