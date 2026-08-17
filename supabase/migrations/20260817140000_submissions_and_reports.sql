-- ---------------------------------------------------------------------
-- Submissions and reports.
--
-- Two write paths open up here, both of which run server-side on the
-- service role. There are still no public INSERT policies — RLS stays
-- default-deny, and the route handlers are the only way in, which is what
-- lets validation, bot checks and rate limiting be unskippable.
--
-- Moderation model, per the product decision: a spot is auto-hidden once
-- **10 distinct people** report it, and every reason counts the same. No
-- fast lane for safety reports.
--
-- The threshold deliberately lives here and nowhere else. It is never sent
-- to the client and never shown in the UI: publishing "10 reports removes
-- a spot" is an instruction manual for brigading.
-- ---------------------------------------------------------------------

set search_path = public, extensions;

-- ------------------------------------------------------------ reasons --

do $$ begin
  create type report_reason as enum (
    'dangerous',       -- physically unsafe / bad intel that could hurt someone
    'illegal_access',  -- encourages entering somewhere it is not ok to enter
    'private_info',    -- exposes a person, address or anything identifying
    'inaccurate',      -- wrong, stale, or the place isn't there
    'spam'             -- not a real entry
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------- submissions --
--
-- Audit log of accepted submissions, kept separate from `spots` on purpose:
-- it holds a hashed submitter key, and putting that on a publicly readable
-- table would leak a pseudonymous identifier with every spot fetch.
--
-- RLS is enabled with **no policies at all**, so anon and authenticated can
-- read exactly nothing here. Only the service role touches it.

create table if not exists public.submission_log (
  id            uuid primary key default gen_random_uuid(),
  spot_id       uuid references public.spots(id) on delete set null,

  -- sha256(ip + salt). Never the raw address.
  submitter_key text not null,

  created_at    timestamptz not null default now()
);

create index if not exists submission_log_key_idx
  on public.submission_log (submitter_key, created_at desc);

alter table public.submission_log enable row level security;

-- ----------------------------------------------------------- reports --

create table if not exists public.spot_reports (
  id           uuid primary key default gen_random_uuid(),
  spot_id      uuid not null references public.spots(id) on delete cascade,

  reason       report_reason not null,
  detail       text check (detail is null or char_length(detail) <= 500),

  -- sha256(ip + salt). The unique constraint below is what makes the
  -- threshold count *distinct people* rather than distinct clicks — one
  -- person hammering the button cannot move it past 1.
  reporter_key text not null,

  created_at   timestamptz not null default now(),

  unique (spot_id, reporter_key)
);

create index if not exists spot_reports_spot_idx
  on public.spot_reports (spot_id);

alter table public.spot_reports enable row level security;

-- No policies: reports are write-only through the service role, and the
-- public has no business reading who reported what.

-- -------------------------------------------------- the 10 threshold --

create or replace function public.apply_report_threshold()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- FLAT: every reason counts the same, per the product decision.
  threshold constant int := 10;
  reporters int;
begin
  -- unique (spot_id, reporter_key) means this count is already a count of
  -- distinct reporters, not of report rows.
  select count(*) into reporters
  from public.spot_reports
  where spot_id = new.spot_id;

  if reporters >= threshold then
    -- Hide, never delete. A threshold can be reached by a coordinated
    -- group as easily as by a genuine one, so this has to be reversible
    -- and has to leave the evidence in place.
    update public.spots
    set hidden_at = now(),
        hidden_reason = 'auto-hidden at ' || reporters || ' reports'
    where id = new.spot_id
      and hidden_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists spot_reports_apply_threshold on public.spot_reports;
create trigger spot_reports_apply_threshold
  after insert on public.spot_reports
  for each row execute function public.apply_report_threshold();

-- ---------------------------------------------------- slug generation --
--
-- Submissions arrive with a name, not a slug. Doing this in the database
-- means the uniqueness check and the insert are one atomic step — two
-- people submitting "gjipe cove" at the same moment cannot both win a
-- read-then-write race in application code.

create or replace function public.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        -- Fold accents first. Without this, stripping non-[a-z0-9] turns
        -- "vlorë" into "vlor" and "å" into nothing at all — and this index
        -- is mostly places whose names carry diacritics.
        translate(
          lower(coalesce(input, '')),
          'àáâãäåāăąèéêëēĕėęěìíîïĩīĭįıòóôõöøōŏőùúûüũūŭůűųçćĉċčñńņňýÿŷđðþßæœ',
          'aaaaaaaaaeeeeeeeeeiiiiiiiiiooooooooouuuuuuuuuucccccnnnnyyyddtsao'
        ),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-{2,}', '-', 'g'
    )
  );
$$;

create or replace function public.unique_slug(input text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  base      text := public.slugify(input);
  candidate text;
  n         int := 1;
begin
  if base = '' then base := 'spot'; end if;
  candidate := base;

  while exists (select 1 from public.spots where slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  return candidate;
end;
$$;
