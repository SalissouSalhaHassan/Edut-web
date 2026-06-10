import { getIncidents, deleteIncident } from "@/domains/students/actions/discipline.actions";
import IncidentDialog from "@/domains/students/components/IncidentDialog";
import ActionMenu from "@/components/common/ActionMenu";
import { Gavel, AlertTriangle, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function DisciplinePage() {
  const res = await getIncidents();
  const incidents = (res.data as any)?.data || res.data || [];

  const stats = [
    { label: "Total Incidents", value: incidents.length, icon: Gavel, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "En attente", value: incidents.filter((i: any) => i.status === "En attente").length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Critiques", value: incidents.filter((i: any) => i.severity === "Critique").length, icon: ShieldAlert, color: "text-rose-600", bg: "bg-rose-50" },
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Discipline & Conseils</h1>
          <p className="text-slate-500 mt-2 font-medium">Gérez le comportement et les incidents scolaires</p>
        </div>
        <IncidentDialog mode="add" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
            <div className={`p-5 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Élève / Date</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">Incident</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Gravité</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Statut</th>
              <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {incidents.map((incident: any) => (
              <tr key={incident.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <p className="font-bold text-slate-900">{incident.student?.nomEtudiant}</p>
                  <p className="text-xs text-slate-400 font-medium">
                    {incident.date ? format(new Date(incident.date), "dd/MM/yyyy", { locale: fr }) : "-"}
                  </p>
                </td>
                <td className="px-8 py-5">
                  <p className="font-bold text-slate-700">{incident.incidentType}</p>
                  <p className="text-xs text-slate-400 line-clamp-1">{incident.description}</p>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    incident.severity === 'Critique' ? 'bg-rose-100 text-rose-600' : 
                    incident.severity === 'Majeur' ? 'bg-amber-100 text-amber-600' : 
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {incident.severity}
                  </span>
                </td>
                <td className="px-8 py-5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {incident.status === 'Résolu' ? (
                      <span className="text-emerald-500 flex items-center gap-1 text-xs font-bold">
                        <CheckCircle2 size={14} /> Résolu
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1 text-xs font-bold">
                        <Clock size={14} /> {incident.status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <ActionMenu 
                    title="Gérer l'incident"
                    onDelete={deleteIncident.bind(null, incident.id)}
                    editDialog={<IncidentDialog mode="edit" initialData={incident} />}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {incidents.length === 0 && (
          <div className="py-20 text-center">
            <Gavel className="mx-auto text-slate-200 mb-4" size={64} />
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Aucun incident signalé</h3>
          </div>
        )}
      </div>
    </div>
  );
}
