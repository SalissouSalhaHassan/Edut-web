import { pgTable, serial, varchar, text, timestamp, integer, boolean, date, time } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { schools } from "./auth";
import { employees } from "./hr";
import { schoolClasses, schoolSubjects } from "./academics";

// ─── Cahier de textes (lesson logbook) ────────────────────────────────────────
export const cahierTextes = pgTable("cahier_textes", {
  id:            serial("id").primaryKey(),
  schoolId:      integer("school_id").references(() => schools.id),
  classId:       integer("class_id").references(() => schoolClasses.id),
  subjectId:     integer("subject_id").references(() => schoolSubjects.id),
  employeeId:    integer("employee_id").references(() => employees.id),
  sessionDate:   date("session_date").notNull(),
  heureDebut:    time("heure_debut"),
  heureFin:      time("heure_fin"),
  titreLecon:    varchar("titre_lecon", { length: 255 }).notNull(),
  objectifs:     text("objectifs"),
  contenuRealise: text("contenu_realise"),
  supportsUtilises: text("supports_utilises"),
  devoirDonne:   text("devoir_donne"),
  observation:   text("observation"),
  // Validation workflow
  statut:        varchar("statut", { length: 30 }).default("En attente"), // En attente | Validé | Rejeté
  valideParId:   integer("valide_par_id").references(() => employees.id),
  valideAt:      timestamp("valide_at"),
  anneeScolaire: varchar("annee_scolaire", { length: 20 }),
  createdAt:     timestamp("created_at").defaultNow(),
  updatedAt:     timestamp("updated_at").defaultNow(),
});

// ─── Relations ─────────────────────────────────────────────────────────────────
export const cahierTextesRelations = relations(cahierTextes, ({ one }) => ({
  school:    one(schools,        { fields: [cahierTextes.schoolId],    references: [schools.id] }),
  class:     one(schoolClasses,  { fields: [cahierTextes.classId],     references: [schoolClasses.id] }),
  subject:   one(schoolSubjects, { fields: [cahierTextes.subjectId],   references: [schoolSubjects.id] }),
  employee:  one(employees,      { fields: [cahierTextes.employeeId],  references: [employees.id], relationName: "seance_employee" }),
  validePar: one(employees,      { fields: [cahierTextes.valideParId], references: [employees.id], relationName: "seance_validateur" }),
}));

// ─── Planification pédagogique ────────────────────────────────────────
export const pedagogiePlanification = pgTable("pedagogie_planifications", {
  id:              serial("id").primaryKey(),
  schoolId:        integer("school_id").references(() => schools.id),
  classId:         integer("class_id").references(() => schoolClasses.id),
  subjectId:       integer("subject_id").references(() => schoolSubjects.id),
  employeeId:      integer("employee_id").references(() => employees.id),
  typePlan:        varchar("type_plan", { length: 50 }).notNull(), // Annuel | Mensuel | Hebdomadaire | Officiel
  periode:         varchar("periode", { length: 100 }), // Trimestre 1, Octobre, Semaine 42, etc.
  chapitre:        varchar("chapitre", { length: 255 }).notNull(),
  leconPrevue:     varchar("lecon_prevue", { length: 255 }).notNull(),
  competenceVisee: text("competence_visee"),
  datePrevue:      date("date_prevue"),
  statut:          varchar("statut", { length: 30 }).default("Planifié"), // Planifié | En cours | Réalisé | En retard | Reporté
  observation:     text("observation"),
  anneeScolaire:   varchar("annee_scolaire", { length: 20 }),
  createdAt:       timestamp("created_at").defaultNow(),
  updatedAt:       timestamp("updated_at").defaultNow(),
});

export const pedagogiePlanificationRelations = relations(pedagogiePlanification, ({ one }) => ({
  school:   one(schools,        { fields: [pedagogiePlanification.schoolId],   references: [schools.id] }),
  class:    one(schoolClasses,  { fields: [pedagogiePlanification.classId],    references: [schoolClasses.id] }),
  subject:  one(schoolSubjects, { fields: [pedagogiePlanification.subjectId],  references: [schoolSubjects.id] }),
  employee: one(employees,      { fields: [pedagogiePlanification.employeeId], references: [employees.id] }),
}));

