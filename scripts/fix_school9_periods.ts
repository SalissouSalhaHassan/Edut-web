import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
console.log("🔌 Connecting to Supabase Remote Database Pooler...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function fixPeriodsForSchool9And1AllSessions() {
  try {
    console.log("🚀 Starting Period Fix for ALL Sessions of Schools 1 and 9...");

    // Get all sessions for schools 1 and 9
    const sessions = await client`SELECT * FROM school_sessions WHERE school_id IN (1, 9) OR school_id IS NULL`;
    console.log("Found sessions:", sessions.map(s => ({ id: s.id, school_id: s.school_id, name: s.session_name })));

    const periodsToEnsure = [
      { name: "1er Semestre", type: "Semestre" },
      { name: "2ème Semestre", type: "Semestre" },
      { name: "1er Trimestre", type: "Trimestre" },
      { name: "2ème Trimestre", type: "Trimestre" },
      { name: "3ème Trimestre", type: "Trimestre" },
      { name: "1ère Séquence", type: "Séquence" },
      { name: "2ème Séquence", type: "Séquence" },
      { name: "3ème Séquence", type: "Séquence" },
      { name: "4ème Séquence", type: "Séquence" },
      { name: "5ème Séquence", type: "Séquence" },
      { name: "6ème Séquence", type: "Séquence" },
    ];

    for (const sess of sessions) {
      const schoolId = sess.school_id || 1;
      for (const p of periodsToEnsure) {
        const existing = await client`
          SELECT * FROM academic_periods 
          WHERE session_id = ${sess.id} AND name = ${p.name}
        `;
        if (existing.length === 0) {
          const inserted = await client`
            INSERT INTO academic_periods (school_id, name, period_type, session_id, is_active)
            VALUES (${schoolId}, ${p.name}, ${p.type}, ${sess.id}, true)
            RETURNING *;
          `;
          console.log(`✅ Session ${sess.id} (${sess.session_name}): Created "${p.name}"`);
        } else {
          console.log(`ℹ️ Session ${sess.id} (${sess.session_name}): "${p.name}" exists`);
        }
      }
    }

    console.log("🎉 Successfully populated academic periods for ALL sessions!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing periods:", error);
    process.exit(1);
  }
}

fixPeriodsForSchool9And1AllSessions();
