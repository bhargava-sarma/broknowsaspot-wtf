# database

Postgres on Supabase, with PostGIS. Migrations run in filename order.

| file                              | what it does                          |
| --------------------------------- | ------------------------------------- |
| `20260817090000_init.sql`         | extensions, enums, tables, indexes, RLS |
| `20260817090100_seed_spots.sql`   | the 14 seed spots and their notes     |
| `20260817120000_fix_function_search_path.sql` | pins the trigger's search_path |
| `20260817140000_submissions_and_reports.sql`  | write path, reports, auto-hide |
| `20260818090000_admin_moderation.sql`         | admins, moderation log, RPCs   |
| `20260818140000_revoke_anon_function_grants.sql` | takes EXECUTE back from anon |
| `20260818160000_note_submissions.sql`         | the write path for notes       |

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

## testing the security model

The claims above are asserted, not asserted-in-a-comment. `supabase/tests`
applies every migration to a scratch database and checks 109 things:

```bash
npm run db:test      # needs a local postgres with postgis available
```

It runs three suites:

| file                      | asks                                                     |
| ------------------------- | -------------------------------------------------------- |
| `03-security.sql`         | who can read and write what, as anon / signed-in / admin / revoked admin |
| `04-moderation-flow.sql`  | brigade → auto-hide → admin restores → 11th report re-hides |
| `05-note-flow.sql`        | hiding and restoring a note, and what the public sees |
| `../verify.sql`           | the schema itself: RLS on, zero write policies, no mutable search_path |

Every row must read `ok`. A FAIL in `03-security.sql` is a hole, not a
broken test — the rows are things someone might actually try:

```
 admin forges a log row        | 42501    | 42501   | ok
 admin promotes a friend       | 42501    | 42501   | ok
 admin updates a spot directly | rows:0   | rows:0  | ok
 revoked admin moderates       | 42501    | 42501   | ok
```

The harness creates `auth.users`, `auth.uid()` and the anon /
authenticated / service_role roles, because a plain Postgres has none of
them and the migrations will not apply without them. **Never point it at a
Supabase project.**

It also reproduces Supabase's *default privileges*, and does so **before**
the migrations run rather than after. That ordering is load-bearing and
was wrong once: the harness used to grant EXECUTE to the API roles after
every migration, silently undoing their REVOKEs, so the suite passed while
`anon` still held EXECUTE on `is_admin()`, `moderate_spot()` and
`admin_spot_queue()` in production. `verify.sql` caught it there. The
lesson is in the file — a harness that does not match the real
environment's grants tests nothing about grants.

Which is also why `03-security.sql` asserts on `has_function_privilege`
directly and not only through probes. A probe cannot tell the difference:
`anon calls the queue` returns `42501` whether the call was refused by a
missing grant or by the function's own membership check, and it passed
throughout the period the grant was wrong.

`verify.sql` is the one to run *on* Supabase, in the SQL Editor, after
applying migrations. It is read-only and deliberately a single statement:
the editor only renders the result of the last statement it runs, so a
multi-statement script silently hides every check but the final one.

## notes

Anyone can leave a dated note on a visible spot. No account, published
immediately, same guard order as a submission: shape, then Turnstile, then
a rate limit counted in Postgres.

Three details are deliberate.

**The rate-limit key is not on `spot_notes`.** It lives in `note_log`,
which has no policy for anon or authenticated at all. RLS filters rows,
not columns — a `submitter_key` column on `spot_notes` would be handed to
anyone holding the publishable key who thought to ask for it, and the
public SELECT policy on that table is what makes notes readable in the
first place.

**`note_log` is separate from `submission_log`** rather than one table
with a `kind` column, because the two deserve different budgets. Adding a
spot is a much larger act than leaving a note — someone reporting back on
four places they walked this weekend is normal — so notes get 10/hour
against submissions' 5, and neither can exhaust the other.

**Hidden and removed spots refuse notes.** An entry pulled down by reports
should not keep accumulating discussion while it is under review.

Notes cannot be reported. The report flow targets a spot, and an admin
reviewing a reported spot sees its notes alongside it, so abuse in a note
is reachable today. Note-level reports would mean a second threshold, a
second reporter-key namespace and a second auto-hide path — worth building
when notes outgrow one person reading them, and not before.

`moderate_note()` supports hide and restore only. `remove` exists for
spots because a takedown at a landowner's request is worth distinguishing
from a reversible hide; a note is two sentences, and there is nothing that
distinction would express.

`noted_on` — when the visit happened — is validated in the route rather
than the schema. A CHECK constraint cannot call `current_date`: Postgres
requires IMMUTABLE functions there and `current_date` is only STABLE.

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

### the admin screen

`/admin` is the moderation surface. It lists every entry — hidden and
removed included — with report counts and reasons, and offers three verbs:
**hide**, **restore**, **remove**. All three are reversible and all three
leave a row in `moderation_log`.

Changes appear on the public pages immediately: the actions call
`revalidatePath` rather than waiting out the five-minute ISR window.

### who can moderate

Being signed in and being an admin are different things. Supabase projects
accept public sign-ups by default, so the gate is membership in
`public.admins`, never `auth.uid() is not null`.

Making someone an admin is two deliberate steps, both in the dashboard:

1. **Authentication → Users → Add user.** Give it a real password and tick
   *Auto Confirm User*. There is no sign-up link on the site and there
   should never be one.
2. **SQL Editor**, with the id from step 1:

   ```sql
   insert into public.admins (user_id, email)
   values ('<the uuid>', '<the email>');
   ```

Removing someone is a revoke, not a delete — it keeps their past decisions
attributable in the log:

```sql
update public.admins set revoked_at = now() where email = '<the email>';
```

While you are in Authentication → Providers, **turn off public sign-ups**.
It is not what stops a stranger moderating — `public.admins` does that —
but there is no reason to accept accounts nobody will ever use.

### how the gate actually works

Three checks, and they fail independently:

| where | what it does | what happens if it breaks |
| ----- | ------------ | ------------------------- |
| `src/proxy.ts` | redirects signed-out requests off `/admin` | someone sees a page that then refuses them |
| `readAdminGate()` | re-checks membership per render | the queue query is refused instead |
| `is_admin()` in Postgres | governs every policy and both RPCs | **nothing** — this is the real gate |

Underneath all three, `anon` holds no EXECUTE on any admin function, so an
anonymous client cannot reach even the membership check.

The third one is the one that matters. Admin reads run as the signed-in
user under RLS, so a bug in the first two leaks nothing: Postgres returns
an empty set or raises `42501`.

**There is no INSERT, UPDATE or DELETE policy anywhere in this schema, for
any role, admins included.** Moderation goes through `moderate_spot()`,
which writes the state change and its audit row in one transaction. That
is what makes "every visibility change is logged" true by construction
rather than by everyone remembering to use the right button — an admin
hitting the REST API directly cannot clear `hidden_at` without a log row,
because they cannot clear it at all.

### digging around by hand

The Table Editor still answers the questions the screen doesn't:

- **who reported what** — query `spot_reports` by `spot_id`
- **trace a spammer** — `submission_log` links `submitter_key` to every spot
  that key submitted

Editing `spots.hidden_at` directly in the Table Editor still works, because
the dashboard connects as `postgres` and bypasses RLS. It writes no log
row. Use the screen.
