export const dynamic = "force-dynamic";

import { getCanteenItems, getCanteenInvoices, getActiveSchoolProfile } from "@/domains/canteen/actions/canteen.actions";
import CanteenPOS from "@/domains/canteen/components/CanteenPOS";

export default async function POSPage() {
  const itemsRes = await getCanteenItems();
  const invoicesRes = await getCanteenInvoices();
  const schoolRes = await getActiveSchoolProfile();

  const items: any[] = (itemsRes as any).data?.data || (itemsRes as any).data || [];
  const invoices: any[] = (invoicesRes as any).data?.data || (invoicesRes as any).data || [];
  const schoolName: string = (schoolRes as any).data?.schoolName || "";

  return (
    <div className="h-screen overflow-hidden bg-slate-950">
      <CanteenPOS items={items} invoices={invoices} schoolName={schoolName} />
    </div>
  );
}
