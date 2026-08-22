"use client";

import * as React from "react";
import {
  Bus,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Clock,
  Gauge,
  Users,
  Search,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Play,
  Square,
  CheckCircle2,
} from "lucide-react";

interface RouteStop {
  id: string;
  stopName: string;
  timeMorning?: string;
  timeEvening?: string;
  order: number;
  lat?: number;
  lng?: number;
}

interface TransportRoute {
  id: number;
  routeName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone?: string;
  capacity?: number;
  stops?: RouteStop[];
  status?: string;
}

interface LiveTrip {
  id: number;
  routeId: number;
  tripDate: string;
  tripType: string;
  driverName?: string;
  vehicleNumber?: string;
  status: string;
  currentStop?: string;
  currentLat?: number;
  currentLng?: number;
  speedKmh?: number;
  heading?: number;
  lastGpsAt?: string;
  estimatedArrivalMinutes?: number;
  route?: TransportRoute;
}

interface Props {
  schoolId: number;
  initialRoutes: TransportRoute[];
  initialTrips: LiveTrip[];
}

export default function LiveMapClient({ schoolId, initialRoutes, initialTrips }: Props) {
  const [trips, setTrips] = React.useState<LiveTrip[]>(initialTrips);
  const [selectedTripId, setSelectedTripId] = React.useState<number | null>(
    initialTrips[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [autoRefresh, setAutoRefresh] = React.useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  // Poll active bus positions every 5 seconds
  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/transport/gps/live");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTrips(json.data);
        }
      } catch (err) {
        console.warn("[GPS Map Poll Error]:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
  const stops = (selectedTrip?.route?.stops as RouteStop[]) || [];

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/transport/gps/live");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTrips(json.data);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredTrips = trips.filter(
    (t) =>
      t.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.route?.routeName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Default coordinate for Niamey/West Africa if none available
  const defaultLat = selectedTrip?.currentLat || 13.5126;
  const defaultLng = selectedTrip?.currentLng || 2.1126;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Left Sidebar: Fleet List & Search */}
      <div className="w-80 md:w-96 flex flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur z-20">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-emerald-500 animate-ping" />
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                <Radio className="size-4 text-emerald-400" /> Radar GPS Flotte
              </h1>
            </div>
            <button
              onClick={handleManualRefresh}
              className={`p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all ${
                isRefreshing ? "animate-spin" : ""
              }`}
            >
              <RefreshCw className="size-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher bus, ligne, chauffeur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Fleet List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredTrips.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              Aucun bus actif détecté.
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isSelected = trip.id === selectedTrip?.id;
              const hasGps = trip.currentLat != null && trip.currentLng != null;

              return (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTripId(trip.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10"
                      : "bg-slate-800/40 border-slate-800 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`size-8 rounded-lg flex items-center justify-center ${
                          hasGps ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        <Bus className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-white">
                          {trip.vehicleNumber || trip.route?.vehicleNumber || "Bus"}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {trip.route?.routeName || "Ligne Scolaire"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          trip.status === "En cours"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {trip.status}
                      </span>
                      {hasGps && (
                        <p className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1 justify-end">
                          <Gauge className="size-3" /> {trip.speedKmh || 0} km/h
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-indigo-400" />
                      {trip.currentStop || "En transit"}
                    </span>
                    {trip.driverName && (
                      <span className="truncate max-w-[100px]">{trip.driverName}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-900">
        {/* Top Floating Telemetry Overlay */}
        {selectedTrip && (
          <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow">
                <Navigation className="size-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-white">
                  {selectedTrip.route?.routeName || "Circuit Scolaire"}
                </h2>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Véhicule : <strong className="text-white">{selectedTrip.vehicleNumber}</strong></span>
                  <span>·</span>
                  <span>Chauffeur : <strong className="text-white">{selectedTrip.driverName || "Assigné"}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Vitesse</p>
                <p className="text-sm font-black text-emerald-400">{selectedTrip.speedKmh || 0} km/h</p>
              </div>
              <div className="text-center px-3 py-1 bg-slate-800/80 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Arrêt Actuel</p>
                <p className="text-xs font-bold text-white truncate max-w-[110px]">
                  {selectedTrip.currentStop || "Départ"}
                </p>
              </div>
              {selectedTrip.route?.driverPhone && (
                <a
                  href={`tel:${selectedTrip.route.driverPhone}`}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow transition-colors"
                >
                  <Phone className="size-3.5" /> Appeler
                </a>
              )}
            </div>
          </div>
        )}

        {/* Embedded Interactive Map View (OpenStreetMap / Leaflet Embedded) */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center">
          <iframe
            title="OpenStreetMap Live Radar"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${defaultLng - 0.04}%2C${defaultLat - 0.03}%2C${defaultLng + 0.04}%2C${defaultLat + 0.03}&layer=mapnik&marker=${defaultLat}%2C${defaultLng}`}
            className="w-full h-full filter invert hue-rotate-180 brightness-95 contrast-90"
          />

          {/* Radar Scanner Overlay Effect */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        </div>

        {/* Bottom Route Progress Timeline */}
        {stops.length > 0 && (
          <div className="p-4 bg-slate-900/95 border-t border-slate-800 z-10">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="size-3.5 text-indigo-400" /> Séquence des Arrêts & Itinéraire
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {stops.map((st, i) => {
                const isCurrent = selectedTrip?.currentStop?.toLowerCase() === st.stopName.toLowerCase();
                return (
                  <div
                    key={st.id || i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 text-xs ${
                      isCurrent
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-md scale-105"
                        : "bg-slate-800/80 text-slate-300 border-slate-700"
                    }`}
                  >
                    <span className="size-5 rounded-full bg-black/20 flex items-center justify-center font-bold text-[10px]">
                      {i + 1}
                    </span>
                    <span className="font-medium">{st.stopName}</span>
                    {st.timeMorning && (
                      <span className="text-[10px] opacity-75">{st.timeMorning}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
