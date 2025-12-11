-- Deploy as SQL function via Supabase dashboard
-- This creates the attendance-scan function directly in the database
-- Alternative to edge function deployment via CLI

-- Function to validate QR and mark attendance
create or replace function public.validate_qr_and_mark_attendance(
  p_qr_code text,
  p_reg_number text,
  p_class_no text,
  p_student_name text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_session record;
  v_student record;
  v_mark_id uuid;
begin
  -- Validate QR code and find session
  select id, class_no, status
  into v_session
  from attendance_sessions
  where qr_token = p_qr_code
    and status = 'ACTIVE'
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_session.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired QR code'
    );
  end if;

  -- Find or create student profile
  select id into v_student
  from student_profiles
  where register_no = p_reg_number;

  if v_student.id is null then
    insert into student_profiles(register_no, class_no, name)
    values (p_reg_number, p_class_no, nullif(p_student_name, ''))
    returning id into v_student;
  end if;

  -- Mark attendance
  insert into attendance_marks(
    session_id,
    class_no,
    student_id,
    register_no,
    student_name,
    status
  )
  values (
    v_session.id,
    p_class_no,
    v_student,
    p_reg_number,
    coalesce(nullif(p_student_name, ''), (
      select name from student_profiles where id = v_student
    )),
    'PRESENT'
  )
  on conflict (session_id, register_no) do update
    set status = 'PRESENT', marked_at = now()
  returning id into v_mark_id;

  return jsonb_build_object(
    'success', true,
    'result', jsonb_build_object(
      'session_id', v_session.id,
      'attendance_id', v_mark_id,
      'status', 'PRESENT'
    )
  );
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.validate_qr_and_mark_attendance(text, text, text, text)
  to authenticated, anon;
