#!/usr/bin/env bash
#
# Dump the LIVE database schema (structure only, no data).
#
# postgres_schema.sql at the repo root records the original schema and has
# drifted from production — it declares users.is_system_admin as BOOLEAN where
# production has INTEGER, which is what made migration 062 fail. Use this to get
# the real thing instead of trusting that file.
#
#   ./scripts/dump-live-schema.sh > live_schema.sql
#
# Requires DATABASE_URL and pg_dump. Safe: --schema-only never touches data, and
# the connection is read-only in effect.
#
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  echo "Export it first, e.g.  export DATABASE_URL=\$(grep '^DATABASE_URL=' apps/web/.env.local | cut -d= -f2-)" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install the postgresql client package." >&2
  exit 1
fi

# --no-owner / --no-privileges keep the output portable and reviewable in a diff.
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public
