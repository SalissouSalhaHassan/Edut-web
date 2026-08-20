import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, readDb } from "@/infrastructure/database";
import { studentFees, feePayments } from "@/infrastructure/database/schema/finance";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action !== "getFeePayments") {
    return mobileJsonError("Action non supportée ou manquante", 400);
  }

  const feeId = Number(searchParams.get("feeId"));
  if (!feeId) {
    return mobileJsonError("feeId manquant", 400);
  }

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  try {
    const fee = await readDb
      .select({
        schoolId: studentFees.schoolId,
        studentId: studentFees.studentId,
      })
      .from(studentFees)
      .where(eq(studentFees.id, feeId))
      .limit(1);

    if (fee.length === 0) {
      return mobileJsonError("Frais de scolarité introuvables", 404);
    }

    if (schoolId && fee[0].schoolId !== schoolId) {
      return mobileJsonError("Accès refusé", 403);
    }

    if ((roleType === "parent" || roleType === "eleve") && user.studentId !== fee[0].studentId) {
      return mobileJsonError("Accès refusé. Ce dossier ne vous appartient pas.", 403);
    }

    const payments = await readDb
      .select({
        id: feePayments.id,
        school_id: feePayments.schoolId,
        fee_id: feePayments.feeId,
        amount: feePayments.amount,
        reduction: feePayments.reduction,
        date_paid: feePayments.datePaid,
        month_concerned: feePayments.monthConcerned,
        payment_mode: feePayments.paymentMode,
        reference: feePayments.reference,
        recorded_by: feePayments.recordedBy,
      })
      .from(feePayments)
      .where(eq(feePayments.feeId, feeId))
      .orderBy(desc(feePayments.datePaid));

    const list = payments.map((p) => ({
      id: p.id,
      school_id: p.school_id,
      fee_id: p.fee_id,
      amount: p.amount,
      reduction: p.reduction,
      date_paid: p.date_paid?.toISOString() || null,
      month_concerned: p.month_concerned,
      payment_mode: p.payment_mode,
      reference: p.reference,
      recorded_by: p.recorded_by,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    console.error("[Payments GET Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  // Allow all administrative and financial roles
  const hasAccess = [
    "admin",
    "super_admin",
    "director",
    "directeur",
    "general_director",
    "level_director",
    "level_comptable",
    "level_caissier",
    "comptable",
    "caissier",
    "staff",
  ].includes(roleType) ||
    user.permissions?.includes("finance.collect") ||
    user.permissions?.includes("finance.view");

  if (!hasAccess) {
    return mobileJsonError("Accès refusé. Seuls les administrateurs et comptables peuvent enregistrer des paiements.", 403);
  }

  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action !== "recordPayment" || !payload) {
      return mobileJsonError("Action non supportée ou payload manquant", 400);
    }

    const {
      feeId,
      schoolId: targetSchoolId,
      amount,
      reduction,
      paymentMode,
      reference,
      monthConcerned,
      recordedBy,
      currentPaid,
      currentReduction,
      totalExpected,
    } = payload;

    if (!feeId || !targetSchoolId) {
      return mobileJsonError("Paramètres manquants dans le payload", 400);
    }

    if (schoolId && schoolId !== targetSchoolId) {
      return mobileJsonError("Accès refusé", 403);
    }

    const doubleAmount = Number(amount || 0);
    const doubleReduction = Number(reduction || 0);

    const newPaid = Number(currentPaid || 0) + doubleAmount;
    const newReduction = Number(currentReduction || 0) + doubleReduction;
    const newBalance = Number(totalExpected || 0) - newPaid - newReduction;

    let newStatus = "Impayé";
    if (newBalance <= 0) {
      newStatus = "Soldé";
    } else if (newPaid > 0) {
      newStatus = "Partiel";
    }

    // Insert payment
    const paymentValues = {
      schoolId: targetSchoolId,
      feeId: Number(feeId),
      amount: doubleAmount,
      reduction: doubleReduction,
      paymentMode: paymentMode || "Espèces",
      reference: reference || null,
      monthConcerned: monthConcerned || null,
      recordedBy: recordedBy || user.utilisateur || "Mobile App",
      datePaid: new Date(),
    };

    const [insertedPayment] = await db.insert(feePayments).values(paymentValues).returning();

    // Update student fee record
    await db
      .update(studentFees)
      .set({
        totalPaid: newPaid,
        totalReduction: newReduction,
        balance: newBalance,
        status: newStatus,
      })
      .where(eq(studentFees.id, Number(feeId)));

    try {
      revalidatePath("/dashboard/finance");
      revalidatePath("/dashboard/finance/invoices");
    } catch (_) {}

    return NextResponse.json({
      success: true,
      payment: insertedPayment
        ? {
            id: insertedPayment.id,
            school_id: insertedPayment.schoolId,
            fee_id: insertedPayment.feeId,
            amount: insertedPayment.amount,
            reduction: insertedPayment.reduction,
            date_paid: insertedPayment.datePaid?.toISOString() || null,
            month_concerned: insertedPayment.monthConcerned,
            payment_mode: insertedPayment.paymentMode,
            reference: insertedPayment.reference,
            recorded_by: insertedPayment.recordedBy,
          }
        : null,
      newPaid,
      newReduction,
      newBalance,
      newStatus,
    });
  } catch (err: any) {
    console.error("[Payments POST Error]:", err);
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
