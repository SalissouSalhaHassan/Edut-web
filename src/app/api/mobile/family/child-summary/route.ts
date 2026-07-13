import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions, timetableEntries } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const studentId = Number(searchParams.get("studentId"));
  const action = searchParams.get("action") || "getStudentSnapshot";

  if (!studentId) {
    return mobileJsonError("studentId manquant", 400);
  }

  // Security check: must belong to parent
  const isLinked = await verifyParentChildRelationship(user, studentId);
  if (!isLinked) {
    return mobileJsonError("Accès refusé. Cet élève n'est pas lié à votre compte.", 403);
  }

  try {
    if (action === "getStudentSnapshot") {
      const student = await readDb.query.students.findFirst({
        where: eq(students.id, studentId),
      });

      if (!student) {
        return mobileJsonError("Élève introuvable", 404);
      }

      // Fetch active sessions for the school
      let sessionsList = await readDb.query.schoolSessions.findMany({
        where: eq(schoolSessions.schoolId, student.schoolId || 0),
        orderBy: [sql`id DESC`]
      });

      if (sessionsList.length === 0) {
        sessionsList = await readDb.query.schoolSessions.findMany({
          orderBy: [sql`id DESC`]
        });
      }

      const sessionsMapped = sessionsList.map((s) => ({
        id: s.id,
        session_name: s.sessionName,
        is_active: s.isActive,
        status: s.status,
        school_id: s.schoolId,
      }));

      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          school_id: student.schoolId,
          nom_etudiant: student.nomEtudiant,
          classe: student.classe,
          educational_level: student.educationalLevel,
          nom_pere: student.nomPere,
          mobile: student.mobile,
          whatsapp: student.whatsapp,
          num_admission: student.numAdmission,
          behavior_score: student.behaviorScore,
          photo_path: student.photoPath,
        },
        sessions: sessionsMapped,
      });
    }

    if (action === "getTimetable") {
      const className = searchParams.get("className");
      if (!className) {
        return mobileJsonError("className manquant", 400);
      }

      // Fetch class id
      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(sql`LOWER(class_name)`, className.toLowerCase().trim())
      });

      if (!cls) {
        return NextResponse.json({ success: true, data: [] });
      }

      const rows = await readDb.query.timetableEntries.findMany({
        where: eq(timetableEntries.classId, cls.id),
        with: {
          subject: true,
          teacher: true,
        },
        orderBy: [timetableEntries.dayName, timetableEntries.periodNumber]
      });

      const list = rows.map((row) => ({
        id: row.id,
        day_name: row.dayName,
        period_number: row.periodNumber,
        class_id: row.classId,
        subject_id: row.subjectId,
        employee_id: row.employeeId,
        school_subjects: row.subject ? { subject_name: row.subject.subjectName } : null,
        employees: row.teacher ? { nom: row.teacher.nom, poste: row.teacher.poste } : null,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getTransportSubscription") {
      // Fetch transport subscriptions if table exists, otherwise return null
      try {
        const sub = await db.execute(sql`
          SELECT ts.id, ts.student_id, ts.route_id, ts.pickup_point, ts.start_date, ts.end_date, ts.status,
                 tr.route_name, tr.vehicle_number, tr.driver_name, tr.driver_phone
          FROM transport_subscriptions ts
          LEFT JOIN transport_routes tr ON ts.route_id = tr.id
          WHERE ts.student_id = ${studentId}
          ORDER BY ts.id DESC
          LIMIT 1
        `);

        if (sub && sub.rows && sub.rows.length > 0) {
          const row: any = sub.rows[0];
          return NextResponse.json({
            success: true,
            data: {
              id: row.id,
              student_id: row.student_id,
              route_id: row.route_id,
              pickup_point: row.pickup_point,
              start_date: row.start_date,
              end_date: row.end_date,
              status: row.status,
              transport_routes: {
                route_name: row.route_name,
                vehicle_number: row.vehicle_number,
                driver_name: row.driver_name,
                driver_phone: row.driver_phone,
              }
            }
          });
        }
      } catch (err) {
        // Table might not exist yet in Drizzle snapshot
      }
      return NextResponse.json({ success: true, data: null });
    }

    if (action === "getHostelAllocation") {
      // Fetch hostel allocations if table exists, otherwise return null
      try {
        const alloc = await db.execute(sql`
          SELECT ha.id, ha.room_id, ha.student_id, ha.join_date, ha.leave_date, ha.status, ha.remarks,
                 hr.room_number, hr.room_type, hr.hostel_name
          FROM hostel_allocations ha
          LEFT JOIN hostel_rooms hr ON ha.room_id = hr.id
          WHERE ha.student_id = ${studentId} AND ha.status = 'Occupé'
          ORDER BY ha.id DESC
          LIMIT 1
        `);

        if (alloc && alloc.rows && alloc.rows.length > 0) {
          const row: any = alloc.rows[0];
          return NextResponse.json({
            success: true,
            data: {
              id: row.id,
              room_id: row.room_id,
              student_id: row.student_id,
              join_date: row.join_date,
              leave_date: row.leave_date,
              status: row.status,
              remarks: row.remarks,
              hostel_rooms: {
                room_number: row.room_number,
                room_type: row.room_type,
                hostel_name: row.hostel_name,
              }
            }
          });
        }
      } catch (err) {}
      return NextResponse.json({ success: true, data: null });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
