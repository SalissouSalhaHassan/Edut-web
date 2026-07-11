import { NextResponse } from "next/server";
import { readDb } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get student matching name
    const studentsList = await readDb.execute(sql`
      SELECT id, nom_etudiant, classe, school_id, num_admission, mobile, whatsapp, educational_level
      FROM students 
      WHERE nom_etudiant ILIKE '%Ado%' OR nom_etudiant ILIKE '%Moussa%'
    `);

    // 2. Get user profile matching email or student_id
    const usersList = await readDb.execute(sql`
      SELECT id, utilisateur, nom_prenom, role_id, school_id, student_id, supabase_id
      FROM users
      WHERE utilisateur ILIKE '%ado%' OR utilisateur ILIKE '%moussa%' OR student_id IN (
        SELECT id FROM students WHERE nom_etudiant ILIKE '%Ado%' OR nom_etudiant ILIKE '%Moussa%'
      )
    `);

    // 3. Inspect policy names to see if they are applied
    const policies = await readDb.execute(sql`
      SELECT tablename, policyname, cmd, qual 
      FROM pg_policies 
      WHERE tablename IN ('students', 'school_classes', 'student_results', 'timetable_entries', 'homework')
    `);

    // 4. Verify function get_my_student_id
    let hasFunction = false;
    try {
      const funcCheck = await readDb.execute(sql`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name = 'get_my_student_id'
      `);
      hasFunction = funcCheck.length > 0;
    } catch (e) {}

    return NextResponse.json({
      success: true,
      students: studentsList,
      users: usersList,
      has_get_my_student_id_function: hasFunction,
      policies: policies
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
