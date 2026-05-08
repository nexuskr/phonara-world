/**
 * DB Permissions baseline test — verifies that SECURITY DEFINER functions
 * have not silently regained EXECUTE privileges for anon/PUBLIC roles
 * against what's stored in `function_permissions_baseline`.
 *
 * Calls the admin-guarded RPC `check_permission_drift()` via service-role key
 * if available; otherwise skipped.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(URL && SERVICE_KEY);
const d = enabled ? describe : describe.skip;

d("DB permissions — SECURITY DEFINER baseline drift", () => {
  const admin = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } });

  it("check_permission_drift reports no critical drift", async () => {
    const { data, error } = await admin.rpc("check_permission_drift" as any);
    expect(error, error?.message).toBeNull();
    const rows = (data ?? []) as Array<{ severity?: string; function_name?: string }>;
    const critical = rows.filter((r) => r.severity === "critical");
    expect(critical, `critical drift detected: ${JSON.stringify(critical)}`).toHaveLength(0);
  });
});
