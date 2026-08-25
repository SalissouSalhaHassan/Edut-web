"use server";

import { db, readDb } from "@/infrastructure/database";
import {
  universityFaculties,
  universityDepartments,
  universityPrograms,
  lmdUnitesEnseignement,
  lmdElementsConstitutifs,
  studentLmdUeResults,
  studentLmdSemesters,
  schoolClasses,
  schoolSessions,
  studentResults,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deliberateSemester, UeInput, EcuInput } from "../utils/lmd-engine";

// ─── 1. FACULTÉS / ÉCOLES / UFR ──────────────────────────────────────────────
export async function getFaculties(schoolId: number = 1) {
  try {
    const list = await readDb.query.universityFaculties.findMany({
      where: eq(universityFaculties.schoolId, schoolId),
      with: {
        dean: true,
        departments: {
          with: {
            head: true,
            programs: true,
          }
        }
      },
      orderBy: [asc(universityFaculties.name)],
    });
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveFaculty(data: {
  id?: number;
  schoolId: number;
  name: string;
  code?: string;
  deanEmployeeId?: number;
  description?: string;
}) {
  try {
    if (data.id) {
      await db.update(universityFaculties).set({
        name: data.name,
        code: data.code,
        deanEmployeeId: data.deanEmployeeId,
        description: data.description,
      }).where(eq(universityFaculties.id, data.id));
    } else {
      await db.insert(universityFaculties).values({
        schoolId: data.schoolId,
        name: data.name,
        code: data.code,
        deanEmployeeId: data.deanEmployeeId,
        description: data.description,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFaculty(id: number) {
  try {
    await db.delete(universityFaculties).where(eq(universityFaculties.id, id));
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 2. DÉPARTEMENTS ACADÉMIQUES ─────────────────────────────────────────────
export async function saveDepartment(data: {
  id?: number;
  facultyId: number;
  name: string;
  code?: string;
  headEmployeeId?: number;
  description?: string;
}) {
  try {
    if (data.id) {
      await db.update(universityDepartments).set({
        name: data.name,
        code: data.code,
        headEmployeeId: data.headEmployeeId,
        description: data.description,
      }).where(eq(universityDepartments.id, data.id));
    } else {
      await db.insert(universityDepartments).values({
        facultyId: data.facultyId,
        name: data.name,
        code: data.code,
        headEmployeeId: data.headEmployeeId,
        description: data.description,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteDepartment(id: number) {
  try {
    await db.delete(universityDepartments).where(eq(universityDepartments.id, id));
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 3. FILIÈRES ET PARCOURS LMD ─────────────────────────────────────────────
export async function getUniversityPrograms(schoolId: number = 1) {
  try {
    const list = await readDb.query.universityPrograms.findMany({
      where: eq(universityPrograms.schoolId, schoolId),
      with: {
        department: {
          with: {
            faculty: true,
          }
        },
        unitesEnseignement: {
          with: {
            elementsConstitutifs: {
              with: {
                teacher: true,
                subject: true,
              }
            }
          }
        }
      },
      orderBy: [asc(universityPrograms.name)],
    });
    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveUniversityProgram(data: {
  id?: number;
  schoolId: number;
  departmentId: number;
  name: string;
  code?: string;
  degreeLevel: string;
  totalCredits?: number;
  durationSemesters?: number;
  description?: string;
}) {
  try {
    if (data.id) {
      await db.update(universityPrograms).set({
        departmentId: data.departmentId,
        name: data.name,
        code: data.code,
        degreeLevel: data.degreeLevel,
        totalCredits: data.totalCredits || (data.degreeLevel === "Master" ? 120 : 180),
        durationSemesters: data.durationSemesters || (data.degreeLevel === "Master" ? 4 : 6),
        description: data.description,
      }).where(eq(universityPrograms.id, data.id));
    } else {
      await db.insert(universityPrograms).values({
        schoolId: data.schoolId,
        departmentId: data.departmentId,
        name: data.name,
        code: data.code,
        degreeLevel: data.degreeLevel,
        totalCredits: data.totalCredits || (data.degreeLevel === "Master" ? 120 : 180),
        durationSemesters: data.durationSemesters || (data.degreeLevel === "Master" ? 4 : 6),
        description: data.description,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniversityProgram(id: number) {
  try {
    await db.delete(universityPrograms).where(eq(universityPrograms.id, id));
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 4. MAQUETTE PÉDAGOGIQUE (UE & ECU) ───────────────────────────────────────
export async function getMaquettePedagogique(programId: number, semester?: string) {
  try {
    const whereClause = semester
      ? and(eq(lmdUnitesEnseignement.programId, programId), eq(lmdUnitesEnseignement.semester, semester))
      : eq(lmdUnitesEnseignement.programId, programId);

    const ues = await readDb.query.lmdUnitesEnseignement.findMany({
      where: whereClause,
      with: {
        elementsConstitutifs: {
          with: {
            subject: true,
            teacher: true,
          },
          orderBy: [asc(lmdElementsConstitutifs.nameEcu)],
        }
      },
      orderBy: [asc(lmdUnitesEnseignement.codeUe)],
    });

    const totalCredits = ues.reduce((sum, ue) => sum + Number(ue.creditsEcts || 0), 0);

    return {
      success: true,
      data: {
        ues,
        totalCredits,
        isCompliant30Credits: totalCredits === 30,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveUniteEnseignement(data: {
  id?: number;
  programId: number;
  semester: string;
  codeUe: string;
  nameUe: string;
  typeUe?: "Fondamentale" | "Méthodologique" | "Transversale" | "Optionnelle";
  creditsEcts: number;
  totalHours?: number;
  minPassingGrade?: number;
  isEliminatory?: boolean;
}) {
  try {
    if (data.id) {
      await db.update(lmdUnitesEnseignement).set({
        semester: data.semester,
        codeUe: data.codeUe,
        nameUe: data.nameUe,
        typeUe: data.typeUe || "Fondamentale",
        creditsEcts: data.creditsEcts,
        totalHours: data.totalHours || 60.0,
        minPassingGrade: data.minPassingGrade || 10.0,
        isEliminatory: data.isEliminatory || false,
      }).where(eq(lmdUnitesEnseignement.id, data.id));
    } else {
      await db.insert(lmdUnitesEnseignement).values({
        programId: data.programId,
        semester: data.semester,
        codeUe: data.codeUe,
        nameUe: data.nameUe,
        typeUe: data.typeUe || "Fondamentale",
        creditsEcts: data.creditsEcts,
        totalHours: data.totalHours || 60.0,
        minPassingGrade: data.minPassingGrade || 10.0,
        isEliminatory: data.isEliminatory || false,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniteEnseignement(id: number) {
  try {
    await db.delete(lmdUnitesEnseignement).where(eq(lmdUnitesEnseignement.id, id));
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveElementConstitutif(data: {
  id?: number;
  ueId: number;
  subjectId?: number;
  codeEcu?: string;
  nameEcu: string;
  creditsEcts?: number;
  coefficient?: number;
  hoursCm?: number;
  hoursTd?: number;
  hoursTp?: number;
  hoursTpe?: number;
  teacherEmployeeId?: number;
  eliminatoryGrade?: number;
}) {
  try {
    if (data.id) {
      await db.update(lmdElementsConstitutifs).set({
        subjectId: data.subjectId,
        codeEcu: data.codeEcu,
        nameEcu: data.nameEcu,
        creditsEcts: data.creditsEcts || 3.0,
        coefficient: data.coefficient || 1,
        hoursCm: data.hoursCm || 24.0,
        hoursTd: data.hoursTd || 12.0,
        hoursTp: data.hoursTp || 0.0,
        hoursTpe: data.hoursTpe || 24.0,
        teacherEmployeeId: data.teacherEmployeeId,
        eliminatoryGrade: data.eliminatoryGrade || 7.0,
      }).where(eq(lmdElementsConstitutifs.id, data.id));
    } else {
      await db.insert(lmdElementsConstitutifs).values({
        ueId: data.ueId,
        subjectId: data.subjectId,
        codeEcu: data.codeEcu,
        nameEcu: data.nameEcu,
        creditsEcts: data.creditsEcts || 3.0,
        coefficient: data.coefficient || 1,
        hoursCm: data.hoursCm || 24.0,
        hoursTd: data.hoursTd || 12.0,
        hoursTp: data.hoursTp || 0.0,
        hoursTpe: data.hoursTpe || 24.0,
        teacherEmployeeId: data.teacherEmployeeId,
        eliminatoryGrade: data.eliminatoryGrade || 7.0,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteElementConstitutif(id: number) {
  try {
    await db.delete(lmdElementsConstitutifs).where(eq(lmdElementsConstitutifs.id, id));
    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 5. SALLE DE DÉLIBÉRATION DU JURY LMD ────────────────────────────────────
export async function getLmdDeliberationCohort(
  programId: number,
  classId: number,
  semester: string,
  sessionId: number
) {
  try {
    // 1. Fetch Maquette UEs and ECUs
    const ues = await readDb.query.lmdUnitesEnseignement.findMany({
      where: and(
        eq(lmdUnitesEnseignement.programId, programId),
        eq(lmdUnitesEnseignement.semester, semester)
      ),
      with: {
        elementsConstitutifs: true,
      }
    });

    // 2. Fetch Students of the Class
    const enrolledStudents = await readDb.query.students.findMany({
      where: eq(students.classId, classId),
      orderBy: [asc(students.nomEtudiant)],
    });

    // 3. Fetch Grades of Students for this Session & Term
    const results = await readDb.query.studentResults.findMany({
      where: and(
        eq(studentResults.classId, classId),
        eq(studentResults.sessionId, sessionId)
      )
    });

    const resultMap = new Map<string, any>();
    for (const r of results) {
      resultMap.set(`${r.studentId}_${r.subjectId}`, r);
    }

    // 4. Compute LMD Deliberation for each student
    const cohortDeliberation = enrolledStudents.map((st) => {
      const studentUeInputs: UeInput[] = ues.map((ue) => {
        const ecus: EcuInput[] = ue.elementsConstitutifs.map((ecu) => {
          const res = ecu.subjectId ? resultMap.get(`${st.id}_${ecu.subjectId}`) : null;
          return {
            id: ecu.id,
            codeEcu: ecu.codeEcu || undefined,
            nameEcu: ecu.nameEcu,
            coefficient: ecu.coefficient || 1,
            creditsEcts: Number(ecu.creditsEcts) || 3.0,
            eliminatoryGrade: Number(ecu.eliminatoryGrade) || 7.0,
            classWorkScore: res?.classWorkScore !== null && res?.classWorkScore !== undefined ? Number(res.classWorkScore) : null,
            examScore: res?.examScore !== null && res?.examScore !== undefined ? Number(res.examScore) : null,
          };
        });

        return {
          id: ue.id,
          codeUe: ue.codeUe,
          nameUe: ue.nameUe,
          typeUe: (ue.typeUe as any) || "Fondamentale",
          creditsEcts: Number(ue.creditsEcts) || 6.0,
          minPassingGrade: Number(ue.minPassingGrade) || 10.0,
          isEliminatory: ue.isEliminatory || false,
          ecus,
        };
      });

      const deliberation = deliberateSemester(studentUeInputs, semester);

      return {
        student: {
          id: st.id,
          matricule: st.numAdmission,
          nom: st.nomEtudiant,
          sexe: st.sexe,
          photoUrl: st.photoPath,
        },
        deliberation,
      };
    });

    // Rank cohort by semester average
    cohortDeliberation.sort((a, b) => b.deliberation.semesterAverage - a.deliberation.semesterAverage);

    const cohortWithRank = cohortDeliberation.map((c, index) => ({
      ...c,
      rank: index + 1,
    }));

    return {
      success: true,
      data: {
        ues,
        cohort: cohortWithRank,
        totalStudents: cohortWithRank.length,
        passedCount: cohortWithRank.filter(c => c.deliberation.isSemesterValidated).length,
        successRate: cohortWithRank.length > 0
          ? Number(((cohortWithRank.filter(c => c.deliberation.isSemesterValidated).length / cohortWithRank.length) * 100).toFixed(1))
          : 0,
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveLmdDeliberation(payload: {
  programId: number;
  classId: number;
  semester: string;
  sessionId: number;
  cohort: any[];
  academicYear?: string;
}) {
  try {
    const { programId, classId, semester, sessionId, cohort, academicYear } = payload;

    await Promise.all(
      cohort.map(async (row) => {
        const studentId = row.student.id;
        const delib = row.deliberation;

        // 1. Save or update Semester Summary
        const existingSem = await readDb.query.studentLmdSemesters.findFirst({
          where: and(
            eq(studentLmdSemesters.studentId, studentId),
            eq(studentLmdSemesters.semester, semester),
            eq(studentLmdSemesters.sessionId, sessionId)
          )
        });

        const semValues = {
          studentId,
          programId,
          classId,
          semester,
          sessionId,
          semesterAverage: delib.semesterAverage,
          creditsAcquired: delib.creditsAcquired,
          decision: delib.decision,
          rank: `${row.rank}ème`,
          mention: delib.mention,
          sessionType: "Normale",
          validatedAt: new Date(),
        };

        if (existingSem) {
          await db.update(studentLmdSemesters).set(semValues).where(eq(studentLmdSemesters.id, existingSem.id));
        } else {
          await db.insert(studentLmdSemesters).values(semValues);
        }

        // 2. Save or update UE Results
        for (const ueRes of delib.ueResults) {
          const existingUe = await readDb.query.studentLmdUeResults.findFirst({
            where: and(
              eq(studentLmdUeResults.studentId, studentId),
              eq(studentLmdUeResults.ueId, ueRes.id),
              eq(studentLmdUeResults.sessionId, sessionId)
            )
          });

          const ueValues = {
            studentId,
            ueId: ueRes.id,
            sessionId,
            semester,
            rawAverage: ueRes.average,
            validatedStatus: ueRes.status,
            creditsAcquired: ueRes.creditsAcquired,
            sessionAcquisition: "Normale",
            academicYear: academicYear || new Date().getFullYear().toString(),
          };

          if (existingUe) {
            await db.update(studentLmdUeResults).set(ueValues).where(eq(studentLmdUeResults.id, existingUe.id));
          } else {
            await db.insert(studentLmdUeResults).values(ueValues);
          }
        }
      })
    );

    revalidatePath("/dashboard/academics/lmd");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
