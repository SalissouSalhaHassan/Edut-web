"use server";

import { db } from "@/infrastructure/database";
import { transportRoutes, transportSubscriptions } from "@/infrastructure/database/schema/transport";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export async function getTransportRoutes() {
  return protectedDbAction("Transport", "canView", async () => {
    const data = await db.query.transportRoutes.findMany();
    return { data };
  });
}

export async function getTransportSubscriptions() {
  return protectedDbAction("Transport", "canView", async () => {
    const data = await db.query.transportSubscriptions.findMany({
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
    if (id) {
      await db.update(transportRoutes).set(data).where(eq(transportRoutes.id, id));
    } else {
      await db.insert(transportRoutes).values(data);
    }
    revalidatePath("/dashboard/transport");
    return { success: true };
  });
}

export async function addSubscription(data: { studentId: number; routeId: number; pickupPoint?: string; startDate: Date }) {
  return protectedDbAction("Transport", "canEdit", async () => {
    await db.insert(transportSubscriptions).values(data);
    revalidatePath("/dashboard/transport");
    return { success: true };
  });
}

export async function removeSubscription(id: number) {
  return protectedDbAction("Transport", "canDelete", async () => {
    await db.delete(transportSubscriptions).where(eq(transportSubscriptions.id, id));
    revalidatePath("/dashboard/transport");
    return { success: true };
  });
}
