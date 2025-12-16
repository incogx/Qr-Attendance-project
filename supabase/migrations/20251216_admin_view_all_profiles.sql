-- Allow admins to view all profiles
-- This fixes the dashboard showing only 1 user

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "admin_view_all_profiles" ON profiles;

-- Create policy allowing admins to view all profiles
CREATE POLICY "admin_view_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'
  )
);

-- Note: This works because admins can first read their own profile (via self_select_profile policy)
-- Then this policy allows them to read ALL profiles
