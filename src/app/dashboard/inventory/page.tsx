export const dynamic = "force-dynamic";

import {
  getInventoryItems,
  getInventoryAssignments,
  getInventoryEmployees,
  getInventoryCategories,
  getSuppliers,
  getPurchaseOrders,
  getInventoryKPIs,
  getLowStockItems,
  getStockMovements,
} from "@/domains/inventory/actions/inventory.actions";
import InventoryClient from "@/domains/inventory/components/InventoryClient";

export default async function InventoryPage() {
  let items: any[] = [];
  let assignments: any[] = [];
  let employees: any[] = [];
  let categories: any[] = [];
  let suppliers: any[] = [];
  let purchaseOrders: any[] = [];
  let kpis: any = { totalItems: 0, lowStockCount: 0, activeAssignments: 0, totalStockValue: 0 };
  let lowStockItems: any[] = [];
  let movements: any[] = [];

  try {
    const [itemsRes, assignmentsRes, empRes, catRes, supRes, poRes, kpiRes, lowRes, movRes] = await Promise.all([
      getInventoryItems().catch(() => null),
      getInventoryAssignments().catch(() => null),
      getInventoryEmployees().catch(() => null),
      getInventoryCategories().catch(() => null),
      getSuppliers().catch(() => null),
      getPurchaseOrders().catch(() => null),
      getInventoryKPIs().catch(() => null),
      getLowStockItems().catch(() => null),
      getStockMovements().catch(() => null),
    ]);

    if (itemsRes) items = (itemsRes as any)?.data ?? [];
    if (assignmentsRes) assignments = (assignmentsRes as any)?.data ?? [];
    if (empRes) employees = (empRes as any)?.data ?? [];
    if (catRes) categories = (catRes as any)?.data ?? [];
    if (supRes) suppliers = (supRes as any)?.data ?? [];
    if (poRes) purchaseOrders = (poRes as any)?.data ?? [];
    if (kpiRes) kpis = (kpiRes as any)?.data ?? kpis;
    if (lowRes) lowStockItems = (lowRes as any)?.data ?? [];
    if (movRes) movements = (movRes as any)?.data ?? [];
  } catch (err) {
    console.error("Inventory page SSR load error:", err);
  }

  return (
    <InventoryClient
      initialItems={items}
      initialAssignments={assignments}
      initialEmployees={employees}
      initialCategories={categories}
      initialSuppliers={suppliers}
      initialPurchaseOrders={purchaseOrders}
      initialKpis={kpis}
      initialLowStockItems={lowStockItems}
      initialMovements={movements}
    />
  );
}
