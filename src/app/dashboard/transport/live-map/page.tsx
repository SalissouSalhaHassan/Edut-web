import { redirect } from "next/navigation";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import { db } from "@/infrastructure/database";
import { transportRoutes, transportLiveTrips } from "@/infrastructure/database/schema/transport";
import { eq, desc, or, isNull } from "drizzle-orm";
import LiveMapClient from "./live-map-client";

export const metadata = {
  title: "Radar GPS Transport Scolaire en Direct — Edut",
  description: "Suivi en temps réel des bus scolaires, itinéraires, vitesses et arrêts",
};

export default async function TransportLiveMapPage() {
  const user = await getCurrentUser();
  const schoolId = user?.schoolId || (await getActiveSchoolId()) || 9;

  const routes = await db.query.transportRoutes.findMany({
    where: or(
      eq(transportRoutes.schoolId, schoolId),
      isNull(transportRoutes.schoolId)
    ),
    with: {
      liveTrips: {
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 1,
      },
    },
  });

  const activeTrips = await db.query.transportLiveTrips.findMany({
    where: or(
      eq(transportLiveTrips.schoolId, schoolId),
      isNull(transportLiveTrips.schoolId)
    ),
    with: {
      route: true,
    },
    orderBy: (t, { desc }) => [desc(t.lastGpsAt)],
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <LiveMapClient
        schoolId={schoolId}
        routes={routes}
        initialTrips={activeTrips}
      />
    </div>
  );
}
