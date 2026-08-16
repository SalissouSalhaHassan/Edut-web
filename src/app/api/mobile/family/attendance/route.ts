import { NextRequest, NextResponse } from "next/server";
import { and, eq, desc, or } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { studentAttendance } from "@/infrastructure/database/schema/attendance";
import { studentResults } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { verifyParentChildRelationship } from "../../_lib/family-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  let studentId = Number(searchParams.get("studentId"));

  if (!studentId && (user.studentId || (user as any).student_id)) {
    studentId = Number(user.studentId || (user as any).student_id);
  }

  if (!studentId && user.utilisateur) {
    const student = await readDb.query.students.findFirst({
      where: or(
        eq(students.numAdmission, user.utilisateur),
        eq(students.nomEtudiant, user.utilisateur)
      ),
      columns: { id: true }
    });
    if (student) studentId = student.id;
  }

  if (!studentId) {
    // If student still not found, check if parent has any students in this school
    const anyStudent = await readDb.query.students.findFirst({
      where: user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
      columns: { id: true }
    });
    if (anyStudent) studentId = anyStudent.id;
  }

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
      orderBy: [desc(studentAttendance.date)]
    });

    let data = rows.map((r) => ({
      id: r.id,
      student_id: r.studentId,
      class_id: r.classId,
      subject_id: r.subjectId,
      date: r.date?.toISOString() || null,
      status: r.status,
      remark: r.remark,
      school_subjects: r.subject ? { subject_name: r.subject.subjectName } : null,
    }));

    // If studentAttendance is empty, inspect studentResults for bulletin-recorded absences
    if (data.length === 0) {
      const resultsWithAbsences = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.studentId, studentId),
        ),
        with: {
          subject: true,
        }
      });

      for (const res of resultsWithAbsences) {
        const count = res.absences || 0;
        if (count > 0) {
          for (let i = 0; i < Math.min(count, 5); i++) {
            data.push({
              id: 900000 + res.id * 10 + i,
              student_id: studentId,
              class_id: res.classId || 0,
              subject_id: res.subjectId,
              date: new Date().toISOString(),
              status: "Absent",
              remark: `Absence relevée (${res.term || "Trimestre"})`,
              school_subjects: res.subject ? { subject_name: res.subject.subjectName } : null,
            });
          }
        }
      }
    }

    const justified = data.filter((d) => 
      (d.remark && d.remark.toLowerCase().includes("just")) || 
      (d.status && d.status.toLowerCase().includes("excus"))
    ).length;

    const late = data.filter((d) => 
      d.status && d.status.toLowerCase().includes("retard")
    ).length;

    const unjustified = data.filter((d) => 
      d.status && d.status.toLowerCase().includes("abs") && 
      !(d.remark && d.remark.toLowerCase().includes("just")) &&
      !(d.status && d.status.toLowerCase().includes("excus"))
    ).length;

    const totalIncidents = data.length;
    const attendanceRate = totalIncidents === 0 ? 100 : Math.max(60, Math.round(100 - (unjustified * 4 + late * 1.5)));

    return NextResponse.json({
      success: true,
      data,
      stats: {
        total_incidents: totalIncidents,
        justified,
        unjustified,
        late,
        attendance_rate: attendanceRate,
      }
    });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const studentId = Number(body.studentId || user.studentId);
    const reason = body.reason || "Raison médicale";
    const notes = body.notes || "";
    const targetDate = body.date ? new Date(body.date) : new Date();

    if (!studentId) {
      return mobileJsonError("studentId requis", 400);
    }

    const isLinked = await verifyParentChildRelationship(user, studentId);
    if (!isLinked) {
      return mobileJsonError("Accès refusé.", 403);
    }

    // Retrieve student classId
    const student = await readDb.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { id: true, schoolId: true, classe: true }
    });

    await db.insert(studentAttendance).values({
      studentId: studentId,
      date: targetDate,
      status: "Excusé",
      remark: `Justification transmise : ${reason}${notes ? ` (${notes})` : ""}`,
      recordedBy: user.utilisateur || (user as any).email || "Espace Parent/Élève",
    });

    return NextResponse.json({
      success: true,
      message: "Demande de justification enregistrée avec succès."
    });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
