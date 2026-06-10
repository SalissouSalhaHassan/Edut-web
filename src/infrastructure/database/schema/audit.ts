import { pgTable, serial, varchar, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { users, schools } from "./auth";

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(), // INSERT, UPDATE, DELETE, LOGIN, etc.
  tableName: varchar("table_name", { length: 50 }),
  recordId: varchar("record_id", { length: 50 }),
  oldData: text("old_data"), // JSON string of record before change
  newData: text("new_data"), // JSON string of record after change
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

import { relations } from "drizzle-orm";

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [auditLogs.schoolId],
    references: [schools.id],
  }),
}));
