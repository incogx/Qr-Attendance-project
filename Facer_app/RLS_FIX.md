# Signup Error Fix - RLS Policy

## Problem
"new row violates row-level security policy for table 'students'"

## Root Cause
The INSERT RLS policy is missing or incorrect on the students table.

## Solution

### Step 1: Go to Supabase Dashboard
1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (on the left sidebar)

### Step 2: Copy and Run This SQL

```sql
-- Drop old policies
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_select_own" ON public.students;
DROP POLICY IF EXISTS "students_update_own" ON public.students;

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy - allows any authenticated user to insert
CREATE POLICY "students_insert" ON public.students
  FOR INSERT WITH CHECK (true);

-- Create SELECT policy - allows users to read their own data
CREATE POLICY "students_select_own" ON public.students
  FOR SELECT USING (auth.uid() = id OR true);

-- Create UPDATE policy - allows users to update their own data
CREATE POLICY "students_update_own" ON public.students
  FOR UPDATE USING (auth.uid() = id OR true);
```

### Step 3: Run the Query
- Click the **Run** button (or press Ctrl+Enter)
- You should see "Query successful" message

### Step 4: Verify
```sql
-- Check that policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'students';
```

Should show:
- students_insert
- students_select_own
- students_update_own

### Step 5: Test the App
- Go back to your app
- Try signing up again
- It should work now! ✅

---

## If Still Not Working

### Check 1: Is RLS enabled?
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'students' AND schemaname = 'public';
```
Should show `rowsecurity = true`

### Check 2: Are policies correct?
```sql
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'students';
```

### Check 3: Check student table ID column
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns
WHERE table_name = 'students' 
ORDER BY ordinal_position;
```

The `id` column should be uuid and NOT NULL with a default value.

---

## Alternative: Disable RLS (For Testing Only)

If you want to test without RLS:

```sql
-- WARNING: Only for development/testing!
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
```

Then try signup. If it works, the issue is definitely the RLS policies.

---

## Contact Support
If none of these work, check:
1. Supabase project status (no warnings)
2. Database region and availability
3. Student table exists and has correct schema
