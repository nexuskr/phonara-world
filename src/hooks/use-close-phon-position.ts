/**
 * useClosePhonPosition — close_position_phon RPC 래퍼.
 *
 * RPC 시그니처: close_position_phon(p_position_id uuid, p_pnl_pct numeric, p_idem_key text)
 *   - p_pnl_pct 는 fraction (-1..100). 본문: v_pnl := floor(margin * p_pnl_pct)
 *   - 클라이언트 표시(=margin × pct/100 × leverage)와 맞추려면 frac × leverage 보정 필요.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

function newIdemKey() {
  return (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .replace(/-/g, "")
    .slice(0, 24);
}

function humanError(raw?: string): string {
  const code = (raw ?? "").toLowerCase();
  if (code.includes("auth_required")) return "로그인이 만료됐어요. 다시 로그인 해주세요.";
  if (code.includes("step_up_required")) return "보안을 위해 2단계 인증이 필요해요.";
  if (code.includes("feature_disabled")) return "PHON 베팅이 잠시 멈춰 있어요.";
  if (code.includes("invalid_idem_key")) return "요청 키가 잘못됐어요. 잠시 후 다시 시도해 주세요.";
  if (code.includes("invalid_pnl")) return "가격 변동이 너무 커요. 화면을 새로고침 후 다시 시도해 주세요.";
  if (code.includes("position_not_found")) return "포지션을 찾을 수 없어요. 화면을 새로고침 해주세요.";
  if (code.includes("position_not_open") || code.includes("position_already_closed"))
    return "이미 청산된 포지션입니다.";
  if (code.includes("account_frozen")) return "계정이 일시 보호 중입니다. 잠시 후 다시 시도해 주세요.";
  return `청산이 잠시 막혔어요 (${raw || "unknown"}). 잠시 후 다시 시도해 주세요.`;
}

export function useClosePhonPosition() {
  const [busy, setBusy] = useState(false);

  const close = useCallback(async (positionId: string, pnlPct: number, leverage: number) => {
    if (!positionId) return { ok: false as const };
    setBusy(true);
    const tId = notify.loading("청산 진행 중…");
    try {
      const lev = Math.max(1, Number(leverage) || 1);
      const frac = Math.max(-0.999, Math.min(99, (pnlPct / 100) * lev));
      const { data, error } = await (supabase as any).rpc("close_position_phon", {
        p_position_id: positionId,
        p_pnl_pct: frac,
        p_idem_key: newIdemKey(),
      });
      if (error) {
        notify.error("청산 실패", { id: tId, description: humanError((error as any).message) });
        return { ok: false as const, error };
      }
      const pnlPhon = Number((data as any)?.pnl_phon ?? 0);
      notify.dismiss(tId);
      notify.result({
        kind: pnlPhon >= 0 ? "win" : "loss",
        amountPhon: pnlPhon,
        title:
          pnlPhon > 0
            ? "축하드려요 폐하 · 청산 완료"
            : pnlPhon < 0
              ? "청산이 완료되었어요"
              : "포지션이 정리됐어요",
        href: "/wallet",
      });
      try { navigator.vibrate?.(pnlPhon > 0 ? 25 : 10); } catch {}
      return { ok: true as const, data };
    } finally {
      setBusy(false);
    }
  }, []);

  return { close, busy };
}
