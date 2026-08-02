"use server";

import { headers } from "next/headers";
import { db, readDb } from "@/infrastructure/database";
import { schools } from "@/infrastructure/database/schema/auth";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { eq, asc } from "drizzle-orm";
import { cache as redisCache } from "@/lib/redis";

export async function getSchoolBranding() {
  try {
    const headerList = await headers();
    const slug = headerList.get("x-school-slug");

    if (slug) {
      const cacheKey = `school_branding:${slug}`;
      const cached = await redisCache.get<any>(cacheKey);
      if (cached) return cached;

      const school = await readDb.query.schools.findFirst({
        where: eq(schools.slug, slug),
        columns: {
          id: true,
          name: true,
          logoPath: true,
          slug: true,
        }
      });

      if (school) {
        let logo = school.logoPath;
        if (!logo) {
          const branch = await readDb.query.schoolBranches.findFirst({
            where: eq(schoolBranches.schoolId, school.id as any),
          });
          logo = branch?.logoPath || null;
        }
        const result = { ...school, logoPath: logo };
        await redisCache.set(cacheKey, result, 3600);
        return result;
      }
    }

    // Fallback for main domain: fetch primary school & logo
    const primarySchool = await readDb.query.schools.findFirst({
      orderBy: [asc(schools.id)],
    });

    if (primarySchool) {
      let logo = primarySchool.logoPath;
      if (!logo) {
        const branch = await readDb.query.schoolBranches.findFirst({
          where: eq(schoolBranches.schoolId, primarySchool.id),
        });
        logo = branch?.logoPath || null;
      }
      return {
        name: primarySchool.name,
        logoPath: logo,
        slug: primarySchool.slug,
      };
    }
  } catch (error) {
    console.error("Error fetching school branding:", error);
  }

  return null;
}
