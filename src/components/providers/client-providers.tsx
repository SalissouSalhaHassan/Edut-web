"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { PrintProvider } from "@/domains/printing/components/PrintManager";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/offline-sw.js").then(
        (reg) => console.log("Service Worker registered with scope:", reg.scope),
        (err) => console.warn("Service Worker registration failed:", err)
      );

      // Warm up offline references in background when online
      const timer = setTimeout(() => {
        import("@/infrastructure/local-db/warmup")
          .then(({ warmupOfflineReferences }) => warmupOfflineReferences())
          .catch(() => {});
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <PrintProvider>
      {children}
      <PWAInstallPrompt />
      <Toaster richColors position="top-right" closeButton />
    </PrintProvider>
  );
}
