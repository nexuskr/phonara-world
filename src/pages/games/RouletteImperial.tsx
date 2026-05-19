/** /games/roulette/imperial — Imperial Roulette (demo). */
import { useRef, useState } from "react";
import { Crown } from "lucide-react";
import {
  ImperialRouletteWheel, ImperialRouletteBetPanel, useRouletteStore,
  payoutFor, colorOf,
  type RouletteWheelHandle,
} from "@pkg/games/roulette";
import { ImperialHistoryRail, ImperialFairnessStrip, useFairnessBadge } from "@pkg/games/core/imperial";
import { notify } from "@/lib/notify";
import { haptics } from "@/lib/haptics";

export default function RouletteImperial() {
  const s = useRouletteStore();
  const wheelRef = useRef<RouletteWheelHandle>(null);
  const [bet, setBet] = useState(5000);
  const [spinning, setSpinning] = useState(false);
  const [roundId, setRoundId] = useState(() => Math.floor(Date.now() / 1000));
  const pf = useFairnessBadge("roulette", roundId, true, false);

  const onSpin = async () => {
    if (spinning || s.bets.length === 0 || !wheelRef.current) return;
    setSpinning(true);
    haptics.select();
    // PF-derived result
    const seedBasis = pf.state.hash ?? String(roundId);
    let h = 0;
    for (let i = 0; i < seedBasis.length; i++) h = (h * 31 + seedBasis.charCodeAt(i)) | 0;
    const result = Math.abs(h) % 37;
    try {
      const settled = await wheelRef.current.spin(result);
      let payout = 0;
      const totalBet = s.bets.reduce((sum, b) => sum + b.amount, 0);
      for (const b of s.bets) payout += payoutFor(b, settled);
      const profit = payout - totalBet;
      s.recordSettle(settled, profit);
      s.clearBets();
      if (profit > 0) {
        haptics.win();
        notify.success(`👑 ${settled} (${colorOf(settled)}) · +${profit.toLocaleString()} PHON`);
      } else if (profit === 0) {
        notify.info(`${settled} · 무승부`);
      } else {
        notify.warning(`${settled} (${colorOf(settled)}) · ${profit.toLocaleString()}`);
      }
      const next = roundId + 1;
      setRoundId(next);
      pf.reveal().catch(() => {});
    } finally {
      setSpinning(false);
    }
  };

  const history = s.history.slice(0, 24).map((h) => ({
    id: h.id,
    value: h.profit > 0 ? 2 : h.profit === 0 ? 1 : 0.5,
    label: String(h.number),
  }));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] flex items-center justify-center shadow-[0_0_24px_hsla(45,90%,55%,0.5)]">
            <Crown className="w-5 h-5 text-background" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">Imperial Roulette</h1>
            <p className="text-[11px] text-muted-foreground">유럽식 싱글 제로 · 황금 림</p>
          </div>
        </header>

        <ImperialHistoryRail entries={history} formatter={(n) => String(Math.round(n))} />

        <div className="grid md:grid-cols-[1fr_360px] gap-4">
          <ImperialRouletteWheel ref={wheelRef} />
          <ImperialRouletteBetPanel
            bet={bet} setBet={setBet}
            bets={s.bets}
            addBet={s.addBet}
            clearBets={s.clearBets}
            balance={s.balance}
            spinning={spinning}
            onSpin={onSpin}
            demoMode
          />
        </div>

        <ImperialFairnessStrip hash={pf.state.hash} seed={pf.state.seed} verified={pf.state.verified} />
      </div>
    </div>
  );
}
