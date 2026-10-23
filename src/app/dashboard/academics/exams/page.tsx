"use client";

import React, { Suspense, useEffect, useState } from "react";
import ExamsDashboardClient from "./exams-dashboard-client";
import { getClasses, getSessions, getSubjects } from "@/domains/academics/actions/academics.actions";

function ExamsPageContent() {
  const [initialClasses, setInitialClasses] = useState<any[]>([]);
  const [initialSessions, setInitialSessions] = useState<any[]>([]);
  const [initialSubjects, setInitialSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (!navigator.onLine) return;
    async function loadOnline() {
      try {
        const [classesRes, sessionsRes, subjectsRes] = await Promise.all([
          getClasses().catch(() => null),
          getSessions().catch(() => null),
          getSubjects().catch(() => null)
        ]);
        if (classesRes) {
          const list = (classesRes as any)?.data?.data || (classesRes as any)?.data || [];
          if (Array.isArray(list) && list.length > 0) setInitialClasses(list);
        }
        if (sessionsRes) {
          const list = (sessionsRes as any)?.data?.data || (sessionsRes as any)?.data || [];
          if (Array.isArray(list) && list.length > 0) setInitialSessions(list);
        }
        if (subjectsRes) {
          const list = (subjectsRes as any)?.data?.data || (subjectsRes as any)?.data || [];
          if (Array.isArray(list) && list.length > 0) setInitialSubjects(list);
        }
      } catch (err) {
        console.warn("Failed to pre-fetch references online for exams dashboard:", err);
      }
    }
    loadOnline();
  }, []);

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <ExamsDashboardClient
        initialClasses={initialClasses}
        initialSessions={initialSessions}
        initialSubjects={initialSubjects}
      />
    </div>
  );
}

export default function ExamsPage() {
  return (
    <Suspense fallback={null}>
      <ExamsPageContent />
    </Suspense>
  );
}

