-- Sample Data Setup for Sathyabama Smart Attendance
-- Run these queries in Supabase SQL Editor to create demo data

-- Note: First create a test user in Supabase Auth Dashboard
-- Email: student@sathyabama.ac.in
-- Password: password123
-- Then get the user ID from auth.users table and replace 'YOUR_USER_ID' below

-- Insert sample student (replace YOUR_USER_ID with actual auth user ID)
-- Note: reg_number and roll_number should both be set
-- INSERT INTO students (id, email, name, roll_number, reg_number)
-- VALUES (
--   'YOUR_USER_ID',
--   'student@sathyabama.ac.in',
--   'Rahul Kumar',
--   'CSE2021001',
--   '43612072'
-- );

-- Insert sample classes
INSERT INTO classes (name, code, instructor_name) VALUES
('Data Structures and Algorithms', 'CSE301', 'Dr. Priya Sharma'),
('Database Management Systems', 'CSE302', 'Prof. Rajesh Kumar'),
('Web Technologies', 'CSE303', 'Dr. Anjali Patel'),
('Operating Systems', 'CSE304', 'Prof. Suresh Reddy')
ON CONFLICT (code) DO NOTHING;

-- Insert sample sessions with QR codes
INSERT INTO sessions (class_id, qr_payload, session_date, start_time, end_time, expires_at, status)
SELECT
  c.id,
  'QR_' || c.code || '_' || CURRENT_DATE || '_' || generate_series,
  CURRENT_DATE,
  '09:00:00'::time + (generate_series * interval '1 hour'),
  '10:00:00'::time + (generate_series * interval '1 hour'),
  NOW() + interval '2 hours',
  'active'
FROM classes c
CROSS JOIN generate_series(1, 3)
ON CONFLICT (qr_payload) DO NOTHING;

-- Query to view QR codes for testing
SELECT
  s.qr_payload,
  c.name as class_name,
  c.code as class_code,
  s.session_date,
  s.start_time,
  s.end_time,
  s.expires_at
FROM sessions s
JOIN classes c ON s.class_id = c.id
WHERE s.status = 'active' AND s.expires_at > NOW()
ORDER BY s.session_date DESC, s.start_time DESC;
