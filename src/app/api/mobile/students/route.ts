import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { studentFees } from "@/infrastructure/database/schema/finance";
import { classSubjects, schoolClasses, schoolSessions } from "@/infrastructure/database/schema/academics";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
import { getUserRoleType, getCompatibleLevels, normalizeLevel, hasAllEducationalLevels, isStudentInEducationalLevel } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const url = new URL(request.url);
  const requestedSchoolId = url.searchParams.get("schoolId");
  const schoolId = user.schoolId || (requestedSchoolId ? parseInt(requestedSchoolId, 10) : (user.superAdmin ? 9 : null));
  const roleType = await getUserRoleType(user);

  try {
    const cond = [];
    if (schoolId) {
      cond.push(eq(students.schoolId, schoolId));
    }

    let rows = await readDb.query.students.findMany({
      where: cond.length > 0 ? and(...cond) : undefined,
      columns: {
        id: true,
        schoolId: true,
        numAdmission: true,
        nomEtudiant: true,
        photoPath: true,
        educationalLevel: true,
        classe: true,
        section: true,
        session: true,
        sexe: true,
        statut: true,
        mobile: true,
        whatsapp: true,
        nomPere: true,
        createdAt: true,
      },
      orderBy: [students.nomEtudiant],
    });

    const isTeacher = roleType === "teacher" || roleType === "enseignant";
    if (isTeacher && user.employeeId) {
      // Filter by teaching assignments
      const teachingAssignments = await readDb.query.classSubjects.findMany({
        where: eq(classSubjects.employeeId, user.employeeId),
        with: {
          class: true
        }
      });

      const allowedClasses = new Set(
        teachingAssignments
          .map((item) => item.class?.className)
          .filter(Boolean)
      );

      if (allowedClasses.size > 0) {
        rows = rows.filter((s) => s.classe && allowedClasses.has(s.classe));
      }
    }

    // ── Level scoping for level_director / level_comptable / level_caissier ──
    const activeLevel = user.educationalLevel;
    const isLevelScoped = Boolean(
      (activeLevel && !hasAllEducationalLevels(activeLevel) && !user.admin && !user.superAdmin && roleType !== "super_admin" && roleType !== "directeur" && roleType !== "general_director") ||
      roleType === "level_director" ||
      roleType === "level_comptable" ||
      roleType === "level_caissier"
    );
    if (isLevelScoped && activeLevel) {
      rows = rows.filter(s => isStudentInEducationalLevel(s, activeLevel));
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Sort alphabetically by name
    rows.sort((a, b) =>
      (a.nomEtudiant || "").toLowerCase().localeCompare((b.nomEtudiant || "").toLowerCase())
    );

    const list = rows.map((s) => ({
      id: s.id,
      school_id: s.schoolId,
      num_admission: s.numAdmission,
      nom_etudiant: s.nomEtudiant,
      photo_path: s.photoPath,
      educational_level: s.educationalLevel,
      classe: s.classe,
      section: s.section,
      session: s.session,
      sexe: s.sexe,
      statut: s.statut,
      mobile: s.mobile,
      whatsapp: s.whatsapp,
      nom_pere: s.nomPere,
      created_at: s.createdAt?.toISOString() || null,
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

  // Restrict writing students to staff/admins/directors/level_directors
  const hasAccess =
    [
      "admin",
      "super_admin",
      "director",
      "directeur",
      "general_director",
      "level_director",
      "staff",
      "censeur",
      "surveillant",
    ].includes(roleType) ||
    Boolean(user.superAdmin || user.admin) ||
    String(user.role?.roleName || user.role || "").toLowerCase().includes("admin") ||
    String(user.role?.roleName || user.role || "").toLowerCase().includes("direct") ||
    String(user.role?.roleName || user.role || "").toLowerCase().includes("staff");

  if (!hasAccess) {
    return mobileJsonError("Accès refusé. Droits insuffisants.", 403);
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (!action || !payload) {
      return mobileJsonError("Action ou payload manquant", 400);
    }

    if (action === "saveStudent") {
      const studentId = payload.id ? Number(payload.id) : null;
      const userLevel = user.educationalLevel;
      const resolvedLevel =
        payload.educational_level ||
        (userLevel && !hasAllEducationalLevels(userLevel) ? userLevel : null);

      const data = {
        schoolId: schoolId || payload.school_id || null,
        numAdmission: String(payload.num_admission),
        nomEtudiant: String(payload.nom_etudiant),
        nomArabe: payload.nom_arabe || null,
        sexe: payload.sexe || null,
        religion: payload.religion || null,
        dateNaissance: payload.date_naissance || null,
        lieuNaissance: payload.lieu_naissance || null,
        cnic: payload.cnic || null,
        groupeSanguin: payload.groupe_sanguin || null,
        session: payload.session || null,
        educationalLevel: resolvedLevel,
        classe: payload.classe || null,
        section: payload.section || null,
        categorie: payload.categorie || null,
        nomPere: payload.nom_pere || null,
        cnicPere: payload.cnic_pere || null,
        mobile: payload.mobile || null,
        whatsapp: payload.whatsapp || null,
        fraisMensuels: payload.frais_mensuels ? Number(payload.frais_mensuels) : 0,
        ancienSolde: payload.ancien_solde ? Number(payload.ancien_solde) : 0,
        fraisInscription: payload.frais_inscription ? Number(payload.frais_inscription) : 0,
        statut: payload.statut || "Actif",
        photoPath: payload.photo_path || null,
        activationPin: payload.activation_pin || payload.activationPin || null,
        fingerprintHash: payload.fingerprint_hash || payload.fingerprintHash || null,
      };

      let savedStudentId: number | null = studentId;
      let studentFeeAccount: any = null;

      if (studentId) {
        // Verify same school
        const exist = await readDb.query.students.findFirst({
          where: eq(students.id, studentId),
          columns: { schoolId: true }
        });
        if (!exist || (schoolId && exist.schoolId !== schoolId)) {
          return mobileJsonError("Accès refusé. Élève introuvable ou d'une autre école.", 403);
        }

        await db.update(students).set(data).where(eq(students.id, studentId));
      } else {
        const [inserted] = await db.insert(students).values(data).returning({ id: students.id });
        if (inserted) {
          savedStudentId = inserted.id;

          // Automatically initialize student fee account
          const regFee = Number(data.fraisInscription || 0);
          const rawMonthly = Number(data.fraisMensuels || 0);
          const isPrimaireOrMater = String(data.educationalLevel || "").toLowerCase().includes("prim") ||
            String(data.educationalLevel || "").toLowerCase().includes("mater") ||
            String(data.classe || "").toLowerCase().includes("ce") ||
            String(data.classe || "").toLowerCase().includes("cm") ||
            String(data.classe || "").toLowerCase().includes("ci") ||
            String(data.classe || "").toLowerCase().includes("cp");

          let totalExpected: number;
          if (rawMonthly >= 30000 || (isPrimaireOrMater && rawMonthly >= 20000)) {
            totalExpected = regFee + rawMonthly;
          } else if (rawMonthly > 0) {
            totalExpected = regFee + (rawMonthly * 9);
          } else {
            totalExpected = isPrimaireOrMater ? 45000 : 0;
          }

          if (isPrimaireOrMater && (totalExpected > 75000 || totalExpected <= 0)) {
            totalExpected = 45000;
          }

          if (totalExpected > 0) {
            let targetSessionId = payload.session_id ? Number(payload.session_id) : (payload.sessionId ? Number(payload.sessionId) : null);
            if (!targetSessionId && data.schoolId) {
              const activeSession = await readDb.query.schoolSessions.findFirst({
                where: and(
                  eq(schoolSessions.schoolId, data.schoolId),
                  eq(schoolSessions.status, "Actif")
                ),
                columns: { id: true }
              });
              targetSessionId = activeSession?.id || null;
            }

            const [feeRecord] = await db
              .insert(studentFees)
              .values({
                schoolId: data.schoolId,
                studentId: savedStudentId,
                sessionId: targetSessionId,
                totalExpected,
                totalPaid: 0,
                balance: totalExpected,
                status: "Impayé",
              })
              .returning();
            studentFeeAccount = feeRecord;
          }
        }
      }

      return NextResponse.json({
        success: true,
        studentId: savedStudentId,
        feeId: studentFeeAccount?.id || null,
        data: {
          id: savedStudentId,
          feeId: studentFeeAccount?.id || null,
        },
      });
    }

    if (action === "promoteStudents") {
      const { studentIds, targetClass, targetSession, transferBalance } = payload;
      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return mobileJsonError("Paramètre studentIds invalide", 400);
      }

      // Promote class and session
      await db
        .update(students)
        .set({
          classe: targetClass,
          session: targetSession,
        })
        .where(and(
          inArray(students.id, studentIds),
          schoolId ? eq(students.schoolId, schoolId) : undefined
        ));

      // Log promotion in activity_logs
      try {
        await db.execute(sql`
          INSERT INTO activity_logs (user_id, username, action_type, entity_type, entity_id, details)
          VALUES (
            ${user.employeeId || user.id},
            ${user.utilisateur},
            'student_promotion',
            'promotion',
            ${String(Date.now())},
            ${JSON.stringify({
              student_ids: studentIds,
              target_class: targetClass,
              target_session: targetSession,
              transfer_balance: transferBalance,
              students_count: studentIds.length,
            })}
          )
        `);
      } catch (logError) {
        console.error("Failed to insert promotion activity log:", logError);
      }

      return NextResponse.json({
        success: true,
        message: `${studentIds.length} étudiants ont été promus.`,
      });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
