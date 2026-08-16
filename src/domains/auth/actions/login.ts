"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema, LoginFormData } from "../validators/auth.schema";
import { headers } from "next/headers";
import { db } from "@/infrastructure/database";
import { users, schools } from "@/infrastructure/database/schema/auth";
import { employees } from "@/infrastructure/database/schema/hr";
import { students } from "@/infrastructure/database/schema/students";
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
  const rawInput = formData.username.trim();
  const cleanInput = rawInput.toLowerCase();
  
  // 1. Resolve DB User by username, email, employee email/phone, or student matricule/phone
  let dbUser: any = await db.query.users.findFirst({
    where: or(
      eq(users.utilisateur, cleanInput),
      eq(users.utilisateur, rawInput),
      eq(users.utilisateur, `${cleanInput}@test.com`)
    ),
    with: {
      school: true
    }
  });

  if (!dbUser) {
    // Check if input matches an employee (email, mobile, emp_id)
    const emp = await db.query.employees.findFirst({
      where: or(
        eq(employees.email, rawInput),
        eq(employees.email, cleanInput),
        eq(employees.mobile, rawInput),
        eq(employees.empId, rawInput)
      )
    });
    if (emp) {
      dbUser = await db.query.users.findFirst({
        where: eq(users.employeeId, emp.id),
        with: { school: true }
      });
    }
  }

  if (!dbUser) {
    // Check if input matches a student (numAdmission, mobile, whatsapp)
    const std = await db.query.students.findFirst({
      where: or(
        eq(students.numAdmission, rawInput),
        eq(students.numAdmission, cleanInput),
        eq(students.mobile, rawInput),
        eq(students.whatsapp, rawInput)
      )
    });
    if (std) {
      dbUser = await db.query.users.findFirst({
        where: eq(users.studentId, std.id),
        with: { school: true }
      });
    }
  }

  // Determine the canonical Supabase email
  let loginEmail = rawInput;
  if (dbUser && dbUser.utilisateur) {
    loginEmail = dbUser.utilisateur.includes('@') 
      ? dbUser.utilisateur 
      : `${dbUser.utilisateur.toLowerCase()}@test.com`;
  } else if (!loginEmail.includes('@')) {
    loginEmail = `${cleanInput}@test.com`;
  }

  const tStart = performance.now();
  console.log(`[LOGIN PROFILE] Starting login for: ${loginEmail} (input was: ${rawInput})`);

  try {
    const supabase = await createClient();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: formData.password,
    });
    
    // If Supabase Auth fails, check directly against local database password hash
    if (error && dbUser && dbUser.motDePasse) {
      console.warn("[LOGIN] Supabase sign-in failed, checking database bcrypt for user:", dbUser.utilisateur);
      const isMatch = await bcrypt.compare(formData.password, dbUser.motDePasse);
      
      if (isMatch) {
        console.log(`[LOGIN] Password match in database for user ${dbUser.utilisateur}. Synchronizing auth.users...`);
        
        try {
          // Self-heal and sync auth.users with the correct bcrypt password hash and canonical email
          await db.execute(sql`
            UPDATE auth.users
            SET encrypted_password = ${dbUser.motDePasse},
                email = ${loginEmail},
                updated_at = NOW()
            WHERE id = ${dbUser.supabaseId}::uuid OR email = ${loginEmail}
          `);
        } catch (syncErr) {
          console.warn("[LOGIN] Direct auth.users update warning:", syncErr);
        }

        // Retry Supabase sign in with the synchronized credentials
        const retryRes = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: formData.password,
        });

        if (retryRes.data?.user) {
          data = retryRes.data;
          error = null;
          authError = null;
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
          if (!dbUser.school || dbUser.school.slug !== schoolSlug) {
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
