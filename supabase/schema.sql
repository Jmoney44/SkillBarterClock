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
  add column if not exists deleted_at timestamptz;
alter table public.profiles
  add column if not exists suspended_at timestamptz;
alter table public.profiles
  add column if not exists suspension_reason text;
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

-- Why a session left the active states. Null while the session is still active.
alter table public.sessions
  add column if not exists closed_reason text;
alter table public.sessions
  drop constraint if exists sessions_closed_reason_check;
alter table public.sessions
  add constraint sessions_closed_reason_check check (
    closed_reason is null
    or closed_reason in ('declined', 'cancelled', 'expired', 'no_show', 'completed', 'auto_completed', 'admin_cancelled', 'admin_completed')
  );

-- Where the partners meet: a video call link, phone number, or place. Only
-- participants can read it (through get_my_sessions) or change it.
alter table public.sessions
  add column if not exists meeting_details text not null default '';
alter table public.sessions
  drop constraint if exists sessions_meeting_details_check;
alter table public.sessions
  add constraint sessions_meeting_details_check check (char_length(meeting_details) <= 500);

create index if not exists sessions_active_scheduled_idx
  on public.sessions (scheduled_at)
  where status in ('requested', 'confirmed', 'in_progress');

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

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_kind_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_kind_check check (kind in ('starter', 'hold', 'refund', 'earned', 'adjustment'));

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

-- Weekly availability: recurring windows in the teacher's own IANA time zone.
-- Teachers with no windows accept requests at any time.
alter table public.profiles
  add column if not exists availability_time_zone text;

create table if not exists public.availability_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_minute smallint not null check (start_minute between 0 and 1410 and start_minute % 30 = 0),
  end_minute smallint not null check (end_minute between 30 and 1440 and end_minute % 30 = 0),
  check (start_minute < end_minute)
);

create index if not exists availability_windows_user_weekday_idx
  on public.availability_windows (user_id, weekday);

alter table public.availability_windows enable row level security;

drop policy if exists "Users can read their availability" on public.availability_windows;
create policy "Users can read their availability"
on public.availability_windows for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.availability_windows to authenticated;

-- Whether every half hour of [p_start, p_end) falls inside one of the
-- teacher's weekly windows. True when the teacher has set no windows.
create or replace function public.teacher_is_available(p_teacher_id uuid, p_start timestamptz, p_end timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (select 1 from public.availability_windows w where w.user_id = p_teacher_id) then true
    else not exists (
      select 1
      from public.profiles p
      cross join generate_series(p_start, p_end - interval '30 minutes', interval '30 minutes') as step(t)
      cross join lateral (
        select
          step.t at time zone coalesce(p.availability_time_zone, 'UTC') as local_start,
          (step.t + interval '30 minutes') at time zone coalesce(p.availability_time_zone, 'UTC') as local_end
      ) l
      where p.id = p_teacher_id
        and not exists (
          select 1
          from public.availability_windows w
          where w.user_id = p_teacher_id
            and w.weekday = extract(dow from l.local_start)
            and extract(epoch from (l.local_start - date_trunc('day', l.local_start))) / 60 >= w.start_minute
            and extract(epoch from (l.local_end - date_trunc('day', l.local_start))) / 60 <= w.end_minute
        )
    )
  end;
$$;

-- Learners rate teachers after a completed session: one review per session,
-- editable for 30 days after the session ends. Written only through
-- submit_session_review; participants can read the review for their session.
create table if not exists public.session_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reviewer_id <> teacher_id)
);

alter table public.session_reviews
  add column if not exists hidden_at timestamptz;
alter table public.session_reviews
  add column if not exists hidden_reason text;

create index if not exists session_reviews_teacher_created_idx
  on public.session_reviews (teacher_id, created_at desc);

drop trigger if exists session_reviews_set_updated_at on public.session_reviews;
create trigger session_reviews_set_updated_at
before update on public.session_reviews
for each row execute function public.set_profile_updated_at();

alter table public.session_reviews enable row level security;

drop policy if exists "Participants can read their session reviews" on public.session_reviews;
create policy "Participants can read their session reviews"
on public.session_reviews for select
to authenticated
using ((select auth.uid()) in (reviewer_id, teacher_id));

grant select on public.session_reviews to authenticated;

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
  learning_skills text[],
  rating_average numeric,
  rating_count integer
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
    p.learning_skills,
    ratings.rating_average,
    coalesce(ratings.rating_count, 0)
  from public.profiles p
  left join lateral (
    select round(avg(r.rating), 1) as rating_average, count(*)::integer as rating_count
    from public.session_reviews r
    where r.teacher_id = p.id
      and r.hidden_at is null
  ) ratings on true
  where p.onboarding_complete
    and p.suspended_at is null
    and p.id <> (select auth.uid())
    and (p_teacher_id is null or p.id = p_teacher_id)
  order by p.created_at desc
  limit 100;
$$;

drop function if exists public.get_my_sessions();
create function public.get_my_sessions()
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
  closed_reason text,
  meeting_details text,
  review_rating smallint,
  review_comment text,
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
    s.closed_reason,
    s.meeting_details,
    r.rating,
    r.comment,
    s.created_at,
    case when s.learner_id = (select auth.uid()) then s.teacher_id else s.learner_id end,
    p.full_name,
    p.timezone
  from public.sessions s
  join public.profiles p
    on p.id = case when s.learner_id = (select auth.uid()) then s.teacher_id else s.learner_id end
  left join public.session_reviews r on r.session_id = s.id
  where (select auth.uid()) in (s.learner_id, s.teacher_id)
  order by s.scheduled_at desc;
$$;

drop function if exists public.request_session(uuid, text, timestamptz, numeric, text);
-- Raises if the signed-in member is suspended. Called by every member action.
create or replace function public.assert_active_member()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended_at is not null) then
    raise exception using errcode = '42501', message = 'Your account is suspended. Contact the community team if you think this is a mistake.';
  end if;
end;
$$;

create or replace function public.request_session(
  p_teacher_id uuid,
  p_skill text,
  p_scheduled_at timestamptz,
  p_duration_hours numeric,
  p_learner_note text default '',
  p_meeting_details text default ''
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
  perform public.assert_active_member();
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
  if char_length(btrim(coalesce(p_meeting_details, ''))) > 500 then
    raise exception using errcode = '22023', message = 'Meeting details must be 500 characters or fewer.';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = v_learner_id
      and p.onboarding_complete
  ) then
    raise exception using errcode = '22023', message = 'Finish setting up your profile before booking a session.';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_teacher_id
      and p.onboarding_complete
      and p.suspended_at is null
      and btrim(p.full_name) <> ''
      and btrim(p_skill) = any(p.teaching_skills)
  ) then
    raise exception using errcode = '22023', message = 'That teacher or skill is no longer available.';
  end if;

  if not public.teacher_is_available(p_teacher_id, p_scheduled_at, p_scheduled_at + (p_duration_hours * interval '1 hour')) then
    raise exception using errcode = '22023', message = 'That time is outside the teacher''s weekly availability. Choose one of their open times.';
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

  insert into public.sessions (learner_id, teacher_id, skill, scheduled_at, duration_hours, learner_note, meeting_details)
  values (
    v_learner_id,
    p_teacher_id,
    btrim(p_skill),
    p_scheduled_at,
    p_duration_hours,
    coalesce(p_learner_note, ''),
    btrim(coalesce(p_meeting_details, ''))
  )
  returning id into v_session_id;

  insert into public.wallet_transactions (user_id, session_id, kind, title, detail, amount)
  values (v_learner_id, v_session_id, 'hold', 'Session credits held', btrim(p_skill), -p_duration_hours);

  return v_session_id;
end;
$$;

-- Session timing rules (keep in sync with src/lib/session-rules.ts):
--   * A request can be accepted only before its scheduled time. An unanswered
--     request expires at its scheduled time and the learner is refunded.
--   * A confirmed session can be started from 15 minutes before its scheduled
--     time until its scheduled end (scheduled_at + duration). If both partners
--     have not started by then, it closes as a no-show and the learner is refunded.
--   * A session in progress that is not ended by both partners within one hour
--     after its expected end (started_at + duration) completes automatically and
--     the teacher is paid, because both partners confirmed they were present.

-- Returns a requested or confirmed session's held credits to the learner and
-- closes the session. Internal helper: not callable by clients.
create or replace function public.release_session_hold(p_session_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
begin
  if p_reason is null or p_reason not in ('declined', 'cancelled', 'expired', 'no_show', 'admin_cancelled') then
    raise exception using errcode = '22023', message = 'Choose a valid reason to release session credits.';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;
  if not found
    or not (
      v_session.status in ('requested', 'confirmed')
      or (v_session.status = 'in_progress' and p_reason = 'admin_cancelled')
    )
  then
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

  update public.sessions
  set status = 'cancelled',
      closed_reason = p_reason
  where id = p_session_id;

  insert into public.wallet_transactions (user_id, session_id, kind, title, detail, amount)
  values (
    v_session.learner_id,
    p_session_id,
    'refund',
    case p_reason
      when 'declined' then 'Request declined: credits returned'
      when 'expired' then 'Request expired: credits returned'
      when 'no_show' then 'Session not started: credits returned'
      when 'admin_cancelled' then 'Cancelled by the community team: credits returned'
      else 'Session credits returned'
    end,
    v_session.skill,
    v_session.duration_hours
  );
end;
$$;

-- Moves a session in progress to completed and pays the teacher from the
-- learner's held credits. Internal helper: not callable by clients.
create or replace function public.complete_session(p_session_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
begin
  if p_reason is null or p_reason not in ('completed', 'auto_completed', 'admin_completed') then
    raise exception using errcode = '22023', message = 'Choose a valid reason to complete a session.';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;
  if not found
    or not (
      v_session.status = 'in_progress'
      or (v_session.status = 'confirmed' and p_reason = 'admin_completed')
    )
  then
    raise exception using errcode = '22023', message = 'Only a session in progress can be completed.';
  end if;

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

  update public.sessions
  set status = 'completed',
      started_at = coalesce(started_at, scheduled_at),
      ended_at = coalesce(ended_at, now()),
      closed_reason = p_reason
  where id = p_session_id;

  insert into public.wallet_transactions (user_id, session_id, kind, title, detail, amount)
  values (
    v_session.teacher_id,
    p_session_id,
    'earned',
    case p_reason
      when 'auto_completed' then 'Session auto-completed'
      when 'admin_completed' then 'Session completed by the community team'
      else 'Session completed'
    end,
    v_session.skill,
    v_session.duration_hours
  );
end;
$$;

-- Closes sessions whose time has passed: expires unanswered requests, refunds
-- confirmed sessions that were never started by both partners, and completes
-- sessions in progress that were never ended. Pass a user ID to limit it to
-- that member's sessions. Internal: run by pg_cron or resolve_my_stale_sessions.
create or replace function public.resolve_stale_sessions(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session record;
  v_resolved integer := 0;
begin
  for v_session in
    select s.id, s.status
    from public.sessions s
    where (p_user_id is null or p_user_id in (s.learner_id, s.teacher_id))
      and (
        (s.status = 'requested' and s.scheduled_at <= now())
        or (
          s.status = 'confirmed'
          and s.scheduled_at + (s.duration_hours * interval '1 hour') <= now()
        )
        or (
          s.status = 'in_progress'
          and coalesce(s.started_at, s.scheduled_at)
            + (s.duration_hours * interval '1 hour')
            + interval '1 hour' <= now()
        )
      )
    order by s.id
    for update skip locked
  loop
    begin
      if v_session.status = 'requested' then
        perform public.release_session_hold(v_session.id, 'expired');
      elsif v_session.status = 'confirmed' then
        perform public.release_session_hold(v_session.id, 'no_show');
      else
        perform public.complete_session(v_session.id, 'auto_completed');
      end if;
      v_resolved := v_resolved + 1;
    exception when others then
      -- Leave this session for the next run instead of blocking the others.
      raise warning 'Could not resolve stale session %: %', v_session.id, sqlerrm;
    end;
  end loop;

  return v_resolved;
end;
$$;

create or replace function public.resolve_my_stale_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Sign in to manage your sessions.';
  end if;
  return public.resolve_stale_sessions(auth.uid());
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
  v_learner_ended boolean;
  v_teacher_ended boolean;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in to manage a session.';
  end if;
  perform public.assert_active_member();
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

  if v_session.closed_reason in ('expired', 'no_show') then
    raise exception using errcode = '22023', message = 'This session closed before it started, so the held credits were returned to the learner.';
  end if;
  if v_session.closed_reason = 'auto_completed' then
    raise exception using errcode = '22023', message = 'This session was completed automatically after its scheduled time.';
  end if;

  if p_action in ('accept', 'decline') then
    if v_user_id <> v_session.teacher_id or v_session.status <> 'requested' then
      raise exception using errcode = '22023', message = 'Only the teacher can respond to a new request.';
    end if;
    if p_action = 'accept' then
      if v_session.scheduled_at <= now() then
        raise exception using errcode = '22023', message = 'This request''s scheduled time has passed, so it can no longer be accepted.';
      end if;
      update public.sessions set status = 'confirmed' where id = p_session_id;
      return 'confirmed';
    end if;
    perform public.release_session_hold(p_session_id, 'declined');
    return 'cancelled';
  end if;

  if p_action = 'start' then
    if v_session.status not in ('confirmed', 'in_progress') then
      raise exception using errcode = '22023', message = 'Only a confirmed session can be started.';
    end if;
    if v_session.status = 'confirmed' then
      if now() < v_session.scheduled_at - interval '15 minutes' then
        raise exception using errcode = '22023', message = 'You can start this session from 15 minutes before its scheduled time.';
      end if;
      if now() >= v_session.scheduled_at + (v_session.duration_hours * interval '1 hour') then
        raise exception using errcode = '22023', message = 'The time for this session has passed, so it can no longer be started.';
      end if;
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
        teacher_ended = teacher_ended or v_user_id = teacher_id
    where id = p_session_id
    returning learner_ended, teacher_ended into v_learner_ended, v_teacher_ended;

    if v_learner_ended and v_teacher_ended then
      perform public.complete_session(p_session_id, 'completed');
      return 'completed';
    end if;
    return 'in_progress';
  end if;

  -- p_action = 'cancel'
  perform public.release_session_hold(p_session_id, 'cancelled');
  return 'cancelled';
end;
$$;

-- Creates or updates the learner's review of a completed session.
create or replace function public.submit_session_review(p_session_id uuid, p_rating integer, p_comment text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_comment text := btrim(coalesce(p_comment, ''));
  v_review_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in to review a session.';
  end if;
  perform public.assert_active_member();
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Choose a rating from 1 to 5 stars.';
  end if;
  if char_length(v_comment) > 500 then
    raise exception using errcode = '22023', message = 'Reviews must be 500 characters or fewer.';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;
  if not found or v_user_id not in (v_session.learner_id, v_session.teacher_id) then
    raise exception using errcode = 'P0002', message = 'Session not found.';
  end if;
  if v_user_id <> v_session.learner_id then
    raise exception using errcode = '22023', message = 'Only the learner can review this session.';
  end if;
  if v_session.status <> 'completed' then
    raise exception using errcode = '22023', message = 'You can review a session once it is completed.';
  end if;
  if coalesce(v_session.ended_at, v_session.updated_at) + interval '30 days' < now() then
    raise exception using errcode = '22023', message = 'Reviews can be added or changed for 30 days after a session.';
  end if;

  insert into public.session_reviews (session_id, reviewer_id, teacher_id, rating, comment)
  values (p_session_id, v_user_id, v_session.teacher_id, p_rating, v_comment)
  on conflict (session_id) do update
  set rating = excluded.rating,
      comment = excluded.comment
  returning id into v_review_id;

  return v_review_id;
end;
$$;

-- Recent reviews of a teacher, for their public profile or their own dashboard.
-- Reviewers are shown by first name only.
create or replace function public.get_teacher_reviews(p_teacher_id uuid, p_limit integer default 20)
returns table (
  id uuid,
  rating smallint,
  comment text,
  skill text,
  reviewer_first_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.rating,
    r.comment,
    s.skill,
    case
      when reviewer.deleted_at is not null then 'Former member'
      else coalesce(nullif(split_part(btrim(reviewer.full_name), ' ', 1), ''), 'A learner')
    end,
    r.created_at
  from public.session_reviews r
  join public.sessions s on s.id = r.session_id
  join public.profiles reviewer on reviewer.id = r.reviewer_id
  where (select auth.uid()) is not null
    and r.teacher_id = p_teacher_id
    and r.hidden_at is null
    and (
      p_teacher_id = (select auth.uid())
      or exists (select 1 from public.profiles t where t.id = p_teacher_id and t.onboarding_complete)
    )
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Average rating and count for one teacher (used for a teacher's own dashboard).
create or replace function public.get_teacher_rating(p_teacher_id uuid)
returns table (rating_average numeric, rating_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select round(avg(r.rating), 1), count(*)::integer
  from public.session_reviews r
  where (select auth.uid()) is not null
    and r.teacher_id = p_teacher_id
    and r.hidden_at is null
    and (
      p_teacher_id = (select auth.uid())
      or exists (select 1 from public.profiles t where t.id = p_teacher_id and t.onboarding_complete)
    );
$$;

-- Replaces the signed-in member's weekly availability. An empty list clears it.
create or replace function public.set_my_availability(p_time_zone text, p_windows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in to set your availability.';
  end if;
  perform public.assert_active_member();
  if p_time_zone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception using errcode = '22023', message = 'Choose a valid time zone.';
  end if;
  if p_windows is null or jsonb_typeof(p_windows) <> 'array' or jsonb_array_length(p_windows) > 42 then
    raise exception using errcode = '22023', message = 'Add no more than 42 time ranges.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_windows) as w(weekday int, start_minute int, end_minute int)
    where w.weekday is null or w.start_minute is null or w.end_minute is null
      or w.weekday not between 0 and 6
      or w.start_minute not between 0 and 1410 or w.start_minute % 30 <> 0
      or w.end_minute not between 30 and 1440 or w.end_minute % 30 <> 0
      or w.start_minute >= w.end_minute
  ) then
    raise exception using errcode = '22023', message = 'Each time range must start before it ends, on the hour or half hour.';
  end if;
  if exists (
    select 1
    from rows from (jsonb_to_recordset(p_windows) as (weekday int, start_minute int, end_minute int))
      with ordinality as a(weekday, start_minute, end_minute, n)
    join rows from (jsonb_to_recordset(p_windows) as (weekday int, start_minute int, end_minute int))
      with ordinality as b(weekday, start_minute, end_minute, n)
      on a.weekday = b.weekday
     and a.n < b.n
     and a.start_minute < b.end_minute
     and b.start_minute < a.end_minute
  ) then
    raise exception using errcode = '22023', message = 'Time ranges on the same day can''t overlap.';
  end if;

  delete from public.availability_windows where user_id = v_user_id;
  insert into public.availability_windows (user_id, weekday, start_minute, end_minute)
  select v_user_id, w.weekday, w.start_minute, w.end_minute
  from jsonb_to_recordset(p_windows) as w(weekday int, start_minute int, end_minute int);
  update public.profiles set availability_time_zone = p_time_zone where id = v_user_id;
end;
$$;

-- A member's weekly availability: their own, or a teacher who finished onboarding.
create or replace function public.get_availability(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'timeZone', p.availability_time_zone,
    'windows', coalesce((
      select jsonb_agg(
        jsonb_build_object('weekday', w.weekday, 'startMinute', w.start_minute, 'endMinute', w.end_minute)
        order by w.weekday, w.start_minute
      )
      from public.availability_windows w
      where w.user_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  where (select auth.uid()) is not null
    and p.id = p_user_id
    and (p.id = (select auth.uid()) or p.onboarding_complete);
$$;

-- Free half-hour slot starts for a teacher between p_from and p_to (at most 35
-- days), inside their weekly windows and not overlapping their active sessions.
-- Only free times are returned, never who the teacher is meeting.
create or replace function public.get_teacher_open_slots(p_teacher_id uuid, p_from timestamptz, p_to timestamptz)
returns table (slot_start timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with teacher as (
    select p.id, coalesce(p.availability_time_zone, 'UTC') as tz
    from public.profiles p
    where (select auth.uid()) is not null
      and p.id = p_teacher_id
      and p.onboarding_complete
  ),
  bounds as (
    select
      greatest(coalesce(p_from, now()), now() + interval '1 hour') as lo,
      least(coalesce(p_to, now()), coalesce(p_from, now()) + interval '35 days', now() + interval '90 days') as hi
  ),
  days as (
    select d::date as d, t.tz
    from teacher t, bounds b,
      generate_series(
        (b.lo at time zone t.tz)::date - 1,
        (b.hi at time zone t.tz)::date + 1,
        interval '1 day'
      ) as d
  ),
  occurrences as (
    select
      (days.d + make_interval(mins => w.start_minute)) at time zone days.tz as starts_at,
      (days.d + make_interval(mins => w.end_minute)) at time zone days.tz as ends_at
    from days
    join public.availability_windows w
      on w.user_id = p_teacher_id
     and w.weekday = extract(dow from days.d)
  ),
  slots as (
    select distinct generate_series(o.starts_at, o.ends_at - interval '30 minutes', interval '30 minutes') as slot_start
    from occurrences o
  )
  select s.slot_start
  from slots s, bounds b
  where s.slot_start >= b.lo
    and s.slot_start + interval '30 minutes' <= b.hi
    and not exists (
      select 1
      from public.sessions x
      where x.status in ('requested', 'confirmed', 'in_progress')
        and p_teacher_id in (x.teacher_id, x.learner_id)
        and x.scheduled_at < s.slot_start + interval '30 minutes'
        and s.slot_start < x.scheduled_at + (x.duration_hours * interval '1 hour')
    )
  order by s.slot_start;
$$;

-- Lets either participant add or change where they meet until the session ends.
create or replace function public.set_session_meeting_details(p_session_id uuid, p_meeting_details text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_details text := btrim(coalesce(p_meeting_details, ''));
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in to manage a session.';
  end if;
  perform public.assert_active_member();
  if char_length(v_details) > 500 then
    raise exception using errcode = '22023', message = 'Meeting details must be 500 characters or fewer.';
  end if;

  select * into v_session
  from public.sessions
  where id = p_session_id
  for update;
  if not found or v_user_id not in (v_session.learner_id, v_session.teacher_id) then
    raise exception using errcode = 'P0002', message = 'Session not found.';
  end if;
  if v_session.status not in ('requested', 'confirmed', 'in_progress') then
    raise exception using errcode = '22023', message = 'Meeting details can only be changed before a session ends.';
  end if;

  update public.sessions
  set meeting_details = v_details
  where id = p_session_id;
  return v_details;
end;
$$;

revoke all on function public.get_public_teachers(uuid) from public, anon;
revoke all on function public.get_my_sessions() from public, anon;
revoke all on function public.request_session(uuid, text, timestamptz, numeric, text, text) from public, anon;
revoke all on function public.set_session_meeting_details(uuid, text) from public, anon;
revoke all on function public.submit_session_review(uuid, integer, text) from public, anon;
revoke all on function public.get_teacher_reviews(uuid, integer) from public, anon;
revoke all on function public.get_teacher_rating(uuid) from public, anon;
revoke all on function public.teacher_is_available(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.set_my_availability(text, jsonb) from public, anon;
revoke all on function public.get_availability(uuid) from public, anon;
revoke all on function public.get_teacher_open_slots(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.act_on_session(uuid, text) from public, anon;
grant execute on function public.get_public_teachers(uuid) to authenticated;
grant execute on function public.get_my_sessions() to authenticated;
grant execute on function public.request_session(uuid, text, timestamptz, numeric, text, text) to authenticated;
grant execute on function public.set_session_meeting_details(uuid, text) to authenticated;
grant execute on function public.submit_session_review(uuid, integer, text) to authenticated;
grant execute on function public.get_teacher_reviews(uuid, integer) to authenticated;
grant execute on function public.get_teacher_rating(uuid) to authenticated;
grant execute on function public.set_my_availability(text, jsonb) to authenticated;
grant execute on function public.get_availability(uuid) to authenticated;
grant execute on function public.get_teacher_open_slots(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.act_on_session(uuid, text) to authenticated;

revoke all on function public.release_session_hold(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_session(uuid, text) from public, anon, authenticated;
revoke all on function public.resolve_stale_sessions(uuid) from public, anon, authenticated;
revoke all on function public.resolve_my_stale_sessions() from public, anon;
grant execute on function public.resolve_my_stale_sessions() to authenticated;

-- Resolve stale sessions for everyone every 10 minutes when pg_cron is enabled
-- (Supabase: Database > Integrations > Cron, or Extensions > pg_cron). Without it,
-- a member's sessions are still resolved whenever they load sessions or wallet.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'resolve-stale-sessions';
    perform cron.schedule(
      'resolve-stale-sessions',
      '*/10 * * * *',
      'select public.resolve_stale_sessions()'
    );
  end if;
end;
$$;

-- get_admin_overview is defined in the Admin tools section at the end of this file.
drop function if exists public.get_admin_overview();

create table if not exists public.admin_announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  message text not null check (char_length(message) between 5 and 500),
  created_at timestamptz not null default now()
);

create index if not exists admin_announcements_created_idx
  on public.admin_announcements (created_at desc);

alter table public.admin_announcements enable row level security;

drop policy if exists "Signed-in members can read admin announcements" on public.admin_announcements;
create policy "Signed-in members can read admin announcements"
on public.admin_announcements for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Admins can publish announcements" on public.admin_announcements;
create policy "Admins can publish announcements"
on public.admin_announcements for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
);

grant select, insert on public.admin_announcements to authenticated;

-- ---------------------------------------------------------------------------
-- Email notifications
-- Database triggers queue emails in notification_outbox when sessions or
-- reviews change (including changes made by resolve_stale_sessions). The app's
-- sender (src/lib/notifications/outbox.ts, using the service role key) claims
-- queued rows, renders and sends them, and records the result.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists email_notifications boolean not null default true;
alter table public.profiles
  add column if not exists notification_time_zone text;

grant update (email_notifications) on public.profiles to authenticated;

-- Records the member's browser time zone so emails show times they recognise.
create or replace function public.set_my_time_zone(p_time_zone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Sign in to update your time zone.';
  end if;
  if p_time_zone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception using errcode = '22023', message = 'Choose a valid time zone.';
  end if;
  update public.profiles set notification_time_zone = p_time_zone where id = auth.uid();
end;
$$;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'session_requested',
    'request_accepted',
    'request_declined',
    'request_expired',
    'session_cancelled',
    'session_not_started',
    'session_auto_completed',
    'meeting_details_changed',
    'session_reminder',
    'review_received'
  )),
  session_id uuid references public.sessions (id) on delete cascade,
  created_at timestamptz not null default now(),
  send_after timestamptz not null default now(),
  attempts smallint not null default 0,
  sent_at timestamptz,
  skipped_reason text,
  last_error text
);

-- One unsent email per recipient, kind, and session: repeated changes collapse.
create unique index if not exists notification_outbox_pending_idx
  on public.notification_outbox (recipient_id, kind, session_id)
  where sent_at is null;
create index if not exists notification_outbox_due_idx
  on public.notification_outbox (send_after)
  where sent_at is null;

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from anon, authenticated;

create or replace function public.enqueue_notification(p_recipient_id uuid, p_kind text, p_session_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_outbox (recipient_id, kind, session_id)
  values (p_recipient_id, p_kind, p_session_id)
  on conflict (recipient_id, kind, session_id) where sent_at is null do nothing;
$$;

create or replace function public.queue_session_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid(); -- null when the change comes from pg_cron or the sender
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_notification(new.teacher_id, 'session_requested', new.id);
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      perform public.enqueue_notification(new.learner_id, 'request_accepted', new.id);
    elsif new.status = 'cancelled' then
      if new.closed_reason = 'declined' then
        perform public.enqueue_notification(new.learner_id, 'request_declined', new.id);
      elsif new.closed_reason = 'expired' then
        perform public.enqueue_notification(new.learner_id, 'request_expired', new.id);
      elsif new.closed_reason = 'no_show' then
        perform public.enqueue_notification(new.learner_id, 'session_not_started', new.id);
        perform public.enqueue_notification(new.teacher_id, 'session_not_started', new.id);
      else
        if v_actor is distinct from new.learner_id then
          perform public.enqueue_notification(new.learner_id, 'session_cancelled', new.id);
        end if;
        if v_actor is distinct from new.teacher_id then
          perform public.enqueue_notification(new.teacher_id, 'session_cancelled', new.id);
        end if;
      end if;
    elsif new.status = 'completed' and new.closed_reason in ('auto_completed', 'admin_completed') then
      perform public.enqueue_notification(new.learner_id, 'session_auto_completed', new.id);
      perform public.enqueue_notification(new.teacher_id, 'session_auto_completed', new.id);
    end if;
  end if;

  if new.meeting_details is distinct from old.meeting_details
    and new.meeting_details <> ''
    and new.status in ('requested', 'confirmed', 'in_progress')
  then
    if v_actor is distinct from new.learner_id then
      perform public.enqueue_notification(new.learner_id, 'meeting_details_changed', new.id);
    end if;
    if v_actor is distinct from new.teacher_id then
      perform public.enqueue_notification(new.teacher_id, 'meeting_details_changed', new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sessions_queue_notifications on public.sessions;
create trigger sessions_queue_notifications
after insert or update on public.sessions
for each row execute function public.queue_session_notifications();

create or replace function public.queue_review_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enqueue_notification(new.teacher_id, 'review_received', new.session_id);
  return new;
end;
$$;

drop trigger if exists session_reviews_queue_notification on public.session_reviews;
create trigger session_reviews_queue_notification
after insert on public.session_reviews
for each row execute function public.queue_review_notification();

-- Queues a reminder to both partners for confirmed sessions starting within the hour.
create or replace function public.enqueue_session_reminders()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notification_outbox (recipient_id, kind, session_id)
  select participant.id, 'session_reminder', s.id
  from public.sessions s
  cross join lateral (values (s.learner_id), (s.teacher_id)) as participant(id)
  where s.status = 'confirmed'
    and s.scheduled_at > now()
    and s.scheduled_at <= now() + interval '1 hour'
    and not exists (
      select 1
      from public.notification_outbox o
      where o.session_id = s.id
        and o.kind = 'session_reminder'
        and o.recipient_id = participant.id
    )
  on conflict do nothing;
$$;

-- Called by the app's sender with the service role. Also resolves overdue
-- sessions and queues reminders, so it doubles as the scheduler when pg_cron
-- isn't enabled. Claimed rows are leased with a growing back-off so a crashed
-- send is retried (up to 5 attempts).
drop function if exists public.claim_notifications(integer);
create function public.claim_notifications(p_limit integer default 25)
returns table (
  id uuid,
  kind text,
  recipient_email text,
  recipient_name text,
  recipient_time_zone text,
  session_id uuid,
  skill text,
  scheduled_at timestamptz,
  duration_hours numeric,
  meeting_details text,
  session_status text,
  closed_reason text,
  recipient_role text,
  partner_name text,
  review_rating smallint,
  review_comment text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.resolve_stale_sessions();
  perform public.enqueue_session_reminders();

  update public.notification_outbox o
  set sent_at = now(), skipped_reason = 'opted_out'
  from public.profiles p
  where p.id = o.recipient_id
    and o.sent_at is null
    and not p.email_notifications;

  return query
  with batch as (
    select o.id
    from public.notification_outbox o
    where o.sent_at is null
      and o.send_after <= now()
      and o.attempts < 5
    order by o.created_at
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
    for update skip locked
  ),
  claimed as (
    update public.notification_outbox o
    set attempts = o.attempts + 1,
        send_after = now() + (o.attempts + 1) * interval '10 minutes'
    from batch
    where o.id = batch.id
    returning o.id, o.kind, o.recipient_id, o.session_id
  )
  select
    c.id,
    c.kind,
    u.email::text,
    rp.full_name,
    coalesce(rp.notification_time_zone, rp.availability_time_zone, 'UTC'),
    s.id,
    s.skill,
    s.scheduled_at,
    s.duration_hours,
    s.meeting_details,
    s.status,
    s.closed_reason,
    case when s.learner_id = c.recipient_id then 'learner' else 'teacher' end,
    partner.full_name,
    r.rating,
    r.comment
  from claimed c
  join public.profiles rp on rp.id = c.recipient_id
  join auth.users u on u.id = c.recipient_id
  left join public.sessions s on s.id = c.session_id
  left join public.profiles partner
    on partner.id = case when s.learner_id = c.recipient_id then s.teacher_id else s.learner_id end
  left join public.session_reviews r on r.session_id = s.id;
end;
$$;

-- Records what happened to a claimed email: 'sent', 'skipped', or 'failed'.
create or replace function public.finish_notification(p_id uuid, p_result text, p_detail text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_result = 'sent' then
    update public.notification_outbox set sent_at = now(), last_error = null where id = p_id;
  elsif p_result = 'skipped' then
    update public.notification_outbox set sent_at = now(), skipped_reason = left(coalesce(p_detail, 'skipped'), 200) where id = p_id;
  elsif p_result = 'failed' then
    update public.notification_outbox set last_error = left(coalesce(p_detail, 'unknown error'), 500) where id = p_id;
  else
    raise exception using errcode = '22023', message = 'Unknown notification result.';
  end if;
end;
$$;

revoke all on function public.set_my_time_zone(text) from public, anon;
grant execute on function public.set_my_time_zone(text) to authenticated;
revoke all on function public.enqueue_notification(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.queue_session_notifications() from public, anon, authenticated;
revoke all on function public.queue_review_notification() from public, anon, authenticated;
revoke all on function public.enqueue_session_reminders() from public, anon, authenticated;
revoke all on function public.claim_notifications(integer) from public, anon, authenticated;
revoke all on function public.finish_notification(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
grant execute on function public.finish_notification(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Account deletion
-- Deleting a sign-in (from the app or the Supabase dashboard) keeps an
-- anonymised "Deleted member" profile so partners keep their session history,
-- reviews, and earned credits. Open sessions are settled first so no one's
-- credits are left held.
-- ---------------------------------------------------------------------------

-- Profiles outlive their auth user, so the profile no longer cascades from it.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

create or replace function public.close_member_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session record;
begin
  for v_session in
    select s.id, s.status
    from public.sessions s
    where s.status in ('requested', 'confirmed', 'in_progress')
      and p_user_id in (s.learner_id, s.teacher_id)
    order by s.id
  loop
    if v_session.status = 'in_progress' then
      -- Both partners started it, so it counts as taught.
      perform public.complete_session(v_session.id, 'auto_completed');
    else
      perform public.release_session_hold(v_session.id, 'cancelled');
    end if;
  end loop;

  delete from public.availability_windows where user_id = p_user_id;
  delete from public.notification_outbox where recipient_id = p_user_id;
  delete from public.wallet_transactions where user_id = p_user_id;

  update public.profiles
  set full_name = 'Deleted member',
      bio = '',
      location = '',
      languages = '{}',
      timezone = '',
      availability = '',
      teaching_skills = '{}',
      learning_skills = '{}',
      avatar_path = null,
      onboarding_complete = false,
      role = 'member',
      credit_balance = 0,
      pending_credits = 0,
      email_notifications = false,
      notification_time_zone = null,
      availability_time_zone = null,
      deleted_at = coalesce(deleted_at, now())
  where id = p_user_id;
end;
$$;

create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.close_member_account(old.id);
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted_profile on auth.users;
create trigger on_auth_user_deleted_profile
before delete on auth.users
for each row execute function public.handle_auth_user_deleted();

revoke all on function public.close_member_account(uuid) from public, anon, authenticated;
revoke all on function public.handle_auth_user_deleted() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin tools
-- Every admin action goes through one of these functions, which check the
-- caller is an admin, refuse to act on the admin themselves, and record the
-- action and reason in admin_actions.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_user_id uuid,
  session_id uuid,
  review_id uuid,
  amount numeric(10, 2),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from anon, authenticated;

create or replace function public.assert_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.suspended_at is null and p.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;
  return auth.uid();
end;
$$;

create or replace function public.admin_log(
  p_action text,
  p_reason text,
  p_target_user_id uuid default null,
  p_session_id uuid default null,
  p_review_id uuid default null,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) not between 3 and 300 then
    raise exception using errcode = '22023', message = 'Give a reason of 3 to 300 characters.';
  end if;
  insert into public.admin_actions (admin_id, action, target_user_id, session_id, review_id, amount, reason)
  values (auth.uid(), p_action, p_target_user_id, p_session_id, p_review_id, p_amount, v_reason);
end;
$$;

-- Loads a member for an admin action, refusing the admin themselves, other admins, and deleted members.
create or replace function public.admin_target_member(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := public.assert_admin();
  v_member public.profiles%rowtype;
begin
  if p_user_id = v_admin_id then
    raise exception using errcode = '22023', message = 'You can''t use admin tools on your own account.';
  end if;
  select * into v_member from public.profiles where id = p_user_id for update;
  if not found or v_member.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'Member not found.';
  end if;
  if v_member.role = 'admin' then
    raise exception using errcode = '22023', message = 'Change this admin''s role to member before using admin tools on them.';
  end if;
  return v_member;
end;
$$;

-- Suspends a member: blocks their actions, hides them from Explore, and
-- cancels their requested and confirmed sessions with refunds.
create or replace function public.admin_suspend_member(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.profiles%rowtype := public.admin_target_member(p_user_id);
  v_session record;
begin
  if v_member.suspended_at is not null then
    raise exception using errcode = '22023', message = 'This member is already suspended.';
  end if;
  perform public.admin_log('suspend_member', p_reason, p_user_id);

  update public.profiles
  set suspended_at = now(), suspension_reason = btrim(p_reason)
  where id = p_user_id;

  for v_session in
    select s.id from public.sessions s
    where s.status in ('requested', 'confirmed')
      and p_user_id in (s.learner_id, s.teacher_id)
    order by s.id
  loop
    perform public.release_session_hold(v_session.id, 'admin_cancelled');
  end loop;
end;
$$;

create or replace function public.admin_unsuspend_member(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.profiles%rowtype := public.admin_target_member(p_user_id);
begin
  if v_member.suspended_at is null then
    raise exception using errcode = '22023', message = 'This member isn''t suspended.';
  end if;
  perform public.admin_log('unsuspend_member', p_reason, p_user_id);
  update public.profiles set suspended_at = null, suspension_reason = null where id = p_user_id;
end;
$$;

-- Adds (positive) or removes (negative) available credits, recorded in the member's wallet.
create or replace function public.admin_adjust_credits(p_user_id uuid, p_amount numeric, p_reason text)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.profiles%rowtype := public.admin_target_member(p_user_id);
  v_balance numeric;
begin
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100 or p_amount <> round(p_amount, 2) then
    raise exception using errcode = '22023', message = 'Enter an amount between -100 and 100 credits, other than 0.';
  end if;
  if v_member.credit_balance + p_amount < 0 then
    raise exception using errcode = '22023', message = 'That would leave the member with a negative balance.';
  end if;
  perform public.admin_log('adjust_credits', p_reason, p_user_id, null, null, p_amount);

  update public.profiles
  set credit_balance = credit_balance + p_amount
  where id = p_user_id
  returning credit_balance into v_balance;

  insert into public.wallet_transactions (user_id, kind, title, detail, amount)
  values (
    p_user_id,
    'adjustment',
    case when p_amount > 0 then 'Credits added by the community team' else 'Credits removed by the community team' end,
    left(btrim(p_reason), 200),
    p_amount
  );
  return v_balance;
end;
$$;

create or replace function public.admin_set_review_hidden(p_review_id uuid, p_hidden boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.session_reviews%rowtype;
begin
  perform public.assert_admin();
  select * into v_review from public.session_reviews where id = p_review_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Review not found.';
  end if;
  if (v_review.hidden_at is not null) = p_hidden then
    raise exception using errcode = '22023', message = case when p_hidden then 'This review is already hidden.' else 'This review isn''t hidden.' end;
  end if;
  perform public.admin_log(case when p_hidden then 'hide_review' else 'unhide_review' end, p_reason, v_review.teacher_id, v_review.session_id, p_review_id);
  update public.session_reviews
  set hidden_at = case when p_hidden then now() end,
      hidden_reason = case when p_hidden then btrim(p_reason) end
  where id = p_review_id;
end;
$$;

-- Cancels an open session (including one in progress) and refunds the learner,
-- or ('complete') closes a confirmed or in-progress session and pays the teacher.
create or replace function public.admin_resolve_session(p_session_id uuid, p_resolution text, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.sessions%rowtype;
begin
  perform public.assert_admin();
  if p_resolution is null or p_resolution not in ('cancel', 'complete') then
    raise exception using errcode = '22023', message = 'Choose to cancel or complete the session.';
  end if;
  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Session not found.';
  end if;
  if auth.uid() in (v_session.learner_id, v_session.teacher_id) then
    raise exception using errcode = '22023', message = 'You can''t use admin tools on your own sessions.';
  end if;
  perform public.admin_log(p_resolution || '_session', p_reason, null, p_session_id);

  if p_resolution = 'cancel' then
    if v_session.status not in ('requested', 'confirmed', 'in_progress') then
      raise exception using errcode = '22023', message = 'Only an open session can be cancelled.';
    end if;
    perform public.release_session_hold(p_session_id, 'admin_cancelled');
    return 'cancelled';
  end if;

  if v_session.status not in ('confirmed', 'in_progress') then
    raise exception using errcode = '22023', message = 'Only a confirmed or in-progress session can be completed.';
  end if;
  perform public.complete_session(p_session_id, 'admin_completed');
  return 'completed';
end;
$$;

create or replace function public.admin_delete_announcement(p_announcement_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  delete from public.admin_announcements where id = p_announcement_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'Announcement not found.';
  end if;
  perform public.admin_log('delete_announcement', p_reason);
end;
$$;

drop function if exists public.get_admin_overview(text);
create function public.get_admin_overview(p_search text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_result jsonb;
begin
  perform public.assert_admin();

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'members', (select count(*) from public.profiles where deleted_at is null),
      'onboardedMembers', (select count(*) from public.profiles where onboarding_complete and deleted_at is null),
      'suspendedMembers', (select count(*) from public.profiles where suspended_at is not null),
      'sessions', (select count(*) from public.sessions),
      'pendingRequests', (select count(*) from public.sessions where status = 'requested'),
      'activeSessions', (select count(*) from public.sessions where status in ('confirmed', 'in_progress')),
      'completedSessions', (select count(*) from public.sessions where status = 'completed'),
      'hiddenReviews', (select count(*) from public.session_reviews where hidden_at is not null)
    ),
    'members', coalesce((
      select jsonb_agg(to_jsonb(member_row) order by member_row.created_at desc)
      from (
        select
          p.id, p.full_name, u.email, p.location, p.timezone, p.onboarding_complete, p.role,
          p.credit_balance, p.pending_credits, p.suspended_at, p.suspension_reason, p.deleted_at, p.created_at
        from public.profiles p
        left join auth.users u on u.id = p.id
        where v_search is null
          or p.full_name ilike '%' || v_search || '%'
          or u.email ilike '%' || v_search || '%'
        order by p.created_at desc
        limit 100
      ) member_row
    ), '[]'::jsonb),
    'recentSessions', coalesce((
      select jsonb_agg(to_jsonb(session_row) order by session_row.open desc, session_row.scheduled_at desc)
      from (
        select
          s.id, s.skill, s.scheduled_at, s.duration_hours, s.status, s.closed_reason,
          s.learner_started, s.teacher_started, s.learner_ended, s.teacher_ended, s.created_at,
          s.status in ('requested', 'confirmed', 'in_progress') as open,
          learner.full_name as learner_name,
          teacher.full_name as teacher_name
        from public.sessions s
        join public.profiles learner on learner.id = s.learner_id
        join public.profiles teacher on teacher.id = s.teacher_id
        order by (s.status in ('requested', 'confirmed', 'in_progress')) desc, s.scheduled_at desc
        limit 100
      ) session_row
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(to_jsonb(review_row) order by review_row.created_at desc)
      from (
        select
          r.id, r.rating, r.comment, r.hidden_at, r.hidden_reason, r.created_at, s.skill,
          reviewer.full_name as reviewer_name,
          teacher.full_name as teacher_name
        from public.session_reviews r
        join public.sessions s on s.id = r.session_id
        join public.profiles reviewer on reviewer.id = r.reviewer_id
        join public.profiles teacher on teacher.id = r.teacher_id
        order by r.created_at desc
        limit 50
      ) review_row
    ), '[]'::jsonb),
    'announcements', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from (
        select id, title, message, created_at
        from public.admin_announcements
        order by created_at desc
        limit 20
      ) a
    ), '[]'::jsonb),
    'actions', coalesce((
      select jsonb_agg(to_jsonb(action_row) order by action_row.created_at desc)
      from (
        select
          a.id, a.action, a.amount, a.reason, a.created_at,
          coalesce(admin.full_name, 'Former admin') as admin_name,
          target.full_name as target_name,
          s.skill as session_skill
        from public.admin_actions a
        left join public.profiles admin on admin.id = a.admin_id
        left join public.profiles target on target.id = a.target_user_id
        left join public.sessions s on s.id = a.session_id
        order by a.created_at desc
        limit 50
      ) action_row
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.assert_active_member() from public, anon;
grant execute on function public.assert_active_member() to authenticated;
revoke all on function public.assert_admin() from public, anon, authenticated;
revoke all on function public.admin_log(text, text, uuid, uuid, uuid, numeric) from public, anon, authenticated;
revoke all on function public.admin_target_member(uuid) from public, anon, authenticated;
revoke all on function public.admin_suspend_member(uuid, text) from public, anon;
revoke all on function public.admin_unsuspend_member(uuid, text) from public, anon;
revoke all on function public.admin_adjust_credits(uuid, numeric, text) from public, anon;
revoke all on function public.admin_set_review_hidden(uuid, boolean, text) from public, anon;
revoke all on function public.admin_resolve_session(uuid, text, text) from public, anon;
revoke all on function public.admin_delete_announcement(uuid, text) from public, anon;
revoke all on function public.get_admin_overview(text) from public, anon;
grant execute on function public.admin_suspend_member(uuid, text) to authenticated;
grant execute on function public.admin_unsuspend_member(uuid, text) to authenticated;
grant execute on function public.admin_adjust_credits(uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_review_hidden(uuid, boolean, text) to authenticated;
grant execute on function public.admin_resolve_session(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_announcement(uuid, text) to authenticated;
grant execute on function public.get_admin_overview(text) to authenticated;
