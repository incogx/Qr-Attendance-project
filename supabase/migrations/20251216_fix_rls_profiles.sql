-- Fix recursive RLS policy causing 42P17 errors on profiles
-- Drops old policy, creates a SECURITY DEFINER helper, and adds safe HOD policy.

begin;

drop policy if exists "hod_select_faculty" on public.profiles;

create or replace function public.current_user_department()
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select department from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_department() to authenticated;

create policy "hod_select_faculty" on public.profiles
as permissive
for select
to authenticated
using (
  role = 'FACULTY'
  and coalesce(trim(department),'') = coalesce(trim(public.current_user_department()),'')
);

drop policy if exists "self_select_profile" on public.profiles;
create policy "self_select_profile" on public.profiles
as permissive
for select
to authenticated
using ( id = auth.uid() );

commit;