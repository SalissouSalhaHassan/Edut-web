import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
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
    const fee = await readDb.query.studentFees.findFirst({
      where: eq(studentFees.id, feeId),
      columns: { schoolId: true, studentId: true }
    });

    if (!fee) {
      return mobileJsonError("Frais de scolarité introuvables", 404);
    }

    if (schoolId && fee.schoolId !== schoolId) {
      return mobileJsonError("Accès refusé", 403);
    }

    if ((roleType === "parent" || roleType === "student") && user.studentId !== fee.studentId) {
      return mobileJsonError("Accès refusé. Ce dossier ne vous appartient pas.", 403);
    }

    const payments = await readDb.query.feePayments.findMany({
      where: eq(feePayments.feeId, feeId),
      orderBy: [sql`date_paid DESC`]
    });

    const list = payments.map((p) => ({
      id: p.id,
      school_id: p.schoolId,
      fee_id: p.feeId,
      amount: p.amount,
      reduction: p.reduction,
      date_paid: p.datePaid?.toISOString() || null,
      month_concerned: p.monthConcerned,
      payment_mode: p.paymentMode,
      reference: p.reference,
      recorded_by: p.recordedBy,
    }));

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId;
  const roleType = await getUserRoleType(user);

  // Only directors, staff, or admins can record payments
  const hasAccess = ["admin", "super_admin", "director", "directeur", "staff"].includes(roleType);
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
      totalExpected
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

    let newStatus = "Impaye";
    if (newBalance <= 0) {
      newStatus = "Solde";
    } else if (newPaid > 0) {
      newStatus = "Partiel";
    }

    // Insert payment
    const paymentValues = {
      schoolId: targetSchoolId,
      feeId,
      amount: doubleAmount,
      reduction: doubleReduction,
      paymentMode: paymentMode || "Espèces",
      reference: reference || null,
      monthConcerned: monthConcerned || null,
      recordedBy: recordedBy || user.email || "Mobile App",
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
      .where(eq(studentFees.id, feeId));

    return NextResponse.json({
      success: true,
      payment: insertedPayment ? {
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
      } : null,
    });
  } catch (err: any) {
    return mobileJsonError(`Erreur: ${err.message || err}`, 500);
  }
}
