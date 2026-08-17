-- ---------------------------------------------------------------------
-- broknowsaspot.wtf — initial schema
--
-- Design notes worth knowing before changing anything here:
--
-- * lat/lng are the source of truth and mirror the TypeScript `Spot` type
--   exactly, so the API layer needs no conversion. `location` is a
--   generated geography column derived from them, which is what carries
--   the spatial index. Writers only ever set lat/lng; the two can't drift.
--
-- * Enums mirror the unions in src/lib/types/spot.ts. Adding a value there
--   means adding it here too — Postgres will reject an unknown label,
--   which is the failure we want rather than a silent text column.
--
-- * RLS is default-deny. The only public grant is reading spots that are
--   neither hidden nor removed. Every write goes through a route handler
--   using the service role, so there is deliberately no public insert
--   policy to get wrong.
-- ---------------------------------------------------------------------

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

set search_path = public, extensions;

-- ------------------------------------------------------------- enums --

do $$ begin
  create type spot_category as enum (
    'ruin', 'water', 'viewpoint', 'underground', 'shore', 'transit', 'structure'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type spot_difficulty as enum ('easy', 'moderate', 'hard', 'serious');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spot_access as enum ('open', 'permit', 'grey', 'private');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- spots --

create table if not exists public.spots (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,

  name          text not null,
  region        text not null,
  country       text not null,

  lat           double precision not null
                  check (lat between -90 and 90),
  lng           double precision not null
                  check (lng between -180 and 180),

  -- Derived, never written directly. This is what the GiST index covers,
  -- so "spots within N km" and viewport queries stay fast as the index
  -- grows past the point where a full scan is acceptable.
  location      extensions.geography(Point, 4326)
                  generated always as (
                    extensions.st_setsrid(
                      extensions.st_makepoint(lng, lat), 4326
                    )::extensions.geography
                  ) stored,

  category      spot_category   not null,
  difficulty    spot_difficulty not null,
  access        spot_access     not null,

  summary       text not null check (char_length(summary) between 10 and 140),
  description   text not null check (char_length(description) >= 40),
  watch_out     text not null check (char_length(watch_out) >= 10),
  best_window   text not null default '',
  walk_in_km    numeric(6, 2) not null default 0 check (walk_in_km >= 0),

  -- [{ src: string | null, alt: string }] — matches SpotPhoto[]. Becomes a
  -- real table when uploads land and photos need their own lifecycle.
  photos        jsonb not null default '[]'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Reversible: set by moderation or (later) by a report threshold. Kept
  -- distinct from removal so a brigade can be undone without losing data.
  hidden_at     timestamptz,
  hidden_reason text,

  -- Deliberate, permanent takedown by an admin.
  removed_at    timestamptz
);

comment on column public.spots.location is
  'Generated from lat/lng. Never write directly.';

create index if not exists spots_location_idx
  on public.spots using gist (location);

-- Covers the only listing query the site makes.
create index if not exists spots_visible_idx
  on public.spots (created_at desc)
  where hidden_at is null and removed_at is null;

create index if not exists spots_category_idx on public.spots (category);
create index if not exists spots_difficulty_idx on public.spots (difficulty);
create index if not exists spots_access_idx on public.spots (access);

-- ------------------------------------------------------------- notes --

create table if not exists public.spot_notes (
  id         uuid primary key default gen_random_uuid(),
  spot_id    uuid not null references public.spots(id) on delete cascade,

  author     text not null check (char_length(author) between 1 and 40),
  body       text not null check (char_length(body) between 10 and 2000),

  -- When the visit happened, which is the part that matters for staleness.
  -- Distinct from created_at, which is when it was typed.
  noted_on   date not null default current_date,
  created_at timestamptz not null default now(),

  hidden_at  timestamptz
);

create index if not exists spot_notes_spot_idx
  on public.spot_notes (spot_id, noted_on desc)
  where hidden_at is null;

-- --------------------------------------------------------- updated_at --

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists spots_touch_updated_at on public.spots;
create trigger spots_touch_updated_at
  before update on public.spots
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- rls --

alter table public.spots enable row level security;
alter table public.spot_notes enable row level security;

-- Read-only, and only what is meant to be visible. No insert/update/delete
-- policy exists for anon or authenticated, so those are denied by default.
-- The service role bypasses RLS entirely and is what route handlers use.

drop policy if exists "public reads visible spots" on public.spots;
create policy "public reads visible spots"
  on public.spots
  for select
  to anon, authenticated
  using (hidden_at is null and removed_at is null);

drop policy if exists "public reads visible notes" on public.spot_notes;
create policy "public reads visible notes"
  on public.spot_notes
  for select
  to anon, authenticated
  using (
    hidden_at is null
    and exists (
      select 1 from public.spots s
      where s.id = spot_notes.spot_id
        and s.hidden_at is null
        and s.removed_at is null
    )
  );
