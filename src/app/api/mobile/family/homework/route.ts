import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";
import { homework } from "@/infrastructure/database/schema/homework";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));
  const className = searchParams.get("className");

  if (!studentId || !className) {
    return mobileJsonError("Paramètres studentId ou className manquants", 400);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    const cls = await readDb.query.schoolClasses.findFirst({
      where: eq(sql`LOWER(class_name)`, className.toLowerCase().trim())
    });

    if (!cls) {
      return NextResponse.json({ success: true, data: [] });
    }

    const rows = await readDb.query.homework.findMany({
      where: eq(homework.classId, cls.id),
      with: {
        subject: true
      },
      orderBy: [sql`date_due ASC`]
    });

    const data = rows.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      class_id: h.classId,
      subject_id: h.subjectId,
      date_assigned: h.dateAssigned?.toISOString() || null,
      date_due: h.dateDue?.toISOString() || null,
      attachment_path: h.attachmentPath,
      created_by: h.createdBy,
      school_subjects: h.subject ? { subject_name: h.subject.subjectName } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
