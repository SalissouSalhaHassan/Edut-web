import { pgTable, serial, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

export const disciplineIncidents = pgTable("discipline_incidents", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow(),
  incidentType: varchar("incident_type", { length: 255 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull().default("Mineur"), // Mineur, Majeur, Critique
  description: text("description"),
  proposedAction: varchar("proposed_action", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("En attente"), // En attente, Résolu, Conseil de Discipline
  createdBy: varchar("created_by", { length: 255 }).default("Admin"),
});

export const disciplineIncidentsRelations = relations(disciplineIncidents, ({ one }) => ({
  student: one(students, {
    fields: [disciplineIncidents.studentId],
    references: [students.id],
  }),
}));
