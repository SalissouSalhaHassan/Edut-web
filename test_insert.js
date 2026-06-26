const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
const sql = postgres(connectionString, {
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Running diagnostic insert query...");
    await sql`
      insert into "employees" (
        "id", "school_id", "emp_id", "nom", "poste", "departement", "mobile", "email", 
        "date_embauche", "salaire_base", "sexe", "date_naissance", "cnic", "adresse", 
        "banque_nom", "banque_compte", "statut", "photo_path", "educational_level", 
        "lieu_naissance", "code_grade", "categorie", "classe", "echelon", "fonction", 
        "date_nomination", "lieu_affectation", "commune", "region", "date_affectation", "created_at"
      ) values (
        default, 1, 'REG_00000111', 'TASSIOU SALISSOU', default, 'DAKORO', '+22799425298', 
        'salissousalhahassan@gmail.com', '2026-07-10', 10000, 'Homme', '2026-06-05', 
        '6666676666', 'MARADI ALI DON SOPO', 'salisssou salha hassan', default, 'Actif', 
        default, 'Primaire,Collège,Lycée,Supérieur', '01-02-1995', 'IEFA', 'A2', '2ème', 
        '3ème', 'Inspecteur', '2026-06-26', 'IEFA DAKORO', 'MARDI', 'ISLAM', '2026-06-26', default
      )
    `;
    console.log("SUCCESS: Insert completed without errors!");
  } catch (error) {
    console.error("DIAGNOSTIC ERROR DETAILS:");
    console.error(error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
