-- ---------------------------------------------------------------------
-- Admin auth and moderation.
--
-- Until now the only way to un-hide a spot was to edit a row in the
-- Supabase Table Editor. That is fine for one person with the dashboard
-- open and untenable the moment a coordinated group pushes something past
-- the report threshold at 3am.
--
-- The model here is deliberately *not* "the app checks who you are and
-- then uses the service role". Admin reads run as the signed-in user
-- under RLS, and the single admin write runs through a function that
-- checks membership itself. Either way authorisation is enforced by
-- Postgres — the same place the public rules are enforced — so a bug in
-- the app's guard leaks nothing, because the database refuses anyway.
--
-- Three gates sit in front of every mutation, and they fail independently:
--
--   1. middleware redirects an unauthenticated request away from /admin
--   2. the page and every server action re-check membership server-side
--   3. RLS policies and `moderate_spot()` check `is_admin()` in Postgres
--
-- Gate 3 is the one that actually matters. The other two exist so the
-- failure is a redirect instead of an error.
--
-- Being *authenticated* is not being an *admin*. Supabase projects allow
-- public sign-up by default, so a bare `auth.uid() is not null` check
-- would hand moderation to anyone who could reach the sign-up endpoint.
-- Membership in `public.admins` is the gate; sign-up grants nothing.
-- ---------------------------------------------------------------------

set search_path = public, extensions;

-- ------------------------------------------------------------ admins --
--
-- Keyed to auth.users. Rows are created by hand (SQL editor) — there is
-- no self-service path to becoming an admin, by design.

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,

  -- Denormalised copy, so the moderation log can name an actor without
  -- the app ever needing to read auth.users. Goes stale if the account's
  -- email changes; it is a label, never an identity check.
  email      text not null,

  added_at   timestamptz not null default now(),
  -- Revoking beats deleting: the moderation log's foreign key stays
  -- intact, so past actions keep their author.
  revoked_at timestamptz,
  note       text
);

alter table public.admins enable row level security;

-- --------------------------------------------------------- is_admin --
--
-- security definer so it can read `admins` from inside a policy on some
-- other table without every one of those tables needing its own view of
-- `admins`. search_path is pinned empty: a definer function that resolves
-- names through a caller-controlled search_path is a privilege-escalation
-- primitive.
--
-- `(select auth.uid())` rather than a bare call so the planner treats it
-- as an InitPlan and evaluates it once per statement instead of per row.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where user_id = (select auth.uid())
      and revoked_at is null
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- An admin may see the roster; nobody else may see it exists. This does
-- not recurse: is_admin() is security definer, so it reads `admins` as
-- the owner and the policy below is not re-entered.
drop policy if exists "admins read the roster" on public.admins;
create policy "admins read the roster"
  on public.admins
  for select
  to authenticated
  using (public.is_admin());

-- --------------------------------------------------- moderation log --
--
-- Moderation without an audit trail is how you get an entry that nobody
-- can explain. Append-only in practice: no update or delete policy
-- exists for any role, so even an admin cannot rewrite it through the
-- API.

do $$ begin
  create type moderation_action as enum ('hide', 'restore', 'remove');
exception when duplicate_object then null; end $$;

create table if not exists public.moderation_log (
  id         uuid primary key default gen_random_uuid(),
  spot_id    uuid not null references public.spots(id) on delete cascade,

  action     moderation_action not null,
  reason     text check (reason is null or char_length(reason) <= 500),

  -- Null when the row was written by an automated path rather than a
  -- person. Nothing writes those today; the auto-hide trigger predates
  -- this table and is left alone deliberately (see below).
  actor_id   uuid references public.admins(user_id) on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists moderation_log_spot_idx
  on public.moderation_log (spot_id, created_at desc);

alter table public.moderation_log enable row level security;

drop policy if exists "admins read the moderation log" on public.moderation_log;
create policy "admins read the moderation log"
  on public.moderation_log
  for select
  to authenticated
  using (public.is_admin());

-- No insert policy. Rows are written only by moderate_spot() below, which
-- is security definer — so the log cannot be forged by an admin hitting
-- the REST API directly with a made-up actor_id.

-- ------------------------------------------------------ admin reads --
--
-- Each of these is additive: the existing public SELECT policy is
-- untouched, and anonymous readers never evaluate these because of the
-- `to authenticated` clause.

-- Hidden and removed spots are invisible to the public policy, which is
-- the whole point of hiding them — and also why an admin needs a second
-- policy to see the queue at all.
drop policy if exists "admins read every spot" on public.spots;
create policy "admins read every spot"
  on public.spots
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins read every note" on public.spot_notes;
create policy "admins read every note"
  on public.spot_notes
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins read reports" on public.spot_reports;
create policy "admins read reports"
  on public.spot_reports
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins read submissions" on public.submission_log;
create policy "admins read submissions"
  on public.submission_log
  for select
  to authenticated
  using (public.is_admin());

-- ----------------------------------------------------- admin writes --
--
-- There are none. Deliberately: no INSERT, UPDATE or DELETE policy exists
-- on any table in this schema, for any role, including admins.
--
-- The tempting version of this file grants admins `update` on `spots` so
-- the dashboard can just PATCH a row. That would also let an admin clear
-- `hidden_at` straight through the REST API with no audit row — and a
-- moderation log that can be sidestepped by the people it exists to
-- record is not a moderation log.
--
-- So the only way a spot's visibility changes is moderate_spot() below,
-- which writes the state change and its log entry in one transaction.
-- "Every visibility change is logged" is then true by construction
-- rather than by everyone remembering to call the right function.

-- ------------------------------------------------- moderate_spot() --
--
-- One statement, one audit row, one transaction. Doing this as two calls
-- from the app would leave the possibility of a state change with no log
-- entry, which is exactly the failure the log exists to prevent.
--
-- security definer, because the log has no insert policy — the function
-- is the only writer. It re-checks is_admin() first, so definer rights
-- are never exercised on behalf of a non-admin.
--
-- `restore` clears both flags. A moderator thinks in terms of "put it
-- back", not "which of the two timestamps is set", and leaving one set
-- would silently no-op from their point of view.

create or replace function public.moderate_spot(
  target_slug text,
  action      text,
  reason      text default null
)
returns table (slug text, hidden_at timestamptz, removed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor  uuid := (select auth.uid());
  target public.spots%rowtype;
  act    public.moderation_action;
begin
  if not public.is_admin() then
    raise exception 'not authorised'
      using errcode = '42501';
  end if;

  -- Cast rather than accept the text: an unknown verb has to fail loudly
  -- here, not fall through to a no-op that reads as success.
  begin
    act := action::public.moderation_action;
  exception when invalid_text_representation then
    raise exception 'unknown moderation action: %', action
      using errcode = '22023';
  end;

  select * into target
  from public.spots
  where public.spots.slug = target_slug
  for update;

  if not found then
    raise exception 'no such spot: %', target_slug
      using errcode = 'P0002';
  end if;

  if act = 'hide' then
    update public.spots s
    set hidden_at = now(),
        hidden_reason = coalesce(nullif(btrim(reason), ''), 'hidden by an admin')
    where s.id = target.id;

  elsif act = 'restore' then
    update public.spots s
    set hidden_at = null,
        hidden_reason = null,
        removed_at = null
    where s.id = target.id;

  elsif act = 'remove' then
    update public.spots s
    set removed_at = now(),
        hidden_at = coalesce(s.hidden_at, now()),
        hidden_reason = coalesce(nullif(btrim(reason), ''), s.hidden_reason,
                                 'removed by an admin')
    where s.id = target.id;
  end if;

  insert into public.moderation_log (spot_id, action, reason, actor_id)
  values (target.id, act, nullif(btrim(reason), ''), actor);

  return query
    select s.slug, s.hidden_at, s.removed_at
    from public.spots s
    where s.id = target.id;
end;
$$;

revoke execute on function public.moderate_spot(text, text, text) from public;
grant execute on function public.moderate_spot(text, text, text) to authenticated;

-- --------------------------------------------- the moderation queue --
--
-- One round trip for the whole dashboard. Aggregating report counts in
-- the app would mean shipping every report row to the server just to
-- length() them, and reports are the one table whose contents should
-- travel as little as possible.
--
-- security invoker: this reads, and RLS is already the right gate for
-- reads. The is_admin() check is belt to that braces — without it a
-- non-admin would get an empty set rather than an error, and an empty
-- moderation queue is a dangerous thing to render as "all clear".

create or replace function public.admin_spot_queue()
returns table (
  slug           text,
  name           text,
  region         text,
  country        text,
  created_at     timestamptz,
  hidden_at      timestamptz,
  hidden_reason  text,
  removed_at     timestamptz,
  report_count   bigint,
  last_report_at timestamptz,
  reasons        text[]
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised'
      using errcode = '42501';
  end if;

  return query
    select
      s.slug, s.name, s.region, s.country, s.created_at,
      s.hidden_at, s.hidden_reason, s.removed_at,
      coalesce(r.report_count, 0) as report_count,
      r.last_report_at,
      coalesce(r.reasons, array[]::text[]) as reasons
    from public.spots s
    left join (
      select
        sr.spot_id,
        count(*)                        as report_count,
        max(sr.created_at)              as last_report_at,
        -- Distinct reasons, most-reported first: which *kind* of problem
        -- decides whether this needs a human in the next ten minutes.
        array_agg(distinct sr.reason::text) as reasons
      from public.spot_reports sr
      group by sr.spot_id
    ) r on r.spot_id = s.id
    -- Everything that needs a decision, then everything else. A spot with
    -- one report is not urgent but is exactly what you want to see before
    -- it becomes ten.
    order by
      (s.hidden_at is not null and s.removed_at is null) desc,
      coalesce(r.report_count, 0) desc,
      s.created_at desc;
end;
$$;

revoke execute on function public.admin_spot_queue() from public;
grant execute on function public.admin_spot_queue() to authenticated;

-- ---------------------------------------------------------------------
-- Note on the auto-hide trigger: it stays as it is, writing no log row.
-- It runs as the reporter, who is anonymous and is not an admin, so it
-- cannot insert into moderation_log without either a policy that lets
-- anonymous writes into the audit table or a second definer function.
-- Both are worse than the status quo: `hidden_reason` already records
-- 'auto-hidden at N reports', and the queue above shows the count that
-- caused it. The log stays a record of *human* decisions.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Tidy-up, while we are auditing grants.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, so these
-- two have been callable by anonymous clients since they were created.
-- Neither is dangerous — `unique_slug` returns a string and only reveals
-- which slugs already exist, which is public information — but they exist
-- to serve the submission route, which runs on the service role. Nothing
-- else should be able to spin them.
-- ---------------------------------------------------------------------

revoke execute on function public.slugify(text) from public;
revoke execute on function public.unique_slug(text) from public;
grant execute on function public.slugify(text) to service_role;
grant execute on function public.unique_slug(text) to service_role;
