import postgres from "postgres";

async function main() {
  const url = "postgresql://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
  console.log("Triggering raw query with postgres...");
  const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
  
  try {
    const result = await sql`SELECT 1 + 1 as sum`;
    console.log("SUCCESS. Result:", result);
  } catch (e: any) {
    console.error("RAW ERROR OBJECT:", e);
    console.error("ERROR MESSAGE:", e.message);
    console.error("ERROR CAUSE:", e.cause);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
