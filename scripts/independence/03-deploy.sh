#!/usr/bin/env bash
# Phase 2 — Step 3/4 : Push migrations + deploy ALL edge functions to the new ref.
#
# Pre-requisites:
#   - Step 1 (link) and Step 2 (diff reviewed) completed
#   - Required secrets set in target project (see scripts/independence/secrets-checklist.txt)
#     supabase secrets list  → cross-check
set -euo pipefail
cd "$(dirname "$0")/../.."

echo "▶ Pushing migrations (will prompt for confirmation per file)"
supabase db push

echo
echo "▶ Deploying edge functions (44 expected)"
FAILED=()
for d in supabase/functions/*/; do
  name="$(basename "$d")"
  [[ "$name" == "_shared" ]] && continue
  echo "  → deploy $name"
  if ! supabase functions deploy "$name" --no-verify-jwt; then
    FAILED+=("$name")
  fi
done

echo
if (( ${#FAILED[@]} > 0 )); then
  echo "⚠ Failed deploys:"
  printf '   - %s\n' "${FAILED[@]}"
  exit 1
fi

echo "✓ Step 3/4 done. Next:  scripts/independence/04-data-copy.sh  (only if you want to migrate live data)"
