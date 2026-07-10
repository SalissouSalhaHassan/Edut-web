"use server";

import { db } from "@/infrastructure/database";
import { transportRoutes, transportSubscriptions } from "@/infrastructure/database/schema/transport";
import { and, eq, ilike, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { students } from "@/infrastructure/database/schema/students";

export async function getTransportRoutes() {
  return protectedDbAction("Transport", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.transportRoutes.findMany({
      where: eq(transportRoutes.schoolId, schoolId),
    });
    return { data };
  });
}

export async function getTransportSubscriptions() {
  return protectedDbAction("Transport", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.transportSubscriptions.findMany({
      where: eq(transportSubscriptions.schoolId, schoolId),
      with: {
        student: true,
        route: true
      }
    });
    return { data };
  });
}

export async function saveTransportRoute(data: any, id?: number) {
  return protectedDbAction("Transport", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    const payload = { ...data, schoolId };
    if (id) {
      await db.update(transportRoutes).set(payload).where(and(eq(transportRoutes.id, id), eq(transportRoutes.schoolId, schoolId)));
    } else {
      await db.insert(transportRoutes).values(payload);
    }
    revalidatePath("/dashboard/transport");
    return { success: true };
  });
}

export async function addSubscription(data: { studentId: number; routeId: number; pickupPoint?: string; startDate: Date }) {
  return protectedDbAction("Transport", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    const [student, route] = await Promise.all([
      db.query.students.findFirst({ where: and(eq(students.id, data.studentId), eq(students.schoolId, schoolId)) }),
      db.query.transportRoutes.findFirst({ where: and(eq(transportRoutes.id, data.routeId), eq(transportRoutes.schoolId, schoolId)) }),
    ]);
    if (!student || !route) return { error: "Accès refusé pour cette école." };

    await db.insert(transportSubscriptions).values({ ...data, schoolId });
    revalidatePath("/dashboard/transport");
    return { success: true };
  });
}

export async function removeSubscription(id: number) {
  return protectedDbAction("Transport", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await db.delete(transportSubscriptions).where(and(eq(transportSubscriptions.id, id), eq(transportSubscriptions.schoolId, schoolId)));
    revalidatePath("/dashboard/transport");
    return { success: true };
  });
}

export async function searchStudentsAction(query: string) {
  return protectedDbAction("Transport", "canView", async () => {
    if (!query || query.trim() === "") return { data: [] };
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.students.findMany({
      where: and(
        eq(students.schoolId, schoolId),
        or(
          ilike(students.nomEtudiant, `%${query}%`),
          ilike(students.numAdmission, `%${query}%`)
        )
      ),
      limit: 10
    });
    return { data };
  });
}
