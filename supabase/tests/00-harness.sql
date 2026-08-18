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
