import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";

export const hostelRooms = pgTable("hostel_rooms", {
  id: serial("id").primaryKey(),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  buildingName: varchar("building_name", { length: 255 }).notNull(),
  roomType: varchar("room_type", { length: 50 }).default("Mixte"), // Garçons, Filles, Staff
  capacity: integer("capacity").notNull(),
  occupiedBeds: integer("occupied_beds").default(0),
  cost: doublePrecision("cost").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const hostelAllocations = pgTable("hostel_allocations", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }),
  roomId: integer("room_id").references(() => hostelRooms.id, { onDelete: "cascade" }),
  joinDate: timestamp("join_date").defaultNow(),
  leaveDate: timestamp("leave_date"),
  status: varchar("status", { length: 20 }).default("Occupé"), // Occupé, Libéré
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
