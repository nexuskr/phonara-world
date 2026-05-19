/** ImperialFairnessStrip — PF commit/reveal status pill. */
import { memo } from "react";
import { Sparkles, ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  hash?: string | null;
  seed?: string | null;
  verified?: boolean;
}

function ImperialFairnessStripImpl({ hash, seed, verified }: Props) {
  const Icon = verified ? ShieldCheck : seed ? ShieldAlert : Sparkles;
  const label = !hash ? "commit 대기" : seed ? (verified ? "검증 완료" : "reveal 완료") : "공정 검증";
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
        Provably Fair · {label}
      </span>
      <span className="font-mono truncate max-w-[60%]">
        {hash ? `hash ${hash.slice(0, 12)}…` : "—"}
        {seed ? ` · seed ${seed.slice(0, 8)}…` : ""}
      </span>
    </div>
  );
}

export const ImperialFairnessStrip = memo(ImperialFairnessStripImpl);
export default ImperialFairnessStrip;
