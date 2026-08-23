import { redirect } from "next/navigation";
import { getSession } from "@/domains/auth/services/session";
import { db } from "@/infrastructure/database";
import { transportRoutes, transportLiveTrips } from "@/infrastructure/database/schema/transport";
import { eq, desc } from "drizzle-orm";
import LiveMapClient from "./live-map-client";

export const metadata = {
  title: "Radar GPS Transport Scolaire en Direct — Edut",
  description: "Suivi en temps réel des bus scolaires, itinéraires, vitesses et arrêts",
};

export default async function TransportLiveMapPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = ((session.user as any)?.schoolId as number) || 1;

  const routes = await db.query.transportRoutes.findMany({
    where: eq(transportRoutes.schoolId, schoolId),
    with: {
      liveTrips: {
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 1,
      },
    },
  });

  const activeTrips = await db.query.transportLiveTrips.findMany({
    where: eq(transportLiveTrips.schoolId, schoolId),
    with: {
      route: true,
    },
    orderBy: (t, { desc }) => [desc(t.lastGpsAt)],
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <LiveMapClient
        schoolId={schoolId}
        initialRoutes={routes as any}
        initialTrips={activeTrips as any}
      />
    </div>
  );
}
