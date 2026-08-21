import { NextRequest, NextResponse } from "next/server";
import { submitAdmissionApplicationAction } from "@/domains/admissions/actions/admissions.actions";
import { mobileJsonError } from "../../_lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentFirstName,
      studentLastName,
      dateOfBirth,
      gender,
      placeOfBirth,
      nationality,
      targetClass,
      previousSchool,
      previousGradeAvg,
      parentName,
      parentRelation,
      parentPhone,
      parentWhatsapp,
      parentEmail,
      parentProfession,
      address,
      city,
      birthCertificateUrl,
      photoUrl,
      reportCardUrl,
      medicalNotes,
      schoolId,
    } = body;

    if (!studentFirstName || !studentLastName || !dateOfBirth || !targetClass || !parentName || !parentPhone) {
      return mobileJsonError(
        "Champs requis manquants (Prénom, Nom, Date de naissance, Classe, Parent, Téléphone).",
        400
      );
    }

    const res = await submitAdmissionApplicationAction({
      schoolId: schoolId ? Number(schoolId) : 1,
      studentFirstName,
      studentLastName,
      dateOfBirth,
      gender: gender || "M",
      placeOfBirth,
      nationality,
      targetClass,
      previousSchool,
      previousGradeAvg,
      parentName,
      parentRelation,
      parentPhone,
      parentWhatsapp,
      parentEmail,
      parentProfession,
      address,
      city,
      birthCertificateUrl,
      photoUrl,
      reportCardUrl,
      medicalNotes,
    });

    if (res.error) {
      return mobileJsonError(res.error, 400);
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[Mobile Admissions Apply Error]:", error);
    return mobileJsonError(error?.message || "Erreur serveur lors de la soumission", 500);
  }
}
