"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loginSchema, LoginFormData } from "../validators/auth.schema";
import { headers } from "next/headers";
import { db } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function login(formData: LoginFormData) {
  // Validate input
  const validation = loginSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const headerList = await headers();
  const schoolSlug = headerList.get("x-school-slug");

  const rawInput = formData.username.trim();
  // Build Supabase login email
  const loginEmail = rawInput.includes('@')
    ? rawInput.toLowerCase()
    : `${rawInput.toLowerCase()}@test.com`;
  // Internal username (strip @domain if present)
  const cleanUsername = rawInput.toLowerCase().replace(/@[^@]*$/, '');

  console.log(`[LOGIN] Attempting login: input="${rawInput}" → email="${loginEmail}", username="${cleanUsername}"`);

  try {
    const supabase = await createClient();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: formData.password,
    });

    // Supabase Auth failed → try DB fallback
    if (error) {
      console.warn("[LOGIN] Supabase Auth failed, trying DB fallback...");

      // Find user in DB by username variants
      const dbUser = await db.query.users.findFirst({
        where: or(
          eq(users.utilisateur, cleanUsername),
          eq(users.utilisateur, rawInput),
          eq(users.utilisateur, loginEmail),
        ),
        with: { school: true },
      }).catch(() => null);

      if (dbUser?.motDePasse) {
        const isMatch = await bcrypt.compare(formData.password, dbUser.motDePasse).catch(() => false);

        if (isMatch) {
          console.log(`[LOGIN] DB password match for: ${dbUser.utilisateur}`);

          // The Supabase email for this user (always @test.com format)
          const supabaseEmail = dbUser.utilisateur.includes('@')
            ? dbUser.utilisateur.toLowerCase()
            : `${dbUser.utilisateur.toLowerCase()}@test.com`;

          // Sync password with Supabase Auth via Admin API (if key is configured)
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (serviceKey && serviceKey.length > 50 && serviceKey !== 'REPLACE_WITH_YOUR_SERVICE_ROLE_KEY') {
            try {
              const adminClient = createSupabaseAdmin(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceKey,
                { auth: { autoRefreshToken: false, persistSession: false } }
              );

              let authUserId: string | null = dbUser.supabaseId || null;

              // If we don't have the supabase ID, search by email
              if (!authUserId) {
                const { data: listData } = await adminClient.auth.admin
                  .listUsers({ page: 1, perPage: 1000 })
                  .catch(() => ({ data: null }));
                const found = listData?.users?.find(u => u.email === supabaseEmail);
                authUserId = found?.id || null;
              }

              if (authUserId) {
                // Update existing auth user's password
                await adminClient.auth.admin.updateUserById(authUserId, {
                  password: formData.password,
                  email: supabaseEmail,
                }).catch(e => console.warn("[LOGIN] updateUserById:", e?.message));

                if (!dbUser.supabaseId) {
                  await db.update(users)
                    .set({ supabaseId: authUserId })
                    .where(eq(users.id, dbUser.id))
                    .catch(() => {});
                }
              } else {
                // Create new auth user entry
                const { data: created } = await adminClient.auth.admin.createUser({
                  email: supabaseEmail,
                  password: formData.password,
                  email_confirm: true,
                }).catch(() => ({ data: null }));

                if (created?.user) {
                  await db.update(users)
                    .set({ supabaseId: created.user.id })
                    .where(eq(users.id, dbUser.id))
                    .catch(() => {});
                  authUserId = created.user.id;
                }
              }
            } catch (adminErr: any) {
              console.warn("[LOGIN] Admin API error (non-fatal):", adminErr?.message);
            }
          } else {
            console.warn("[LOGIN] SUPABASE_SERVICE_ROLE_KEY not configured — skipping auth sync");
          }

          // Retry Supabase login with the canonical supabase email
          const retryRes = await supabase.auth.signInWithPassword({
            email: supabaseEmail,
            password: formData.password,
          }).catch(() => ({ data: null, error: { message: "retry failed" } }));

          if (retryRes.data?.user) {
            data = retryRes.data;
            error = null;
          }
        }
      }
    }

    // Check school membership if relevant
    if (!error && data?.user && schoolSlug) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.supabaseId, data.user.id),
        with: { school: true },
      }).catch(() => null);

      if (dbUser && !dbUser.superAdmin) {
        if (!dbUser.school || dbUser.school.slug !== schoolSlug) {
          await supabase.auth.signOut();
          return { error: "Accès refusé. Vous n'êtes pas membre de cette école." };
        }
      }
    }

    if (error) {
      const isNetworkError =
        (error as any).status === 0 ||
        (error as any).name === "AuthRetryableFetchError" ||
        (error as any).message?.toLowerCase().includes("fetch failed");

      if (isNetworkError) {
        return { error: "Impossible de joindre le serveur d'authentification. Vérifiez votre connexion." };
      }

      return { error: "Identifiants incorrects" };
    }

  } catch (err: any) {
    // Re-throw Next.js redirects
    if (err?.digest?.startsWith("NEXT_REDIRECT") || String(err).includes("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[LOGIN] Unexpected error:", err);
    return { error: "Identifiants incorrects ou erreur de connexion." };
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
