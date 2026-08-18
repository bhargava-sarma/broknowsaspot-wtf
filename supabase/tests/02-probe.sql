-- ---------------------------------------------------------------------
-- A probe runs one statement as one role and reports what happened:
-- "rows:N" if it ran, or the SQLSTATE if it was refused.
--
-- This is what makes the assertions below readable. Without it every
-- check needs its own transaction and its own role dance, and the point
-- of the check drowns in the setup.
-- ---------------------------------------------------------------------

create or replace function public.probe(as_user uuid, stmt text)
returns text
language plpgsql
security invoker
as $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', coalesce(as_user::text, ''), true);
  if as_user is null then execute 'set local role anon';
  else execute 'set local role authenticated'; end if;
  begin
    execute stmt;
    get diagnostics n = row_count;
    reset role;
    return 'rows:' || n;
  exception when others then
    reset role;
    return sqlstate;
  end;
end;
$$;

-- Same, but returns the first column of the first row, so a probe can
-- assert on a value rather than only on a count.
create or replace function public.probe_value(as_user uuid, stmt text)
returns text
language plpgsql
security invoker
as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(as_user::text, ''), true);
  if as_user is null then execute 'set local role anon';
  else execute 'set local role authenticated'; end if;
  begin
    execute stmt into v;
    reset role;
    return coalesce(v, '<null>');
  exception when others then
    reset role;
    return sqlstate;
  end;
end;
$$;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'nobody@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'exadmin@example.com')
on conflict do nothing;

insert into public.admins (user_id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'exadmin@example.com')
on conflict (user_id) do nothing;

update public.admins set revoked_at = now()
  where user_id = '33333333-3333-3333-3333-333333333333';
