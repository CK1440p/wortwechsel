-- One row per account: the whole Wortwechsel state as JSON.
-- `version` is raised by the database on every update, so a device can detect that another device saved first.
create table if not exists public.user_data (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint user_data_size check (pg_column_size(data) < 5000000)
);

alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
drop policy if exists "user_data_insert_own" on public.user_data;
drop policy if exists "user_data_update_own" on public.user_data;
drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_select_own" on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data_insert_own" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data_update_own" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_data_delete_own" on public.user_data for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_data from anon;
revoke all on public.user_data from public;
grant select, insert, update, delete on public.user_data to authenticated;

create or replace function public.user_data_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.user_data_touch() from public, anon, authenticated;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before update on public.user_data
for each row execute function public.user_data_touch();
