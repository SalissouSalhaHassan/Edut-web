import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { settings } from "@/infrastructure/database/schema/settings";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { cache as redisCache } from "@/lib/redis";
import {
  DOCUMENT_HEADER_SETTING_KEY,
  mergeDocumentHeaderConfig,
  type DocumentHeaderConfig,
} from "@/domains/printing/document-header";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé", success: false }, { status: 401 });
    }

    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return NextResponse.json({ error: "École introuvable", success: false }, { status: 400 });
    }

    const body = (await request.json()) as Partial<DocumentHeaderConfig>;
    const cleanConfig = mergeDocumentHeaderConfig(body);
    const value = JSON.stringify(cleanConfig);

    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      ),
    });

    if (existing) {
      await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        key: DOCUMENT_HEADER_SETTING_KEY,
        value,
        schoolId,
      });
    }

    // Invalidate Redis cache
    try {
      await redisCache.del(`edut:header_config:${schoolId}`);
    } catch (_) {}

    return NextResponse.json({ success: true, data: cleanConfig });
  } catch (error: any) {
    console.error("[API /api/settings/headers] Error saving config:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne du serveur", success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const schoolId = await getActiveSchoolId();
    if (!schoolId) {
      return NextResponse.json({ error: "École introuvable", success: false }, { status: 400 });
    }

    const existing = await db.query.settings.findFirst({
      where: and(
        eq(settings.key, DOCUMENT_HEADER_SETTING_KEY),
        eq(settings.schoolId, schoolId)
      ),
    });

    let configData = mergeDocumentHeaderConfig();
    if (existing?.value) {
      try {
        configData = mergeDocumentHeaderConfig(JSON.parse(existing.value));
      } catch (_) {}
    }

    return NextResponse.json({ success: true, data: configData });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erreur interne", success: false },
      { status: 500 }
    );
  }
}
