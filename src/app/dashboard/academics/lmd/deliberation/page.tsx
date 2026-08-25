import React from "react";
import { getUniversityPrograms } from "@/domains/academics/actions/lmd.actions";
import { readDb } from "@/infrastructure/database";
import { schoolClasses, schoolSessions } from "@/infrastructure/database/schema/academics";
import { eq, asc, desc } from "drizzle-orm";
import DeliberationClient from "./deliberation-client";

export const dynamic = "force-dynamic";

export default async function UniversityDeliberationPage() {
  const programsRes = await getUniversityPrograms(1);
  const programs = programsRes.success ? (programsRes.data || []) : [];

  const classes = await readDb.query.schoolClasses.findMany({
    where: eq(schoolClasses.schoolId, 1),
    with: {
      section: true,
    },
    orderBy: [asc(schoolClasses.className)],
  });

  const sessions = await readDb.query.schoolSessions.findMany({
    where: eq(schoolSessions.schoolId, 1),
    orderBy: [desc(schoolSessions.startDate)],
  });

  return (
    <DeliberationClient
      initialPrograms={programs}
      classes={classes}
      sessions={sessions}
    />
  );
}
