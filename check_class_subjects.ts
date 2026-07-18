import * as dotenv from "dotenv";
import path from "path";
import postgres from "postgres";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.REMOTE_DATABASE_URL || "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });
  
  try {
    const schoolId = 9;

    console.log("\n=== ALL CLASS_SUBJECTS FOR SCHOOL ID 9 ===");
    const allCS = await sql`
      SELECT cs.id, cs.class_id, cs.subject_id, cs.employee_id, c.class_name, s.subject_name, e.nom as teacher_name
      FROM class_subjects cs
      LEFT JOIN school_classes c ON cs.class_id = c.id
      LEFT JOIN school_subjects s ON cs.subject_id = s.id
      LEFT JOIN employees e ON cs.employee_id = e.id
      WHERE cs.school_id = ${schoolId}
    `;
    console.log("All class_subjects for School 9:", allCS);

    console.log("\n=== ALL SUBJECTS FOR SCHOOL ID 9 ===");
    const allSubs = await sql`
      SELECT id, subject_name, subject_code
      FROM school_subjects
      WHERE school_id = ${schoolId}
    `;
    console.log("All Subjects (School 9):", allSubs);

    await sql.end();
    process.exit(0);
  } catch (err: any) {
    console.error("Check failed:", err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
