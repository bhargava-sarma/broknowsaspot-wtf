\pset pager off
\pset footer off

-- ---------------------------------------------------------------------
-- The scenario the admin screen exists for, start to finish: a spot is
-- brigaded past the report threshold, an admin looks at it and puts it
-- back, and an eleventh reporter pushes it down again.
--
-- Fixtures come from 02-probe.sql. :A is the admin.
-- ---------------------------------------------------------------------

\set A '''11111111-1111-1111-1111-111111111111''::uuid'

create temp table flow (step int, check_name text, expected text, actual text);

-- Each mutation gets its own statement. Sub-selects inside one INSERT all
-- read the snapshot taken when that INSERT began, so an assertion sharing
-- a statement with the change it is checking would read stale rows.

-- ---- ten distinct reporters: exactly the trigger's threshold
insert into public.spot_reports (spot_id, reason, reporter_key)
select (select id from public.spots where slug='vikos-balcony'), 'dangerous', 'key-'||g
from generate_series(1,10) g;

insert into flow values
  (1,'auto-hidden at 10 reports','true',
    (select (hidden_at is not null)::text from public.spots where slug='vikos-balcony')),
  (2,'reason records the count','auto-hidden at 10 reports',
    (select hidden_reason from public.spots where slug='vikos-balcony')),
  (3,'public loses it','13',
    (select count(*)::text from public.spots where hidden_at is null and removed_at is null)),
  (4,'the trigger writes no log','0',
    (select count(*)::text from public.moderation_log)),
  (5,'queue puts it at the top','vikos-balcony',
    public.probe_value(:A,'select slug from public.admin_spot_queue() limit 1')),
  (6,'queue carries the count','10',
    public.probe_value(:A,$q$select report_count::text from public.admin_spot_queue()
      where slug='vikos-balcony'$q$)),
  (7,'queue carries the reasons','{dangerous}',
    public.probe_value(:A,$q$select reasons::text from public.admin_spot_queue()
      where slug='vikos-balcony'$q$)),
  (8,'queue lists hidden and visible alike','14',
    public.probe_value(:A,'select count(*)::text from public.admin_spot_queue()'));

-- ---- the admin looks at it and puts it back
insert into flow values (9,'admin restores it','vikos-balcony',
  public.probe_value(:A,$q$select slug from public.moderate_spot(
    'vikos-balcony','restore','brigade, not a real problem')$q$));

insert into flow values
  (10,'visible again','true',
    (select (hidden_at is null and removed_at is null and hidden_reason is null)::text
      from public.spots where slug='vikos-balcony')),
  (11,'public gets it back','14',
    (select count(*)::text from public.spots where hidden_at is null and removed_at is null)),
  (12,'reports survive a restore','10',
    (select count(*)::text from public.spot_reports sr
      join public.spots s on s.id=sr.spot_id where s.slug='vikos-balcony')),
  (13,'restore is logged, with an actor','restore/admin@example.com',
    (select m.action::text||'/'||a.email from public.moderation_log m
      join public.admins a on a.user_id=m.actor_id order by m.created_at desc limit 1)),
  (14,'log keeps the reason given','brigade, not a real problem',
    (select reason from public.moderation_log order by created_at desc limit 1));

-- ---- an 11th reporter after the admin cleared it. The threshold is >=,
--      so this re-hides: one admin decision does not immunise a spot.
insert into public.spot_reports (spot_id, reason, reporter_key)
values ((select id from public.spots where slug='vikos-balcony'),'spam','key-11');

insert into flow values
  (15,'an 11th report re-hides it','true',
    (select (hidden_at is not null)::text from public.spots where slug='vikos-balcony')),
  (16,'and the queue shows both reasons','{dangerous,spam}',
    public.probe_value(:A,$q$select reasons::text from public.admin_spot_queue()
      where slug='vikos-balcony'$q$));

-- ---- removal
insert into flow values (17,'admin removes another','wieliczka-lower-chamber',
  public.probe_value(:A,$q$select slug from public.moderate_spot(
    'wieliczka-lower-chamber','remove','landowner asked')$q$));

insert into flow values
  (18,'removal sets both stamps','true',
    (select (hidden_at is not null and removed_at is not null)::text
      from public.spots where slug='wieliczka-lower-chamber')),
  (19,'public down to 12','12',
    (select count(*)::text from public.spots where hidden_at is null and removed_at is null)),
  (20,'two log rows now','2',
    (select count(*)::text from public.moderation_log));

-- ---- restore also un-removes
insert into flow values (21,'admin restores the removed one','wieliczka-lower-chamber',
  public.probe_value(:A,$q$select slug from public.moderate_spot(
    'wieliczka-lower-chamber','restore',null)$q$));

insert into flow values
  (22,'un-removed','true',
    (select (hidden_at is null and removed_at is null)::text
      from public.spots where slug='wieliczka-lower-chamber')),
  (23,'log now has three','3',
    (select count(*)::text from public.moderation_log)),
  (24,'updated_at moved with the change','true',
    (select (updated_at > created_at)::text
      from public.spots where slug='wieliczka-lower-chamber'));

select check_name, expected, actual,
       case when actual = expected then 'ok' else 'FAIL' end as status
from flow order by step;
