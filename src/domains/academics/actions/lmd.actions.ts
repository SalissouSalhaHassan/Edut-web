"use server";

import { db, readDb } from "@/infrastructure/database";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  universityFaculties,
  universityDepartments,
  universityPrograms,
  lmdUnitesEnseignement,
  lmdElementsConstitutifs,
  studentLmdUeResults,
  studentLmdSemesters,
  schoolClasses,
  schoolSections,
  educationalLevels,
  schoolSessions,
  academicPeriods,
  schoolSubjects,
  classSubjects,
  studentResults,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, desc, asc, or, ilike, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deliberateSemester, UeInput, EcuInput } from "../utils/lmd-engine";

// ─── 0. SYNCHRONISATION AUTOMATIQUE AVEC LES PARAMÈTRES ACADÉMIQUES ───────────
/**
 * Scanne les paramètres académiques réels (settings?tab=academic):
 * - Sections & Filières (school_sections)
 * - Classes & Promotions (school_classes)
 * - Sessions académiques (school_sessions)
 * - Périodes & Semestres (academic_periods)
 * et initialise ou synchronise la cartographie LMD sans doublons.
 */
export async function syncAcademicSettingsToLmd(inputSchoolId?: number) {
  const schoolId: number = inputSchoolId || await getActiveSchoolId();
  try {
    // 1. Récupérer les données réelles configurées
    const [realSections, realClasses, realSessions, realSubjects, existingFaculties, existingPrograms] = await Promise.all([
      readDb.query.schoolSections.findMany({
        where: or(eq(schoolSections.schoolId, schoolId), isNull(schoolSections.schoolId)),
        orderBy: [asc(schoolSections.sectionName)],
      }),
      readDb.query.schoolClasses.findMany({
        where: or(eq(schoolClasses.schoolId, schoolId), isNull(schoolClasses.schoolId)),
        orderBy: [asc(schoolClasses.className)],
      }),
      readDb.query.schoolSessions.findMany({
        where: or(eq(schoolSessions.schoolId, schoolId), isNull(schoolSessions.schoolId)),
        orderBy: [desc(schoolSessions.startDate)],
      }),
      readDb.query.schoolSubjects.findMany({
        where: or(eq(schoolSubjects.schoolId, schoolId), isNull(schoolSubjects.schoolId)),
        orderBy: [asc(schoolSubjects.subjectName)],
      }),
      readDb.query.universityFaculties.findMany({
        where: eq(universityFaculties.schoolId, schoolId),
        with: { departments: true },
      }),
      readDb.query.universityPrograms.findMany({
        where: eq(universityPrograms.schoolId, schoolId),
      }),
    ]);

    // 2. Créer une Faculté Principale si aucune n'existe
    let defaultFacultyId: number;
    let defaultDeptId: number;

    if (existingFaculties.length === 0) {
      const [newFac] = await db.insert(universityFaculties).values({
        schoolId,
        name: "Faculté des Sciences, Technologies & Gestion",
        code: "FSTG",
        description: "Faculté principale synchronisée depuis les paramètres académiques",
      }).returning({ id: universityFaculties.id });

      defaultFacultyId = newFac.id;

      const [newDept] = await db.insert(universityDepartments).values({
        facultyId: defaultFacultyId,
        name: "Département des Cursus Universitaires & Professionnels",
        code: "DCUP",
        description: "Département fédérant les filières LMD",
      }).returning({ id: universityDepartments.id });

      defaultDeptId = newDept.id;
    } else {
      defaultFacultyId = existingFaculties[0].id;
      if (existingFaculties[0].departments.length > 0) {
        defaultDeptId = existingFaculties[0].departments[0].id;
      } else {
        const [newDept] = await db.insert(universityDepartments).values({
          facultyId: defaultFacultyId,
          name: "Département Académique",
          code: "DEPT-1",
        }).returning({ id: universityDepartments.id });
        defaultDeptId = newDept.id;
      }
    }

    // 3. Mapper chaque section réelle vers un programme/filière LMD
    const programSectionMap = new Map<number, number>();
    for (const prog of existingPrograms) {
      if (prog.sectionId) {
        programSectionMap.set(prog.sectionId, prog.id);
      }
    }

    let createdProgramsCount = 0;
    for (const sec of realSections) {
      if (!programSectionMap.has(sec.id)) {
        const isMaster = (sec.sectionName || "").toLowerCase().includes("master") || (sec.educationalLevel || "").toLowerCase().includes("master");
        const degreeLevel = isMaster ? "Master" : "Licence";
        const totalCredits = isMaster ? 120 : 180;
        const durationSemesters = isMaster ? 4 : 6;

        const [createdProg] = await db.insert(universityPrograms).values({
          schoolId,
          departmentId: defaultDeptId,
          sectionId: sec.id,
          name: sec.sectionName,
          code: sec.series || `FIL-${sec.id}`,
          degreeLevel,
          totalCredits,
          durationSemesters,
          description: sec.description || `Filière LMD issue de la section ${sec.sectionName}`,
          isActive: true,
        }).returning({ id: universityPrograms.id });

        programSectionMap.set(sec.id, createdProg.id);
        createdProgramsCount++;

        // 4. Générer des UE standard (S1 & S2) pour la nouvelle filière si des matières existent
        if (realSubjects.length > 0) {
          const subjectsChunk1 = realSubjects.slice(0, Math.min(4, realSubjects.length));
          const subjectsChunk2 = realSubjects.slice(4, Math.min(8, realSubjects.length));

          // UE Fondamentale S1
          const [ue1] = await db.insert(lmdUnitesEnseignement).values({
            programId: createdProg.id,
            semester: "S1",
            codeUe: `UE11-${sec.id}`,
            nameUe: "UE Fondamentale & Méthodologique 1",
            typeUe: "Fondamentale",
            creditsEcts: 18.0,
            totalHours: 180.0,
            minPassingGrade: 10.0,
          }).returning({ id: lmdUnitesEnseignement.id });

          for (const sb of subjectsChunk1) {
            await db.insert(lmdElementsConstitutifs).values({
              ueId: ue1.id,
              subjectId: sb.id,
              codeEcu: sb.subjectCode || `ECU-${sb.id}`,
              nameEcu: sb.subjectName,
              creditsEcts: 4.5,
              coefficient: 2,
              hoursCm: 30,
              hoursTd: 15,
              hoursTp: 0,
              hoursTpe: 30,
              eliminatoryGrade: 7.0,
            });
          }

          // UE Transversale S1
          const [ue2] = await db.insert(lmdUnitesEnseignement).values({
            programId: createdProg.id,
            semester: "S1",
            codeUe: `UE12-${sec.id}`,
            nameUe: "UE Transversale & Langues 1",
            typeUe: "Transversale",
            creditsEcts: 12.0,
            totalHours: 120.0,
            minPassingGrade: 10.0,
          }).returning({ id: lmdUnitesEnseignement.id });

          for (const sb of (subjectsChunk2.length > 0 ? subjectsChunk2 : subjectsChunk1.slice(0, 2))) {
            await db.insert(lmdElementsConstitutifs).values({
              ueId: ue2.id,
              subjectId: sb.id,
              codeEcu: sb.subjectCode || `ECU-TR-${sb.id}`,
              nameEcu: sb.subjectName,
              creditsEcts: 6.0,
              coefficient: 1,
              hoursCm: 20,
              hoursTd: 10,
              hoursTp: 0,
              hoursTpe: 20,
              eliminatoryGrade: 7.0,
            });
          }
        }
      }
    }

    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");

    return {
      success: true,
      message: `Synchronisation réussie : ${createdProgramsCount} filière(s) initialisée(s) à partir de vos paramètres réels.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 1. FACULTÉS / ÉCOLES / UFR ──────────────────────────────────────────────
export async function getFaculties(inputSchoolId?: number) {
  const schoolId: number = inputSchoolId || await getActiveSchoolId();
  try {
    let list = await readDb.query.universityFaculties.findMany({
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

    // Si aucune faculté n'existe, synchroniser automatiquement
    if (list.length === 0) {
      await syncAcademicSettingsToLmd(schoolId);
      list = await readDb.query.universityFaculties.findMany({
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
    }

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
export async function getUniversityPrograms(inputSchoolId?: number) {
  const schoolId: number = inputSchoolId || await getActiveSchoolId();
  try {
    let list = await readDb.query.universityPrograms.findMany({
      where: eq(universityPrograms.schoolId, schoolId),
      with: {
        department: {
          with: {
            faculty: true,
          }
        },
        section: true,
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

    // Si aucune filière n'est configurée, synchroniser avec les sections réelles
    if (list.length === 0) {
      await syncAcademicSettingsToLmd(schoolId);
      list = await readDb.query.universityPrograms.findMany({
        where: eq(universityPrograms.schoolId, schoolId),
        with: {
          department: {
            with: {
              faculty: true,
            }
          },
          section: true,
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
    }

    return { success: true, data: list };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveUniversityProgram(data: {
  id?: number;
  schoolId: number;
  departmentId: number;
  sectionId?: number;
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
        sectionId: data.sectionId || null,
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
        sectionId: data.sectionId || null,
        name: data.name,
        code: data.code,
        degreeLevel: data.degreeLevel,
        totalCredits: data.totalCredits || (data.degreeLevel === "Master" ? 120 : 180),
        durationSemesters: data.durationSemesters || (data.degreeLevel === "Master" ? 4 : 6),
        description: data.description,
      });
    }
    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniversityProgram(id: number) {
  try {
    await db.delete(universityPrograms).where(eq(universityPrograms.id, id));
    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 4. MAQUETTE PÉDAGOGIQUE (UE & ECU) ───────────────────────────────────────
export async function getMaquettePedagogique(programId: number, semester: string) {
  try {
    const ues = await readDb.query.lmdUnitesEnseignement.findMany({
      where: and(
        eq(lmdUnitesEnseignement.programId, programId),
        eq(lmdUnitesEnseignement.semester, semester)
      ),
      with: {
        elementsConstitutifs: {
          with: {
            teacher: true,
            subject: true,
          }
        }
      },
      orderBy: [asc(lmdUnitesEnseignement.codeUe)],
    });

    const totalCredits = ues.reduce((acc, ue) => acc + (Number(ue.creditsEcts) || 0), 0);
    const totalHours = ues.reduce((acc, ue) => acc + (Number(ue.totalHours) || 0), 0);

    return {
      success: true,
      data: {
        ues,
        totalCredits,
        totalHours,
        isCompliant30Credits: totalCredits === 30.0,
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
  typeUe: string;
  creditsEcts: number;
  totalHours?: number;
  minPassingGrade?: number;
  isEliminatory?: boolean;
}) {
  try {
    if (data.id) {
      await db.update(lmdUnitesEnseignement).set({
        codeUe: data.codeUe,
        nameUe: data.nameUe,
        typeUe: data.typeUe,
        creditsEcts: data.creditsEcts,
        totalHours: data.totalHours,
        minPassingGrade: data.minPassingGrade || 10.0,
        isEliminatory: data.isEliminatory || false,
      }).where(eq(lmdUnitesEnseignement.id, data.id));
    } else {
      await db.insert(lmdUnitesEnseignement).values({
        programId: data.programId,
        semester: data.semester,
        codeUe: data.codeUe,
        nameUe: data.nameUe,
        typeUe: data.typeUe,
        creditsEcts: data.creditsEcts,
        totalHours: data.totalHours || 60,
        minPassingGrade: data.minPassingGrade || 10.0,
        isEliminatory: data.isEliminatory || false,
      });
    }
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniteEnseignement(id: number) {
  try {
    await db.delete(lmdUnitesEnseignement).where(eq(lmdUnitesEnseignement.id, id));
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
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
        creditsEcts: data.creditsEcts,
        coefficient: data.coefficient,
        hoursCm: data.hoursCm,
        hoursTd: data.hoursTd,
        hoursTp: data.hoursTp,
        hoursTpe: data.hoursTpe,
        teacherEmployeeId: data.teacherEmployeeId,
        eliminatoryGrade: data.eliminatoryGrade,
      }).where(eq(lmdElementsConstitutifs.id, data.id));
    } else {
      await db.insert(lmdElementsConstitutifs).values({
        ueId: data.ueId,
        subjectId: data.subjectId,
        codeEcu: data.codeEcu,
        nameEcu: data.nameEcu,
        creditsEcts: data.creditsEcts || 3.0,
        coefficient: data.coefficient || 1,
        hoursCm: data.hoursCm || 24,
        hoursTd: data.hoursTd || 12,
        hoursTp: data.hoursTp || 0,
        hoursTpe: data.hoursTpe || 24,
        teacherEmployeeId: data.teacherEmployeeId,
        eliminatoryGrade: data.eliminatoryGrade || 7.0,
      });
    }
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteElementConstitutif(id: number) {
  try {
    await db.delete(lmdElementsConstitutifs).where(eq(lmdElementsConstitutifs.id, id));
    revalidatePath("/dashboard/academics/lmd/maquette");
    revalidatePath("/dashboard/academics/lmd/deliberation");
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
  sessionId: number,
  sessionType: "Normale" | "Rattrapage" = "Normale"
) {
  try {
    const semNumMatch = semester.match(/\d+/);
    const semNum = semNumMatch ? semNumMatch[0] : "1";
    const sCode = `S${semNum}`;

    // 0. Résoudre programId si 0 ou manquant à partir de la classe
    let resolvedProgramId = programId;
    if (!resolvedProgramId || resolvedProgramId === 0) {
      const cls = await readDb.query.schoolClasses.findFirst({
        where: eq(schoolClasses.id, classId),
      });
      if (cls?.sectionId) {
        const prog = await readDb.query.universityPrograms.findFirst({
          where: eq(universityPrograms.sectionId, cls.sectionId),
        });
        if (prog) {
          resolvedProgramId = prog.id;
        }
      }
    }

    // 1. Récupérer les UEs et ECUs configurés pour ce programme et semestre (support S1, 1er Semestre, etc.)
    let ues: any[] = [];
    if (resolvedProgramId && resolvedProgramId > 0) {
      ues = await readDb.query.lmdUnitesEnseignement.findMany({
        where: and(
          eq(lmdUnitesEnseignement.programId, resolvedProgramId),
          or(
            eq(lmdUnitesEnseignement.semester, semester),
            eq(lmdUnitesEnseignement.semester, sCode),
            eq(lmdUnitesEnseignement.semester, `Semestre ${semNum}`),
            ilike(lmdUnitesEnseignement.semester, `%${sCode}%`)
          )
        ),
        with: {
          elementsConstitutifs: true,
        }
      });
    }

    // Fallback dynamique si aucune UE n'est encore configurée pour ce semestre précis :
    // On mappe directement les matières affectées à la classe (class_subjects)
    if (ues.length === 0) {
      const clsSubjects = await readDb.query.classSubjects.findMany({
        where: eq(classSubjects.classId, classId),
        with: {
          subject: true,
        }
      });

      if (clsSubjects.length > 0) {
        const autoEcus: any[] = clsSubjects.map((cs, idx) => ({
          id: cs.id,
          subjectId: cs.subjectId,
          codeEcu: cs.subject?.subjectCode || `ECU-${idx + 1}`,
          nameEcu: cs.subject?.subjectName || `Matière ${idx + 1}`,
          coefficient: cs.coefficient || 1,
          creditsEcts: cs.credits && Number(cs.credits) > 0 ? Number(cs.credits) : Number((30.0 / Math.max(1, clsSubjects.length)).toFixed(1)),
          eliminatoryGrade: 7.0,
        }));

        ues = [
          {
            id: 999991,
            programId: resolvedProgramId || 0,
            semester: sCode,
            codeUe: `UE-AUTO-${sCode}`,
            nameUe: `UE Unifiée du Semestre (${semester})`,
            typeUe: "Fondamentale",
            creditsEcts: 30.0,
            totalHours: 300.0,
            minPassingGrade: 10.0,
            isEliminatory: false,
            elementsConstitutifs: autoEcus,
          } as any
        ];
      }
    }

    // 2. Récupérer les Étudiants inscrits dans cette classe OU ayant des résultats dans cette classe
    const resultsForClass = await readDb.query.studentResults.findMany({
      where: and(
        eq(studentResults.classId, classId),
        eq(studentResults.sessionId, sessionId)
      ),
      columns: { studentId: true },
    });
    const extraStudentIds: number[] = Array.from(
      new Set(resultsForClass.map((r) => r.studentId).filter((id): id is number => typeof id === "number"))
    );

    const studentWhere = extraStudentIds.length > 0
      ? or(eq(students.classId, classId), inArray(students.id, extraStudentIds))
      : eq(students.classId, classId);

    const enrolledStudents = await readDb.query.students.findMany({
      where: studentWhere,
      orderBy: [asc(students.nomEtudiant)],
    });

    // 3. Récupérer les notes réelles enregistrées (student_results - Session Normale)
    const semNumSuffix = semNum === "1" ? "er" : "ème";
    const studentIds = enrolledStudents.map((s) => s.id);
    
    const results = await readDb.query.studentResults.findMany({
      where: and(
        studentIds.length > 0
          ? or(eq(studentResults.classId, classId), inArray(studentResults.studentId, studentIds))
          : eq(studentResults.classId, classId),
        eq(studentResults.sessionId, sessionId),
        or(
          eq(studentResults.term, semester),
          eq(studentResults.term, `Semestre ${semNum}`),
          eq(studentResults.term, `${semNum}er Semestre`),
          eq(studentResults.term, `${semNum}ème Semestre`),
          eq(studentResults.term, `${semNum}ère Semestre`),
          eq(studentResults.term, `${semNum}${semNumSuffix} Semestre`),
          eq(studentResults.term, `${semNum}${semNumSuffix} Semestre (S${semNum})`),
          eq(studentResults.term, `S${semNum}`),
          ilike(studentResults.term, `%S${semNum}%`),
          ilike(studentResults.term, `%Semestre ${semNum}%`),
          ilike(studentResults.term, `%${semNum}er Semestre%`),
          ilike(studentResults.term, `%${semNum}ème Semestre%`),
          ilike(studentResults.term, `%${semNum}ère Semestre%`)
        )
      ),
      with: {
        subject: true,
      }
    });

    // 3.1 Récupérer les notes de Rattrapage si existantes
    const rattrapageResults = await readDb.query.studentResults.findMany({
      where: and(
        studentIds.length > 0
          ? or(eq(studentResults.classId, classId), inArray(studentResults.studentId, studentIds))
          : eq(studentResults.classId, classId),
        eq(studentResults.sessionId, sessionId),
        or(
          ilike(studentResults.term, `%Rattrapage%`),
          ilike(studentResults.term, `%Session 2%`),
          ilike(studentResults.term, `%${sCode}%Rat%`),
          ilike(studentResults.term, `%Semestre ${semNum}%Rat%`)
        )
      ),
      with: {
        subject: true,
      }
    });

    const normalizeKey = (str?: string | null) => (str || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    const resultMap = new Map<string, any>();
    for (const r of results) {
      if (r.subjectId) {
        resultMap.set(`${r.studentId}_${r.subjectId}`, r);
      }
      if (r.subject?.subjectName) {
        resultMap.set(`${r.studentId}_name_${normalizeKey(r.subject.subjectName)}`, r);
      }
    }

    const rattrapageResultMap = new Map<string, any>();
    for (const r of rattrapageResults) {
      if (r.subjectId) {
        rattrapageResultMap.set(`${r.studentId}_${r.subjectId}`, r);
      }
      if (r.subject?.subjectName) {
        rattrapageResultMap.set(`${r.studentId}_name_${normalizeKey(r.subject.subjectName)}`, r);
      }
    }

    // 3.5 Découverte et intégration intelligente des matières réelles évaluées
    const distinctEvaluatedSubjects = new Map<number, { id: number; name: string; code?: string; coef: number }>();
    for (const r of results) {
      if (r.subjectId && !distinctEvaluatedSubjects.has(r.subjectId)) {
        distinctEvaluatedSubjects.set(r.subjectId, {
          id: r.subjectId,
          name: r.subject?.subjectName || `Matière ${r.subjectId}`,
          code: r.subject?.subjectCode || `ECU-${r.subjectId}`,
          coef: r.coefficient ? Number(r.coefficient) : 1,
        });
      }
    }

    const existingUeSubjectIds = new Set<number>();
    const existingUeSubjectNames = new Set<string>();
    for (const u of ues) {
      for (const e of u.elementsConstitutifs || []) {
        if (e.subjectId) existingUeSubjectIds.add(e.subjectId);
        if (e.nameEcu) existingUeSubjectNames.add(normalizeKey(e.nameEcu));
      }
    }

    const missingEvaluatedSubjects = Array.from(distinctEvaluatedSubjects.values()).filter(
      (s) => !existingUeSubjectIds.has(s.id) && !existingUeSubjectNames.has(normalizeKey(s.name))
    );

    let effectiveUes = [...ues];

    if (effectiveUes.length === 0 && distinctEvaluatedSubjects.size > 0) {
      const allEvaluatedList = Array.from(distinctEvaluatedSubjects.values());
      const ectsPerSubject = Number((30.0 / Math.max(1, allEvaluatedList.length)).toFixed(1));
      effectiveUes = [
        {
          id: 999991,
          programId: resolvedProgramId || 0,
          semester: sCode,
          codeUe: `UE-FOND-${sCode}`,
          nameUe: `UE Fondamentale du Semestre (${semester})`,
          typeUe: "Fondamentale",
          creditsEcts: 30.0,
          totalHours: 300.0,
          minPassingGrade: 10.0,
          isEliminatory: false,
          elementsConstitutifs: allEvaluatedList.map((s, idx) => ({
            id: s.id,
            subjectId: s.id,
            codeEcu: s.code || `ECU-${idx + 1}`,
            nameEcu: s.name,
            coefficient: s.coef || 1,
            creditsEcts: ectsPerSubject,
            eliminatoryGrade: 7.0,
          })),
        } as any
      ];
    } else if (missingEvaluatedSubjects.length > 0) {
      const ectsPerMissing = Number((12.0 / Math.max(1, missingEvaluatedSubjects.length)).toFixed(1));
      effectiveUes.push({
        id: 999992,
        programId: resolvedProgramId || 0,
        semester: sCode,
        codeUe: `UE-SPEC-${sCode}`,
        nameUe: `UE Spécialité & Modules Complémentaires (${sCode})`,
        typeUe: "Fondamentale",
        creditsEcts: 12.0,
        totalHours: 120.0,
        minPassingGrade: 10.0,
        isEliminatory: false,
        elementsConstitutifs: missingEvaluatedSubjects.map((s, idx) => ({
          id: s.id,
          subjectId: s.id,
          codeEcu: s.code || `ECU-SPEC-${idx + 1}`,
          nameEcu: s.name,
          coefficient: s.coef || 1,
          creditsEcts: ectsPerMissing,
          eliminatoryGrade: 7.0,
        })),
      } as any);
    }

    // 4. Calculer la délibération LMD pour chaque étudiant
    const cohortDeliberation = enrolledStudents.map((st) => {
      const studentUeInputs: UeInput[] = effectiveUes.map((ue) => {
        const ecus: EcuInput[] = (ue.elementsConstitutifs || []).map((ecu: any) => {
          const normEcuName = normalizeKey(ecu.nameEcu);
          const res = (ecu.subjectId ? resultMap.get(`${st.id}_${ecu.subjectId}`) : null)
            || resultMap.get(`${st.id}_name_${normEcuName}`)
            || null;

          const ratRes = (ecu.subjectId ? rattrapageResultMap.get(`${st.id}_${ecu.subjectId}`) : null)
            || rattrapageResultMap.get(`${st.id}_name_${normEcuName}`)
            || null;

          return {
            id: ecu.id,
            codeEcu: ecu.codeEcu || undefined,
            nameEcu: ecu.nameEcu,
            coefficient: ecu.coefficient || 1,
            creditsEcts: Number(ecu.creditsEcts) || 3.0,
            eliminatoryGrade: Number(ecu.eliminatoryGrade) || 7.0,
            classWorkScore: res?.classWorkScore !== null && res?.classWorkScore !== undefined ? Number(res.classWorkScore) : null,
            examScore: res?.examScore !== null && res?.examScore !== undefined ? Number(res.examScore) : null,
            totalScore: res?.totalScore !== null && res?.totalScore !== undefined ? Number(res.totalScore) : null,
            rattrapageScore: ratRes?.totalScore !== null && ratRes?.totalScore !== undefined ? Number(ratRes.totalScore) : (ratRes?.examScore !== null && ratRes?.examScore !== undefined ? Number(ratRes.examScore) : null),
            sessionType: sessionType,
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
    // 5. Classement de la cohorte selon la moyenne semestrielle
    cohortDeliberation.sort((a, b) => b.deliberation.semesterAverage - a.deliberation.semesterAverage);

    const cohortWithRank = cohortDeliberation.map((c, index) => ({
      ...c,
      rank: index + 1,
    }));

    const passedCount = cohortWithRank.filter((c) => c.deliberation.isSemesterValidated).length;
    const totalStudents = cohortWithRank.length;
    const successRate = totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0;

    return {
      success: true,
      data: {
        ues: effectiveUes,
        cohort: cohortWithRank,
        totalStudents,
        passedCount,
        successRate: Number(successRate.toFixed(2)),
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 6. CLÔTURE ET ENREGISTREMENT DE LA DÉLIBÉRATION OFFICIELLE ──────────────
export async function saveLmdDeliberation(data: {
  programId: number;
  classId: number;
  semester: string;
  sessionId: number;
  cohort: any[];
}) {
  try {
    for (const item of data.cohort) {
      const studentId = item.student.id;
      const delib = item.deliberation;

      // 1. Sauvegarder les résultats par UE
      for (const ue of delib.ueResults) {
        if (ue.ueId && ue.ueId < 900000) {
          const existing = await readDb.query.studentLmdUeResults.findFirst({
            where: and(
              eq(studentLmdUeResults.studentId, studentId),
              eq(studentLmdUeResults.ueId, ue.ueId),
              eq(studentLmdUeResults.sessionId, data.sessionId),
              eq(studentLmdUeResults.semester, data.semester)
            )
          });

          if (existing) {
            await db.update(studentLmdUeResults).set({
              rawAverage: ue.average,
              validatedStatus: ue.status,
              creditsAcquired: ue.creditsAcquired,
              updatedAt: new Date(),
            }).where(eq(studentLmdUeResults.id, existing.id));
          } else {
            await db.insert(studentLmdUeResults).values({
              studentId,
              ueId: ue.ueId,
              sessionId: data.sessionId,
              semester: data.semester,
              rawAverage: ue.average,
              validatedStatus: ue.status,
              creditsAcquired: ue.creditsAcquired,
            });
          }
        }
      }

      // 2. Sauvegarder le bilan semestriel officiel
      const existingSem = await readDb.query.studentLmdSemesters.findFirst({
        where: and(
          eq(studentLmdSemesters.studentId, studentId),
          eq(studentLmdSemesters.semester, data.semester),
          eq(studentLmdSemesters.sessionId, data.sessionId)
        )
      });

      if (existingSem) {
        await db.update(studentLmdSemesters).set({
          programId: data.programId,
          classId: data.classId,
          semesterAverage: delib.semesterAverage,
          creditsAcquired: delib.creditsAcquired,
          decision: delib.decision,
          mention: delib.mention,
          rank: `${item.rank}e`,
          validatedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(studentLmdSemesters.id, existingSem.id));
      } else {
        await db.insert(studentLmdSemesters).values({
          studentId,
          programId: data.programId,
          classId: data.classId,
          semester: data.semester,
          sessionId: data.sessionId,
          semesterAverage: delib.semesterAverage,
          creditsAcquired: delib.creditsAcquired,
          decision: delib.decision,
          mention: delib.mention,
          rank: `${item.rank}e`,
          validatedAt: new Date(),
        });
      }
    }

    revalidatePath("/dashboard/academics/lmd");
    revalidatePath("/dashboard/academics/lmd/deliberation");

    return {
      success: true,
      message: `Délibération du ${data.semester} enregistrée et clôturée avec succès pour ${data.cohort.length} étudiant(s).`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── 7. SAISIE DES NOTES DE RATTRAPAGE (SESSION 2) ───────────────────────────
export async function saveLmdRattrapageGrade(data: {
  studentId: number;
  subjectId: number;
  classId: number;
  sessionId: number;
  semester: string;
  rattrapageScore: number;
}) {
  try {
    const semNumMatch = data.semester.match(/\d+/);
    const semNum = semNumMatch ? semNumMatch[0] : "1";
    const rattrapageTerm = `Semestre ${semNum} (Rattrapage)`;

    const existing = await readDb.query.studentResults.findFirst({
      where: and(
        eq(studentResults.studentId, data.studentId),
        eq(studentResults.subjectId, data.subjectId),
        eq(studentResults.classId, data.classId),
        eq(studentResults.sessionId, data.sessionId),
        or(
          eq(studentResults.term, rattrapageTerm),
          ilike(studentResults.term, `%Rattrapage%`)
        )
      )
    });

    if (existing) {
      await db.update(studentResults).set({
        examScore: data.rattrapageScore,
        totalScore: data.rattrapageScore,
      }).where(eq(studentResults.id, existing.id));
    } else {
      await db.insert(studentResults).values({
        studentId: data.studentId,
        subjectId: data.subjectId,
        classId: data.classId,
        sessionId: data.sessionId,
        term: rattrapageTerm,
        examScore: data.rattrapageScore,
        totalScore: data.rattrapageScore,
        coefficient: 1,
      });
    }

    revalidatePath("/dashboard/academics/lmd/deliberation");
    return { success: true, message: "Note de rattrapage enregistrée avec succès !" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

