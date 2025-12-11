-- ============================================================================
-- FIX RLS POLICIES FOR STUDENTS TABLE
-- Run this in Supabase SQL Editor to fix the signup error
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "students_select_own" ON public.students;
DROP POLICY IF EXISTS "students_update_own" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;

-- Create INSERT policy (THIS WAS MISSING - causes signup error)
CREATE POLICY "students_insert" ON public.students
  FOR INSERT WITH CHECK (true);

-- Create SELECT policy (allow users to read their own data)
CREATE POLICY "students_select_own" ON public.students
  FOR SELECT USING (auth.uid() = id);

-- Create UPDATE policy (allow users to update their own data)
CREATE POLICY "students_update_own" ON public.students
  FOR UPDATE USING (auth.uid() = id);
