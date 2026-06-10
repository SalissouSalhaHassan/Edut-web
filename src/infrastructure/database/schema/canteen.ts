import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

export const canteenItems = pgTable("canteen_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  price: doublePrecision("price").notNull(),
  category: varchar("category", { length: 50 }), // Repas, Snack, Boisson
  stock: integer("stock").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studentWallets = pgTable("student_wallets", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).unique(),
  balance: doublePrecision("balance").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const canteenTransactions = pgTable("canteen_transactions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  itemsDesc: text("items_desc"),
  transactionDate: timestamp("transaction_date").defaultNow(),
  recordedBy: varchar("recorded_by", { length: 100 }),
});

export const studentWalletsRelations = relations(studentWallets, ({ one }) => ({
  student: one(students, {
    fields: [studentWallets.studentId],
    references: [students.id],
  }),
}));

export const canteenTransactionsRelations = relations(canteenTransactions, ({ one }) => ({
  student: one(students, {
    fields: [canteenTransactions.studentId],
    references: [students.id],
  }),
}));
