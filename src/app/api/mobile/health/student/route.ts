import { NextRequest, NextResponse } from "next/server";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { readDb } from "@/infrastructure/database";
import {
  studentMedicalRecords,
  infirmaryVisits,
} from "@/infrastructure/database/schema/health";
import { students } from "@/infrastructure/database/schema/students";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request);
  if (!user) {
    return mobileJsonError("Non authentifié.", 401);
  }

  const { searchParams } = new URL(request.url);
  const studentIdParam = searchParams.get("studentId");
  const studentId = studentIdParam ? Number(studentIdParam) : user.studentId;

  if (!studentId) {
    return mobileJsonError("studentId manquant.", 400);
  }

  try {
    const student = await readDb.query.students.findFirst({
      where: eq(students.id, studentId),
    });

    if (!student) {
      return mobileJsonError("Élève introuvable.", 404);
    }

    const record = await readDb.query.studentMedicalRecords.findFirst({
      where: eq(studentMedicalRecords.studentId, studentId),
    });

    const visits = await readDb.query.infirmaryVisits.findMany({
      where: eq(infirmaryVisits.studentId, studentId),
      orderBy: [desc(infirmaryVisits.visitDate)],
      limit: 20,
    });

    const defaultVaccines = [
      { name: "BCG (Tuberculose)", isDone: true, date: "" },
      { name: "Polio (VPO)", isDone: true, date: "" },
      { name: "Pentavalent (DTC-HepB-Hib)", isDone: true, date: "" },
      { name: "Rougeole & Rubéole (RR)", isDone: true, date: "" },
      { name: "Fièvre Jaune (VAA)", isDone: true, date: "" },
      { name: "Méningite A (MenAfriVac)", isDone: false, date: "" },
      { name: "Tétanos", isDone: true, date: "" },
    ];

    const isCurrentlyAtInfirmary = visits.length > 0 && 
      new Date().getTime() - new Date(visits[0].visitDate).getTime() < 4 * 60 * 60 * 1000 &&
      visits[0].outcome !== "Retour en classe";

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.nomEtudiant,
          class: student.classe,
          admissionNo: student.numAdmission,
          photoPath: student.photoPath,
          parentPhone: student.telephoneParent || student.telephoneTuteur,
        },
        medicalRecord: record ? {
          id: record.id,
          bloodGroup: record.bloodGroup || "Non renseigné",
          allergies: record.allergies || "Aucune connue",
          chronicConditions: record.chronicConditions || "Aucune",
          regularMedications: record.regularMedications || "Aucun",
          vaccinations: record.vaccinations || defaultVaccines,
          emergencyContactName: record.emergencyContactName || student.nomParent || "Parent",
          emergencyContactPhone: record.emergencyContactPhone || student.telephoneParent || "",
          doctorName: record.doctorName,
          doctorPhone: record.doctorPhone,
          heightCm: record.heightCm,
          weightKg: record.weightKg,
          notes: record.notes,
        } : {
          id: 0,
          bloodGroup: "Non renseigné",
          allergies: "Aucune connue",
          chronicConditions: "Aucune",
          regularMedications: "Aucun",
          vaccinations: defaultVaccines,
          emergencyContactName: student.nomParent || "Parent",
          emergencyContactPhone: student.telephoneParent || "",
          doctorName: null,
          doctorPhone: null,
          heightCm: null,
          weightKg: null,
          notes: null,
        },
        isCurrentlyAtInfirmary,
        currentInfirmaryVisit: isCurrentlyAtInfirmary ? visits[0] : null,
        visits,
      },
    });
  } catch (error: any) {
    console.error("[Health API Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur santé", 500);
  }
}
