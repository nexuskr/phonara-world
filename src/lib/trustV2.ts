import { supabase } from "@/integrations/supabase/client";

export async function requestRefund(reason: string) {
  const { data, error } = await supabase.rpc("request_refund", { _reason: reason });
  if (error) throw error;
  return data;
}

export async function claimLossProtection() {
  const { data, error } = await supabase.rpc("claim_loss_protection");
  if (error) throw error;
  return data;
}

export async function getMyRefundRequest() {
  const { data, error } = await supabase
    .from("refund_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyLossProtectionClaim() {
  const { data, error } = await supabase
    .from("loss_protection_claims")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyGodMode() {
  const { data, error } = await supabase
    .from("first_deposit_godmode")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function refundErrorMessage(code: string): string {
  const map: Record<string, string> = {
    auth_required: "로그인이 필요합니다.",
    reason_too_short: "환불 사유를 5자 이상 입력해주세요.",
    no_first_deposit: "첫 입금 기록이 없어 환불 대상이 아닙니다.",
    refund_window_expired: "7일 환불 기간이 지났습니다.",
    withdrawal_exists: "이미 출금을 진행하셨기 때문에 환불할 수 없습니다.",
  };
  return map[code] ?? code;
}

export function lossProtectionErrorMessage(code: string): string {
  const map: Record<string, string> = {
    auth_required: "로그인이 필요합니다.",
    no_godmode: "Founding Emperor 보너스를 받지 않았습니다.",
    protection_expired: "7일 손실 보호기간이 종료되었습니다.",
    already_claimed: "이미 손실 보호를 청구하셨습니다.",
    no_loss_to_protect: "현재 잔액이 입금액 이상입니다. 손실이 없습니다.",
  };
  return map[code] ?? code;
}
