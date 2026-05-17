/**
 * useSwapPhonKrw — PHON ↔ KRW 즉시 스왑 RPC 래퍼.
 * AAL2 + idempotency 자동 처리. 실패 시 Warm King 한국어 메시지.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type SwapDirection = "krw_to_phon" | "phon_to_krw";

function newIdemKey() {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .replace(/-/g, "")
    .slice(0, 24);
}

function humanError(code?: string): string {
  switch (code) {
    case "step_up_required": return "보안을 위해 2단계 인증이 필요해요. 잠시 후 인증을 마치고 다시 시도해 주세요.";
    case "feature_disabled": return "지금은 스왑이 잠시 멈춰 있어요. 곧 다시 열립니다.";
    case "insufficient_krw": return "보유한 원화가 부족해요. 충전 후 다시 시도해 주세요.";
    case "insufficient_phon": return "보유한 PHON이 부족해요.";
    case "daily_swap_limit_exceeded": return "오늘 스왑 한도(₩5,000,000)를 모두 사용했어요. 내일 다시 가능합니다.";
    default: return "잠시 후 다시 시도해 주세요. 폐하의 자산은 안전합니다.";
  }
}

export function useSwapPhonKrw() {
  const [busy, setBusy] = useState(false);

  const swap = useCallback(async (direction: SwapDirection, amount: number) => {
    if (!amount || amount <= 0) {
      notify.warning("금액을 입력해 주세요");
      return { ok: false as const };
    }
    setBusy(true);
    const tId = notify.loading("교환 진행 중…");
    try {
      const { data, error } = await (supabase as any).rpc("swap_phon_krw", {
        p_direction: direction,
        p_amount: amount,
        p_idem_key: newIdemKey(),
      });
      if (error) {
        notify.error("교환 실패", { id: tId, description: humanError((error as any).message) });
        return { ok: false as const, error };
      }
      const out = (data as any)?.out_amount;
      const unit = direction === "krw_to_phon" ? "PHON" : "KRW";
      notify.success(
        direction === "krw_to_phon"
          ? "PHON 으로 교환 완료"
          : "원화로 교환 완료",
        { id: tId, description: `+${Number(out).toLocaleString("ko-KR")} ${unit}` },
      );
      return { ok: true as const, data };
    } finally {
      setBusy(false);
    }
  }, []);

  return { swap, busy };
}
