import { NextResponse } from "next/server";
import { readDb } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get employees matching Hamza
    const emps = await readDb.execute(sql`
      SELECT id, nom, email, school_id FROM employees WHERE nom ILIKE '%HAMZA%'
    `);

    // 2. For each employee, get class_subjects assignments
    const assignments = await readDb.execute(sql`
      SELECT cs.id, cs.class_id, c.class_name, cs.subject_id, s.subject_name, cs.employee_id, cs.school_id
      FROM class_subjects cs
      LEFT JOIN school_classes c ON cs.class_id = c.id
      LEFT JOIN school_subjects s ON cs.subject_id = s.id
      WHERE cs.employee_id IN (
        SELECT id FROM employees WHERE nom ILIKE '%HAMZA%'
      )
    `);

    // 3. Get users matching Hamza or the employee emails
    const usersList = await readDb.execute(sql`
      SELECT u.id, u.utilisateur, u.nom_prenom, u.role_id, u.school_id, u.employee_id, u.supabase_id, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.nom_prenom ILIKE '%HAMZA%' OR u.utilisateur ILIKE '%HAMZA%' OR u.employee_id IN (
        SELECT id FROM employees WHERE nom ILIKE '%HAMZA%'
      )
    `);

    // 4. Get all school_classes and school_subjects counts
    const classCount = await readDb.execute(sql`SELECT COUNT(*) FROM school_classes`);
    const subjectCount = await readDb.execute(sql`SELECT COUNT(*) FROM school_subjects`);
    const classSubjectsCount = await readDb.execute(sql`SELECT COUNT(*) FROM class_subjects`);

    return NextResponse.json({
      success: true,
      employees: emps,
      assignments: assignments,
      users: usersList,
      counts: {
        classes: classCount[0],
        subjects: subjectCount[0],
        class_subjects: classSubjectsCount[0]
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
