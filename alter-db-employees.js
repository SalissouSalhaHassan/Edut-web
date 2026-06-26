const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const sql = postgres(connectionString, {
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Adding new columns to employees table...");
    
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "educational_level" varchar(50) DEFAULT 'Tous'`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "lieu_naissance" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "code_grade" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "categorie" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "classe" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "echelon" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "fonction" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "date_nomination" varchar(50)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "lieu_affectation" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "commune" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "region" varchar(100)`;
    await sql`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "date_affectation" varchar(50)`;
    
    console.log("Done! Columns added successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

run();
