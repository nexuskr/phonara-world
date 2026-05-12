#!/usr/bin/env bash
# Phase 2 — Step 4/4 : (OPTIONAL) Copy live row data from old Lovable Cloud DB
# to the new self-managed project.
#
# Required env:
#   SOURCE_DB_URL  — full postgres connection string of OLD Lovable Cloud DB
#                    (request export from Lovable support; never commit this)
#   TARGET_DB_URL  — full postgres connection string of NEW project
#                    (Supabase dashboard → Project Settings → Database → URI)
#
# Strategy: schema is already deployed in Step 3, so we only stream DATA.
# auth.users is migrated separately by Supabase auth-export (see runbook).
set -euo pipefail

: "${SOURCE_DB_URL:?set SOURCE_DB_URL}"
: "${TARGET_DB_URL:?set TARGET_DB_URL}"

TABLES=$(psql "$SOURCE_DB_URL" -Atc "
  SELECT tablename FROM pg_tables
  WHERE schemaname='public'
  ORDER BY tablename;
")

for t in $TABLES; do
  echo "▶ public.$t"
  psql "$SOURCE_DB_URL" -c "\COPY public.\"$t\" TO STDOUT WITH (FORMAT csv, HEADER true)" \
  | psql "$TARGET_DB_URL" -c "\COPY public.\"$t\" FROM STDIN WITH (FORMAT csv, HEADER true)" \
  || echo "   ⚠ skipped (likely FK/constraint order — re-run after dependents)"
done

echo "✓ Data copy attempted. Validate row counts on both sides."
