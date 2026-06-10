"use server";

import { db } from "@/infrastructure/database";
import { inventoryItems, inventoryAssignments, inventoryCategories } from "@/infrastructure/database/schema/inventory";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export async function getInventoryItems() {
  return protectedDbAction("Inventory", "canView", async () => {
    const data = await db.query.inventoryItems.findMany({
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
    if (id) {
      await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id));
    } else {
      await db.insert(inventoryItems).values(data);
    }
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function getInventoryAssignments() {
  return protectedDbAction("Inventory", "canView", async () => {
    const data = await db.query.inventoryAssignments.findMany({
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
    // 1. Check stock
    const item = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.id, data.itemId)
    });

    if (!item || (item.quantity || 0) < data.assignedQty) {
      return { error: "Stock insuffisant" };
    }

    // 2. Create assignment
    await db.insert(inventoryAssignments).values({
      ...data,
      status: "En possession"
    });

    // 3. Update stock
    await db.update(inventoryItems)
      .set({ quantity: item.quantity! - data.assignedQty })
      .where(eq(inventoryItems.id, data.itemId));

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function returnItem(assignmentId: number) {
  return protectedDbAction("Inventory", "canEdit", async () => {
    const assign = await db.query.inventoryAssignments.findFirst({
      where: eq(inventoryAssignments.id, assignmentId),
      with: { item: true }
    });

    if (!assign || assign.status === "Retourné") return { error: "Déjà retourné" };

    // 1. Mark as returned
    await db.update(inventoryAssignments)
      .set({ status: "Retourné", returnDate: new Date() })
      .where(eq(inventoryAssignments.id, assignmentId));

    // 2. Add back to stock
    await db.update(inventoryItems)
      .set({ quantity: (assign.item?.quantity || 0) + assign.assignedQty })
      .where(eq(inventoryItems.id, assign.itemId!));

    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}

export async function deleteInventoryItem(id: number) {
  return protectedDbAction("Inventory", "canDelete", async () => {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    revalidatePath("/dashboard/inventory");
    return { success: true };
  });
}
