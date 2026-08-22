import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infrastructure/database";
import { transportLiveTrips, transportRoutes, transportGpsPings } from "@/infrastructure/database/schema/transport";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId");
    const routeId = searchParams.get("routeId");

    if (tripId) {
      // Fetch specific trip with recent GPS history
      const trip = await db.query.transportLiveTrips.findFirst({
        where: eq(transportLiveTrips.id, Number(tripId)),
        with: {
          route: true,
        },
      });

      if (!trip) {
        return NextResponse.json({ error: "Trajet introuvable" }, { status: 404 });
      }

      // Recent 50 GPS points for the route trail
      const pings = await db.query.transportGpsPings.findMany({
        where: eq(transportGpsPings.tripId, Number(tripId)),
        orderBy: (t, { desc }) => [desc(t.recordedAt)],
        limit: 50,
      });

      return NextResponse.json({
        success: true,
        trip: {
          ...trip,
          recentPings: pings.reverse(),
        },
      });
    }

    // Fetch all active trips (today or in progress)
    const activeTrips = await db.query.transportLiveTrips.findMany({
      with: {
        route: true,
      },
      orderBy: (t, { desc }) => [desc(t.lastGpsAt)],
      limit: 20,
    });

    return NextResponse.json({
      success: true,
      data: activeTrips,
    });
  } catch (error: any) {
    console.error("[GPS Live Query Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la récupération des positions GPS." },
      { status: 500 }
    );
  }
}
