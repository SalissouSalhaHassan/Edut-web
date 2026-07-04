"use server";

import { db } from "@/infrastructure/database";
import { hostelRooms, hostelAllocations } from "@/infrastructure/database/schema/hostel";
import { eq, desc, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export async function getHostelRooms() {
  return protectedDbAction("Hostel", "canView", async (user) => {
    const data = await db.query.hostelRooms.findMany({
      where: eq(hostelRooms.schoolId, user.schoolId)
    });
    return { data };
  });
}

export async function getHostelAllocations() {
  return protectedDbAction("Hostel", "canView", async (user) => {
    const data = await db.query.hostelAllocations.findMany({
      where: eq(hostelAllocations.schoolId, user.schoolId),
      with: {
        student: true,
        room: true
      }
    });
    return { data };
  });
}

export async function saveHostelRoom(data: any, id?: number) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const payload = {
      ...data,
      schoolId: user.schoolId
    };
    if (id) {
      await db.update(hostelRooms).set(payload).where(eq(hostelRooms.id, id));
    } else {
      await db.insert(hostelRooms).values(payload);
    }
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function allocateRoom(studentId: number, roomId: number) {
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const room = await db.query.hostelRooms.findFirst({
      where: eq(hostelRooms.id, roomId)
    });

    if (!room) {
      return { error: "Chambre introuvable" };
    }

    // Count active allocations for this room to determine occupancy
    const activeAllocations = await db.query.hostelAllocations.findMany({
      where: and(
        eq(hostelAllocations.roomId, roomId),
        eq(hostelAllocations.status, "Occupé")
      )
    });

    if (activeAllocations.length >= (room.capacity || 1)) {
      return { error: "Chambre complète" };
    }

    // Allocate
    await db.insert(hostelAllocations).values({ 
      studentId, 
      roomId, 
      status: "Occupé",
      joinDate: new Date(),
      schoolId: user.schoolId
    });

    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function vacateRoom(allocationId: number) {
  return protectedDbAction("Hostel", "canEdit", async () => {
    const alloc = await db.query.hostelAllocations.findFirst({
      where: eq(hostelAllocations.id, allocationId),
    });

    if (!alloc || alloc.status === "Libéré") return { error: "Déjà libéré" };

    // Mark as vacated
    await db.update(hostelAllocations)
      .set({ status: "Libéré", leaveDate: new Date() })
      .where(eq(hostelAllocations.id, allocationId));

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
