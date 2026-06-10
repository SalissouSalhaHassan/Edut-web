import { pgTable, text, serial, timestamp, jsonb, varchar, integer } from "drizzle-orm/pg-core";
import { schools } from "./auth";

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id), // Scoped to school
  key: text("key").notNull(),
  value: text("value"),
  metadata: jsonb("metadata"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const schoolBranches = pgTable("school_branches", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id), // Scoped to school
  branchName: varchar("branch_name", { length: 100 }).notNull(),
  yearEstablished: varchar("year_established", { length: 10 }),
  registrationNo: varchar("registration_no", { length: 50 }),
  branchAlias: varchar("branch_alias", { length: 50 }),
  instType: varchar("inst_type", { length: 50 }).default("School"),
  instCategory: varchar("inst_category", { length: 50 }),
  email: varchar("email", { length: 100 }),
  altEmail: varchar("alt_email", { length: 100 }),
  contactNo: varchar("contact_no", { length: 50 }),
  officeNo: varchar("office_no", { length: 50 }),
  timezone: varchar("timezone", { length: 50 }),
  address: text("address"),
  admPrefix: varchar("adm_prefix", { length: 10 }),
  admPadding: varchar("adm_padding", { length: 10 }),
  smtpUrl: varchar("smtp_url", { length: 100 }),
  smtpPort: varchar("smtp_port", { length: 10 }),
  smtpEmail: varchar("smtp_email", { length: 100 }),
  smtpPassword: varchar("smtp_password", { length: 100 }),
  logoPath: text("logo_path"),
  workingDays: varchar("working_days", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

