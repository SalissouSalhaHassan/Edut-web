import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

export const transportRoutes = pgTable("transport_routes", {
  id: serial("id").primaryKey(),
  routeName: varchar("route_name", { length: 255 }).notNull(),
  vehicleNumber: varchar("vehicle_number", { length: 50 }).notNull(),
  driverName: varchar("driver_name", { length: 255 }).notNull(),
  driverPhone: varchar("driver_phone", { length: 50 }),
  monthlyFee: doublePrecision("monthly_fee").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transportSubscriptions = pgTable("transport_subscriptions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  routeId: integer("route_id").references(() => transportRoutes.id, { onDelete: "cascade" }),
  pickupPoint: varchar("pickup_point", { length: 255 }),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).default("Actif"), // Actif, Suspendu, Annulé
});

export const transportRoutesRelations = relations(transportRoutes, ({ many }) => ({
  subscriptions: many(transportSubscriptions),
}));

export const transportSubscriptionsRelations = relations(transportSubscriptions, ({ one }) => ({
  student: one(students, {
    fields: [transportSubscriptions.studentId],
    references: [students.id],
  }),
  route: one(transportRoutes, {
    fields: [transportSubscriptions.routeId],
    references: [transportRoutes.id],
  }),
}));
