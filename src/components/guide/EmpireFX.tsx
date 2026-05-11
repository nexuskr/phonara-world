import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion";

/**
 * Empire FX — Gold & Dark 영화급 프리미티브.
 * 모든 색은 디자인 토큰만 (--gold/--primary/--secondary/--accent/--destructive).
 */

export function GoldNebulaBg({ tone = "gold" }: { tone?: "gold" | "danger" | "cyber" | "emerald" }) {
  const reduce = useReducedMotion();
  const toneCfg = {
    gold:    { a: "bg-gradient-imperial", b: "bg-accent/20" },
    danger:  { a: "bg-destructive/25",    b: "bg-accent/15" },
    cyber:   { a: "bg-secondary/20",      b: "bg-gradient-imperial" },
    emerald: { a: "bg-emerald-500/15",    b: "bg-gradient-imperial" },
  }[tone];
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(hsl(var(--gold)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      {!reduce && (
        <>
          <motion.div
            className={`absolute -top-32 -right-32 w-[560px] h-[560px] rounded-full ${toneCfg.a} opacity-30 blur-3xl pointer-events-none`}
            animate={{ scale: [1, 1.18, 1], rotate: [0, 28, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className={`absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full ${toneCfg.b} opacity-25 blur-3xl pointer-events-none`}
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </>
  );
}

export function ParticleField({ density = 14 }: { density?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const dots = Array.from({ length: density });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {dots.map((_, i) => {
        const left = (i * 73) % 100;
        const dur = 6 + (i % 5) * 1.4;
        const delay = (i * 0.37) % dur;
        const size = 2 + (i % 3);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-gold/70"
            style={{
              left: `${left}%`,
              bottom: -10,
              width: size,
              height: size,
              boxShadow: "0 0 8px hsl(var(--gold)/0.8)",
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -700, opacity: [0, 1, 1, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
          />
        );
      })}
    </div>
  );
}

export function AnimatedCounter({
  to,
  className = "",
  duration = 1.6,
  prefix = "",
  suffix = "",
  format = (v: number) => v.toLocaleString(),
  jitter = 0,
}: {
  to: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (v: number) => string;
  jitter?: number; // 0이 아니면 도착 후에도 +/- 변동
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? to : 0);
  const [text, setText] = useState(format(reduce ? to : 0));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const unsub = mv.on("change", (v) => setText(format(Math.round(v))));
    return () => unsub();
  }, [mv, format]);

  useEffect(() => {
    if (reduce) return;
    const ctrl = animate(mv, to, { duration, ease: "easeOut" });
    return () => ctrl.stop();
  }, [to, duration, mv, reduce]);

  useEffect(() => {
    if (!jitter || reduce) return;
    const t = setInterval(() => {
      const cur = mv.get();
      const delta = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
      animate(mv, cur + delta, { duration: 0.6 });
    }, 1800);
    return () => clearInterval(t);
  }, [jitter, mv, reduce]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}{text}{suffix}
    </span>
  );
}

export function SimBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center text-[9px] tracking-widest font-black border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded ${className}`}>
      SIM
    </span>
  );
}

export function GoldDivider() {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="w-1.5 h-1.5 rotate-45 bg-gold/70 shadow-[0_0_8px_hsl(var(--gold)/0.8)]" />
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
    </div>
  );
}

/** 가독성 토큰 — starter 씬 전용 (시니어 모드일 때 본문 22px, 버튼 56px+) */
export const senior = {
  body: "data-[large=true]:text-[22px] data-[large=true]:leading-[1.55]",
  h1: "data-[large=true]:text-5xl",
  h2: "data-[large=true]:text-[40px] data-[large=true]:leading-tight",
  btn: "data-[large=true]:min-h-[64px] data-[large=true]:text-xl",
};
