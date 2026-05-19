/** ImperialRouletteBetPanel — outside bet chips + spin CTA. */
import { memo } from "react";
import { CircleDot } from "lucide-react";
import { ImperialChipRow, ImperialPrimaryCta } from "@pkg/games/core/imperial";
import type { RouletteBets } from "../types";

interface Props {
  bet: number; setBet: (n: number) => void;
  bets: RouletteBets;
  addBet: (b: RouletteBets[number]) => void;
  clearBets: () => void;
  balance: number;
  spinning: boolean;
  onSpin: () => void;
  demoMode?: boolean;
}

const QUICK = [1000, 5000, 25000, 100000];

const OUT_BETS: { id: "red" | "black" | "even" | "odd" | "low" | "high"; label: string; tone: string }[] = [
  { id: "red",   label: "RED",   tone: "bg-red-900/50 border-red-500/60 text-red-200" },
  { id: "black", label: "BLACK", tone: "bg-zinc-900/70 border-zinc-500/60 text-zinc-200" },
  { id: "even",  label: "EVEN",  tone: "bg-card border-border/60 text-foreground" },
  { id: "odd",   label: "ODD",   tone: "bg-card border-border/60 text-foreground" },
  { id: "low",   label: "1-18",  tone: "bg-card border-border/60 text-foreground" },
  { id: "high",  label: "19-36", tone: "bg-card border-border/60 text-foreground" },
];

function ImperialRouletteBetPanelImpl({
  bet, setBet, bets, addBet, clearBets, balance, spinning, onSpin, demoMode,
}: Props) {
  const total = bets.reduce((s, b) => s + b.amount, 0);
  return (
    <div className="rounded-2xl border border-[hsl(var(--gold))]/30 bg-gradient-to-br from-card to-card/60 p-4 space-y-4">
      <ImperialChipRow values={QUICK} active={bet} onChange={setBet} disabled={spinning} />
      <div className="grid grid-cols-3 gap-2">
        {OUT_BETS.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={spinning || bet > balance}
            onClick={() => addBet({ kind: o.id, amount: bet } as RouletteBets[number])}
            className={`h-12 rounded-xl font-black text-sm border transition active:scale-95 disabled:opacity-50 ${o.tone}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>총 베팅 <span className="text-[hsl(var(--gold))] font-bold tabular-nums">{total.toLocaleString()}</span> · 잔액 <span className="text-foreground font-bold tabular-nums">{balance.toLocaleString()}</span></span>
        <button
          type="button"
          disabled={spinning || bets.length === 0}
          onClick={clearBets}
          className="text-[11px] underline disabled:opacity-30"
        >
          베팅 초기화
        </button>
      </div>
      <ImperialPrimaryCta
        onClick={onSpin}
        disabled={spinning || bets.length === 0}
        loading={spinning}
        loadingLabel="스핀 중…"
        variant="duo"
        pulse={!spinning && bets.length > 0}
      >
        <CircleDot className="w-5 h-5" />
        {demoMode ? "데모 스핀" : "스핀"} · {total.toLocaleString()} PHON
      </ImperialPrimaryCta>
      {demoMode && (
        <p className="text-[10px] text-center text-muted-foreground">
          데모 모드 · 실제 PHON 차감되지 않음
        </p>
      )}
    </div>
  );
}

export const ImperialRouletteBetPanel = memo(ImperialRouletteBetPanelImpl);
export default ImperialRouletteBetPanel;
