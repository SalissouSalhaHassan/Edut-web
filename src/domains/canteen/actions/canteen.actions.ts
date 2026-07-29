"use server";

import { db } from "@/infrastructure/database";
import { canteenItems, studentWallets, canteenTransactions, canteenInvoices } from "@/infrastructure/database/schema/canteen";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

// ─── Articles / Products CRUD ──────────────────────────────────────────────────
export async function getCanteenItems() {
  return protectedDbAction("Canteen", "canView", async () => {
    const data = await db.query.canteenItems.findMany({
      orderBy: [desc(canteenItems.id)]
    });
    return { data };
  });
}

export async function createCanteenItem(data: {
  name: string;
  code?: string;
  price: number;
  category?: string;
  stock?: number;
  imageUrl?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    const [newItem] = await db.insert(canteenItems).values({
      name: data.name,
      code: data.code || null,
      price: Number(data.price) || 0,
      category: data.category || "Général",
      stock: Number(data.stock) ?? 100,
      imageUrl: data.imageUrl || null,
    }).returning();

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, data: newItem };
  });
}

export async function updateCanteenItem(id: number, data: {
  name: string;
  code?: string;
  price: number;
  category?: string;
  stock?: number;
  imageUrl?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await db.update(canteenItems)
      .set({
        name: data.name,
        code: data.code || null,
        price: Number(data.price) || 0,
        category: data.category || "Général",
        stock: Number(data.stock) ?? 100,
        imageUrl: data.imageUrl || null,
      })
      .where(eq(canteenItems.id, id));

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true };
  });
}

export async function deleteCanteenItem(id: number) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await db.delete(canteenItems).where(eq(canteenItems.id, id));

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true };
  });
}

// ─── Invoices / Factures CRUD ──────────────────────────────────────────────────
export async function getCanteenInvoices() {
  return protectedDbAction("Canteen", "canView", async () => {
    const data = await db.query.canteenInvoices.findMany({
      orderBy: [desc(canteenInvoices.id)],
      limit: 100,
    });
    return { data };
  });
}

export async function createCanteenInvoice(data: {
  clientName?: string;
  studentId?: number;
  subtotal: number;
  tva?: number;
  totalTtc: number;
  amountReceived?: number;
  changeGiven?: number;
  paymentMethod?: string;
  itemsJson: string;
  cashierName?: string;
}) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const invoiceNumber = `FAC-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    const [newInvoice] = await db.insert(canteenInvoices).values({
      invoiceNumber,
      clientName: data.clientName || "CLIENT COMPTANT",
      studentId: data.studentId || null,
      subtotal: Number(data.subtotal) || 0,
      tva: Number(data.tva) || 0,
      totalTtc: Number(data.totalTtc) || 0,
      amountReceived: Number(data.amountReceived) || 0,
      changeGiven: Number(data.changeGiven) || 0,
      paymentMethod: data.paymentMethod || "Cash",
      itemsJson: data.itemsJson,
      cashierName: data.cashierName || "admin",
      status: "Payée",
    }).returning();

    // Deduct stock for items if possible
    try {
      const items = JSON.parse(data.itemsJson || "[]");
      for (const item of items) {
        if (item.id) {
          const currentItem = await db.query.canteenItems.findFirst({
            where: eq(canteenItems.id, item.id)
          });
          if (currentItem && currentItem.stock) {
            const newStock = Math.max(0, currentItem.stock - (item.quantity || 1));
            await db.update(canteenItems).set({ stock: newStock }).where(eq(canteenItems.id, item.id));
          }
        }
      }
    } catch (e) {
      console.error("Stock update error:", e);
    }

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, data: newInvoice };
  });
}

export async function voidCanteenInvoice(id: number) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    await db.update(canteenInvoices)
      .set({ status: "Annulée" })
      .where(eq(canteenInvoices.id, id));

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true };
  });
}

// ─── Students for Client Selector ─────────────────────────────────────────────
export async function getCanteenStudents() {
  return protectedDbAction("Canteen", "canView", async () => {
    const data = await db.query.students.findMany({
      limit: 100,
      columns: {
        id: true,
        nomEtudiant: true,
        numAdmission: true,
        classe: true,
      }
    });
    return { data };
  });
}

// ─── Student Wallet Actions ───────────────────────────────────────────────────
export async function getStudentWallet(studentId: number) {
  return protectedDbAction("Canteen", "canView", async () => {
    let wallet = await db.query.studentWallets.findFirst({
      where: eq(studentWallets.studentId, studentId)
    });
    
    if (!wallet) {
      const [newWallet] = await db.insert(studentWallets).values({ studentId, balance: 0 }).returning();
      wallet = newWallet;
    }
    
    return { data: wallet };
  });
}

export async function rechargeWallet(studentId: number, amount: number) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    let wallet = await db.query.studentWallets.findFirst({
      where: eq(studentWallets.studentId, studentId)
    });
    
    if (!wallet) {
      const [newWallet] = await db.insert(studentWallets).values({ studentId, balance: 0 }).returning();
      wallet = newWallet;
    }
    
    if (!wallet) return { error: "Portefeuille introuvable" };

    const newBalance = (wallet.balance || 0) + amount;
    await db.update(studentWallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(studentWallets.id, wallet.id));

    revalidatePath("/dashboard/canteen");
    revalidatePath("/dashboard/pos");
    return { success: true, balance: newBalance };
  });
}
