import { NextResponse } from "next/server";
import { readDb } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get results for student 59
    const results59 = await readDb.execute(sql`
      SELECT id, student_id, subject_id, class_id, session_id, term, total_score, class_work_score, exam_score 
      FROM student_results 
      WHERE student_id = 59
    `);

    // 2. Count total rows in student_results
    const totalResultsCount = await readDb.execute(sql`
      SELECT COUNT(*) as count FROM student_results
    `);

    // 3. Get a sample of student_results to see what student_ids have grades
    const sampleResults = await readDb.execute(sql`
      SELECT sr.student_id, s.nom_etudiant, COUNT(*) as count
      FROM student_results sr
      LEFT JOIN students s ON sr.student_id = s.id
      GROUP BY sr.student_id, s.nom_etudiant
      LIMIT 10
    `);

    // 4. Check if there are timetable entries for class of student 59
    const timetable59 = await readDb.execute(sql`
      SELECT t.id, t.day_name, t.period_number, t.class_id, t.subject_id, t.employee_id
      FROM timetable_entries t
      WHERE t.class_id IN (
        SELECT id FROM school_classes WHERE class_name = '6ème A'
      )
    `);

    // 5. Check if there is homework for class of student 59
    const homework59 = await readDb.execute(sql`
      SELECT h.id, h.title, h.class_id, h.subject_id
      FROM homework h
      WHERE h.class_id IN (
        SELECT id FROM school_classes WHERE class_name = '6ème A'
      )
    `);

    return NextResponse.json({
      success: true,
      student_id: 59,
      results_for_59: results59,
      total_results_count: totalResultsCount[0],
      sample_results_by_student: sampleResults,
      timetable_entries_for_6emeA: timetable59,
      homework_for_6emeA: homework59
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
