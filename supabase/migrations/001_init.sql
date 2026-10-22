-- FocusUp initial schema (PRD §10)
-- Run in Supabase SQL Editor (or via supabase db push).
-- RLS: each row is only visible/writable by auth.uid().

create extension if not exists "pgcrypto";

-- Enums
create type public.plan_tier as enum ('standard', 'intense');
create type public.focus_status as enum ('active', 'paused', 'ended');
create type public.time_entry_source as enum ('timer', 'manual');
create type public.review_decision as enum ('continue', 'adjust', 'pause', 'end');

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users; Google identity lives in auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan public.plan_tier,
  review_weekday smallint check (review_weekday is null or (review_weekday >= 0 and review_weekday <= 6)),
  timezone text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'FocusUp user settings; Google id is auth.users id / identities';
comment on column public.profiles.review_weekday is '0=Sunday … 6=Saturday (JS convention)';
comment on column public.profiles.plan is 'standard=3 slots, intense=7 slots; null until onboarding';

-- ---------------------------------------------------------------------------
-- focuses
-- ---------------------------------------------------------------------------
create table public.focuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  why text not null check (char_length(trim(why)) > 0),
  status public.focus_status not null default 'active',
  last_used_at timestamptz,
  investment_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index focuses_user_id_idx on public.focuses (user_id);
create index focuses_user_status_idx on public.focuses (user_id, status);

-- ---------------------------------------------------------------------------
-- time_entries
-- ---------------------------------------------------------------------------
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  focus_id uuid not null references public.focuses (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source public.time_entry_source not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create index time_entries_focus_id_idx on public.time_entries (focus_id);
create index time_entries_user_id_idx on public.time_entries (user_id);
create index time_entries_start_at_idx on public.time_entries (start_at);

-- ---------------------------------------------------------------------------
-- outcomes
-- ---------------------------------------------------------------------------
create table public.outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  focus_id uuid not null references public.focuses (id) on delete cascade,
  time_entry_id uuid references public.time_entries (id) on delete set null,
  body_text text,
  number_value double precision,
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index outcomes_focus_id_idx on public.outcomes (focus_id);
create index outcomes_user_id_idx on public.outcomes (user_id);

-- ---------------------------------------------------------------------------
-- reviews (account-level weekly decision)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  range_start timestamptz not null,
  range_end timestamptz not null,
  merged boolean not null default false,
  decision public.review_decision not null,
  adjust_note text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (range_end > range_start)
);

create index reviews_user_id_idx on public.reviews (user_id);
create index reviews_user_range_idx on public.reviews (user_id, range_start);

-- ---------------------------------------------------------------------------
-- focus_week_snaps (per-focus weekly blurb/duration cache)
-- ---------------------------------------------------------------------------
create table public.focus_week_snaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  focus_id uuid not null references public.focuses (id) on delete cascade,
  range_start timestamptz not null,
  range_end timestamptz not null,
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  auto_blurb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (range_end > range_start),
  unique (focus_id, range_start, range_end)
);

create index focus_week_snaps_focus_id_idx on public.focus_week_snaps (focus_id);

-- ---------------------------------------------------------------------------
-- active_sessions (at most one open timer per user)
-- ---------------------------------------------------------------------------
create table public.active_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  focus_id uuid not null references public.focuses (id) on delete cascade,
  start_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index active_sessions_focus_id_idx on public.active_sessions (focus_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger focuses_set_updated_at
  before update on public.focuses
  for each row execute function public.set_updated_at();

create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();

create trigger outcomes_set_updated_at
  before update on public.outcomes
  for each row execute function public.set_updated_at();

create trigger focus_week_snaps_set_updated_at
  before update on public.focus_week_snaps
  for each row execute function public.set_updated_at();

create trigger active_sessions_set_updated_at
  before update on public.active_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.focuses enable row level security;
alter table public.time_entries enable row level security;
alter table public.outcomes enable row level security;
alter table public.reviews enable row level security;
alter table public.focus_week_snaps enable row level security;
alter table public.active_sessions enable row level security;

-- profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- focuses
create policy "focuses_select_own"
  on public.focuses for select
  using (auth.uid() = user_id);

create policy "focuses_insert_own"
  on public.focuses for insert
  with check (auth.uid() = user_id);

create policy "focuses_update_own"
  on public.focuses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- no delete policy: focuses are ended, not hard-deleted (PRD)

-- time_entries
create policy "time_entries_select_own"
  on public.time_entries for select
  using (auth.uid() = user_id);

create policy "time_entries_insert_own"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

create policy "time_entries_update_own"
  on public.time_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "time_entries_delete_own"
  on public.time_entries for delete
  using (auth.uid() = user_id);

-- outcomes
create policy "outcomes_select_own"
  on public.outcomes for select
  using (auth.uid() = user_id);

create policy "outcomes_insert_own"
  on public.outcomes for insert
  with check (auth.uid() = user_id);

create policy "outcomes_update_own"
  on public.outcomes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "outcomes_delete_own"
  on public.outcomes for delete
  using (auth.uid() = user_id);

-- reviews
create policy "reviews_select_own"
  on public.reviews for select
  using (auth.uid() = user_id);

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- focus_week_snaps
create policy "focus_week_snaps_select_own"
  on public.focus_week_snaps for select
  using (auth.uid() = user_id);

create policy "focus_week_snaps_insert_own"
  on public.focus_week_snaps for insert
  with check (auth.uid() = user_id);

create policy "focus_week_snaps_update_own"
  on public.focus_week_snaps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "focus_week_snaps_delete_own"
  on public.focus_week_snaps for delete
  using (auth.uid() = user_id);

-- active_sessions
create policy "active_sessions_select_own"
  on public.active_sessions for select
  using (auth.uid() = user_id);

create policy "active_sessions_insert_own"
  on public.active_sessions for insert
  with check (auth.uid() = user_id);

create policy "active_sessions_update_own"
  on public.active_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "active_sessions_delete_own"
  on public.active_sessions for delete
  using (auth.uid() = user_id);

-- Account deletion: delete auth.users (Cascade removes profile + all child rows).
-- App will call an authenticated delete-account path in a later task.
