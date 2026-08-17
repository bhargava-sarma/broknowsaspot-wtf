-- ---------------------------------------------------------------------
-- Pin the search_path on touch_updated_at().
--
-- Supabase's security linter flagged this as "Function Search Path
-- Mutable". A function without a fixed search_path resolves unqualified
-- names using whatever search_path the *caller* had at the time. Anyone
-- able to create an object in a schema earlier on that path can shadow a
-- name the function body relies on and have their version run instead.
--
-- The exposure here is small — the body only calls now(), and the trigger
-- is SECURITY INVOKER so it holds no elevated rights — but the fix costs
-- nothing and the linter is right on principle.
--
-- `set search_path = ''` forces every reference to be schema-qualified.
-- pg_catalog is still searched implicitly, which is why now() continues to
-- resolve without qualification.
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The trigger already points at this function by name, so replacing the
-- body is enough — no need to drop and recreate it.
