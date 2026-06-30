"use server";

import { db } from "@/infrastructure/database";
import { sql, eq, desc, ilike, or, count, avg, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  graduationProjects,
  graduationDocuments,
  graduationDefenseRooms,
  graduationJuryEvaluations,
  graduationWorkflowLogs,
  graduationArchives,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";

// ─── Inline DB migration (runs on first action call) ──────────────────────────

async function ensureMigrations() {
  try {
    await db.execute(sql`
      ALTER TABLE graduation_projects
        ADD COLUMN IF NOT EXISTS project_code VARCHAR(50),
        ADD COLUMN IF NOT EXISTS summary TEXT,
        ADD COLUMN IF NOT EXISTS keywords VARCHAR(500),
        ADD COLUMN IF NOT EXISTS department VARCHAR(100),
        ADD COLUMN IF NOT EXISTS filiere VARCHAR(100),
        ADD COLUMN IF NOT EXISTS niveau VARCHAR(50),
        ADD COLUMN IF NOT EXISTS language VARCHAR(30) DEFAULT 'Français',
        ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
        ADD COLUMN IF NOT EXISTS rapporteur_id INTEGER,
        ADD COLUMN IF NOT EXISTS secretary_id INTEGER,
        ADD COLUMN IF NOT EXISTS defense_end_time TIMESTAMP,
        ADD COLUMN IF NOT EXISTS defense_duration_mins INTEGER DEFAULT 60,
        ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS mention VARCHAR(50),
        ADD COLUMN IF NOT EXISTS decision VARCHAR(50),
        ADD COLUMN IF NOT EXISTS archive_ref VARCHAR(100),
        ADD COLUMN IF NOT EXISTS archive_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS is_distinguished BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS graduation_documents (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
        school_id INTEGER,
        doc_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_url VARCHAR(1000),
        version VARCHAR(20) DEFAULT 'v1.0',
        uploaded_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS graduation_defense_rooms (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        room_name VARCHAR(100) NOT NULL,
        capacity INTEGER DEFAULT 30,
        equipment TEXT,
        location VARCHAR(255),
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS graduation_jury_evaluations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
        school_id INTEGER,
        science_quality DOUBLE PRECISION,
        methodology DOUBLE PRECISION,
        presentation DOUBLE PRECISION,
        innovation DOUBLE PRECISION,
        questions DOUBLE PRECISION,
        average DOUBLE PRECISION,
        mention VARCHAR(50),
        decision VARCHAR(50),
        jury_comments TEXT,
        evaluated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS graduation_workflow_logs (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
        from_status VARCHAR(50),
        to_status VARCHAR(50),
        changed_at TIMESTAMP DEFAULT NOW(),
        notes TEXT
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS graduation_archives (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
        school_id INTEGER,
        archive_ref VARCHAR(100) NOT NULL,
        qr_code_url VARCHAR(500),
        permanent_link VARCHAR(500),
        report_url VARCHAR(500),
        presentation_url VARCHAR(500),
        code_url VARCHAR(500),
        archived_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.error("[GraduationMigration] Non-fatal:", e);
  }
}

// ─── KPI Stats ────────────────────────────────────────────────────────────────

export async function getGraduationStats() {
  return protectedDbAction("Academics", "canView", async () => {
    await ensureMigrations();
    const schoolId = await getActiveSchoolId();

    const [rows] = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('Validation Finale','Archivage')) AS active_count,
        COUNT(DISTINCT student_id) AS students_count,
        COUNT(DISTINCT supervisor_id) AS supervisors_count,
        COUNT(*) FILTER (WHERE defense_date IS NOT NULL AND status NOT IN ('Validation Finale','Archivage')) AS defenses_planned,
        COUNT(*) FILTER (WHERE status = 'Proposition') AS pending_count,
        COUNT(*) FILTER (WHERE status IN ('Validation Finale','Archivage')) AS validated_count,
        COUNT(*) FILTER (WHERE is_distinguished = true) AS distinguished_count,
        COUNT(*) FILTER (WHERE is_published = true) AS publications_count,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE decision = 'Validé') / NULLIF(COUNT(*) FILTER (WHERE decision IS NOT NULL), 0), 1
        ) AS success_rate,
        ROUND(AVG(grade) FILTER (WHERE grade IS NOT NULL), 2) AS avg_grade
      FROM graduation_projects
      WHERE school_id = ${schoolId}
    `) as any;

    const row = Array.isArray(rows) ? rows[0] : rows;

    return {
      data: {
        activeCount: Number(row?.active_count || 0),
        studentsCount: Number(row?.students_count || 0),
        supervisorsCount: Number(row?.supervisors_count || 0),
        defensesPlanned: Number(row?.defenses_planned || 0),
        pendingCount: Number(row?.pending_count || 0),
        validatedCount: Number(row?.validated_count || 0),
        distinguishedCount: Number(row?.distinguished_count || 0),
        publicationsCount: Number(row?.publications_count || 0),
        successRate: Number(row?.success_rate || 0),
        avgGrade: Number(row?.avg_grade || 0),
      }
    };
  });
}

// ─── Status distribution for donut chart ──────────────────────────────────────

export async function getGraduationStatusDistribution() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT status, COUNT(*) as cnt
      FROM graduation_projects
      WHERE school_id = ${schoolId}
      GROUP BY status
      ORDER BY cnt DESC
    `) as any;
    const list = Array.isArray(rows) ? rows : (rows?.rows || []);
    return { data: list.map((r: any) => ({ status: r.status, count: Number(r.cnt) })) };
  });
}

// ─── Projects CRUD ────────────────────────────────────────────────────────────

export async function getGraduationProjects(filters?: { search?: string; status?: string; department?: string }) {
  return protectedDbAction("Academics", "canView", async () => {
    await ensureMigrations();
    const data = await db.query.graduationProjects.findMany({
      with: {
        student: true,
        supervisor: true,
        president: true,
        examiner: true,
        rapporteur: true,
        secretary: true,
        documents: true,
        evaluations: true,
        archive: true,
      },
      orderBy: desc(graduationProjects.id),
    });
    return { data };
  });
}

export async function saveGraduationProject(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await ensureMigrations();
    const schoolId = await getActiveSchoolId();
    const { id, createdAt, updatedAt, student, supervisor, president, examiner, rapporteur, secretary, documents, evaluations, archive, workflowLogs, ...rest } = data;

    // Parse numeric/date fields
    const fields: any = { ...rest };
    const numericFields = ["studentId", "supervisorId", "presidentId", "examinerId", "rapporteurId", "secretaryId", "progressPercent", "defenseDurationMins"];
    numericFields.forEach(f => {
      if (fields[f] !== undefined && fields[f] !== null && fields[f] !== "") {
        fields[f] = parseInt(fields[f]);
      } else if (fields[f] === "") {
        fields[f] = null;
      }
    });
    if (fields.grade !== undefined && fields.grade !== null && fields.grade !== "") {
      fields.grade = parseFloat(fields.grade);
    }
    if (fields.defenseDate) fields.defenseDate = new Date(fields.defenseDate);
    if (fields.startDate) fields.startDate = new Date(fields.startDate);
    if (fields.endDate) fields.endDate = new Date(fields.endDate);

    let projectId = id;
    const prevStatus = data._prevStatus;

    if (id) {
      await db.update(graduationProjects)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(graduationProjects.id, id));
    } else {
      // Auto-generate project code
      const year = new Date().getFullYear();
      const countRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM graduation_projects WHERE school_id = ${schoolId}`) as any;
      const cnt = Array.isArray(countRes) ? countRes[0]?.cnt : (countRes?.rows?.[0]?.cnt || 0);
      const code = `PFE-${year}-${String(Number(cnt) + 1).padStart(3, "0")}`;
      const inserted = await db.insert(graduationProjects).values({
        ...fields,
        projectCode: code,
        schoolId,
      }).returning({ id: graduationProjects.id });
      projectId = inserted[0]?.id;
    }

    // Log workflow transition
    if (projectId && fields.status && fields.status !== prevStatus) {
      await db.execute(sql`
        INSERT INTO graduation_workflow_logs (project_id, from_status, to_status, changed_at)
        VALUES (${projectId}, ${prevStatus || null}, ${fields.status}, NOW())
      `);
    }

    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true, projectId };
  });
}

export async function deleteGraduationProject(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    await db.delete(graduationProjects).where(eq(graduationProjects.id, id));
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function saveProjectDocument(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, uploadedAt, ...rest } = data;
    if (id) {
      await db.update(graduationDocuments).set(rest).where(eq(graduationDocuments.id, id));
    } else {
      await db.insert(graduationDocuments).values({ ...rest, schoolId });
    }
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

export async function deleteProjectDocument(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    await db.delete(graduationDocuments).where(eq(graduationDocuments.id, id));
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// ─── Defense Rooms ────────────────────────────────────────────────────────────

export async function getDefenseRooms() {
  return protectedDbAction("Academics", "canView", async () => {
    await ensureMigrations();
    const data = await db.query.graduationDefenseRooms.findMany({
      orderBy: desc(graduationDefenseRooms.id),
    });
    return { data };
  });
}

export async function saveDefenseRoom(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, createdAt, ...rest } = data;
    if (id) {
      await db.update(graduationDefenseRooms).set(rest).where(eq(graduationDefenseRooms.id, id));
    } else {
      await db.insert(graduationDefenseRooms).values({ ...rest, schoolId });
    }
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

export async function deleteDefenseRoom(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    await db.delete(graduationDefenseRooms).where(eq(graduationDefenseRooms.id, id));
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// Check for defense room conflict
export async function checkRoomConflict(roomName: string, defenseDate: string, excludeId?: number) {
  return protectedDbAction("Academics", "canView", async () => {
    const dateObj = new Date(defenseDate);
    const windowStart = new Date(dateObj.getTime() - 90 * 60 * 1000); // -90 min
    const windowEnd = new Date(dateObj.getTime() + 90 * 60 * 1000);   // +90 min
    const conflicts = await db.execute(sql`
      SELECT id, title FROM graduation_projects
      WHERE room_name = ${roomName}
        AND defense_date BETWEEN ${windowStart.toISOString()} AND ${windowEnd.toISOString()}
        ${excludeId ? sql`AND id != ${excludeId}` : sql``}
    `) as any;
    const list = Array.isArray(conflicts) ? conflicts : (conflicts?.rows || []);
    return { data: { hasConflict: list.length > 0, conflicts: list } };
  });
}

// ─── Jury Evaluation ──────────────────────────────────────────────────────────

export async function saveJuryEvaluation(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, evaluatedAt, ...rest } = data;

    // Calculate average
    const scores = [rest.scienceQuality, rest.methodology, rest.presentation, rest.innovation, rest.questions].map(Number).filter(n => !isNaN(n));
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    let mention = "Insuffisant";
    if (average >= 16) mention = "Très Bien";
    else if (average >= 14) mention = "Bien";
    else if (average >= 12) mention = "Assez Bien";
    else if (average >= 10) mention = "Passable";

    const fields = { ...rest, average, mention, schoolId };

    if (id) {
      await db.update(graduationJuryEvaluations).set(fields).where(eq(graduationJuryEvaluations.id, id));
    } else {
      await db.insert(graduationJuryEvaluations).values(fields);
    }

    // Update project grade/mention/decision
    if (rest.projectId) {
      await db.update(graduationProjects).set({
        grade: average,
        mention,
        decision: rest.decision || (average >= 10 ? "Validé" : "Refusé"),
        status: "Délibération",
        updatedAt: new Date(),
      }).where(eq(graduationProjects.id, rest.projectId));
    }

    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function archiveProject(projectId: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const year = new Date().getFullYear();

    const countRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM graduation_archives WHERE school_id = ${schoolId}`) as any;
    const cnt = Array.isArray(countRes) ? countRes[0]?.cnt : (countRes?.rows?.[0]?.cnt || 0);
    const archiveRef = `ARCH-${year}-${String(Number(cnt) + 1).padStart(4, "0")}`;
    const permanentLink = `/library/${archiveRef}`;

    await db.insert(graduationArchives).values({
      projectId,
      schoolId,
      archiveRef,
      permanentLink,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(permanentLink)}`,
    });

    await db.update(graduationProjects).set({
      status: "Archivage",
      archiveRef,
      archiveUrl: permanentLink,
      updatedAt: new Date(),
    }).where(eq(graduationProjects.id, projectId));

    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true, archiveRef, permanentLink };
  });
}

// ─── Digital Library Search ───────────────────────────────────────────────────

export async function getDigitalLibrary(search?: string, department?: string) {
  return protectedDbAction("Academics", "canView", async () => {
    const data = await db.query.graduationProjects.findMany({
      where: and(
        eq(graduationProjects.status, "Archivage"),
        search ? or(
          ilike(graduationProjects.title, `%${search}%`),
          ilike(graduationProjects.keywords, `%${search}%`)
        ) : undefined,
        department ? eq(graduationProjects.department, department) : undefined,
      ),
      with: {
        student: true,
        supervisor: true,
        archive: true,
      },
      orderBy: desc(graduationProjects.id),
    });
    return { data };
  });
}

// ─── Student Search ───────────────────────────────────────────────────────────

export async function searchStudentsForGraduation(query: string) {
  return protectedDbAction("Academics", "canView", async () => {
    if (!query || query.trim() === "") return { data: [] };
    const data = await db.query.students.findMany({
      where: or(
        ilike(students.nomEtudiant, `%${query}%`),
        ilike(students.numAdmission, `%${query}%`)
      ),
      limit: 10
    });
    return { data };
  });
}
