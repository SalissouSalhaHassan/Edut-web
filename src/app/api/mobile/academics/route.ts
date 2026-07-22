import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, isNull, or } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import {
  schoolSessions,
  academicPeriods,
  classSubjects,
  schoolClasses,
  schoolSubjects,
  studentResults,
  gradingAppreciations
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
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
    if (action === "getTeacherClassesAndSubjects") {
      const employeeId = Number(searchParams.get("employeeId"));
      if (!employeeId) {
        return mobileJsonError("employeeId manquant", 400);
      }

      if (roleType === "teacher" || roleType === "enseignant") {
        if (user.employeeId !== employeeId) {
          return mobileJsonError("Accès refusé", 403);
        }
      }

      const rows = await readDb.query.classSubjects.findMany({
        where: eq(classSubjects.employeeId, employeeId),
        with: {
          class: {
            with: {
              section: true
            }
          },
          subject: true,
        }
      });

      const list = rows.map((row) => ({
        class_id: row.classId,
        subject_id: row.subjectId,
        school_classes: row.class ? {
          class_name: row.class.className,
          section_id: row.class.sectionId,
          school_sections: row.class.section ? {
            educational_level: row.class.section.educationalLevel
          } : null
        } : null,
        school_subjects: row.subject ? {
          subject_name: row.subject.subjectName
        } : null,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getAllClassesAndSubjects") {
      const targetSchoolId = Number(searchParams.get("schoolId"));
      if (!targetSchoolId) {
        return mobileJsonError("schoolId manquant", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé. Autre école.", 403);
      }

      const rows = await readDb.query.classSubjects.findMany({
        where: eq(classSubjects.schoolId, targetSchoolId),
        with: {
          class: {
            with: {
              section: true
            }
          },
          subject: true,
        }
      });

      const list = rows.map((row) => ({
        class_id: row.classId,
        subject_id: row.subjectId,
        school_classes: row.class ? {
          class_name: row.class.className,
          section_id: row.class.sectionId,
          school_sections: row.class.section ? {
            educational_level: row.class.section.educationalLevel
          } : null
        } : null,
        school_subjects: row.subject ? {
          subject_name: row.subject.subjectName
        } : null,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getSessions") {
      const targetSchoolId = Number(searchParams.get("schoolId"));
      if (!targetSchoolId) {
        return mobileJsonError("schoolId manquant", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      let rows = await readDb.query.schoolSessions.findMany({
        where: eq(schoolSessions.schoolId, targetSchoolId),
        orderBy: [sql`id DESC`]
      });

      // Fallback
      if (rows.length === 0) {
        rows = await readDb.query.schoolSessions.findMany({
          orderBy: [sql`id DESC`]
        });
      }

      const list = rows.map((s) => ({
        id: s.id,
        session_name: s.sessionName,
        is_active: s.isActive,
        status: s.status,
        school_id: s.schoolId,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getPeriods") {
      const targetSchoolId = Number(searchParams.get("schoolId"));
      const sessionId = Number(searchParams.get("sessionId"));
      const level = searchParams.get("level") || searchParams.get("educationalLevel") || "";
      const classIdStr = searchParams.get("classId");

      if (!targetSchoolId || !sessionId) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      let resolvedLevel = level;
      if (!resolvedLevel && classIdStr) {
        const cls = await readDb.query.schoolClasses.findFirst({
          where: eq(schoolClasses.id, Number(classIdStr)),
          with: { section: true }
        });
        if (cls?.section?.educationalLevel) {
          resolvedLevel = cls.section.educationalLevel;
        }
      }

      const normLevel = resolvedLevel
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      const isPrimaire = normLevel.includes("prim") || normLevel.includes("matern") || normLevel.includes("fonda") || normLevel.includes("elem");
      const isSuperior = normLevel.includes("licence") || normLevel.includes("lmd") || normLevel.includes("master") || normLevel.includes("doc") || normLevel.includes("super") || normLevel.includes("univ");

      let rows = await readDb.query.academicPeriods.findMany({
        where: and(
          eq(academicPeriods.schoolId, targetSchoolId),
          eq(academicPeriods.sessionId, sessionId)
        ),
        orderBy: [sql`id ASC`]
      });

      if (rows.length === 0) {
        rows = await readDb.query.academicPeriods.findMany({
          where: eq(academicPeriods.sessionId, sessionId),
          orderBy: [sql`id ASC`]
        });
      }

      if (rows.length === 0) {
        rows = await readDb.query.academicPeriods.findMany({
          orderBy: [sql`id ASC`]
        });
      }

      let list = rows.map((p) => ({
        id: p.id,
        name: p.name,
        period_type: p.periodType,
        is_active: p.isActive,
        session_id: p.sessionId,
        school_id: p.schoolId,
      }));

      // Smart period filter / fallback by level
      if (isPrimaire) {
        const dbTrim = list.filter(p => p.period_type === "Trimestre" || p.name.toLowerCase().includes("trimestre"));
        if (dbTrim.length > 0) {
          list = dbTrim;
        } else {
          list = [
            { id: 1, name: "1er Trimestre", period_type: "Trimestre", is_active: true, session_id: sessionId, school_id: targetSchoolId },
            { id: 2, name: "2ème Trimestre", period_type: "Trimestre", is_active: true, session_id: sessionId, school_id: targetSchoolId },
            { id: 3, name: "3ème Trimestre", period_type: "Trimestre", is_active: true, session_id: sessionId, school_id: targetSchoolId },
          ];
        }
      } else if (isSuperior) {
        const dbSem = list.filter(p => p.period_type === "Semestre" || p.name.toLowerCase().includes("semest") || /^s\d+/i.test(p.name));
        if (dbSem.length >= 6) {
          list = dbSem;
        } else {
          list = Array.from({ length: 14 }, (_, i) => {
            const num = i + 1;
            const label = `${num === 1 ? "1er" : `${num}ème`} Semestre (S${num})`;
            return {
              id: num,
              name: label,
              period_type: "Semestre",
              is_active: true,
              session_id: sessionId,
              school_id: targetSchoolId,
            };
          });
        }
      } else if (resolvedLevel) {
        const dbSem = list.filter(p => p.period_type === "Semestre" || p.name.toLowerCase().includes("semest"));
        if (dbSem.length >= 2) {
          list = dbSem.slice(0, 2);
        } else {
          list = [
            { id: 1, name: "1er Semestre", period_type: "Semestre", is_active: true, session_id: sessionId, school_id: targetSchoolId },
            { id: 2, name: "2ème Semestre", period_type: "Semestre", is_active: true, session_id: sessionId, school_id: targetSchoolId },
          ];
        }
      }

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getGradingScale") {
      const rows = await readDb.query.gradingAppreciations.findMany({
        orderBy: [sql`display_order ASC`]
      });

      const list = rows.map((r) => ({
        name: r.name,
        base_score: r.baseScore,
        display_order: r.displayOrder,
      }));

      return NextResponse.json({ success: true, data: list });
    }

    if (action === "getGradingGrid") {
      const classId = Number(searchParams.get("classId"));
      const subjectId = Number(searchParams.get("subjectId"));
      const sessionId = Number(searchParams.get("sessionId"));
      const term = searchParams.get("term") || "";
      const targetSchoolId = Number(searchParams.get("schoolId"));

      if (!classId || !subjectId || !sessionId || !targetSchoolId) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      // Fetch class details
      const classRes = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
        with: {
          section: true
        }
      });

      if (!classRes) {
        return mobileJsonError("Classe introuvable", 404);
      }

      const className = classRes.className;
      const level = classRes.section?.educationalLevel || "Lycée";

      // Coefficient from classSubjects
      const subLink = await readDb.query.classSubjects.findFirst({
        where: and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.subjectId, subjectId)
        )
      });
      const coeff = subLink?.coefficient || 1;

      // Active session lookup for student session isolation
      const sessionObj = await readDb.query.schoolSessions.findFirst({
        where: eq(schoolSessions.id, sessionId)
      });
      const sessionNameStr = sessionObj?.sessionName?.trim();

      // Active students for session
      const activeStudents = await readDb.query.students.findMany({
        where: and(
          eq(students.classe, className),
          eq(students.statut, "Actif"),
          eq(students.schoolId, targetSchoolId),
          sessionNameStr
            ? or(eq(students.session, sessionNameStr), isNull(students.session))
            : undefined
        ),
        orderBy: [students.nomEtudiant]
      });

      // Existing results
      const results = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.sessionId, sessionId),
          eq(studentResults.term, term)
        )
      });

      const resultsMap = new Map(results.map((r) => [r.studentId, r]));

      const gridData = activeStudents.map((student) => {
        const res = resultsMap.get(student.id);
        return {
          student_id: student.id,
          num_admission: student.numAdmission,
          nom_etudiant: student.nomEtudiant,
          photo_path: student.photoPath,
          class_work_score: res?.classWorkScore ?? null,
          exam_score: res?.examScore ?? null,
          total_score: res?.totalScore ?? null,
          weighted_score: res?.weightedScore ?? null,
          absences: res?.absences ?? 0,
          observation: res?.observation ?? "",
          appreciation: res?.appreciation ?? "-",
          rank: res?.rank ?? "-",
        };
      });

      return NextResponse.json({
        success: true,
        data: gridData,
        level,
        coefficient: Number(coeff),
      });
    }

    if (action === "getDevoirGrid") {
      const classId = Number(searchParams.get("classId"));
      const subjectId = Number(searchParams.get("subjectId"));
      const sessionId = Number(searchParams.get("sessionId"));
      const term = searchParams.get("term") || "";
      const targetSchoolId = Number(searchParams.get("schoolId"));

      if (!classId || !subjectId || !sessionId || !targetSchoolId) {
        return mobileJsonError("Paramètres manquants", 400);
      }

      if (schoolId && schoolId !== targetSchoolId) {
        return mobileJsonError("Accès refusé", 403);
      }

      const classRes = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId)
      });

      if (!classRes) {
        return mobileJsonError("Classe introuvable", 404);
      }

      const className = classRes.className;

      // Active session lookup for student session isolation
      const sessionObj = await readDb.query.schoolSessions.findFirst({
        where: eq(schoolSessions.id, sessionId)
      });
      const sessionNameStr = sessionObj?.sessionName?.trim();

      // Active students for session
      const activeStudents = await readDb.query.students.findMany({
        where: and(
          eq(students.classe, className),
          eq(students.statut, "Actif"),
          eq(students.schoolId, targetSchoolId),
          sessionNameStr
            ? or(eq(students.session, sessionNameStr), isNull(students.session))
            : undefined
        ),
        orderBy: [students.nomEtudiant]
      });

      // Existing results
      const results = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.sessionId, sessionId),
          eq(studentResults.term, term)
        )
      });

      const resultsMap = new Map(results.map((r) => [r.studentId, r]));

      const gridData = activeStudents.map((student) => {
        const res = resultsMap.get(student.id);
        return {
          student_id: student.id,
          num_admission: student.numAdmission,
          nom_etudiant: student.nomEtudiant,
          photo_path: student.photoPath,
          devoirs: [
            res?.devoir1 ?? null,
            res?.devoir2 ?? null,
            res?.devoir3 ?? null,
            res?.devoir4 ?? null,
            res?.devoir5 ?? null,
          ],
          moyenne_devoirs: res?.moyenneDevoirs ?? 0.0,
        };
      });

      return NextResponse.json({
        success: true,
        data: gridData,
      });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (!action || !payload) {
      return mobileJsonError("Paramètres manquants", 400);
    }

    if (action === "saveStudentGrades") {
      const { grades } = payload;
      if (!grades || !Array.isArray(grades) || grades.length === 0) {
        return mobileJsonError("Notes manquantes", 400);
      }

      const first = grades[0]!;
      const classId = Number(first.class_id);
      const subjectId = Number(first.subject_id);
      const sessionId = Number(first.session_id);
      const term = String(first.term);

      // Verify class belongs to user's school
      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId)
      });
      if (!cls || (schoolId && cls.schoolId !== schoolId)) {
        return mobileJsonError("Accès refusé.", 403);
      }

      // Existing results map
      const existing = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.sessionId, sessionId),
          eq(studentResults.term, term)
        )
      });

      const existingMap = new Map(existing.map((r) => [r.studentId, r.id]));

      await Promise.all(
        grades.map(async (grade: any) => {
          const studentId = Number(grade.student_id);
          const existingId = existingMap.get(studentId);

          const dbValues = {
            studentId,
            subjectId,
            classId,
            sessionId,
            term,
            classWorkScore: grade.class_work_score !== null ? Number(grade.class_work_score) : null,
            examScore: grade.exam_score !== null ? Number(grade.exam_score) : null,
            totalScore: grade.total_score !== null ? Number(grade.total_score) : null,
            coefficient: grade.coefficient !== null ? Number(grade.coefficient) : 1,
            weightedScore: grade.weighted_score !== null ? Number(grade.weighted_score) : null,
            absences: grade.absences ? Number(grade.absences) : 0,
            observation: grade.observation ? String(grade.observation) : null,
            appreciation: grade.appreciation ? String(grade.appreciation) : null,
            rank: grade.rank ? String(grade.rank) : null,
          };

          if (existingId) {
            await db
              .update(studentResults)
              .set(dbValues)
              .where(eq(studentResults.id, existingId));
          } else {
            await db.insert(studentResults).values(dbValues);
          }
        })
      );

      return NextResponse.json({ success: true });
    }

    if (action === "saveDevoirGrades") {
      const { devoirsList } = payload;
      if (!devoirsList || !Array.isArray(devoirsList) || devoirsList.length === 0) {
        return mobileJsonError("Notes de devoirs manquantes", 400);
      }

      const first = devoirsList[0]!;
      const classId = Number(first.class_id);
      const subjectId = Number(first.subject_id);
      const sessionId = Number(first.session_id);
      const term = String(first.term);

      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId)
      });
      if (!cls || (schoolId && cls.schoolId !== schoolId)) {
        return mobileJsonError("Accès refusé.", 403);
      }

      const existing = await readDb.query.studentResults.findMany({
        where: and(
          eq(studentResults.classId, classId),
          eq(studentResults.subjectId, subjectId),
          eq(studentResults.sessionId, sessionId),
          eq(studentResults.term, term)
        )
      });

      const existingMap = new Map(existing.map((r) => [r.studentId, r.id]));

      await Promise.all(
        devoirsList.map(async (row: any) => {
          const studentId = Number(row.student_id);
          const existingId = existingMap.get(studentId);
          const devoirs = row.devoirs as any[];
          const avg = Number(row.moyenne_devoirs);

          const dbValues = {
            studentId,
            subjectId,
            classId,
            sessionId,
            term,
            devoir1: devoirs[0] !== null ? Number(devoirs[0]) : null,
            devoir2: devoirs[1] !== null ? Number(devoirs[1]) : null,
            devoir3: devoirs[2] !== null ? Number(devoirs[2]) : null,
            devoir4: devoirs[3] !== null ? Number(devoirs[3]) : null,
            devoir5: devoirs[4] !== null ? Number(devoirs[4]) : null,
            moyenneDevoirs: avg,
            classWorkScore: avg,
          };

          if (existingId) {
            await db
              .update(studentResults)
              .set(dbValues)
              .where(eq(studentResults.id, existingId));
          } else {
            await db.insert(studentResults).values(dbValues);
          }
        })
      );

      return NextResponse.json({ success: true });
    }

    return mobileJsonError("Action inconnue", 400);
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
