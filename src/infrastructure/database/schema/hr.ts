import { pgTable, serial, varchar, text, timestamp, doublePrecision, integer, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./auth";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").references(() => schools.id), // SaaS isolation
  empId: varchar("emp_id", { length: 50 }).notNull().unique(),
  nom: varchar("nom", { length: 100 }).notNull(),
  poste: varchar("poste", { length: 100 }),
  departement: varchar("departement", { length: 100 }),
  mobile: varchar("mobile", { length: 20 }),
  email: varchar("email", { length: 100 }),
  dateEmbauche: varchar("date_embauche", { length: 20 }),
  salaireBase: doublePrecision("salaire_base").default(0.0),
  sexe: varchar("sexe", { length: 20 }),
  dateNaissance: varchar("date_naissance", { length: 20 }),
  cnic: varchar("cnic", { length: 50 }),
  adresse: text("adresse"),
  banqueNom: varchar("banque_nom", { length: 100 }),
  banqueCompte: varchar("banque_compte", { length: 100 }),
  statut: varchar("statut", { length: 20 }).default("Actif"),
  photoPath: varchar("photo_path", { length: 255 }),
  educationalLevel: varchar("educational_level", { length: 50 }),
  lieuNaissance: varchar("lieu_naissance", { length: 100 }),
  codeGrade: varchar("code_grade", { length: 50 }),
  categorie: varchar("categorie", { length: 50 }),
  classe: varchar("classe", { length: 50 }),
  echelon: varchar("echelon", { length: 50 }),
  fonction: varchar("fonction", { length: 100 }),
  dateNomination: varchar("date_nomination", { length: 50 }),
  lieuAffectation: varchar("lieu_affectation", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  region: varchar("region", { length: 100 }),
  dateAffectation: varchar("date_affectation", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  schoolIdIdx: index("employees_school_id_idx").on(table.schoolId),
}));

export const employeeAttendance = pgTable("employee_attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow(),
  periodNumber: integer("period_number").default(1),
  status: varchar("status", { length: 20 }).default("Présent"),
  heureEntree: varchar("heure_entree", { length: 20 }),
  heureSortie: varchar("heure_sortie", { length: 20 }),
  remarques: text("remarques"),
});

export const payrollRules = pgTable("payroll_rules", {
  id: serial("id").primaryKey(),
  leaveAllowPerMonth: integer("leave_allow_per_month").default(1),
  latePenalty: doublePrecision("late_penalty").default(0.5),
  halfDayPenalty: doublePrecision("half_day_penalty").default(0.5),
});

export const salaryRecords = pgTable("salary_records", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  monthYear: varchar("month_year", { length: 20 }).notNull(), // e.g. "Juin 2025"
  // Attendance counts
  absentDays: integer("absent_days").default(0),
  leaveTaken: integer("leave_taken").default(0),
  lateDays: integer("late_days").default(0),
  halfDays: integer("half_days").default(0),
  // Salary calculation
  basicSalary: doublePrecision("basic_salary").default(0.0),
  calculatedBasic: doublePrecision("calculated_basic").default(0.0),
  totalAllowance: doublePrecision("total_allowance").default(0.0),
  totalDeduction: doublePrecision("total_deduction").default(0.0),
  netSalary: doublePrecision("net_salary").default(0.0),
  // Payment info
  status: varchar("status", { length: 20 }).default("Unpaid"), // Unpaid | Paid
  paymentDate: timestamp("payment_date"),
  paymentMode: varchar("payment_mode", { length: 50 }),
  remark: varchar("remark", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Relations ─────────────────────────────────────────────────
export const employeesRelations = relations(employees, ({ many }) => ({
  attendance: many(employeeAttendance),
  salaryRecords: many(salaryRecords),
}));

export const employeeAttendanceRelations = relations(employeeAttendance, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeAttendance.employeeId],
    references: [employees.id],
  }),
}));

export const salaryRecordsRelations = relations(salaryRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [salaryRecords.employeeId],
    references: [employees.id],
  }),
}));
