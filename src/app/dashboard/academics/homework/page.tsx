"use client";

import React, { Suspense, useEffect, useState } from "react";
import HomeworkDialog from "@/domains/academics/components/HomeworkDialog";
import ActionMenu from "@/components/common/ActionMenu";
import { FileText, Calendar, Clock, Paperclip, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";
import { getHomeworks, deleteHomework } from "@/domains/academics/actions/homework.actions";
import { getCurrentUserAction } from "@/domains/auth/actions/session.actions";
import StudentHomeworkPortal from "./components/StudentHomeworkPortal";

function HomeworkPageContent() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUserAction();
        if (user) {
          setCurrentUser(user);
        } else {
          const cached = localStorage.getItem("edut_session_user") || localStorage.getItem("edut_user_session");
          if (cached) setCurrentUser(JSON.parse(cached));
        }
      } catch {
        try {
          const cached = localStorage.getItem("edut_session_user") || localStorage.getItem("edut_user_session");
          if (cached) setCurrentUser(JSON.parse(cached));
        } catch {}
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadHomeworks() {
      // 1. Hydrate from local cache immediately (works 100% offline)
      try {
        const cached = localStorage.getItem("edut_homeworks_cache");
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) {
            setHomeworks(list);
          }
        }
      } catch (e) {
        console.debug("Failed to read homeworks cache:", e);
      } finally {
        setLoading(false);
      }

      // 2. Refresh with server data if online
      if (navigator.onLine) {
        try {
          const res = await getHomeworks();
          const list = ((res as any).data?.data || (res as any).data || []) as any[];
          if (Array.isArray(list)) {
            setHomeworks(list);
            try {
              localStorage.setItem("edut_homeworks_cache", JSON.stringify(list));
            } catch {}
          }
        } catch (err) {
          console.warn("Failed to load homeworks online:", err);
        }
      }
    }
    loadHomeworks();
  }, []);

  const roleName = String(currentUser?.role?.roleName || currentUser?.role || "").toLowerCase();
  const isStudent = Boolean(
    currentUser?.studentId ||
    currentUser?.student_id ||
    roleName.includes("eleve") ||
    roleName.includes("élève") ||
    roleName.includes("etudiant") ||
    roleName.includes("student")
  );

  if (isStudent) {
    return (
      <div className="p-4 md:p-8 bg-[#0B0D14] min-h-[calc(100vh-65px)] rounded-3xl">
        <StudentHomeworkPortal currentUser={currentUser} />
      </div>
    );
  }

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Devoirs & Tâches</h1>
          <p className="text-slate-500 mt-2 font-medium">Assignez et suivez les travaux de maison</p>
        </div>
        <HomeworkDialog mode="add" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {homeworks.map((hw: any) => {
          const isExpired = hw.dateDue ? new Date(hw.dateDue) < new Date() : false;
          return (
            <div key={hw.id} className="group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col h-full overflow-hidden">
              <div className="p-8 space-y-6 flex-grow">
                <div className="flex justify-between items-start">
                  <div className={`p-4 rounded-2xl ${isExpired ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    <FileText size={24} />
                  </div>
                  <ActionMenu 
                    title="Gérer le devoir"
                    onDelete={deleteHomework.bind(null, hw.id)}
                    editDialog={<HomeworkDialog mode="edit" initialData={hw} />}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-primary transition-colors">{hw.title}</h3>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                      {getClassDisplayName(hw.class)}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                      {hw.subject?.subjectName}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-500 line-clamp-3 font-medium leading-relaxed">
                  {hw.description || "Aucune description fournie."}
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={10} /> Assigné
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      {hw.dateAssigned ? format(new Date(hw.dateAssigned), "dd/MM/yyyy", { locale: fr }) : "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>
                      <Clock size={10} /> Échéance
                    </p>
                    <p className={`text-xs font-bold ${isExpired ? 'text-rose-600 font-black' : 'text-slate-700'}`}>
                      {hw.dateDue ? format(new Date(hw.dateDue), "dd/MM/yyyy", { locale: fr }) : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                {hw.attachmentPath ? (
                  <a 
                    href={hw.attachmentPath} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-black text-xs transition-all hover:translate-x-1"
                  >
                    <Paperclip size={14} /> Pièce jointe
                  </a>
                ) : (
                  <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest">Aucun fichier</span>
                )}
                
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${isExpired ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   {isExpired ? 'Expiré' : 'Actif'}
                </div>
              </div>
            </div>
          );
        })}

        {homeworks.length === 0 && !loading && (
          <div className="col-span-full py-32 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="p-8 bg-white rounded-full shadow-sm w-fit mx-auto mb-6">
              <FileText size={64} className="text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest">Aucun devoir publié</h3>
            <p className="text-slate-400 mt-2 font-medium">Les devoirs créés apparaîtront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomeworkPage() {
  return (
    <Suspense fallback={null}>
      <HomeworkPageContent />
    </Suspense>
  );
}

