/**
 * /games/plinko/imperial — Imperial Plinko (demo mode).
 * Money flow: demo-only (no RPC). PF commit/reveal uses imperial_pf_commit.
 */
import { useRef, useState } from "react";
import { Crown } from "lucide-react";
import {
  ImperialPlinkoCanvas, ImperialPlinkoBetPanel, usePlinkoStore,
  type PlinkoCanvasHandle,
} from "@pkg/games/plinko";
import { ImperialHistoryRail, ImperialFairnessStrip } from "@pkg/games/core/imperial";
import { useFairnessBadge } from "@pkg/games/core/imperial";
import { notify } from "@/lib/notify";
import { haptics } from "@/lib/haptics";

export default function PlinkoImperial() {
  const s = usePlinkoStore();
  const canvasRef = useRef<PlinkoCanvasHandle>(null);
  const [dropping, setDropping] = useState(false);
  const [roundId, setRoundId] = useState<number>(() => Math.floor(Date.now() / 1000));
  const pf = useFairnessBadge("plinko", roundId, true, false);

  const onDrop = async () => {
    if (dropping || s.bet > s.balance || !canvasRef.current) return;
    setDropping(true);
    haptics.select();
    try {
      const { bin, mult } = await canvasRef.current.drop();
      const payout = Math.floor(s.bet * mult);
      s.recordSettlement({ bin, multiplier: mult, bet: s.bet, payout });
      if (mult >= 1) {
        haptics.win();
        notify.success(`✨ ${mult}x · +${(payout - s.bet).toLocaleString()} PHON`);
      } else {
        notify.warning(`${mult}x · 다음 라운드 도전`);
      }
      // rotate PF round id and re-commit for next drop
      const next = roundId + 1;
      setRoundId(next);
      pf.reveal().catch(() => {});
    } finally {
      setDropping(false);
    }
  };

  const history = s.history.slice(0, 24).map((h) => ({
    id: h.id, value: h.multiplier,
  }));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] flex items-center justify-center shadow-[0_0_24px_hsla(45,90%,55%,0.5)]">
            <Crown className="w-5 h-5 text-background" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">Imperial Plinko</h1>
            <p className="text-[11px] text-muted-foreground">황금 핀의 낙하 · {s.rows}줄 · {s.risk.toUpperCase()}</p>
          </div>
        </header>

        <ImperialHistoryRail entries={history} />

        <div className="grid md:grid-cols-[1fr_360px] gap-4">
          <ImperialPlinkoCanvas ref={canvasRef} rows={s.rows} risk={s.risk} />
          <ImperialPlinkoBetPanel
            bet={s.bet} setBet={s.setBet}
            risk={s.risk} setRisk={s.setRisk}
            rows={s.rows} setRows={s.setRows}
            balance={s.balance}
            dropping={dropping}
            onDrop={onDrop}
            demoMode
          />
        </div>

        <ImperialFairnessStrip hash={pf.state.hash} seed={pf.state.seed} verified={pf.state.verified} />
      </div>
    </div>
  );
}
