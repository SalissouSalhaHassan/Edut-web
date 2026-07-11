import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, inArray } from "drizzle-orm";

import { db, readDb } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { employees } from "@/infrastructure/database/schema/hr";
import { students } from "@/infrastructure/database/schema/students";
import {
  messageLogs,
  messageTemplates,
  notifications,
} from "@/infrastructure/database/schema/messaging";
import { canUseMobileModule, getMobileUser, mobileJsonError } from "../_lib/auth";

export const dynamic = "force-dynamic";

type RecipientUser = {
  id: number;
  utilisateur?: string | null;
  nomPrenom?: string | null;
  role?: { roleName?: string | null } | null;
  studentId?: number | null;
};

function roleNameOf(user: RecipientUser) {
  return String(user.role?.roleName || "").toLowerCase().trim();
}

function isParentOrStudent(user: RecipientUser) {
  const role = roleNameOf(user);
  return role.includes("parent") || role.includes("tuteur") || role.includes("eleve") || role.includes("student");
}

function isStaff(user: RecipientUser) {
  return !isParentOrStudent(user);
}

async function getScopedUsers(schoolId: number | null) {
  const rows = await readDb.query.users.findMany({
    where: schoolId ? eq(users.schoolId, schoolId) : undefined,
    with: { role: true },
    columns: {
      id: true,
      utilisateur: true,
      nomPrenom: true,
      schoolId: true,
      studentId: true,
      employeeId: true,
    },
  });
  return rows as RecipientUser[];
}

async function getClassStudentIds(schoolId: number | null, className: string) {
  if (!className.trim()) return [];
  const rows = await readDb.query.students.findMany({
    where: and(
      schoolId ? eq(students.schoolId, schoolId) : undefined,
      eq(students.classe, className.trim())
    ),
    columns: { id: true },
  });
  return rows.map((row) => row.id);
}

async function resolveRecipients(data: {
  targetAudience: string;
  className?: string;
  recipientUserId?: number;
}, schoolId: number | null) {
  const target = data.targetAudience;
  const scopedUsers = await getScopedUsers(schoolId);
  let recipientUsers: RecipientUser[] = [];

  if (target === "Tous les Parents") {
    recipientUsers = scopedUsers.filter(isParentOrStudent);
  } else if (target === "Tout le Personnel") {
    recipientUsers = scopedUsers.filter(isStaff);
  } else if (target === "Tous (Parents + Staff)") {
    recipientUsers = scopedUsers;
  } else if (target === "Classe specifique") {
    const studentIds = await getClassStudentIds(schoolId, data.className || "");
    recipientUsers = studentIds.length
      ? scopedUsers.filter((user) => user.studentId && studentIds.includes(user.studentId))
      : [];
  } else if (target === "Destinataire specifique" && data.recipientUserId) {
    recipientUsers = scopedUsers.filter((user) => user.id === data.recipientUserId);
  }

  const uniqueIds = Array.from(new Set(recipientUsers.map((user) => user.id)));
  return uniqueIds;
}

async function getStats(schoolId: number | null) {
  const [templateCount] = await readDb.select({ count: count() }).from(messageTemplates);
  const [studentCount] = schoolId
    ? await readDb.select({ count: count() }).from(students).where(eq(students.schoolId, schoolId))
    : await readDb.select({ count: count() }).from(students);
  const [staffCount] = schoolId
    ? await readDb.select({ count: count() }).from(employees).where(eq(employees.schoolId, schoolId))
    : await readDb.select({ count: count() }).from(employees);

  return {
    templateCount: templateCount?.count || 0,
    studentCount: studentCount?.count || 0,
    staffCount: staffCount?.count || 0,
  };
}

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response;

  const canView = await canUseMobileModule(user, "Messaging", "canView");
  if (!canView) return mobileJsonError("Acces messagerie refuse.", 403);

  const schoolId = user.schoolId ?? null;
  const templates = await readDb.query.messageTemplates.findMany({
    orderBy: [desc(messageTemplates.createdAt)],
    limit: 80,
  });
  const logs = await readDb.query.messageLogs.findMany({
    orderBy: [desc(messageLogs.sentAt)],
    limit: 100,
  });
  const classes = await readDb.query.schoolClasses.findMany({
    where: schoolId ? eq(schoolClasses.schoolId, schoolId) : undefined,
    orderBy: [schoolClasses.className],
    columns: { id: true, className: true },
  });
  const scopedUsers = await getScopedUsers(schoolId);
  const recipients = scopedUsers.map((row) => ({
    id: row.id,
    label: row.nomPrenom || row.utilisateur || roleNameOf(row) || `Utilisateur ${row.id}`,
    role: roleNameOf(row),
  }));

  return NextResponse.json({
    success: true,
    templates,
    logs,
    classes,
    recipients,
    stats: await getStats(schoolId),
  });
}

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response;

  const canEdit = await canUseMobileModule(user, "Messaging", "canEdit");
  if (!canEdit) return mobileJsonError("Envoi de message refuse.", 403);

  const body = await request.json().catch(() => null) as {
    msgType?: string;
    targetAudience?: string;
    subject?: string;
    content?: string;
    className?: string;
    recipientUserId?: number;
  } | null;

  const content = body?.content?.trim() || "";
  const targetAudience = body?.targetAudience?.trim() || "";
  const msgType = body?.msgType?.trim() || "Interne";
  if (!content || !targetAudience) {
    return mobileJsonError("Message ou destinataire manquant.", 400);
  }

  const recipientIds = await resolveRecipients(
    {
      targetAudience,
      className: body?.className,
      recipientUserId: body?.recipientUserId,
    },
    user.schoolId ?? null
  );

  if (recipientIds.length > 0) {
    await db.insert(notifications).values(
      recipientIds.map((userId) => ({
        title: body?.subject?.trim() || "Nouveau message",
        content,
        type: "info",
        category: "Messaging",
        userId,
        isRead: false,
      }))
    );
  }

  await db.insert(messageLogs).values({
    msgType,
    targetAudience,
    subject: body?.subject?.trim() || null,
    content,
    recipientCount: recipientIds.length,
    status: "Envoye",
    sentBy: user.nomPrenom || user.utilisateur || "Mobile",
  });

  await db.insert(notifications).values({
    title: "Message envoye",
    content: `${recipientIds.length} destinataire(s) ont recu le message.`,
    type: "success",
    category: "Messaging",
    userId: user.id,
    isRead: false,
  });

  return NextResponse.json({
    success: true,
    recipientCount: recipientIds.length,
  });
}
