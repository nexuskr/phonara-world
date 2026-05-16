import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { G } from "@/lib/glossary";
import { useOnline } from "@/components/LiveStats";

/**
 * 5초 룰 히어로 — 큰 한 문장 + 단일 CTA.
 * 5초 안에 "여긴 돈 벌고 게임하는 곳" 이라 답할 수 있어야 통과.
 */
export default function WorldHero({
  primaryCta = { to: "/earn", label: `${G.ctaStartFree} ${G.ctaStartFreeReward}` },
  headline,
  sub,
}: {
  primaryCta?: { to: string; label: string };
  headline?: string;
  sub?: string;
}) {
  const online = useOnline();
  return (
    <section className="relative overflow-hidden border-b border-border/40">
      {/* Backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-card/60" />
        <div className="absolute -top-20 -left-20 w-[420px] h-[420px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute -bottom-24 -right-10 w-[420px] h-[420px] rounded-full bg-pink-500/15 blur-[120px]" />
      </div>

      <div className="container py-10 md:py-16 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-primary/30 text-[10px] font-bold tracking-[0.25em] text-primary uppercase mb-4">
          <Sparkles className="w-3 h-3" />
          PHONARA.WORLD
        </div>

        <h1 className="font-imperial text-3xl md:text-5xl lg:text-6xl leading-tight tracking-tight text-foreground">
          {headline ?? (
            <>
              <span className="text-gradient-imperial">무료로</span> 돈 벌 수 있는 곳
            </>
          )}
        </h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          {sub ?? "부업하면서 게임도 하고, 코인 트레이딩까지. 한국에서 제일 쉽게 돈 버는 가상세계."}
        </p>

        <div className="mt-6 flex items-center justify-center">
          <Link
            to={primaryCta.to}
            className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-imperial text-primary-foreground font-black text-sm md:text-base glow-imperial press"
          >
            {primaryCta.label}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          지금 <span className="font-mono font-bold text-foreground">{online.toLocaleString()}</span> 명이 벌고 있습니다
        </div>
      </div>
    </section>
  );
}
