export const dynamic = "force-dynamic";

import { getStudents } from "@/domains/students/actions/students.actions";
import { getClasses, getSessions } from "@/domains/academics/actions/academics.actions";
import { db } from "@/infrastructure/database";
import { studentTermSummaries } from "@/infrastructure/database/schema/academics";
import { inArray } from "drizzle-orm";
import PromoteClient from "./promote-client";

export default async function StudentPromotionPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ class?: string; session?: string }> 
}) {
  const params = await searchParams;
  const [studentsRes, classesRes, sessionsRes] = await Promise.all([
    getStudents(),
    getClasses(true),
    getSessions()
  ]);

  const allStudents = (studentsRes as any)?.data || (studentsRes.data as any)?.data || studentsRes.data || [];
  const classes = (classesRes.data as any)?.data || classesRes.data || [];
  const sessions = (sessionsRes.data as any)?.data || sessionsRes.data || [];

  const studentIds = allStudents.map((s: any) => s.id);
  
  // Fetch real average grades from the database summaries table
  let summaries: any[] = [];
  if (studentIds.length > 0) {
    try {
      summaries = await db
        .select({
          studentId: studentTermSummaries.studentId,
          average: studentTermSummaries.average,
          sessionId: studentTermSummaries.sessionId,
        })
        .from(studentTermSummaries)
        .where(inArray(studentTermSummaries.studentId, studentIds));
    } catch (err) {
      console.error("⚠️ Failed to fetch student averages:", err);
    }
  }

  // Map sessionName to sessionId
  const sessionNameToIdMap: Record<string, number> = {};
  sessions.forEach((s: any) => {
    if (s.sessionName && s.id) {
      sessionNameToIdMap[s.sessionName.trim().toLowerCase()] = s.id;
    }
  });

  // Combine student details with their real averages
  const studentsWithRealAverages = allStudents.map((s: any) => {
    const studentSessionName = s.session ? s.session.trim().toLowerCase() : "";
    const studentSessionId = sessionNameToIdMap[studentSessionName];
    
    // Filter summaries for this student and their current session
    const studentSummaries = summaries.filter((sum: any) => 
      sum.studentId === s.id && 
      (!studentSessionId || sum.sessionId === studentSessionId)
    );
    
    const avgs = studentSummaries.map((sum: any) => Number(sum.average) || 0);
    const sum = avgs.reduce((a, b) => a + b, 0);
    const average = avgs.length > 0 ? sum / avgs.length : 10.0;

    return {
      ...s,
      moyenne: average,
    };
  });

  return (
    <PromoteClient 
      students={studentsWithRealAverages}
      classes={classes}
      sessions={sessions}
      initialClass={params.class}
      initialSession={params.session}
    />
  );
}
