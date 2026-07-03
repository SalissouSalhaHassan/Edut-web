import { 
  initLmsDatabaseTables, 
  getCourses, 
  getLmsLessons, 
  getLmsVirtualClasses, 
  getAssignments, 
  getQuizzes 
} from "@/domains/lms/actions/lms.actions";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { db } from "@/infrastructure/database";
import LmsDashboardClient from "./LmsDashboardClient";

export default async function LmsPage() {
  // 1. Ensure database tables exist
  await initLmsDatabaseTables();

  // 2. Fetch authenticated user context
  const currentUser = await getCurrentUser();

  // 3. Fetch all domain initial data
  const coursesRes = await getCourses();
  const lessonsRes = await getLmsLessons();
  const sessionsRes = await getLmsVirtualClasses();
  const assignmentsRes = await getAssignments();
  const quizzesRes = await getQuizzes();

  // 4. Fetch reference lists
  const classesRes = await getClasses(true);
  const subjectsRes = await getSubjects();
  const employeesRes = await getEmployees();
  const studentsRes = await getStudents();

  // 5. Unpack responses
  const courses = (coursesRes as any).data?.data || (coursesRes as any).data || [];
  const lessons = (lessonsRes as any).data?.data || (lessonsRes as any).data || [];
  const sessions = (sessionsRes as any).data?.data || (sessionsRes as any).data || [];
  const assignments = (assignmentsRes as any).data?.data || (assignmentsRes as any).data || [];
  const quizzes = (quizzesRes as any).data?.data || (quizzesRes as any).data || [];

  const schoolClasses = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const schoolSubjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const schoolEmployees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const schoolStudents = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];

  // 6. Direct queries for joins and progress logs
  const submissions = await db.query.lmsSubmissions.findMany();
  const progress = await db.query.lmsProgress.findMany();

  return (
    <LmsDashboardClient 
      currentUser={currentUser}
      initialCourses={courses}
      initialLessons={lessons}
      initialVirtualClasses={sessions}
      initialAssignments={assignments}
      initialSubmissions={submissions}
      initialQuizzes={quizzes}
      initialProgress={progress}
      classes={schoolClasses}
      subjects={schoolSubjects}
      employees={schoolEmployees}
      students={schoolStudents}
    />
  );
}
