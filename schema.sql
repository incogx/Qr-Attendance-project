-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  comments text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT approvals_pkey PRIMARY KEY (id),
  CONSTRAINT approvals_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT approvals_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id),
  CONSTRAINT approvals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid,
  session_id uuid,
  marked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'PRESENT'::text CHECK (status = ANY (ARRAY['PRESENT'::text, 'ABSENT'::text])),
  CONSTRAINT attendance_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attendance_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  class_no text,
  faculty_id uuid,
  department text,
  name text,
  code text,
  instructor_name text,
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text UNIQUE,
  full_name text,
  role text,
  department text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  qr_payload text NOT NULL,
  session_date date DEFAULT CURRENT_DATE,
  start_time time without time zone,
  end_time time without time zone,
  expires_at timestamp with time zone,
  status text DEFAULT 'ACTIVE'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text UNIQUE,
  name text,
  reg_number text UNIQUE,
  roll_number text UNIQUE,
  phone text,
  department text,
  class_no text,
  section text,
  face_encoding text,
  created_at timestamp with time zone DEFAULT now(),
  password text DEFAULT ''::text,
  CONSTRAINT students_pkey PRIMARY KEY (id)
);