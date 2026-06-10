import { getLmsLessons, getLmsVirtualClasses, deleteLmsLesson } from "@/domains/lms/actions/lms.actions";
import ActionMenu from "@/components/common/ActionMenu";
import { BookOpen, Video, Globe, Play, FileText, Plus, Search, Calendar, Clock, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default async function LmsPage() {
  const lessonsRes = await getLmsLessons();
  const sessionsRes = await getLmsVirtualClasses();
  const lessons = (lessonsRes as any).data?.data || (lessonsRes as any).data || [];
  const sessions = (sessionsRes as any).data?.data || (sessionsRes as any).data || [];

  const stats = [
    { label: "Leçons Publiées", value: lessons.length, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Supports Vidéo", value: lessons.filter((l: any) => l.videoUrl).length, icon: Video, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Lives Programmés", value: sessions.filter((s: any) => s.status === 'À venir').length, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">E-Learning & LMS</h1>
          <p className="text-slate-500 mt-2 font-medium">Plateforme d'apprentissage en ligne et classes virtuelles</p>
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

      <Tabs defaultValue="lessons" className="w-full space-y-8">
        <TabsList className="bg-slate-100 p-2 rounded-3xl h-16 w-fit gap-2">
          <TabsTrigger value="lessons" className="rounded-2xl h-full px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            📚 Support de Cours
          </TabsTrigger>
          <TabsTrigger value="virtual" className="rounded-2xl h-full px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            🌐 Classes Virtuelles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <button className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-10 flex flex-col items-center justify-center gap-4 group hover:border-primary/40 transition-all min-h-[300px]">
                 <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-primary transition-all">
                    <Plus size={32} />
                 </div>
                 <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Publier une Leçon</p>
              </button>

              {lessons.map((lesson: any) => (
                <div key={lesson.id} className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-50 transition-all group relative overflow-hidden flex flex-col">
                   <div className="flex justify-between items-start mb-6">
                      <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                         {lesson.subject?.name}
                      </span>
                      <ActionMenu title="Gérer leçon" onDelete={deleteLmsLesson.bind(null, lesson.id)} />
                   </div>

                   <h4 className="font-black text-slate-900 text-xl tracking-tight mb-2 line-clamp-2">{lesson.title}</h4>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">{lesson.class?.name} • {lesson.module || 'Sans module'}</p>
                   
                   <p className="text-slate-500 text-sm font-medium leading-relaxed line-clamp-3 mb-8">
                      {lesson.content || "Aucun résumé disponible pour cette leçon."}
                   </p>

                   <div className="mt-auto flex items-center gap-4">
                      {lesson.videoUrl && (
                        <button className="flex-1 py-4 rounded-2xl bg-rose-50 text-rose-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-100 transition-all">
                           <Play size={14} fill="currentColor" /> Vidéo
                        </button>
                      )}
                      {lesson.filePath && (
                        <button className="flex-1 py-4 rounded-2xl bg-blue-50 text-blue-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all">
                           <FileText size={14} /> Document
                        </button>
                      )}
                      {!lesson.videoUrl && !lesson.filePath && (
                        <button className="w-full py-4 rounded-2xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                           Détails
                        </button>
                      )}
                   </div>
                </div>
              ))}
           </div>
        </TabsContent>

        <TabsContent value="virtual" className="space-y-6">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50/50 border-b border-slate-100">
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Session / Titre</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe & Matière</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durée</th>
                   <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lien / Zoom</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {sessions.map((s: any) => (
                   <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${s.status === 'À venir' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <p className="font-bold text-slate-900">{s.title}</p>
                       </div>
                     </td>
                     <td className="px-8 py-5">
                        <p className="font-bold text-indigo-600">{s.class?.name}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{s.subject?.name}</p>
                     </td>
                     <td className="px-8 py-5">
                        <div className="flex flex-col">
                           <div className="flex items-center gap-2 text-slate-700 font-bold">
                              <Calendar size={14} className="text-slate-300" /> {new Date(s.sessionDate).toLocaleDateString()}
                           </div>
                           <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                              <Clock size={14} className="text-slate-300" /> {new Date(s.sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-5 text-center font-black text-slate-500 text-sm">
                        {s.duration} min
                     </td>
                     <td className="px-8 py-5 text-right">
                        <button className="px-6 py-3 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-primary/90 transition-all flex items-center gap-2 ml-auto">
                           <ExternalLink size={14} /> Rejoindre
                        </button>
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
