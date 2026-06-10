import postgres from "postgres";

async function main() {
  const url = "postgresql://postgres.gkarotahjtyvmhjqejts:salissou1994S@db.gkarotahjtyvmhjqejts.supabase.co:5432/postgres";
  console.log("Connecting directly to database host...");
  const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
  
  try {
    const result = await sql`SELECT 1 + 1 as sum`;
    console.log("Direct connection SUCCESS. Result:", result);
  } catch (e: any) {
    console.error("Direct connection FAILED:", e.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
