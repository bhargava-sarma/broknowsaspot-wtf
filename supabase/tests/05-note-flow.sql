\pset pager off
\pset footer off

-- ---------------------------------------------------------------------
-- Hiding and restoring a community note, and what the public sees at
-- each step. Fixtures come from 02-probe.sql; :A is the admin.
--
-- Each mutation gets its own statement: sub-selects inside one INSERT all
-- read the snapshot taken when that INSERT began, so an assertion sharing
-- a statement with the change it checks would read stale rows.
-- ---------------------------------------------------------------------

\set A '''11111111-1111-1111-1111-111111111111''::uuid'

-- 04-moderation-flow.sql leaves vikos-balcony hidden, which also hides
-- its notes. Start from a known-visible index rather than carrying that
-- in as an unstated premise — the counts below would otherwise encode
-- another file's ending state.
select public.probe_value(:A,
  $q$select slug from public.moderate_spot('vikos-balcony','restore','test setup')$q$)
  as setup_restore \gset

create temp table nflow (step int, check_name text, expected text, actual text);

insert into nflow values
  (1, 'seeded notes are public', '16',
    public.probe_value(null, 'select count(*)::text from public.spot_notes')),
  (2, 'the note log starts empty', '0',
    (select count(*)::text from public.note_log)),
  (3, 'no note has been moderated', '0',
    (select count(*)::text from public.moderation_log where note_id is not null));

-- ---- an admin hides one
insert into nflow
select 4, 'admin hides a note', 'true',
  public.probe_value(:A, $q$select (hidden_at is not null)::text
    from public.moderate_note(
      (select id from public.spot_notes order by created_at, id limit 1),
      'hide', 'off-topic and abusive')$q$);

insert into nflow values
  (5, 'public loses it', '15',
    public.probe_value(null, 'select count(*)::text from public.spot_notes')),
  (6, 'an admin still sees it', '16',
    public.probe_value(:A, 'select count(*)::text from public.spot_notes')),
  (7, 'the note queue shows hidden ones too', '16',
    public.probe_value(:A, 'select count(*)::text from public.admin_note_queue()')),
  (8, 'logged against the note and its spot', 'hide/true/true',
    (select m.action::text
            || '/' || (m.note_id is not null)::text
            || '/' || (m.spot_id is not null)::text
       from public.moderation_log m
       where m.note_id is not null
       order by m.created_at desc limit 1)),
  (9, 'the reason is kept', 'off-topic and abusive',
    (select reason from public.moderation_log
      where note_id is not null order by created_at desc limit 1)),
  (10,'the actor is named', 'admin@example.com',
    (select a.email from public.moderation_log m
      join public.admins a on a.user_id = m.actor_id
      where m.note_id is not null order by m.created_at desc limit 1));

-- ---- and puts it back
insert into nflow
select 11, 'admin restores it', 'false',
  public.probe_value(:A, $q$select (hidden_at is not null)::text
    from public.moderate_note(
      (select id from public.spot_notes order by created_at, id limit 1),
      'restore', null)$q$);

insert into nflow values
  (12,'public gets it back', '16',
    public.probe_value(null, 'select count(*)::text from public.spot_notes')),
  (13,'two note log rows now', '2',
    (select count(*)::text from public.moderation_log where note_id is not null));

-- ---- hiding the parent spot hides its notes, without touching them
insert into nflow
select 14, 'admin hides the parent spot', 'vikos-balcony',
  public.probe_value(:A, $q$select slug from public.moderate_spot(
    'vikos-balcony', 'hide', 'checking note visibility')$q$);

insert into nflow values
  (15,'its notes go with it', 'true',
    -- the public policy on spot_notes requires a visible parent, so the
    -- count must drop even though no note row was touched
    (select (public.probe_value(null,
      'select count(*)::text from public.spot_notes')::int < 16)::text)),
  (16,'but no note row was modified', '16',
    (select count(*)::text from public.spot_notes where hidden_at is null));

select check_name, expected, actual,
       case when actual = expected then 'ok' else 'FAIL' end as status
from nflow order by step;
