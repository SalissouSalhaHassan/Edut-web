import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as authSchema from "./schema/auth";
import * as studentsSchema from "./schema/students";
import * as hrSchema from "./schema/hr";
import * as academicsSchema from "./schema/academics";
import * as financeSchema from "./schema/finance";
import * as inventorySchema from "./schema/inventory";
import * as transportSchema from "./schema/transport";
import * as attendanceSchema from "./schema/attendance";
import * as librarySchema from "./schema/library";
import * as homeworkSchema from "./schema/homework";
import * as disciplineSchema from "./schema/discipline";
import * as frontOfficeSchema from "./schema/front_office";
import * as canteenSchema from "./schema/canteen";
import * as messagingSchema from "./schema/messaging";
import * as hostelSchema from "./schema/hostel";
import * as lmsSchema from "./schema/lms";
import * as settingsSchema from "./schema/settings";
import * as auditSchema from "./schema/audit";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not defined in environment variables. Using default local connection.");
}

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/edut";
const readReplicaUrl = process.env.READ_REPLICA_URL;

// Log connection target for debugging (masking password)
const maskedUrl = connectionString.replace(/:([^:@]+)@/, ":****@");
console.log(`🔌 Initializing primary database client: ${maskedUrl}`);

if (readReplicaUrl) {
  const maskedReadUrl = readReplicaUrl.replace(/:([^:@]+)@/, ":****@");
  console.log(`🔌 Initializing read replica client: ${maskedReadUrl}`);
}

// Detect both direct and pooler Supabase URLs
const isSupabase = connectionString.includes("supabase.co") || connectionString.includes("supabase.com");

// Prevent multiple instances of the database client in development
const globalForDb = global as unknown as {
  client: ReturnType<typeof postgres> | undefined;
  readClient: ReturnType<typeof postgres> | undefined;
};

const commonConfig: postgres.Options<{}> = {
  prepare: false,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
  max: 10,           // Moderate pool size to prevent exceeding connection limits
  idle_timeout: 1,   // Very short idle timeout (1 second) to clean up idle sockets immediately
  connect_timeout: 30, 
  onnotice: () => {},  
  connection: {
    application_name: "edut-web",
    tcp_user_timeout: 30000, 
  },
};

// Primary client for Writes
export const client = globalForDb.client ?? postgres(connectionString, commonConfig);

// Read client (defaults to primary if no replica is defined)
export const readClient = globalForDb.readClient ?? (readReplicaUrl ? postgres(readReplicaUrl, commonConfig) : client);

if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
  globalForDb.readClient = readClient;
}

const schema = { ...authSchema, ...studentsSchema, ...hrSchema, ...academicsSchema, ...financeSchema, ...inventorySchema, ...transportSchema, ...attendanceSchema, ...librarySchema, ...homeworkSchema, ...disciplineSchema, ...frontOfficeSchema, ...canteenSchema, ...messagingSchema, ...hostelSchema, ...lmsSchema, ...settingsSchema, ...auditSchema };

// Primary DB instance
export const db = drizzle(client, { schema });

// Read DB instance (for SELECT queries)
export const readDb = drizzle(readClient, { schema });

/**
 * Executes write/primary queries inside a transaction with tenant RLS context set
 */
export async function withTenant<T>(
  schoolId: number,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated`);
    await tx.execute(sql`SELECT set_config('app.current_school_id', ${String(schoolId)}, true)`);
    return await callback(tx);
  });
}

/**
 * Executes read queries inside a transaction with tenant RLS context set on the read replica
 */
export async function withReadTenant<T>(
  schoolId: number,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return await readDb.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated`);
    await tx.execute(sql`SELECT set_config('app.current_school_id', ${String(schoolId)}, true)`);
    return await callback(tx);
  });
}

