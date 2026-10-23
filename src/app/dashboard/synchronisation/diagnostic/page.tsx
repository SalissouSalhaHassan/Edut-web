"use client";

import React, { Suspense } from "react";
import DiagnosticClient from "./diagnostic-client";

export default function DiagnosticPage() {
  return (
    <Suspense fallback={null}>
      <DiagnosticClient />
    </Suspense>
  );
}

