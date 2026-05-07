import { supabase } from "@/integrations/supabase/client";

export async function submitPackagePurchase(args: {
  packageId: string;
  packageName: string;
  amount: number;
  dailyReturn: number;
  durationDays: number;
  totalReturn: number;
  receiptUrl?: string | null;
}) {
  const { data, error } = await supabase.rpc("submit_package_purchase", {
    _package_id: args.packageId,
    _package_name: args.packageName,
    _amount: args.amount,
    _daily_return: args.dailyReturn,
    _duration_days: args.durationDays,
    _total_return: args.totalReturn,
    _receipt_url: args.receiptUrl ?? null,
  });
  if (error) throw error;
  return data as { ok: boolean; id: string };
}

export async function adminResolvePackage(id: string, action: "approve" | "reject", reason?: string) {
  const { data, error } = await supabase.rpc("admin_resolve_package", {
    _purchase_id: id,
    _action: action,
    _reason: reason ?? null,
  });
  if (error) throw error;
  return data;
}

export async function settlePackagesNow() {
  const { data, error } = await supabase.rpc("settle_package_daily");
  if (error) throw error;
  return data as { ok: boolean; settled: number };
}
