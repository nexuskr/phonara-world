import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSessionProfit } from "@/hooks/use-session-profit";
import { track } from "@/lib/telemetry";

const KEY = "phonara_withdraw_nudge_shown_v1";
const THRESHOLD = 200_000; // KRW

/**
 * C3 — 세션 수익 +₩200K 도달 시 1회 출금 유도 모달.
 */
export default function WithdrawNudge() {
  const navigate = useNavigate();
  const { profit } = useSessionProfit();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (profit < THRESHOLD) return;
    try {
      if (sessionStorage.getItem(KEY) === "1") return;
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setOpen(true);
    track("withdraw_nudge_show" as any, { profit });
  }, [profit]);

  if (!open) return null;
  const round = Math.floor(profit / 10_000) * 10_000;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-imperial tracking-[0.04em]">💰 현재 수익 안전 보관</DialogTitle>
          <DialogDescription className="break-keep">
            세션 시작 이후 누적 수익이 임계점을 돌파했습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-2">
          <div className="text-[10px] tracking-[0.3em] text-muted-foreground">SESSION PROFIT</div>
          <div className="font-imperial text-3xl text-gradient-gold tabular-nums">
            +₩{profit.toLocaleString()}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              track("withdraw_nudge_click" as any, { action: "continue" });
              setOpen(false);
            }}
            className="font-bold"
          >
            계속 플레이
          </Button>
          <Button
            onClick={() => {
              track("withdraw_nudge_click" as any, { action: "withdraw", amount: round });
              setOpen(false);
              navigate(`/wallet?tab=withdraw&amount=${round}`);
            }}
            className="font-bold bg-gradient-imperial text-primary-foreground"
          >
            일부 출금
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
