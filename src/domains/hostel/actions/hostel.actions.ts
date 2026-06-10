"use server";

import { db } from "@/infrastructure/database";
import { hostelRooms, hostelAllocations } from "@/infrastructure/database/schema/hostel";
import { eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export async function getHostelRooms() {
  return protectedDbAction("Hostel", "canView", async () => {
    const data = await db.query.hostelRooms.findMany();
    return { data };
  });
}

export async function getHostelAllocations() {
  return protectedDbAction("Hostel", "canView", async () => {
    const data = await db.query.hostelAllocations.findMany({
      with: {
        student: true,
        room: true
      }
    });
    return { data };
  });
}

export async function saveHostelRoom(data: any, id?: number) {
  return protectedDbAction("Hostel", "canEdit", async () => {
    if (id) {
      await db.update(hostelRooms).set(data).where(eq(hostelRooms.id, id));
    } else {
      await db.insert(hostelRooms).values(data);
    }
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function allocateRoom(studentId: number, roomId: number) {
  return protectedDbAction("Hostel", "canEdit", async () => {
    const room = await db.query.hostelRooms.findFirst({
      where: eq(hostelRooms.id, roomId)
    });

    if (!room || (room.occupiedBeds || 0) >= room.capacity) {
      return { error: "Chambre complète" };
    }

    // 1. Allocate
    await db.insert(hostelAllocations).values({ studentId, roomId, status: "Occupé" });

    // 2. Update occupancy
    await db.update(hostelRooms)
      .set({ occupiedBeds: (room.occupiedBeds || 0) + 1 })
      .where(eq(hostelRooms.id, roomId));

    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function vacateRoom(allocationId: number) {
  return protectedDbAction("Hostel", "canEdit", async () => {
    const alloc = await db.query.hostelAllocations.findFirst({
      where: eq(hostelAllocations.id, allocationId),
      with: { room: true }
    });

    if (!alloc || alloc.status === "Libéré") return { error: "Déjà libéré" };

    // 1. Mark as vacated
    await db.update(hostelAllocations)
      .set({ status: "Libéré", leaveDate: new Date() })
      .where(eq(hostelAllocations.id, allocationId));

    // 2. Update occupancy
    if (alloc.room) {
      await db.update(hostelRooms)
        .set({ occupiedBeds: Math.max(0, (alloc.room.occupiedBeds || 0) - 1) })
        .where(eq(hostelRooms.id, alloc.roomId!));
    }

    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function deleteHostelRoom(id: number) {
  return protectedDbAction("Hostel", "canDelete", async () => {
    await db.delete(hostelRooms).where(eq(hostelRooms.id, id));
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function deleteHostelAllocation(id: number) {
  return protectedDbAction("Hostel", "canDelete", async () => {
    await db.delete(hostelAllocations).where(eq(hostelAllocations.id, id));
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}
