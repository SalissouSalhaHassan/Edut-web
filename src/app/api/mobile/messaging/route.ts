import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, count, desc } from "drizzle-orm";

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
import { getUserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecipientUser = {
  id: number;
  utilisateur?: string | null;
  nomPrenom?: string | null;
  role?: { roleName?: string | null } | null;
  studentId?: number | null;
  employeeId?: number | null;
};

function roleNameOf(u: RecipientUser) {
  return String(u.role?.roleName || "").toLowerCase().trim();
}

function isParentOrStudent(u: RecipientUser) {
  const r = roleNameOf(u);
  return (
    r.includes("parent") ||
    r.includes("tuteur") ||
    r.includes("eleve") ||
    r.includes("student")
  );
}

function isStaff(u: RecipientUser) {
  return !isParentOrStudent(u);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getScopedUsers(schoolId: number | null): Promise<RecipientUser[]> {
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

async function getClassStudentUserIds(
  schoolId: number | null,
  className: string,
  scopedUsers: RecipientUser[]
): Promise<number[]> {
  if (!className.trim()) return [];
  const studentRows = await readDb.query.students.findMany({
    where: and(
      schoolId ? eq(students.schoolId, schoolId) : undefined,
      eq(students.classe, className.trim())
    ),
    columns: { id: true },
  });
  const studentIds = new Set(studentRows.map((r) => r.id));
  return scopedUsers
    .filter((u) => u.studentId && studentIds.has(u.studentId))
    .map((u) => u.id);
}

async function resolveRecipientIds(
  target: string,
  opts: { className?: string; recipientUserId?: number },
  schoolId: number | null,
  scopedUsers: RecipientUser[]
): Promise<number[]> {
  let recipientUsers: RecipientUser[];

  switch (target) {
    case "Tous les Parents":
      recipientUsers = scopedUsers.filter(isParentOrStudent);
      break;
    case "Tout le Personnel":
      recipientUsers = scopedUsers.filter(isStaff);
      break;
    case "Tous (Parents + Staff)":
      recipientUsers = scopedUsers;
      break;
    case "Classe specifique": {
      const userIds = await getClassStudentUserIds(schoolId, opts.className || "", scopedUsers);
      recipientUsers = scopedUsers.filter((u) => userIds.includes(u.id));
      break;
    }
    case "Destinataire specifique":
      if (!opts.recipientUserId) return [];
      recipientUsers = scopedUsers.filter((u) => u.id === opts.recipientUserId);
      break;
    default:
      return [];
  }

  return Array.from(new Set(recipientUsers.map((u) => u.id)));
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
    templateCount: Number(templateCount?.count ?? 0),
    studentCount: Number(studentCount?.count ?? 0),
    staffCount: Number(staffCount?.count ?? 0),
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/mobile/messaging
 * Returns dashboard data: templates, logs (last 100), classes, recipients list, stats.
 * Access: restricted to users with canView permission on Messaging module.
 * Parents/students are blocked from seeing the messaging dashboard.
 */
export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const roleType = await getUserRoleType(user);

  // Parents and students cannot access the messaging compose dashboard
  if (roleType === "parent" || roleType === "eleve") {
    return mobileJsonError(
      "Accès refusé. Le tableau de messagerie est réservé au personnel.",
      403
    );
  }

  const canView = await canUseMobileModule(user, "Messaging", "canView");
  if (!canView) return mobileJsonError("Accès messagerie refusé.", 403);

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
    templates: templates.map((t) => ({
      id: t.id,
      title: t.title,
      msg_type: t.msgType,
      content: t.content,
      category: t.category,
      created_at: t.createdAt?.toISOString() ?? null,
    })),
    logs: logs.map((l) => ({
      id: l.id,
      msg_type: l.msgType,
      target_audience: l.targetAudience,
      subject: l.subject,
      content: l.content,
      recipient_count: l.recipientCount,
      status: l.status,
      sent_by: l.sentBy,
      sent_at: l.sentAt?.toISOString() ?? null,
    })),
    classes: classes.map((c) => ({ id: c.id, class_name: c.className })),
    recipients,
    stats: await getStats(schoolId),
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/mobile/messaging
 * Send a message to a target audience.
 * Access: restricted to staff / teachers / admins (canEdit on Messaging).
 *
 * Body:
 *   msgType         — 'Interne' | 'SMS' | 'WhatsApp' | 'Email'
 *   targetAudience  — 'Tous les Parents' | 'Tout le Personnel' | 'Tous (Parents + Staff)' | 'Classe specifique' | 'Destinataire specifique'
 *   subject         — optional subject
 *   content         — message body (required)
 *   className       — required when targetAudience = 'Classe specifique'
 *   recipientUserId — required when targetAudience = 'Destinataire specifique'
 */
export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const roleType = await getUserRoleType(user);

  // Block parents & students from sending
  if (roleType === "parent" || roleType === "eleve") {
    return mobileJsonError("Accès refusé. Envoi de messages non autorisé pour ce rôle.", 403);
  }

  const canEdit = await canUseMobileModule(user, "Messaging", "canEdit");
  if (!canEdit) return mobileJsonError("Envoi de message refusé.", 403);

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

  if (!content) return mobileJsonError("Le contenu du message est requis.", 400);
  if (!targetAudience) return mobileJsonError("Le destinataire est requis.", 400);

  const schoolId = user.schoolId ?? null;
  const scopedUsers = await getScopedUsers(schoolId);

  const recipientIds = await resolveRecipientIds(
    targetAudience,
    { className: body?.className, recipientUserId: body?.recipientUserId },
    schoolId,
    scopedUsers
  );

  // Insert notification for each recipient
  if (recipientIds.length > 0) {
    // Insert in batches of 100 to avoid query limits
    const BATCH = 100;
    for (let i = 0; i < recipientIds.length; i += BATCH) {
      const batch = recipientIds.slice(i, i + BATCH);
      await db.insert(notifications).values(
        batch.map((userId) => ({
          title: body?.subject?.trim() || "Nouveau message",
          content,
          type: "info" as const,
          category: "Messaging",
          userId,
          isRead: false,
        }))
      );
    }
  }

  // Log the send
  await db.insert(messageLogs).values({
    msgType,
    targetAudience,
    subject: body?.subject?.trim() || null,
    content,
    recipientCount: recipientIds.length,
    status: "Envoye",
    sentBy: user.nomPrenom || user.utilisateur || "Mobile",
  });

  // Confirmation notification for the sender
  await db.insert(notifications).values({
    title: "Message envoyé",
    content: `${recipientIds.length} destinataire(s) ont reçu le message.`,
    type: "success" as const,
    category: "Messaging",
    userId: user.id,
    isRead: false,
  });

  return NextResponse.json({ success: true, recipientCount: recipientIds.length });
}
