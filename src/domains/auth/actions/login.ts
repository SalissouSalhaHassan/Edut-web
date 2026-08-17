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
      
      const dbUser = await db.query.users.findFirst({
        where: or(
          eq(users.utilisateur, cleanUsername),
          eq(users.utilisateur, formData.username.trim()),
          eq(users.utilisateur, loginEmail)
        ),
        with: {
          school: true
        }
      });

      if (dbUser && dbUser.motDePasse) {
        const isMatch = await bcrypt.compare(formData.password, dbUser.motDePasse);
        if (isMatch) {
          console.log(`[LOGIN] Password match in database for user ${dbUser.utilisateur}. Synchronizing auth.users...`);
          
          try {
            // Self-heal and sync auth.users with the new password hash
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
