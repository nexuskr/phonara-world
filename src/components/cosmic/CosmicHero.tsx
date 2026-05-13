import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

/**
 * CosmicHero — 화면 중앙의 거대 황금 Crown + CTA
 * 30~35% viewport height. 우주에서 떠오르는 듯한 cinematic 등장.
 */
export default function CosmicHero() {
  return (
    <div className="relative flex flex-col items-center justify-center text-center py-10 md:py-16 select-none">
      {/* Pulse rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.span
          aria-hidden
          className="absolute w-56 h-56 md:w-80 md:h-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--gold) / 0.35) 0%, transparent 60%)",
            filter: "blur(20px)",
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute w-72 h-72 md:w-[28rem] md:h-[28rem] rounded-full border border-gold/40"
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Crown */}
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.6 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10"
      >
        <div
          className="relative w-32 h-32 md:w-44 md:h-44 rounded-full flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 50% 35%, hsl(48 100% 78%) 0%, hsl(44 95% 55%) 45%, hsl(38 70% 35%) 100%)",
            boxShadow:
              "0 0 80px hsl(var(--gold) / 0.7), 0 0 160px hsl(var(--gold) / 0.4), inset 0 4px 16px hsl(48 100% 90% / 0.5)",
          }}
        >
          <Crown
            className="w-16 h-16 md:w-24 md:h-24 text-[hsl(240_28%_3%)]"
            strokeWidth={1.5}
          />
          {/* Shimmer sweep */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background:
                "linear-gradient(115deg, transparent 30%, hsl(48 100% 95% / 0.55) 50%, transparent 70%)",
              maskImage: "radial-gradient(circle, #000 60%, transparent 70%)",
              WebkitMaskImage:
                "radial-gradient(circle, #000 60%, transparent 70%)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.4 }}
          />
        </div>
      </motion.div>

      {/* Kicker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="relative z-10 mt-6 text-[10px] md:text-xs tracking-[0.5em] text-gold font-black"
        style={{ textShadow: "0 0 14px hsl(var(--gold) / 0.6)" }}
      >
        SIMULATION ACTIVE · 우주 제국
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.9 }}
        className="relative z-10 mt-3 font-display font-black text-2xl md:text-5xl leading-tight text-foreground"
      >
        폰을 켜는 순간,
        <br />
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(48 100% 78%) 0%, hsl(44 95% 60%) 50%, hsl(38 70% 45%) 100%)",
          }}
        >
          너는 이미 우주 황제다.
        </span>
      </motion.h1>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.8 }}
        className="relative z-10 mt-6"
      >
        <Link
          to="/empire"
          className="group relative inline-flex items-center gap-3 px-7 md:px-10 py-3.5 md:py-4 rounded-full font-display font-black text-sm md:text-lg text-[hsl(240_28%_3%)] press"
          style={{
            background:
              "linear-gradient(135deg, hsl(48 100% 78%) 0%, hsl(44 95% 60%) 55%, hsl(38 80% 48%) 100%)",
            boxShadow:
              "0 0 40px hsl(var(--gold) / 0.55), 0 0 90px hsl(var(--gold) / 0.3), inset 0 1px 0 hsl(48 100% 95% / 0.6)",
          }}
        >
          <Crown className="w-5 h-5" />
          지금 우주 제국에 입성하시겠습니까?
          <span
            aria-hidden
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition"
            style={{
              boxShadow:
                "0 0 60px hsl(var(--gold) / 0.85), 0 0 140px hsl(var(--gold) / 0.55)",
            }}
          />
        </Link>
      </motion.div>
    </div>
  );
}
