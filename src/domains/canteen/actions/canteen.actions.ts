"use server";

import { db } from "@/infrastructure/database";
import { canteenItems, studentWallets, canteenTransactions } from "@/infrastructure/database/schema/canteen";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";

export async function getCanteenItems() {
  return protectedDbAction("Canteen", "canView", async () => {
    const data = await db.query.canteenItems.findMany();
    return { data };
  });
}

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
    // Internal call to getStudentWallet needs to be careful if it uses protectedDbAction
    // Actually getStudentWallet is "canView", and recharge is "canEdit", so it's fine.
    // However, calling one Server Action from another is usually not recommended or needs the user session.
    // I'll inline the logic to be safe or ensure it works.
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
    return { success: true, balance: newBalance };
  });
}

export async function processCanteenPurchase(studentId: number, amount: number, itemsDesc: string) {
  return protectedDbAction("Canteen", "canEdit", async () => {
    let wallet = await db.query.studentWallets.findFirst({
      where: eq(studentWallets.studentId, studentId)
    });
    
    if (!wallet) {
      const [newWallet] = await db.insert(studentWallets).values({ studentId, balance: 0 }).returning();
      wallet = newWallet;
    }
    
    if (!wallet) return { error: "Portefeuille introuvable" };
    if ((wallet.balance || 0) < amount) return { error: "Solde insuffisant" };

    // 1. Deduct from wallet
    const newBalance = wallet.balance! - amount;
    await db.update(studentWallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(studentWallets.id, wallet.id));

    // 2. Record transaction
    await db.insert(canteenTransactions).values({
      studentId,
      amount,
      itemsDesc,
      recordedBy: "POS_WEB",
    });

    revalidatePath("/dashboard/canteen");
    return { success: true, balance: newBalance };
  });
}
