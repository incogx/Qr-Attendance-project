-- ============================================================================
-- SUPABASE SCHEMA FIX FOR SMART ATTENDANCE SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add password column to students table (CRITICAL)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS password text NOT NULL DEFAULT '';

-- Step 2: Create proper sessions table FIRST (before attendance references it)
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  qr_payload text NOT NULL,
  session_date date DEFAULT CURRENT_DATE,
  start_time time,
  end_time time,
  expires_at timestamp with time zone,
  status text DEFAULT 'ACTIVE',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);

-- Step 3: Create proper attendance table (after sessions exists)
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid,
  session_id uuid,
  marked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);

-- Step 4: Update classes table to have required columns
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS code text,
ADD COLUMN IF NOT EXISTS instructor_name text;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_reg_number ON public.students(reg_number);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON public.attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_qr_payload ON public.sessions(qr_payload);

-- Step 6: Enable RLS (Row Level Security)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies for students table
DROP POLICY IF EXISTS "students_select_own" ON public.students;
DROP POLICY IF EXISTS "students_update_own" ON public.students;

CREATE POLICY "students_select_own" ON public.students
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "students_update_own" ON public.students
  FOR UPDATE USING (auth.uid() = id);

-- Step 8: Create RLS Policies for attendance table
DROP POLICY IF EXISTS "attendance_select_own" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert_own" ON public.attendance;

CREATE POLICY "attendance_select_own" ON public.attendance
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.students WHERE id = auth.uid())
  );

CREATE POLICY "attendance_insert_own" ON public.attendance
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- Step 9: Create RLS Policies for sessions table
DROP POLICY IF EXISTS "sessions_select_all" ON public.sessions;

CREATE POLICY "sessions_select_all" ON public.sessions
  FOR SELECT USING (true);

-- Step 10: Create RLS Policies for classes table
DROP POLICY IF EXISTS "classes_select_all" ON public.classes;

CREATE POLICY "classes_select_all" ON public.classes
  FOR SELECT USING (true);

-- ============================================================================
-- OPTIONAL: Remove unused tables (comment out if you're unsure)
-- ============================================================================
-- DROP TABLE IF EXISTS public.student_profiles CASCADE;
-- DROP TABLE IF EXISTS public.attendance_marks CASCADE;
-- DROP TABLE IF EXISTS public.attendance_sessions CASCADE;
-- DROP TABLE IF EXISTS public.attendance_approvals CASCADE;
-- DROP TABLE IF EXISTS public.attendance_audit CASCADE;
-- DROP TABLE IF EXISTS public.face_templates CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.moderation_queue CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify everything is correct)
-- ============================================================================

-- Check students table columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns
-- WHERE table_name = 'students' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Check that all required tables exist
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('students', 'attendance', 'sessions', 'classes');
