import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses, schoolSections } from "@/infrastructure/database/schema/academics";
import { eq, and, ilike, or, sql } from "drizzle-orm";

// GET /api/debug/students-class?classId=36
// This diagnoses why students are not loading for a given class
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = parseInt(searchParams.get("classId") || "0");
    const schoolId = parseInt(searchParams.get("schoolId") || "1");

    if (!classId) {
      return NextResponse.json({ error: "classId requis. Ex: /api/debug/students-class?classId=36&schoolId=1" });
    }

    // 1. Get the class and section info
    const cls = await db.query.schoolClasses.findFirst({
      where: eq(schoolClasses.id, classId),
      with: { section: true }
    });

    // 2. Get ALL distinct values of students.classe in the school
    const distinctClasses = await db
      .selectDistinct({ classe: students.classe, educationalLevel: students.educationalLevel, section: students.section })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(students.classe);

    // 3. Sample of students filtered by class name match (if cls found)
    let matchedByClassName: any[] = [];
    let matchedBySection: any[] = [];
    let matchedByEdLevel: any[] = [];

    if (cls) {
      const className = cls.className.trim();
      const sectionName = cls.section?.sectionName?.trim();
      const edLevel = cls.section?.educationalLevel?.trim();

      matchedByClassName = await db.select({
        id: students.id,
        name: students.nomEtudiant,
        classe: students.classe,
        section: students.section,
        educationalLevel: students.educationalLevel,
        session: students.session,
      })
      .from(students)
      .where(and(
        eq(students.schoolId, schoolId),
        or(
          ilike(students.classe, className),
          ilike(students.classe, `${className}%`),
          ilike(students.classe, `%${className}%`),
        )
      ))
      .limit(50);

      if (sectionName) {
        matchedBySection = await db.select({
          id: students.id,
          name: students.nomEtudiant,
          classe: students.classe,
          section: students.section,
          educationalLevel: students.educationalLevel,
        })
        .from(students)
        .where(and(
          eq(students.schoolId, schoolId),
          ilike(students.section, sectionName)
        ))
        .limit(50);
      }

      if (edLevel) {
        matchedByEdLevel = await db.select({
          id: students.id,
          name: students.nomEtudiant,
          classe: students.classe,
          section: students.section,
          educationalLevel: students.educationalLevel,
        })
        .from(students)
        .where(and(
          eq(students.schoolId, schoolId),
          ilike(students.educationalLevel, `%${edLevel}%`)
        ))
        .limit(50);
      }
    }

    // 4. Count total students per class value
    const countPerClass = await db
      .select({ 
        classe: students.classe,
        count: sql<number>`count(*)::int`
      })
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .groupBy(students.classe)
      .orderBy(sql`count(*) DESC`);

    return NextResponse.json({
      classId,
      schoolId,
      classInfo: cls ? {
        id: cls.id,
        className: cls.className,
        sectionId: cls.sectionId,
        sectionName: cls.section?.sectionName,
        educationalLevel: cls.section?.educationalLevel,
      } : null,
      diagnosis: {
        matchedByClassName: {
          count: matchedByClassName.length,
          samples: matchedByClassName.slice(0, 10),
        },
        matchedBySection: {
          count: matchedBySection.length,
          samples: matchedBySection.slice(0, 10),
        },
        matchedByEdLevel: {
          count: matchedByEdLevel.length,
          samples: matchedByEdLevel.slice(0, 10),
        },
      },
      allDistinctClassValues: distinctClasses,
      studentsCountPerClass: countPerClass,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
