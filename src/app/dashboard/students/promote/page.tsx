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
  
  // Parallel fetch for better performance
  const [studentsRes, classesRes, sessionsRes] = await Promise.all([
    getStudents(),
    getClasses(),
    getSessions()
  ]);

  const allStudents = (studentsRes as any)?.data || (studentsRes.data as any)?.data || studentsRes.data || [];
  const classes = (classesRes.data as any)?.data || classesRes.data || [];
  const sessions = (sessionsRes.data as any)?.data || sessionsRes.data || [];

  const studentIds = allStudents.map((s: any) => s.id);
  
  // Fetch real average grades from the database summaries table
  const averagesMap: Record<number, number> = {};
  if (studentIds.length > 0) {
    try {
      const summaries = await db
        .select({
          studentId: studentTermSummaries.studentId,
          average: studentTermSummaries.average,
        })
        .from(studentTermSummaries)
        .where(inArray(studentTermSummaries.studentId, studentIds));

      const groupings: Record<number, number[]> = {};
      summaries.forEach((s) => {
        if (s.studentId) {
          if (!groupings[s.studentId]) groupings[s.studentId] = [];
          groupings[s.studentId].push(Number(s.average) || 0);
        }
      });

      Object.keys(groupings).forEach((sId) => {
        const id = Number(sId);
        const avgs = groupings[id];
        const sum = avgs.reduce((a, b) => a + b, 0);
        averagesMap[id] = avgs.length > 0 ? sum / avgs.length : 10.0;
      });
    } catch (err) {
      console.error("⚠️ Failed to fetch student averages:", err);
    }
  }

  // Combine student details with their real averages
  const studentsWithRealAverages = allStudents.map((s: any) => ({
    ...s,
    moyenne: averagesMap[s.id] !== undefined ? averagesMap[s.id] : 10.0, // Default fallback to 10.0 (passing score) if no grades recorded yet
  }));

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
