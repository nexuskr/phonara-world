/**
 * Phonara Pay client — USDT TRC20 입금 intent 생성 + PHON 잔액 조회.
 * - 1 USDT = 1,300 PHON (₩1,300 기준)
 * - 30분 만료, 정확 매칭(소수 4자리)
 */
import { supabase } from "@/integrations/supabase/client";

export const PHON_PER_USDT = 1300;

export interface CryptoDepositIntent {
  id: string;
  user_id: string;
  network: "tron";
  asset: string;
  receive_address: string;
  requested_amount: number;
  unique_amount: number;
  status: "pending" | "filled" | "expired" | "canceled";
  matched_tx_hash: string | null;
  matched_from_addr: string | null;
  matched_at: string | null;
  expires_at: string;
  created_at: string;
}

export async function createDepositIntent(amount: number, receiveAddress: string) {
  const { data, error } = await supabase.rpc("create_crypto_deposit_intent", {
    _amount: amount,
    _receive_address: receiveAddress,
  });
  if (error) throw error;
  return data as unknown as CryptoDepositIntent;
}

export async function getPhonBalance(): Promise<number> {
  const { data, error } = await supabase.rpc("get_phon_balance");
  if (error) return 0;
  return Number(data ?? 0);
}

export async function getMyPendingDeposits(): Promise<CryptoDepositIntent[]> {
  const { data, error } = await supabase.rpc("get_my_pending_deposits");
  if (error) return [];
  return (data ?? []) as unknown as CryptoDepositIntent[];
}
