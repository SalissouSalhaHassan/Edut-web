"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema, LoginFormData } from "../validators/auth.schema";
import { headers } from "next/headers";
import { db } from "@/infrastructure/database";
import { users, schools } from "@/infrastructure/database/schema/auth";
import { eq, and, or } from "drizzle-orm";
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
          console.log(`[LOGIN] Password match in database for user ${dbUser.utilisateur}. Synchronizing via Admin API...`);
          
          try {
            const supabaseAdmin = createSupabaseAdmin(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              { auth: { autoRefreshToken: false, persistSession: false } }
            );

            // Chercher ou créer l'utilisateur dans auth.users via Admin API
            const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
            const existingAuthUser = authList?.users.find(
              (u) => u.email === loginEmail
            );

            if (existingAuthUser) {
              await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
                password: formData.password,
                email: loginEmail,
              });
              // Sauvegarder supabaseId si manquant
              if (!dbUser.supabaseId) {
                await db.update(users).set({ supabaseId: existingAuthUser.id }).where(eq(users.id, dbUser.id));
              }
            } else {
              const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
                email: loginEmail,
                password: formData.password,
                email_confirm: true,
              });
              if (newUser?.user) {
                await db.update(users).set({ supabaseId: newUser.user.id }).where(eq(users.id, dbUser.id));
              }
            }
          } catch (syncErr) {
            console.warn("[LOGIN] Admin API sync warning:", syncErr);
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
