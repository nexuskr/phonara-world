# Service Role Key Rotation Runbook

The Supabase **service_role** key bypasses RLS and is the most dangerous
secret in the project. Rotate quarterly **and** immediately on any
suspected leak.

## When to rotate

- **Mandatory**: Quarterly (Mar 1, Jun 1, Sep 1, Dec 1)
- **Immediate**: After any of:
  - Key appeared in chat, screenshot, GitHub, public log
  - Edge function suspected of leaking via error message
  - Departure of a contractor/admin who had access
  - Anomalous Postgres connections from unknown IPs

## Procedure

### 1. Pre-rotation
1. Open Lovable Cloud → **Project Settings → API**
2. Note the current key fingerprint (last 6 chars) — record in
   `service_key_rotations` via `/admin/audit` ⇒ "키 회전" panel BEFORE rotating
3. Identify dependents: list every Edge Function and external service
   using `SUPABASE_SERVICE_ROLE_KEY`

### 2. Rotation
1. Lovable Cloud → API → "Rotate service_role key"
2. Wait ~30s for propagation
3. Edge Functions auto-pick the new value via `Deno.env.get(...)` on next cold start
4. For external services (e.g. cron callbacks, partner integrations),
   update each one with the new key

### 3. Post-rotation verification
1. Trigger a test edge function that reads `SUPABASE_SERVICE_ROLE_KEY`
2. Check `process-email-queue` (auth-email-hook) is still draining the
   pgmq queue — if not, run `email_domain--setup_email_infra` to refresh
   the cron Vault secret
3. Verify `pg_cron` jobs still execute (query `cron.job_run_details`)
4. Run `admin_run_rls_smoke()` to confirm baseline still passes

### 4. Audit
1. From `/admin/audit` open the **키 회전** panel
2. Click **기록** with:
   - kind: `service_role`
   - reason: e.g. "scheduled quarterly rotation" or "leak suspected (incident #1234)"
   - notes: previous key fingerprint, new fingerprint
3. The action is also written to `admin_audit_log`

## Rollback

Supabase keeps the previous key valid for a brief grace period after
rotation. If a critical service breaks:

1. Identify which service is failing (check function logs for `401`/`403`)
2. Push the **new** key into that service's config — DO NOT revert the
   rotated key in Supabase
3. If you must revert, contact Lovable support — there is no self-serve
   "undo rotation" button

## Other keys

- **anon key**: Lower risk (RLS-bound). Rotate on annual schedule.
- **JWT secret**: Rotating invalidates ALL existing user sessions.
  Only do during planned maintenance window.
