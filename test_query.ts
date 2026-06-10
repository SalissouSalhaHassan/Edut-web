import { client, db } from "./src/infrastructure/database";
import { users } from "./src/infrastructure/database/schema/auth";
import { schoolSessions } from "./src/infrastructure/database/schema/academics";

async function main() {
  try {
    const t0 = performance.now();
    console.log("Triggering first query (forces connection)...");
    const allUsers = await db.select().from(users);
    const t1 = performance.now();
    console.log(`First query (select users) took ${(t1 - t0).toFixed(2)}ms`);
    console.log("ALL USERS:", allUsers);

    const t2 = performance.now();
    const allSessions = await db.select().from(schoolSessions);
    const t3 = performance.now();
    console.log(`Second query (select sessions) took ${(t3 - t2).toFixed(2)}ms`);
  } catch (e: any) {
    console.error("ERROR:", e);
  } finally {
    process.exit(0);
  }
}
main();
