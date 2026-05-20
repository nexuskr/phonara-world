import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { NeonButton } from "../../components/NeonButton";
import { ParticleBurst } from "../../components/ParticleBurst";
import { useApexGame } from "../useApexGame";
import { TierShell, BetInput } from "../_shared/TierShell";
import { TIER_S } from "../_shared/edge";

const SUITS = ["♠", "♥", "♦", "♣"];
function fmt(r?: number) { return r == null ? "?" : r === 1 ? "A" : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : String(r); }

export default function HiLoGame() {
  const t = TIER_S.hilo;
  const [bet, setBet] = useState(t.minBet);
  const [side, setSide] = useState<"hi" | "lo">("hi");
  const [burst, setBurst] = useState(0);
  const { play, loading, last } = useApexGame();
  const roll = Number(last?.result?.roll ?? 0);
  // map dice [0..100) → card rank 1..13
  const rank = roll > 0 ? Math.max(1, Math.min(13, Math.ceil((roll / 100) * 13))) : undefined;
  const suit = SUITS[Math.floor(roll) % 4];
  const baseRank = 7; // visual pivot
  const winChance = side === "hi" ? ((13 - baseRank) / 13) * 100 : (baseRank / 13) * 100;
  const target = side === "hi" ? 100 - (baseRank / 13) * 100 : (baseRank / 13) * 100;

  async function go() {
    const res = await play(t.backing, { phon: bet }, { target: Math.round(target), side: side === "hi" ? "over" : "under" });
    if (res?.ok && Number(res.payout_phon) > bet) setBurst((b) => b + 1);
  }

  return (
    <TierShell code="hilo" icon={<ChevronUp className="w-7 h-7 text-primary" />}
      hash={last?.server_seed_hash} seed={last?.client_seed} nonce={last?.nonce}>
      <ParticleBurst trigger={burst} />
      <div className="space-y-5">
        <div className="flex justify-center gap-4">
          <div className="rounded-lg border-2 border-primary/40 bg-background/60 p-4 text-center min-w-[80px]">
            <div className="text-xs text-muted-foreground">Pivot</div>
            <div className="text-3xl font-black">{fmt(baseRank)}</div>
          </div>
          <div className="rounded-lg border-2 border-amber-400/40 bg-background/60 p-4 text-center min-w-[80px]">
            <div className="text-xs text-muted-foreground">Drawn</div>
            <div className="text-3xl font-black apex-text-neon">{rank ? `${fmt(rank)}${suit}` : "—"}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setSide("hi")}
            className={`flex items-center justify-center gap-1 rounded px-3 py-2 text-sm font-bold ${side === "hi" ? "bg-primary text-background" : "bg-white/5 text-muted-foreground"}`}>
            <ChevronUp className="w-4 h-4" /> HIGHER ({(99 / winChance * 100).toFixed(2)}x)
          </button>
          <button onClick={() => setSide("lo")}
            className={`flex items-center justify-center gap-1 rounded px-3 py-2 text-sm font-bold ${side === "lo" ? "bg-primary text-background" : "bg-white/5 text-muted-foreground"}`}>
            <ChevronDown className="w-4 h-4" /> LOWER ({(99 / winChance * 100).toFixed(2)}x)
          </button>
        </div>
        <BetInput value={bet} onChange={setBet} min={t.minBet} max={t.maxBet} />
        <NeonButton onClick={go} disabled={loading} className="w-full">
          {loading ? "DRAWING…" : `DRAW ${side === "hi" ? "HIGHER" : "LOWER"}`}
        </NeonButton>
      </div>
    </TierShell>
  );
}
