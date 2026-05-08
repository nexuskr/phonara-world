import { supabase } from "@/integrations/supabase/client";

export async function uploadReceipt(file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("로그인이 필요합니다");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${uid}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? path;
}

export type DepositMethod = "bank" | "coin" | "voucher";
export type VoucherBrand = "culture" | "happy" | "cultureland";

export async function submitDeposit(args: {
  amount: number;
  method: DepositMethod;
  packageId?: string | null;
  packageName?: string | null;
  receiptUrl?: string | null;
  memo?: string | null;
  voucherBrand?: VoucherBrand | null;
  voucherPin?: string | null;
}) {
  const { data, error } = await supabase.rpc("submit_deposit", {
    _amount: args.amount,
    _method: args.method,
    _package_id: args.packageId ?? null,
    _package_name: args.packageName ?? null,
    _receipt_url: args.receiptUrl ?? null,
    _memo: args.memo ?? null,
    _voucher_brand: args.voucherBrand ?? null,
    _voucher_pin: args.voucherPin ?? null,
  } as any);
  if (error) throw error;
  return data as { ok: boolean; id: string; bonus_amount: number; bonus_pct: number };
}

export async function amlRequiredLevel(userId: string, amount: number) {
  const { data, error } = await supabase.rpc("aml_required_level", {
    _user_id: userId,
    _amount: amount,
  } as any);
  if (error) throw error;
  return data as {
    required_level: 1 | 2 | 3;
    projected_total: number;
    risk_score: number;
    level1_ok: boolean;
    level2_ok: boolean;
    level3_ok: boolean;
    gate_passed: boolean;
  };
}

export async function adminResolveDeposit(id: string, action: "approve" | "reject", reason?: string) {
  const { data, error } = await supabase.rpc("admin_resolve_deposit", {
    _request_id: id,
    _action: action,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}

export async function adminSetTier(targetId: string, tier: "normal" | "vip" | "god" | "empire") {
  const { error } = await supabase.rpc("admin_set_tier", { _target: targetId, _tier: tier });
  if (error) throw error;
}

export async function adminAdjustBalance(targetId: string, delta: number, reason: string) {
  const { data, error } = await supabase.rpc("admin_adjust_balance", {
    _target: targetId, _delta: delta, _reason: reason,
  });
  if (error) throw error;
  return data;
}
