import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { studentFees } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action !== "getStudentFeesList") {
    return mobileJsonError("Action non supportée ou manquante", 400);
  }

  const targetSchoolId = Number(searchParams.get("schoolId"));
  const sessionId = Number(searchParams.get("sessionId"));

  if (!targetSchoolId || !sessionId) {
    return mobileJsonError("Paramètres manquants", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  if (schoolId && schoolId !== targetSchoolId) {
    return mobileJsonError("Accès refusé", 403);
  }

  try {
    const cond = [
      eq(studentFees.schoolId, targetSchoolId),
      eq(studentFees.sessionId, sessionId)
    ];

    // Role-based restrictions
    if (roleType === "parent" && user.studentId) {
      cond.push(eq(studentFees.studentId, user.studentId));
    } else if (roleType === "student" && user.studentId) {
      cond.push(eq(studentFees.studentId, user.studentId));
    } else if (roleType === "teacher" || roleType === "enseignant") {
      // Teachers don't see financial lists by default
      return NextResponse.json({ success: true, data: [] });
    }

    const rows = await readDb.query.studentFees.findMany({
      where: and(...cond),
      with: {
        student: true
      }
    });

    const list = rows.map((row) => ({
      id: row.id,
      school_id: row.schoolId,
      student_id: row.studentId,
      session_id: row.sessionId,
      total_expected: row.totalExpected,
      total_paid: row.totalPaid,
      total_reduction: row.totalReduction,
      balance: row.balance,
      status: row.status,
      students: row.student ? {
        num_admission: row.student.numAdmission,
        nom_etudiant: row.student.nomEtudiant,
        photo_path: row.student.photoPath,
        classe: row.student.classe,
        educational_level: row.student.educationalLevel,
      } : null,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  const hasAccess = ["admin", "super_admin", "director", "directeur", "staff"].includes(roleType);
  if (!hasAccess) {
    return mobileJsonError("Accès refusé. Seuls les administrateurs peuvent synchroniser les dossiers.", 403);
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action !== "syncStudentFees" || !payload) {
      return mobileJsonError("Action non supportée ou payload manquant", 400);
    }

    const { schoolId: targetSchoolId, sessionId } = payload;
    if (!targetSchoolId || !sessionId) {
      return mobileJsonError("schoolId or sessionId manquants", 400);
    }

    if (schoolId && schoolId !== targetSchoolId) {
      return mobileJsonError("Accès refusé", 403);
    }

    // 1. Fetch active students in school
    const activeStudents = await readDb.query.students.findMany({
      where: and(
        eq(students.schoolId, targetSchoolId),
        eq(students.statut, "Actif")
      ),
      columns: { id: true, fraisMensuels: true, ancienSolde: true, fraisInscription: true }
    });

    // 2. Fetch existing fees records
    const existingFees = await readDb.query.studentFees.findMany({
      where: and(
        eq(studentFees.schoolId, targetSchoolId),
        eq(studentFees.sessionId, sessionId)
      )
    });

    const feeMap = new Map(existingFees.map((f) => [f.studentId, f]));

    let inserted = 0;
    let updated = 0;

    await Promise.all(
      activeStudents.map(async (s) => {
        const monthly = Number(s.fraisMensuels || 0);
        const inscr = Number(s.fraisInscription || 0);
        const oldBal = Number(s.ancienSolde || 0);
        const expected = inscr + oldBal + monthly;

        const existing = feeMap.get(s.id);

        if (existing) {
          const currentExpected = Number(existing.totalExpected || 0);
          if (currentExpected !== expected) {
            const paid = Number(existing.totalPaid || 0);
            const reduc = Number(existing.totalReduction || 0);
            const newBalance = expected - paid - reduc;

            await db
              .update(studentFees)
              .set({
                totalExpected: expected,
                balance: newBalance,
              })
              .where(eq(studentFees.id, existing.id));

            updated++;
          }
        } else {
          await db.insert(studentFees).values({
            schoolId: targetSchoolId,
            studentId: s.id,
            sessionId,
            totalExpected: expected,
            totalPaid: 0.0,
            totalReduction: 0.0,
            balance: expected,
            status: "Impaye",
          });

          inserted++;
        }
      })
    );

    return NextResponse.json({
      success: true,
      inserted,
      updated,
    });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
