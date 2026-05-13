/**
 * DashboardHeroV3 — 100vh full-bleed Cosmic Hero
 * 단일 CTA → window event "phonara:focus-trade".
 */
import { motion } from "framer-motion";
import { Crown, Coins } from "lucide-react";
import CosmicBackdrop from "@/components/cosmic/CosmicBackdrop";
import { useMyPower, topNftLevel } from "@/hooks/use-my-power";
import { useOnline } from "@/components/LiveStats";
import ActivityEventTicker from "./ActivityEventTicker";

const LEVEL_LABEL: Record<string, string> = { bronze: "BRONZE", gold: "GOLD", diamond: "DIAMOND" };

export default function DashboardHeroV3() {
  const { phon, nfts } = useMyPower();
  const lv = topNftLevel(nfts);
  const tier = lv ? LEVEL_LABEL[lv] : "ROOKIE";
  const online = useOnline();

  function onCta() {
    window.dispatchEvent(new Event("phonara:focus-trade"));
  }

  return (
    <section className="relative w-full min-h-[100svh] overflow-hidden flex flex-col items-center justify-center px-5 select-none">
      <CosmicBackdrop className="absolute inset-0 w-full h-full" />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, hsla(258,80%,40%,0.28), transparent 60%), radial-gradient(40% 30% at 50% 88%, hsla(44,90%,55%,0.10), transparent 70%)",
        }}
      />

      {/* Kicker */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/55 bg-background/40 backdrop-blur"
        style={{ boxShadow: "0 0 28px -6px hsl(var(--gold)/0.55)" }}
      >
        <Crown className="w-3.5 h-3.5 text-gold" />
        <span className="text-[10px] tracking-[0.42em] text-gold font-black">
          ⟡ PHONARA · EST. 2026
        </span>
      </motion.div>

      {/* Crown */}
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.7 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        className="relative z-10 mt-7"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.span
            aria-hidden
            className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--gold) / 0.38) 0%, transparent 60%)",
              filter: "blur(20px)",
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div
          className="relative w-28 h-28 md:w-40 md:h-40 rounded-full flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, hsl(48 100% 78%) 0%, hsl(44 95% 55%) 45%, hsl(38 70% 35%) 100%)",
            boxShadow:
              "0 0 80px hsl(var(--gold) / 0.7), 0 0 160px hsl(var(--gold) / 0.4), inset 0 4px 16px hsl(48 100% 90% / 0.5)",
          }}
        >
          <Crown className="w-14 h-14 md:w-20 md:h-20 text-[hsl(240_28%_3%)]" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.45 }}
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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        className="relative z-10 mt-7 flex items-center gap-3 md:gap-6"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-primary/40 bg-card/60 backdrop-blur">
          <Coins className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          <span className="font-display font-black text-xl md:text-3xl tabular-nums">
            {phon.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] md:text-xs tracking-widest text-primary/80 font-bold">PHON</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-gold/40 bg-card/60 backdrop-blur">
          <Crown className="w-4 h-4 md:w-5 md:h-5 text-gold" />
          <span className="font-imperial font-black text-xl md:text-3xl text-gold">{tier}</span>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        onClick={onCta}
        initial={{ opacity: 0, y: 24 }}
        animate={{
          opacity: 1,
          y: 0,
          boxShadow: [
            "0 0 0 0 hsla(44,100%,60%,0.55)",
            "0 0 0 24px hsla(44,100%,60%,0)",
            "0 0 0 0 hsla(44,100%,60%,0)",
          ],
        }}
        transition={{
          opacity: { duration: 0.6, delay: 0.95 },
          y: { duration: 0.6, delay: 0.95 },
          boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 1.3 },
        }}
        whileTap={{ scale: 0.97 }}
        className="relative z-10 mt-9 w-full max-w-md h-16 md:h-20 rounded-2xl text-[hsl(240_28%_3%)] font-imperial font-black text-xl md:text-2xl tracking-wider overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(48 100% 78%) 0%, hsl(44 95% 60%) 55%, hsl(38 80% 48%) 100%)",
        }}
      >
        <span className="relative z-10">🚀 지금 제국을 지배하기</span>
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      </motion.button>

      {/* Live ticker (3줄) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 1.4 }}
        className="relative z-10 mt-7 w-full max-w-md"
      >
        <div className="text-center mb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.32em] text-gold/80 font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SIMULATION ACTIVE · {online.toLocaleString()}명 제국에 입성 중
          </span>
        </div>
        <ActivityEventTicker variant="hero" limit={3} />
      </motion.div>
    </section>
  );
}
