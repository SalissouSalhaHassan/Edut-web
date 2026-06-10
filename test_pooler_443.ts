import postgres from "postgres";

async function main() {
  const url = "postgresql://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:443/postgres";
  console.log("Connecting to pooler on port 443...");
  const sql = postgres(url, { ssl: { rejectUnauthorized: false } });
  
  try {
    const result = await sql`SELECT 1 + 1 as sum`;
    console.log("Port 443 connection SUCCESS. Result:", result);
  } catch (e: any) {
    console.error("Port 443 connection FAILED:", e.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
