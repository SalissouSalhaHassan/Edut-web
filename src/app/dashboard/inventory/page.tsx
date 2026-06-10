import { getInventoryItems, getInventoryAssignments, getInventoryCategories, deleteInventoryItem } from "@/domains/inventory/actions/inventory.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import ActionMenu from "@/components/common/ActionMenu";
import { Guard } from "@/components/rbac/guard";
import { Package, Users, MapPin, AlertCircle, TrendingUp, Search, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default async function InventoryPage() {
  const itemsRes = await getInventoryItems();
  const assignmentsRes = await getInventoryAssignments();
  const items: any[] = (itemsRes as any).data?.data || (itemsRes as any).data || [];
  const assignments: any[] = (assignmentsRes as any).data?.data || (assignmentsRes as any).data || [];
  const currentUser = await getCurrentUser();

  const canEdit = (currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "Inventory" && p.canEdit);
  const canDelete = (currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "Inventory" && p.canDelete);
  
  const totalValue = items.reduce((acc: number, item: any) => acc + (item.unitPrice || 0) * (item.quantity || 0), 0);

  const stats = [
    { label: "Articles Total", value: items.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Valeur Estimée", value: totalValue.toLocaleString() + " CFA", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Matériel Assigné", value: assignments.filter((a: any) => a.status === 'En possession').length, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Inventaire & Stock</h1>
          <p className="text-slate-500 mt-2 font-medium">Gérez le matériel scolaire et les affectations au personnel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={`p-5 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="stock" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-2 rounded-3xl h-16 w-full max-w-md gap-2">
          <TabsTrigger value="stock" className="rounded-2xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-1">
            📦 Stock
          </TabsTrigger>
          <TabsTrigger value="assignments" className="rounded-2xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-1">
            🤝 Affectations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="relative w-96">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <Input placeholder="Rechercher article, SKU, salle..." className="pl-12 rounded-2xl border-none shadow-sm h-12" />
                </div>
                {canEdit && (
                  <button className="px-8 h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-primary/90 transition-all">
                    + Ajouter au Stock
                  </button>
                )}
             </div>
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-white border-b border-slate-50">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Article</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Catégorie</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantité</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Emplacement</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">État</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {items.map((item: any) => (
                   <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-5">
                       <p className="font-bold text-slate-900">{item.name}</p>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.sku || "N/A"}</p>
                     </td>
                     <td className="px-8 py-5">
                       <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">{item.category?.name || "-"}</span>
                     </td>
                     <td className="px-8 py-5 text-center">
                        <span className={`font-black text-lg ${item.quantity === 0 ? 'text-rose-500' : 'text-slate-700'}`}>{item.quantity}</span>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                           <MapPin size={14} className="text-slate-300" /> {item.location || "Non défini"}
                        </div>
                     </td>
                     <td className="px-8 py-5 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          item.condition === 'Neuf' ? 'bg-emerald-100 text-emerald-600' : 
                          item.condition === 'Endommagé' ? 'bg-rose-100 text-rose-600' : 
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {item.condition}
                        </span>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <ActionMenu 
                          title="Gérer article"
                          onDelete={canDelete ? deleteInventoryItem.bind(null, item.id) : undefined}
                          canEdit={canEdit}
                        />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50/50 border-b border-slate-100">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Article Confié</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employé</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qté</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Statut</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {assignments.map((a: any) => (
                   <tr key={a.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-5 font-bold text-slate-900">{a.item?.name}</td>
                     <td className="px-8 py-5 font-bold text-indigo-600">{a.employee?.nom}</td>
                     <td className="px-8 py-5 text-center font-black">{a.assignedQty}</td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                           <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                             a.status === 'Retourné' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                           }`}>
                             {a.status}
                           </span>
                           <span className="text-xs text-slate-400 font-medium">{new Date(a.assignedDate!).toLocaleDateString()}</span>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <button className="px-4 py-2 rounded-xl bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-primary transition-all">Gérer</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
