import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  try {
    const { db } = await import("./src/infrastructure/database");
    const { sql } = await import("drizzle-orm");

    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'other_revenues'
    `);
    
    console.log("=== columns of other_revenues ===");
    console.log(result);
  } catch (error) {
    console.error("Error inspecting columns:", error);
  } finally {
    process.exit(0);
  }
}

main();
