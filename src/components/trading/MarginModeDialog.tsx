/**
 * MarginModeDialog — Bybit/Binance style margin-mode confirmation modal.
 * Shows equity / used / available before switching, and a warning if the
 * user has open cross positions that would be affected.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { MarginMode } from "@/lib/trading/types";
import { fmtMoney, unitForMode } from "@/lib/trading/currency";
import type { Mode } from "@/lib/trading/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: MarginMode;
  next: MarginMode;
  mode: Mode;
  onConfirm: (m: MarginMode) => void;
}

export default function MarginModeDialog({ open, onOpenChange, current, next, mode, onConfirm }: Props) {
  const unit = unitForMode(mode);
  const [stat, setStat] = useState<{ balance: number; used: number; available: number; count: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase.rpc("live_get_cross_summary");
      if (cancel || !data) return;
      const d = data as any;
      setStat({
        balance: Number(d.balance ?? 0),
        used: Number(d.used_margin ?? 0),
        available: Number(d.available ?? 0),
        count: Number(d.cross_position_count ?? 0),
      });
    })();
    return () => { cancel = true; };
  }, [open]);

  const same = current === next;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">
            마진 모드 변경 — {next === "isolated" ? "Isolated" : "Cross"}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {next === "isolated"
              ? "포지션마다 별도 마진을 할당합니다. 손실은 할당된 마진까지만 청산됩니다."
              : "전체 잔액이 모든 Cross 포지션의 공통 증거금으로 사용됩니다. 손실이 누적되면 전체 잔액이 청산 대상이 됩니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <Stat label="총 자산" v={stat ? fmtMoney(stat.balance, unit) : "—"} />
          <Stat label="사용 마진 (Cross)" v={stat ? fmtMoney(stat.used, unit) : "—"} />
          <Stat label="가용 잔액" v={stat ? fmtMoney(stat.available, unit) : "—"} highlight />
          <Stat label="Cross 포지션" v={stat ? `${stat.count}개` : "—"} />
        </div>

        {next === "cross" && stat && stat.count === 0 && (
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            ⚠ Cross 모드는 한 번 손실이 누적되면 다른 포지션까지 영향을 줍니다. 신중히 사용해 주세요.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            disabled={same}
            onClick={() => { onConfirm(next); onOpenChange(false); }}
            className="bg-primary text-primary-foreground"
          >
            {same ? "이미 적용됨" : "확인 · 적용"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, v, highlight }: { label: string; v: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${highlight ? "border-emerald-400/40 bg-emerald-500/5" : "border-border/40 bg-background/40"}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-mono tabular-nums font-bold text-sm ${highlight ? "text-emerald-200" : ""}`}>{v}</div>
    </div>
  );
}
