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
type SessionUserRecord = Omit<DbUser, "superAdmin"> & {
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
  return error instanceof Error ? error.message : String(error);
}

function getCauseMessage(error: unknown) {
  if (typeof error !== "object" || error === null || !("cause" in error)) {
    return null;
  }

  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause !== "object" || cause === null || !("message" in cause)) {
    return null;
  }

  const message = (cause as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

function getPlatformOwnerEmails() {
  const configured = [
    process.env.PLATFORM_ADMIN_EMAILS,
    process.env.SUPER_ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS,
  ]
    .filter(Boolean)
    .join(",");

  return new Set(
    (configured || DEFAULT_PLATFORM_OWNER_EMAILS.join(","))
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isConfiguredPlatformOwner(email: string) {
  return getPlatformOwnerEmails().has(email.trim().toLowerCase());
}

function canUseCachedSession(cachedUser: SessionUserRecord | null, authEmail?: string) {
  if (!cachedUser) return false;
  if (cachedUser.superAdmin === true || cachedUser.superAdmin === 1) return true;

  const cachedEmail = String(cachedUser.utilisateur || "").toLowerCase();
  if (cachedEmail && isConfiguredPlatformOwner(cachedEmail)) return false;
  if (authEmail && isConfiguredPlatformOwner(authEmail)) return false;

  return true;
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
    createdAt: null,
    role: {
      roleName: "Super Admin",
      permissions: [],
    },
    school: null,
  };
}

async function shouldBootstrapPlatformOwner(dbUser: Pick<SessionUserRecord, "schoolId"> | null) {
  const existingOwner = await readDb.query.users.findFirst({
    where: eq(users.superAdmin, true),
    columns: { id: true },
  });

  if (existingOwner) return false;

  // Bootstrap only accounts that are not already tied to a school tenant.
  return !dbUser?.schoolId;
}

async function ensurePlatformOwnerIfNeeded(
  dbUser: SessionUserRecord | null,
  authUser: SupabaseAuthUser,
  email: string
) {
  const shouldPromote =
    isConfiguredPlatformOwner(email) ||
    (await shouldBootstrapPlatformOwner(dbUser));

  if (!shouldPromote) return dbUser;

  if (dbUser) {
    if (dbUser.superAdmin && dbUser.admin) return dbUser;

    await db.update(users)
      .set({
        admin: true,
        superAdmin: true,
        educationalLevel: "Tous",
        supabaseId: dbUser.supabaseId || authUser.id,
      })
      .where(eq(users.id, dbUser.id));

    return {
      ...dbUser,
      admin: true,
      superAdmin: true,
      educationalLevel: "Tous",
      supabaseId: dbUser.supabaseId || authUser.id,
    };
  }

  const [newOwner] = await db.insert(users).values({
    utilisateur: email,
    nomPrenom: authUser.user_metadata?.full_name || email.split("@")[0] || "Super Admin",
    supabaseId: authUser.id,
    admin: true,
    superAdmin: true,
    langue: "FR",
    motDePasse: "SUPABASE_AUTH",
    educationalLevel: "Tous",
  }).returning();

  return newOwner ?? null;
}

// cache() ensures this function runs ONCE per request cycle
export const getCurrentUser = cache(async (): Promise<SessionUserRecord | null> => {
  // 1. Generate cookie hash to check cache BEFORE making any network requests
  let cacheKeyByCookie = "";
  try {
    const cookieStore = await cookies();
    const sbCookies = cookieStore.getAll()
      .filter(c => c.name.startsWith("sb-") && !c.name.includes("key"))
      .map(c => `${c.name}=${c.value}`)
      .sort() // Sort to ensure consistent order
      .join(";");
    
    if (sbCookies) {
      const hash = crypto.createHash("sha256").update(sbCookies).digest("hex");
      cacheKeyByCookie = `user_session_cookie:${hash}`;
      
      const cachedUser = await redisCache.get<SessionUserRecord>(cacheKeyByCookie);
      if (canUseCachedSession(cachedUser)) {
        console.log(`🚀 [Session Cache Hit] User session retrieved from cookie cache`);
        return cachedUser;
      }
    }
  } catch {
    // cookies() might throw if called outside a request context (e.g. static generation)
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Try Redis Cache by user ID next
  const cacheKeyById = `user_session:${user.id}`;
  const cachedUser = await redisCache.get<SessionUserRecord>(cacheKeyById);
  if (canUseCachedSession(cachedUser, user.email || "")) {
    console.log(`🚀 [Redis Hit] User session for ${user.id}`);
    if (cacheKeyByCookie) {
      await redisCache.set(cacheKeyByCookie, cachedUser, 120); // 2 minutes
    }
    return cachedUser;
  }

  const email = user.email || "";
  const usernamePart = email.split('@')[0];

  let retries = 4;
  let delay = 300;
  while (retries > 0) {
    try {
      // 1. Try to find by supabaseId first (most secure)
      // 2. Fallback to matching utilisateur with email or username part
      // Use readDb for session lookup
      const dbUser = await readDb.query.users.findFirst({
        where: or(
          eq(users.supabaseId, user.id),
          eq(users.utilisateur, email),
          eq(users.utilisateur, usernamePart)
        ),
        with: {
          role: {
            with: {
              permissions: true
            }
          },
          school: true
        }
      });

      // If found, cache it in Redis for 10 minutes
      let resolvedUser = dbUser as SessionUserRecord | null | undefined;

      if (resolvedUser) {
        resolvedUser = await ensurePlatformOwnerIfNeeded(resolvedUser, user, email);
        await redisCache.set(cacheKeyById, resolvedUser, 600);
        if (cacheKeyByCookie) {
          await redisCache.set(cacheKeyByCookie, resolvedUser, 120); // 2 minutes
        }
      }

      // If found by email but supabaseId is missing, link them now
      if (resolvedUser && !resolvedUser.supabaseId) {
        await db.update(users)
          .set({ supabaseId: user.id })
          .where(eq(users.id, resolvedUser.id));
        resolvedUser.supabaseId = user.id;
        // Update cache after link
        await redisCache.set(cacheKeyById, resolvedUser, 600);
        if (cacheKeyByCookie) {
          await redisCache.set(cacheKeyByCookie, resolvedUser, 120);
        }
      }

      // 3. If not found in DB but is in Supabase Auth, create a record automatically
      if (!resolvedUser && user.email) {
        const platformOwner = await ensurePlatformOwnerIfNeeded(null, user, email);
        if (platformOwner) {
          await redisCache.set(cacheKeyById, platformOwner, 600);
          if (cacheKeyByCookie) {
            await redisCache.set(cacheKeyByCookie, platformOwner, 120);
          }
          return platformOwner;
        }

        console.log(`[getCurrentUser] User ${user.email} not in DB, creating basic record...`);
        const [newUser] = await db.insert(users).values({
          utilisateur: user.email,
          nomPrenom: user.user_metadata?.full_name || user.email.split('@')[0],
          supabaseId: user.id,
          admin: false, // Default to non-admin
          langue: "FR",
          motDePasse: "SUPABASE_AUTH", // Placeholder for linked accounts
          educationalLevel: "Primaire",
        }).returning();
        
        if (newUser) {
          await redisCache.set(cacheKeyById, newUser, 600);
          if (cacheKeyByCookie) {
            await redisCache.set(cacheKeyByCookie, newUser, 120);
          }
        }
        return newUser ?? null;
      }

      return resolvedUser ?? null;
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      const isConnectionError = message.includes("CONNECT_TIMEOUT") || 
                               message.includes("Connection terminated") ||
                               message.includes("ECONNRESET");
      
      if (isConnectionError && retries > 1) {
        console.warn(`[getCurrentUser] DB Connection issue (retrying in ${delay}ms)... (${retries - 1} left). Error: ${message}`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      
      console.error("[getCurrentUser] DB Error:", getCauseMessage(error) ?? message);
      if (email && isConfiguredPlatformOwner(email)) {
        return createPlatformOwnerFallback(user, email);
      }
      return null; 
    }
  }
  return null;
});
