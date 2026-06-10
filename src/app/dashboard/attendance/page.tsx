import { getAttendanceRecords, getAttendanceStats } from "@/domains/attendance/actions/attendance.actions";
import { getClasses, getSubjectsForClass } from "@/domains/academics/actions/academics.actions";
import { getStudentsByClass } from "@/domains/students/actions/students.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import AttendanceGrid from "@/domains/attendance/components/AttendanceGrid";
import { AttendanceFilters } from "@/domains/attendance/components/AttendanceFilters";
import { ClipboardCheck, Users, Calendar, BookOpen } from "lucide-react";

export default async function AttendancePage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ classId?: string, subjectId?: string, date?: string }> }) {
  const searchParams = await searchParamsPromise;
  const date = searchParams.date || new Date().toISOString().split('T')[0];
  const classId = searchParams.classId ? Number(searchParams.classId) : null;
  const subjectId = searchParams.subjectId ? Number(searchParams.subjectId) : null;

  // Parallelize initial data fetching
  const [classesRes, statsRes, currentUser] = await Promise.all([
    getClasses(),
    getAttendanceStats(date, classId, subjectId),
    getCurrentUser()
  ]);

  const canEdit = (currentUser as any)?.admin || (currentUser as any)?.role?.permissions?.some((p: any) => p.moduleName === "Attendance" && p.canEdit);

  const classes: any[] = ((classesRes as any).data?.data || (classesRes as any).data || []) as any[];
  const stats = (statsRes.data?.data || statsRes.data) as any;

  let students: any[] = [];
  let subjects: any[] = [];
  let initialRecords: any[] = [];

  if (classId) {
    // Parallelize class-specific data fetching
    const [subjectsRes, recordsRes] = await Promise.all([
      getSubjectsForClass(classId),
      getAttendanceRecords(classId, date, subjectId || undefined)
    ]);

    subjects = ((subjectsRes as any).data?.data || (subjectsRes as any).data || []) as any[];
    initialRecords = ((recordsRes as any).data?.data || (recordsRes as any).data || []) as any[];

    const selectedClass = classes.find(c => c.id === classId);
    if (selectedClass) {
      const studentsRes = await getStudentsByClass(selectedClass.className);
      students = ((studentsRes as any).data?.data || (studentsRes as any).data || []) as any[];
    }
  }

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Appel & Présence</h1>
          <p className="text-slate-500 mt-2 font-medium">Enregistrez la présence quotidienne des élèves</p>
        </div>
      </div>

      <AttendanceFilters 
        date={date} 
        classId={classId} 
        subjectId={subjectId} 
        classes={classes} 
        subjects={subjects} 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Presents", value: stats?.presents || 0, icon: Check, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Absents", value: stats?.absents || 0, icon: X, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Retards", value: stats?.lates || 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Excusés", value: stats?.excused || 0, icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${s.bg} ${s.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {classId ? (
        <AttendanceGrid 
          key={`${classId}-${subjectId}-${date}`}
          students={students} 
          classId={classId} 
          subjectId={subjectId || undefined} 
          date={date} 
          initialRecords={initialRecords}
          canEdit={canEdit}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <div className="p-6 bg-white rounded-full shadow-sm mb-4">
            <ClipboardCheck size={48} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-600">Prêt pour l'appel</h3>
          <p className="text-slate-400 font-medium">Veuillez sélectionner une classe pour commencer</p>
        </div>
      )}
    </div>
  );
}

const Check = ({ size, className }: any) => <ClipboardCheck size={size} className={className} />;
const X = ({ size, className }: any) => <Users size={size} className={className} />;
const Clock = ({ size, className }: any) => <Calendar size={size} className={className} />;
const Info = ({ size, className }: any) => <BookOpen size={size} className={className} />;
