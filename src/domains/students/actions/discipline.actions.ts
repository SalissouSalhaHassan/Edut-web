"use server";

import { db } from "@/infrastructure/database";
import { disciplineIncidents, behaviorRewards, counselorNotes } from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { incidentSchema, IncidentFormData } from "../validators/discipline.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType } from "@/domains/auth/services/rbac";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export async function getIncidents() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };

    const data = await db.query.disciplineIncidents.findMany({
      with: {
        student: true,
      },
      orderBy: [desc(disciplineIncidents.date)],
    });

    const filtered = data.filter((inc) => inc.student?.schoolId === schoolId);
    return { data: filtered };
  });
}

export async function createIncident(formData: IncidentFormData) {
  const validation = incidentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, incidentType, severity, description, proposedAction, status } = validation.data;
    
    // Validate target student school
    const studentObj = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!studentObj) {
      return { error: "Étudiant introuvable ou non autorisé." };
    }

    await db.insert(disciplineIncidents).values({
      studentId,
      incidentType,
      severity: severity || "Mineur",
      description: description || null,
      proposedAction: proposedAction || null,
      status: status || "En attente",
      createdBy: "Admin",
    });
    
    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

export async function updateIncident(id: number, formData: IncidentFormData) {
  const validation = incidentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Students", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, incidentType, severity, description, proposedAction, status } = validation.data;
    
    // Check if original incident exists and belongs to the active school
    const existing = await db.query.disciplineIncidents.findFirst({
      where: eq(disciplineIncidents.id, id),
      with: { student: true }
    });
    if (!existing || existing.student?.schoolId !== schoolId) {
      return { error: "Incident introuvable ou non autorisé." };
    }

    // Check if target student belongs to the active school
    const studentObj = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!studentObj) {
      return { error: "Étudiant cible introuvable ou non autorisé." };
    }

    await db.update(disciplineIncidents)
      .set({
        studentId,
        incidentType,
        severity,
        description,
        proposedAction,
        status,
      })
      .where(eq(disciplineIncidents.id, id));
      
    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

export async function deleteIncident(id: number) {
  return protectedDbAction("Students", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const existing = await db.query.disciplineIncidents.findFirst({
      where: eq(disciplineIncidents.id, id),
      with: { student: true }
    });
    if (!existing || existing.student?.schoolId !== schoolId) {
      return { error: "Incident introuvable ou non autorisé." };
    }

    await db.delete(disciplineIncidents).where(eq(disciplineIncidents.id, id));
    revalidatePath("/dashboard/students/discipline");
    return { success: true };
  });
}

// ─── Behavior Rewards Actions ───────────────────────────────────────────────

export async function saveBehaviorReward(data: {
  studentId: number;
  rewardType: string;
  pointsEffect: number;
  reason: string;
  grantedBy?: string;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, rewardType, pointsEffect, reason, grantedBy } = data;

    // Check if target student belongs to the active school
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!student) {
      return { error: "Étudiant introuvable ou non autorisé." };
    }

    // 1. Insert reward
    await db.insert(behaviorRewards).values({
      studentId,
      schoolId: schoolId,
      rewardType,
      pointsEffect,
      reason,
      grantedBy: grantedBy || user.name || "Enseignant",
    });

    // 2. Adjust student behaviorScore
    const currentScore = student.behaviorScore || 0;
    
    await db.update(students)
      .set({ behaviorScore: currentScore + pointsEffect })
      .where(eq(students.id, studentId));

    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}

export async function deleteBehaviorReward(id: number, studentId: number) {
  return protectedDbAction("Students", "canDelete", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    const reward = await db.query.behaviorRewards.findFirst({
      where: and(
        eq(behaviorRewards.id, id),
        eq(behaviorRewards.schoolId, schoolId)
      )
    });

    if (!reward) return { error: "Récompense introuvable ou non autorisée." };

    // Reverse behaviorScore adjustment
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!student) return { error: "Étudiant non autorisé." };

    const currentScore = student.behaviorScore || 0;

    await db.update(students)
      .set({ behaviorScore: Math.max(0, currentScore - reward.pointsEffect) })
      .where(eq(students.id, studentId));

    // Delete record
    await db.delete(behaviorRewards).where(eq(behaviorRewards.id, id));

    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}

export async function getStudentBehaviorRewards(studentId: number) {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId;
    if (!schoolId) return { data: [] };

    // Verify student belongs to school
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!student) return { error: "Étudiant non autorisé." };

    const data = await db.query.behaviorRewards.findMany({
      where: and(
        eq(behaviorRewards.studentId, studentId),
        eq(behaviorRewards.schoolId, schoolId)
      ),
      orderBy: [desc(behaviorRewards.createdAt)]
    });
    return { data };
  });
}

// ─── Counselor Notes Actions ────────────────────────────────────────────────

export async function saveCounselorNote(data: {
  studentId: number;
  noteType: string;
  confidentialContent: string;
  recommendations?: string;
  isSecret?: boolean;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    const { studentId, noteType, confidentialContent, recommendations, isSecret } = data;

    // Double check roles
    const roleType = await getUserRoleType(user);
    const hasCounselorAccess = ["super_admin", "general_director", "level_director"].includes(roleType) || 
      user.role?.roleName?.toLowerCase() === "counselor" || 
      user.role?.roleName?.toLowerCase() === "conseiller";

    if (!hasCounselorAccess) {
      return { error: "Accès refusé. Seuls les conseillers et directeurs peuvent ajouter des notes confidentielles." };
    }

    // Verify student belongs to school
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!student) return { error: "Étudiant non autorisé." };

    await db.insert(counselorNotes).values({
      studentId,
      schoolId: schoolId,
      noteType,
      confidentialContent,
      recommendations: recommendations || null,
      isSecret: isSecret ?? true,
      counselorId: user.id,
    });

    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}

export async function getStudentCounselorNotes(studentId: number) {
  return protectedDbAction("Students", "canView", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId;
    if (!schoolId) return { data: [] };

    const roleType = await getUserRoleType(user);
    const hasCounselorAccess = ["super_admin", "general_director", "level_director"].includes(roleType) || 
      user.role?.roleName?.toLowerCase() === "counselor" || 
      user.role?.roleName?.toLowerCase() === "conseiller";

    if (!hasCounselorAccess) {
      return { error: "Accès refusé. Seuls les conseillers et directeurs ont accès aux notes confidentielles." };
    }

    // Verify student belongs to school
    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!student) return { error: "Étudiant non autorisé." };

    const data = await db.query.counselorNotes.findMany({
      where: and(
        eq(counselorNotes.studentId, studentId),
        eq(counselorNotes.schoolId, schoolId)
      ),
      orderBy: [desc(counselorNotes.createdAt)]
    });
    return { data };
  });
}

export async function deleteCounselorNote(id: number, studentId: number) {
  return protectedDbAction("Students", "canDelete", async (user) => {
    const schoolId = await getActiveSchoolId() || user.schoolId;
    if (!schoolId) return { error: "Aucune école active." };

    const roleType = await getUserRoleType(user);
    const hasCounselorAccess = ["super_admin", "general_director", "level_director"].includes(roleType) || 
      user.role?.roleName?.toLowerCase() === "counselor" || 
      user.role?.roleName?.toLowerCase() === "conseiller";

    if (!hasCounselorAccess) {
      return { error: "Accès refusé." };
    }

    // Verify note and student belong to school
    const note = await db.query.counselorNotes.findFirst({
      where: and(
        eq(counselorNotes.id, id),
        eq(counselorNotes.schoolId, schoolId)
      )
    });
    if (!note) return { error: "Note introuvable ou non autorisée." };

    const student = await db.query.students.findFirst({
      where: and(
        eq(students.id, studentId),
        eq(students.schoolId, schoolId)
      )
    });
    if (!student) return { error: "Étudiant non autorisé." };

    await db.delete(counselorNotes).where(eq(counselorNotes.id, id));
    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}
