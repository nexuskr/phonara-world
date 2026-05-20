/**
 * P3-C — Cross-Chain Cashout client wrapper.
 * AAL2 required (server enforces). Existing request_withdrawal 무변경.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { useWalletChannel } from "@pkg/realtime";

export type CashoutNetwork = "TRC20" | "ERC20" | "BSC";

export interface CashoutIntent {
  id: string; network: CashoutNetwork; address: string;
  amount_usdt: number; fee_usdt: number; gas_subsidy_usdt: number;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  tx_hash: string | null; created_at: string; processed_at: string | null;
  error_message: string | null;
}

const NETWORK_FEE: Record<CashoutNetwork, number> = { TRC20: 1.0, BSC: 0.5, ERC20: 8.0 };

export function feePreview(network: CashoutNetwork): number { return NETWORK_FEE[network]; }

export function useRequestCashout() {
  const [busy, setBusy] = useState(false);
  const request = async (network: CashoutNetwork, address: string, amount: number) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc(
        "apex_request_cashout" as never,
        { _network: network, _address: address, _amount_usdt: amount } as never,
      );
      if (error) {
        const msg = error.message.includes("aal2_required")
          ? "출금 보안 인증(AAL2)이 필요합니다."
          : error.message.includes("velocity")
            ? "단시간 출금 속도 한도 초과. 잠시 후 다시 시도하세요."
            : error.message;
        notify.error(`출금 요청 실패: ${msg}`);
        return null;
      }
      notify.success("출금 요청 접수됨 — 5분 이내 처리됩니다.");
      return data as { ok: boolean; intent_id: string; fee_usdt: number };
    } finally { setBusy(false); }
  };
  return { busy, request };
}

export function useMyCashouts(limit = 20) {
  const [data, setData] = useState<CashoutIntent[]>([]);
  const load = async () => {
    const { data: rows } = await supabase.rpc(
      "apex_get_my_cashouts" as never,
      { _limit: limit } as never,
    );
    setData((rows as CashoutIntent[]) ?? []);
  };
  useEffect(() => { load(); }, [limit]);
  useWalletChannel({
    key: "cashout:mine",
    bindings: [{ event: "*", schema: "public", table: "apex_withdraw_intents" }],
    onEvent: load,
  });
  return { data, reload: load };
}
