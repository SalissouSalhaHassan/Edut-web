"use server";

import { db, readDb } from "@/infrastructure/database";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { 
  scholarships, 
  studentScholarships, 
  studentPaymentSchedules 
} from "@/infrastructure/database/schema/finance";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface ScholarshipInput {
  id?: number;
  name: string;
  provider?: string;
  type?: string; // Pourcentage | Montant Fixe
  discountValue: number;
  appliesTo?: string;
  academicYear?: string;
  criteria?: string;
  isActive?: boolean;
}

export interface StudentScholarshipAssignInput {
  id?: number;
  studentId: number;
  scholarshipId: number;
  academicYear?: string;
  customDiscountPercentage?: number;
  allocatedAmount?: number;
  decisionReference?: string;
  status?: string;
  notes?: string;
}

let migrationPromise: Promise<void> | null = null;

async function ensureFinanceTables() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "scholarships" (
          "id" SERIAL PRIMARY KEY,
          "school_id" integer REFERENCES "schools"("id"),
          "name" varchar(150) NOT NULL,
          "provider" varchar(150) DEFAULT 'Ministère de l''Enseignement Supérieur',
          "type" varchar(50) DEFAULT 'Pourcentage',
          "discount_value" double precision NOT NULL DEFAULT 50.0,
          "applies_to" varchar(50) DEFAULT 'Frais de Scolarité',
          "academic_year" varchar(50),
          "criteria" text,
          "is_active" boolean DEFAULT true,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS "student_scholarships" (
          "id" SERIAL PRIMARY KEY,
          "school_id" integer REFERENCES "schools"("id"),
          "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
          "scholarship_id" integer REFERENCES "scholarships"("id") ON DELETE CASCADE,
          "academic_year" varchar(50),
          "custom_discount_percentage" double precision,
          "allocated_amount" double precision DEFAULT 0,
          "decision_reference" varchar(100),
          "decision_date" timestamp DEFAULT now(),
          "status" varchar(50) DEFAULT 'Actif',
          "notes" text,
          "created_at" timestamp DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS "student_payment_schedules" (
          "id" SERIAL PRIMARY KEY,
          "school_id" integer REFERENCES "schools"("id"),
          "student_id" integer REFERENCES "students"("id") ON DELETE CASCADE,
          "session_id" integer REFERENCES "school_sessions"("id"),
          "installment_number" integer NOT NULL DEFAULT 1,
          "label" varchar(100) NOT NULL,
          "due_date" timestamp NOT NULL,
          "gross_amount" double precision NOT NULL,
          "scholarship_deduction" double precision DEFAULT 0,
          "net_amount" double precision NOT NULL,
          "paid_amount" double precision DEFAULT 0,
          "balance" double precision NOT NULL,
          "status" varchar(50) DEFAULT 'À échoir',
          "reminder_sent_at" timestamp,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);
    } catch (err: any) {
      console.warn("ensureFinanceTables warning:", err.message);
    }
  })();

  return migrationPromise;
}

export async function getBoursesAndEcheanciersDashboardData() {
  try {
    await ensureFinanceTables();
    const schoolId = await getActiveSchoolId();

    // 1. Scholarships Catalog
    const allScholarships = await (readDb || db)
      .select()
      .from(scholarships)
      .where(schoolId ? eq(scholarships.schoolId, schoolId) : undefined)
      .orderBy(desc(scholarships.id));

    // 2. Student Scholarship Allocations
    const allocations = await (readDb || db)
      .select({
        id: studentScholarships.id,
        schoolId: studentScholarships.schoolId,
        studentId: studentScholarships.studentId,
        scholarshipId: studentScholarships.scholarshipId,
        academicYear: studentScholarships.academicYear,
        customDiscountPercentage: studentScholarships.customDiscountPercentage,
        allocatedAmount: studentScholarships.allocatedAmount,
        decisionReference: studentScholarships.decisionReference,
        decisionDate: studentScholarships.decisionDate,
        status: studentScholarships.status,
        notes: studentScholarships.notes,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        studentClasse: students.classe,
        scholarshipName: scholarships.name,
        scholarshipProvider: scholarships.provider,
        scholarshipType: scholarships.type,
        scholarshipDiscountValue: scholarships.discountValue,
      })
      .from(studentScholarships)
      .leftJoin(students, eq(studentScholarships.studentId, students.id))
      .leftJoin(scholarships, eq(studentScholarships.scholarshipId, scholarships.id))
      .where(schoolId ? eq(studentScholarships.schoolId, schoolId) : undefined)
      .orderBy(desc(studentScholarships.id));

    // 3. Payment Schedules
    const schedules = await (readDb || db)
      .select({
        id: studentPaymentSchedules.id,
        schoolId: studentPaymentSchedules.schoolId,
        studentId: studentPaymentSchedules.studentId,
        installmentNumber: studentPaymentSchedules.installmentNumber,
        label: studentPaymentSchedules.label,
        dueDate: studentPaymentSchedules.dueDate,
        grossAmount: studentPaymentSchedules.grossAmount,
        scholarshipDeduction: studentPaymentSchedules.scholarshipDeduction,
        netAmount: studentPaymentSchedules.netAmount,
        paidAmount: studentPaymentSchedules.paidAmount,
        balance: studentPaymentSchedules.balance,
        status: studentPaymentSchedules.status,
        reminderSentAt: studentPaymentSchedules.reminderSentAt,
        studentNom: students.nomEtudiant,
        studentMatricule: students.numAdmission,
        studentClasse: students.classe,
      })
      .from(studentPaymentSchedules)
      .leftJoin(students, eq(studentPaymentSchedules.studentId, students.id))
      .where(schoolId ? eq(studentPaymentSchedules.schoolId, schoolId) : undefined)
      .orderBy(desc(studentPaymentSchedules.dueDate))
      .limit(200);

    // 4. Calculate Aggregate KPIs
    const totalAllocatedBourses = allocations.reduce((acc, curr) => acc + Number(curr.allocatedAmount || 0), 0);
    const totalGrossSchedules = schedules.reduce((acc, curr) => acc + Number(curr.grossAmount || 0), 0);
    const totalNetSchedules = schedules.reduce((acc, curr) => acc + Number(curr.netAmount || 0), 0);
    const totalPaidSchedules = schedules.reduce((acc, curr) => acc + Number(curr.paidAmount || 0), 0);
    const totalOverdueSchedules = schedules
      .filter((s) => s.status === "En retard" || (s.balance > 0 && new Date(s.dueDate) < new Date()))
      .reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

    const boursiersCount = allocations.filter((a) => a.status === "Actif").length;

    return {
      success: true,
      data: {
        scholarships: allScholarships,
        allocations,
        schedules,
        metrics: {
          boursiersCount,
          totalAllocatedBourses,
          totalGrossSchedules,
          totalNetSchedules,
          totalPaidSchedules,
          totalOverdueSchedules,
          recoveryRate: totalNetSchedules > 0 ? Number(((totalPaidSchedules / totalNetSchedules) * 100).toFixed(1)) : 0,
        },
      },
    };
  } catch (error: any) {
    console.error("Error in getBoursesAndEcheanciersDashboardData:", error);
    return { success: false, error: error.message || "Erreur lors de la récupération des bourses" };
  }
}

export async function saveScholarship(input: ScholarshipInput) {
  try {
    const schoolId = await getActiveSchoolId();

    if (!input.name) {
      return { success: false, error: "Nom de la bourse requis" };
    }

    if (input.id) {
      await db
        .update(scholarships)
        .set({
          name: input.name,
          provider: input.provider || "Ministère de l'Enseignement Supérieur",
          type: input.type || "Pourcentage",
          discountValue: Number(input.discountValue || 50),
          appliesTo: input.appliesTo || "Frais de Scolarité",
          academicYear: input.academicYear || "2025-2026",
          criteria: input.criteria || "",
          isActive: input.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(scholarships.id, input.id));
    } else {
      await db.insert(scholarships).values({
        schoolId: schoolId || 1,
        name: input.name,
        provider: input.provider || "Ministère de l'Enseignement Supérieur",
        type: input.type || "Pourcentage",
        discountValue: Number(input.discountValue || 50),
        appliesTo: input.appliesTo || "Frais de Scolarité",
        academicYear: input.academicYear || "2025-2026",
        criteria: input.criteria || "",
        isActive: input.isActive ?? true,
      });
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in saveScholarship:", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement de la bourse" };
  }
}

export async function deleteScholarship(id: number) {
  try {
    await db.delete(scholarships).where(eq(scholarships.id, id));
    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteScholarship:", error);
    return { success: false, error: error.message || "Erreur lors de la suppression" };
  }
}

export async function assignScholarshipToStudent(input: StudentScholarshipAssignInput) {
  try {
    const schoolId = await getActiveSchoolId();

    if (!input.studentId || !input.scholarshipId) {
      return { success: false, error: "Étudiant et Bourse requis" };
    }

    // Fetch scholarship info
    const sch = await (readDb || db)
      .select()
      .from(scholarships)
      .where(eq(scholarships.id, input.scholarshipId))
      .limit(1);

    const schItem = sch[0];
    const discountVal = input.customDiscountPercentage || schItem?.discountValue || 50;

    // Estimate base annual tuition (e.g. 700,000 FCFA default or student fee)
    const baseTuition = 700000;
    const allocatedAmt = schItem?.type === "Pourcentage"
      ? (baseTuition * discountVal) / 100
      : (input.allocatedAmount || discountVal);

    const ref = input.decisionReference || `DEC-BRS-${Date.now().toString().slice(-6)}`;

    if (input.id) {
      await db
        .update(studentScholarships)
        .set({
          studentId: input.studentId,
          scholarshipId: input.scholarshipId,
          academicYear: input.academicYear || "2025-2026",
          customDiscountPercentage: discountVal,
          allocatedAmount: allocatedAmt,
          decisionReference: ref,
          status: input.status || "Actif",
          notes: input.notes || "",
        })
        .where(eq(studentScholarships.id, input.id));
    } else {
      await db.insert(studentScholarships).values({
        schoolId: schoolId || 1,
        studentId: input.studentId,
        scholarshipId: input.scholarshipId,
        academicYear: input.academicYear || "2025-2026",
        customDiscountPercentage: discountVal,
        allocatedAmount: allocatedAmt,
        decisionReference: ref,
        status: input.status || "Actif",
        notes: input.notes || "",
      });
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in assignScholarshipToStudent:", error);
    return { success: false, error: error.message || "Erreur lors de l'attribution de la bourse" };
  }
}

export async function deleteStudentScholarship(id: number) {
  try {
    await db.delete(studentScholarships).where(eq(studentScholarships.id, id));
    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteStudentScholarship:", error);
    return { success: false, error: error.message || "Erreur lors de la suppression" };
  }
}

export async function generateStudentPaymentSchedule(
  studentId: number,
  annualGrossAmount: number = 700000,
  scholarshipPercentage: number = 0,
  monthsCount: number = 9
) {
  try {
    const schoolId = await getActiveSchoolId();

    // Check if student has scholarship
    const studentBourse = await (readDb || db)
      .select()
      .from(studentScholarships)
      .where(and(eq(studentScholarships.studentId, studentId), eq(studentScholarships.status, "Actif")))
      .limit(1);

    let effectiveDiscountPercent = scholarshipPercentage;
    if (studentBourse[0]?.customDiscountPercentage) {
      effectiveDiscountPercent = Number(studentBourse[0].customDiscountPercentage);
    }

    const totalScholarship = (annualGrossAmount * effectiveDiscountPercent) / 100;
    const totalNet = annualGrossAmount - totalScholarship;

    const monthlyGross = Math.round(annualGrossAmount / monthsCount);
    const monthlyScholarship = Math.round(totalScholarship / monthsCount);
    const monthlyNet = Math.round(totalNet / monthsCount);

    const monthNames = [
      "Octobre 2025", "Novembre 2025", "Décembre 2025", 
      "Janvier 2026", "Février 2026", "Mars 2026", 
      "Avril 2026", "Mai 2026", "Juin 2026"
    ];

    // Delete existing schedules for this student
    await db.delete(studentPaymentSchedules).where(eq(studentPaymentSchedules.studentId, studentId));

    // Insert new monthly installments
    for (let i = 0; i < monthsCount; i++) {
      const dueDate = new Date(2025, 9 + i, 5); // 5th of each month
      const isPast = dueDate < new Date();

      await db.insert(studentPaymentSchedules).values({
        schoolId: schoolId || 1,
        studentId,
        installmentNumber: i + 1,
        label: `Mensualité ${monthNames[i] || `Mois ${i + 1}`}`,
        dueDate,
        grossAmount: monthlyGross,
        scholarshipDeduction: monthlyScholarship,
        netAmount: monthlyNet,
        paidAmount: 0,
        balance: monthlyNet,
        status: isPast ? "En retard" : "À échoir",
      });
    }

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true, count: monthsCount, totalNet };
  } catch (error: any) {
    console.error("Error in generateStudentPaymentSchedule:", error);
    return { success: false, error: error.message || "Erreur lors de la génération de l'échéancier" };
  }
}

export async function recordSchedulePayment(scheduleId: number, paidAmount: number) {
  try {
    const item = await (readDb || db)
      .select()
      .from(studentPaymentSchedules)
      .where(eq(studentPaymentSchedules.id, scheduleId))
      .limit(1);

    if (!item[0]) return { success: false, error: "Échéance introuvable" };

    const newPaid = Number(item[0].paidAmount || 0) + paidAmount;
    const newBalance = Math.max(0, Number(item[0].netAmount) - newPaid);
    const newStatus = newBalance === 0 ? "Payé" : newPaid > 0 ? "Partiel" : "En retard";

    await db
      .update(studentPaymentSchedules)
      .set({
        paidAmount: newPaid,
        balance: newBalance,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(studentPaymentSchedules.id, scheduleId));

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in recordSchedulePayment:", error);
    return { success: false, error: error.message || "Erreur lors de l'enregistrement du règlement" };
  }
}

export async function triggerScheduleReminder(scheduleId: number) {
  try {
    await db
      .update(studentPaymentSchedules)
      .set({
        status: "Relancé",
        reminderSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentPaymentSchedules.id, scheduleId));

    revalidatePath("/dashboard/finance/bourses-echeanciers");
    return { success: true };
  } catch (error: any) {
    console.error("Error in triggerScheduleReminder:", error);
    return { success: false, error: error.message || "Erreur lors de l'envoi de la relance" };
  }
}
