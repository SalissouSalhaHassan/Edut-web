const postgres = require('postgres');
const sql = postgres('postgresql://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:5432/postgres', { ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log("Adding new columns to coges_payments...");
    await sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "student_id" integer`;
    await sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "classe" varchar(100)`;
    await sql`ALTER TABLE "coges_payments" ADD COLUMN IF NOT EXISTS "session" varchar(50)`;
    console.log("Done! Columns added successfully.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}
run();
