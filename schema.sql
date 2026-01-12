-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid,
  submitted_by uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  status text DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'APPROVED'::text, 'REJECTED'::text])),
  comments text,
  CONSTRAINT approvals_pkey PRIMARY KEY (id),
  CONSTRAINT approvals_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT approvals_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.profiles(id),
  CONSTRAINT approvals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.attendance_marks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  class_id uuid,
  session_id uuid,
  status text DEFAULT 'PRESENT'::text CHECK (status = ANY (ARRAY['PRESENT'::text, 'ABSENT'::text])),
  marked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_marks_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_marks_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attendance_marks_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT attendance_marks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);
CREATE TABLE public.class_faculty (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid,
  faculty_id uuid,
  CONSTRAINT class_faculty_pkey PRIMARY KEY (id),
  CONSTRAINT class_faculty_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_faculty_faculty_id_fkey FOREIGN KEY (faculty_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.classes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_no text NOT NULL UNIQUE,
  department text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT classes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  read boolean DEFAULT false,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  email text UNIQUE,
  role text CHECK (role = ANY (ARRAY['ADMIN'::text, 'HOD'::text, 'FACULTY'::text, 'STUDENT'::text])),
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
  status text DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUBMITTED'::text, 'APPROVED'::text, 'REJECTED'::text])),
  session_date date DEFAULT CURRENT_DATE,
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  expires_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reg_number text NOT NULL UNIQUE,
  name text,
  email text,
  phone text,
  department text,
  class_no text,
  class_id uuid,
  section text,
  created_at timestamp with time zone DEFAULT now(),
  roll_number text,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT students_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_signup_enabled boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);

-- QR Token Management Tables
-- Added for secure, time-limited QR code attendance marking

CREATE TABLE public.qr_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  token_hash text NOT NULL,
  issued_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  used_by uuid,
  CONSTRAINT qr_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT qr_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
  CONSTRAINT qr_tokens_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.profiles(id)
);

CREATE INDEX idx_qr_tokens_session_id ON public.qr_tokens(session_id);
CREATE INDEX idx_qr_tokens_token_hash ON public.qr_tokens(token_hash);
CREATE INDEX idx_qr_tokens_expires_at ON public.qr_tokens(expires_at);

CREATE TABLE public.scan_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  session_id uuid NOT NULL,
  token_hash text,
  scanned_at timestamp with time zone DEFAULT now(),
  success boolean NOT NULL,
  error_message text,
  device_info jsonb,
  CONSTRAINT scan_logs_pkey PRIMARY KEY (id),
  CONSTRAINT scan_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT scan_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);

CREATE INDEX idx_scan_logs_student_id ON public.scan_logs(student_id);
CREATE INDEX idx_scan_logs_session_id ON public.scan_logs(session_id);
CREATE INDEX idx_scan_logs_scanned_at ON public.scan_logs(scanned_at);

-- QR Token Configuration
-- Token TTL: 15 seconds (configured in generate-qr-token edge function)
-- Grace Period: 3 seconds (configured in validate-qr-scan edge function)
-- Total Safe Window: 18 seconds
-- QR Visual Rotation: 5 seconds (configurable via sessions.qr_rotation_seconds)