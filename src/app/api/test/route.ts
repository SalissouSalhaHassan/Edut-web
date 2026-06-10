import { NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { schoolSessions } from "@/infrastructure/database/schema/academics";

export async function GET() {
  try {
    const sessions = await db.query.schoolSessions.findMany();
    return NextResponse.json({ sessions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
