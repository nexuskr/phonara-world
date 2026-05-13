import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import { useLastTradeResult } from "@/hooks/use-last-trade-result";
import { track } from "@/lib/telemetry";

interface Props { onResubmit: () => void }

/**
 * C1 — 패배 직후 30s 내 즉시 복구 버튼.
 */
export default function RecoveryPrompt({ onResubmit }: Props) {
  const last = useLastTradeResult();
  const [dismissed, setDismissed] = useState<number | null>(null);

  // dismiss 상태가 새 트레이드로 갱신되면 자동 해제
  useEffect(() => {
    if (last && dismissed && last.closedAt > dismissed) setDismissed(null);
  }, [last, dismissed]);

  const visible = !!last && last.pnl < 0 && (!dismissed || last.closedAt > dismissed);

  useEffect(() => {
    if (visible) track("recovery_prompt_show", { pnl: last!.pnl });
  }, [visible, last]);

  return (
    <AnimatePresence>
      {visible && last && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-destructive/60 bg-gradient-to-r from-destructive/20 via-destructive/10 to-transparent p-4 flex items-center gap-3 animate-pulse-glow"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-destructive tracking-wider">❌ 손실 발생 ({last.symbol} {last.side.toUpperCase()})</div>
            <div className="font-display font-black text-lg sm:text-xl tabular-nums">
              {last.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
            </div>
            <div className="text-[11px] text-muted-foreground">👉 동일 금액으로 즉시 복구하시겠습니까?</div>
          </div>
          <button
            onClick={() => {
              track("recovery_prompt_click", { action: "resubmit", pnl: last.pnl });
              onResubmit();
              setDismissed(Date.now());
            }}
            className="shrink-0 h-12 px-4 rounded-xl bg-gradient-imperial text-primary-foreground font-black text-sm flex items-center gap-2 glow-imperial press"
          >
            <RotateCcw className="w-4 h-4" /> 재도전
          </button>
          <button
            onClick={() => { track("recovery_prompt_click", { action: "dismiss" }); setDismissed(Date.now()); }}
            aria-label="닫기"
            className="shrink-0 h-12 w-10 rounded-xl border border-border/40 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mx-auto" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
