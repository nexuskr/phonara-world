/**
 * TierShell — shared chrome for Tier S 5 games.
 * Keeps each game file tiny so per-game chunk ≤ 80KB gz.
 */
import { ReactNode } from "react";
import { GlowCard } from "../../components/GlowCard";
import { ApexFairBadge } from "../ProvablyFairBadge";
import { TIER_S, type TierSCode } from "./edge";

interface Props {
  code: TierSCode;
  icon: ReactNode;
  hash?: string;
  seed?: string;
  nonce?: number;
  children: ReactNode;
}

export function TierShell({ code, icon, hash, seed, nonce, children }: Props) {
  const t = TIER_S[code];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black apex-gradient-text flex items-center gap-2">
          {icon} {t.label.toUpperCase()}
        </h1>
        <ApexFairBadge hash={hash} seed={seed} nonce={nonce} />
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest">
        <span className="rounded bg-primary/15 px-2 py-1 text-primary">RTP {(t.rtp * 100).toFixed(2)}%</span>
        <span className="rounded bg-amber-500/15 px-2 py-1 text-amber-300">Max {t.maxMult.toLocaleString()}x</span>
        <span className="rounded bg-white/5 px-2 py-1 text-muted-foreground">var · {t.variance}</span>
        <span className="rounded bg-white/5 px-2 py-1 text-muted-foreground">min {t.minBet} PHON</span>
      </div>
      <GlowCard><div className="p-6">{children}</div></GlowCard>
    </div>
  );
}

export function BetInput({ value, onChange, min, max }: { value: number; onChange: (n: number) => void; min: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Bet (PHON)</span>
        <span className="tabular-nums">{value.toLocaleString()}</span>
      </div>
      <input
        type="range" min={min} max={Math.min(max, 100_000)} step={Math.max(10, Math.floor(min))}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
