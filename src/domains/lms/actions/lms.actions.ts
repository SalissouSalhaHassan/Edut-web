"use server";

import { db } from "@/infrastructure/database";
import { 
  lmsCourses, lmsModules, lmsLessons, lmsResources, 
  lmsEnrollments, lmsProgress, lmsVirtualClasses, 
  lmsVirtualAttendance, lmsAssignments, lmsSubmissions, 
  lmsQuizzes, lmsQuestions, lmsAnswers, lmsDiscussions, 
  lmsCertificates 
} from "@/infrastructure/database/schema/lms";
import { eq, desc, and, sql, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { students } from "@/infrastructure/database/schema/students";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { getUserRoleType, getTeacherEmployee, getTeacherClassIds } from "@/domains/auth/services/rbac";

export async function initLmsDatabaseTables() {
  return protectedDbAction("LMS", "canView", async () => {
    // 1. Create tables if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_courses (
        id SERIAL PRIMARY KEY,
        course_code VARCHAR(50),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        class_id INTEGER,
        subject_id INTEGER,
        teacher_id INTEGER,
        status VARCHAR(20) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_lessons (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        module VARCHAR(255),
        module_id INTEGER,
        course_id INTEGER,
        class_id INTEGER,
        subject_id INTEGER,
        content TEXT,
        file_path TEXT,
        video_url TEXT,
        content_type VARCHAR(50) DEFAULT 'Text',
        duration INTEGER DEFAULT 15,
        display_order INTEGER DEFAULT 0,
        recorded_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Alter table for lms_lessons columns if they exist/don't exist
    const alterLessons = [
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS module_id INTEGER",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS course_id INTEGER",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'Text'",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 15",
      "ALTER TABLE lms_lessons ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0"
    ];
    for (const q of alterLessons) {
      try { await db.execute(sql.raw(q)); } catch(e){}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_resources (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER,
        title VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        file_path TEXT,
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_enrollments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        student_id INTEGER,
        status VARCHAR(20) DEFAULT 'Active',
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_progress (
        id SERIAL PRIMARY KEY,
        student_id INTEGER,
        lesson_id INTEGER,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        last_position INTEGER DEFAULT 0,
        personal_notes TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_virtual_classes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        class_id INTEGER,
        subject_id INTEGER,
        teacher_id INTEGER,
        session_date TIMESTAMP NOT NULL,
        duration INTEGER DEFAULT 45,
        meeting_url TEXT NOT NULL,
        meeting_password VARCHAR(50),
        status VARCHAR(20) DEFAULT 'À venir',
        platform VARCHAR(50) DEFAULT 'Google Meet',
        recording_url TEXT,
        recorded_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const alterVirtual = [
      "ALTER TABLE lms_virtual_classes ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'Google Meet'",
      "ALTER TABLE lms_virtual_classes ADD COLUMN IF NOT EXISTS recording_url TEXT",
      "ALTER TABLE lms_virtual_classes ADD COLUMN IF NOT EXISTS teacher_id INTEGER"
    ];
    for (const q of alterVirtual) {
      try { await db.execute(sql.raw(q)); } catch(e){}
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_virtual_attendance (
        id SERIAL PRIMARY KEY,
        virtual_class_id INTEGER,
        student_id INTEGER,
        status VARCHAR(20) DEFAULT 'Present',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_minutes INTEGER DEFAULT 0
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_assignments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        class_id INTEGER,
        subject_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_sujet_path TEXT,
        due_date TIMESTAMP NOT NULL,
        max_score DOUBLE PRECISION DEFAULT 20.0,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER,
        student_id INTEGER,
        file_reponse_path TEXT,
        score DOUBLE PRECISION,
        comment TEXT,
        is_graded BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_quizzes (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_min INTEGER DEFAULT 20,
        max_attempts INTEGER DEFAULT 1,
        passing_score DOUBLE PRECISION DEFAULT 10.0,
        status VARCHAR(20) DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'QCM',
        points DOUBLE PRECISION DEFAULT 2.0,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER,
        answer_text TEXT NOT NULL,
        is_correct BOOLEAN DEFAULT FALSE,
        explanation TEXT
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_discussions (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        lesson_id INTEGER,
        student_id INTEGER,
        employee_id INTEGER,
        message TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lms_certificates (
        id SERIAL PRIMARY KEY,
        course_id INTEGER,
        student_id INTEGER,
        issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        certificate_code VARCHAR(100) NOT NULL
      );
    `);

    return { success: true };
  });
}

// --- Courses ---
export async function getCourses() {
  return protectedDbAction("LMS", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    
    let whereClause = undefined;
    
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        whereClause = eq(lmsCourses.teacherId, emp.id);
      } else {
        whereClause = sql`FALSE`;
      }
    } else if (
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur")
    ) {
      if (user.studentId) {
        const std = await db.query.students.findFirst({
          where: eq(students.id, Number(user.studentId))
        });
        if (std?.classe) {
          const cls = await db.query.schoolClasses.findFirst({
            where: and(eq(schoolClasses.className, std.classe), eq(schoolClasses.schoolId, user.schoolId))
          });
          if (cls) {
            whereClause = eq(lmsCourses.classId, cls.id);
          } else {
            whereClause = sql`FALSE`;
          }
        } else {
          whereClause = sql`FALSE`;
        }
      } else {
        whereClause = sql`FALSE`;
      }
    }

    const data = await db.query.lmsCourses.findMany({
      where: whereClause,
      with: {
        class: true,
        subject: true,
        teacher: true,
        modules: {
          with: {
            lessons: true
          }
        },
        enrollments: true
      },
      orderBy: [desc(lmsCourses.createdAt)]
    });
    return { data };
  });
}

export async function saveCourse(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsCourses).set(data).where(eq(lmsCourses.id, id));
    } else {
      await db.insert(lmsCourses).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteCourse(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await db.delete(lmsCourses).where(eq(lmsCourses.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Modules & Lessons ---
export async function getModules(courseId: number) {
  return protectedDbAction("LMS", "canView", async () => {
    const data = await db.query.lmsModules.findMany({
      where: eq(lmsModules.courseId, courseId),
      with: {
        lessons: true
      },
      orderBy: [asc(lmsModules.displayOrder)]
    });
    return { data };
  });
}

export async function saveModule(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsModules).set(data).where(eq(lmsModules.id, id));
    } else {
      await db.insert(lmsModules).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteModule(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await db.delete(lmsModules).where(eq(lmsModules.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function getLmsLessons() {
  return protectedDbAction("LMS", "canView", async () => {
    const data = await db.query.lmsLessons.findMany({
      with: {
        class: true,
        subject: true,
        course: true,
        module: true
      },
      orderBy: [desc(lmsLessons.createdAt)]
    });
    return { data };
  });
}

export async function saveLmsLesson(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsLessons).set(data).where(eq(lmsLessons.id, id));
    } else {
      await db.insert(lmsLessons).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteLmsLesson(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await db.delete(lmsLessons).where(eq(lmsLessons.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Enrollments & Progress ---
export async function enrollStudent(courseId: number, studentId: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    const existing = await db.query.lmsEnrollments.findFirst({
      where: and(
        eq(lmsEnrollments.courseId, courseId),
        eq(lmsEnrollments.studentId, studentId)
      )
    });
    if (!existing) {
      await db.insert(lmsEnrollments).values({ courseId, studentId });
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function getStudentProgress(studentId: number, courseId: number) {
  return protectedDbAction("LMS", "canView", async () => {
    const course = await db.query.lmsCourses.findFirst({
      where: eq(lmsCourses.id, courseId),
      with: {
        lessons: true
      }
    });
    if (!course) return { progress: 0, completedLessons: [] };
    
    const progressList = await db.query.lmsProgress.findMany({
      where: eq(lmsProgress.studentId, studentId)
    });

    const completedLessonIds = progressList
      .filter(p => p.isCompleted)
      .map(p => p.lessonId);

    const totalLessons = course.lessons.length;
    const completedCount = course.lessons.filter(l => completedLessonIds.includes(l.id)).length;
    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return { progress, completedLessons: completedLessonIds, progressRecords: progressList };
  });
}

export async function updateLessonProgress(data: { studentId: number; lessonId: number; isCompleted: boolean; personalNotes?: string; lastPosition?: number }) {
  return protectedDbAction("LMS", "canEdit", async () => {
    const existing = await db.query.lmsProgress.findFirst({
      where: and(
        eq(lmsProgress.studentId, data.studentId),
        eq(lmsProgress.lessonId, data.lessonId)
      )
    });
    if (existing) {
      await db.update(lmsProgress).set({
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? new Date() : null,
        personalNotes: data.personalNotes ?? existing.personalNotes,
        lastPosition: data.lastPosition ?? existing.lastPosition
      }).where(eq(lmsProgress.id, existing.id));
    } else {
      await db.insert(lmsProgress).values({
        studentId: data.studentId,
        lessonId: data.lessonId,
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? new Date() : null,
        personalNotes: data.personalNotes ?? "",
        lastPosition: data.lastPosition ?? 0
      });
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Virtual Classes ---
export async function getLmsVirtualClasses() {
  return protectedDbAction("LMS", "canView", async () => {
    const data = await db.query.lmsVirtualClasses.findMany({
      with: {
        class: true,
        subject: true,
        teacher: true,
        attendance: true
      },
      orderBy: [desc(lmsVirtualClasses.sessionDate)]
    });
    return { data };
  });
}

export async function saveVirtualClass(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsVirtualClasses).set(data).where(eq(lmsVirtualClasses.id, id));
    } else {
      await db.insert(lmsVirtualClasses).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteVirtualClass(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await db.delete(lmsVirtualClasses).where(eq(lmsVirtualClasses.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Assignments & Submissions ---
export async function getAssignments() {
  return protectedDbAction("LMS", "canView", async (user) => {
    const roleType = await getUserRoleType(user);
    const roleNameLower = (user.role?.roleName || "").toLowerCase().trim();
    
    let whereClause = undefined;
    
    if (roleType === "teacher") {
      const emp = await getTeacherEmployee(user);
      if (emp) {
        const classIds = await getTeacherClassIds(emp.id);
        if (classIds.length > 0) {
          whereClause = inArray(lmsAssignments.classId, classIds);
        } else {
          whereClause = sql`FALSE`;
        }
      } else {
        whereClause = sql`FALSE`;
      }
    } else if (
      roleNameLower.includes("eleve") || 
      roleNameLower.includes("etudiant") || 
      roleNameLower.includes("student") || 
      roleNameLower.includes("parent") || 
      roleNameLower.includes("tuteur")
    ) {
      if (user.studentId) {
        const std = await db.query.students.findFirst({
          where: eq(students.id, Number(user.studentId))
        });
        if (std?.classe) {
          const cls = await db.query.schoolClasses.findFirst({
            where: and(eq(schoolClasses.className, std.classe), eq(schoolClasses.schoolId, user.schoolId))
          });
          if (cls) {
            whereClause = eq(lmsAssignments.classId, cls.id);
          } else {
            whereClause = sql`FALSE`;
          }
        } else {
          whereClause = sql`FALSE`;
        }
      } else {
        whereClause = sql`FALSE`;
      }
    }

    const data = await db.query.lmsAssignments.findMany({
      where: whereClause,
      with: {
        course: true,
        class: true,
        subject: true,
        submissions: {
          with: {
            student: true
          }
        }
      },
      orderBy: [desc(lmsAssignments.dueDate)]
    });
    return { data };
  });
}

export async function saveAssignment(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsAssignments).set(data).where(eq(lmsAssignments.id, id));
    } else {
      await db.insert(lmsAssignments).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteAssignment(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await db.delete(lmsAssignments).where(eq(lmsAssignments.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function saveSubmission(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    if (id) {
      await db.update(lmsSubmissions).set(data).where(eq(lmsSubmissions.id, id));
    } else {
      await db.insert(lmsSubmissions).values(data);
    }
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function gradeSubmission(submissionId: number, score: number, comment: string) {
  return protectedDbAction("LMS", "canEdit", async () => {
    await db.update(lmsSubmissions).set({
      score,
      comment,
      isGraded: true
    }).where(eq(lmsSubmissions.id, submissionId));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Quizzes ---
export async function getQuizzes() {
  return protectedDbAction("LMS", "canView", async () => {
    const data = await db.query.lmsQuizzes.findMany({
      with: {
        course: true,
        questions: {
          with: {
            answers: true
          }
        }
      },
      orderBy: [desc(lmsQuizzes.createdAt)]
    });
    return { data };
  });
}

export async function saveQuiz(data: any, id?: number) {
  return protectedDbAction("LMS", "canEdit", async () => {
    const { questions, ...quizData } = data;
    let quizId = id;
    if (id) {
      await db.update(lmsQuizzes).set(quizData).where(eq(lmsQuizzes.id, id));
    } else {
      const inserted = await db.insert(lmsQuizzes).values(quizData).returning({ id: lmsQuizzes.id });
      quizId = inserted[0].id;
    }

    if (questions && quizId) {
      // Simple sync: delete old questions and insert new ones
      await db.delete(lmsQuestions).where(eq(lmsQuestions.quizId, quizId));
      for (const q of questions) {
        const qInserted = await db.insert(lmsQuestions).values({
          quizId,
          questionText: q.questionText,
          questionType: q.questionType,
          points: q.points,
          displayOrder: q.displayOrder
        }).returning({ id: lmsQuestions.id });

        const qId = qInserted[0].id;
        if (q.answers && qId) {
          for (const ans of q.answers) {
            await db.insert(lmsAnswers).values({
              questionId: qId,
              answerText: ans.answerText,
              isCorrect: ans.isCorrect,
              explanation: ans.explanation
            });
          }
        }
      }
    }

    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

export async function deleteQuiz(id: number) {
  return protectedDbAction("LMS", "canDelete", async () => {
    await db.delete(lmsQuizzes).where(eq(lmsQuizzes.id, id));
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- Discussions ---
export async function getDiscussions(courseId: number, lessonId?: number) {
  return protectedDbAction("LMS", "canView", async () => {
    const conds = [eq(lmsDiscussions.courseId, courseId)];
    if (lessonId) conds.push(eq(lmsDiscussions.lessonId, lessonId));
    
    const data = await db.query.lmsDiscussions.findMany({
      where: and(...conds),
      with: {
        student: true,
        employee: true
      },
      orderBy: [asc(lmsDiscussions.createdAt)]
    });
    return { data };
  });
}

export async function postMessage(data: any) {
  return protectedDbAction("LMS", "canEdit", async () => {
    await db.insert(lmsDiscussions).values(data);
    revalidatePath("/dashboard/lms");
    return { success: true };
  });
}

// --- LMS Reports ---
export async function getLmsReportsData() {
  return protectedDbAction("LMS", "canView", async () => {
    const courses = await db.query.lmsCourses.findMany({
      with: {
        class: true,
        subject: true,
        teacher: true,
        lessons: true,
        enrollments: {
          with: {
            student: true
          }
        }
      }
    });

    const progress = await db.query.lmsProgress.findMany();
    const virtualClasses = await db.query.lmsVirtualClasses.findMany({
      with: {
        class: true,
        subject: true,
        attendance: true
      }
    });

    const assignments = await db.query.lmsAssignments.findMany({
      with: {
        class: true,
        subject: true,
        submissions: true
      }
    });

    return { courses, progress, virtualClasses, assignments };
  });
}
