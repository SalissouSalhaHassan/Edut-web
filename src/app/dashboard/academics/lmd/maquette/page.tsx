import React from "react";
import { getUniversityPrograms, getFaculties } from "@/domains/academics/actions/lmd.actions";
import { readDb } from "@/infrastructure/database";
import { schoolSubjects } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, asc } from "drizzle-orm";
import MaquetteClient from "./maquette-client";

export const dynamic = "force-dynamic";

export default async function UniversityMaquettePage() {
  const programsRes = await getUniversityPrograms(1);
  const facultiesRes = await getFaculties(1);

  const subjects = await readDb.query.schoolSubjects.findMany({
    where: eq(schoolSubjects.schoolId, 1),
    orderBy: [asc(schoolSubjects.subjectName)],
  });

  const teachers = await readDb.query.employees.findMany({
    where: eq(employees.schoolId, 1),
    orderBy: [asc(employees.nom)],
  });

  return (
    <MaquetteClient
      initialPrograms={programsRes.success ? (programsRes.data || []) : []}
      initialFaculties={facultiesRes.success ? (facultiesRes.data || []) : []}
      subjects={subjects}
      teachers={teachers}
    />
  );
}
