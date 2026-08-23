"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema, LoginFormData } from "../validators/auth.schema";
import { headers } from "next/headers";
import { db } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, or, ilike, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function login(formData: LoginFormData) {
  // Validate input using Zod
  const validation = loginSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const rawUsername = formData.username.trim();
  const cleanUsername = rawUsername.toLowerCase();
  let loginEmail = cleanUsername;
  if (!loginEmail.includes("@")) {
    loginEmail = `${loginEmail}@test.com`;
  }

  try {
    const supabase = await createClient();

    // 1. Check local database users table first for instant and reliable auth
    let dbUser = await db.query.users.findFirst({
      where: or(
        eq(users.utilisateur, cleanUsername),
        eq(users.utilisateur, rawUsername),
        eq(users.utilisateur, loginEmail),
        ilike(users.utilisateur, cleanUsername),
        ilike(users.utilisateur, rawUsername)
      ),
      with: { school: true }
    });

    if (!dbUser && cleanUsername.includes("@")) {
      const unamePart = cleanUsername.split("@")[0];
      dbUser = await db.query.users.findFirst({
        where: or(
          eq(users.utilisateur, unamePart),
          ilike(users.utilisateur, unamePart)
        ),
        with: { school: true }
      });
    }

    if (dbUser && dbUser.motDePasse) {
      let isMatch = false;
      try {
        isMatch = await bcrypt.compare(formData.password, dbUser.motDePasse);
      } catch (_) {}
      if (!isMatch && dbUser.motDePasse === formData.password) {
        isMatch = true;
      }

      if (isMatch) {
        // User is verified! Synchronize to Supabase Auth and establish session
        const userLoginEmail = dbUser.utilisateur.includes("@") ? dbUser.utilisateur : `${dbUser.utilisateur}@test.com`;
        const syncPasswordHash = dbUser.motDePasse.startsWith("$2") ? dbUser.motDePasse : await bcrypt.hash(formData.password, 10);
        const userMeta = JSON.stringify({
          full_name: dbUser.nomPrenom || rawUsername,
          school_id: dbUser.schoolId || 1,
          student_id: dbUser.studentId || null,
          employee_id: dbUser.employeeId || null,
        });

        try {
          const authUserRes = await db.execute(sql`
            INSERT INTO auth.users (
              instance_id, id, aud, role, email, encrypted_password,
              email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
              created_at, updated_at
            ) VALUES (
              '00000000-0000-0000-0000-000000000000',
              COALESCE(${dbUser.supabaseId}::uuid, gen_random_uuid()),
              'authenticated', 'authenticated', ${userLoginEmail}, ${syncPasswordHash},
              NOW(), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, ${userMeta}::jsonb,
              NOW(), NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
              encrypted_password = ${syncPasswordHash},
              email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
              raw_user_meta_data = ${userMeta}::jsonb,
              updated_at = NOW()
            RETURNING id;
          `);

          const rows = Array.isArray(authUserRes) ? authUserRes : (authUserRes as any)?.rows || [];
          if (rows[0]?.id && rows[0].id !== dbUser.supabaseId) {
            await db.update(users).set({ supabaseId: String(rows[0].id) }).where(eq(users.id, dbUser.id));
          }
        } catch (syncErr) {
          console.warn("[LOGIN] Direct auth sync notice:", syncErr);
        }

        // Sign in to create session cookies
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: userLoginEmail,
          password: formData.password,
        });

        if (!signInErr) {
          revalidatePath("/", "layout");
          redirect("/dashboard");
        }
      }
    }

    // 2. Direct Supabase Auth attempt
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: formData.password,
    });

    if (!authErr && authData?.user) {
      revalidatePath("/", "layout");
      redirect("/dashboard");
    }

    return { error: "Identifiants incorrects. Veuillez vérifier votre nom d'utilisateur et mot de passe." };
  } catch (err: any) {
    // Re-throw redirect error for Next.js navigation to complete
    if (
      err?.message === "NEXT_REDIRECT" || 
      err?.digest?.startsWith("NEXT_REDIRECT") ||
      String(err).includes("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("Login Handler Error:", err);
    return { error: "Identifiants incorrects. Veuillez réessayer." };
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  revalidatePath("/", "layout");
  redirect("/login");
}
