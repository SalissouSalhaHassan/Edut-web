import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/infrastructure/database";
import { getCurrentUser } from "@/domains/auth/services/session";
import { syncConflicts } from "@/infrastructure/database/schema/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "pending";

    const conditions = [eq(syncConflicts.schoolId, user.schoolId)];
    if (statusFilter !== "all") {
      conditions.push(eq(syncConflicts.status, statusFilter));
    }

    const conflicts = await db.query.syncConflicts.findMany({
      where: and(...conditions),
      orderBy: [desc(syncConflicts.createdAt)],
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      conflicts,
    });
  } catch (error: any) {
    console.error("GET /api/sync/conflicts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.schoolId) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { conflictId, resolution, mergedValue } = body;

    if (!conflictId || !resolution) {
      return NextResponse.json(
        { success: false, error: "conflictId et resolution sont requis." },
        { status: 400 }
      );
    }

    const conflict = await db.query.syncConflicts.findFirst({
      where: and(
        eq(syncConflicts.id, Number(conflictId)),
        eq(syncConflicts.schoolId, user.schoolId)
      ),
    });

    if (!conflict) {
      return NextResponse.json(
        { success: false, error: "Conflit introuvable." },
        { status: 404 }
      );
    }

    let finalStatus = "resolved_server";
    if (resolution === "keep_client") {
      finalStatus = "resolved_client";
    } else if (resolution === "merged") {
      finalStatus = "resolved_merged";
    }

    await db
      .update(syncConflicts)
      .set({
        status: finalStatus,
        resolvedBy: user.id,
        resolvedAt: new Date(),
        clientValue: mergedValue ? mergedValue : conflict.clientValue,
      })
      .where(eq(syncConflicts.id, conflict.id));

    return NextResponse.json({
      success: true,
      message: "Conflit résolu avec succès.",
      status: finalStatus,
    });
  } catch (error: any) {
    console.error("POST /api/sync/conflicts error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur lors de la résolution du conflit" },
      { status: 500 }
    );
  }
}
