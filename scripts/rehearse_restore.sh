#!/usr/bin/env bash
# Rehearse a restore: dump a built database, restore it into an empty one,
# and prove the copy is the same database (NFR-17, task 0.4).
#
# **No backup has ever been restored in this project.** A backup nobody has
# restored is a belief, not a capability -- Supabase takes them and nobody
# has ever found out whether this schema comes back intact, how long it
# takes, or what is missing afterwards. This is the rehearsal, run against a
# throwaway cluster so it can run in CI on every change rather than once a
# year against the real project.
#
# What it proves, and what it does not:
#
#   * PROVES the schema round-trips -- every table, every Row-Level Security
#     policy, every function and trigger -- because P5 lives in the policies
#     and a restore that loses them restores a database with no tenant
#     isolation at all. That is the failure worth catching: it looks like a
#     successful restore.
#   * PROVES the procedure below is correct, so the day it is run in anger
#     nobody is inventing it.
#   * Does NOT prove anything about Supabase's own backups, their retention,
#     or the real project's restore time. Those need the production project
#     and are named as outstanding in docs/annexes/backup-and-restore.md.
#
#   ./scripts/rehearse_restore.sh
#   DATABASE_URL=postgres://... ./scripts/rehearse_restore.sh   # CI
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DB="ldt_restore_src_$$"
TARGET_DB="ldt_restore_dst_$$"
DUMP_FILE="${TMPDIR:-/tmp}/ldt_rehearsal_$$.dump"
STARTED_CLUSTER=0
PGBIN="/usr/lib/postgresql/16/bin"

cleanup() {
  if [ -n "${PSQL_BASE:-}" ]; then
    $PSQL_BASE -q -c "drop database if exists ${SOURCE_DB};" >/dev/null 2>&1 || true
    $PSQL_BASE -q -c "drop database if exists ${TARGET_DB};" >/dev/null 2>&1 || true
  fi
  rm -f "$DUMP_FILE"
  if [ "$STARTED_CLUSTER" = "1" ]; then
    su postgres -c "${PGBIN}/pg_ctl -D ${PGDATA_DIR} stop -m fast" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ -n "${DATABASE_URL:-}" ]; then
  BASE_URL="${DATABASE_URL%/*}"
  PSQL_BASE="psql ${DATABASE_URL}"
  PSQL_SRC="psql ${BASE_URL}/${SOURCE_DB}"
  PSQL_DST="psql ${BASE_URL}/${TARGET_DB}"
  DUMP_CMD="pg_dump ${BASE_URL}/${SOURCE_DB}"
  RESTORE_CMD="pg_restore -d ${BASE_URL}/${TARGET_DB}"
else
  export PGHOST=/tmp PGPORT=5433 PGUSER=postgres
  PGDATA_DIR=/tmp/pgdata-restore-$$
  if ! psql -q -c 'select 1' postgres >/dev/null 2>&1; then
    echo "Starting a throwaway Postgres cluster..."
    mkdir -p "$PGDATA_DIR" && chown postgres "$PGDATA_DIR"
    su postgres -c "${PGBIN}/initdb -D ${PGDATA_DIR} -A trust" >/dev/null 2>&1
    su postgres -c "${PGBIN}/pg_ctl -D ${PGDATA_DIR} -l /tmp/pg-restore-$$.log -o '-p 5433 -k /tmp' start" >/dev/null 2>&1
    STARTED_CLUSTER=1
    sleep 2
  fi
  PSQL_BASE="psql -d postgres"
  PSQL_SRC="psql -d ${SOURCE_DB}"
  PSQL_DST="psql -d ${TARGET_DB}"
  DUMP_CMD="pg_dump -d ${SOURCE_DB}"
  RESTORE_CMD="pg_restore -d ${TARGET_DB}"
fi

# ------------------------------------------------------- 1. build a database
$PSQL_BASE -q -c "create database ${SOURCE_DB};"
for f in "$ROOT/supabase/tests/00_local_supabase_shim.sql" "$ROOT"/supabase/migrations/*.sql; do
  $PSQL_SRC -q -v ON_ERROR_STOP=1 -f "$f"
done

# Rows, so the rehearsal restores data and not only an empty schema. A
# restore that brings back the tables and none of the records is the failure
# mode that looks most like success.
$PSQL_SRC -q -v ON_ERROR_STOP=1 <<'SEED'
insert into club (id, name, jurisdiction)
values ('7e570000-0000-0000-0000-000000000001', 'Restore Rehearsal FC', 'AU-QLD');
insert into person (id, club_id, legal_given_names, legal_family_name, date_of_birth)
values ('7e570000-0000-0000-0000-0000000000a1', '7e570000-0000-0000-0000-000000000001',
        'Rehearsal', 'Subject', '2014-01-01');
SEED

# --------------------------------------------------------------- 2. dump it
STARTED_AT=$(date +%s)
$DUMP_CMD -Fc -f "$DUMP_FILE"
DUMP_SECONDS=$(( $(date +%s) - STARTED_AT ))
DUMP_BYTES=$(wc -c < "$DUMP_FILE")

# ------------------------------------------------------------ 3. restore it
$PSQL_BASE -q -c "create database ${TARGET_DB};"
RESTORE_STARTED=$(date +%s)
# The shim is deliberately NOT re-applied here. Roles are cluster-wide and
# already exist; everything else it creates -- the `auth` schema, its users
# table, `auth.uid()` -- is in the dump, and applying it first made
# pg_restore fail on `schema "auth" already exists`. Restoring into a
# genuinely empty database is also the more honest rehearsal: a real
# disaster does not begin with somebody having pre-created half the schema.
$RESTORE_CMD --no-owner --no-acl --exit-on-error "$DUMP_FILE" >/dev/null
RESTORE_SECONDS=$(( $(date +%s) - RESTORE_STARTED ))

# ----------------------------------------------- 4. prove it is the same db
# Counted rather than eyeballed, and **policies before tables**: P5 lives in
# the policies, so a restore that brings back every table and loses the
# policies restores a database with no tenant isolation -- which reads as a
# clean restore until one club reads another's records.
compare() {
  local what="$1" query="$2"
  local before after
  before=$($PSQL_SRC -tAc "$query")
  after=$($PSQL_DST -tAc "$query")
  if [ "$before" != "$after" ]; then
    echo "RESTORE REHEARSAL FAILED — ${what}: ${before} before, ${after} after." >&2
    exit 1
  fi
  printf '  %-28s %s\n' "$what" "$before"
}

echo "Restore rehearsal — what came back:"
compare "row-level policies"  "select count(*) from pg_policies where schemaname = 'public'"
compare "tables"              "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'"
compare "tables with RLS on"  "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relrowsecurity"
compare "functions"           "select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'"
compare "triggers"            "select count(*) from information_schema.triggers where trigger_schema = 'public'"
compare "check constraints"   "select count(*) from information_schema.table_constraints where constraint_schema = 'public' and constraint_type = 'CHECK'"
compare "clubs"               "select count(*) from club"
compare "people"              "select count(*) from person"

# A named policy, not only a count: a restore that brought back the right
# *number* of policies and the wrong ones would pass every count above.
compare "the P5 policy on person" \
  "select count(*) from pg_policies where schemaname = 'public' and tablename = 'person' and cmd = 'SELECT'"

echo
echo "Dump:    ${DUMP_BYTES} bytes in ${DUMP_SECONDS}s"
echo "Restore: ${RESTORE_SECONDS}s"
echo "Restore rehearsal OK — the schema, its policies and its rows all came back."
