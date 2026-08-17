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
  const sessionId = searchParams.get("sessionId") ? Number(searchParams.get("sessionId")) : null;

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    const rowsRes = sessionId
      ? await readDb.execute(sql`
          SELECT r.*, s.subject_name, s.subject_code
          FROM student_results r
          LEFT JOIN school_subjects s ON r.subject_id = s.id
          WHERE r.student_id = ${studentId} AND r.session_id = ${sessionId}
          ORDER BY r.term, r.subject_id
        `)
      : await readDb.execute(sql`
          SELECT r.*, s.subject_name, s.subject_code
          FROM student_results r
          LEFT JOIN school_subjects s ON r.subject_id = s.id
          WHERE r.student_id = ${studentId}
          ORDER BY r.term, r.subject_id
        `);

    const rawRows = ((rowsRes as any).rows || rowsRes) as any[];

    const data = rawRows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      subject_id: r.subject_id,
      class_id: r.class_id,
      session_id: r.session_id,
      term: r.term,
      class_work_score: r.class_work_score !== null ? Number(r.class_work_score) : null,
      exam_score: r.exam_score !== null ? Number(r.exam_score) : null,
      total_score: r.total_score !== null ? Number(r.total_score) : null,
      coefficient: r.coefficient !== null ? Number(r.coefficient) : 1,
      weighted_score: r.weighted_score !== null ? Number(r.weighted_score) : null,
      rank: r.rank,
      absences: r.absences !== null ? Number(r.absences) : 0,
      observation: r.observation,
      appreciation: r.appreciation,
      school_subjects: r.subject_name ? {
        subject_name: r.subject_name,
        subject_code: r.subject_code,
      } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
