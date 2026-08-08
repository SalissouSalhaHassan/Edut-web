import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";
console.log("🔌 Connecting to Supabase Remote Database Pooler...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function fixPeriodsForSchool9() {
  try {
    console.log("🚀 Starting Period & Session Fix for School ID 9...");

    // 1. Check existing sessions for school 9 or fallback
    let sessions = await client`SELECT * FROM school_sessions WHERE school_id = 9 OR id = 10`;
    console.log("Found sessions:", sessions);

    if (sessions.length === 0) {
      const createdSession = await client`
        INSERT INTO school_sessions (id, school_id, session_name, is_active, status)
        VALUES (10, 9, '2025-2026', true, 'Actif')
        ON CONFLICT (id) DO UPDATE SET school_id = 9, is_active = true
        RETURNING *;
      `;
      console.log("Created/Updated Session 10 for school 9:", createdSession);
    } else {
    // Ensure session 10 has school_id = 9 and is_active = true
    await client`UPDATE school_sessions SET is_active = false WHERE school_id = 9`;
    await client`UPDATE school_sessions SET school_id = 9, is_active = true WHERE id = 10`;
    console.log("Updated session 10 to belong to school 9 and set is_active = true!");
    }

    // 2. Insert standard Semestres & Trimestres for School 9 & Session 10
    const periodsToEnsure = [
      { name: "1er Semestre", type: "Semestre" },
      { name: "2ème Semestre", type: "Semestre" },
      { name: "1er Trimestre", type: "Trimestre" },
      { name: "2ème Trimestre", type: "Trimestre" },
      { name: "3ème Trimestre", type: "Trimestre" },
    ];

    for (const p of periodsToEnsure) {
      const existing = await client`
        SELECT * FROM academic_periods 
        WHERE school_id = 9 AND session_id = 10 AND name = ${p.name}
      `;
      if (existing.length === 0) {
        const inserted = await client`
          INSERT INTO academic_periods (school_id, name, period_type, session_id, is_active)
          VALUES (9, ${p.name}, ${p.type}, 10, true)
          RETURNING *;
        `;
        console.log(`✅ Created period "${p.name}" (ID: ${inserted[0]?.id})`);
      } else {
        console.log(`ℹ️ Period "${p.name}" already exists (ID: ${existing[0]?.id})`);
      }
    }

    console.log("🎉 Successfully populated academic periods for school 9!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing periods:", error);
    process.exit(1);
  }
}

fixPeriodsForSchool9();
