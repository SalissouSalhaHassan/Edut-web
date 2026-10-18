"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, AlertCircle } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function OfflineTopBanner() {
  const isOnline = useOnlineStatus();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Register Service Worker for App Shell offline caching if supported
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/offline-sw.js")
        .then((reg) => {
          console.log("✅ Edut PWA Service Worker active with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("⚠️ PWA Service Worker registration warning:", err);
        });
    }
  }, []);

  if (!mounted || isOnline) return null;

  return (
    <div
      role="alert"
      className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-300 z-50 select-none print:hidden"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse" />
      <span>Mode Hors-Ligne Actif — Vos saisies sont enregistrées localement et seront synchronisées automatiquement dès le retour du réseau.</span>
    </div>
  );
}
