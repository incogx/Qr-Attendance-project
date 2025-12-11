-- Core tables for attendance system
-- This migration ensures all base tables exist with proper structure

-- Students table
create table if not exists public.students (
  id uuid not null default gen_random_uuid(),
  email text null,
  name text null,
  reg_number text null,
  roll_number text null,
  phone text null,
  department text null,
  class_no text null,
  section text null,
  face_encoding text null,
  created_at timestamp with time zone null default now(),
  password text null default ''::text,
  constraint students_pkey primary key (id),
  constraint students_email_key unique (email),
  constraint students_reg_number_key unique (reg_number),
  constraint students_roll_number_key unique (roll_number)
);

create index if not exists idx_students_reg_number on public.students using btree (reg_number);
create index if not exists idx_students_email on public.students using btree (email);

-- Classes table
create table if not exists public.classes (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  class_no text null,
  faculty_id uuid null,
  department text null,
  name text null,
  code text null,
  instructor_name text null,
  constraint classes_pkey primary key (id)
);

create index if not exists idx_classes_class_no on public.classes using btree (class_no);

-- Sessions table
create table if not exists public.sessions (
  id uuid not null default gen_random_uuid(),
  class_id uuid null,
  qr_payload text not null,
  session_date date null default current_date,
  start_time time without time zone null,
  end_time time without time zone null,
  expires_at timestamp with time zone null,
  status text null default 'ACTIVE'::text,
  created_at timestamp with time zone null default now(),
  constraint sessions_pkey primary key (id),
  constraint sessions_qr_payload_unique unique (qr_payload),
  constraint sessions_class_id_fkey foreign key (class_id) references classes (id) on delete cascade
);

create index if not exists idx_sessions_qr_payload on public.sessions using btree (qr_payload);
create index if not exists idx_sessions_status on public.sessions using btree (status);

-- Attendance table
create table if not exists public.attendance (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  class_id uuid null,
  session_id uuid null,
  marked_at timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  constraint attendance_pkey primary key (id),
  constraint attendance_class_id_fkey foreign key (class_id) references classes (id) on delete set null,
  constraint attendance_session_id_fkey foreign key (session_id) references sessions (id) on delete cascade,
  constraint attendance_student_id_fkey foreign key (student_id) references students (id) on delete cascade
);

create index if not exists idx_attendance_student_id on public.attendance using btree (student_id);
create index if not exists idx_attendance_session_id on public.attendance using btree (session_id);
create index if not exists idx_attendance_marked_at on public.attendance using btree (marked_at);

-- Enable RLS on all tables
alter table students enable row level security;
alter table classes enable row level security;
alter table sessions enable row level security;
alter table attendance enable row level security;

-- RLS Policies for students
create policy "Students can view own profile"
  on students for select
  to authenticated
  using (auth.uid() = id);

create policy "Students can update own profile"
  on students for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- RLS Policies for classes
create policy "Students can view all classes"
  on classes for select
  to authenticated
  using (true);

-- RLS Policies for sessions
create policy "Students can view active sessions"
  on sessions for select
  to authenticated
  using (status = 'ACTIVE' and (expires_at is null or expires_at > now()));

-- RLS Policies for attendance
create policy "Students can view own attendance"
  on attendance for select
  to authenticated
  using (student_id = auth.uid());

create policy "Students can mark own attendance"
  on attendance for insert
  to authenticated
  with check (student_id = auth.uid());
