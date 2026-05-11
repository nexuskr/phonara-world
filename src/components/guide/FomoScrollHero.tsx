import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useOnline } from "@/components/LiveStats";

/**
 * Phase 4 · 씬1 HERO
 * "지금 18,432명이 입금 중" + SIM 카운터 + Magic Link 1버튼.
 * - 디자인 토큰만 사용 (gold/primary/secondary/destructive)
 * - SIM 배지 명시 (법적·신뢰 안전)
 */
export default function FomoScrollHero({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const reduce = useReducedMotion();
  const online = useOnline();
  const [count, setCount] = useState(18432);

  useEffect(() => {
    const t = setInterval(() => setCount((c) => c + Math.floor(Math.random() * 4) - 1), 1800);
    return () => clearInterval(t);
  }, []);

  const display = online > 0 ? online : count;

  return (
    <section className="snap-start min-h-[calc(100vh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-10">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/15" />
      {!reduce && (
        <motion.div
          className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-gradient-gold opacity-25 blur-3xl"
          animate={{ scale: [1, 1.15, 1], rotate: [0, 24, 0] }}
          transition={{ duration: 14, repeat: Infinity }}
        />
      )}

      <div className="relative max-w-md mx-auto w-full text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/40 text-[10px] font-black tracking-[0.3em] text-gold mb-5"
        >
          <Flame className="w-3 h-3 animate-pulse" /> 지금 이 순간
        </motion.div>

        <motion.h1
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="font-imperial text-3xl sm:text-4xl leading-tight break-keep"
        >
          지금 <span className="text-gradient-gold tabular-nums">{display.toLocaleString()}</span>명이
          <br />
          <span className="text-gradient-primary">입금하고 있습니다</span>
        </motion.h1>

        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-secondary/30 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5 text-secondary" />
          실시간 동시접속 ·
          <span className="text-[9px] tracking-widest font-black border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded">SIM</span>
        </div>

        <p className="text-sm text-muted-foreground mt-6 break-keep">
          이메일 한 줄이면 시작합니다. 신용카드 없음, 주민번호 없음.
        </p>

        <Link
          to={isLoggedIn ? "/wallet?intent=first-deposit&tab=deposit&amount=50000" : "/secure-auth?next=/wallet?intent=first-deposit"}
          className="press sheen mt-6 w-full inline-flex items-center justify-center gap-2 min-h-[64px] rounded-2xl bg-gradient-gold text-gold-foreground font-display font-black text-lg glow-gold"
        >
          💎 1분 안에 시작하기 →
        </Link>

        <div className="mt-3 text-[10px] text-muted-foreground tracking-widest">SCROLL ↓</div>
      </div>
    </section>
  );
}
