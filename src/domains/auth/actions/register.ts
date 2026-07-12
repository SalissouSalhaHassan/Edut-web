"use server";

import { db } from "@/infrastructure/database";
import { users, roles, schools } from "@/infrastructure/database/schema/auth";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";
import { eq, and, or } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function registerUser(params: {
  role: "student" | "teacher";
  schoolSlug: string;
  matriculeOrEmail: string;
  username: string;
  fullName: string;
  passwordHash: string;
}) {
  const { role, schoolSlug, matriculeOrEmail, username, fullName, passwordHash } = params;

  try {
    // 1. Find school by slug
    const school = await db.query.schools.findFirst({
      where: eq(schools.slug, schoolSlug),
    });
    if (!school) {
      return { success: false, error: "École introuvable." };
    }

    // 2. Validate selected username availability
    const usernameTaken = await db.query.users.findFirst({
      where: eq(users.utilisateur, username.trim()),
    });
    if (usernameTaken) {
      return { success: false, error: "Ce nom d'utilisateur est déjà pris." };
    }

    let linkedStudentId: number | null = null;
    let linkedEmployeeId: number | null = null;
    let educationalLevel = "Primaire";

    // 3. Match Identity
    if (role === "student") {
      const student = await db.query.students.findFirst({
        where: and(
          eq(students.schoolId, school.id),
          eq(students.numAdmission, matriculeOrEmail.trim())
        ),
      });
      if (!student) {
        return {
          success: false,
          error: "Numéro d'admission étudiant (Matricule) introuvable dans cette école.",
        };
      }

      // Check if student is already linked to a user account
      const alreadyLinked = await db.query.users.findFirst({
        where: and(
          eq(users.schoolId, school.id),
          eq(users.studentId, student.id)
        ),
      });
      if (alreadyLinked) {
        return {
          success: false,
          error: "Ce matricule étudiant est déjà associé à un compte utilisateur.",
        };
      }

      linkedStudentId = student.id;
      educationalLevel = student.educationalLevel || "Primaire";
    } else {
      const employee = await db.query.employees.findFirst({
        where: and(
          eq(employees.schoolId, school.id),
          or(
            eq(employees.empId, matriculeOrEmail.trim()),
            eq(employees.email, matriculeOrEmail.trim())
          )
        ),
      });
      if (!employee) {
        return {
          success: false,
          error: "Matricule ou email d'enseignant introuvable dans cette école.",
        };
      }

      // Check if employee is already linked to a user account
      const alreadyLinked = await db.query.users.findFirst({
        where: and(
          eq(users.schoolId, school.id),
          eq(users.employeeId, employee.id)
        ),
      });
      if (alreadyLinked) {
        return {
          success: false,
          error: "Ce profil enseignant est déjà associé à un compte utilisateur.",
        };
      }

      linkedEmployeeId = employee.id;
      educationalLevel = employee.educationalLevel || "Primaire";
    }

    // 4. Resolve roleId
    const allRoles = await db.query.roles.findMany();
    let assignedRoleId: number | null = null;

    if (role === "student") {
      const match = allRoles.find((r) => {
        const n = r.roleName.toLowerCase();
        return n.includes("élève") || n.includes("etudiant") || n.includes("student");
      });
      assignedRoleId = match?.id || allRoles.find((r) => r.roleName.toLowerCase() === "membre")?.id || null;
    } else {
      const match = allRoles.find((r) => {
        const n = r.roleName.toLowerCase();
        return n.includes("enseignant") || n.includes("professeur") || n.includes("teacher");
      });
      assignedRoleId = match?.id || allRoles.find((r) => r.roleName.toLowerCase() === "membre")?.id || null;
    }

    // 5. Encrypt password and save user
    const saltRounds = 10;
    const cryptedPassword = await bcrypt.hash(passwordHash, saltRounds);

    await db.insert(users).values({
      schoolId: school.id,
      utilisateur: username.trim(),
      nomPrenom: fullName.trim(),
      motDePasse: cryptedPassword,
      roleId: assignedRoleId,
      studentId: linkedStudentId,
      employeeId: linkedEmployeeId,
      langue: "FR",
      educationalLevel,
    });

    return { success: true };
  } catch (err: any) {
    console.error("Self-registration error:", err);
    return { success: false, error: err?.message || String(err) };
  }
}
