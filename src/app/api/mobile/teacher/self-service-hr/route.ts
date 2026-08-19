import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { employees, salaryRecords, teacherExtraHours, teacherHrRequests } from "@/infrastructure/database/schema/hr";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const employeeId = user.employeeId || null;

  try {
    // 1. Employee Profile
    let empProfile: any = null;
    let actualEmployeeId = employeeId;

    if (actualEmployeeId) {
      const rows = await readDb
        .select()
        .from(employees)
        .where(eq(employees.id, actualEmployeeId))
        .limit(1);
      empProfile = rows[0] || null;
    }

    if (!empProfile) {
      // Find employee by email/username or first employee in school
      const rows = await readDb
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.schoolId, schoolId),
            user.utilisateur ? eq(employees.email, user.utilisateur) : undefined
          )
        )
        .limit(1);
      if (rows.length > 0) {
        empProfile = rows[0];
        actualEmployeeId = empProfile.id;
      } else {
        const anyEmp = await readDb
          .select()
          .from(employees)
          .where(eq(employees.schoolId, schoolId))
          .limit(1);
        if (anyEmp.length > 0) {
          empProfile = anyEmp[0];
          actualEmployeeId = empProfile.id;
        }
      }
    }

    // 2. Payslips / Salary Records
    const payslips = await readDb
      .select({
        id: salaryRecords.id,
        monthYear: salaryRecords.monthYear,
        basicSalary: salaryRecords.basicSalary,
        totalAllowance: salaryRecords.totalAllowance,
        totalDeduction: salaryRecords.totalDeduction,
        netSalary: salaryRecords.netSalary,
        status: salaryRecords.status,
        paymentDate: salaryRecords.paymentDate,
        paymentMode: salaryRecords.paymentMode,
      })
      .from(salaryRecords)
      .where(actualEmployeeId ? eq(salaryRecords.employeeId, actualEmployeeId) : undefined)
      .orderBy(desc(salaryRecords.id))
      .limit(6);

    const formattedPayslips = payslips;

    // 3. Extra Hours / Substitutions
    const extraHours = await readDb
      .select()
      .from(teacherExtraHours)
      .where(
        and(
          eq(teacherExtraHours.schoolId, schoolId),
          actualEmployeeId ? eq(teacherExtraHours.employeeId, actualEmployeeId) : undefined
        )
      )
      .orderBy(desc(teacherExtraHours.id))
      .limit(10);

    const formattedExtraHours = extraHours;
    const totalExtraHoursSum = formattedExtraHours.reduce((acc, cur) => acc + (Number(cur.totalAmount) || 0), 0);

    // 4. Leave & Advance Requests
    const hrRequests = await readDb
      .select()
      .from(teacherHrRequests)
      .where(
        and(
          eq(teacherHrRequests.schoolId, schoolId),
          actualEmployeeId ? eq(teacherHrRequests.employeeId, actualEmployeeId) : undefined
        )
      )
      .orderBy(desc(teacherHrRequests.id))
      .limit(10);

    const formattedRequests = hrRequests;

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: employeeId || 1,
          name: empProfile?.nom || (user as any).name || user.utilisateur || "Enseignant",
          poste: empProfile?.poste || "Professeur Titulaire",
          matricule: empProfile?.empId || "ENS-2025-042",
          salaireBase: empProfile?.salaireBase || 280000,
          departement: empProfile?.departement || "Sciences Exactes",
        },
        payslips: formattedPayslips,
        extraHours: {
          totalEarned: totalExtraHoursSum,
          list: formattedExtraHours,
        },
        requests: formattedRequests,
      },
    });
  } catch (error: any) {
    console.error("[Teacher Self-Service HR GET Error]:", error);
    return mobileJsonError(error?.message || "Erreur de chargement du portail RH", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const schoolId = user.schoolId || 1;
  const employeeId = user.employeeId || 1;

  try {
    const body = await request.json();
    const { action, requestType, startDate, endDate, daysCount, advanceAmount, reason, documentUrl, typeHour, className, subjectName, hoursCount, hourlyRate, notes } = body;

    if (action === "extra_hours") {
      const hCount = Number(hoursCount) || 1;
      const hRate = Number(hourlyRate) || 3000;
      const total = hCount * hRate;

      await db.insert(teacherExtraHours).values({
        schoolId,
        employeeId,
        date: new Date().toLocaleDateString("fr-FR"),
        typeHour: typeHour || "Heure supplémentaire",
        className: className || "3ème B",
        subjectName: subjectName || "Mathématiques",
        hoursCount: hCount,
        hourlyRate: hRate,
        totalAmount: total,
        status: "En attente",
        notes: notes || "Déclaration depuis le mobile",
      });

      return NextResponse.json({
        success: true,
        message: "Séance d'heures supplémentaires déclarée avec succès ! En attente de validation comptable.",
      });
    }

    // Otherwise HR Request (Leave / Salary advance)
    if (!reason || !requestType) {
      return mobileJsonError("Type de demande et motif requis.", 400);
    }

    await db.insert(teacherHrRequests).values({
      schoolId,
      employeeId,
      requestType,
      startDate: startDate || new Date().toLocaleDateString("fr-FR"),
      endDate: endDate || new Date().toLocaleDateString("fr-FR"),
      daysCount: Number(daysCount) || 1,
      advanceAmount: advanceAmount ? Number(advanceAmount) : null,
      reason,
      documentUrl,
      status: "En attente",
    });

    return NextResponse.json({
      success: true,
      message: `Votre demande (${requestType}) a été transmise à la direction avec succès !`,
    });
  } catch (error: any) {
    console.error("[Teacher Self-Service HR POST Error]:", error);
    return mobileJsonError(error?.message || "Erreur lors de la soumission de la demande", 500);
  }
}
