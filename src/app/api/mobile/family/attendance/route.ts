import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { getMobileUser, mobileJsonError } from "../../../_lib/auth";
import { verifyParentChildRelationship } from "../../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    const rows = await readDb.query.studentAttendance.findMany({
      where: eq(studentAttendance.studentId, studentId),
      with: {
        subject: true,
      },
      orderBy: [sql`date DESC`]
    });

    const data = rows.map((r) => ({
      id: r.id,
      student_id: r.studentId,
      class_id: r.classId,
      subject_id: r.subjectId,
      date: r.date?.toISOString() || null,
      status: r.status,
      remark: r.remark,
      school_subjects: r.subject ? { subject_name: r.subject.subjectName } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
