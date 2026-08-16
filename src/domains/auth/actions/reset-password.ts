"use server";

import { db } from "@/infrastructure/database";
import { users, schools, roles } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface ResetPasswordParams {
  role: "student" | "teacher";
  schoolSlug: string;
  matriculeOrEmail: string;
  verificationCodeOrPhone: string; // PIN d'activation OU Numéro de téléphone
  newPassword?: string; // Si fourni, réinitialise le mot de passe
}

export async function recoverAndResetAccount(params: ResetPasswordParams) {
  const { role, schoolSlug, matriculeOrEmail, verificationCodeOrPhone, newPassword } = params;

  try {
    if (!schoolSlug || !matriculeOrEmail || !verificationCodeOrPhone) {
      return { success: false, error: "Veuillez remplir tous les champs d'identification." };
    }

    const cleanSchool = schoolSlug.trim();
    const cleanMatricule = matriculeOrEmail.trim();
    const cleanVerification = verificationCodeOrPhone.trim().toLowerCase();

    // 1. Trouver l'établissement
    const schoolIdNum = parseInt(cleanSchool);
    const school = await db.query.schools.findFirst({
      where: or(
        eq(schools.slug, cleanSchool),
        isNaN(schoolIdNum) ? undefined : eq(schools.id, schoolIdNum)
      ),
    });

    if (!school) {
      return { success: false, error: "Établissement scolaire introuvable." };
    }

    let linkedUser: any = null;
    let personFullName = "";
    let recoveredUsername = "";
    let studentRecord: any = null;
    let employeeRecord: any = null;

    // 2. Vérification d'identité selon le rôle
    if (role === "student") {
      // Trouver l'élève dans la base
      const student = await db.query.students.findFirst({
        where: and(
          eq(students.schoolId, school.id),
          or(
            eq(students.numAdmission, cleanMatricule),
            eq(students.numAdmission, cleanMatricule.toUpperCase())
          )
        ),
      });

      if (!student) {
        return {
          success: false,
          error: "Aucun élève trouvé avec ce numéro d'admission dans cet établissement.",
        };
      }

      // Vérifier soit le PIN d'activation, soit le numéro de téléphone (mobile, whatsapp, phoneFixe)
      const pinMatch = student.activationPin && student.activationPin.trim().toLowerCase() === cleanVerification;
      const mobileMatch = student.mobile && student.mobile.trim().toLowerCase().includes(cleanVerification);
      const whatsappMatch = student.whatsapp && student.whatsapp.trim().toLowerCase().includes(cleanVerification);
      const phoneFixeMatch = student.phoneFixe && student.phoneFixe.trim().toLowerCase().includes(cleanVerification);

      if (!pinMatch && !mobileMatch && !whatsappMatch && !phoneFixeMatch) {
        return {
          success: false,
          error: "Le code d'activation ou le numéro de téléphone ne correspond pas au dossier de l'élève.",
        };
      }

      studentRecord = student;
      personFullName = student.nomEtudiant || "Élève";

      // Trouver le compte utilisateur lié
      linkedUser = await db.query.users.findFirst({
        where: and(
          eq(users.schoolId, school.id),
          or(
            eq(users.studentId, student.id),
            eq(users.utilisateur, cleanMatricule),
            eq(users.utilisateur, cleanMatricule.toLowerCase())
          )
        ),
      });
    } else {
      // Enseignant
      const employee = await db.query.employees.findFirst({
        where: and(
          eq(employees.schoolId, school.id),
          or(
            eq(employees.empId, cleanMatricule),
            eq(employees.email, cleanMatricule)
          )
        ),
      });

      if (!employee) {
        return {
          success: false,
          error: "Aucun enseignant trouvé avec ce matricule ou email dans cet établissement.",
        };
      }

      const pinMatch = employee.activationPin && employee.activationPin.trim().toLowerCase() === cleanVerification;
      const phoneMatch = employee.mobile && employee.mobile.trim().toLowerCase().includes(cleanVerification);
      const emailMatch = employee.email && employee.email.trim().toLowerCase() === cleanVerification;

      if (!pinMatch && !phoneMatch && !emailMatch) {
        return {
          success: false,
          error: "Le code d'activation ou le numéro de téléphone ne correspond pas au dossier de l'enseignant.",
        };
      }

      employeeRecord = employee;
      personFullName = employee.nom || "Enseignant";

      // Trouver le compte utilisateur lié
      linkedUser = await db.query.users.findFirst({
        where: and(
          eq(users.schoolId, school.id),
          or(
            eq(users.employeeId, employee.id),
            eq(users.utilisateur, cleanMatricule),
            eq(users.utilisateur, cleanMatricule.toLowerCase())
          )
        ),
      });
    }

    // 3. Si aucun compte utilisateur n'était encore créé, on l'initialise
    if (!linkedUser) {
      // Trouver ou créer le rôle par défaut
      const roleName = role === "student" ? "Élève" : "Enseignant";
      let roleRow = await db.query.roles.findFirst({
        where: eq(roles.roleName, roleName),
      });
      if (!roleRow) {
        const insertedRole = await db.insert(roles).values({
          roleName,
          description: `Rôle automatique pour ${roleName}`,
        }).returning();
        roleRow = insertedRole[0];
      }

      recoveredUsername = cleanMatricule.toLowerCase();
      const defaultPassword = newPassword || "Edut2025!";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const insertedUser = await db.insert(users).values({
        schoolId: school.id,
        utilisateur: recoveredUsername,
        nomPrenom: personFullName,
        motDePasse: hashedPassword,
        admin: false,
        superAdmin: false,
        roleId: roleRow?.id,
        langue: "FR",
        educationalLevel: studentRecord?.educationalLevel || "Primaire",
        studentId: studentRecord?.id || null,
        employeeId: employeeRecord?.id || null,
      }).returning();

      linkedUser = insertedUser[0];
    } else {
      recoveredUsername = linkedUser.utilisateur;
    }

    // 4. Si un nouveau mot de passe est demandé, on le met à jour
    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 4) {
        return { success: false, error: "Le mot de passe doit contenir au moins 4 caractères." };
      }

      const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
      let loginEmail = recoveredUsername;
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@test.com`;
      }

      // Mise à jour de la table Postgres users
      await db.update(users).set({
        motDePasse: hashedPassword,
      }).where(eq(users.id, linkedUser.id));

      // Mise à jour synchronisée de la table auth.users pour Supabase Auth
      try {
        await db.execute(sql`
          UPDATE auth.users
          SET encrypted_password = ${hashedPassword},
              email = ${loginEmail},
              updated_at = NOW()
          WHERE id = ${linkedUser.supabaseId}::uuid OR email = ${loginEmail}
        `);
      } catch (authSqlErr) {
        console.warn("[recoverAndResetAccount] auth.users SQL sync warning:", authSqlErr);
      }
    }

    return {
      success: true,
      data: {
        username: recoveredUsername,
        fullName: personFullName,
        schoolName: school.name,
        message: newPassword
          ? "Votre mot de passe a été réinitialisé avec succès !"
          : "Identité vérifiée avec succès !",
      },
    };
  } catch (error: any) {
    console.error("[recoverAndResetAccount] Error:", error);
    return {
      success: false,
      error: error?.message || "Une erreur est survenue lors de la vérification du compte.",
    };
  }
}
