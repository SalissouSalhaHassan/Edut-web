"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AttendanceClient from "./attendance-client";
import StudentAttendancePortal from "./components/StudentAttendancePortal";
import { getCurrentUserAction } from "@/domains/auth/actions/session.actions";
import { getClasses } from "@/domains/academics/actions/academics.actions";
import { getAttendanceStats, getAttendanceRecords } from "@/domains/attendance/actions/attendance.actions";

function AttendancePageContent() {
  const searchParams = useSearchParams();
  const date = searchParams?.get("date") || new Date().toISOString().split("T")[0];
  const classId = searchParams?.get("classId") ? Number(searchParams.get("classId")) : null;
  const subjectId = searchParams?.get("subjectId") ? Number(searchParams.get("subjectId")) : null;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ presents: 0, absents: 0, lates: 0, excused: 0 });
  const [initialRecords, setInitialRecords] = useState<any[]>([]);
  const [canEdit, setCanEdit] = useState<boolean>(true);

  // Load user from server action or cached session
  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUserAction();
        if (user) {
          setCurrentUser(user);
          try {
            localStorage.setItem("edut_session_user", JSON.stringify(user));
          } catch {}
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

  // Online background data loading
  useEffect(() => {
    async function loadInitialData() {
      if (!navigator.onLine) return;
      try {
        const [classesRes, statsRes] = await Promise.all([
          getClasses(false).catch(() => null),
          getAttendanceStats(date, classId, subjectId).catch(() => null),
        ]);
        if (classesRes) {
          const list = (classesRes as any)?.data?.data || (classesRes as any)?.data || [];
          if (Array.isArray(list) && list.length > 0) setClasses(list);
        }
        if (statsRes) {
          const s = (statsRes as any)?.data?.data || (statsRes as any)?.data;
          if (s) setStats(s);
        }
        if (classId) {
          const recordsRes = await getAttendanceRecords(classId, date, subjectId || undefined).catch(() => null);
          const raw = (recordsRes as any)?.data?.data !== undefined ? (recordsRes as any)?.data?.data : (recordsRes as any)?.data;
          if (Array.isArray(raw)) setInitialRecords(raw);
        }
      } catch (e) {
        console.warn("Offline initial attendance load:", e);
      }
    }
    loadInitialData();
  }, [date, classId, subjectId]);

  const roleName = String(currentUser?.role?.roleName || currentUser?.role || "").toLowerCase();
  const isStudent = roleName.includes("eleve") || roleName.includes("élève") || Boolean(currentUser?.studentId) || Boolean((currentUser as any)?.student_id);

  if (isStudent && currentUser) {
    return (
      <div className="p-4 md:p-8 bg-[#0B0D14] min-h-[calc(100vh-65px)] rounded-3xl">
        <StudentAttendancePortal currentUser={currentUser} />
      </div>
    );
  }

  return (
    <AttendanceClient 
      classes={classes}
      stats={stats}
      subjects={[]}
      initialRecords={initialRecords}
      students={[]}
      classId={classId}
      subjectId={subjectId}
      date={date}
      canEdit={canEdit}
    />
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={null}>
      <AttendancePageContent />
    </Suspense>
  );
}
