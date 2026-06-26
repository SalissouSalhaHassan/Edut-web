"use server";

import { db } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { schoolSubjects } from "@/infrastructure/database/schema/academics";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { getUserRoleType } from "@/domains/auth/services/rbac";

function formatDate(val: any): string | null {
  if (val === undefined || val === null || val === "") return null;
  if (val instanceof Date) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  if (typeof val === 'number') {
    // Excel serial date to JS date
    const date = new Date((val - 25569) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(val).trim();
}

function normalizeSexeStudent(val: any): "Garçon" | "Fille" {
  if (!val) return "Garçon";
  const s = String(val).trim().toLowerCase();
  if (s.startsWith("f") || s.includes("fille") || s === "f") return "Fille";
  return "Garçon";
}

function normalizeSexeEmployee(val: any): "Homme" | "Femme" {
  if (!val) return "Homme";
  const s = String(val).trim().toLowerCase();
  if (s.startsWith("f") || s.includes("femme") || s === "f" || s.startsWith("w")) return "Femme";
  return "Homme";
}

export async function importStudentRow(data: any) {
  return protectedDbAction("Students", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé à inscrire des élèves." };
    }

    const admissionNo = String(data.numAdmission || "").trim();
    if (!admissionNo) {
      return { error: "Le matricule/numAdmission est requis." };
    }

    const name = String(data.nomEtudiant || "").trim();
    if (!name) {
      return { error: "Le nom complet de l'élève est requis." };
    }

    const studentData = {
      schoolId,
      numAdmission: admissionNo,
      nomEtudiant: name,
      nomArabe: data.nomArabe ? String(data.nomArabe).trim() : null,
      sexe: normalizeSexeStudent(data.sexe),
      religion: data.religion ? String(data.religion).trim() : null,
      dateNaissance: formatDate(data.dateNaissance),
      lieuNaissance: data.lieuNaissance ? String(data.lieuNaissance).trim() : null,
      cnic: data.cnic ? String(data.cnic).trim() : null,
      groupeSanguin: data.groupeSanguin ? String(data.groupeSanguin).trim() : null,
      session: data.session ? String(data.session).trim() : null,
      educationalLevel: data.educationalLevel ? String(data.educationalLevel).trim() : null,
      classe: data.classe ? String(data.classe).trim() : null,
      section: data.section ? String(data.section).trim() : null,
      categorie: data.categorie ? String(data.categorie).trim() : null,
      nomPere: data.nomPere ? String(data.nomPere).trim() : null,
      cnicPere: data.cnicPere ? String(data.cnicPere).trim() : null,
      mobile: data.mobile ? String(data.mobile).trim() : null,
      whatsapp: data.whatsapp ? String(data.whatsapp).trim() : null,
      fraisMensuels: Number(data.fraisMensuels || 0),
      ancienSolde: Number(data.ancienSolde || 0),
      fraisInscription: Number(data.fraisInscription || 0),
      fraisCogesCard: Number(data.fraisCogesCard || 0),
      fraisTransportInternat: Number(data.fraisTransportInternat || 0),
      statut: data.statut ? String(data.statut).trim() : "Actif",
      behaviorScore: Number(data.behaviorScore || 18),
    };

    const existing = await db.query.students.findFirst({
      where: and(
        eq(students.schoolId, schoolId),
        eq(students.numAdmission, admissionNo)
      )
    });

    if (existing) {
      await db.update(students)
        .set(studentData)
        .where(and(eq(students.id, existing.id), eq(students.schoolId, schoolId)));
      revalidatePath("/dashboard/students");
      return { success: true, action: "update", id: existing.id };
    } else {
      const [newStud] = await db.insert(students).values(studentData).returning({ id: students.id });
      revalidatePath("/dashboard/students");
      return { success: true, action: "insert", id: newStud.id };
    }
  });
}

export async function importEmployeeRow(data: any) {
  return protectedDbAction("HR", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé." };
    }

    const empId = String(data.empId || "").trim();
    if (!empId) {
      return { error: "L'identifiant de l'employé est requis." };
    }

    const name = String(data.nom || "").trim();
    if (!name) {
      return { error: "Le nom complet est requis." };
    }

    const employeeData = {
      schoolId,
      empId,
      nom: name,
      poste: data.poste ? String(data.poste).trim() : null,
      departement: data.departement ? String(data.departement).trim() : null,
      mobile: data.mobile ? String(data.mobile).trim() : null,
      email: data.email ? String(data.email).trim() : null,
      dateEmbauche: formatDate(data.dateEmbauche),
      salaireBase: Number(data.salaireBase || 0),
      sexe: normalizeSexeEmployee(data.sexe),
      dateNaissance: formatDate(data.dateNaissance),
      cnic: data.cnic ? String(data.cnic).trim() : null,
      adresse: data.adresse ? String(data.adresse).trim() : null,
      banqueNom: data.banqueNom ? String(data.banqueNom).trim() : null,
      banqueCompte: data.banqueCompte ? String(data.banqueCompte).trim() : null,
      statut: data.statut ? String(data.statut).trim() : "Actif",
      educationalLevel: data.educationalLevel ? String(data.educationalLevel).trim() : null,
    };

    const existing = await db.query.employees.findFirst({
      where: and(
        eq(employees.schoolId, schoolId),
        eq(employees.empId, empId)
      )
    });

    if (existing) {
      await db.update(employees)
        .set(employeeData)
        .where(and(eq(employees.id, existing.id), eq(employees.schoolId, schoolId)));
      revalidatePath("/dashboard/hr");
      return { success: true, action: "update", id: existing.id };
    } else {
      const [newEmp] = await db.insert(employees).values(employeeData).returning({ id: employees.id });
      revalidatePath("/dashboard/hr");
      return { success: true, action: "insert", id: newEmp.id };
    }
  });
}

export async function importSubjectRow(data: any) {
  return protectedDbAction("Academics", "canEdit", async (user) => {
    const schoolId = await getActiveSchoolId();
    const roleType = await getUserRoleType(user);

    if (roleType === "teacher") {
      return { error: "Non autorisé." };
    }

    const subjectName = String(data.subjectName || "").trim();
    if (!subjectName) {
      return { error: "Le nom de la matière est requis." };
    }

    const subjectData = {
      schoolId,
      subjectName,
      subjectCode: data.subjectCode ? String(data.subjectCode).trim() : null,
      category: data.category ? String(data.category).trim() : null,
    };

    const existing = await db.query.schoolSubjects.findFirst({
      where: and(
        eq(schoolSubjects.schoolId, schoolId),
        eq(schoolSubjects.subjectName, subjectName)
      )
    });

    if (existing) {
      await db.update(schoolSubjects)
        .set(subjectData)
        .where(and(eq(schoolSubjects.id, existing.id), eq(schoolSubjects.schoolId, schoolId)));
      revalidatePath("/dashboard/settings");
      revalidatePath("/dashboard/academics");
      return { success: true, action: "update", id: existing.id };
    } else {
      const [newSub] = await db.insert(schoolSubjects).values(subjectData).returning({ id: schoolSubjects.id });
      revalidatePath("/dashboard/settings");
      revalidatePath("/dashboard/academics");
      return { success: true, action: "insert", id: newSub.id };
    }
  });
}
