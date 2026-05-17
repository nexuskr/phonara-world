/**
 * useOpenPhonPosition — open_position_phon RPC 래퍼.
 * idem_key 자동 생성, Warm King 한국어 에러.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type Side = "long" | "short";

function newIdemKey() {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .replace(/-/g, "")
    .slice(0, 24);
}

function humanError(code?: string): string {
  switch (code) {
    case "step_up_required":
      return "보안을 위해 2단계 인증이 필요해요. 잠시 후 다시 시도해 주세요.";
    case "feature_disabled":
      return "PHON 베팅이 잠시 멈춰 있어요. 곧 다시 열립니다.";
    case "insufficient_phon":
      return "보유한 PHON 이 부족해요. 지금 충전하시면 즉시 가능해요.";
    case "leverage_exceeds_phon_tier":
      return "이 레버리지는 PHON 을 조금 더 모으셔야 열립니다.";
    case "amount_below_min":
      return "최소 베팅 수량을 확인해 주세요.";
    case "account_frozen":
      return "계정이 잠시 보호 모드에 있어요. 고객센터에 문의해 주세요.";
    default:
      return "잠시 후 다시 시도해 주세요. 폐하의 자산은 안전합니다.";
  }
}

export interface OpenPhonArgs {
  symbol: string;
  side: Side;
  leverage: number;
  amountPhon: number;
}

export function useOpenPhonPosition() {
  const [busy, setBusy] = useState(false);

  const open = useCallback(async (args: OpenPhonArgs) => {
    if (!args.amountPhon || args.amountPhon <= 0) {
      notify.warning("베팅할 PHON 수량을 입력해 주세요");
      return { ok: false as const };
    }
    setBusy(true);
    const tId = notify.loading("PHON 포지션 진입 중…");
    try {
      const { data, error } = await (supabase as any).rpc("open_position_phon", {
        p_symbol: args.symbol,
        p_side: args.side,
        p_leverage: args.leverage,
        p_amount_phon: args.amountPhon,
        p_idem_key: newIdemKey(),
      });
      if (error) {
        notify.error("진입 실패", { id: tId, description: humanError((error as any).message) });
        return { ok: false as const, error };
      }
      const sideLabel = args.side === "long" ? "LONG 📈" : "SHORT 📉";
      notify.success(`폐하의 PHON ${sideLabel} 포지션이 열렸어요`, {
        id: tId,
        description: "수수료가 자동으로 20% 깎였습니다 · 좋은 흐름 응원해요",
      });
      try { navigator.vibrate?.(15); } catch {}
      return { ok: true as const, data };
    } finally {
      setBusy(false);
    }
  }, []);

  return { open, busy };
}
