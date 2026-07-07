export const dynamic = "force-dynamic";

import { getCanteenItems } from "@/domains/canteen/actions/canteen.actions";
import CanteenPOS from "@/domains/canteen/components/CanteenPOS";
import { Coffee, Settings2, History } from "lucide-react";

export default async function CanteenPage() {
  const res = await getCanteenItems();
  const items: any[] = (res as any).data?.data || (res as any).data || [];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Cantine & POS</h1>
          <p className="text-slate-500 mt-2 font-medium">Service de restauration et paiements sans contact</p>
        </div>
        <div className="flex items-center gap-4">
           <button className="rounded-2xl px-6 py-4 bg-white border border-slate-100 text-slate-400 hover:text-primary shadow-sm transition-all font-bold gap-2 flex items-center">
              <History size={18} /> Historique
           </button>
           <button className="rounded-2xl px-6 py-4 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-100 transition-all font-bold gap-2 flex items-center">
              <Settings2 size={18} /> Inventaire
           </button>
        </div>
      </div>

      <CanteenPOS items={items} />
    </div>
  );
}
