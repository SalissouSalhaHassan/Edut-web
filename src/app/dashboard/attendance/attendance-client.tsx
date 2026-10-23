"use client";

import React, { useState, useEffect, useCallback } from "react";
import AttendanceGrid from "@/domains/attendance/components/AttendanceGrid";
import { AttendanceFilters } from "@/domains/attendance/components/AttendanceFilters";
import { ClipboardCheck, Users, Calendar, BookOpen } from "lucide-react";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";

interface AttendanceClientProps {
  classes: any[];
  stats: any;
  subjects: any[];
  initialRecords: any[];
  students: any[];
  classId: number | null;
  subjectId: number | null;
  date: string;
  canEdit: boolean;
}

export default function AttendanceClient({
  classes: initialClasses,
  stats: initialStats,
  subjects: initialSubjects,
  initialRecords,
  students: initialStudents,
  classId: propClassId,
  subjectId: propSubjectId,
  date: propDate,
  canEdit,
}: AttendanceClientProps) {
  // 1. Client-managed filter states for offline resilience
  const [currentClassId, setCurrentClassId] = useState<number | null>(propClassId);
  const [currentSubjectId, setCurrentSubjectId] = useState<number | null>(propSubjectId);
  const [currentDate, setCurrentDate] = useState<string>(propDate || new Date().toISOString().split("T")[0]);

  // 2. Local data state
  const [classList, setClassList] = useState<any[]>(initialClasses || []);
  const [subjectList, setSubjectList] = useState<any[]>(initialSubjects || []);
  const [studentList, setStudentList] = useState<any[]>(initialStudents || []);
  const [records, setRecords] = useState<any[]>(initialRecords || []);
  const [stats, setStats] = useState<any>(initialStats || { presents: 0, absents: 0, lates: 0, excused: 0 });
  const [isLocal, setIsLocal] = useState(false);

  // Sync classes when props update or load from Dexie offline
  useEffect(() => {
    if (initialClasses && initialClasses.length > 0) {
      setClassList(initialClasses);
      import("@/infrastructure/local-db/references").then(({ cacheReferenceItems }) => {
        cacheReferenceItems("class", initialClasses, "className").catch(() => {});
      });
    }
  }, [initialClasses]);

  // Fallback: Load classes from Dexie if initialClasses is empty (e.g. offline page load)
  useEffect(() => {
    async function loadOfflineClasses() {
      if (classList.length === 0 || !navigator.onLine) {
        try {
          const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
          const cached = await getCachedReferenceItems("class");
          if (cached && cached.length > 0) {
            setClassList(cached);
          }
        } catch (e) {
          console.warn("Failed to load cached classes:", e);
        }
      }
    }
    loadOfflineClasses();
  }, []);

  // Update subjects list when class changes
  useEffect(() => {
    async function loadSubjects() {
      if (initialSubjects && initialSubjects.length > 0 && currentClassId === propClassId) {
        setSubjectList(initialSubjects);
        import("@/infrastructure/local-db/references").then(({ cacheReferenceItems }) => {
          cacheReferenceItems("subject", initialSubjects, "subjectName").catch(() => {});
        });
        return;
      }

      // Offline fallback: load cached subjects
      try {
        const { getCachedReferenceItems } = await import("@/infrastructure/local-db/references");
        const cached = await getCachedReferenceItems("subject");
        if (cached && cached.length > 0) {
          setSubjectList(cached);
        }
      } catch (e) {
        console.warn("Failed to load cached subjects:", e);
      }
    }
    loadSubjects();
  }, [currentClassId, initialSubjects, propClassId]);

  // Load students and attendance records whenever currentClassId, currentDate, or currentSubjectId changes
  const loadClassData = useCallback(async () => {
    if (!currentClassId) {
      setStudentList([]);
      setRecords([]);
      setStats({ presents: 0, absents: 0, lates: 0, excused: 0 });
      return;
    }

    // 1. Resolve Students
    let resolvedStudents: any[] = [];
    if (navigator.onLine && currentClassId === propClassId && initialStudents && initialStudents.length > 0) {
      resolvedStudents = initialStudents;
      // Cache students in Dexie
      import("@/infrastructure/local-db/cache").then(({ cacheStudents }) => {
        cacheStudents(initialStudents).catch(() => {});
      });
    } else {
      // Offline fallback: query localDb.students
      try {
        const { localDb } = await import("@/infrastructure/local-db/dexie");
        const allLocalStudents = await localDb.students.toArray();

        const selectedClass = classList.find((c) => Number(c.id) === Number(currentClassId));
        const selectedClassName = selectedClass ? getClassDisplayName(selectedClass, "").toLowerCase() : "";

        if (selectedClassName) {
          const filtered = allLocalStudents.filter((s) => {
            const sc = String(s.classe || "").toLowerCase();
            return sc === selectedClassName || selectedClassName.includes(sc) || sc.includes(selectedClassName);
          });
          resolvedStudents = filtered.length > 0 ? filtered : allLocalStudents;
        } else {
          resolvedStudents = allLocalStudents;
        }
      } catch (e) {
        console.warn("Failed to load offline students:", e);
      }
    }
    setStudentList(resolvedStudents);

    // 2. Resolve Attendance Records & Stats
    if (navigator.onLine && currentClassId === propClassId && currentDate === propDate && initialRecords && initialRecords.length > 0) {
      setRecords(initialRecords);
      setStats(initialStats);
      setIsLocal(false);
      // Cache records locally
      import("@/infrastructure/local-db/cache").then(({ cacheAttendance }) => {
        cacheAttendance(currentClassId, currentDate, currentSubjectId || undefined, initialRecords).catch(() => {});
      });
    } else {
      // Offline fallback: load from local cache
      try {
        const { getCachedAttendance } = await import("@/infrastructure/local-db/cache");
        const cached = await getCachedAttendance(currentClassId, currentDate, currentSubjectId || undefined);
        if (cached && cached.length > 0) {
          setRecords(cached);
          setIsLocal(true);

          const presents = cached.filter((r: any) => (r.status || "").toLowerCase().includes("présent") || (r.status || "").toLowerCase() === "present").length;
          const absents = cached.filter((r: any) => (r.status || "").toLowerCase().includes("absent")).length;
          const lates = cached.filter((r: any) => (r.status || "").toLowerCase().includes("retard") || (r.status || "").toLowerCase() === "late").length;
          const excused = cached.filter((r: any) => (r.status || "").toLowerCase().includes("excusé") || (r.status || "").toLowerCase() === "excused").length;
          setStats({ presents, absents, lates, excused });
        } else {
          setRecords([]);
          setIsLocal(false);
          setStats({ presents: 0, absents: 0, lates: 0, excused: 0 });
        }
      } catch (e) {
        console.warn("Failed to load cached attendance records:", e);
      }
    }
  }, [currentClassId, currentDate, currentSubjectId, propClassId, propDate, initialStudents, initialRecords, initialStats, classList]);

  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Handle instant filter change from UI
  const handleFilterChange = (filters: { date?: string; classId?: number | null; subjectId?: number | null }) => {
    if (filters.date !== undefined) setCurrentDate(filters.date);
    if (filters.classId !== undefined) {
      setCurrentClassId(filters.classId);
      setCurrentSubjectId(null);
    }
    if (filters.subjectId !== undefined) setCurrentSubjectId(filters.subjectId);
  };

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Appel & Présence</h1>
            {isLocal && (
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse self-center">
                Données locales
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Enregistrez la présence quotidienne des élèves</p>
        </div>
      </div>

      <AttendanceFilters 
        date={currentDate} 
        classId={currentClassId} 
        subjectId={currentSubjectId} 
        classes={classList} 
        subjects={subjectList}
        onFilterChange={handleFilterChange}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Présents", value: stats?.presents || 0, icon: ClipboardCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Absents", value: stats?.absents || 0, icon: Users, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
          { label: "Retards", value: stats?.lates || 0, icon: Calendar, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { label: "Excusés", value: stats?.excused || 0, icon: BookOpen, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white dark:bg-[#131622] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {currentClassId ? (
        <AttendanceGrid 
          key={`${currentClassId}-${currentSubjectId}-${currentDate}`}
          students={studentList} 
          classId={currentClassId} 
          subjectId={currentSubjectId || undefined} 
          date={currentDate} 
          initialRecords={records}
          canEdit={canEdit}
          onStatsChange={(newStats) => {
            setStats(newStats);
          }}
          onRecordsSaved={(saved) => {
            setRecords(saved);
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-900/40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="p-6 bg-white dark:bg-[#131622] rounded-full shadow-sm mb-4 border border-slate-100 dark:border-slate-800">
            <ClipboardCheck size={48} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-600 dark:text-slate-200">Prêt pour l'appel</h3>
          <p className="text-slate-400 dark:text-slate-400 font-medium">Veuillez sélectionner une classe pour commencer</p>
        </div>
      )}
    </div>
  );
}
