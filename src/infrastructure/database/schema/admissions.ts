import { pgTable, serial, varchar, integer, timestamp, text, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./auth";
import { students } from "./students";

export const admissionApplications = pgTable(
  "admission_applications",
  {
    id: serial("id").primaryKey(),
    applicationNumber: varchar("application_number", { length: 50 }).notNull().unique(), // e.g. ADM-2026-0042
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
    studentFirstName: varchar("student_first_name", { length: 150 }).notNull(),
    studentLastName: varchar("student_last_name", { length: 150 }).notNull(),
    dateOfBirth: varchar("date_of_birth", { length: 50 }).notNull(),
    gender: varchar("gender", { length: 10 }).notNull().default("M"),
    placeOfBirth: varchar("place_of_birth", { length: 150 }),
    nationality: varchar("nationality", { length: 100 }).default("Nigérienne"),
    targetClass: varchar("target_class", { length: 100 }).notNull(),
    previousSchool: varchar("previous_school", { length: 255 }),
    previousGradeAvg: varchar("previous_grade_avg", { length: 50 }),
    parentName: varchar("parent_name", { length: 255 }).notNull(),
    parentRelation: varchar("parent_relation", { length: 50 }).default("Père"),
    parentPhone: varchar("parent_phone", { length: 50 }).notNull(),
    parentWhatsapp: varchar("parent_whatsapp", { length: 50 }),
    parentEmail: varchar("parent_email", { length: 150 }),
    parentProfession: varchar("parent_profession", { length: 150 }),
    address: text("address"),
    city: varchar("city", { length: 100 }).default("Niamey"),
    birthCertificateUrl: text("birth_certificate_url"),
    photoUrl: text("photo_url"),
    reportCardUrl: text("report_card_url"),
    medicalNotes: text("medical_notes"),
    paymentReceiptUrl: text("payment_receipt_url"),
    status: varchar("status", { length: 50 }).notNull().default("En attente"), // 'En attente', 'En examen', 'Admis / Accepté', 'Refusé', 'Liste d''attente'
    reviewNotes: text("review_notes"),
    reviewedBy: varchar("reviewed_by", { length: 150 }),
    reviewedAt: timestamp("reviewed_at"),
    admittedStudentId: integer("admitted_student_id").references(() => students.id, { onDelete: "set null" }),
    generatedMatricule: varchar("generated_matricule", { length: 50 }),
    parentNotified: boolean("parent_notified").default(false),
    parentNotificationSentAt: timestamp("parent_notification_sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    schoolIdIdx: index("admission_applications_school_id_idx").on(table.schoolId),
    statusIdx: index("admission_applications_status_idx").on(table.status),
    appNumberIdx: index("admission_applications_number_idx").on(table.applicationNumber),
  })
);

export const admissionApplicationsRelations = relations(admissionApplications, ({ one }) => ({
  school: one(schools, {
    fields: [admissionApplications.schoolId],
    references: [schools.id],
  }),
  admittedStudent: one(students, {
    fields: [admissionApplications.admittedStudentId],
    references: [students.id],
  }),
}));
