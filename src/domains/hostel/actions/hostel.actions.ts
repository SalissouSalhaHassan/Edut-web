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
      await db.update(hostelRooms).set(payload).where(and(eq(hostelRooms.id, id), eq(hostelRooms.schoolId, user.schoolId)));
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
      where: and(eq(hostelRooms.id, roomId), eq(hostelRooms.schoolId, user.schoolId))
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
  return protectedDbAction("Hostel", "canEdit", async (user) => {
    const alloc = await db.query.hostelAllocations.findFirst({
      where: and(eq(hostelAllocations.id, allocationId), eq(hostelAllocations.schoolId, user.schoolId)),
    });

    if (!alloc || alloc.status === "Libéré") return { error: "Déjà libéré" };

    // Mark as vacated
    await db.update(hostelAllocations)
      .set({ status: "Libéré", leaveDate: new Date() })
      .where(and(eq(hostelAllocations.id, allocationId), eq(hostelAllocations.schoolId, user.schoolId)));

    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function deleteHostelRoom(id: number) {
  return protectedDbAction("Hostel", "canDelete", async (user) => {
    await db.delete(hostelRooms).where(and(eq(hostelRooms.id, id), eq(hostelRooms.schoolId, user.schoolId)));
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}

export async function deleteHostelAllocation(id: number) {
  return protectedDbAction("Hostel", "canDelete", async (user) => {
    await db.delete(hostelAllocations).where(and(eq(hostelAllocations.id, id), eq(hostelAllocations.schoolId, user.schoolId)));
    revalidatePath("/dashboard/hostel");
    return { success: true };
  });
}
