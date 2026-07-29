"use client";

import CanteenPosSystem from "./CanteenPosSystem";

interface CanteenPOSProps {
  items?: any[];
  invoices?: any[];
}

export default function CanteenPOS({ items = [], invoices = [] }: CanteenPOSProps) {
  return <CanteenPosSystem initialItems={items} initialInvoices={invoices} />;
}
