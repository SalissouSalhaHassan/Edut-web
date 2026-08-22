import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { schools } from "@/infrastructure/database/schema/auth";
import { eq, ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const schoolList = await db.query.schools.findMany({
      columns: {
        id: true,
        name: true,
        code: true,
        city: true,
        country: true,
        logoUrl: true,
        subdomain: true,
      },
      limit: 20,
    });

    return NextResponse.json({
      success: true,
      data: schoolList,
    });
  } catch (error: any) {
    console.error("[Schools Lookup API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur de recherche des écoles." },
      { status: 500 }
    );
  }
}
