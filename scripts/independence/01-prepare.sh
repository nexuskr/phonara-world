#!/usr/bin/env bash
# Phase 2 — Step 1/4 : Verify toolchain & link to the target Supabase project.
# Target project ref (sanity check; can be overridden via env):
TARGET_REF="${TARGET_REF:-wyhhdyrvqtoejvusnhva}"

set -euo pipefail
cd "$(dirname "$0")/../.."

echo "▶ Phase 2 — independence prep"
echo "  target ref: ${TARGET_REF}"

echo
echo "1) Toolchain check"
command -v supabase >/dev/null 2>&1 || { echo "✗ supabase CLI missing — install: brew install supabase/tap/supabase  (or scoop / npm)"; exit 1; }
command -v docker   >/dev/null 2>&1 || { echo "✗ docker missing — needed for 'supabase db dump' and local studio"; exit 1; }
docker info >/dev/null 2>&1 || { echo "✗ docker daemon not running — start Docker Desktop and retry"; exit 1; }
command -v psql     >/dev/null 2>&1 || echo "⚠ psql not found (only needed if you use the COPY-based data path)"
echo "   ✓ supabase / docker OK"

echo
echo "2) supabase login (browser)"
supabase login

echo
echo "3) Link to target project"
supabase link --project-ref "${TARGET_REF}"

echo
echo "✓ Step 1/4 done. Next:  scripts/independence/02-pull-and-diff.sh"
