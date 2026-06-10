const postgres = require('postgres');
const sql = postgres('postgresql://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:5432/postgres', { ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    console.log("Applying schema updates...");
    await sql`ALTER TABLE "message_templates" ADD COLUMN IF NOT EXISTS "category" varchar(100) DEFAULT 'Général'`;
    await sql`ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "subject" varchar(255)`;
    await sql`ALTER TABLE "message_logs" ADD COLUMN IF NOT EXISTS "recipient_count" integer DEFAULT 0`;
    await sql`
      CREATE TABLE IF NOT EXISTS "scheduled_messages" (
        "id" serial PRIMARY KEY,
        "msg_type" varchar(20) NOT NULL,
        "target_audience" varchar(255) NOT NULL,
        "subject" varchar(255),
        "content" text NOT NULL,
        "scheduled_at" timestamp NOT NULL,
        "status" varchar(50) DEFAULT 'En attente',
        "created_by" varchar(100),
        "created_at" timestamp DEFAULT now()
      )
    `;
    console.log("Schema updates applied successfully.");
  } catch (error) {
    console.error("Error applying schema:", error);
  } finally {
    process.exit(0);
  }
}
run();
