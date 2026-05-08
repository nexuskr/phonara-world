/**
 * Referral 90-day window E2E
 *
 * Verifies that `_credit_referral_first_deposit`:
 *   1) credits inviter (30,000) + invitee (10,000) when window is open
 *   2) is a silent no-op when window has expired
 *
 * Requires service role (skipped otherwise — local & PR runs with secrets).
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(URL && SERVICE_KEY);
const d = enabled ? describe : describe.skip;

async function ensureUser(admin: any, email: string) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list?.users.find((u: any) => u.email === email);
  if (found) return found.id as string;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "test-" + Math.random().toString(36).slice(2, 10) + "Aa1!",
    email_confirm: true,
  });
  if (error) throw error;
  return data.user!.id as string;
}

async function balance(admin: any, uid: string) {
  const { data } = await admin.from("wallet_balances").select("available_balance").eq("user_id", uid).maybeSingle();
  return Number(data?.available_balance ?? 0);
}

async function cleanup(admin: any, inviter: string, invitee: string) {
  await admin.from("idempotency_keys").delete().eq("scope", "referral").eq("key", `ref_first_deposit_v2:${invitee}`);
  await admin.from("referrals").delete().eq("invitee_id", invitee);
  await admin.from("referral_earnings").delete().eq("invitee_id", invitee);
  for (const u of [inviter, invitee]) {
    await admin.from("transactions").delete().eq("user_id", u).contains("metadata", { source: "first_deposit_fixed_v2" });
  }
}

d("Referral 90-day window — _credit_referral_first_deposit", () => {
  const admin: any = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } });

  it("credits inviter+invitee inside window, no-op after expiry", async () => {
    const stamp = Date.now();
    const inviterEmail = `ref-inviter-${stamp}@phonara.test`;
    const inviteeEmail = `ref-invitee-${stamp}@phonara.test`;
    const inviter = await ensureUser(admin, inviterEmail);
    const invitee = await ensureUser(admin, inviteeEmail);

    // Ensure profiles + wallets exist
    for (const u of [inviter, invitee]) {
      await admin.from("profiles").upsert({ id: u, nickname: u.slice(0, 6) }, { onConflict: "id" });
      await admin.from("wallet_balances").upsert({ user_id: u }, { onConflict: "user_id" });
    }

    await cleanup(admin, inviter, invitee);

    // ---- Case 1: window OPEN (window_expires_at = now+30d) -------------------
    await admin.from("referrals").insert({
      inviter_id: inviter,
      invitee_id: invitee,
      code_used: "TESTOPEN",
      window_expires_at: new Date(Date.now() + 30 * 86400e3).toISOString(),
      policy_version: 2,
    });

    const inviterBefore = await balance(admin, inviter);
    const inviteeBefore = await balance(admin, invitee);

    const { error: e1 } = await admin.rpc("_credit_referral_first_deposit" as any, { _invitee: invitee });
    expect(e1?.message ?? null).toBeNull();

    const inviterAfter = await balance(admin, inviter);
    const inviteeAfter = await balance(admin, invitee);
    expect(inviterAfter - inviterBefore).toBe(30000);
    expect(inviteeAfter - inviteeBefore).toBe(10000);

    // ---- Case 2: window EXPIRED — should be silent no-op ----------------------
    await cleanup(admin, inviter, invitee);
    await admin.from("referrals").insert({
      inviter_id: inviter,
      invitee_id: invitee,
      code_used: "TESTEXP",
      window_expires_at: new Date(Date.now() - 1 * 86400e3).toISOString(),
      policy_version: 2,
    });

    const beforeExp1 = await balance(admin, inviter);
    const beforeExp2 = await balance(admin, invitee);
    const { error: e2 } = await admin.rpc("_credit_referral_first_deposit" as any, { _invitee: invitee });
    expect(e2?.message ?? null).toBeNull();
    const afterExp1 = await balance(admin, inviter);
    const afterExp2 = await balance(admin, invitee);
    expect(afterExp1 - beforeExp1).toBe(0);
    expect(afterExp2 - beforeExp2).toBe(0);

    // teardown
    await cleanup(admin, inviter, invitee);
    await admin.auth.admin.deleteUser(inviter).catch(() => {});
    await admin.auth.admin.deleteUser(invitee).catch(() => {});
  }, 60_000);
});
