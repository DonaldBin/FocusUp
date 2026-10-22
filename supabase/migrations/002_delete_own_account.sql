-- Task 10.3: allow the signed-in user to delete their auth.users row.
-- Cascade from auth.users → profiles → focuses / time_entries / outcomes /
-- reviews / focus_week_snaps / active_sessions removes all app data.
-- Run in Supabase SQL Editor if not applied via CLI.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Permanently deletes the calling user; cascades wipe FocusUp data';
