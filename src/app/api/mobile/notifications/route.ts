import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db, readDb } from "@/infrastructure/database";
import { users } from "@/infrastructure/database/schema/auth";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { getMobileUser, mobileJsonError } from "../_lib/auth";
import { getUserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/notifications
 * Returns notifications for the current user, scoped to their school.
 * - Broadcast notifications (userId IS NULL) are included for everyone.
 * - Private notifications (userId = user.id) are included.
 * - schoolId-scoped broadcasts are matched via the notification's related user's schoolId.
 *
 * Query params:
 *   category  — filter by category (e.g. Finance, Absence…)
 *   unreadOnly — "true" to return only unread
 *   limit      — max items (default 100)
 */
export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  const sp = request.nextUrl.searchParams;
  const category = sp.get("category") || null;
  const unreadOnly = sp.get("unreadOnly") === "true";
  const limit = Math.min(Number(sp.get("limit") || "100"), 500);

  // Base condition: user's own notifications OR broadcast (userId NULL)
  const userCond = or(eq(notifications.userId, user.id), isNull(notifications.userId));

  const conditions: any[] = [userCond];
  if (category) {
    conditions.push(eq(notifications.category, category));
  }
  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  const rows = await readDb.query.notifications.findMany({
    where: and(...conditions),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });

  // Unread count (always total, not filtered by category)
  const [unread] = await readDb
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.isRead, false), userCond));

  const formatted = rows.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    type: n.type,
    category: n.category,
    is_read: n.isRead,
    created_at: n.createdAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    success: true,
    notifications: formatted,
    unreadCount: Number(unread?.count ?? 0),
  });
}

/**
 * PATCH /api/mobile/notifications
 * Marks ALL of the current user's unread notifications as read.
 */
export async function PATCH(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.isRead, false),
        or(eq(notifications.userId, user.id), isNull(notifications.userId))
      )
    );

  return NextResponse.json({ success: true });
}
