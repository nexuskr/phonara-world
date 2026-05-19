/** ImperialBlackjackBetPanel — bet + Deal/Hit/Stand. */
import { memo } from "react";
import { Spade } from "lucide-react";
import { ImperialChipRow, ImperialPrimaryCta } from "@pkg/games/core/imperial";

interface Props {
  bet: number; setBet: (n: number) => void;
  balance: number;
  phase: "idle" | "dealing" | "player" | "dealer" | "settled";
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  demoMode?: boolean;
}
const QUICK = [1000, 5000, 25000, 100000];

function ImperialBlackjackBetPanelImpl({
  bet, setBet, balance, phase, onDeal, onHit, onStand, demoMode,
}: Props) {
  const dealing = phase === "dealing";
  const inPlay = phase === "player";
  return (
    <div className="rounded-2xl border border-[hsl(var(--gold))]/30 bg-gradient-to-br from-card to-card/60 p-4 space-y-4">
      <ImperialChipRow values={QUICK} active={bet} onChange={setBet} disabled={inPlay || dealing} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>잔액 <span className="text-[hsl(var(--gold))] font-bold tabular-nums">{balance.toLocaleString()}</span></span>
        <span>베팅 <span className="text-foreground font-bold tabular-nums">{bet.toLocaleString()}</span></span>
      </div>
      {inPlay ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onHit}
            className="h-14 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold))]/80 text-background font-black text-lg active:scale-[0.98] shadow-[0_0_30px_hsla(45,90%,55%,0.4)]"
          >히트</button>
          <button
            onClick={onStand}
            className="h-14 rounded-xl bg-card border-2 border-[hsl(var(--pink))]/60 text-[hsl(var(--pink))] font-black text-lg active:scale-[0.98]"
          >스탠드</button>
        </div>
      ) : (
        <ImperialPrimaryCta
          onClick={onDeal}
          disabled={dealing || bet > balance}
          loading={dealing}
          loadingLabel="딜링…"
          variant="duo"
          pulse={!dealing && phase !== "dealer"}
        >
          <Spade className="w-5 h-5" />
          {demoMode ? "데모 딜" : "딜"} · {bet.toLocaleString()} PHON
        </ImperialPrimaryCta>
      )}
      {demoMode && (
        <p className="text-[10px] text-center text-muted-foreground">데모 모드 · 실제 PHON 차감되지 않음</p>
      )}
    </div>
  );
}

export const ImperialBlackjackBetPanel = memo(ImperialBlackjackBetPanelImpl);
export default ImperialBlackjackBetPanel;
