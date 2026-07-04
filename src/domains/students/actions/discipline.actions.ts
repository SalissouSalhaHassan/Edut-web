"use server";

import { db } from "@/infrastructure/database";
import { disciplineIncidents, behaviorRewards, counselorNotes } from "@/infrastructure/database/schema/discipline";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { incidentSchema, IncidentFormData } from "../validators/discipline.schema";
import { protectedDbAction } from "@/lib/protected-action";
import { getUserRoleType } from "@/domains/auth/services/rbac";

export async function getIncidents() {
  return protectedDbAction("Students", "canView", async () => {
    const data = await db.query.disciplineIncidents.findMany({
      with: {
        student: true,
      },
      orderBy: [desc(disciplineIncidents.date)],
    });
    return { data };
  });
}

export async function createIncident(formData: IncidentFormData) {
  const validation = incidentSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || "Erreur de validation" };
  }

  return protectedDbAction("Students", "canEdit", async () => {
    const { studentId, incidentType, severity, description, proposedAction, status } = validation.data;
    
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
    const { studentId, incidentType, severity, description, proposedAction, status } = validation.data;
    
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
    const { studentId, rewardType, pointsEffect, reason, grantedBy } = data;

    // 1. Insert reward
    await db.insert(behaviorRewards).values({
      studentId,
      schoolId: user.schoolId,
      rewardType,
      pointsEffect,
      reason,
      grantedBy: grantedBy || user.name || "Enseignant",
    });

    // 2. Adjust student behaviorScore
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId)
    });
    const currentScore = student?.behaviorScore || 0;
    
    await db.update(students)
      .set({ behaviorScore: currentScore + pointsEffect })
      .where(eq(students.id, studentId));

    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}

export async function deleteBehaviorReward(id: number, studentId: number) {
  return protectedDbAction("Students", "canDelete", async () => {
    const reward = await db.query.behaviorRewards.findFirst({
      where: eq(behaviorRewards.id, id)
    });

    if (!reward) return { error: "Récompense introuvable." };

    // Reverse behaviorScore adjustment
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId)
    });
    const currentScore = student?.behaviorScore || 0;

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
    const data = await db.query.behaviorRewards.findMany({
      where: and(
        eq(behaviorRewards.studentId, studentId),
        eq(behaviorRewards.schoolId, user.schoolId)
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
    const { studentId, noteType, confidentialContent, recommendations, isSecret } = data;

    // Double check roles
    const roleType = await getUserRoleType(user);
    const hasCounselorAccess = ["super_admin", "general_director", "level_director"].includes(roleType) || 
      user.role?.roleName?.toLowerCase() === "counselor" || 
      user.role?.roleName?.toLowerCase() === "conseiller";

    if (!hasCounselorAccess) {
      return { error: "Accès refusé. Seuls les conseillers et directeurs peuvent ajouter des notes confidentielles." };
    }

    await db.insert(counselorNotes).values({
      studentId,
      schoolId: user.schoolId,
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
    const roleType = await getUserRoleType(user);
    const hasCounselorAccess = ["super_admin", "general_director", "level_director"].includes(roleType) || 
      user.role?.roleName?.toLowerCase() === "counselor" || 
      user.role?.roleName?.toLowerCase() === "conseiller";

    if (!hasCounselorAccess) {
      return { error: "Accès refusé. Seuls les conseillers et directeurs ont accès aux notes confidentielles." };
    }

    const data = await db.query.counselorNotes.findMany({
      where: and(
        eq(counselorNotes.studentId, studentId),
        eq(counselorNotes.schoolId, user.schoolId)
      ),
      orderBy: [desc(counselorNotes.createdAt)]
    });
    return { data };
  });
}

export async function deleteCounselorNote(id: number, studentId: number) {
  return protectedDbAction("Students", "canDelete", async (user) => {
    const roleType = await getUserRoleType(user);
    const hasCounselorAccess = ["super_admin", "general_director", "level_director"].includes(roleType) || 
      user.role?.roleName?.toLowerCase() === "counselor" || 
      user.role?.roleName?.toLowerCase() === "conseiller";

    if (!hasCounselorAccess) {
      return { error: "Accès refusé." };
    }

    await db.delete(counselorNotes).where(eq(counselorNotes.id, id));
    revalidatePath(`/dashboard/students/${studentId}/profile`);
    return { success: true };
  });
}
