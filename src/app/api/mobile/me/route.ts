import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { and, eq, or } from "drizzle-orm";

import { db, readDb } from "@/infrastructure/database";
import { rolePermissions, users } from "@/infrastructure/database/schema/auth";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { students } from "@/infrastructure/database/schema/students";
import { getUserRoleType, type UserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

type PermissionRow = {
  moduleName?: string | null;
  canView?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
};

type StudentProfile = {
  id: number;
  schoolId: number | null;
  nomEtudiant: string;
  classe: string | null;
  numAdmission: string;
  educationalLevel: string | null;
};

const fullMobilePermissions = [
  "owner.platform.view",
  "owner.schools.manage",
  "students.view",
  "students.create",
  "students.edit",
  "students.delete",
  "students.promote",
  "finance.view",
  "finance.collect",
  "hr.view",
  "hr.manage",
  "hostel.view",
  "hostel.manage",
  "exams.view",
  "exams.manage",
  "attendance.view",
  "attendance.manage",
  "academics.view",
  "academics.manage",
];

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
  };
}

function mobileRoleFromWebRole(roleType: UserRoleType) {
  if (roleType === "super_admin") return "super_admin";
  if (["ministere", "dren", "dden", "inspection"].includes(roleType)) return "owner";
  if (roleType === "teacher" || roleType === "enseignant") return "teacher";
  if (roleType === "eleve") return "student";
  if (roleType === "parent") return "parent";
  if (roleType === "comptable" || roleType === "caissier") return "accountant";
  if (roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    return "director";
  }
  if (roleType === "censeur" || roleType === "surveillant") return "admin";
  return "staff";
}

function defaultPermissionsForRole(roleType: UserRoleType) {
  if (["super_admin", "ministere", "dren", "dden"].includes(roleType)) {
    return new Set(fullMobilePermissions);
  }

  if (roleType === "inspection") {
    return new Set([
      "students.view",
      "hr.view",
      "exams.view",
      "attendance.view",
      "academics.view",
      "academics.manage",
    ]);
  }

  if (roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    return new Set(fullMobilePermissions.filter((permission) => !permission.startsWith("owner.")));
  }

  if (roleType === "teacher" || roleType === "enseignant") {
    return new Set([
      "students.view",
      "exams.view",
      "exams.manage",
      "attendance.view",
      "attendance.manage",
      "academics.view",
      "academics.manage",
    ]);
  }

  if (roleType === "censeur") {
    return new Set([
      "students.view",
      "students.edit",
      "hr.view",
      "exams.view",
      "exams.manage",
      "attendance.view",
      "attendance.manage",
      "academics.view",
      "academics.manage",
    ]);
  }

  if (roleType === "surveillant") {
    return new Set(["students.view", "attendance.view", "attendance.manage"]);
  }

  if (roleType === "comptable" || roleType === "caissier") {
    return new Set(["students.view", "finance.view", "finance.collect"]);
  }

  if (roleType === "eleve" || roleType === "parent") {
    return new Set(["attendance.view", "academics.view", "exams.view"]);
  }

  return new Set<string>();
}

function matchesModule(moduleName: string, aliases: string[]) {
  return aliases.some((alias) => moduleName === alias || moduleName.includes(alias));
}

function mapRolePermission(row: PermissionRow) {
  const moduleName = String(row.moduleName || "").toLowerCase().trim();
  const permissions = new Set<string>();

  if (matchesModule(moduleName, ["students", "student", "eleves"])) {
    if (row.canView) permissions.add("students.view");
    if (row.canEdit) {
      permissions.add("students.create");
      permissions.add("students.edit");
      permissions.add("students.promote");
    }
    if (row.canDelete) permissions.add("students.delete");
  }

  if (matchesModule(moduleName, ["finance", "finances"])) {
    if (row.canView) permissions.add("finance.view");
    if (row.canEdit || row.canDelete) permissions.add("finance.collect");
  }

  if (matchesModule(moduleName, ["hr", "human resources", "ressources humaines"])) {
    if (row.canView) permissions.add("hr.view");
    if (row.canEdit || row.canDelete) permissions.add("hr.manage");
  }

  if (matchesModule(moduleName, ["hostel", "internat", "dortoirs", "dormitory"])) {
    if (row.canView) permissions.add("hostel.view");
    if (row.canEdit || row.canDelete) permissions.add("hostel.manage");
  }

  if (matchesModule(moduleName, ["owner", "platform", "schools", "security"])) {
    if (row.canView) permissions.add("owner.platform.view");
    if (row.canEdit || row.canDelete) permissions.add("owner.schools.manage");
  }

  if (matchesModule(moduleName, ["exam", "exams", "resultats"])) {
    if (row.canView) permissions.add("exams.view");
    if (row.canEdit || row.canDelete) permissions.add("exams.manage");
  }

  if (matchesModule(moduleName, ["attendance", "appel", "presence"])) {
    if (row.canView) permissions.add("attendance.view");
    if (row.canEdit || row.canDelete) permissions.add("attendance.manage");
  }

  if (matchesModule(moduleName, ["academics", "notes", "devoirs", "homework"])) {
    if (row.canView) permissions.add("academics.view");
    if (row.canEdit || row.canDelete) permissions.add("academics.manage");
  }

  return permissions;
}

function normalizeStudentProfile(row: unknown): StudentProfile | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;

  const id = Number(value.id);
  const nomEtudiant = String(value.nomEtudiant || "");
  const numAdmission = String(value.numAdmission || "");

  if (!Number.isInteger(id) || !nomEtudiant || !numAdmission) {
    return null;
  }

  return {
    id,
    schoolId: value.schoolId === null || value.schoolId === undefined
      ? null
      : Number(value.schoolId),
    nomEtudiant,
    classe: value.classe === null || value.classe === undefined
      ? null
      : String(value.classe),
    numAdmission,
    educationalLevel: value.educationalLevel === null || value.educationalLevel === undefined
      ? null
      : String(value.educationalLevel),
  };
}

async function resolveLinkedStudent(
  user: {
    studentId: number | null;
    schoolId: number | null;
    utilisateur: string;
    nomPrenom: string | null;
  },
  roleType: UserRoleType
): Promise<StudentProfile | null> {
  if (roleType !== "eleve" && roleType !== "parent") return null;

  const baseColumns = {
    id: true,
    schoolId: true,
    nomEtudiant: true,
    classe: true,
    numAdmission: true,
    educationalLevel: true,
  };

  if (user.studentId) {
    const row = await readDb.query.students.findFirst({
      where: and(
        eq(students.id, user.studentId),
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined
      ),
      columns: baseColumns,
    });
    return normalizeStudentProfile(row);
  }

  const login = user.utilisateur.includes("@")
    ? user.utilisateur.split("@")[0]
    : user.utilisateur;

  if (roleType === "eleve" && login) {
    const row = await readDb.query.students.findFirst({
      where: and(
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
        or(
          eq(students.numAdmission, login),
          eq(students.mobile, login),
          eq(students.whatsapp, login)
        )
      ),
      columns: baseColumns,
    });
    return normalizeStudentProfile(row);
  }

  if (roleType === "parent") {
    const values = [login, user.utilisateur, user.nomPrenom || ""]
      .map((value) => value.trim())
      .filter(Boolean);

    for (const value of values) {
      const match = await readDb.query.students.findFirst({
        where: and(
          user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
          or(
            eq(students.mobile, value),
            eq(students.whatsapp, value),
            eq(students.nomPere, value)
          )
        ),
        columns: baseColumns,
      });
      const normalizedMatch = normalizeStudentProfile(match);
      if (normalizedMatch) return normalizedMatch;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError("Token mobile manquant.", 401);
  }

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    return jsonError("Configuration Supabase indisponible.", 500);
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return jsonError("Session mobile invalide.", 401);
  }

  const email = data.user.email?.toLowerCase().trim() || "";
  const username = email.includes("@") ? email.split("@")[0] : email;

  const dbUser = await readDb.query.users.findFirst({
    where: or(
      eq(users.supabaseId, data.user.id),
      email ? eq(users.utilisateur, email) : undefined,
      username ? eq(users.utilisateur, username) : undefined
    ),
    with: {
      role: {
        with: {
          permissions: true,
        },
      },
      school: true,
      employee: true,
    },
  });

  if (!dbUser) {
    return jsonError("Compte non relié à un profil Edut.", 403);
  }

  if (dbUser.supabaseId !== data.user.id) {
    await db.update(users)
      .set({ supabaseId: data.user.id })
      .where(eq(users.id, dbUser.id));
  }

  const roleType = await getUserRoleType(dbUser);
  const mobileRole = mobileRoleFromWebRole(roleType);
  const permissions = defaultPermissionsForRole(roleType);

  const configuredPermissions = dbUser.role?.permissions?.length
    ? dbUser.role.permissions
    : dbUser.roleId
      ? await readDb.query.rolePermissions.findMany({
          where: eq(rolePermissions.roleId, dbUser.roleId),
        })
      : [];

  for (const row of configuredPermissions) {
    for (const permission of mapRolePermission(row)) {
      permissions.add(permission);
    }
  }

  const branch = dbUser.schoolId
    ? await readDb.query.schoolBranches.findFirst({
        where: eq(schoolBranches.schoolId, dbUser.schoolId),
        columns: {
          id: true,
          branchName: true,
          region: true,
          dren: true,
          department: true,
          dden: true,
          inspection: true,
          commune: true,
          schoolCode: true,
        },
        orderBy: [schoolBranches.createdAt],
      })
    : null;

  const linkedStudent = await resolveLinkedStudent(dbUser, roleType);

  return NextResponse.json({
    success: true,
    profile: {
      userId: String(dbUser.id),
      supabaseId: data.user.id,
      email: dbUser.utilisateur || email,
      name: dbUser.nomPrenom,
      role: mobileRole,
      roleType,
      roleName: dbUser.role?.roleName || null,
      schoolId: dbUser.schoolId ? String(dbUser.schoolId) : null,
      employeeId: dbUser.employeeId ? String(dbUser.employeeId) : dbUser.employee?.id ? String(dbUser.employee.id) : null,
      educationalLevel: dbUser.educationalLevel,
      permissions: Array.from(permissions).sort(),
      scope: {
        schoolId: dbUser.schoolId,
        schoolName: dbUser.school?.name || null,
        emplacement: dbUser.emplacement || null,
        region: branch?.region || branch?.dren || null,
        dren: branch?.dren || null,
        department: branch?.department || branch?.dden || null,
        dden: branch?.dden || null,
        inspection: branch?.inspection || null,
        commune: branch?.commune || null,
        branchName: branch?.branchName || null,
        schoolCode: branch?.schoolCode || null,
      },
      student: linkedStudent
        ? {
            id: String(linkedStudent.id),
            schoolId: linkedStudent.schoolId ? String(linkedStudent.schoolId) : null,
            name: linkedStudent.nomEtudiant,
            className: linkedStudent.classe,
            admissionNo: linkedStudent.numAdmission,
            educationalLevel: linkedStudent.educationalLevel,
          }
        : null,
    },
  });
}
