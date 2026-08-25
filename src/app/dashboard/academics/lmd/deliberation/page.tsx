import React from "react";
import { getUniversityPrograms } from "@/domains/academics/actions/lmd.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { readDb } from "@/infrastructure/database";
import { schoolClasses, schoolSessions, academicPeriods } from "@/infrastructure/database/schema/academics";
import { eq, or, isNull, asc, desc } from "drizzle-orm";
import DeliberationClient from "./deliberation-client";

export const dynamic = "force-dynamic";

export default async function UniversityDeliberationPage() {
  const schoolId = await getActiveSchoolId();

  const programsRes = await getUniversityPrograms(schoolId);
  const programs = programsRes.success ? (programsRes.data || []) : [];

  const classes = await readDb.query.schoolClasses.findMany({
    where: or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)),
    with: {
      section: true,
    },
    orderBy: [asc(schoolClasses.className)],
  });

  const sessions = await readDb.query.schoolSessions.findMany({
    where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
    orderBy: [desc(schoolSessions.startDate)],
  });

  const periods = await readDb.query.academicPeriods.findMany({
    where: or(eq(academicPeriods.schoolId, schoolId), isNull(academicPeriods.schoolId)),
    orderBy: [asc(academicPeriods.startDate)],
  });

  return (
    <DeliberationClient
      initialPrograms={programs}
      classes={classes}
      sessions={sessions}
      periods={periods}
    />
  );
}
