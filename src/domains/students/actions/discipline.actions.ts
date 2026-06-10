"use server";

import { db } from "@/infrastructure/database";
import { disciplineIncidents } from "@/infrastructure/database/schema/discipline";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { incidentSchema, IncidentFormData } from "../validators/discipline.schema";
import { protectedDbAction } from "@/lib/protected-action";

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
