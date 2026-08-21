"use server";

import { db, readDb } from "@/infrastructure/database";
import { admissionApplications } from "@/infrastructure/database/schema/admissions";
import { students } from "@/infrastructure/database/schema/students";
import { studentMedicalRecords } from "@/infrastructure/database/schema/health";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── 1. Dashboard KPI Stats ─────────────────────────────────────────────────

export async function getAdmissionsDashboardStats() {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    const [totalRes, pendingRes, admittedRes, rejectedRes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(admissionApplications)
        .where(schoolId ? eq(admissionApplications.schoolId, schoolId) : undefined),
      db
        .select({ count: sql<number>`count(*)` })
        .from(admissionApplications)
        .where(
          and(
            schoolId ? eq(admissionApplications.schoolId, schoolId) : undefined,
            eq(admissionApplications.status, "En attente")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(admissionApplications)
        .where(
          and(
            schoolId ? eq(admissionApplications.schoolId, schoolId) : undefined,
            eq(admissionApplications.status, "Admis / Accepté")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(admissionApplications)
        .where(
          and(
            schoolId ? eq(admissionApplications.schoolId, schoolId) : undefined,
            eq(admissionApplications.status, "Refusé")
          )
        ),
    ]);

    return {
      totalApplications: Number(totalRes[0]?.count || 0),
      pendingReview: Number(pendingRes[0]?.count || 0),
      admitted: Number(admittedRes[0]?.count || 0),
      rejected: Number(rejectedRes[0]?.count || 0),
    };
  });
}

// ─── 2. List Applications ───────────────────────────────────────────────────

export async function getAdmissionApplicationsList(params?: {
  status?: string;
  targetClass?: string;
  query?: string;
}) {
  return protectedDbAction("Students", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { applications: [] };

    const conditions = [eq(admissionApplications.schoolId, schoolId)];

    if (params?.status && params.status !== "ALL") {
      conditions.push(eq(admissionApplications.status, params.status));
    }
    if (params?.targetClass && params.targetClass !== "ALL") {
      conditions.push(eq(admissionApplications.targetClass, params.targetClass));
    }

    const applications = await readDb.query.admissionApplications.findMany({
      where: and(...conditions),
      orderBy: [desc(admissionApplications.createdAt)],
    });

    let filtered = applications;
    if (params?.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      filtered = applications.filter(
        (a) =>
          a.applicationNumber.toLowerCase().includes(q) ||
          a.studentFirstName.toLowerCase().includes(q) ||
          a.studentLastName.toLowerCase().includes(q) ||
          a.parentName.toLowerCase().includes(q) ||
          a.parentPhone.includes(q)
      );
    }

    return { applications: filtered };
  });
}

// ─── 3. Submit Public / Remote Application ─────────────────────────────────

export async function submitAdmissionApplicationAction(data: {
  schoolId?: number;
  studentFirstName: string;
  studentLastName: string;
  dateOfBirth: string;
  gender: string;
  placeOfBirth?: string;
  nationality?: string;
  targetClass: string;
  previousSchool?: string;
  previousGradeAvg?: string;
  parentName: string;
  parentRelation?: string;
  parentPhone: string;
  parentWhatsapp?: string;
  parentEmail?: string;
  parentProfession?: string;
  address?: string;
  city?: string;
  birthCertificateUrl?: string;
  photoUrl?: string;
  reportCardUrl?: string;
  medicalNotes?: string;
}) {
  try {
    // Determine target schoolId (or default to active school / school 1)
    const schoolId = data.schoolId || (await getActiveSchoolId()) || 1;

    // Generate unique application number ADM-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(eq(admissionApplications.schoolId, schoolId));
    
    const seq = Number(countRes[0]?.count || 0) + 1;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const applicationNumber = `ADM-${currentYear}-${String(seq).padStart(3, "0")}-${randomSuffix}`;

    const [inserted] = await db
      .insert(admissionApplications)
      .values({
        applicationNumber,
        schoolId,
        studentFirstName: data.studentFirstName.trim(),
        studentLastName: data.studentLastName.trim(),
        dateOfBirth: data.dateOfBirth,
        gender: data.gender || "M",
        placeOfBirth: data.placeOfBirth || null,
        nationality: data.nationality || "Nigérienne",
        targetClass: data.targetClass,
        previousSchool: data.previousSchool || null,
        previousGradeAvg: data.previousGradeAvg || null,
        parentName: data.parentName.trim(),
        parentRelation: data.parentRelation || "Père",
        parentPhone: data.parentPhone.trim(),
        parentWhatsapp: data.parentWhatsapp || data.parentPhone.trim(),
        parentEmail: data.parentEmail || null,
        parentProfession: data.parentProfession || null,
        address: data.address || null,
        city: data.city || "Niamey",
        birthCertificateUrl: data.birthCertificateUrl || null,
        photoUrl: data.photoUrl || null,
        reportCardUrl: data.reportCardUrl || null,
        medicalNotes: data.medicalNotes || null,
        status: "En attente",
        parentNotified: false,
      })
      .returning();

    // Send instant WhatsApp / SMS acknowledgment to parent
    try {
      const studentFullName = `${data.studentLastName.toUpperCase()} ${data.studentFirstName}`;
      await MessagingService.sendAdmissionReceivedAlert({
        to: data.parentPhone,
        whatsapp: data.parentWhatsapp || data.parentPhone,
        parentName: data.parentName,
        studentName: studentFullName,
        applicationNumber,
        targetClass: data.targetClass,
        schoolName: "Edut Pro",
        sendSMS: true,
        sendWhatsApp: true,
      });

      await db
        .update(admissionApplications)
        .set({ parentNotified: true, parentNotificationSentAt: new Date() })
        .where(eq(admissionApplications.id, inserted.id));
    } catch (err) {
      console.error("⚠️ Failed to send admission received notification:", err);
    }

    revalidatePath("/dashboard/admissions");
    return {
      success: true,
      applicationNumber,
      applicationId: inserted.id,
      message: "Candidature enregistrée avec succès. Vous recevrez un accusé de réception par SMS / WhatsApp.",
    };
  } catch (error: any) {
    console.error("❌ Submit admission application error:", error);
    return { error: error?.message || "Erreur lors de la soumission de la candidature." };
  }
}

// ─── 4. Review & Decision (Admin Workflow) ───────────────────────────────────

export async function reviewAdmissionApplicationAction(data: {
  applicationId: number;
  decision: "Admis / Accepté" | "Refusé" | "Liste d'attente" | "En examen";
  reviewNotes?: string;
  assignedClass?: string;
}) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    const application = await db.query.admissionApplications.findFirst({
      where: and(
        eq(admissionApplications.id, data.applicationId),
        eq(admissionApplications.schoolId, schoolId)
      ),
    });

    if (!application) {
      return { error: "Dossier de candidature introuvable." };
    }

    const reviewerName = (user as any).name || (user as any).nom || user.utilisateur || "Commission des Admissions";
    const targetClass = data.assignedClass || application.targetClass;

    // IF APPROVED: Automatically create student & generate Matricule
    if (data.decision === "Admis / Accepté") {
      const year = new Date().getFullYear();

      // Get count of existing students for unique matricule sequence
      const studentCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(eq(students.schoolId, schoolId));
      
      const seq = Number(studentCountRes[0]?.count || 0) + 1;
      const matricule = `MAT-${year}-${String(seq).padStart(4, "0")}`;

      const studentFullName = `${application.studentLastName.toUpperCase()} ${application.studentFirstName}`;

      // 1. Insert official student record
      const [newStudent] = await db
        .insert(students)
        .values({
          schoolId,
          numAdmission: matricule,
          nomEtudiant: studentFullName,
          dateNaissance: application.dateOfBirth,
          genre: application.gender,
          lieuNaissance: application.placeOfBirth || "Niamey",
          nationalite: application.nationality || "Nigérienne",
          classe: targetClass,
          statut: "Actif",
          nomPere: application.parentName,
          telephoneParent: application.parentPhone,
          whatsappParent: application.parentWhatsapp || application.parentPhone,
          emailParent: application.parentEmail || null,
          adresse: application.address || null,
          photoPath: application.photoUrl || null,
          behaviorScore: 20,
        })
        .returning();

      // 2. Insert initial health record if medical notes are present
      if (application.medicalNotes) {
        await db.insert(studentMedicalRecords).values({
          schoolId,
          studentId: newStudent.id,
          allergies: application.medicalNotes,
          emergencyContactName: application.parentName,
          emergencyContactPhone: application.parentPhone,
          emergencyContactRelation: application.parentRelation || "Parent",
        });
      }

      // 3. Update application record
      await db
        .update(admissionApplications)
        .set({
          status: "Admis / Accepté",
          targetClass,
          admittedStudentId: newStudent.id,
          generatedMatricule: matricule,
          reviewNotes: data.reviewNotes || "Dossier complet et validé par la commission.",
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        })
        .where(eq(admissionApplications.id, data.applicationId));

      // 4. Send official Acceptance & Matricule alert via WhatsApp and SMS
      try {
        await MessagingService.sendAdmissionApprovedAlert({
          to: application.parentPhone,
          whatsapp: application.parentWhatsapp || application.parentPhone,
          parentName: application.parentName,
          studentName: studentFullName,
          matricule,
          targetClass,
          schoolName: "Edut Pro",
          sendSMS: true,
          sendWhatsApp: true,
        });

        await db
          .update(admissionApplications)
          .set({ parentNotified: true, parentNotificationSentAt: new Date() })
          .where(eq(admissionApplications.id, data.applicationId));
      } catch (err) {
        console.error("⚠️ Failed to send admission approval notification:", err);
      }

      revalidatePath("/dashboard/admissions");
      revalidatePath("/dashboard/students");

      return {
        success: true,
        decision: "Admis / Accepté",
        matricule,
        studentId: newStudent.id,
        message: `Élève admis avec succès ! Matricule officiel généré : ${matricule}`,
      };
    } else {
      // For Rejected / Waitlisted / In Review
      await db
        .update(admissionApplications)
        .set({
          status: data.decision,
          reviewNotes: data.reviewNotes || null,
          reviewedBy: reviewerName,
          reviewedAt: new Date(),
        })
        .where(eq(admissionApplications.id, data.applicationId));

      revalidatePath("/dashboard/admissions");
      return {
        success: true,
        decision: data.decision,
        message: `Dossier mis à jour avec le statut : ${data.decision}`,
      };
    }
  });
}

// ─── 5. Delete Application ───────────────────────────────────────────────────

export async function deleteAdmissionApplicationAction(id: number) {
  return protectedDbAction("Students", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucune école active." };

    await db
      .delete(admissionApplications)
      .where(
        and(
          eq(admissionApplications.id, id),
          eq(admissionApplications.schoolId, schoolId)
        )
      );

    revalidatePath("/dashboard/admissions");
    return { success: true };
  });
}
