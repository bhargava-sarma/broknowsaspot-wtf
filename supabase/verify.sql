-- ---------------------------------------------------------------------
-- Post-migration check.
--
-- Run in the Supabase SQL Editor after both migrations. Read-only, and
-- not part of the migration sequence.
--
-- Deliberately ONE statement. The SQL Editor only renders the result of
-- the last statement it runs, so a multi-statement script silently hides
-- every check but the final one — including whether RLS is enabled, which
-- is the one worth stopping for.
--
-- Every row states its expected value and passes or fails against it.
-- Anything reading FAIL means the migration did not fully take.
-- ---------------------------------------------------------------------

select
  check_name,
  expected,
  actual,
  case when actual = expected then 'ok' else 'FAIL' end as status
from (
  values
    -- rows landed
    ('spots',           '14',
      (select count(*)::text from public.spots)),
    ('notes',           '16',
      (select count(*)::text from public.spot_notes)),

    -- the generated geography column computed for every row; without this
    -- the spatial index is decorative
    ('with_location',   '14',
      (select count(*)::text from public.spots
        where location is not null)),

    -- spatial index present
    ('gist_index',      '1',
      (select count(*)::text from pg_indexes
        where schemaname = 'public'
          and indexname = 'spots_location_idx')),

    -- Row level security. A FAIL on any of these means the table is
    -- readable by anyone holding the publishable key.
    ('rls_on_spots',    'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.spots'::regclass)),
    ('rls_on_notes',    'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.spot_notes'::regclass)),
    ('rls_on_reports',  'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.spot_reports'::regclass)),
    ('rls_on_submissions', 'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.submission_log'::regclass)),
    ('rls_on_admins',   'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.admins'::regclass)),
    ('rls_on_modlog',   'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.moderation_log'::regclass)),

    -- **The single most important row in this file.** There is no
    -- INSERT, UPDATE or DELETE policy anywhere in the schema, for any
    -- role, admins included. Public writes go through the service role;
    -- moderation goes through moderate_spot(). A number other than 0 here
    -- means someone added a write path that skips both.
    ('write_policies',  '0',
      (select count(*)::text from pg_policies
        where schemaname = 'public' and cmd <> 'SELECT')),
    ('policies_total',  '8',
      (select count(*)::text from pg_policies where schemaname = 'public')),

    -- Exactly two tables are readable without signing in. Reports,
    -- submissions, the admin roster and the moderation log are not among
    -- them, and that is the whole privacy model.
    ('anon_can_read',   'spot_notes,spots',
      (select string_agg(distinct tablename, ',' order by tablename)
        from pg_policies
        where schemaname = 'public' and 'anon' = any(roles))),

    -- The admin gate itself.
    ('is_admin_definer', 'true',
      (select prosecdef::text from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'is_admin')),
    ('anon_admin_access', '0',
      (select count(*)::text from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('is_admin', 'moderate_spot', 'admin_spot_queue',
                            'slugify', 'unique_slug')
          and has_function_privilege('anon', p.oid, 'execute'))),

    -- Same lint Supabase's Security Advisor runs: a definer function
    -- resolving names through a caller-controlled search_path is a
    -- privilege-escalation primitive.
    ('mutable_search_path', '0',
      (select count(*)::text from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prokind = 'f'
          and coalesce(array_to_string(p.proconfig, ','), '')
              not like '%search_path%')),

    -- the auto-hide trigger is attached; without it the threshold is inert
    ('threshold_trigger', '1',
      (select count(*)::text from pg_trigger
        where tgrelid = 'public.spot_reports'::regclass
          and tgname = 'spot_reports_apply_threshold'
          and not tgisinternal)),

    -- at least one admin exists, or nobody can reach /admin at all
    ('active_admins', 'true',
      (select (count(*) > 0)::text from public.admins
        where revoked_at is null)),

    -- geography actually computing distances, not just storing points
    ('km gjipe→vikos',  '88.0',
      (select round((extensions.ST_Distance(
         (select location from public.spots where slug = 'gjipe-beach-approach'),
         (select location from public.spots where slug = 'vikos-balcony')
       ) / 1000)::numeric, 1)::text)),
    ('km wieliczka→vikos', '1112.5',
      (select round((extensions.ST_Distance(
         (select location from public.spots where slug = 'wieliczka-lower-chamber'),
         (select location from public.spots where slug = 'vikos-balcony')
       ) / 1000)::numeric, 1)::text))
) as t(check_name, expected, actual);
