import { useState } from "react";
import { Sparkles, X, Crown } from "lucide-react";
import { formatKRW, useDB, type Pkg } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { isFlagOn } from "@/lib/conversion-flags";
import { track } from "@/lib/analytics";
import AnchorPrice from "./patterns/AnchorPrice";
import CountdownLossAversion from "./patterns/CountdownLossAversion";
import ScarcityBar from "./patterns/ScarcityBar";
import ReciprocityBonus from "./patterns/ReciprocityBonus";
import RiskReversal from "./patterns/RiskReversal";
import ProgressLockIn from "./patterns/ProgressLockIn";
import ExitIntentModal from "./ExitIntentModal";

/**
 * 풀-스택 STARTER paywall — 10패턴 동시 가동.
 * 외부에서 `<PaywallStarter pkg={pkg} onClose={...} />` 호출.
 */
export default function PaywallStarter({
  pkg,
  onClose,
  onSubmit,
}: {
  pkg: Pkg;
  onClose: () => void;
  onSubmit?: () => Promise<void> | void;
}) {
  const [db] = useDB();
  const [busy, setBusy] = useState(false);
  const original = Math.round(pkg.price * 1.4); // anchor (40% 더 비쌌다고 표시)
  const seatsTotal = pkg.seatsLeft ? Math.max(100, pkg.seatsLeft + 23) : 100;
  const seatsUsed = seatsTotal - (pkg.seatsLeft ?? 77);

  async function pay() {
    if (busy) return;
    setBusy(true);
    track("funnel_paywall_paid", { package_id: pkg.id, amount: pkg.price });
    try {
      if (onSubmit) await onSubmit();
      else {
        toast({ title: "결제 페이지로 이동", description: pkg.name });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-background/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-4">
      <ExitIntentModal onAccept={pay} />
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative overflow-hidden animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-gold blur-3xl opacity-50" />

        <div className="relative">
          <div className="text-[10px] tracking-[0.3em] text-secondary font-black flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-gold" /> 첫 결제 한정
          </div>
          <h2 className="font-imperial text-2xl text-gradient-gold mt-1">{pkg.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">{pkg.tagline}</p>

          {isFlagOn("anchorPrice") && (
            <div className="mt-4">
              <AnchorPrice original={original} discounted={pkg.price} />
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {isFlagOn("countdownLossAversion") && <CountdownLossAversion minutes={15} />}
            {isFlagOn("scarcityBar") && <ScarcityBar used={seatsUsed} total={seatsTotal} />}
          </div>

          {isFlagOn("reciprocityBonus") && (
            <div className="mt-2">
              <ReciprocityBonus amount={3_000} />
            </div>
          )}

          {isFlagOn("progressLockIn") && (
            <div className="mt-2">
              <ProgressLockIn score={Math.min(98, 30 + (db.user?.xp ?? 0) % 70)} />
            </div>
          )}

          {isFlagOn("liveSocialProof") && (
            <div className="mt-3 flex items-center gap-2 text-[11px] glass rounded-xl px-3 py-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span className="text-muted-foreground">
                <span className="font-black text-secondary">방금</span> 서울 K**님이 같은 패키지를 결제했습니다 · 오늘 <span className="font-black text-foreground tabular-nums">1,284</span>명 진입
              </span>
            </div>
          )}

          <div className="mt-4 glass rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">30일 총 예상</span>
            <span className="font-display font-black text-base text-gradient-gold">
              {formatKRW(pkg.totalReturn)}
            </span>
          </div>

          <button
            onClick={pay}
            disabled={busy}
            className="press sheen mt-5 w-full py-3.5 rounded-xl bg-gradient-imperial text-primary-foreground font-display font-bold glow-imperial disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {busy ? "처리 중..." : `1-tap 결제 ${formatKRW(pkg.price)}`}
          </button>

          {isFlagOn("riskReversal") && (
            <div className="mt-3 flex justify-center">
              <RiskReversal />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
