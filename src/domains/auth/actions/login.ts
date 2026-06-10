"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema, LoginFormData } from "../validators/auth.schema";
import { headers } from "next/headers";
import { db } from "@/infrastructure/database";
import { users, schools } from "@/infrastructure/database/schema/auth";
import { eq, and } from "drizzle-orm";

export async function login(formData: LoginFormData) {
  // Validate input using Zod
  const validation = loginSchema.safeParse(formData);
  
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const headerList = await headers();
  const schoolSlug = headerList.get("x-school-slug");

  let authError = null;
  let loginEmail = formData.username;
  
  // Si le username n'a pas de '@', on assume que c'est '@test.com' ou un email local pour le Dev
  if (!loginEmail.includes('@')) {
    loginEmail = `${loginEmail}@test.com`;
  }

  const tStart = performance.now();
  console.log(`[LOGIN PROFILE] Starting login for: ${loginEmail}`);

  try {
    const tSupabaseStart = performance.now();
    const supabase = await createClient();
    const tSupabaseClient = performance.now();
    console.log(`[LOGIN PROFILE] createClient took ${(tSupabaseClient - tSupabaseStart).toFixed(2)}ms`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: formData.password,
    });
    const tSupabaseAuth = performance.now();
    console.log(`[LOGIN PROFILE] Supabase signInWithPassword took ${(tSupabaseAuth - tSupabaseClient).toFixed(2)}ms`);
    
    if (error) {
      console.error("Supabase Auth Error Details:", error);
      authError = error;
    } else if (data.user) {
      if (schoolSlug) {
        const tUserStart = performance.now();
        const dbUser = await db.query.users.findFirst({
          where: eq(users.supabaseId, data.user.id),
          with: {
            school: true
          }
        });
        const tUserEnd = performance.now();
        console.log(`[LOGIN PROFILE] Drizzle joined user+school query took ${(tUserEnd - tUserStart).toFixed(2)}ms`);

        // If user exists but belongs to a different school
        if (dbUser && !dbUser.superAdmin) {
          if (!dbUser.school || dbUser.school.slug !== schoolSlug) {
            const tSignOutStart = performance.now();
            await supabase.auth.signOut();
            console.log(`[LOGIN PROFILE] supabase.auth.signOut took ${(performance.now() - tSignOutStart).toFixed(2)}ms`);
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
