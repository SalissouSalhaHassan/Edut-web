import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schoolSessions } from "./academics";
import { schools } from "./auth";

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  amount: doublePrecision("amount").notNull(),
  dateExpense: timestamp("date_expense").notNull(),
  paymentMode: varchar("payment_mode", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Non Payé"),
  description: text("description"),
  attachmentPath: varchar("attachment_path", { length: 255 }),
  recordedBy: varchar("recorded_by", { length: 100 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const revenueCategories = pgTable("revenue_categories", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  reference: varchar("reference", { length: 50 }).notNull().unique(),
  categoryId: integer("category_id").references(() => revenueCategories.id),
  title: varchar("title", { length: 200 }),
  amount: doublePrecision("amount").notNull(),
  dateReceived: timestamp("date_received").notNull(),
  paymentMode: varchar("payment_mode", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Reçu"),
  description: text("description"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// POS specific tables for Sales
export const posSales = pgTable("pos_sales", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  totalAmount: doublePrecision("total_amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  status: varchar("status", { length: 20 }).default("Completed"), // Can be "Synced", "Pending Sync"
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentFees = pgTable("student_fees", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => schoolSessions.id),
  totalExpected: doublePrecision("total_expected").notNull(),
  totalPaid: doublePrecision("total_paid").default(0),
  totalReduction: doublePrecision("total_reduction").default(0),
  balance: doublePrecision("balance").notNull(),
  status: varchar("status", { length: 20 }).default("Impayé"), // Impayé, Partiel, Soldé
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("student_fees_school_id_idx").on(table.schoolId),
}));

export const feePayments = pgTable("fee_payments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  feeId: integer("fee_id").references(() => studentFees.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  reduction: doublePrecision("reduction").default(0),
  datePaid: timestamp("date_paid").defaultNow(),
  monthConcerned: varchar("month_concerned", { length: 50 }),
  paymentMode: varchar("payment_mode", { length: 50 }).default("Espèces"),
  reference: varchar("reference", { length: 100 }),
  recordedBy: varchar("recorded_by", { length: 100 }),
}, (table) => ({
  schoolIdIdx: index("fee_payments_school_id_idx").on(table.schoolId),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
}));

export const revenuesRelations = relations(revenues, ({ one }) => ({
  category: one(revenueCategories, {
    fields: [revenues.categoryId],
    references: [revenueCategories.id],
  }),
}));

export const studentFeesRelations = relations(studentFees, ({ one, many }) => ({
  student: one(students, {
    fields: [studentFees.studentId],
    references: [students.id],
  }),
  session: one(schoolSessions, {
    fields: [studentFees.sessionId],
    references: [schoolSessions.id],
  }),
  payments: many(feePayments),
}));

export const feePaymentsRelations = relations(feePayments, ({ one }) => ({
  fee: one(studentFees, {
    fields: [feePayments.feeId],
    references: [studentFees.id],
  }),
}));

export const cogesPayments = pgTable("coges_payments", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id),
  receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
  studentId: integer("student_id"),
  classe: varchar("classe", { length: 100 }),
  session: varchar("session", { length: 50 }),
  amount: doublePrecision("amount").notNull(),
  amountLetters: varchar("amount_letters", { length: 255 }),
  receivedFrom: varchar("received_from", { length: 255 }).notNull(),
  purpose: varchar("purpose", { length: 255 }),
  datePaid: timestamp("date_paid").defaultNow(),
  status: varchar("status", { length: 20 }).default("Validé"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

