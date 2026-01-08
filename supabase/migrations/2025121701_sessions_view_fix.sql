-- Recreate sessions view with all columns including qr_rotation_seconds
CREATE OR REPLACE VIEW public.sessions AS
SELECT
  id,
  class_id,
  qr_payload,
  status,
  session_date,
  start_time,
  end_time,
  expires_at,
  created_by,
  created_at,
  qr_rotation_seconds,
  last_token_issued_at,
  last_token_expires_at
FROM public.attendance_sessions;
