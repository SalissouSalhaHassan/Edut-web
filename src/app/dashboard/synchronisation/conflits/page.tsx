"use client";

import React, { Suspense, useEffect, useState } from "react";
import ConflitsClient from "./conflits-client";

function ConflitsPageContent() {
  const [serverConflicts, setServerConflicts] = useState<any[]>([]);

  useEffect(() => {
    if (!navigator.onLine) return;
    async function loadServerConflicts() {
      try {
        const res = await fetch("/api/synchronisation/conflicts").catch(() => null);
        if (res && res.ok) {
          const json = await res.json().catch(() => null);
          if (Array.isArray(json?.data)) {
            setServerConflicts(json.data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch server conflicts online:", err);
      }
    }
    loadServerConflicts();
  }, []);

  return <ConflitsClient initialServerConflicts={serverConflicts} />;
}

export default function ConflitsPage() {
  return (
    <Suspense fallback={null}>
      <ConflitsPageContent />
    </Suspense>
  );
}


