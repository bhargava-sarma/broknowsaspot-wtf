# database

Postgres on Supabase, with PostGIS. Migrations run in filename order.

| file                              | what it does                          |
| --------------------------------- | ------------------------------------- |
| `20260817090000_init.sql`         | extensions, enums, tables, indexes, RLS |
| `20260817090100_seed_spots.sql`   | the 14 seed spots and their notes     |

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
