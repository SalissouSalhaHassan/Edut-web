import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { studentFees } from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType, getCompatibleLevels, normalizeLevel } from "@/domains/auth/services/rbac";

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
      } else if (roleType === "eleve" && user.studentId) {
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
      } else if ((roleType === "level_director" || roleType === "level_comptable" || roleType === "level_caissier") && user.educationalLevel) {
        // Level-scoped: fetch all fees then filter by compatible levels
        const allRows = await readDb.query.studentFees.findMany({
          where: and(
            eq(studentFees.schoolId, targetSchoolId),
            eq(studentFees.sessionId, sessionId)
          ),
          with: { student: { columns: { educationalLevel: true } } }
        });
        const compatibleNorms = getCompatibleLevels(user.educationalLevel!).map(l => normalizeLevel(l));
        rows = allRows
          .filter(r => r.student?.educationalLevel && compatibleNorms.includes(normalizeLevel(r.student.educationalLevel)))
          .map(r => ({ totalExpected: r.totalExpected, totalPaid: r.totalPaid, balance: r.balance }));
        rows = await readDb.query.studentFees.findMany({
          where: and(
            eq(studentFees.schoolId, targetSchoolId),
            eq(studentFees.sessionId, sessionId)
          ),
          columns: { totalExpected: true, totalPaid: true, balance: true },
          with: {
            payments: {
              columns: { amount: true }
            }
          }
        });
      }

      let totalExpected = 0.0;
      let totalCollected = 0.0;
      let totalDebts = 0.0;

      for (const row of rows) {
        let paid = row.totalPaid || 0.0;
        if (row.payments && row.payments.length > 0) {
          paid = row.payments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
        }
        const exp = row.totalExpected || 0.0;
        const bal = Math.max(0, exp - paid);
        totalExpected += exp;
        totalCollected += paid;
        totalDebts += bal;
      }

      if (rows.length === 0 && !user.studentId) {
        const studentRows = await readDb.query.students.findMany({
          where: eq(students.schoolId, targetSchoolId),
          columns: { fraisMensuels: true, ancienSolde: true, fraisInscription: true },
        });
        for (const s of studentRows) {
          const exp = (s.fraisMensuels || 0) * 9 + (s.fraisInscription || 0);
          const debts = s.ancienSolde || 0;
          totalExpected += exp;
          totalDebts += debts;
          totalCollected += Math.max(0, exp - debts);
        }
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
        orderBy: [
          sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
          sql`id DESC`
        ]
      });

      const list = rows.map((s) => ({
        id: s.id,
        session_name: s.sessionName,
        is_active: Boolean(s.isActive || s.status?.toLowerCase() === "actif"),
        status: s.status || (s.isActive ? "Actif" : "Inactif"),
        school_id: s.schoolId,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
