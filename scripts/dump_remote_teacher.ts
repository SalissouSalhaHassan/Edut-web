import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { prepare: false, ssl: { rejectUnauthorized: false } });

  try {
    console.log("=== INSPECTING REMOTE USER PROFILE ===");
    const users = await sql`
      SELECT u.*, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.utilisateur ILIKE 'salissousalha@gmail.com' OR u.nom_prenom ILIKE '%SALHA%';
    `;
    console.log("Users found:");
    console.log(JSON.stringify(users, null, 2));

    console.log("=== INSPECTING REMOTE EMPLOYEE PROFILE ===");
    const employees = await sql`
      SELECT e.*
      FROM employees e
      WHERE e.email ILIKE 'salissousalha@gmail.com' OR e.nom ILIKE '%SALHA%' OR e.email ILIKE 'salissousalhahassan@gmail.com';
    `;
    console.log("Employees found:");
    console.log(JSON.stringify(employees, null, 2));

    console.log("=== INSPECTING REMOTE ASSIGNMENTS ===");
    const assignments = await sql`
      SELECT cs.id, cs.class_id, c.class_name, cs.subject_id, s.subject_name, cs.employee_id, e.nom as employee_name, cs.school_id
      FROM class_subjects cs
      JOIN school_classes c ON cs.class_id = c.id
      JOIN school_subjects s ON cs.subject_id = s.id
      JOIN employees e ON cs.employee_id = e.id
      WHERE e.email ILIKE 'salissousalha@gmail.com' OR e.nom ILIKE '%SALHA%';
    `;
    console.log("Assignments found:");
    console.table(assignments);

  } catch (err: any) {
    console.error("Error running script:", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
