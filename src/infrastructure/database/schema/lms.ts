import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schoolClasses, schoolSubjects } from "./academics";

export const lmsLessons = pgTable("lms_lessons", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  module: varchar("module", { length: 255 }),
  classId: integer("class_id").references(() => schoolClasses.id),
  subjectId: integer("subject_id").references(() => schoolSubjects.id),
  content: text("content"),
  filePath: text("file_path"),
  videoUrl: text("video_url"),
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsVirtualClasses = pgTable("lms_virtual_classes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  classId: integer("class_id").references(() => schoolClasses.id),
  subjectId: integer("subject_id").references(() => schoolSubjects.id),
  sessionDate: timestamp("session_date").notNull(),
  duration: integer("duration").default(45), // minutes
  meetingUrl: text("meeting_url").notNull(),
  meetingPassword: varchar("meeting_password", { length: 50 }),
  status: varchar("status", { length: 20 }).default("À venir"), // À venir, Terminée, Annulée
  recordedBy: varchar("recorded_by", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lmsLessonsRelations = relations(lmsLessons, ({ one }) => ({
  class: one(schoolClasses, {
    fields: [lmsLessons.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [lmsLessons.subjectId],
    references: [schoolSubjects.id],
  }),
}));

export const lmsVirtualClassesRelations = relations(lmsVirtualClasses, ({ one }) => ({
  class: one(schoolClasses, {
    fields: [lmsVirtualClasses.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [lmsVirtualClasses.subjectId],
    references: [schoolSubjects.id],
  }),
}));
