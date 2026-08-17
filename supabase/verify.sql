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

    -- row level security. A FAIL on either of the next two means the
    -- tables are readable and writable by anyone holding the anon key.
    ('rls_on_spots',    'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.spots'::regclass)),
    ('rls_on_notes',    'true',
      (select relrowsecurity::text from pg_class
        where oid = 'public.spot_notes'::regclass)),
    ('rls_policies',    '2',
      (select count(*)::text from pg_policies
        where schemaname = 'public'
          and tablename in ('spots', 'spot_notes'))),

    -- no public write policy exists at all — not merely a narrow one
    ('public_writes',   '0',
      (select count(*)::text from pg_policies
        where schemaname = 'public'
          and tablename in ('spots', 'spot_notes')
          and cmd <> 'SELECT')),

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
