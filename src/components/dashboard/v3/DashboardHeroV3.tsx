/**
 * DashboardHeroV3 — 100vh full-bleed Cosmic Hero
 * 단일 CTA → window event "phonara:focus-trade".
 *
 * Performance: hero is mostly static. One-shot mount animations only;
 * no infinite loops (glow/shimmer/pulse) by default. Reduced-motion users
 * see a fully static hero.
 */
import { motion } from "framer-motion";
import { Crown, Coins } from "lucide-react";
import CosmicBackdrop from "@/components/cosmic/CosmicBackdrop";
import { useMyPower, topNftLevel, type NFTRow } from "@/hooks/use-my-power";
import { useReducedMotionPref } from "@/lib/app-settings";
import ActivityEventTicker from "./ActivityEventTicker";

const LEVEL_LABEL: Record<string, string> = { bronze: "BRONZE", gold: "GOLD", diamond: "DIAMOND" };

export default function DashboardHeroV3({
  phon: phonProp,
  nfts: nftsProp,
  online,
}: { phon?: number; nfts?: NFTRow[]; online?: number } = {}) {
  // If parent already fetched, use the props (avoid duplicate hook subscription).
  const power = useMyPower();
  const phon = phonProp ?? power.phon;
  const nfts = nftsProp ?? power.nfts;
  const lv = topNftLevel(nfts);
  const tier = lv ? LEVEL_LABEL[lv] : "ROOKIE";
  const reduced = useReducedMotionPref();

  function onCta() {
    window.dispatchEvent(new Event("phonara:focus-trade"));
  }

  return (
    <section
      className="relative w-full overflow-hidden flex flex-col items-center justify-center px-5 select-none"
      style={{ minHeight: "var(--app-vh, 100svh)" }}
    >
      <CosmicBackdrop className="absolute inset-0 w-full h-full" animated={false} />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, hsla(258,80%,40%,0.28), transparent 60%), radial-gradient(40% 30% at 50% 88%, hsla(44,90%,55%,0.10), transparent 70%)",
        }}
      />

      {/* Kicker — static (no infinite shadow pulse) */}
      <div
        className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/55 bg-background/40"
        style={{ boxShadow: "0 0 24px -8px hsl(var(--gold)/0.5)" }}
      >
        <Crown className="w-3.5 h-3.5 text-gold" />
        <span className="text-[10px] tracking-[0.42em] text-gold font-black">
          ⟡ PHONARA · EST. 2026
        </span>
      </div>

      {/* Crown — one-shot entrance only; no infinite glow */}
      <motion.div
        initial={reduced ? false : { y: 30, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-7"
      >
        <div
          className="relative w-28 h-28 md:w-40 md:h-40 rounded-full flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, hsl(48 100% 78%) 0%, hsl(44 95% 55%) 45%, hsl(38 70% 35%) 100%)",
            boxShadow:
              "0 0 60px hsl(var(--gold) / 0.55), 0 0 120px hsl(var(--gold) / 0.28), inset 0 4px 16px hsl(48 100% 90% / 0.5)",
          }}
        >
          <Crown className="w-14 h-14 md:w-20 md:h-20 text-[hsl(240_28%_3%)]" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative z-10 mt-7 font-imperial font-black text-3xl md:text-6xl leading-tight text-center"
        style={{ textShadow: "0 0 40px hsla(258,80%,60%,0.45)" }}
      >
        폰을 켜는 순간,
        <br />
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(48 100% 78%) 0%, hsl(44 95% 60%) 50%, hsl(38 70% 45%) 100%)",
            textShadow: "0 0 60px hsla(44,100%,60%,0.45)",
          }}
        >
          너는 이미 우주 황제다.
        </span>
      </motion.h1>

      {/* Hero stats */}
      <div className="relative z-10 mt-7 flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-primary/40 bg-card/60">
          <Coins className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          <span className="font-display font-black text-xl md:text-3xl tabular-nums">
            {phon.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] md:text-xs tracking-widest text-primary/80 font-bold">PHON</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-gold/40 bg-card/60">
          <Crown className="w-4 h-4 md:w-5 md:h-5 text-gold" />
          <span className="font-imperial font-black text-xl md:text-3xl text-gold">{tier}</span>
        </div>
      </div>

      {/* CTA — static gold gradient, no shimmer/pulse */}
      <button
        onClick={onCta}
        className="relative z-10 mt-9 w-full max-w-md h-16 md:h-20 rounded-2xl text-[hsl(240_28%_3%)] font-imperial font-black text-xl md:text-2xl tracking-wider transition-transform active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, hsl(48 100% 78%) 0%, hsl(44 95% 60%) 55%, hsl(38 80% 48%) 100%)",
          boxShadow: "0 8px 28px -6px hsla(44,100%,55%,0.55)",
        }}
      >
        🚀 지금 제국을 지배하기
      </button>

      {/* Live ticker — slow, paused on background tabs by ticker itself */}
      <div className="relative z-10 mt-7 w-full max-w-md">
        <div className="text-center mb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.32em] text-gold/80 font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SIMULATION ACTIVE{typeof online === "number" ? ` · ${online.toLocaleString()}명 제국에 입성 중` : ""}
          </span>
        </div>
        <ActivityEventTicker variant="hero" limit={3} intervalMs={[3000, 6000]} realtime={false} />
      </div>
    </section>
  );
}
