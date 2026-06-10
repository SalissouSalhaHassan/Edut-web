"use server";

import { db } from "@/infrastructure/database";
import { visitors, admissionEnquiries, postalDispatch } from "@/infrastructure/database/schema/front_office";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { visitorSchema, enquirySchema, postalSchema, VisitorFormData, EnquiryFormData, PostalFormData } from "../validators/front-office.schema";
import { protectedDbAction } from "@/lib/protected-action";

// --- Visitors ---
export async function getVisitors() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const data = await db.query.visitors.findMany({
      orderBy: [desc(visitors.date)]
    });
    return { data };
  });
}

export async function saveVisitor(formData: VisitorFormData, id?: number) {
  const validation = visitorSchema.safeParse(formData);
  if (!validation.success) return { error: validation.error.message };

  return protectedDbAction("FrontOffice", "canEdit", async () => {
    if (id) {
      await db.update(visitors).set(validation.data).where(eq(visitors.id, id));
    } else {
      await db.insert(visitors).values(validation.data);
    }
    revalidatePath("/dashboard/front-office");
    return { success: true };
  });
}

export async function checkoutVisitor(id: number) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const timeOut = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    await db.update(visitors).set({ timeOut }).where(eq(visitors.id, id));
    revalidatePath("/dashboard/front-office");
    return { success: true };
  });
}

// --- Enquiries ---
export async function getEnquiries() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const data = await db.query.admissionEnquiries.findMany({
      orderBy: [desc(admissionEnquiries.date)]
    });
    return { data };
  });
}

export async function saveEnquiry(formData: EnquiryFormData, id?: number) {
  const validation = enquirySchema.safeParse(formData);
  if (!validation.success) return { error: validation.error.message };

  return protectedDbAction("FrontOffice", "canEdit", async () => {
    if (id) {
      await db.update(admissionEnquiries).set(validation.data).where(eq(admissionEnquiries.id, id));
    } else {
      await db.insert(admissionEnquiries).values(validation.data);
    }
    revalidatePath("/dashboard/front-office");
    return { success: true };
  });
}

// --- Postal ---
export async function getPostalRecords() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const data = await db.query.postalDispatch.findMany({
      orderBy: [desc(postalDispatch.date)]
    });
    return { data };
  });
}

export async function savePostal(formData: PostalFormData, id?: number) {
  const validation = postalSchema.safeParse(formData);
  if (!validation.success) return { error: validation.error.message };

  return protectedDbAction("FrontOffice", "canEdit", async () => {
    if (id) {
      await db.update(postalDispatch).set(validation.data).where(eq(postalDispatch.id, id));
    } else {
      await db.insert(postalDispatch).values(validation.data);
    }
    revalidatePath("/dashboard/front-office");
    return { success: true };
  });
}
export async function deleteVisitor(id: number) {
  return protectedDbAction("FrontOffice", "canDelete", async () => {
    await db.delete(visitors).where(eq(visitors.id, id));
    revalidatePath("/dashboard/front-office");
    return { success: true };
  });
}

export async function deleteEnquiry(id: number) {
  return protectedDbAction("FrontOffice", "canDelete", async () => {
    await db.delete(admissionEnquiries).where(eq(admissionEnquiries.id, id));
    revalidatePath("/dashboard/front-office");
    return { success: true };
  });
}

export async function deletePostal(id: number) {
  return protectedDbAction("FrontOffice", "canDelete", async () => {
    await db.delete(postalDispatch).where(eq(postalDispatch.id, id));
    revalidatePath("/dashboard/front-office");
    return { success: true };
  });
}
