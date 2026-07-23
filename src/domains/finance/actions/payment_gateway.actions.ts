"use server";

import { db } from "@/infrastructure/database";
import { onlineTransactions, feePayments, cogesPayments, studentFees, syscohadaAccounts, syscohadaEntries } from "@/infrastructure/database/schema/finance";
import { getCurrentUser } from "@/domains/auth/services/session";
import { protectedDbAction } from "@/domains/auth/utils/protected-action";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface InitiatePaymentParams {
  studentId?: number;
  feeId?: number;
  amount: number;
  provider: "ORANGE_MONEY" | "MOOV_MONEY" | "WAVE" | "BANK_CARD" | "CINETPAY";
  phoneNumber?: string;
  purpose: "Scolarité" | "Inscription" | "COGES" | "Autre";
}

/**
 * Initiate an online / mobile money payment transaction
 */
export async function initiateMobilePayment(params: InitiatePaymentParams) {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    const txnRef = `TXN-${params.provider.substring(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [newTxn] = await db.insert(onlineTransactions).values({
      schoolId,
      studentId: params.studentId,
      feeId: params.feeId,
      transactionReference: txnRef,
      provider: params.provider,
      amount: params.amount,
      currency: "XOF",
      phoneNumber: params.phoneNumber,
      purpose: params.purpose,
      status: "PENDING",
      providerTransactionId: `EXT-${Date.now()}`,
    }).returning();

    // Simulated payment URL for Web / Mobile Checkout redirect
    const payUrl = `/dashboard/finance/syscohada?checkout=${newTxn.id}&ref=${txnRef}&amount=${params.amount}&provider=${params.provider}`;

    return {
      success: true,
      data: {
        transaction: newTxn,
        payUrl,
        message: `Transaction ${txnRef} initialisée avec succès via ${params.provider}`
      }
    };
  });
}

/**
 * Confirm / Process payment completion (Webhook or Manual Callback verification)
 */
export async function confirmMobilePayment(transactionId: number, status: "SUCCESS" | "FAILED" = "SUCCESS") {
  return protectedDbAction("Finance", "canEdit", async (user) => {
    const schoolId = user.schoolId;
    if (!schoolId) return { success: false, error: "School context missing" };

    const [txn] = await db.select().from(onlineTransactions).where(
      and(eq(onlineTransactions.id, transactionId), eq(onlineTransactions.schoolId, schoolId))
    );

    if (!txn) return { success: false, error: "Transaction non trouvée" };
    if (txn.status === "SUCCESS") return { success: true, message: "Transaction déjà validée" };

    // Update transaction status
    await db.update(onlineTransactions).set({
      status,
      updatedAt: new Date()
    }).where(eq(onlineTransactions.id, transactionId));

    if (status === "SUCCESS") {
      const receiptNo = `REC-MOB-${Date.now().toString().slice(-6)}`;

      // 1. If linked to Student Fee, record payment
      if (txn.feeId) {
        const [fee] = await db.select().from(studentFees).where(eq(studentFees.id, txn.feeId));
        if (fee) {
          await db.insert(feePayments).values({
            schoolId,
            feeId: txn.feeId,
            amount: txn.amount,
            reduction: 0,
            datePaid: new Date(),
            paymentMode: `Mobile Money (${txn.provider})`,
            reference: txn.transactionReference,
            recordedBy: user.email || "Système Mobile Money"
          });

          // Update student fee totals
          const newPaid = (fee.totalPaid || 0) + txn.amount;
          const newBalance = Math.max(0, fee.totalExpected - newPaid - (fee.totalReduction || 0));
          const newStatus = newBalance === 0 ? "Soldé" : "Partiel";

          await db.update(studentFees).set({
            totalPaid: newPaid,
            balance: newBalance,
            status: newStatus
          }).where(eq(studentFees.id, txn.feeId));
        }
      } 
      // 2. If COGES Purpose, record in COGES Payments
      else if (txn.purpose === "COGES") {
        await db.insert(cogesPayments).values({
          schoolId,
          receiptNumber: receiptNo,
          studentId: txn.studentId || undefined,
          amount: txn.amount,
          receivedFrom: txn.phoneNumber || "Payeur Mobile",
          purpose: "Cotisation COGES (Mobile Money)",
          recordedBy: user.email || "Système Mobile Money",
          status: "Validé"
        });
      }

      // 3. Post Automatic SYSCOHADA Ledger Entry (512000 Banque/Mobile ↔ 706000 Prestations)
      try {
        const [bankAccount] = await db.select().from(syscohadaAccounts).where(
          and(eq(syscohadaAccounts.schoolId, schoolId), eq(syscohadaAccounts.accountNumber, "512000"))
        );
        const [revenueAccount] = await db.select().from(syscohadaAccounts).where(
          and(eq(syscohadaAccounts.schoolId, schoolId), eq(syscohadaAccounts.accountNumber, "706000"))
        );

        if (bankAccount && revenueAccount) {
          // Debit Bank/Mobile Money Account (512000)
          await db.insert(syscohadaEntries).values({
            schoolId,
            reference: txn.transactionReference,
            accountId: bankAccount.id,
            label: `Paiement ${txn.purpose} via ${txn.provider} - Ref: ${txn.transactionReference}`,
            debit: txn.amount,
            credit: 0,
            recordedBy: user.email || "Automatique"
          });

          // Credit Revenue Account (706000)
          await db.insert(syscohadaEntries).values({
            schoolId,
            reference: txn.transactionReference,
            accountId: revenueAccount.id,
            label: `Produit ${txn.purpose} via ${txn.provider}`,
            debit: 0,
            credit: txn.amount,
            recordedBy: user.email || "Automatique"
          });
        }
      } catch (e) {
        console.error("Erreur lors de la génération de l'écriture SYSCOHADA:", e);
      }
    }

    revalidatePath("/dashboard/finance/syscohada");
    return { success: true, message: `Paiement de ${txn.amount} FCFA confirmé avec succès!` };
  });
}

/**
 * Fetch all online transactions for school admin dashboard
 */
export async function getOnlineTransactions() {
  return protectedDbAction("Finance", "canView", async (user) => {
    const schoolId = user.schoolId;
    if (!schoolId) return { success: true, data: [] };

    const transactions = await db.select()
      .from(onlineTransactions)
      .where(eq(onlineTransactions.schoolId, schoolId))
      .orderBy(desc(onlineTransactions.createdAt));

    return { success: true, data: transactions };
  });
}
