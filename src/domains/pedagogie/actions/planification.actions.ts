"use server";

import { db } from "@/infrastructure/database";
import { pedagogiePlanification } from "@/infrastructure/database/schema/pedagogie";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export type PlanFormData = {
  classId: number;
  subjectId: number;
  employeeId: number;
  typePlan: string; // "Annuel" | "Mensuel" | "Hebdomadaire" | "Officiel"
  periode?: string;
  chapitre: string;
  leconPrevue: string;
  competenceVisee?: string;
  datePrevue?: string;
  statut?: string; // "Planifié" | "En cours" | "Réalisé" | "En retard" | "Reporté"
  observation?: string;
  anneeScolaire?: string;
};

export type PlanFilters = {
  classId?: number;
  subjectId?: number;
  employeeId?: number;
  statut?: string;
  typePlan?: string;
  anneeScolaire?: string;
};

// ─── Initialize table ────────────────────────────────────────────────────────
export async function initPlanificationTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS pedagogie_planifications (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        class_id INTEGER REFERENCES school_classes(id),
        subject_id INTEGER REFERENCES school_subjects(id),
        employee_id INTEGER REFERENCES employees(id),
        type_plan VARCHAR(50) NOT NULL,
        periode VARCHAR(100),
        chapitre VARCHAR(255) NOT NULL,
        lecon_prevue VARCHAR(255) NOT NULL,
        competence_visee TEXT,
        date_prevue DATE,
        statut VARCHAR(30) DEFAULT 'Planifié',
        observation TEXT,
        annee_scolaire VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    return { success: true };
  } catch (e: any) {
    console.error("initPlanificationTable:", e.message);
    return { success: false, error: e.message };
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function createPlanification(data: PlanFormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };
    const schoolId = await getActiveSchoolId();

    const [plan] = await db.insert(pedagogiePlanification).values({
      schoolId,
      classId: data.classId,
      subjectId: data.subjectId,
      employeeId: data.employeeId,
      typePlan: data.typePlan,
      periode: data.periode || null,
      chapitre: data.chapitre,
      leconPrevue: data.leconPrevue,
      competenceVisee: data.competenceVisee || null,
      datePrevue: data.datePrevue || null,
      statut: data.statut || "Planifié",
      observation: data.observation || null,
      anneeScolaire: data.anneeScolaire || null,
    }).returning();

    revalidatePath("/dashboard/pedagogie/planification");
    return { success: true, data: plan };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── READ ────────────────────────────────────────────────────────────────────
export async function getPlanifications(filters: PlanFilters = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé", data: [] };
    const schoolId = await getActiveSchoolId();

    const plans = await db.query.pedagogiePlanification.findMany({
      where: (t, { and: _and, eq: _eq }) => {
        const conds: any[] = [_eq(t.schoolId, schoolId)];
        if (filters.classId) conds.push(_eq(t.classId, filters.classId));
        if (filters.subjectId) conds.push(_eq(t.subjectId, filters.subjectId));
        if (filters.employeeId) conds.push(_eq(t.employeeId, filters.employeeId));
        if (filters.statut) conds.push(_eq(t.statut, filters.statut));
        if (filters.typePlan) conds.push(_eq(t.typePlan, filters.typePlan));
        if (filters.anneeScolaire) conds.push(_eq(t.anneeScolaire, filters.anneeScolaire));
        return _and(...conds);
      },
      with: {
        class: true,
        subject: true,
        employee: true,
      },
      orderBy: (t) => [desc(t.createdAt)],
    });

    return { success: true, data: plans };
  } catch (e: any) {
    return { success: false, error: e.message, data: [] };
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function updatePlanification(id: number, data: Partial<PlanFormData>) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    await db.update(pedagogiePlanification)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pedagogiePlanification.id, id));

    revalidatePath("/dashboard/pedagogie/planification");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function deletePlanification(id: number) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorisé" };

    await db.delete(pedagogiePlanification).where(eq(pedagogiePlanification.id, id));
    revalidatePath("/dashboard/pedagogie/planification");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
