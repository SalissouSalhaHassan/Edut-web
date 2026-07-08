"use server";

import { db } from "@/infrastructure/database";
import { resultsWorkflows } from "@/infrastructure/database/schema/academics";
import { auditLogs } from "@/infrastructure/database/schema/audit";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getTeacherEmployee } from "@/domains/auth/services/rbac";
import { protectedDbAction } from "@/lib/protected-action";

export async function initResultsWorkflowTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS results_workflows (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        session_id INTEGER REFERENCES school_sessions(id) ON DELETE CASCADE,
        period VARCHAR(100) NOT NULL,
        class_id INTEGER REFERENCES school_classes(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES school_subjects(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'BROUILLON',
        submitted_by INTEGER REFERENCES employees(id),
        submitted_at TIMESTAMP,
        controlled_by INTEGER REFERENCES employees(id),
        controlled_at TIMESTAMP,
        validated_by INTEGER REFERENCES employees(id),
        validated_at TIMESTAMP,
        locked_by INTEGER REFERENCES employees(id),
        locked_at TIMESTAMP,
        published_by INTEGER REFERENCES employees(id),
        published_at TIMESTAMP,
        observation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initResultsWorkflowTable:", e.message);
    return { success: false, error: e.message };
  }
}

async function writeAuditLog(user: any, action: string, recordId: string, newData: any) {
  try {
    const schoolId = user?.schoolId || await getActiveSchoolId();
    await db.insert(auditLogs).values({
      schoolId,
      userId: user?.id || null,
      action,
      tableName: "results_workflows",
      recordId,
      newData: JSON.stringify(newData),
      ipAddress: "127.0.0.1",
      userAgent: "Server Action",
    });
  } catch (err) {
    console.error("writeAuditLog error:", err);
  }
}

// Helper to upsert a workflow status row
async function setWorkflowStatus(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  status: string;
  observation?: string;
  updateFields: any;
}) {
  await initResultsWorkflowTable();
  const schoolId = await getActiveSchoolId();

  const conds = [
    eq(resultsWorkflows.schoolId, schoolId),
    eq(resultsWorkflows.sessionId, params.sessionId),
    eq(resultsWorkflows.period, params.period),
    eq(resultsWorkflows.classId, params.classId),
  ];

  if (params.subjectId) {
    conds.push(eq(resultsWorkflows.subjectId, params.subjectId));
  }

  const existing = await db.query.resultsWorkflows.findFirst({
    where: and(...conds),
  });

  const dbValues = {
    schoolId,
    sessionId: params.sessionId,
    period: params.period,
    classId: params.classId,
    subjectId: params.subjectId || null,
    teacherId: params.teacherId || null,
    status: params.status,
    observation: params.observation || null,
    updatedAt: new Date(),
    ...params.updateFields,
  };

  if (existing) {
    await db.update(resultsWorkflows).set(dbValues).where(eq(resultsWorkflows.id, existing.id));
  } else {
    await db.insert(resultsWorkflows).values(dbValues);
  }

  revalidatePath("/dashboard/academics/grades");
  return { success: true };
}

// 1. Submit Grades (SAISIE_TERMINEE)
export async function submitGrades(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const emp = await getTeacherEmployee(user);
    const empId = emp?.id || null;

    const res = await setWorkflowStatus({
      ...params,
      status: "SAISIE_TERMINEE",
      updateFields: {
        submittedBy: empId,
        submittedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "SUBMIT_GRADES", `class-${params.classId}`, { ...params, status: "SAISIE_TERMINEE" });
    }
    return res;
  });
}

// 2. Request Correction (CORRECTION_DEMANDEE)
export async function requestGradeCorrection(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const res = await setWorkflowStatus({
      ...params,
      status: "CORRECTION_DEMANDEE",
      updateFields: {},
    });

    if (res.success) {
      await writeAuditLog(user, "REQUEST_CORRECTION", `class-${params.classId}`, { ...params, status: "CORRECTION_DEMANDEE" });
    }
    return res;
  });
}

// 3. Validate Grade Control (CONTROLE_PEDAGOGIQUE)
export async function validateGradeControl(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const emp = await getTeacherEmployee(user);
    const empId = emp?.id || null;

    const res = await setWorkflowStatus({
      ...params,
      status: "CONTROLE_PEDAGOGIQUE",
      updateFields: {
        controlledBy: empId,
        controlledAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "VALIDATE_CONTROL", `class-${params.classId}`, { ...params, status: "CONTROLE_PEDAGOGIQUE" });
    }
    return res;
  });
}

// 4. Validate Class Council (VALIDATION_CONSEIL)
export async function validateClassCouncil(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const emp = await getTeacherEmployee(user);
    const empId = emp?.id || null;

    const res = await setWorkflowStatus({
      ...params,
      status: "VALIDATION_CONSEIL",
      updateFields: {
        validatedBy: empId,
        validatedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "VALIDATE_COUNCIL", `class-${params.classId}`, { ...params, status: "VALIDATION_CONSEIL" });
    }
    return res;
  });
}

// 5. Lock Results (VERROUILLE)
export async function lockResults(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const emp = await getTeacherEmployee(user);
    const empId = emp?.id || null;

    const res = await setWorkflowStatus({
      ...params,
      status: "VERROUILLE",
      updateFields: {
        lockedBy: empId,
        lockedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "LOCK_RESULTS", `class-${params.classId}`, { ...params, status: "VERROUILLE" });
    }
    return res;
  });
}

// 6. Publish Results (PUBLIE)
export async function publishResults(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const emp = await getTeacherEmployee(user);
    const empId = emp?.id || null;

    const res = await setWorkflowStatus({
      ...params,
      status: "PUBLIE",
      updateFields: {
        publishedBy: empId,
        publishedAt: new Date(),
      },
    });

    if (res.success) {
      await writeAuditLog(user, "PUBLISH_RESULTS", `class-${params.classId}`, { ...params, status: "PUBLIE" });
    }
    return res;
  });
}

// 7. Archive Results Status (ARCHIVE)
export async function archiveResultsStatus(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const res = await setWorkflowStatus({
      ...params,
      status: "ARCHIVE",
      updateFields: {},
    });

    if (res.success) {
      await writeAuditLog(user, "ARCHIVE_STATUS", `class-${params.classId}`, { ...params, status: "ARCHIVE" });
    }
    return res;
  });
}

// 8. Exceptional Unlock (BROUILLON) for Super Admin
export async function unlockResultsException(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
  teacherId?: number;
  observation?: string;
}) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const res = await setWorkflowStatus({
      ...params,
      status: "BROUILLON",
      updateFields: {
        lockedBy: null,
        lockedAt: null,
        publishedBy: null,
        publishedAt: null,
      },
    });

    if (res.success) {
      await writeAuditLog(user, "EXCEPTIONAL_UNLOCK_RESULTS", `class-${params.classId}`, { ...params, status: "BROUILLON" });
    }
    return res;
  });
}

// Get active results workflow status
export async function getResultsWorkflowStatus(params: {
  sessionId: number;
  period: string;
  classId: number;
  subjectId?: number;
}) {
  return protectedDbAction("Academics", "canView", async () => {
    await initResultsWorkflowTable();
    const schoolId = await getActiveSchoolId();

    const conds = [
      eq(resultsWorkflows.schoolId, schoolId),
      eq(resultsWorkflows.sessionId, params.sessionId),
      eq(resultsWorkflows.period, params.period),
      eq(resultsWorkflows.classId, params.classId),
    ];

    if (params.subjectId) {
      conds.push(eq(resultsWorkflows.subjectId, params.subjectId));
    }

    const row = await db.query.resultsWorkflows.findFirst({
      where: and(...conds),
      with: {
        teacher: true,
      }
    });

    return { data: row || null };
  });
}
