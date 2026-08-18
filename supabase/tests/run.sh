#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Apply every migration to a scratch database and assert the security
# model still holds. Local only — it creates roles and stand-ins that
# Supabase already provides.
#
#   supabase/tests/run.sh                  # uses a local postgres
#   PSQL="psql -d mydb" supabase/tests/run.sh
#
# Needs Postgres with PostGIS available. Every assertion must read `ok`.
# ---------------------------------------------------------------------
set -euo pipefail

DB="${DB:-bkas_test}"
PSQL="${PSQL:-psql -d "$DB"}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# Always from scratch: these assertions count rows and policies, so a
# database carrying state from a previous run fails for the wrong reason.
if [ -z "${SKIP_CREATE:-}" ]; then
  dropdb --if-exists "$DB"
  createdb "$DB"
fi

run() { $PSQL -q -v ON_ERROR_STOP=1 -f "$1"; }

run "$HERE/00-harness.sql"
for migration in "$HERE"/../migrations/*.sql; do
  echo "  applying $(basename "$migration")"
  run "$migration"
done
run "$HERE/02-probe.sql"

echo
echo "=== security ==="
$PSQL -q -f "$HERE/03-security.sql"
echo
echo "=== moderation flow ==="
$PSQL -q -f "$HERE/04-moderation-flow.sql"
echo
echo "=== schema check (supabase/verify.sql) ==="
# The probe helpers are test scaffolding and would be counted by the
# function audit in verify.sql, so drop them first.
$PSQL -q -c 'drop function if exists public.probe(uuid,text);
             drop function if exists public.probe_value(uuid,text);'
$PSQL -q -f "$HERE/../verify.sql"
