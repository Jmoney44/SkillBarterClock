create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_path text,
  bio text not null default '',
  location text not null default '',
  languages text[] not null default '{}',
  timezone text not null default 'Lagos (UTC+1)',
  availability text not null default '',
  teaching_skills text[] not null default '{}',
  learning_skills text[] not null default '{}',
  onboarding_complete boolean not null default false,
  role text not null default 'member' check (role in ('member', 'admin')),
  credit_balance numeric(10, 2) not null default 2.00 check (credit_balance >= 0),
  pending_credits numeric(10, 2) not null default 0.00 check (pending_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'member';
alter table public.profiles
  add column if not exists avatar_path text;
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('member', 'admin'));

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

grant select on public.profiles to authenticated;
grant update (
  full_name,
  bio,
  location,
  languages,
  timezone,
  availability,
  teaching_skills,
  learning_skills,
  onboarding_complete
) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.set_my_avatar_path(p_avatar_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Sign in to update your profile image.';
  end if;
  if p_avatar_path is not null
    and coalesce((storage.foldername(p_avatar_path))[1], '') <> auth.uid()::text
  then
    raise exception using errcode = '42501', message = 'You can only set your own profile image.';
  end if;

  update public.profiles
  set avatar_path = p_avatar_path
  where id = auth.uid();
end;
$$;

revoke all on function public.set_my_avatar_path(text) from public, anon;
grant execute on function public.set_my_avatar_path(text) to authenticated;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.profiles (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  skill text not null check (char_length(skill) between 1 and 80),
  scheduled_at timestamptz not null,
  duration_hours numeric(4, 2) not null check (
    duration_hours >= 0.5
    and duration_hours <= 4
    and mod(duration_hours, 0.5) = 0
  ),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  learner_note text not null default '' check (char_length(learner_note) <= 500),
  learner_started boolean not null default false,
  teacher_started boolean not null default false,
  learner_ended boolean not null default false,
  teacher_ended boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (learner_id <> teacher_id)
);

create index if not exists sessions_learner_created_idx
  on public.sessions (learner_id, created_at desc);
create index if not exists sessions_teacher_created_idx
  on public.sessions (teacher_id, created_at desc);

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_profile_updated_at();

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  kind text not null check (kind in ('starter', 'hold', 'refund', 'earned')),
  title text not null check (char_length(title) between 1 and 100),
  detail text not null default '' check (char_length(detail) <= 200),
  amount numeric(10, 2) not null check (amount <> 0),
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_created_idx
  on public.wallet_transactions (user_id, created_at desc);
create unique index if not exists wallet_transactions_session_kind_user_idx
  on public.wallet_transactions (session_id, kind, user_id)
  where session_id is not null;

alter table public.sessions enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Participants can read their sessions" on public.sessions;
create policy "Participants can read their sessions"
on public.sessions for select
to authenticated
using ((select auth.uid()) in (learner_id, teacher_id));

drop policy if exists "Users can read their wallet transactions" on public.wallet_transactions;
create policy "Users can read their wallet transactions"
on public.wallet_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.sessions, public.wallet_transactions to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.wallet_transactions (user_id, kind, title, detail, amount)
  values (new.id, 'starter', 'Starter credits', 'Welcome to Skill Barter Clock', 2.00)
  on conflict do nothing;
  return new;
end;
$$;

insert into public.wallet_transactions (user_id, kind, title, detail, amount)
select p.id, 'starter', 'Starter credits', 'Welcome to Skill Barter Clock', 2.00
from public.profiles p
where not exists (
  select 1
  from public.wallet_transactions wt
  where wt.user_id = p.id and wt.kind = 'starter'
);

drop function if exists public.get_public_teachers(uuid);
create function public.get_public_teachers(p_teacher_id uuid default null)
returns table (
  id uuid,
  full_name text,
  avatar_path text,
  bio text,
  location text,
  languages text[],
  timezone text,
  availability text,
  teaching_skills text[],
  learning_skills text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.full_name,
    p.avatar_path,
    p.bio,
    p.location,
    p.languages,
    p.timezone,
    p.availability,
    p.teaching_skills,
    p.learning_skills
  from public.profiles p
  where p.onboarding_complete
    and p.id <> (select auth.uid())
    and (p_teacher_id is null or p.id = p_teacher_id)
  order by p.created_at desc
  limit 100;
$$;

create or replace function public.get_my_sessions()
returns table (
  id uuid,
  learner_id uuid,
  teacher_id uuid,
  skill text,
  scheduled_at timestamptz,
  duration_hours numeric,
  status text,
  learner_note text,
  learner_started boolean,
  teacher_started boolean,
  learner_ended boolean,
  teacher_ended boolean,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz,
  partner_id uuid,
  partner_name text,
  partner_timezone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.learner_id,
    s.teacher_id,
    s.skill,
    s.scheduled_at,
    s.duration_hours,
    s.status,
    s.learner_note,
    s.learner_started,
    s.teacher_started,
    s.learner_ended,
    s.teacher_ended,
    s.started_at,
    s.ended_at,
    s.created_at,
    case when s.learner_id = (select auth.uid()) then s.teacher_id else s.learner_id end,
    p.full_name,
    p.timezone
  from public.sessions s
  join public.profiles p
    on p.id = case when s.learner_id = (select auth.uid()) then s.teacher_id else s.learner_id end
  where (select auth.uid()) in (s.learner_id, s.teacher_id)
  order by s.scheduled_at desc;
$$;

create or replace function public.request_session(
  p_teacher_id uuid,
  p_skill text,
  p_scheduled_at timestamptz,
  p_duration_hours numeric,
  p_learner_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_learner_id uuid := auth.uid();
  v_session_id uuid;
  v_lock_user_id uuid;
begin
  if v_learner_id is null then
    raise exception using errcode = '28000', message = 'Sign in to book a session.';
  end if;
  if p_teacher_id is null or p_teacher_id = v_learner_id then
    raise exception using errcode = '22023', message = 'Choose another community member.';
  end if;
  if p_skill is null or char_length(btrim(p_skill)) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'Choose a valid teaching skill.';
  end if;
  if p_scheduled_at is null or p_scheduled_at < now() + interval '1 hour' then
    raise exception using errcode = '22023', message = 'Choose a time at least one hour from now.';
  end if;
  if p_scheduled_at > now() + interval '90 days' then
    raise exception using errcode = '22023', message = 'Choose a time within the next 90 days.';
  end if;
  if p_duration_hours is null
    or p_duration_hours < 0.5
    or p_duration_hours > 4
    or mod(p_duration_hours, 0.5) <> 0
  then
    raise exception using errcode = '22023', message = 'Session length must be from 0.5 to 4 hours in half-hour steps.';
  end if;
  if char_length(coalesce(p_learner_note, '')) > 500 then
    raise exception using errcode = '22023', message = 'Session note must be 500 characters or fewer.';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_teacher_id
      and p.onboarding_complete
      and btrim(p.full_name) <> ''
      and btrim(p_skill) = any(p.teaching_skills)
  ) then
    raise exception using errcode = '22023', message = 'That teacher or skill is no longer available.';
  end if;

  for v_lock_user_id in
    select member_id
    from unnest(array[v_learner_id, p_teacher_id]) as members(member_id)
    order by member_id
  loop
    perform pg_advisory_xact_lock(hashtext(v_lock_user_id::text));
  end loop;

  if exists (
    select 1
    from public.sessions s
    where s.status in ('requested', 'confirmed', 'in_progress')
      and (s.learner_id in (v_learner_id, p_teacher_id) or s.teacher_id in (v_learner_id, p_teacher_id))
      and s.scheduled_at < p_scheduled_at + (p_duration_hours * interval '1 hour')
      and p_scheduled_at < s.scheduled_at + (s.duration_hours * interval '1 hour')
  ) then
    raise exception using errcode = '22023', message = 'You or the teacher already has a session at that time.';
  end if;

  update public.profiles
  set credit_balance = credit_balance - p_duration_hours,
      pending_credits = pending_credits + p_duration_hours
  where id = v_learner_id
    and onboarding_complete
    and credit_balance >= p_duration_hours;

  if not found then
    raise exception using errcode = '22023', message = 'You do not have enough available time credits.';
  end if;

  insert into public.sessions (learner_id, teacher_id, skill, scheduled_at, duration_hours, learner_note)
  values (v_learner_id, p_teacher_id, btrim(p_skill), p_scheduled_at, p_duration_hours, coalesce(p_learner_note, ''))
  returning id into v_session_id;

  insert into public.wallet_transactions (user_id, session_id, kind, title, detail, amount)
  values (v_learner_id, v_session_id, 'hold', 'Session credits held', btrim(p_skill), -p_duration_hours);

  return v_session_id;
end;
$$;

create or replace function public.act_on_session(p_session_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in to manage a session.';
  end if;
  if p_action is null or p_action not in ('accept', 'decline', 'start', 'end', 'cancel') then
    raise exception using errcode = '22023', message = 'Choose a valid session action.';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;
  if not found or v_user_id not in (v_session.learner_id, v_session.teacher_id) then
    raise exception using errcode = 'P0002', message = 'Session not found.';
  end if;

  if p_action in ('accept', 'decline') then
    if v_user_id <> v_session.teacher_id or v_session.status <> 'requested' then
      raise exception using errcode = '22023', message = 'Only the teacher can respond to a new request.';
    end if;
    if p_action = 'accept' then
      update public.sessions set status = 'confirmed' where id = p_session_id;
      return 'confirmed';
    end if;
    p_action := 'cancel';
  end if;

  if p_action = 'start' then
    if v_session.status not in ('confirmed', 'in_progress') then
      raise exception using errcode = '22023', message = 'Only a confirmed session can be started.';
    end if;
    update public.sessions
    set learner_started = learner_started or v_user_id = learner_id,
        teacher_started = teacher_started or v_user_id = teacher_id,
        status = case
          when (learner_started or v_user_id = learner_id)
            and (teacher_started or v_user_id = teacher_id) then 'in_progress'
          else status
        end,
        started_at = case
          when (learner_started or v_user_id = learner_id)
            and (teacher_started or v_user_id = teacher_id) then coalesce(started_at, now())
          else started_at
        end
    where id = p_session_id
    returning status into v_status;
    return v_status;
  end if;

  if p_action = 'end' then
    if v_session.status <> 'in_progress' then
      raise exception using errcode = '22023', message = 'Both participants must start the session before ending it.';
    end if;

    update public.sessions
    set learner_ended = learner_ended or v_user_id = learner_id,
        teacher_ended = teacher_ended or v_user_id = teacher_id,
        status = case
          when (learner_ended or v_user_id = learner_id)
            and (teacher_ended or v_user_id = teacher_id) then 'completed'
          else status
        end,
        ended_at = case
          when (learner_ended or v_user_id = learner_id)
            and (teacher_ended or v_user_id = teacher_id) then coalesce(ended_at, now())
          else ended_at
        end
    where id = p_session_id
    returning status into v_status;

    if v_status = 'completed' then
      perform p.id
      from public.profiles p
      where p.id in (v_session.learner_id, v_session.teacher_id)
      order by p.id
      for update;

      update public.profiles
      set pending_credits = pending_credits - v_session.duration_hours
      where id = v_session.learner_id
        and pending_credits >= v_session.duration_hours;
      if not found then
        raise exception using errcode = '23514', message = 'Could not release the held session credits.';
      end if;

      update public.profiles
      set credit_balance = credit_balance + v_session.duration_hours
      where id = v_session.teacher_id;

      insert into public.wallet_transactions (user_id, session_id, kind, title, detail, amount)
      values (
        v_session.teacher_id,
        p_session_id,
        'earned',
        'Session completed',
        v_session.skill,
        v_session.duration_hours
      );
    end if;

    return v_status;
  end if;

  if p_action = 'cancel' then
    if v_session.status not in ('requested', 'confirmed') then
      raise exception using errcode = '22023', message = 'A session can only be cancelled before it starts.';
    end if;

    perform p.id
    from public.profiles p
    where p.id = v_session.learner_id
    for update;
    update public.profiles
    set credit_balance = credit_balance + v_session.duration_hours,
        pending_credits = pending_credits - v_session.duration_hours
    where id = v_session.learner_id
      and pending_credits >= v_session.duration_hours;
    if not found then
      raise exception using errcode = '23514', message = 'Could not release the held session credits.';
    end if;

    update public.sessions set status = 'cancelled' where id = p_session_id;
    insert into public.wallet_transactions (user_id, session_id, kind, title, detail, amount)
    values (
      v_session.learner_id,
      p_session_id,
      'refund',
      'Session credits returned',
      v_session.skill,
      v_session.duration_hours
    );
    return 'cancelled';
  end if;

  return v_session.status;
end;
$$;

revoke all on function public.get_public_teachers(uuid) from public, anon;
revoke all on function public.get_my_sessions() from public, anon;
revoke all on function public.request_session(uuid, text, timestamptz, numeric, text) from public, anon;
revoke all on function public.act_on_session(uuid, text) from public, anon;
grant execute on function public.get_public_teachers(uuid) to authenticated;
grant execute on function public.get_my_sessions() to authenticated;
grant execute on function public.request_session(uuid, text, timestamptz, numeric, text) to authenticated;
grant execute on function public.act_on_session(uuid, text) to authenticated;

create or replace function public.get_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'members', (select count(*) from public.profiles),
      'onboardedMembers', (select count(*) from public.profiles where onboarding_complete),
      'sessions', (select count(*) from public.sessions),
      'pendingRequests', (select count(*) from public.sessions where status = 'requested'),
      'activeSessions', (select count(*) from public.sessions where status in ('confirmed', 'in_progress')),
      'completedSessions', (select count(*) from public.sessions where status = 'completed')
    ),
    'members', coalesce((
      select jsonb_agg(to_jsonb(member_row) order by member_row.created_at desc)
      from (
        select
          p.id,
          p.full_name,
          u.email,
          p.location,
          p.timezone,
          p.onboarding_complete,
          p.role,
          p.credit_balance,
          p.pending_credits,
          p.created_at
        from public.profiles p
        left join auth.users u on u.id = p.id
        order by p.created_at desc
        limit 100
      ) member_row
    ), '[]'::jsonb),
    'recentSessions', coalesce((
      select jsonb_agg(to_jsonb(session_row) order by session_row.created_at desc)
      from (
        select
          s.id,
          s.skill,
          s.scheduled_at,
          s.duration_hours,
          s.status,
          s.created_at,
          learner.full_name as learner_name,
          teacher.full_name as teacher_name
        from public.sessions s
        join public.profiles learner on learner.id = s.learner_id
        join public.profiles teacher on teacher.id = s.teacher_id
        order by s.created_at desc
        limit 100
      ) session_row
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_admin_overview() from public, anon;
grant execute on function public.get_admin_overview() to authenticated;
