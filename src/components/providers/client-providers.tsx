"use client";

import { Toaster } from "sonner";
import { PrintProvider } from "@/domains/printing/components/PrintManager";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrintProvider>
      {children}
      <Toaster richColors position="top-right" closeButton />
    </PrintProvider>
  );
}
