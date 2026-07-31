export const dynamic = "force-dynamic";

import { getInventoryItems, getInventoryAssignments, getInventoryEmployees } from "@/domains/inventory/actions/inventory.actions";
import InventoryManager from "@/domains/inventory/components/InventoryManager";

export default async function InventoryPage() {
  let items: any[] = [];
  let assignments: any[] = [];
  let employees: any[] = [];

  try {
    const itemsRes = await getInventoryItems().catch(() => null);
    if (itemsRes) {
      items = (itemsRes as any)?.data?.data || (itemsRes as any)?.data || [];
    }

    const assignmentsRes = await getInventoryAssignments().catch(() => null);
    if (assignmentsRes) {
      assignments = (assignmentsRes as any)?.data?.data || (assignmentsRes as any)?.data || [];
    }

    const empRes = await getInventoryEmployees().catch(() => null);
    if (empRes) {
      employees = (empRes as any)?.data?.data || (empRes as any)?.data || [];
    }
  } catch (err) {
    console.error("Inventory page SSR load info:", err);
  }

  return (
    <InventoryManager 
      initialItems={items} 
      initialAssignments={assignments} 
      initialEmployees={employees} 
    />
  );
}
