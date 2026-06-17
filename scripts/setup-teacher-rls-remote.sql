-- 1. Create missing tables if they don't exist on the remote database
CREATE TABLE IF NOT EXISTS public.homework (
  id serial PRIMARY KEY,
  title varchar(255) NOT NULL,
  description text,
  class_id integer REFERENCES public.school_classes(id) ON DELETE CASCADE,
  subject_id integer REFERENCES public.school_subjects(id) ON DELETE CASCADE,
  date_assigned timestamp DEFAULT now(),
  date_due timestamp NOT NULL,
  attachment_path varchar(500),
  created_by varchar(255) DEFAULT 'Admin'
);

CREATE TABLE IF NOT EXISTS public.teacher_session_attendance (
  id serial PRIMARY KEY,
  school_id integer REFERENCES public.schools(id),
  employee_id integer REFERENCES public.employees(id) ON DELETE CASCADE,
  class_id integer REFERENCES public.school_classes(id) ON DELETE CASCADE,
  subject_id integer REFERENCES public.school_subjects(id) ON DELETE SET NULL,
  timetable_entry_id integer REFERENCES public.timetable_entries(id) ON DELETE SET NULL,
  date timestamp DEFAULT now(),
  period_number integer NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'Présent',
  scanned_at timestamp DEFAULT now(),
  scan_method varchar(50) DEFAULT 'QR_CODE',
  remarques text
);

-- 2. Helper function to get current user's school_id (Next.js config variable fallback to Auth claims)
CREATE OR REPLACE FUNCTION get_my_school_id()
RETURNS integer AS $$
  DECLARE
    sid_setting text;
    sid integer;
  BEGIN
    -- Try Next.js transaction local setting first
    sid_setting := current_setting('app.current_school_id', true);
    IF sid_setting IS NOT NULL AND sid_setting <> '' THEN
      RETURN sid_setting::integer;
    END IF;
    
    -- Fallback to Supabase Auth claims
    SELECT school_id INTO sid FROM public.users WHERE supabase_id = auth.uid()::text LIMIT 1;
    RETURN sid;
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Helper function to resolve teacher employee ID
CREATE OR REPLACE FUNCTION get_my_employee_id()
RETURNS integer AS $$
  DECLARE
    emp_id integer;
  BEGIN
    SELECT e.id INTO emp_id 
    FROM public.employees e
    JOIN public.users u ON e.email = u.utilisateur
    WHERE u.supabase_id = auth.uid()::text LIMIT 1;
    
    RETURN emp_id;
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Helper function to check if user is Admin or Directeur
CREATE OR REPLACE FUNCTION is_admin_or_director()
RETURNS boolean AS $$
  DECLARE
    res boolean;
  BEGIN
    SELECT COALESCE(u.admin OR u.super_admin OR r.role_name IN ('Directeur', 'Administrateur', 'Admin'), false)
    INTO res
    FROM public.users u
    LEFT JOIN public.roles r ON u.role_id = r.id
    WHERE u.supabase_id = auth.uid()::text LIMIT 1;
    
    RETURN COALESCE(res, false);
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Enable RLS on academic/attendance/grades/homework/schedule tables
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetable_entries ENABLE ROW LEVEL SECURITY;

-- 6. Define Policies for general tables (roles)
DROP POLICY IF EXISTS roles_select ON roles;
CREATE POLICY roles_select ON roles FOR SELECT USING (true);

-- 7. Define Policies for users
DROP POLICY IF EXISTS user_self_select ON users;
CREATE POLICY user_self_select ON users FOR SELECT USING (supabase_id = auth.uid()::text OR utilisateur = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS user_tenant_select ON users;
CREATE POLICY user_tenant_select ON users FOR SELECT USING (school_id = get_my_school_id());

DROP POLICY IF EXISTS user_tenant_write ON users;
CREATE POLICY user_tenant_write ON users FOR ALL USING (school_id = get_my_school_id() AND is_admin_or_director());

-- 8. Define Policies for employees
DROP POLICY IF EXISTS employee_self_select ON employees;
CREATE POLICY employee_self_select ON employees FOR SELECT USING (email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS employee_tenant_select ON employees;
CREATE POLICY employee_tenant_select ON employees FOR SELECT USING (school_id = get_my_school_id());

DROP POLICY IF EXISTS employee_tenant_write ON employees;
CREATE POLICY employee_tenant_write ON employees FOR ALL USING (school_id = get_my_school_id() AND is_admin_or_director());

-- 9. Define Policies for class_subjects (Teacher assignments)
DROP POLICY IF EXISTS class_subjects_select ON class_subjects;
CREATE POLICY class_subjects_select ON class_subjects FOR SELECT USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR employee_id = get_my_employee_id()
  )
);

DROP POLICY IF EXISTS class_subjects_write ON class_subjects;
CREATE POLICY class_subjects_write ON class_subjects FOR ALL USING (
  school_id = get_my_school_id() AND is_admin_or_director()
);

-- 10. Define Policies for school_classes
DROP POLICY IF EXISTS school_classes_select ON school_classes;
CREATE POLICY school_classes_select ON school_classes FOR SELECT USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

DROP POLICY IF EXISTS school_classes_write ON school_classes;
CREATE POLICY school_classes_write ON school_classes FOR ALL USING (
  school_id = get_my_school_id() AND is_admin_or_director()
);

-- 11. Define Policies for school_subjects
DROP POLICY IF EXISTS school_subjects_select ON school_subjects;
CREATE POLICY school_subjects_select ON school_subjects FOR SELECT USING (
  school_id = get_my_school_id()
);

DROP POLICY IF EXISTS school_subjects_write ON school_subjects;
CREATE POLICY school_subjects_write ON school_subjects FOR ALL USING (
  school_id = get_my_school_id() AND is_admin_or_director()
);

-- 12. Define Policies for students
DROP POLICY IF EXISTS students_select ON students;
CREATE POLICY students_select ON students FOR SELECT USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR classe IN (
      SELECT c.class_name FROM school_classes c 
      JOIN class_subjects cs ON c.id = cs.class_id
      WHERE cs.employee_id = get_my_employee_id()
    )
  )
);

DROP POLICY IF EXISTS students_write ON students;
CREATE POLICY students_write ON students FOR ALL USING (
  school_id = get_my_school_id() AND is_admin_or_director()
);

-- 13. Define Policies for student_attendance (Appel & Présence)
DROP POLICY IF EXISTS student_attendance_select ON student_attendance;
CREATE POLICY student_attendance_select ON student_attendance FOR SELECT USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

DROP POLICY IF EXISTS student_attendance_write ON student_attendance;
CREATE POLICY student_attendance_write ON student_attendance FOR ALL USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

-- 14. Define Policies for teacher_session_attendance
DROP POLICY IF EXISTS teacher_session_attendance_select ON teacher_session_attendance;
CREATE POLICY teacher_session_attendance_select ON teacher_session_attendance FOR SELECT USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR employee_id = get_my_employee_id()
  )
);

DROP POLICY IF EXISTS teacher_session_attendance_write ON teacher_session_attendance;
CREATE POLICY teacher_session_attendance_write ON teacher_session_attendance FOR ALL USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR employee_id = get_my_employee_id()
  )
);

-- 15. Define Policies for exams
DROP POLICY IF EXISTS exams_select ON exams;
CREATE POLICY exams_select ON exams FOR SELECT USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

DROP POLICY IF EXISTS exams_write ON exams;
CREATE POLICY exams_write ON exams FOR ALL USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

-- 16. Define Policies for exam_results
DROP POLICY IF EXISTS exam_results_select ON exam_results;
CREATE POLICY exam_results_select ON exam_results FOR SELECT USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR exam_id IN (
      SELECT id FROM exams WHERE class_id IN (
        SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
      )
    )
  )
);

DROP POLICY IF EXISTS exam_results_write ON exam_results;
CREATE POLICY exam_results_write ON exam_results FOR ALL USING (
  school_id = get_my_school_id() AND (
    is_admin_or_director() OR exam_id IN (
      SELECT id FROM exams WHERE class_id IN (
        SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
      )
    )
  )
);

-- 17. Define Policies for student_results (Saisie des Notes)
DROP POLICY IF EXISTS student_results_select ON student_results;
CREATE POLICY student_results_select ON student_results FOR SELECT USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

DROP POLICY IF EXISTS student_results_write ON student_results;
CREATE POLICY student_results_write ON student_results FOR ALL USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

-- 18. Define Policies for homework (Devoirs & DS)
DROP POLICY IF EXISTS homework_select ON homework;
CREATE POLICY homework_select ON homework FOR SELECT USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

DROP POLICY IF EXISTS homework_write ON homework;
CREATE POLICY homework_write ON homework FOR ALL USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND (
    is_admin_or_director() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

-- 19. Define Policies for timetable_entries (Emploi du Temps)
DROP POLICY IF EXISTS timetable_entries_select ON timetable_entries;
CREATE POLICY timetable_entries_select ON timetable_entries FOR SELECT USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND (
    is_admin_or_director() OR employee_id = get_my_employee_id() OR class_id IN (
      SELECT class_id FROM class_subjects WHERE employee_id = get_my_employee_id()
    )
  )
);

DROP POLICY IF EXISTS timetable_entries_write ON timetable_entries;
CREATE POLICY timetable_entries_write ON timetable_entries FOR ALL USING (
  (SELECT school_id FROM school_classes WHERE id = class_id) = get_my_school_id() AND is_admin_or_director()
);
