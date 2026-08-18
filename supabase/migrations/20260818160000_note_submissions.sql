-- ---------------------------------------------------------------------
-- The write path for community notes.
--
-- `spot_notes` has existed since the first migration and the detail page
-- has been rendering them, under a heading that says "nobody has logged a
-- note here yet" when a spot has none. Nobody could: there was no form,
-- no route, and no way in. This closes that.
--
-- Notes are the half of the loop that keeps the index true. Submitting a
-- spot is a one-shot act; conditions change afterwards — a gate gets
-- locked, a path washes out, a landowner puts up signs — and a dated note
-- is how that reaches the next person. Hence `noted_on` being separate
-- from `created_at`: when the visit happened is the part that decides
-- whether the information is still worth anything.
--
-- Two rules carried over from the spot write path, for the same reasons:
-- writes go through a route handler on the service role, so there is no
-- public INSERT policy here either; and moderation goes through a
-- function that writes its own audit row, so there is no UPDATE policy
-- either.
-- ---------------------------------------------------------------------

set search_path = public, extensions;

-- ---------------------------------------------------------- note_log --
--
-- Rate limiting needs a per-person counter, and the person is identified
-- by an HMAC of their address. That key must not live on `spot_notes`:
-- RLS is row-level, not column-level, so the public SELECT policy on that
-- table would hand `submitter_key` to anyone holding the publishable key
-- who asks for the column. A separate table with no policies at all is
-- the only place it is safe.
--
-- Separate from `submission_log` rather than a shared table with a `kind`
-- column, because the two deserve different budgets. Adding a spot is a
-- much larger act than leaving a note, and sharing one counter would let
-- either exhaust the other.

create table if not exists public.note_log (
  id            uuid primary key default gen_random_uuid(),
  note_id       uuid references public.spot_notes(id) on delete set null,

  -- HMAC of the client address, never the address. Weak identity by
  -- design: shared behind NAT, trivially rotated with a VPN. It raises
  -- the cost of flooding rather than making it impossible.
  submitter_key text not null,

  created_at    timestamptz not null default now()
);

create index if not exists note_log_key_idx
  on public.note_log (submitter_key, created_at desc);

alter table public.note_log enable row level security;

-- Deliberately no policy of any kind for anon or authenticated. The route
-- handler writes it on the service role, which bypasses RLS; the admin
-- read below is the only way anyone sees it.

drop policy if exists "admins read the note log" on public.note_log;
create policy "admins read the note log"
  on public.note_log
  for select
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------- moderation_log fk --
--
-- A note always belongs to a spot, so `spot_id` stays NOT NULL and the
-- note is an optional refinement. The log then reads the way a person
-- would say it: "hid a note on vikos-balcony".

alter table public.moderation_log
  add column if not exists note_id uuid
    references public.spot_notes(id) on delete set null;

-- ---------------------------------------------- moderate_note() --
--
-- Same shape as moderate_spot(): one transaction, one state change, one
-- audit row, and a membership check before definer rights are exercised
-- on anyone's behalf.
--
-- Only hide and restore. `remove` exists for spots because a spot can be
-- taken down permanently at a landowner's request and the distinction
-- from a reversible hide is worth keeping. A note is two sentences; there
-- is nothing a permanent tier would express that hiding does not.

create or replace function public.moderate_note(
  target_note_id uuid,
  action         text,
  reason         text default null
)
returns table (note_id uuid, hidden_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor  uuid := (select auth.uid());
  target public.spot_notes%rowtype;
  act    public.moderation_action;
begin
  if not public.is_admin() then
    raise exception 'not authorised'
      using errcode = '42501';
  end if;

  begin
    act := action::public.moderation_action;
  exception when invalid_text_representation then
    raise exception 'unknown moderation action: %', action
      using errcode = '22023';
  end;

  if act not in ('hide', 'restore') then
    raise exception 'notes support hide and restore only, not %', action
      using errcode = '22023';
  end if;

  select * into target
  from public.spot_notes
  where id = target_note_id
  for update;

  if not found then
    raise exception 'no such note: %', target_note_id
      using errcode = 'P0002';
  end if;

  if act = 'hide' then
    update public.spot_notes n
    set hidden_at = now()
    where n.id = target.id;
  else
    update public.spot_notes n
    set hidden_at = null
    where n.id = target.id;
  end if;

  insert into public.moderation_log (spot_id, note_id, action, reason, actor_id)
  values (target.spot_id, target.id, act, nullif(btrim(reason), ''), actor);

  return query
    select n.id, n.hidden_at
    from public.spot_notes n
    where n.id = target.id;
end;
$$;

revoke execute on function public.moderate_note(uuid, text, text)
  from public, anon;
grant execute on function public.moderate_note(uuid, text, text)
  to authenticated;

-- ------------------------------------------- the note review queue --
--
-- Newest first, hidden ones included. Unlike spots there is no report
-- threshold pushing notes upward, so recency is the only useful order:
-- what a moderator wants is "what arrived since I last looked".

create or replace function public.admin_note_queue(row_limit int default 100)
returns table (
  id         uuid,
  spot_slug  text,
  spot_name  text,
  author     text,
  body       text,
  noted_on   date,
  created_at timestamptz,
  hidden_at  timestamptz
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
    select n.id, s.slug, s.name, n.author, n.body,
           n.noted_on, n.created_at, n.hidden_at
    from public.spot_notes n
    join public.spots s on s.id = n.spot_id
    order by n.created_at desc
    limit greatest(1, least(row_limit, 500));
end;
$$;

revoke execute on function public.admin_note_queue(int) from public, anon;
grant execute on function public.admin_note_queue(int) to authenticated;

-- ---------------------------------------------------------------------
-- On what is *not* here: notes cannot be reported.
--
-- The report flow targets a spot, and an admin reviewing a reported spot
-- sees its notes alongside it, so abuse in a note is reachable today.
-- Note-level reports would mean a second threshold, a second reporter
-- key namespace and a second auto-hide path — worth building when notes
-- outgrow one person reading them, and not before.
--
-- `noted_on` is also not constrained to the past in the schema, though
-- the route rejects future dates. A CHECK cannot call current_date:
-- Postgres requires IMMUTABLE functions in a constraint and current_date
-- is only STABLE.
-- ---------------------------------------------------------------------
