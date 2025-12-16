-- Fix recursive RLS policy causing 42P17 errors on profiles
-- Drops old policy, creates a SECURITY DEFINER helper, and adds safe HOD policy.

begin;

-- Drop the problematic policy if present
drop policy if exists "hod_select_faculty" on public.profiles;

-- Helper: get current user's department without triggering RLS recursion
create or replace function public.current_user_department()
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select department from public.profiles where id = auth.uid();
$$;

-- Ensure authenticated role can call it
grant execute on function public.current_user_department() to authenticated;

-- Safe policy: HODs can select FACULTY rows in their department
create policy "hod_select_faculty" on public.profiles
as permissive
for select
to authenticated
using (
  -- Allow selecting faculty rows where row.department == current user's department
  role = 'FACULTY'
  and coalesce(trim(department),'') = coalesce(trim(public.current_user_department()),'')
);

-- Optional: allow each user to select their own profile (if not already defined)
create policy if not exists "self_select_profile" on public.profiles
as permissive
for select
to authenticated
using ( id = auth.uid() );

commit;