-- Secure QR attendance hardening migration
-- This migration is idempotent where possible to allow re-runs in dev.

-- 1) Rename base session table to attendance_sessions for clarity and create a backward-compatible view.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sessions'
      AND table_type = 'BASE TABLE'
  ) THEN
    -- Only rename if a real table (not already a view)
    EXECUTE 'ALTER TABLE public.sessions RENAME TO attendance_sessions';
  END IF;
EXCEPTION WHEN duplicate_table THEN
  -- ignore if already renamed
  NULL;
END $$;

-- Ensure view sessions exists for backward compatibility
CREATE OR REPLACE VIEW public.sessions AS
SELECT * FROM public.attendance_sessions;

-- 2) Harden attendance_sessions table
ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS qr_rotation_seconds integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS last_token_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_token_expires_at timestamptz;

-- 3) QR token registry (hash-only, no raw tokens stored)
CREATE TABLE IF NOT EXISTS public.qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  nonce text NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid REFERENCES public.students(id),
  ip_address inet,
  device_fingerprint text,
  status text NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED','USED','EXPIRED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qr_tokens_session_idx ON public.qr_tokens(session_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS qr_tokens_status_idx ON public.qr_tokens(status, expires_at DESC);

-- 4) Scan audit log
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id),
  token_hash text,
  status text NOT NULL CHECK (status IN ('SUCCESS','REJECTED')),
  reason text,
  ip_address inet,
  device_fingerprint text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_logs_session_idx ON public.scan_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scan_logs_student_idx ON public.scan_logs(student_id, created_at DESC);

-- 5) Attendance marks: enforce one per session + link to token
ALTER TABLE public.attendance_marks
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'QR' CHECK (source IN ('QR','MANUAL','ADMIN')),
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_marks_student_session_unique'
  ) THEN
    ALTER TABLE public.attendance_marks
      ADD CONSTRAINT attendance_marks_student_session_unique UNIQUE (student_id, session_id);
  END IF;
END $$;

-- 6) RLS: Attendance sessions
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance_sessions' AND policyname='attendance_sessions_faculty_read'
  ) THEN
    CREATE POLICY attendance_sessions_faculty_read ON public.attendance_sessions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('FACULTY','HOD','ADMIN')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance_sessions' AND policyname='attendance_sessions_student_read'
  ) THEN
    CREATE POLICY attendance_sessions_student_read ON public.attendance_sessions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = auth.uid()
            AND s.class_id = attendance_sessions.class_id
        )
      );
  END IF;
END $$;

-- 7) RLS: QR tokens (only service role allowed)
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_tokens FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qr_tokens' AND policyname='qr_tokens_service_all'
  ) THEN
    CREATE POLICY qr_tokens_service_all ON public.qr_tokens
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 8) RLS: Scan logs
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='scan_logs' AND policyname='scan_logs_service_all'
  ) THEN
    CREATE POLICY scan_logs_service_all ON public.scan_logs
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='scan_logs' AND policyname='scan_logs_faculty_read'
  ) THEN
    CREATE POLICY scan_logs_faculty_read ON public.scan_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.class_faculty cf
          JOIN public.attendance_sessions s ON s.class_id = cf.class_id
          WHERE cf.faculty_id = auth.uid()
            AND s.id = scan_logs.session_id
        ) OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('HOD','ADMIN')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='scan_logs' AND policyname='scan_logs_student_read'
  ) THEN
    CREATE POLICY scan_logs_student_read ON public.scan_logs
      FOR SELECT USING (scan_logs.student_id = auth.uid());
  END IF;
END $$;

-- 9) RLS: Attendance marks (students insert their own; faculty/HOD/Admin read)
ALTER TABLE public.attendance_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_marks FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance_marks' AND policyname='attendance_marks_student_insert'
  ) THEN
    CREATE POLICY attendance_marks_student_insert ON public.attendance_marks
      FOR INSERT
      WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.attendance_sessions s
          WHERE s.id = attendance_marks.session_id
            AND s.status = 'ACTIVE'
            AND s.expires_at > now()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance_marks' AND policyname='attendance_marks_student_read'
  ) THEN
    CREATE POLICY attendance_marks_student_read ON public.attendance_marks
      FOR SELECT USING (student_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance_marks' AND policyname='attendance_marks_faculty_read'
  ) THEN
    CREATE POLICY attendance_marks_faculty_read ON public.attendance_marks
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.class_faculty cf
          WHERE cf.faculty_id = auth.uid()
            AND cf.class_id = attendance_marks.class_id
        ) OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('HOD','ADMIN')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance_marks' AND policyname='attendance_marks_service_all'
  ) THEN
    CREATE POLICY attendance_marks_service_all ON public.attendance_marks
      FOR ALL USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- 10) RLS: sessions view inherits policies from attendance_sessions (updatable view)
-- No extra action needed.

-- 11) Harden approvals foreign key to renamed table (no-op if already updated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'approvals_session_id_fkey'
  ) THEN
    ALTER TABLE public.approvals
      DROP CONSTRAINT approvals_session_id_fkey,
      ADD CONSTRAINT approvals_session_id_fkey FOREIGN KEY (session_id)
      REFERENCES public.attendance_sessions(id);
  END IF;
END $$;

-- 12) Comments for auditors
COMMENT ON TABLE public.qr_tokens IS 'Short-lived QR token registry. Stores only hashes and metadata for replay/abuse detection.';
COMMENT ON TABLE public.scan_logs IS 'Immutable audit of scan attempts (success and rejected).';
COMMENT ON COLUMN public.attendance_marks.token_hash IS 'Hash of QR token used for this mark when source=QR.';
COMMENT ON COLUMN public.attendance_sessions.qr_rotation_seconds IS 'Client rotation cadence enforced by backend.';
