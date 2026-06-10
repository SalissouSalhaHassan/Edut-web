import { getTransportRoutes, getTransportSubscriptions, removeSubscription } from "@/domains/transport/actions/transport.actions";
import ActionMenu from "@/components/common/ActionMenu";
import { Bus, MapPin, Users, TrendingUp, Phone, Calendar, Search, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default async function TransportPage() {
  const routesRes = await getTransportRoutes() as any;
  const routes = routesRes.data?.data || routesRes.data || [];
  const subsRes = await getTransportSubscriptions() as any;
  const subs = subsRes.data?.data || subsRes.data || [];

  const totalRevenue = subs.reduce((acc: number, s: any) => acc + (s.route?.monthlyFee || 0), 0);

  const stats = [
    { label: "Lignes Actives", value: routes.length, icon: Bus, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Élèves Abonnés", value: subs.length, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Revenu Mensuel", value: totalRevenue.toLocaleString() + " CFA", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Transport Scolaire</h1>
          <p className="text-slate-500 mt-2 font-medium">Gestion des bus, des chauffeurs et des abonnements</p>
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

      <Tabs defaultValue="subs" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-2 rounded-3xl h-16 w-full max-w-md gap-2">
          <TabsTrigger value="subs" className="rounded-2xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-1">
            👨‍🎓 Abonnés
          </TabsTrigger>
          <TabsTrigger value="routes" className="rounded-2xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-1">
            🚌 Lignes & Bus
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subs" className="space-y-6">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="relative w-96">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <Input placeholder="Rechercher un abonné..." className="pl-12 rounded-2xl border-none shadow-sm h-12" />
                </div>
                <button className="px-8 h-12 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-primary/90 transition-all">
                  + Inscrire un Élève
                </button>
             </div>
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-white border-b border-slate-50">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ligne / Zone</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ramassage</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarif / Mois</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {subs.map((s: any) => (
                   <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-5">
                       <p className="font-bold text-slate-900">{s.student?.nomEtudiant}</p>
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.student?.classe}</p>
                     </td>
                     <td className="px-8 py-5">
                        <span className="font-bold text-indigo-600">{s.route?.routeName}</span>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                           <MapPin size={14} className="text-slate-300" /> {s.pickupPoint || "Standard"}
                        </div>
                     </td>
                     <td className="px-8 py-5 font-black text-slate-700">
                        {s.route?.monthlyFee?.toLocaleString()} CFA
                     </td>
                     <td className="px-8 py-5 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          s.status === 'Actif' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                          {s.status}
                        </span>
                     </td>
                     <td className="px-8 py-5 text-right">
                        <ActionMenu 
                          title="Gérer abonnement"
                          onDelete={removeSubscription.bind(null, s.id)}
                        />
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50/50 border-b border-slate-100">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Zone / Trajet</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bus / Chauffeur</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Tarif Mensuel</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {routes.map((r: any) => (
                   <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-5 font-bold text-slate-900">{r.routeName}</td>
                     <td className="px-8 py-5">
                        <p className="font-bold text-slate-700">{r.vehicleNumber}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Chauffeur: {r.driverName}</p>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                           <Phone size={14} className="text-slate-300" /> {r.driverPhone || "N/A"}
                        </div>
                     </td>
                     <td className="px-8 py-5 text-right font-black text-indigo-600">
                        {r.monthlyFee.toLocaleString()} CFA
                     </td>
                     <td className="px-8 py-5 text-right">
                        <button className="px-4 py-2 rounded-xl bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-primary transition-all">Détails</button>
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
