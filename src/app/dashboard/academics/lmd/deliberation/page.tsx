import React from "react";
import { getUniversityPrograms } from "@/domains/academics/actions/lmd.actions";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { readDb } from "@/infrastructure/database";
import {
  schoolClasses,
  schoolSections,
  educationalLevels,
  schoolSessions,
  academicPeriods
} from "@/infrastructure/database/schema/academics";
import { eq, or, isNull, asc, desc } from "drizzle-orm";
import DeliberationClient from "./deliberation-client";

export const dynamic = "force-dynamic";

export default async function UniversityDeliberationPage() {
  const schoolId = await getActiveSchoolId();

  const [programsRes, classes, sections, levels, sessions, periods] = await Promise.all([
    getUniversityPrograms(schoolId),
    readDb.query.schoolClasses.findMany({
      where: or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)),
      with: {
        section: true,
      },
      orderBy: [asc(schoolClasses.className)],
    }),
    readDb.query.schoolSections.findMany({
      where: or(eq(schoolSections.schoolId, schoolId), isNull(schoolSections.schoolId)),
      orderBy: [asc(schoolSections.sectionName)],
    }),
    readDb.query.educationalLevels.findMany({
      where: or(eq(educationalLevels.schoolId, schoolId), isNull(educationalLevels.schoolId)),
      orderBy: [asc(educationalLevels.levelName)],
    }),
    readDb.query.schoolSessions.findMany({
      where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
      orderBy: [desc(schoolSessions.startDate)],
    }),
    readDb.query.academicPeriods.findMany({
      where: or(eq(academicPeriods.schoolId, schoolId), isNull(academicPeriods.schoolId)),
      orderBy: [asc(academicPeriods.startDate)],
    }),
  ]);

  const programs = programsRes.success ? (programsRes.data || []) : [];

  return (
    <DeliberationClient
      initialPrograms={programs}
      classes={classes}
      sections={sections}
      levels={levels}
      sessions={sessions}
      periods={periods}
    />
  );
}
