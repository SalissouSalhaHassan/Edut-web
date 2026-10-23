"use client";

import * as React from "react";
import { useNavigationProgress } from "@/components/providers/navigation-progress";

export function DashboardLoadingBar() {
  const { isNavigating, progress } = useNavigationProgress();

  return (
    <>
      {/* ── Sleek Top Progress Bar ── */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
        style={{ height: "3px" }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)",
            boxShadow: "0 0 12px 2px rgba(99,102,241,0.6)",
            borderRadius: "0 2px 2px 0",
            transition:
              isNavigating && progress < 100
                ? "width 0.12s ease-out"
                : "width 0.3s ease-out",
            opacity: isNavigating || progress > 0 ? 1 : 0,
          }}
        />
      </div>
    </>
  );
}
