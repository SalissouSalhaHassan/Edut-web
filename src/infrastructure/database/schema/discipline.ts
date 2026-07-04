import { pgTable, serial, varchar, integer, timestamp, text, doublePrecision, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schools } from "./auth";

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

export const behaviorRewards = pgTable("behavior_rewards", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  schoolId: integer("school_id").references(() => schools.id),
  rewardType: varchar("reward_type", { length: 100 }).notNull(), // Encouragement, Tableau d'Honneur, Félicitations, Avertissement, Blâme
  pointsEffect: doublePrecision("points_effect").default(0.0).notNull(), // e.g. +10, -5
  reason: text("reason").notNull(),
  grantedBy: varchar("granted_by", { length: 255 }), // Name of teacher/admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const counselorNotes = pgTable("counselor_notes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).notNull(),
  schoolId: integer("school_id").references(() => schools.id),
  noteType: varchar("note_type", { length: 100 }).notNull(), // Psychologique, Social, Comportemental, Académique
  confidentialContent: text("confidential_content").notNull(),
  recommendations: text("recommendations"),
  isSecret: boolean("is_secret").default(true).notNull(),
  counselorId: integer("counselor_id"), // references users.id/employees.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const disciplineIncidentsRelations = relations(disciplineIncidents, ({ one }) => ({
  student: one(students, {
    fields: [disciplineIncidents.studentId],
    references: [students.id],
  }),
}));

export const behaviorRewardsRelations = relations(behaviorRewards, ({ one }) => ({
  student: one(students, {
    fields: [behaviorRewards.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [behaviorRewards.schoolId],
    references: [schools.id],
  }),
}));

export const counselorNotesRelations = relations(counselorNotes, ({ one }) => ({
  student: one(students, {
    fields: [counselorNotes.studentId],
    references: [students.id],
  }),
  school: one(schools, {
    fields: [counselorNotes.schoolId],
    references: [schools.id],
  }),
}));
