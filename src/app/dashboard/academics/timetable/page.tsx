export const dynamic = "force-dynamic";

import { getClasses, getSessions, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getPedagogicalUnits } from "@/domains/academics/actions/pedagogical-units.actions";
import IntelligentTimetable from "./timetable-intelligent";

export default async function TimetablePage() {
  const classesRes = await getClasses();
  const sessionsRes = await getSessions();
  const employeesRes = await getEmployees();
  const subjectsRes = await getSubjects();
  const unitsRes = await getPedagogicalUnits();

  const classes: any[] = ((classesRes as any).data?.data || (classesRes as any).data || []) as any[];
  const sessions: any[] = ((sessionsRes as any).data?.data || (sessionsRes as any).data || []) as any[];
  const employees: any[] = ((employeesRes as any).data?.data || (employeesRes as any).data || []) as any[];
  const subjects: any[] = ((subjectsRes as any).data?.data || (subjectsRes as any).data || []) as any[];
  const units: any[] = (unitsRes as any).data || [];
  
  const currentSession = sessions.find(s => s.isActive) || sessions[0] || { id: 0, sessionName: "N/A" };

  return (
    <div className="p-3 h-[calc(100vh-60px)]">
      <IntelligentTimetable 
        classes={classes}
        teachers={employees}
        subjects={subjects}
        currentSession={currentSession}
        pedagogicalUnits={units}
      />
    </div>
  );
}
