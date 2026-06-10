"use server";

import { headers } from "next/headers";
import { db, readDb } from "@/infrastructure/database";
import { schools } from "@/infrastructure/database/schema/auth";
import { eq } from "drizzle-orm";
import { cache as redisCache } from "@/lib/redis";

export async function getSchoolBranding() {
  const headerList = await headers();
  const slug = headerList.get("x-school-slug");

  if (!slug) return null;

  // Try Redis Cache first
  const cacheKey = `school_branding:${slug}`;
  const cached = await redisCache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const school = await readDb.query.schools.findFirst({
      where: eq(schools.slug, slug),
      columns: {
        name: true,
        logoPath: true,
        slug: true,
      }
    });

    if (school) {
      await redisCache.set(cacheKey, school, 3600); // Cache for 1 hour
      return school;
    }
  } catch (error) {
    console.error("Error fetching school branding:", error);
  }

  return null;
}
