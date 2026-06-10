import { getHostelRooms, getHostelAllocations, deleteHostelAllocation } from "@/domains/hostel/actions/hostel.actions";
import ActionMenu from "@/components/common/ActionMenu";
import { Building, Bed, Users, ShieldCheck, DoorOpen, Plus, Search, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default async function HostelPage() {
  const roomsRes = await getHostelRooms();
  const allocationsRes = await getHostelAllocations();
  const rooms: any[] = (roomsRes as any).data?.data || (roomsRes as any).data || [];
  const allocations: any[] = (allocationsRes as any).data?.data || (allocationsRes as any).data || [];

  const totalCapacity = rooms.reduce((acc: number, r: any) => acc + (r.capacity || 0), 0);
  const occupiedBeds = rooms.reduce((acc: number, r: any) => acc + (r.occupiedBeds || 0), 0);

  const stats = [
    { label: "Total Chambres", value: rooms.length, icon: Building, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Capacité Totale", value: totalCapacity, icon: Bed, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Lits Disponibles", value: totalCapacity - occupiedBeds, icon: DoorOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Internat & Dortoirs</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestion des résidences étudiantes et des affectations de chambres</p>
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

      <Tabs defaultValue="residents" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-2 rounded-3xl h-16 w-fit gap-2">
          <TabsTrigger value="residents" className="rounded-2xl h-full px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            👨‍🎓 Résidents
          </TabsTrigger>
          <TabsTrigger value="rooms" className="rounded-2xl h-full px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            🛏️ Chambres
          </TabsTrigger>
        </TabsList>

        <TabsContent value="residents" className="space-y-6">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="relative w-96">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <Input placeholder="Rechercher un résident..." className="pl-12 rounded-2xl border-none shadow-sm h-12" />
                </div>
                <button className="px-8 h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-primary/90 transition-all">
                  + Loger un Élève
                </button>
             </div>
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-white border-b border-slate-50">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chambre</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bâtiment</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date d'arrivée</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {allocations.map((a: any) => (
                   <tr key={a.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-5">
                       <p className="font-bold text-slate-900">{a.student?.nomEtudiant}</p>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{a.student?.matricule}</p>
                     </td>
                     <td className="px-8 py-5">
                        <span className="font-black text-indigo-600">N° {a.room?.roomNumber}</span>
                     </td>
                     <td className="px-8 py-5 text-slate-500 font-medium text-sm">
                        {a.room?.buildingName}
                     </td>
                     <td className="px-8 py-5 text-sm text-slate-500">
                        {new Date(a.joinDate!).toLocaleDateString()}
                     </td>
                     <td className="px-8 py-5 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          a.status === 'Occupé' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {a.status}
                        </span>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <ActionMenu 
                          title="Gérer affectation"
                          onDelete={deleteHostelAllocation.bind(null, a.id)}
                        />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </TabsContent>

        <TabsContent value="rooms" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <button className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-4 group hover:border-primary/40 transition-all">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-primary transition-all">
                 <Plus size={32} />
              </div>
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Ajouter une Chambre</p>
           </button>

           {rooms.map((r: any) => (
             <div key={r.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-50 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     r.roomType === 'Filles' ? 'bg-pink-50 text-pink-500' : 'bg-blue-50 text-blue-500'
                   }`}>
                     {r.roomType}
                   </span>
                </div>

                <div className="flex items-center gap-4 mb-8">
                   <div className="p-4 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Bed size={24} />
                   </div>
                   <div>
                      <h4 className="font-black text-slate-900 text-xl tracking-tight">Chambre {r.roomNumber}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{r.buildingName}</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Occupation</p>
                      <p className="text-sm font-bold text-slate-700">{r.occupiedBeds} / {r.capacity} lits</p>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          (r.occupiedBeds || 0) >= r.capacity ? 'bg-rose-500' : 'bg-primary'
                        }`} 
                        style={{ width: `${((r.occupiedBeds || 0) / r.capacity) * 100}%` }}
                      />
                   </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-center">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarif</p>
                      <p className="text-lg font-black text-slate-900">{r.cost?.toLocaleString()} <span className="text-[10px]">CFA</span></p>
                   </div>
                   <button className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all">
                      Détails
                   </button>
                </div>
             </div>
           ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
