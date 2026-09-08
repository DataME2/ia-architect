#!/usr/bin/env bash
# Apply the real migrations to a throwaway Postgres and prove Row-Level
# Security actually isolates tenants.
#
# check_rls.py proves a policy exists. This proves it works, which is the
# claim Principle P5 actually rests on — a policy can be present and wrong,
# and the failure is silent until one club reads another's records.
#
#   ./scripts/test_rls.sh                    # starts its own cluster
#   DATABASE_URL=postgres://... ./scripts/test_rls.sh   # uses that one (CI)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_NAME="ldt_rls_test_$$"
STARTED_CLUSTER=0
PGBIN="/usr/lib/postgresql/16/bin"

cleanup() {
  if [ -n "${PSQL_BASE:-}" ]; then
    $PSQL_BASE -q -c "drop database if exists ${DB_NAME};" >/dev/null 2>&1 || true
  fi
  if [ "$STARTED_CLUSTER" = "1" ]; then
    su postgres -c "${PGBIN}/pg_ctl -D ${PGDATA_DIR} stop -m fast" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ -n "${DATABASE_URL:-}" ]; then
  PSQL_BASE="psql ${DATABASE_URL}"
  PSQL_DB="psql ${DATABASE_URL%/*}/${DB_NAME}"
else
  export PGHOST=/tmp PGPORT=5433 PGUSER=postgres
  PGDATA_DIR=/tmp/pgdata-rls-$$
  if ! psql -q -c 'select 1' postgres >/dev/null 2>&1; then
    echo "Starting a throwaway Postgres cluster..."
    mkdir -p "$PGDATA_DIR" && chown postgres "$PGDATA_DIR"
    su postgres -c "${PGBIN}/initdb -D ${PGDATA_DIR} -A trust" >/dev/null 2>&1
    su postgres -c "${PGBIN}/pg_ctl -D ${PGDATA_DIR} -l /tmp/pg-rls-$$.log -o '-p 5433 -k /tmp' start" >/dev/null 2>&1
    STARTED_CLUSTER=1
    sleep 2
  fi
  PSQL_BASE="psql -d postgres"
  PSQL_DB="psql -d ${DB_NAME}"
fi

$PSQL_BASE -q -c "create database ${DB_NAME};"

for f in \
  "$ROOT/supabase/tests/00_local_supabase_shim.sql" \
  "$ROOT"/supabase/migrations/*.sql \
  "$ROOT/supabase/tests/99_grants.sql" \
  "$ROOT"/supabase/tests/1*_*.sql \
  "$ROOT"/supabase/tests/2*_*.sql
do
  $PSQL_DB -q -v ON_ERROR_STOP=1 -f "$f"
done

echo "RLS behaviour OK — migrations apply and tenant isolation holds."
