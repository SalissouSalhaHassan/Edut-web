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

/**
 * Synchronise et garantit la présence du compte dans auth.users et auth.identities de Supabase
 */
async function syncSupabaseAuthUser(params: {
  email: string;
  passwordText?: string;
  hashedPassword: string;
  fullName: string;
  schoolId: number;
  studentId?: number | null;
  employeeId?: number | null;
  existingSupabaseId?: string | null;
}): Promise<string | null> {
  const {
    email,
    passwordText,
    hashedPassword,
    fullName,
    schoolId,
    studentId,
    employeeId,
    existingSupabaseId,
  } = params;

  try {
    const userMeta = JSON.stringify({
      full_name: fullName,
      school_id: schoolId,
      student_id: studentId || null,
      employee_id: employeeId || null,
    });

    const result = await db.execute(sql`
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        COALESCE(${existingSupabaseId}::uuid, gen_random_uuid()),
        'authenticated',
        'authenticated',
        ${email},
        ${hashedPassword},
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        ${userMeta}::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      ON CONFLICT (email) DO UPDATE SET
        encrypted_password = ${hashedPassword},
        email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
        raw_user_meta_data = ${userMeta}::jsonb,
        updated_at = NOW()
      RETURNING id;
    `);

    const rows = Array.isArray(result) ? result : (result as any)?.rows || [];
    const authId = rows[0]?.id ? String(rows[0].id) : existingSupabaseId;

    if (authId) {
      try {
        await db.execute(sql`
          INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${authId}::uuid,
            jsonb_build_object('sub', ${authId}::text, 'email', ${email}),
            'email',
            ${authId}::text,
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (provider, provider_id) DO UPDATE SET
            identity_data = jsonb_build_object('sub', ${authId}::text, 'email', ${email}),
            updated_at = NOW();
        `);
      } catch (idErr) {
        console.warn("[syncSupabaseAuthUser] auth.identities warning:", idErr);
      }
      return authId;
    }
  } catch (err) {
    console.warn("[syncSupabaseAuthUser] SQL direct upsert failed, trying client signUp fallback:", err);
  }

  // Fallback to client signUp if SQL execution had issues
  if (passwordText) {
    try {
      const { createClient } = await import("@/shared/utils/supabase/server");
      const supabase = await createClient();
      const { data: authData } = await supabase.auth.signUp({
        email,
        password: passwordText,
        options: {
          data: {
            full_name: fullName,
            school_id: schoolId,
            student_id: studentId,
            employee_id: employeeId,
          },
        },
      });
      if (authData?.user?.id) {
        return authData.user.id;
      }
    } catch (signUpErr) {
      console.warn("[syncSupabaseAuthUser] signUp fallback warning:", signUpErr);
    }
  }

  return existingSupabaseId || null;
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
            eq(students.numAdmission, cleanMatricule.toUpperCase()),
            eq(students.numAdmission, cleanMatricule.toLowerCase())
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
            eq(employees.email, cleanMatricule),
            eq(employees.email, cleanMatricule.toLowerCase())
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

    // 3. Déterminer le nom d'utilisateur et l'email de connexion
    recoveredUsername = linkedUser ? linkedUser.utilisateur : cleanMatricule.toLowerCase();
    let loginEmail = recoveredUsername;
    if (!loginEmail.includes("@")) {
      loginEmail = `${loginEmail}@test.com`;
    }

    const effectivePassword = newPassword && newPassword.trim().length > 0
      ? newPassword.trim()
      : (linkedUser ? null : "Edut2025!");

    if (newPassword && newPassword.trim().length > 0 && newPassword.trim().length < 4) {
      return { success: false, error: "Le mot de passe doit contenir au moins 4 caractères." };
    }

    let hashedPassword: string | null = null;
    if (effectivePassword) {
      hashedPassword = await bcrypt.hash(effectivePassword, 10);
    }

    // Synchronisation Supabase Auth
    let supabaseAuthId: string | null = linkedUser?.supabaseId || null;
    if (hashedPassword && effectivePassword) {
      supabaseAuthId = await syncSupabaseAuthUser({
        email: loginEmail,
        passwordText: effectivePassword,
        hashedPassword,
        fullName: personFullName,
        schoolId: school.id,
        studentId: studentRecord?.id,
        employeeId: employeeRecord?.id,
        existingSupabaseId: linkedUser?.supabaseId,
      });
    }

    // 4. Création ou mise à jour de la table Postgres users
    if (!linkedUser) {
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

      const defaultHashed = hashedPassword || (await bcrypt.hash("Edut2025!", 10));

      const insertedUser = await db.insert(users).values({
        schoolId: school.id,
        utilisateur: recoveredUsername,
        supabaseId: supabaseAuthId,
        nomPrenom: personFullName,
        motDePasse: defaultHashed,
        admin: false,
        superAdmin: false,
        roleId: roleRow?.id,
        langue: "FR",
        educationalLevel: studentRecord?.educationalLevel || "Primaire",
        studentId: studentRecord?.id || null,
        employeeId: employeeRecord?.id || null,
      }).returning();

      linkedUser = insertedUser[0];
    } else if (hashedPassword) {
      await db.update(users).set({
        motDePasse: hashedPassword,
        supabaseId: supabaseAuthId || linkedUser.supabaseId,
      }).where(eq(users.id, linkedUser.id));
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
