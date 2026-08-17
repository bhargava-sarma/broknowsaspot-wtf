# database

Postgres on Supabase, with PostGIS. Migrations run in filename order.

| file                              | what it does                          |
| --------------------------------- | ------------------------------------- |
| `20260817090000_init.sql`         | extensions, enums, tables, indexes, RLS |
| `20260817090100_seed_spots.sql`   | the 14 seed spots and their notes     |
| `20260817120000_fix_function_search_path.sql` | pins the trigger's search_path |
| `20260817140000_submissions_and_reports.sql`  | write path, reports, auto-hide |

## applying them

**Via the dashboard** — simplest, and it means nobody has to hand out
database credentials:

1. Supabase → **SQL Editor**
2. Paste `20260817090000_init.sql`, run it
3. Paste `20260817090100_seed_spots.sql`, run it
4. Check **Table Editor** → `spots` holds 14 rows

**Via the CLI**, if you'd rather:

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
```

Both migrations are safe to re-run. The schema uses `if not exists`
throughout, and the seed upserts on `slug` and replaces notes per spot
rather than stacking duplicates.

## design

**lat/lng are the source of truth.** They mirror the TypeScript `Spot`
type exactly, so nothing converts on the way out. `location` is a
generated `geography(Point, 4326)` column derived from them, and it
carries the GiST index — writers only ever set lat/lng, and Postgres
rejects any attempt to write `location` directly, so the two cannot drift.

That's what makes "spots within N km" and viewport queries possible later
without a migration:

```sql
select slug from spots
where ST_DWithin(location, ST_MakePoint(:lng, :lat)::geography, 20000);
```

**Enums mirror the TypeScript unions** in `src/lib/types/spot.ts`. Adding a
category there means adding it here too — Postgres rejects an unknown
label, which is the failure we want instead of a silent text column.

**RLS is default-deny.** The only public grant is `SELECT` on spots that
are neither hidden nor removed. There is no public insert policy, because
every write goes through a route handler using the service role key. That
key is server-only and never carries a `NEXT_PUBLIC_` prefix.

`hidden_at` is reversible and `removed_at` is deliberate — kept separate so
that a spot pulled down by a report threshold can be restored without
having lost anything.

## regenerating the seed

The seed migration is generated from `src/lib/data/spots.ts` rather than
hand-written — fourteen entries of long prose is a transcription-error
machine:

```bash
npm run seed:sql
```

## moderation

A spot auto-hides once **10 distinct people** report it. Every reason counts
the same — there is no fast lane for safety reports. That was a deliberate
product call.

Two things make the count mean something:

- `unique (spot_id, reporter_key)` — one report per person per spot, enforced
  by the database. One person clicking ten times moves the count to 1.
- `reporter_key` is an HMAC of the client address, never the address itself.
  It is a weak identity (shared behind NAT, trivially rotated with a VPN) and
  is treated as one: it raises the cost of gaming the threshold rather than
  making it impossible.

**The threshold lives only in `apply_report_threshold()`.** It is never sent
to the client and never shown in the UI, because publishing "10 reports
removes a spot" is an instruction manual for brigading.

Hiding sets `hidden_at`; nothing is deleted. A threshold can be reached by a
coordinated group as easily as a genuine one, so it has to be reversible and
has to leave the evidence in place.

### moderating by hand, for now

Until the admin screen exists, use the Table Editor:

- **hide** — set `spots.hidden_at` to now
- **restore** — clear `spots.hidden_at` and `hidden_reason`
- **who reported what** — query `spot_reports` by `spot_id`
- **trace a spammer** — `submission_log` links `submitter_key` to every spot
  that key submitted

Changes appear on the site within five minutes (ISR), or immediately on the
next deploy.
