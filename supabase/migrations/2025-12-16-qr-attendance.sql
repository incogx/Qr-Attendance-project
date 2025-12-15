-- QR Attendance hardening: constraints, indexes, and RLS policies
-- Safe to run multiple times (IF NOT EXISTS used where possible)

-- 1) Constraints & Indexes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'attendance_unique_student_session'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX attendance_unique_student_session
             ON public.attendance_marks (student_id, session_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'attendance_marks_session_id_idx'
  ) THEN
    EXECUTE 'CREATE INDEX attendance_marks_session_id_idx
             ON public.attendance_marks (session_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'sessions_qr_payload_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX sessions_qr_payload_key
             ON public.sessions (qr_payload)';
  END IF;
END $$;

-- 2) Enable RLS on core tables
ALTER TABLE public.attendance_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Helper: role() from profiles for current user
-- Create a stable function to read current user's role from profiles
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4) Policies: profiles (minimal read for self)
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- 5) Policies: students
-- Students can read only their own student row
DROP POLICY IF EXISTS students_self_select ON public.students;
CREATE POLICY students_self_select ON public.students
FOR SELECT
USING (id = auth.uid());

-- Faculty/HOD/Admin can read students for classes they teach/oversee
-- Using class_faculty mapping (faculty) or broad access for ADMIN/HOD if desired
DROP POLICY IF EXISTS students_faculty_read ON public.students;
CREATE POLICY students_faculty_read ON public.students
FOR SELECT
USING (
  public.current_app_role() IN ('ADMIN','HOD')
  OR EXISTS (
    SELECT 1 FROM public.class_faculty cf
    WHERE cf.class_id = students.class_id
      AND cf.faculty_id = auth.uid()
  )
);

-- 6) Policies: sessions
-- Faculty/HOD/Admin can read sessions for classes they own/oversee
DROP POLICY IF EXISTS sessions_read_policy ON public.sessions;
CREATE POLICY sessions_read_policy ON public.sessions
FOR SELECT
USING (
  public.current_app_role() IN ('ADMIN','HOD')
  OR EXISTS (
    SELECT 1 FROM public.class_faculty cf
    WHERE cf.class_id = sessions.class_id
      AND cf.faculty_id = auth.uid()
  )
  OR sessions.created_by = auth.uid()
);

-- No direct insert/update/delete via client for sessions (handled by Edge Functions)
DROP POLICY IF EXISTS sessions_block_writes ON public.sessions;
CREATE POLICY sessions_block_writes ON public.sessions
AS RESTRICTIVE
FOR ALL
TO public
USING (true)
WITH CHECK (false);

-- 7) Policies: attendance_marks
-- Students: can insert only their own attendance for active, non-expired session of their class
DROP POLICY IF EXISTS attendance_student_insert ON public.attendance_marks;
CREATE POLICY attendance_student_insert ON public.attendance_marks
FOR INSERT
TO public
WITH CHECK (
  student_id = auth.uid()
  AND status = 'PRESENT'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = attendance_marks.session_id
      AND s.status = 'ACTIVE'
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.class_id = (
        SELECT st.class_id FROM public.students st WHERE st.id = auth.uid()
      )
  )
);

-- Students: can read only their own marks
DROP POLICY IF EXISTS attendance_student_select ON public.attendance_marks;
CREATE POLICY attendance_student_select ON public.attendance_marks
FOR SELECT
TO public
USING (student_id = auth.uid());

-- Faculty/HOD/Admin: can read marks for sessions in their classes
DROP POLICY IF EXISTS attendance_faculty_select ON public.attendance_marks;
CREATE POLICY attendance_faculty_select ON public.attendance_marks
FOR SELECT
TO public
USING (
  public.current_app_role() IN ('ADMIN','HOD')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.class_faculty cf ON cf.class_id = s.class_id
    WHERE s.id = attendance_marks.session_id
      AND cf.faculty_id = auth.uid()
  )
);

-- Block all updates/deletes by default; only service-role functions should modify
DROP POLICY IF EXISTS attendance_block_updates ON public.attendance_marks;
CREATE POLICY attendance_block_updates ON public.attendance_marks
AS RESTRICTIVE
FOR UPDATE
TO public
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS attendance_block_deletes ON public.attendance_marks;
CREATE POLICY attendance_block_deletes ON public.attendance_marks
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);

-- 8) Policies: classes (read-only for faculty/HOD/Admin)
DROP POLICY IF EXISTS classes_read_policy ON public.classes;
CREATE POLICY classes_read_policy ON public.classes
FOR SELECT
USING (
  public.current_app_role() IN ('ADMIN','HOD')
  OR EXISTS (
    SELECT 1 FROM public.class_faculty cf
    WHERE cf.class_id = classes.id AND cf.faculty_id = auth.uid()
  )
);

-- 9) Policies: class_faculty (allow faculty read their mappings)
DROP POLICY IF EXISTS class_faculty_select ON public.class_faculty;
CREATE POLICY class_faculty_select ON public.class_faculty
FOR SELECT
USING (faculty_id = auth.uid() OR public.current_app_role() IN ('ADMIN','HOD'));

-- 10) Approvals - readable by HOD/Admin and session creator faculty
DROP POLICY IF EXISTS approvals_read_policy ON public.approvals;
CREATE POLICY approvals_read_policy ON public.approvals
FOR SELECT
USING (
  public.current_app_role() IN ('ADMIN','HOD')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = approvals.session_id AND s.created_by = auth.uid()
  )
);
