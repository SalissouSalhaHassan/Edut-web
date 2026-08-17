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
  const className = searchParams.get("className");

  if (!studentId || !className) {
    return mobileJsonError("Paramètres studentId ou className manquants", 400);
  }

  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé.", 403);
  }

  try {
    const rawClassName = className.trim();
    const cleanClass = rawClassName.toLowerCase().replace(/\s+/g, "");

    // Find matching class
    const clsRes = await readDb.execute(sql`
      SELECT id, class_name FROM school_classes
      WHERE LOWER(REPLACE(class_name, ' ', '')) = ${cleanClass}
         OR class_name ILIKE ${rawClassName}
      LIMIT 1
    `);
    const clsRows = ((clsRes as any).rows || clsRes) as any[];

    if (!clsRows || clsRows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const classId = clsRows[0].id;

    const rowsRes = await readDb.execute(sql`
      SELECT h.id, h.title, h.description, h.class_id, h.subject_id, h.date_assigned, h.date_due, h.attachment_path, h.created_by,
             s.subject_name
      FROM homework h
      LEFT JOIN school_subjects s ON h.subject_id = s.id
      WHERE h.class_id = ${classId}
      ORDER BY h.date_due ASC
    `);

    const rawRows = ((rowsRes as any).rows || rowsRes) as any[];

    const data = rawRows.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      class_id: h.class_id,
      subject_id: h.subject_id,
      date_assigned: h.date_assigned ? new Date(h.date_assigned).toISOString() : null,
      date_due: h.date_due ? new Date(h.date_due).toISOString() : null,
      attachment_path: h.attachment_path,
      created_by: h.created_by,
      school_subjects: h.subject_name ? { subject_name: h.subject_name } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
