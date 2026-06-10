import { pgTable, serial, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const visitors = pgTable("visitor_logs", {
  id: serial("id").primaryKey(),
  visitorName: varchar("visitor_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  purpose: varchar("purpose", { length: 200 }).notNull(),
  meetingWith: varchar("meeting_with", { length: 100 }),
  timeIn: varchar("time_in", { length: 20 }).notNull(),
  timeOut: varchar("time_out", { length: 20 }),
  date: timestamp("date").defaultNow(),
  note: text("note"),
});

export const admissionEnquiries = pgTable("admission_enquiries", {
  id: serial("id").primaryKey(),
  parentName: varchar("parent_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  childName: varchar("child_name", { length: 255 }),
  classRequested: varchar("class_requested", { length: 100 }),
  source: varchar("source", { length: 100 }),
  date: timestamp("date").defaultNow(),
  followUpDate: varchar("follow_up_date", { length: 50 }),
  status: varchar("status", { length: 50 }).default("En Attente"), // En Attente, Inscrit, Annulé
});

export const postalDispatch = pgTable("postal_dispatch", {
  id: serial("id").primaryKey(),
  recordType: varchar("record_type", { length: 20 }).notNull(), // Receive, Dispatch
  referenceNo: varchar("reference_no", { length: 100 }),
  senderReceiver: varchar("sender_receiver", { length: 255 }).notNull(),
  address: text("address"),
  date: timestamp("date").defaultNow(),
});
