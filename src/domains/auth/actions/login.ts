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

    let { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: formData.password,
    });
    
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

          // If supabaseId is missing, bootstrap via signUp
          if (!activeSupabaseId) {
            try {
              const { data: signUpData } = await supabase.auth.signUp({
                email: userLoginEmail,
                password: formData.password,
                options: {
                  data: {
                    full_name: dbUser.nomPrenom,
                    school_id: dbUser.schoolId,
                    student_id: dbUser.studentId,
                    employee_id: dbUser.employeeId,
                  }
                }
              });
              if (signUpData?.user?.id) {
                activeSupabaseId = signUpData.user.id;
                await db.update(users).set({ supabaseId: activeSupabaseId }).where(eq(users.id, dbUser.id));
              }
            } catch (signUpErr) {
              console.warn("[LOGIN] Supabase signUp bootstrap warning:", signUpErr);
            }
          }

          try {
            // Self-heal and sync auth.users with the new password hash
            await db.execute(sql`
              UPDATE auth.users
              SET encrypted_password = ${dbUser.motDePasse},
                  email = ${userLoginEmail},
                  updated_at = NOW()
              WHERE id = ${activeSupabaseId || dbUser.supabaseId}::uuid OR email = ${userLoginEmail}
            `);
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
