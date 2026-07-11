import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";

import { db, readDb } from "@/infrastructure/database";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { getMobileUser } from "../_lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response;

  const rows = await readDb.query.notifications.findMany({
    where: or(eq(notifications.userId, user.id), isNull(notifications.userId)),
    orderBy: [desc(notifications.createdAt)],
    limit: 100,
  });

  const [unread] = await readDb
    .select({ count: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.isRead, false),
        or(eq(notifications.userId, user.id), isNull(notifications.userId))
      )
    );

  return NextResponse.json({
    success: true,
    notifications: rows,
    unreadCount: unread?.count || 0,
  });
}

export async function PATCH(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response;

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
