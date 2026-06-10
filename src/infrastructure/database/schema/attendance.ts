import { pgTable, serial, varchar, integer, timestamp, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { schoolClasses, schoolSubjects } from "./academics";
import { employees } from "./hr";

export const studentAttendance = pgTable("student_attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  classId: integer("class_id").references(() => schoolClasses.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").references(() => schoolSubjects.id, { onDelete: "set null" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }), // Teacher who took the attendance
  date: timestamp("date").defaultNow(),
  status: varchar("status", { length: 50 }).notNull().default("Présent"), // Présent, Absent, En Retard, Excusé
  remark: text("remark"),
  recordedBy: varchar("recorded_by", { length: 255 }).default("Admin"),
}, (table) => {
  return {
    studentIdx: index("attendance_student_idx").on(table.studentId),
    classIdx: index("attendance_class_idx").on(table.classId),
    dateIdx: index("attendance_date_idx").on(table.date),
    subjectIdx: index("attendance_subject_idx").on(table.subjectId),
  };
});

export const studentAttendanceRelations = relations(studentAttendance, ({ one }) => ({
  student: one(students, {
    fields: [studentAttendance.studentId],
    references: [students.id],
  }),
  class: one(schoolClasses, {
    fields: [studentAttendance.classId],
    references: [schoolClasses.id],
  }),
  subject: one(schoolSubjects, {
    fields: [studentAttendance.subjectId],
    references: [schoolSubjects.id],
  }),
  teacher: one(employees, {
    fields: [studentAttendance.employeeId],
    references: [employees.id],
  }),
}));
