import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

export const hostelRooms = pgTable("hostel_rooms", {
  id: serial("id").primaryKey(),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  buildingName: varchar("building_name", { length: 255 }).notNull(),
  roomType: varchar("room_type", { length: 50 }).default("Mixte"), // Garçons, Filles, Staff
  capacity: integer("capacity").default(1),
  costPerTerm: doublePrecision("cost_per_term").default(0),
  description: varchar("description", { length: 255 }),
  schoolId: integer("school_id"),
});

export const hostelAllocations = pgTable("hostel_allocations", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => hostelRooms.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  joinDate: timestamp("join_date"),
  leaveDate: timestamp("leave_date"),
  status: varchar("status", { length: 20 }).default("Occupé"), // Occupé, Libéré
  remarks: text("remarks"),
  schoolId: integer("school_id"),
});

export const hostelRoomsRelations = relations(hostelRooms, ({ many }) => ({
  allocations: many(hostelAllocations),
}));

export const hostelAllocationsRelations = relations(hostelAllocations, ({ one }) => ({
  student: one(students, {
    fields: [hostelAllocations.studentId],
    references: [students.id],
  }),
  room: one(hostelRooms, {
    fields: [hostelAllocations.roomId],
    references: [hostelRooms.id],
  }),
}));
