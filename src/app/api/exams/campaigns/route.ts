import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const result = await db.execute(sql`
      SELECT id, name, session_id, start_date, end_date, is_locked 
      FROM exam_campaigns 
      ORDER BY start_date DESC
    `);
    const rows = (Array.isArray(result) ? result : (result as any).rows || []) as any[];

    const formattedCampaigns = rows.map((row: any) => {
      const formatDate = (dateVal: any) => {
        if (!dateVal) return "";
        const d = new Date(dateVal);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      return {
        id: row.id,
        name: row.name,
        session_id: row.session_id,
        start_date: formatDate(row.start_date),
        end_date: formatDate(row.end_date),
        is_locked: !!row.is_locked
      };
    });

    return NextResponse.json(formattedCampaigns);
  } catch (error: any) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, session_id, start_date, end_date, user = "Admin" } = await request.json();

    if (!name || !session_id || !start_date || !end_date) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    // Convert ISO date strings to DB Date format if needed, Drizzle SQL handles standard date strings
    await db.execute(sql`
      INSERT INTO exam_campaigns (name, session_id, start_date, end_date, is_locked, created_by, created_at)
      VALUES (${name}, ${session_id}, ${start_date}, ${end_date}, false, ${user}, NOW())
    `);

    return NextResponse.json({ status: "success", message: "Campagne d'examen créée avec succès." });
  } catch (error: any) {
    console.error("Error saving campaign:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de l'enregistrement." }, { status: 500 });
  }
}
