# Phonara Penetration Test Checklist

> Production-grade security review checklist. Run before every major release
> and quarterly thereafter. Keep results in `/admin/audit` (key rotation
> panel can hold notes) or in a dedicated security ticket.

## 0. Pre-flight

- [ ] Run `admin_run_rls_smoke()` from `/admin/audit` — all PASS
- [ ] Run Lovable Cloud Security Scanner — note new findings only
- [ ] Run `check_permission_drift()` — empty result
- [ ] Verify CI workflow `.github/workflows/db-permissions.yml` passes on `main`

## 1. Authentication & Session

- [ ] Email/password sign-in: brute force lockout after N attempts
- [ ] HIBP password check enabled (`auth.password_hibp_enabled = true`)
- [ ] Email verification required (no auto-confirm in production)
- [ ] OAuth providers: redirect URIs whitelisted, no wildcard
- [ ] Session JWT expiry sane (≤ 1 hour); refresh rotation enabled
- [ ] AAL2 (TOTP) enforced for all `/admin/*` sensitive tabs (`AdminAal2Gate`)
- [ ] `request_withdrawal` rejects without recent OTP or AAL2
- [ ] `mfa.unenroll()` requires AAL2
- [ ] Admin recovery: backup codes hashed (sha256), single-use, expire on consume
- [ ] 4-Eyes recovery: 2 distinct admin approvers, target ≠ either approver

## 2. Authorization (RLS & RPC)

- [ ] Every `public.*` table has `ENABLE ROW LEVEL SECURITY`
- [ ] No table has a `USING (true)` policy without explicit business reason
  - Documented exceptions: `chat_messages` (global channel),
    `pay_config` (authenticated read of public tron address)
- [ ] All `admin_*` SECURITY DEFINER functions:
  - REVOKE EXECUTE FROM anon
  - First line: `IF NOT has_role(auth.uid(),'admin') THEN RAISE`
- [ ] Admin destructive actions (freeze, unfreeze, set_tier, adjust_balance)
  reject `auth.uid() = _target` with `cannot_target_self`
- [ ] Bulk admin RPCs: ≤ 200 records per call, audited
- [ ] `function_permissions_baseline` matches actual privileges
  (run `check_permission_drift()`)

## 3. Sensitive Data

- [ ] `profiles` sensitive columns guarded by `guard_profile_sensitive_columns`
  trigger (tier, withdraw_pin_hash, total_*, attendance_*, referral_*)
- [ ] `withdraw_pin_hash` is bcrypt/argon2 hash, never plaintext, never
  returned by any SELECT to non-owner
- [ ] `withdraw_otp_codes`: `consumed_at` and `spent_at` enforced;
  no API returns the code itself after creation
- [ ] PII (KYC, addresses) in storage buckets not publicly readable
- [ ] Anomaly events / freezes / audit log: admin-only RLS (no broadcasts
  to regular users via Realtime)

## 4. Money & Wallet

- [ ] `wallet_balances` UPDATE only via SECURITY DEFINER RPC
- [ ] `request_withdrawal`:
  - Account-frozen check (`is_account_frozen`)
  - Stepup check (AAL2 OR fresh OTP)
  - Velocity rule (3 withdrawals / 10min OR 5 / 1h ⇒ auto-freeze 24h)
  - Negative-balance protection
- [ ] `credit_crypto_deposit`: idempotent on `(source, source_ref)`
- [ ] `live_positions` BEFORE INSERT trigger enforces `leverage ≤ max_leverage`
- [ ] No SQL function lets users mint PHON without a payment receipt

## 5. Edge Functions

- [ ] All public functions validate input (Zod or equivalent)
- [ ] CORS uses `corsHeaders`, OPTIONS short-circuit, no `Access-Control-Allow-Origin: *`
  on functions that read user data
- [ ] No raw SQL via `rpc('execute_sql', ...)` — only typed RPC
- [ ] `verify_jwt = false` functions hand-validate the JWT in code
- [ ] No service-role key reached from a function that processes
  user-supplied URLs (SSRF surface)
- [ ] Webhooks verify provider signatures (Tron explorer, payment partners)

## 6. Realtime

- [ ] Channels filtered by `user_id=eq.<uid>` for per-user data
- [ ] Admin-only tables (`anomaly_events`, `account_freezes`, etc.) only
  broadcast to admins (RLS enforced)
- [ ] `useMyPower` channel: idempotent registry, refcount, pendingRemove
  on cleanup, no duplicate subscribes in StrictMode

## 7. Frontend

- [ ] No `localStorage`/`sessionStorage` keys grant elevated permissions
- [ ] Admin role NEVER read from client storage; always re-fetched via
  `has_role(auth.uid(),'admin')` server-side
- [ ] Buttons that call admin RPCs are disabled when client thinks user
  is not admin AND server enforces 403
- [ ] No secret in `import.meta.env` other than `VITE_SUPABASE_*`
  (publishable keys only)
- [ ] CSP on hosting layer (Lovable handles)

## 8. Operational

- [ ] `service_role` key rotated quarterly — log in `service_key_rotations`
- [ ] Postgres major version current; `pg_cron`, `pgcrypto` patched
- [ ] Backups verified: restore drill done in last 90 days
- [ ] `/admin/audit` reviewed weekly for anomalous admin patterns
  (off-hours actions, foreign IPs, rapid bulk ops)
- [ ] Admin device fingerprints recorded (`user_devices`) — investigate
  unfamiliar devices

## 9. Reporting

For every finding:

| Severity | Action |
|----------|--------|
| Critical | Patch within 24h, freeze affected feature, notify users |
| High     | Patch within 7d, document workaround |
| Medium   | Schedule for next sprint |
| Low      | Tracker, address opportunistically |

Record in security memory (`security--update_memory`) when accepted as risk.
