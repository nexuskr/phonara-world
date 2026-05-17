/**
 * useClosePhonPosition — close_position_phon RPC 래퍼.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

function newIdemKey() {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .replace(/-/g, "")
    .slice(0, 24);
}

function humanError(code?: string): string {
  switch (code) {
    case "step_up_required":
      return "보안을 위해 2단계 인증이 필요해요.";
    case "feature_disabled":
      return "PHON 베팅이 잠시 멈춰 있어요.";
    case "position_not_found":
      return "포지션을 찾을 수 없어요. 화면을 새로고침해 주세요.";
    case "position_already_closed":
      return "이미 청산된 포지션입니다.";
    default:
      return "잠시 후 다시 시도해 주세요. 폐하의 자산은 안전합니다.";
  }
}

export function useClosePhonPosition() {
  const [busy, setBusy] = useState(false);

  const close = useCallback(async (positionId: string, pnlPct: number) => {
    if (!positionId) return { ok: false as const };
    setBusy(true);
    const tId = notify.loading("청산 진행 중…");
    try {
      const { data, error } = await (supabase as any).rpc("close_position_phon", {
        p_position_id: positionId,
        p_pnl_pct: pnlPct,
        p_idem_key: newIdemKey(),
      });
      if (error) {
        notify.error("청산 실패", { id: tId, description: humanError((error as any).message) });
        return { ok: false as const, error };
      }
      const pnlPhon = Number((data as any)?.pnl_phon ?? 0);
      if (pnlPhon > 0) {
        notify.success("축하드려요 폐하", {
          id: tId,
          description: `+${Math.floor(pnlPhon).toLocaleString("ko-KR")} PHON 이 다시 손에 들어왔습니다`,
        });
      } else {
        notify.info("청산이 완료되었어요", {
          id: tId,
          description: `${Math.floor(pnlPhon).toLocaleString("ko-KR")} PHON · 다음 흐름을 함께 봐요`,
        });
      }
      try { navigator.vibrate?.(pnlPhon > 0 ? 25 : 10); } catch {}
      return { ok: true as const, data };
    } finally {
      setBusy(false);
    }
  }, []);

  return { close, busy };
}
