"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema, LoginFormData } from "../validators/auth.schema";
import { headers } from "next/headers";
import { db } from "@/infrastructure/database";
import { users, schools } from "@/infrastructure/database/schema/auth";
import { eq, and, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function login(formData: LoginFormData) {
  // Validate input using Zod
  const validation = loginSchema.safeParse(formData);
  
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const headerList = await headers();
  const schoolSlug = headerList.get("x-school-slug");

  let authError = null;
  let loginEmail = formData.username.trim();
  
  // Si le username n'a pas de '@', on assume que c'est '@test.com' ou un email local pour le Dev
  if (!loginEmail.includes('@')) {
    loginEmail = `${loginEmail}@test.com`;
  }

  const tStart = performance.now();
  console.log(`[LOGIN PROFILE] Starting login for: ${loginEmail}`);

  try {
    const supabase = await createClient();

    // Sign in with Supabase with a 6-second timeout protection
    let { data, error } = await Promise.race([
      supabase.auth.signInWithPassword({
        email: loginEmail,
        password: formData.password,
      }),
      new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Supabase auth timeout")), 6000)
      )
    ]).catch((err) => ({ data: null, error: err }));
    
    // If Supabase Auth fails, check directly against local database users table
    if (error) {
      console.warn("[LOGIN] Supabase sign-in failed, checking database fallback for user:", loginEmail);
      const cleanUsername = formData.username.trim().toLowerCase();
      const rawUsername = formData.username.trim();
      
      let dbUser = await db.query.users.findFirst({
        where: or(
          eq(users.utilisateur, cleanUsername),
          eq(users.utilisateur, rawUsername),
          eq(users.utilisateur, loginEmail)
        ),
        with: {
          school: true
        }
      });

      // If not found by username, check if it matches a student's num_admission
      if (!dbUser) {
        try {
          const { students } = await import("@/infrastructure/database/schema/students");
          const student = await db.query.students.findFirst({
            where: or(
              eq(students.numAdmission, rawUsername),
              eq(students.numAdmission, rawUsername.toUpperCase()),
              eq(students.numAdmission, cleanUsername)
            )
          });
          if (student) {
            dbUser = await db.query.users.findFirst({
              where: eq(users.studentId, student.id),
              with: { school: true }
            });
          }
        } catch (_) {}
      }

      // If still not found, check if it matches an employee's emp_id or email
      if (!dbUser) {
        try {
          const { employees } = await import("@/infrastructure/database/schema/hr");
          const employee = await db.query.employees.findFirst({
            where: or(
              eq(employees.empId, rawUsername),
              eq(employees.email, cleanUsername)
            )
          });
          if (employee) {
            dbUser = await db.query.users.findFirst({
              where: eq(users.employeeId, employee.id),
              with: { school: true }
            });
          }
        } catch (_) {}
      }

      if (dbUser && dbUser.motDePasse) {
        const isMatch = await bcrypt.compare(formData.password, dbUser.motDePasse);
        if (isMatch) {
          console.log(`[LOGIN] Password match in database for user ${dbUser.utilisateur}. Synchronizing auth.users...`);
          
          let activeSupabaseId = dbUser.supabaseId;
          const userLoginEmail = dbUser.utilisateur.includes('@') ? dbUser.utilisateur : `${dbUser.utilisateur}@test.com`;

          try {
            const userMeta = JSON.stringify({
              full_name: dbUser.nomPrenom,
              school_id: dbUser.schoolId,
              student_id: dbUser.studentId || null,
              employee_id: dbUser.employeeId || null,
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
                COALESCE(${activeSupabaseId}::uuid, gen_random_uuid()),
                'authenticated',
                'authenticated',
                ${userLoginEmail},
                ${dbUser.motDePasse},
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
                encrypted_password = ${dbUser.motDePasse},
                email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
                raw_user_meta_data = ${userMeta}::jsonb,
                updated_at = NOW()
              RETURNING id;
            `);

            const rows = Array.isArray(result) ? result : (result as any)?.rows || [];
            if (rows[0]?.id) {
              activeSupabaseId = String(rows[0].id);
              if (activeSupabaseId !== dbUser.supabaseId) {
                await db.update(users).set({ supabaseId: activeSupabaseId }).where(eq(users.id, dbUser.id));
              }

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
                  ${activeSupabaseId}::uuid,
                  jsonb_build_object('sub', ${activeSupabaseId}::text, 'email', ${userLoginEmail}),
                  'email',
                  ${activeSupabaseId}::text,
                  NOW(),
                  NOW(),
                  NOW()
                )
                ON CONFLICT (provider, provider_id) DO UPDATE SET
                  identity_data = jsonb_build_object('sub', ${activeSupabaseId}::text, 'email', ${userLoginEmail}),
                  updated_at = NOW();
              `);
            }
          } catch (syncErr) {
            console.warn("[LOGIN] Direct auth.users update warning:", syncErr);
          }

          // Retry Supabase sign in with the synchronized credentials
          const retryRes = await supabase.auth.signInWithPassword({
            email: userLoginEmail,
            password: formData.password,
          });

          if (retryRes.data?.user) {
            data = retryRes.data;
            error = null;
            authError = null;
          }
        }
      }
    }

    if (error) {
      console.error("Supabase Auth Error Details:", error);
      authError = error;
    } else if (data?.user) {
      if (schoolSlug) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.supabaseId, data.user.id),
          with: {
            school: true
          }
        });

        // If user exists but belongs to a different school
        if (dbUser && !dbUser.superAdmin) {
          const userSchoolSlug = dbUser.school?.slug?.trim().toLowerCase();
          const targetSlug = schoolSlug.trim().toLowerCase();
          const targetSchoolId = parseInt(targetSlug);
          const isSameSchool = !dbUser.school || userSchoolSlug === targetSlug || (!isNaN(targetSchoolId) && dbUser.schoolId === targetSchoolId);
          
          if (!isSameSchool) {
            await supabase.auth.signOut();
            return { error: "Accès refusé. Vous n'êtes pas membre de cette école." };
          }
        }
      }
    }
    console.log(`[LOGIN PROFILE] Total try block took ${(performance.now() - tStart).toFixed(2)}ms`);
  } catch (err: any) {
    console.error("Login Error:", err);
    return { error: "Serveur d'authentification injoignable. Vérifiez votre connexion internet." };
  }

  if (authError) {
    console.error("Supabase Auth Error:", authError);

    // التحقق مما إذا كان الخطأ ناتجاً عن فشل الاتصال بالشبكة أو الخادم
    const isNetworkError = 
      authError.status === 0 || 
      authError.name === "AuthRetryableFetchError" || 
      authError.message?.toLowerCase().includes("fetch failed");

    if (isNetworkError) {
      return { 
        error: "فشل الاتصال بخادم المصادقة (Supabase). يرجى التحقق من اتصال الإنترنت الخاص بك أو التأكد من إعدادات الشبكة." 
      };
    }

    return { error: "Identifiants incorrects" };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  revalidatePath("/", "layout");
  redirect("/login");
}
