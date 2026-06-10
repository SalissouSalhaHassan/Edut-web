import { db } from './src/infrastructure/database';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "educational_levels" (
        "id" serial PRIMARY KEY NOT NULL,
        "level_name" varchar(100) NOT NULL,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "educational_levels_level_name_unique" UNIQUE("level_name")
      );
    `);
    console.log("Table created successfully!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
