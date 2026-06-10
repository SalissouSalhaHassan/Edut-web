import { cache } from "react";
import { createClient } from "@/shared/utils/supabase/server";
import { db, readDb } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { sql, eq, or } from "drizzle-orm";
import { cache as redisCache } from "@/lib/redis";
import { cookies } from "next/headers";
import crypto from "crypto";

// cache() ensures this function runs ONCE per request cycle
export const getCurrentUser = cache(async () => {
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
      
      const cachedUser = await redisCache.get<any>(cacheKeyByCookie);
      if (cachedUser && cachedUser.utilisateur !== 'superadmin@gmail.com') {
        console.log(`🚀 [Session Cache Hit] User session retrieved from cookie cache`);
        return cachedUser;
      }
    }
  } catch (cookieErr) {
    // cookies() might throw if called outside a request context (e.g. static generation)
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Try Redis Cache by user ID next
  const cacheKeyById = `user_session:${user.id}`;
  const cachedUser = await redisCache.get<any>(cacheKeyById);
  if (cachedUser && cachedUser.utilisateur !== 'superadmin@gmail.com') {
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
      if (dbUser) {
        await redisCache.set(cacheKeyById, dbUser, 600);
        if (cacheKeyByCookie) {
          await redisCache.set(cacheKeyByCookie, dbUser, 120); // 2 minutes
        }
      }

      // If found by email but supabaseId is missing, link them now
      if (dbUser && !dbUser.supabaseId) {
        await db.update(users)
          .set({ supabaseId: user.id })
          .where(eq(users.id, dbUser.id));
        dbUser.supabaseId = user.id;
        // Update cache after link
        await redisCache.set(cacheKeyById, dbUser, 600);
        if (cacheKeyByCookie) {
          await redisCache.set(cacheKeyByCookie, dbUser, 120);
        }
      }

      // 3. If not found in DB but is in Supabase Auth, create a record automatically
      if (!dbUser && user.email) {
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

      return dbUser ?? null;
    } catch (error: any) {
      const isConnectionError = error?.message?.includes("CONNECT_TIMEOUT") || 
                               error?.message?.includes("Connection terminated") ||
                               error?.message?.includes("ECONNRESET");
      
      if (isConnectionError && retries > 1) {
        console.warn(`[getCurrentUser] DB Connection issue (retrying in ${delay}ms)... (${retries - 1} left). Error: ${error.message}`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      
      console.error("[getCurrentUser] DB Error:", error?.cause?.message ?? error?.message);
      return null; 
    }
  }
  return null;
});
