import { getStudents } from "@/domains/students/actions/students.actions";
import { getClasses, getSessions } from "@/domains/academics/actions/academics.actions";
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

  const allStudents = (studentsRes.data as any)?.data || studentsRes.data || [];
  const classes = (classesRes.data as any)?.data || classesRes.data || [];
  const sessions = (sessionsRes.data as any)?.data || sessionsRes.data || [];

  return (
    <PromoteClient 
      students={allStudents}
      classes={classes}
      sessions={sessions}
      initialClass={params.class}
      initialSession={params.session}
    />
  );
}
