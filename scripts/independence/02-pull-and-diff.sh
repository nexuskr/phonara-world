#!/usr/bin/env bash
# Phase 2 — Step 2/4 : Pull existing remote schema (if any) and diff against
# the migrations baked into this repo (supabase/migrations/*.sql).
#
# Outcome:
#   - supabase/migrations/_remote_baseline.sql  (snapshot of target ref schema)
#   - supabase/migrations/_repo_baseline.sql    (concatenated repo migrations)
#   - supabase/migrations/_DIFF_REPORT.txt      (unified diff for review)
#
# This is READ-ONLY. No DB writes. Review the diff before running step 3.
set -euo pipefail
cd "$(dirname "$0")/../.."

OUT=supabase/migrations
BASELINE_REMOTE="$OUT/_remote_baseline.sql"
BASELINE_REPO="$OUT/_repo_baseline.sql"
DIFF="$OUT/_DIFF_REPORT.txt"

echo "▶ Pulling remote schema → $BASELINE_REMOTE"
supabase db dump --schema public --data-only=false -f "$BASELINE_REMOTE" || {
  echo "  (dump failed — target ref is probably empty; treating remote as empty)"
  : > "$BASELINE_REMOTE"
}

echo "▶ Concatenating repo migrations → $BASELINE_REPO"
: > "$BASELINE_REPO"
for f in $(ls "$OUT"/2*.sql | sort); do
  echo -e "\n-- ===== $(basename "$f") =====\n" >> "$BASELINE_REPO"
  cat "$f" >> "$BASELINE_REPO"
done

echo "▶ Writing diff report → $DIFF"
diff -u "$BASELINE_REMOTE" "$BASELINE_REPO" > "$DIFF" || true

echo
echo "✓ Step 2/4 done."
echo "  Review:  $DIFF"
echo "  Then run: scripts/independence/03-deploy.sh"
