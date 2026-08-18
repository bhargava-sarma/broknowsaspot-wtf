\pset pager off
\pset footer off

-- ---------------------------------------------------------------------
-- Who can see and do what.
--
-- Read this as one table: every row is a thing someone might try, and
-- what the database is supposed to say. Fixtures come from 02-probe.sql —
-- :A is an admin, :N is a signed-in nobody, :R is a revoked admin, and a
-- null user probes as anon.
--
-- Every one of these must read `ok`. A FAIL is not a broken test, it is a
-- hole.
-- ---------------------------------------------------------------------

\set A '''11111111-1111-1111-1111-111111111111''::uuid'
\set N '''22222222-2222-2222-2222-222222222222''::uuid'
\set R '''33333333-3333-3333-3333-333333333333''::uuid'

select check_name, expected, actual,
       case when actual = expected then 'ok' else 'FAIL' end as status
from (values

  -- ---------------------------------------------------- anon can read
  ('anon reads visible spots',        'rows:14',
    public.probe(null, 'select 1 from public.spots')),

  -- --------------------------------------- anon can read nothing else
  ('anon reads reports',              'rows:0',
    public.probe(null, 'select 1 from public.spot_reports')),
  ('anon reads submissions',          'rows:0',
    public.probe(null, 'select 1 from public.submission_log')),
  ('anon reads admin roster',         'rows:0',
    public.probe(null, 'select 1 from public.admins')),
  ('anon reads moderation log',       'rows:0',
    public.probe(null, 'select 1 from public.moderation_log')),

  -- ------------------------------------------------ anon cannot write
  ('anon updates a spot',             'rows:0',
    public.probe(null, 'update public.spots set hidden_at = now()')),
  ('anon deletes a spot',             'rows:0',
    public.probe(null, 'delete from public.spots')),
  ('anon inserts a spot',             '42501',
    public.probe(null, $q$insert into public.spots
      (slug,name,region,country,lat,lng,category,difficulty,access,summary,description,watch_out)
      values ('x','x','x','x',0,0,'ruin','easy','open','aaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','aaaaaaaaaaaa')$q$)),

  -- -------------------------------- anon cannot reach admin functions
  ('anon calls the queue',            '42501',
    public.probe(null, 'select 1 from public.admin_spot_queue()')),
  ('anon calls moderate_spot',        '42501',
    public.probe(null, $q$select 1 from public.moderate_spot('vikos-balcony','hide',null)$q$)),

  -- -------------------------- a signed-in non-admin is still a nobody
  ('non-admin is_admin()',            'rows:0',
    public.probe(:N, 'select 1 where public.is_admin()')),
  ('admin is_admin()',                'rows:1',
    public.probe(:A, 'select 1 where public.is_admin()')),
  ('revoked admin is_admin()',        'rows:0',
    public.probe(:R, 'select 1 where public.is_admin()')),
  ('non-admin reads reports',         'rows:0',
    public.probe(:N, 'select 1 from public.spot_reports')),
  ('non-admin reads roster',          'rows:0',
    public.probe(:N, 'select 1 from public.admins')),
  -- 14 is the whole seed set and none of it is hidden yet, so this says
  -- "sees the public view, nothing more". 04-moderation-flow.sql is where
  -- a hidden spot actually gets counted.
  ('non-admin sees the public view', 'rows:14',
    public.probe(:N, 'select 1 from public.spots')),
  ('non-admin calls the queue',       '42501',
    public.probe(:N, 'select 1 from public.admin_spot_queue()')),
  ('non-admin moderates',             '42501',
    public.probe(:N, $q$select 1 from public.moderate_spot('vikos-balcony','hide',null)$q$)),

  -- ------------------------------------ a revoked admin is a non-admin
  ('revoked admin calls the queue',   '42501',
    public.probe(:R, 'select 1 from public.admin_spot_queue()')),
  ('revoked admin moderates',         '42501',
    public.probe(:R, $q$select 1 from public.moderate_spot('vikos-balcony','hide',null)$q$)),

  -- ------------------------- an admin reads everything, writes nothing
  ('admin reads the queue',           'rows:14',
    public.probe(:A, 'select 1 from public.admin_spot_queue()')),
  ('admin reads reports',             'rows:0',
    public.probe(:A, 'select 1 from public.spot_reports')),
  ('admin reads roster',              'rows:2',
    public.probe(:A, 'select 1 from public.admins')),
  ('admin updates a spot directly',   'rows:0',
    public.probe(:A, 'update public.spots set hidden_at = null')),
  ('admin deletes a spot',            'rows:0',
    public.probe(:A, 'delete from public.spots')),
  ('admin forges a log row',          '42501',
    public.probe(:A, $q$insert into public.moderation_log (spot_id, action)
      values ((select id from public.spots limit 1), 'restore')$q$)),
  ('admin promotes a friend',         '42501',
    public.probe(:A, $q$insert into public.admins (user_id, email)
      values ('22222222-2222-2222-2222-222222222222','nobody@example.com')$q$)),
  ('admin un-revokes an admin',       'rows:0',
    public.probe(:A, 'update public.admins set revoked_at = null')),
  ('admin edits the log',             'rows:0',
    public.probe(:A, $q$update public.moderation_log set reason = 'rewritten'$q$)),
  ('admin deletes from the log',      'rows:0',
    public.probe(:A, 'delete from public.moderation_log')),

  -- ------------------------------------------- moderate_spot's inputs
  ('unknown action',                  '22023',
    public.probe(:A, $q$select 1 from public.moderate_spot('vikos-balcony','nuke',null)$q$)),
  ('unknown slug',                    'P0002',
    public.probe(:A, $q$select 1 from public.moderate_spot('no-such-slug','hide',null)$q$))

) as t(check_name, expected, actual);
