"use client";

import CardDesigner from "@/domains/id-cards/components/designer/CardDesigner";

export default function IdCardsPage() {
  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-700">
      <CardDesigner />
    </div>
  );
}
