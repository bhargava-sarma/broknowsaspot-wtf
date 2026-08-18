-- ---------------------------------------------------------------------
-- Revoke EXECUTE from anon on the functions that have no business being
-- callable by an anonymous client.
--
-- The previous migration tried to do this with
--
--   revoke execute on function ... from public;
--
-- which is the standard Postgres idiom, because Postgres grants EXECUTE
-- on a new function to PUBLIC by default. On Supabase that is not the
-- whole story: the project's default privileges *also* grant EXECUTE
-- directly to `anon`, `authenticated` and `service_role`. Revoking from
-- PUBLIC leaves those three named grants exactly where they were, so
-- every one of these stayed callable by anyone holding the publishable
-- key. `verify.sql` reported anon_admin_access = 5.
--
-- Nothing was actually exploitable, and it is worth being precise about
-- why, because "it was fine" and "it was safe by accident" are different
-- claims:
--
--   is_admin()          — auth.uid() is null for anon, so it returns false
--   admin_spot_queue()  — raises 42501 from its own membership check
--   moderate_spot()     — same, before it touches a row
--   slugify()           — pure string function
--   unique_slug()       — returns a slug; reveals only which slugs exist,
--                         which is public information anyway
--
-- So the in-function checks held, which is the design working as
-- intended. But the layer that is supposed to stop the call before it
-- ever reaches those checks was missing, and defense in depth that only
-- has one layer is just depth.
--
-- The two slug helpers lose `authenticated` as well. They exist to serve
-- the submission route, which runs on the service role; no browser
-- session should be able to spin them.
--
-- Trigger functions are deliberately untouched. Postgres checks EXECUTE
-- on a trigger function when the trigger is created, not each time it
-- fires, and calling one directly fails with 0A000 regardless of grants.
-- Revoking there would buy nothing and risks the auto-hide trigger.
-- ---------------------------------------------------------------------

-- Admin surface: signed-in admins only. `authenticated` keeps EXECUTE
-- because the membership check inside each function is what decides, and
-- an admin arrives as `authenticated`.
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.moderate_spot(text, text, text) from public, anon;
revoke execute on function public.admin_spot_queue() from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.moderate_spot(text, text, text) to authenticated;
grant execute on function public.admin_spot_queue() to authenticated;

-- Submission helpers: service role only.
revoke execute on function public.slugify(text) from public, anon, authenticated;
revoke execute on function public.unique_slug(text) from public, anon, authenticated;

grant execute on function public.slugify(text) to service_role;
grant execute on function public.unique_slug(text) to service_role;
