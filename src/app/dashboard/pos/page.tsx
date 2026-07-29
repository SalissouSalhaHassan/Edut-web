export const dynamic = "force-dynamic";

import { getCanteenItems, getCanteenInvoices } from "@/domains/canteen/actions/canteen.actions";
import CanteenPOS from "@/domains/canteen/components/CanteenPOS";

export default async function POSPage() {
  const itemsRes = await getCanteenItems();
  const invoicesRes = await getCanteenInvoices();

  const items: any[] = (itemsRes as any).data?.data || (itemsRes as any).data || [];
  const invoices: any[] = (invoicesRes as any).data?.data || (invoicesRes as any).data || [];

  return (
    <div className="h-screen overflow-hidden bg-slate-950">
      <CanteenPOS items={items} invoices={invoices} />
    </div>
  );
}
