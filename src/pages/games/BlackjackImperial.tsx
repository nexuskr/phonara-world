/** /games/blackjack/imperial — Imperial Blackjack (demo). */
import { useState } from "react";
import { Crown } from "lucide-react";
import {
  ImperialBlackjackTable, ImperialBlackjackBetPanel, useBlackjackStore,
  startRound, dealerPlay, settle, handValue,
  type SettleOutcome,
} from "@pkg/games/blackjack";
import { ImperialHistoryRail, ImperialFairnessStrip, useFairnessBadge } from "@pkg/games/core/imperial";
import { notify } from "@/lib/notify";
import { haptics } from "@/lib/haptics";

export default function BlackjackImperial() {
  const s = useBlackjackStore();
  const [round, setRound] = useState<ReturnType<typeof startRound> | null>(null);
  const [outcome, setOutcome] = useState<SettleOutcome | null>(null);
  const [roundId, setRoundId] = useState(() => Math.floor(Date.now() / 1000));
  const pf = useFairnessBadge("blackjack", roundId, true, false);

  const onDeal = async () => {
    if (s.phase === "player" || s.phase === "dealing") return;
    s.setPhase("dealing");
    setOutcome(null);
    haptics.select();
    const r = startRound(pf.state.hash ?? String(roundId));
    setRound(r);
    s.setHands(r.player, r.dealer, true);
    // simulate deal cinematics
    await new Promise((res) => setTimeout(res, 600));
    // immediate blackjack check
    const v = handValue(r.player).total;
    if (v === 21) {
      finish(r, true);
    } else {
      s.setPhase("player");
    }
  };

  const finish = (r: ReturnType<typeof startRound>, immediate: boolean) => {
    dealerPlay(r);
    const result = settle(r);
    s.setHands(r.player, r.dealer, false);
    s.setPhase("settled");
    setOutcome(result.outcome);
    const profit = Math.floor(s.bet * result.multiplier) - s.bet;
    s.recordSettle(result.outcome, profit);
    if (result.outcome === "blackjack") {
      haptics.win();
      notify.success(`👑 BLACKJACK · +${profit.toLocaleString()}`);
    } else if (result.outcome === "win") {
      haptics.win();
      notify.success(`✨ WIN · +${profit.toLocaleString()}`);
    } else if (result.outcome === "push") {
      notify.info(`PUSH · 베팅 반환`);
    } else {
      notify.warning(`BUST · ${profit.toLocaleString()}`);
    }
    const next = roundId + 1;
    setRoundId(next);
    pf.reveal().catch(() => {});
    if (immediate) return;
  };

  const onHit = () => {
    if (!round || s.phase !== "player") return;
    const c = round.deck.pop();
    if (!c) return;
    round.player.push(c);
    s.setHands(round.player, round.dealer, true);
    const v = handValue(round.player).total;
    haptics.select();
    if (v > 21) {
      finish(round, false);
    } else if (v === 21) {
      finish(round, false);
    }
  };

  const onStand = () => {
    if (!round || s.phase !== "player") return;
    haptics.select();
    finish(round, false);
  };

  const history = s.history.slice(0, 24).map((h) => ({
    id: h.id,
    value: h.outcome === "blackjack" ? 10 : h.outcome === "win" ? 2 : h.outcome === "push" ? 1 : 0.5,
    label: h.outcome === "blackjack" ? "BJ" : h.outcome === "win" ? "W" : h.outcome === "push" ? "=" : "L",
  }));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <header className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] flex items-center justify-center shadow-[0_0_24px_hsla(45,90%,55%,0.5)]">
            <Crown className="w-5 h-5 text-background" />
          </span>
          <div>
            <h1 className="text-xl font-black text-foreground">Imperial Blackjack</h1>
            <p className="text-[11px] text-muted-foreground">시네마틱 카드 · 21점 승부</p>
          </div>
        </header>

        <ImperialHistoryRail entries={history} formatter={(v) => String(v)} />

        <div className="grid md:grid-cols-[1fr_360px] gap-4">
          <ImperialBlackjackTable
            player={s.player}
            dealer={s.dealer}
            dealerHidden={s.dealerHidden}
            outcome={outcome}
          />
          <ImperialBlackjackBetPanel
            bet={s.bet}
            setBet={s.setBet}
            balance={s.balance}
            phase={s.phase}
            onDeal={onDeal}
            onHit={onHit}
            onStand={onStand}
            demoMode
          />
        </div>

        <ImperialFairnessStrip hash={pf.state.hash} seed={pf.state.seed} verified={pf.state.verified} />
      </div>
    </div>
  );
}
