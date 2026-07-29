import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

export const canteenItems = pgTable("canteen_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 50 }),
  price: doublePrecision("price").notNull(),
  category: varchar("category", { length: 50 }), // Repas, Snack, Boisson, Fourniture, etc.
  stock: integer("stock").default(100),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const canteenInvoices = pgTable("canteen_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull().unique(),
  clientName: varchar("client_name", { length: 150 }).default("CLIENT COMPTANT"),
  studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }),
  subtotal: doublePrecision("subtotal").notNull(),
  tva: doublePrecision("tva").default(0),
  totalTtc: doublePrecision("total_ttc").notNull(),
  amountReceived: doublePrecision("amount_received").default(0),
  changeGiven: doublePrecision("change_given").default(0),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Cash"), // Cash, Carte, Mobile Money, Crédit, Dépôt/Avance
  status: varchar("status", { length: 50 }).default("Payée"), // Payée, En attente, Annulée
  itemsJson: text("items_json"),
  cashierName: varchar("cashier_name", { length: 100 }).default("admin"),
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
