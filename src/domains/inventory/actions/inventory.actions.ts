"use server";

import { db } from "@/infrastructure/database";
import { inventoryItems, inventoryAssignments, inventoryCategories } from "@/infrastructure/database/schema/inventory";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

export async function getInventoryItems() {
  return protectedDbAction("Inventory", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.inventoryItems.findMany({
      where: eq(inventoryItems.schoolId, schoolId),
      with: {
        category: true
      },
      orderBy: [desc(inventoryItems.createdAt)]
    });
    return { data };
  });
}

export async function getInventoryCategories() {
  return protectedDbAction("Inventory", "canView", async () => {
    const data = await db.query.inventoryCategories.findMany();
    return { data };
  });
}

export async function saveInventoryItem(data: any, id?: number) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    const payload = { ...data, schoolId };
    if (id) {
      await db.update(inventoryItems).set(payload).where(and(eq(inventoryItems.id, id), eq(inventoryItems.schoolId, schoolId)));
    } else {
      await db.insert(inventoryItems).values(payload);
    }
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function getInventoryAssignments() {
  return protectedDbAction("Inventory", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { data: [] };
    const data = await db.query.inventoryAssignments.findMany({
      where: eq(inventoryAssignments.schoolId, schoolId),
      with: {
        item: true,
        employee: true
      },
      orderBy: [desc(inventoryAssignments.assignedDate)]
    });
    return { data };
  });
}

export async function assignItem(data: { itemId: number; employeeId: number; assignedQty: number }) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    // 1. Check stock
    const item = await db.query.inventoryItems.findFirst({
      where: and(eq(inventoryItems.id, data.itemId), eq(inventoryItems.schoolId, schoolId))
    });

    if (!item || (item.quantity || 0) < data.assignedQty) {
      return { error: "Stock insuffisant" };
    }

    // 2. Create assignment
    await db.insert(inventoryAssignments).values({
      ...data,
      schoolId,
      status: "En possession"
    });

    // 3. Update stock
    await db.update(inventoryItems)
      .set({ quantity: item.quantity! - data.assignedQty })
      .where(and(eq(inventoryItems.id, data.itemId), eq(inventoryItems.schoolId, schoolId)));

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function returnItem(assignmentId: number) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    const assign = await db.query.inventoryAssignments.findFirst({
      where: and(eq(inventoryAssignments.id, assignmentId), eq(inventoryAssignments.schoolId, schoolId)),
      with: { item: true }
    });

    if (!assign || assign.status === "Retourné") return { error: "Déjà retourné" };

    // 1. Mark as returned
    await db.update(inventoryAssignments)
      .set({ status: "Retourné", returnDate: new Date() })
      .where(and(eq(inventoryAssignments.id, assignmentId), eq(inventoryAssignments.schoolId, schoolId)));

    // 2. Add back to stock
    await db.update(inventoryItems)
      .set({ quantity: (assign.item?.quantity || 0) + assign.assignedQty })
      .where(and(eq(inventoryItems.id, assign.itemId!), eq(inventoryItems.schoolId, schoolId)));

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function deleteInventoryItem(id: number) {
  return protectedDbAction("Inventory", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };
    await db.delete(inventoryItems).where(and(eq(inventoryItems.id, id), eq(inventoryItems.schoolId, schoolId)));
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}
