export const dynamic = "force-dynamic";

import { getVisitors, getEnquiries, getPostalRecords, checkoutVisitor, deleteVisitor } from "@/domains/front-office/actions/front-office.actions";
import VisitorDialog from "@/domains/front-office/components/VisitorDialog";
import ActionMenu from "@/components/common/ActionMenu";
import { User, PhoneCall, Package, Clock, MapPin, CheckCircle2, UserCheck, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function FrontOfficePage() {
  const visitorsRes = await getVisitors();
  const enquiriesRes = await getEnquiries();
  const postalRes = await getPostalRecords();
  const visitors: any[] = (visitorsRes as any).data?.data || (visitorsRes as any).data || [];
  const enquiries: any[] = (enquiriesRes as any).data?.data || (enquiriesRes as any).data || [];
  const postal: any[] = (postalRes as any).data?.data || (postalRes as any).data || [];

  const stats = [
    { label: "Visiteurs (Jour)", value: visitors.length, icon: User, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Demandes Attente", value: enquiries.filter((e: any) => e.status === 'En Attente').length, icon: PhoneCall, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Courriers (Jour)", value: postal.length, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Accueil & Front Office</h1>
          <p className="text-slate-500 mt-2 font-medium">Gérez le flux des visiteurs, les demandes et le courrier</p>
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

      <Tabs defaultValue="visitors" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-2 rounded-3xl h-16 w-full max-w-2xl gap-2">
          <TabsTrigger value="visitors" className="rounded-2xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            🚶‍♂️ Visiteurs
          </TabsTrigger>
          <TabsTrigger value="enquiries" className="rounded-2xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            📞 Admissions
          </TabsTrigger>
          <TabsTrigger value="postal" className="rounded-2xl h-full font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            📦 Courrier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visitors" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900">Registre des Visiteurs</h2>
            <VisitorDialog mode="add" />
          </div>
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visiteur</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Motif / Rencontre</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Entrée</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sortie</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visitors.map((v: any) => (
                  <tr key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900">{v.visitorName}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{v.phone || "---"}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-700">{v.purpose}</p>
                      <p className="text-xs text-slate-400">Avec: {v.meetingWith || "N/A"}</p>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-slate-500">{v.timeIn}</td>
                    <td className="px-8 py-5 text-center">
                      {v.timeOut ? (
                        <span className="text-xs font-bold text-slate-400">{v.timeOut}</span>
                      ) : (
                        <form action={async () => { "use server"; await checkoutVisitor(v.id); }}>
                           <button className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all">Sortie</button>
                        </form>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                       <ActionMenu 
                          title="Gérer visiteur"
                          onDelete={deleteVisitor.bind(null, v.id)}
                          editDialog={<VisitorDialog mode="edit" initialData={v} />}
                       />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ... Similar implementation for Enquiries and Postal ... */}
      </Tabs>
    </div>
  );
}
