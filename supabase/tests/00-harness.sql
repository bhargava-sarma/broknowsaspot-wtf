-- ---------------------------------------------------------------------
-- Local test harness. Never run this against a Supabase project — it
-- creates stand-ins for things Supabase provides, and the probe helpers
-- below can switch roles.
--
-- Supabase gives you `auth.users`, `auth.uid()` and the anon /
-- authenticated / service_role roles. A plain Postgres has none of them,
-- so the migrations cannot be applied — let alone their policies tested —
-- without the minimum versions here.
-- ---------------------------------------------------------------------

create schema if not exists extensions;
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text not null
);

-- The real one reads the request's JWT. This reads a GUC, so a test can
-- "become" a given user.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin create role anon nologin;
  exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin;
  exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls;
  exception when duplicate_object then null; end $$;

grant usage on schema public, auth, extensions
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Supabase's default privileges, and the reason they live *here* rather
-- than in a file that runs after the migrations.
--
-- Supabase grants the API roles access to everything in `public` by
-- default and lets RLS do the narrowing for tables. Crucially these are
-- DEFAULT privileges: they attach at CREATE time, so a migration that
-- ends with `revoke execute ... from anon` wins, exactly as it does on a
-- real project.
--
-- This file used to hand out the same grants *after* the migrations ran,
-- which silently undid every REVOKE they performed and made
-- anon_admin_access look clean locally while it was 5 in production.
-- Setting them up front is the only faithful order.
-- ---------------------------------------------------------------------

alter default privileges in schema public
  grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
