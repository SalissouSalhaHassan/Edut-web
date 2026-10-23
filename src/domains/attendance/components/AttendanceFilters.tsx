"use client";

import { Calendar } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

interface AttendanceFiltersProps {
  date: string;
  classId: number | null;
  subjectId: number | null;
  classes: any[];
  subjects: any[];
  onFilterChange?: (filters: { date?: string; classId?: number | null; subjectId?: number | null }) => void;
}

export function AttendanceFilters({ date, classId, subjectId, classes, subjects, onFilterChange }: AttendanceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = (key: string, value: string) => {
    let newDate = date;
    let newClassId = classId;
    let newSubjectId = subjectId;

    if (key === "date") newDate = value;
    if (key === "classId") {
      newClassId = value ? Number(value) : null;
      newSubjectId = null;
    }
    if (key === "subjectId") {
      newSubjectId = value ? Number(value) : null;
    }

    if (onFilterChange) {
      onFilterChange({ date: newDate, classId: newClassId, subjectId: newSubjectId });
    }

    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    if (newDate) params.set("date", newDate); else params.delete("date");
    if (newClassId) params.set("classId", String(newClassId)); else params.delete("classId");
    if (newSubjectId) params.set("subjectId", String(newSubjectId)); else params.delete("subjectId");

    try {
      window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
    } catch {}

    if (navigator.onLine && !onFilterChange) {
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div className="bg-white dark:bg-[#131622] p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap items-end gap-6">
      <div className="space-y-2 flex-1 min-w-[200px]">
        <label className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Date</label>
        <div className="relative">
          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input 
            type="date" 
            name="date"
            value={date || ""}
            className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            onChange={(e) => updateFilters("date", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2 flex-1 min-w-[200px]">
        <label className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Classe</label>
        <select 
          name="classId"
          value={classId ? String(classId) : ""}
          onChange={(e) => updateFilters("classId", e.target.value)}
          className="w-full px-6 h-14 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
        >
          <option value="">-- Choisir une classe --</option>
          {classes.map(c => (
            <option key={c.id} value={String(c.id)}>{getClassDisplayName(c)}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2 flex-1 min-w-[200px]">
        <label className="text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest ml-1">Matière (Optionnel)</label>
        <select 
          name="subjectId"
          value={subjectId ? String(subjectId) : ""}
          onChange={(e) => updateFilters("subjectId", e.target.value)}
          className="w-full px-6 h-14 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
        >
          <option value="">-- Appel Global --</option>
          {subjects.map(s => {
            const id = s.subject?.id || s.subjectId || s.id;
            const name = s.subject?.subjectName || s.subjectName || "Matière inconnue";
            return (
              <option key={s.id ?? id} value={String(id)}>
                {name}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
