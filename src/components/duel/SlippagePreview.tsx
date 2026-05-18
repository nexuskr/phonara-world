// IMPERIAL-SINGULARITY v3.5: expected-slippage preview, color-coded.
import { expectedSlippage, slippageTone } from "@/lib/flywheel";

const TONE_CLASS: Record<ReturnType<typeof slippageTone>, string> = {
  good:   "text-emerald-300 border-emerald-400/40 bg-emerald-500/10",
  warn:   "text-amber-200 border-amber-400/40 bg-amber-500/10",
  danger: "text-rose-200 border-rose-400/50 bg-rose-500/10 animate-pulse",
};

export function SlippagePreview({ bet, pool }: { bet: number; pool: number }) {
  const slip = expectedSlippage(bet, pool);
  const tone = slippageTone(slip);
  return (
    <div className={`rounded-lg border px-2.5 py-1.5 flex items-center justify-between text-[11px] ${TONE_CLASS[tone]}`}>
      <span className="uppercase tracking-widest opacity-80">예상 슬리피지</span>
      <span className="font-mono font-bold">{(slip * 100).toFixed(2)}%</span>
    </div>
  );
}

export default SlippagePreview;
