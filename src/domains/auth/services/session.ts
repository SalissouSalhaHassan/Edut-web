import { cache } from "react";
import { createClient } from "@/shared/utils/supabase/server";
import { db, readDb } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, or } from "drizzle-orm";
import { cache as redisCache } from "@/lib/redis";
import { cookies } from "next/headers";
import crypto from "crypto";

const DEFAULT_PLATFORM_OWNER_EMAILS = ["superadmin@gmail.com", "viewer@test.com", "salissousalhahassan@gmail.com"];

type DbUser = typeof users.$inferSelect;
export type SessionUserRecord = Omit<DbUser, "superAdmin"> & {
  superAdmin: DbUser["superAdmin"] | number;
  role?: {
    roleName?: string | null;
    permissions?: Array<{
      moduleName?: string | null;
      canView?: boolean | null;
      canEdit?: boolean | null;
      canDelete?: boolean | null;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
  school?: {
    id?: number;
    name?: string | null;
    slug?: string | null;
    logoPath?: string | null;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

type SupabaseAuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    [key: string]: unknown;
  };
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erreur inconnue";
}

export function isConfiguredPlatformOwner(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return DEFAULT_PLATFORM_OWNER_EMAILS.includes(cleanEmail);
}

function createPlatformOwnerFallback(authUser: SupabaseAuthUser, email: string): SessionUserRecord {
  return {
    id: 0,
    schoolId: null,
    utilisateur: email,
    supabaseId: authUser.id,
    nomPrenom: authUser.user_metadata?.full_name || "Super Admin",
    motDePasse: "SUPABASE_AUTH",
    admin: true,
    superAdmin: true,
    langue: "FR",
    roleId: null,
    emplacement: null,
    depots: null,
    educationalLevel: "Tous",
    avatarUrl: null,
    createdAt: null,
    studentId: null,
    employeeId: null,
    role: {
      roleName: "Super Admin",
      permissions: [],
    },
    school: null,
  };
}

export const getCurrentUser = cache(async (): Promise<SessionUserRecord | null> => {
  let cacheKeyByCookie = "";
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || cookieStore.get("sb-refresh-token")?.value || "";
    if (token) {
      const hash = crypto.createHash("md5").update(token).digest("hex");
      cacheKeyByCookie = `session_user_cookie:${hash}`;
      const cached = await redisCache.get<SessionUserRecord>(cacheKeyByCookie);
      if (cached) return cached;
    }
  } catch (_cErr) {
    // Cookie store read error guard
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || !user.email) return null;

    const cacheKeyById = `session_user:${user.id}`;
    const cachedById = await redisCache.get<SessionUserRecord>(cacheKeyById);
    if (cachedById) {
      if (cacheKeyByCookie) {
        await redisCache.set(cacheKeyByCookie, cachedById, 120);
      }
      return cachedById;
    }

    const email = user.email.toLowerCase();
    const isPlatformOwner = isConfiguredPlatformOwner(email);

    let dbUser = await readDb.query.users.findFirst({
      where: or(eq(users.supabaseId, user.id), eq(users.utilisateur, email)),
      with: {
        role: {
          with: {
            permissions: true,
          },
        },
        school: true,
      },
    }) as SessionUserRecord | null;

    if (!dbUser && isPlatformOwner) {
      dbUser = createPlatformOwnerFallback(user as SupabaseAuthUser, email);
    }

    if (dbUser) {
      await redisCache.set(cacheKeyById, dbUser, 600);
      if (cacheKeyByCookie) {
        await redisCache.set(cacheKeyByCookie, dbUser, 120);
      }
    }

    return dbUser ?? null;
  } catch (error) {
    console.error("[getCurrentUser] Error:", error);
    return null;
  }
});

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.error("[logout] Error:", e);
  }
}
