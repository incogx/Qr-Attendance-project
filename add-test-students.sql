-- Add test students to class 353
-- Run this in your Supabase SQL Editor

-- First, check if students already exist
SELECT COUNT(*) as student_count FROM students WHERE class_no = '353';

-- If no students exist, uncomment and run this:
/*
-- Insert 5 test students for class 353
INSERT INTO students (id, reg_number, name, email, class_no, department)
VALUES 
  (gen_random_uuid(), '353001', 'Test Student 1', 'student1@test.com', '353', 'CSE'),
  (gen_random_uuid(), '353002', 'Test Student 2', 'student2@test.com', '353', 'CSE'),
  (gen_random_uuid(), '353003', 'Test Student 3', 'student3@test.com', '353', 'CSE'),
  (gen_random_uuid(), '353004', 'Test Student 4', 'student4@test.com', '353', 'CSE'),
  (gen_random_uuid(), '353005', 'Test Student 5', 'student5@test.com', '353', 'CSE');

-- Verify
SELECT reg_number, name, class_no FROM students WHERE class_no = '353';
*/
