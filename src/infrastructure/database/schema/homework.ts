import { pgTable, serial, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schoolClasses, schoolSubjects } from "./academics";

export const homework = pgTable("homework", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "cascade" }),
  dateAssigned: timestamp("date_assigned").defaultNow(),
  dateDue: timestamp("date_due").notNull(),
  attachmentPath: varchar("attachment_path", { length: 500 }),
  createdBy: varchar("created_by", { length: 255 }).default("Admin"),
});

export const homeworkRelations = relations(homework, ({ one }) => ({
  class: one(schoolClasses, {
    fields: [homework.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [homework.subjectId],
    references: [schoolSubjects.id],
  }),
}));
