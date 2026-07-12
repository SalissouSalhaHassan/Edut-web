import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    // 1. First, apply the corrected SQL policies
    const sqlPath = path.join(__dirname, "setup-teacher-rls-remote.sql");
    const queries = fs.readFileSync(sqlPath, "utf8");
    console.log("Applying corrected SQL policies...");
    await sql.unsafe(queries);
    console.log("✅ Applied corrected SQL policies successfully!");

    // 2. Now simulate RLS
    const studentUid = '781b6337-dafb-41e6-a591-9b8d56e2f2c2'; // adoada@gmail.com
    console.log(`\n=== SIMULATING RLS FOR USER: ${studentUid} ===`);

    await sql.begin(async (tx) => {
      // Set session variables via set_config to simulate the Supabase authenticated student user
      const claims = JSON.stringify({ 
        sub: studentUid, 
        role: 'authenticated', 
        email: 'adoada@gmail.com' 
      });
      await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
      await tx`SET LOCAL ROLE authenticated`;

      // Check student attendance
      const attendanceSelect = await tx`
        SELECT id, student_id, status, date FROM student_attendance
      `;
      console.log("SELECT on student_attendance returned count:", attendanceSelect.length);

      // Check transport subscriptions
      const transportSelect = await tx`
        SELECT id, student_id, route_id, pickup_point, status FROM transport_subscriptions
      `;
      console.log("SELECT on transport_subscriptions returned count:", transportSelect.length);
      if (transportSelect.length > 0) console.table(transportSelect);

      // Check transport routes
      const routesSelect = await tx`
        SELECT id, route_name FROM transport_routes
      `;
      console.log("SELECT on transport_routes returned count:", routesSelect.length);
      if (routesSelect.length > 0) console.table(routesSelect);
    });

  } catch (err: any) {
    console.error("Error simulating RLS:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
