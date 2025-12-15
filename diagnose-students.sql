-- Diagnostic Query: Check why student names aren't showing
-- Run this in Supabase SQL Editor

-- 1. Check attendance_marks records
SELECT 
    am.id as attendance_id,
    am.student_id,
    am.marked_at,
    am.status
FROM attendance_marks am
ORDER BY am.marked_at DESC
LIMIT 10;

-- 2. Check if students exist for those IDs
SELECT 
    am.id as attendance_id,
    am.student_id,
    s.id as student_table_id,
    s.reg_number,
    s.name,
    s.email,
    s.class_no,
    s.class_id,
    CASE 
        WHEN s.id IS NULL THEN '❌ Student not in students table'
        WHEN s.name IS NULL THEN '⚠️ Student exists but name is NULL'
        ELSE '✅ Student data complete'
    END as status
FROM attendance_marks am
LEFT JOIN students s ON s.id = am.student_id
ORDER BY am.marked_at DESC
LIMIT 10;

-- 3. Check profiles table (students must be in auth.users)
SELECT 
    am.id as attendance_id,
    am.student_id,
    p.id as profile_id,
    p.full_name,
    p.email,
    p.role,
    CASE 
        WHEN p.id IS NULL THEN '❌ Not in profiles table'
        WHEN p.role != 'STUDENT' THEN '⚠️ Role is not STUDENT'
        ELSE '✅ Profile exists'
    END as profile_status
FROM attendance_marks am
LEFT JOIN profiles p ON p.id = am.student_id
ORDER BY am.marked_at DESC
LIMIT 10;

-- 4. Complete diagnostic
SELECT 
    am.id as attendance_id,
    am.student_id,
    am.marked_at,
    -- Student table
    s.reg_number,
    s.name as student_name,
    s.class_no,
    -- Profile table
    p.full_name as profile_name,
    p.email,
    p.role,
    -- Status
    CASE 
        WHEN s.id IS NULL AND p.id IS NULL THEN '🔴 Missing from both tables'
        WHEN s.id IS NULL THEN '🟡 Missing from students table'
        WHEN p.id IS NULL THEN '🟡 Missing from profiles table'
        WHEN s.name IS NULL THEN '🟠 Student exists but name is NULL'
        ELSE '🟢 All good'
    END as diagnostic
FROM attendance_marks am
LEFT JOIN students s ON s.id = am.student_id
LEFT JOIN profiles p ON p.id = am.student_id
ORDER BY am.marked_at DESC
LIMIT 10;

-- 5. Fix missing students (TEMPLATE - adjust values)
-- If student scanned but not in students table, add them:
/*
INSERT INTO students (id, reg_number, name, email, class_no)
VALUES 
    ('YOUR_STUDENT_ID_FROM_ABOVE', 'REG_NUMBER', 'Student Name', 'email@example.com', '353');
*/
