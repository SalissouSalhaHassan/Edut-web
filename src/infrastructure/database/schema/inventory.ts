import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { employees } from "./hr";

export const inventoryCategories = pgTable("inventory_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  categoryId: integer("category_id").references(() => inventoryCategories.id),
  quantity: integer("quantity").default(0),
  unitPrice: doublePrecision("unit_price").default(0),
  condition: varchar("condition", { length: 50 }).default("Neuf"), // Neuf, Bon état, Moyen, Endommagé
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryAssignments = pgTable("inventory_assignments", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => inventoryItems.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  assignedQty: integer("assigned_qty").notNull(),
  assignedDate: timestamp("assigned_date").defaultNow(),
  returnDate: timestamp("return_date"),
  status: varchar("status", { length: 50 }).default("En possession"), // En possession, Retourné
});

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  category: one(inventoryCategories, {
    fields: [inventoryItems.categoryId],
    references: [inventoryCategories.id],
  }),
  assignments: many(inventoryAssignments),
}));

export const inventoryAssignmentsRelations = relations(inventoryAssignments, ({ one }) => ({
  item: one(inventoryItems, {
    fields: [inventoryAssignments.itemId],
    references: [inventoryItems.id],
  }),
  employee: one(employees, {
    fields: [inventoryAssignments.employeeId],
    references: [employees.id],
  }),
}));
