-- FitPAL backend schema for Supabase project njowabhlydrzezleahwx.
-- Run this in the Supabase SQL editor or through the Supabase CLI after linking the project.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('student', 'admin');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.app_role not null default 'student',
  avatar_url text,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  goal text check (
    goal is null
    or goal in ('build_muscle', 'lose_weight', 'improve_endurance', 'build_strength')
  ),
  equipment text[] not null default '{}',
  bmi numeric(4,1),
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_data jsonb not null,
  week_number integer not null default 1 check (week_number > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_label text,
  day_type text check (
    day_type is null
    or day_type in ('strength', 'cardio', 'rest')
  ),
  completed_at timestamptz not null default now(),
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  calories_burned integer not null default 0 check (calories_burned >= 0),
  exercises_completed integer not null default 0 check (exercises_completed >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bmi_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  height_cm numeric(5,2) not null check (height_cm > 0),
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  bmi numeric(4,1) not null check (bmi > 0),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists workout_plans_one_active_per_user
  on public.workout_plans(user_id)
  where is_active;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists workout_plans_user_id_idx on public.workout_plans(user_id);
create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions(user_id, completed_at desc);
create index if not exists bmi_logs_user_recorded_idx
  on public.bmi_logs(user_id, recorded_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists workout_plans_set_updated_at on public.workout_plans;
create trigger workout_plans_set_updated_at
before update on public.workout_plans
for each row execute function public.set_updated_at();

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change user roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(profiles.full_name, ''), excluded.full_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists auth_users_sync_profile on auth.users;
create trigger auth_users_sync_profile
after update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_user_role(
  target_user_id uuid,
  new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can assign roles.';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id;
end;
$$;

create or replace view public.progress_daily
with (security_invoker = true)
as
select
  user_id,
  completed_at::date as workout_date,
  count(*)::integer as workout_count,
  coalesce(sum(duration_minutes), 0)::integer as total_duration_minutes,
  coalesce(sum(calories_burned), 0)::integer as total_calories_burned,
  coalesce(sum(exercises_completed), 0)::integer as total_exercises_completed
from public.workout_sessions
group by user_id, completed_at::date;

alter table public.profiles enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.bmi_logs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "workout_plans_select_own_or_admin" on public.workout_plans;
create policy "workout_plans_select_own_or_admin"
on public.workout_plans
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "workout_plans_insert_own" on public.workout_plans;
create policy "workout_plans_insert_own"
on public.workout_plans
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "workout_plans_update_own_or_admin" on public.workout_plans;
create policy "workout_plans_update_own_or_admin"
on public.workout_plans
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "workout_plans_delete_own_or_admin" on public.workout_plans;
create policy "workout_plans_delete_own_or_admin"
on public.workout_plans
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "workout_sessions_select_own_or_admin" on public.workout_sessions;
create policy "workout_sessions_select_own_or_admin"
on public.workout_sessions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own"
on public.workout_sessions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "workout_sessions_update_own_or_admin" on public.workout_sessions;
create policy "workout_sessions_update_own_or_admin"
on public.workout_sessions
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "workout_sessions_delete_own_or_admin" on public.workout_sessions;
create policy "workout_sessions_delete_own_or_admin"
on public.workout_sessions
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "bmi_logs_select_own_or_admin" on public.bmi_logs;
create policy "bmi_logs_select_own_or_admin"
on public.bmi_logs
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "bmi_logs_insert_own" on public.bmi_logs;
create policy "bmi_logs_insert_own"
on public.bmi_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "bmi_logs_update_own_or_admin" on public.bmi_logs;
create policy "bmi_logs_update_own_or_admin"
on public.bmi_logs
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "bmi_logs_delete_own_or_admin" on public.bmi_logs;
create policy "bmi_logs_delete_own_or_admin"
on public.bmi_logs
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workout_plans to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.bmi_logs to authenticated;
grant select on public.progress_daily to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workout_plans;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.workout_sessions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.bmi_logs;
exception
  when duplicate_object then null;
end $$;

-- Bootstrap the first admin manually after their account exists:
-- update public.profiles set role = 'admin' where email = 'your-email@example.com';
