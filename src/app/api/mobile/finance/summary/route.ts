import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { studentFees } from "@/infrastructure/database/schema/finance";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (!action) {
    return mobileJsonError("Action manquante", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    if (action === "getFinanceStats") {
      const targetSchoolId = Number(searchParams.get("schoolId"));
      const sessionId = Number(searchParams.get("sessionId"));

      if (!targetSchoolId || !sessionId) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      // Restrict access by role
      let rows: any[] = [];
      if (roleType === "parent" && user.studentId) {
        rows = await readDb.query.studentFees.findMany({
          where: and(
            eq(studentFees.schoolId, targetSchoolId),
            eq(studentFees.sessionId, sessionId),
            eq(studentFees.studentId, user.studentId)
          ),
          columns: { totalExpected: true, totalPaid: true, balance: true }
        });
      } else if (roleType === "student" && user.studentId) {
        rows = await readDb.query.studentFees.findMany({
          where: and(
            eq(studentFees.schoolId, targetSchoolId),
            eq(studentFees.sessionId, sessionId),
            eq(studentFees.studentId, user.studentId)
          ),
          columns: { totalExpected: true, totalPaid: true, balance: true }
        });
      } else if (roleType === "teacher" || roleType === "enseignant") {
        // Teachers usually don't have finance access unless assigned, return empty stats or restricted stats
        return NextResponse.json({
          success: true,
          stats: {
            totalExpected: 0.0,
            totalCollected: 0.0,
            totalDebts: 0.0,
          }
        });
      } else {
        // Staff/Director has access to all records in school
        rows = await readDb.query.studentFees.findMany({
          where: and(
            eq(studentFees.schoolId, targetSchoolId),
            eq(studentFees.sessionId, sessionId)
          ),
          columns: { totalExpected: true, totalPaid: true, balance: true }
        });
      }

      let totalExpected = 0.0;
      let totalCollected = 0.0;
      let totalDebts = 0.0;

      for (const row of rows) {
        totalExpected += row.totalExpected || 0.0;
        totalCollected += row.totalPaid || 0.0;
        totalDebts += row.balance || 0.0;
      }

      return NextResponse.json({
        success: true,
        stats: {
          totalExpected,
          totalCollected,
          totalDebts,
        }
      });
    }

    if (action === "getSessions") {
      const targetSchoolId = Number(searchParams.get("schoolId"));
      if (!targetSchoolId) {
        return mobileJsonError("schoolId manquant", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      const rows = await readDb.query.schoolSessions.findMany({
        where: eq(schoolSessions.schoolId, targetSchoolId),
        orderBy: [sql`id DESC`]
      });

      const list = rows.map((s) => ({
        id: s.id,
        session_name: s.sessionName,
        is_active: s.isActive,
        status: s.status,
        school_id: s.schoolId,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
