-- Supabase grants table privileges to the API roles and lets RLS do the
-- narrowing. Mirror that, or every policy test passes for the wrong
-- reason — a missing GRANT rather than a working policy.
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant execute on all functions in schema public to service_role;
