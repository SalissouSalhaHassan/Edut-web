import { getCurrentUser } from "@/domains/auth/services/session";
import { db } from "@/infrastructure/database";
import { syncConflicts } from "@/infrastructure/database/schema/audit";
import { eq, desc } from "drizzle-orm";
import ConflitsClient from "./conflits-client";

export const dynamic = "force-dynamic";

export default async function ConflitsPage() {
  const user = await getCurrentUser();
  let serverConflicts: any[] = [];

  if (user?.schoolId) {
    try {
      serverConflicts = await db.query.syncConflicts.findMany({
        where: eq(syncConflicts.schoolId, user.schoolId),
        orderBy: [desc(syncConflicts.createdAt)],
        limit: 50,
      });
    } catch (e) {
      console.warn("Could not load server conflicts:", e);
    }
  }

  return <ConflitsClient initialServerConflicts={serverConflicts} />;
}

