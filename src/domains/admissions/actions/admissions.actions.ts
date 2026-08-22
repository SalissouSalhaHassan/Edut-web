"use server";

import { db, readDb } from "@/infrastructure/database";
import { admissionApplications } from "@/infrastructure/database/schema/admissions";
import { students } from "@/infrastructure/database/schema/students";
import { studentMedicalRecords } from "@/infrastructure/database/schema/health";
import { schools } from "@/infrastructure/database/schema/auth";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { eq, desc, and, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId, getCurrentSchool } from "@/domains/auth/services/school";
import { MessagingService } from "@/shared/services/messaging.service";

// ─── 1. Public School Info & Classes for Admissions ─────────────────────────

export async function getPublicSchoolInfoForAdmissionsAction(schoolSlugOrId?: string | number) {
  try {
    let school: any = null;

    if (schoolSlugOrId) {
      if (typeof schoolSlugOrId === "number" || !isNaN(Number(schoolSlugOrId))) {
        school = await readDb.query.schools.findFirst({
          where: eq(schools.id, Number(schoolSlugOrId)),
        });
      } else {
        school = await readDb.query.schools.findFirst({
          where: eq(schools.slug, String(schoolSlugOrId)),
        });
      }
    }

    if (!school) {
      school = await getCurrentSchool();
    }

    if (!school) {
      // Default to first school if no context is found
      school = await readDb.query.schools.findFirst({
        orderBy: [schools.id],
      });
    }

    const schoolId = school?.id || 1;

    // Fetch classes for this school
    const classes = await readDb.query.schoolClasses.findMany({
      where: eq(schoolClasses.schoolId, schoolId),
      orderBy: [schoolClasses.className],
    });

    const classNames = classes.map((c) => c.className);
    const defaultClasses = [
      "Maternelle 1", "Maternelle 2", "CI", "CP", "CE1", "CE2", "CM1", "CM2",
      "6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B", "3ème A", "3ème B",
      "2nde C", "2nde A", "1ère D", "1ère A", "1ère C", "Terminale D", "Terminale A", "Terminale C"
    ];

    return {
      school: school ? {
        id: school.id,
        name: school.name,
        slug: school.slug,
        logoPath: school.logoPath,
        customDomain: school.customDomain,
      } : {
        id: 1,
        name: "Edut Pro",
        slug: "main",
        logoPath: null,
      },
      classes: classNames.length > 0 ? classNames : defaultClasses,
    };
  } catch (error: any) {
    console.error("❌ Error fetching public school info:", error);
    return {
      school: { id: 1, name: "Edut Pro", slug: "main", logoPath: null },
      classes: [
        "CI", "CP", "CE1", "CE2", "CM1", "CM2",
        "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"
      ],
    };
  }
}

// ─── 2. Public Application Tracker (Parent Self-Service) ────────────────────

export async function getPublicApplicationStatusAction(params: {
  applicationNumber: string;
  phone: string;
}) {
  try {
    const cleanAppNumber = params.applicationNumber?.trim().toUpperCase();
    const cleanPhone = params.phone?.trim().replace(/\s+/g, "");

    if (!cleanAppNumber || !cleanPhone) {
      return { error: "Veuillez fournir le numéro de dossier et le numéro de téléphone." };
    }

    const application = await readDb.query.admissionApplications.findFirst({
      where: eq(admissionApplications.applicationNumber, cleanAppNumber),
      with: {
        school: true,
      },
    });

    if (!application) {
      return { error: "Aucun dossier trouvé avec ce numéro de candidature." };
    }

    // Verify phone match (last 6 digits to accommodate country code variations)
    const appPhone = (application.parentPhone || "").replace(/\s+/g, "");
    const appWhatsapp = (application.parentWhatsapp || "").replace(/\s+/g, "");

    const matchesPhone =
      appPhone.includes(cleanPhone.slice(-6)) ||
      appWhatsapp.includes(cleanPhone.slice(-6)) ||
      cleanPhone.includes(appPhone.slice(-6));

    if (!matchesPhone) {
      return { error: "Le numéro de téléphone ne correspond pas au dossier renseigné." };
    }

    return {
      success: true,
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        studentName: `${application.studentLastName.toUpperCase()} ${application.studentFirstName}`,
        targetClass: application.targetClass,
        dateOfBirth: application.dateOfBirth,
        parentName: application.parentName,
        parentPhone: application.parentPhone,
        status: application.status,
        reviewNotes: application.reviewNotes,
        generatedMatricule: application.generatedMatricule,
        reviewedBy: application.reviewedBy,
        reviewedAt: application.reviewedAt,
        createdAt: application.createdAt,
        photoUrl: application.photoUrl,
        schoolName: application.school?.name || "Edut Pro",
        schoolLogo: application.school?.logoPath || null,
      },
    };
  } catch (error: any) {
    console.error("❌ Error tracking application:", error);
    return { error: "Erreur lors de la recherche du dossier." };
  }
}

// ─── 3. Dashboard KPI Stats ─────────────────────────────────────────────────

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

// ─── 4. List Applications ───────────────────────────────────────────────────

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

// ─── 5. Submit Public / Remote Application ─────────────────────────────────

export async function submitAdmissionApplicationAction(data: {
  schoolId?: number;
  schoolSlug?: string;
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
    // Resolve target schoolId
    let schoolId: number | undefined = data.schoolId;

    if (!schoolId && data.schoolSlug) {
      const school = await readDb.query.schools.findFirst({
        where: eq(schools.slug, data.schoolSlug),
      });
      if (school) schoolId = school.id;
    }

    if (!schoolId) {
      schoolId = (await getActiveSchoolId()) || 1;
    }

    const finalSchoolId: number = Number(schoolId || 1);

    // Get school details for response / SMS
    const schoolRow = await readDb.query.schools.findFirst({
      where: eq(schools.id, finalSchoolId),
    });
    const schoolName = schoolRow?.name || "Edut Pro";

    // Generate unique application number ADM-YYYY-SEQ-RANDOM
    const currentYear = new Date().getFullYear();
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(admissionApplications)
      .where(eq(admissionApplications.schoolId, finalSchoolId));
    
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
        schoolName: schoolName,
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
      schoolName,
      message: "Candidature enregistrée avec succès. Vous recevrez un accusé de réception par SMS / WhatsApp.",
    };
  } catch (error: any) {
    console.error("❌ Submit admission application error:", error);
    return { error: error?.message || "Erreur lors de la soumission de la candidature." };
  }
}

// ─── 6. Review & Decision (Admin Workflow) ───────────────────────────────────

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
      with: {
        school: true,
      },
    });

    if (!application) {
      return { error: "Dossier de candidature introuvable." };
    }

    const schoolName = application.school?.name || "Edut Pro";
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
          sexe: application.gender || "M",
          lieuNaissance: application.placeOfBirth || "Niamey",
          classe: targetClass,
          statut: "Actif",
          nomPere: application.parentName,
          mobile: application.parentPhone,
          whatsapp: application.parentWhatsapp || application.parentPhone,
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

      // 4. Send official Acceptance & Matricule alert via WhatsApp, SMS and Email
      try {
        await MessagingService.sendAdmissionApprovedAlert({
          to: application.parentPhone,
          whatsapp: application.parentWhatsapp || application.parentPhone,
          parentName: application.parentName,
          studentName: studentFullName,
          matricule,
          targetClass,
          schoolName: schoolName,
          sendSMS: true,
          sendWhatsApp: true,
        });

        // 📧 Email notification if parent email is available
        if (application.parentEmail) {
          await MessagingService.sendAdmissionApprovedEmail({
            parentEmail: application.parentEmail,
            parentName: application.parentName,
            studentName: studentFullName,
            matricule,
            targetClass,
            schoolName,
            applicationNumber: application.applicationNumber,
            reviewNotes: data.reviewNotes,
          });
        }

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

      // 📧 Email notification for rejected / waitlisted (if parent email available)
      if (application.parentEmail && data.decision !== "En examen") {
        try {
          await MessagingService.sendAdmissionRejectedEmail({
            parentEmail: application.parentEmail,
            parentName: application.parentName,
            studentName: `${application.studentLastName.toUpperCase()} ${application.studentFirstName}`,
            schoolName,
            decision: data.decision,
            reviewNotes: data.reviewNotes,
          });
        } catch (err) {
          console.error("⚠️ Failed to send rejection email:", err);
        }
      }

      revalidatePath("/dashboard/admissions");

      return {
        success: true,
        decision: data.decision,
        message: `Dossier mis à jour avec le statut : ${data.decision}`,
      };
    }
  });
}

// ─── 7. Delete Application ───────────────────────────────────────────────────

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
