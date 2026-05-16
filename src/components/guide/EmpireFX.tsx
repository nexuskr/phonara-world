import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { setVisibleInterval } from "@/lib/util/visible-interval";

/**
 * Empire FX — Gold & Dark 영화급 프리미티브.
 * 모든 색은 디자인 토큰만 (--gold/--primary/--secondary/--accent/--destructive).
 */

export function GoldNebulaBg({ tone = "gold" }: { tone?: "gold" | "danger" | "cyber" | "emerald" }) {
  const reduce = useReducedMotion();
  const toneCfg = {
    gold:    { a: "bg-gradient-imperial", b: "bg-accent/25", c: "bg-gold/20" },
    danger:  { a: "bg-destructive/30",    b: "bg-accent/20", c: "bg-destructive/15" },
    cyber:   { a: "bg-secondary/25",      b: "bg-gradient-imperial", c: "bg-secondary/15" },
    emerald: { a: "bg-emerald-500/20",    b: "bg-gradient-imperial", c: "bg-emerald-400/15" },
  }[tone];
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      {/* deeper vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(80% 60% at 50% 30%, transparent 0%, hsl(var(--background)/0.65) 100%)" }} />
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(hsl(var(--gold)/0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.55) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      {!reduce && (
        <>
          <motion.div
            className={`absolute -top-32 -right-32 w-[620px] h-[620px] rounded-full ${toneCfg.a} opacity-45 blur-3xl pointer-events-none`}
            animate={{ scale: [1, 1.18, 1], rotate: [0, 28, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className={`absolute -bottom-40 -left-40 w-[540px] h-[540px] rounded-full ${toneCfg.b} opacity-35 blur-3xl pointer-events-none`}
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[360px] h-[360px] rounded-full ${toneCfg.c} opacity-25 blur-3xl pointer-events-none`}
            animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.18, 0.32, 0.18] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      <GoldVignette />
    </>
  );
}

/** 코너 4개 골드 헤일로 — 시네마틱 비네팅 */
export function GoldVignette() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
    </div>
  );
}

/** Detect coarse-pointer / mobile to halve particle counts. */
function useIsLowEndDevice() {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const cores = (navigator as any).hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 4;
  return coarse || cores <= 4 || mem <= 4;
}

export function ParticleField({ density = 14 }: { density?: number }) {
  const reduce = useReducedMotion();
  const low = useIsLowEndDevice();
  if (reduce) return null;
  const effective = low ? Math.max(4, Math.floor(density / 2)) : density;
  const dots = Array.from({ length: effective });
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

/** 곡선 궤도를 도는 골드 입자 — ParticleField 상위 호환 */
export function GoldOrbitField({ count = 10 }: { count?: number }) {
  const reduce = useReducedMotion();
  const low = useIsLowEndDevice();
  if (reduce) return null;
  const effective = low ? Math.max(3, Math.floor(count / 2)) : count;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: effective }).map((_, i) => {
        const r = 110 + (i % 4) * 60;
        const dur = 18 + (i % 5) * 4;
        const delay = (i * 0.6) % dur;
        const dir = i % 2 === 0 ? 1 : -1;
        return (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{ width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r }}
            animate={{ rotate: dir * 360 }}
            transition={{ duration: dur, repeat: Infinity, ease: "linear", delay }}
          >
            <span
              className="absolute top-0 left-1/2 rounded-full"
              style={{
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                transform: "translateX(-50%)",
                background: "hsl(var(--gold))",
                boxShadow: "0 0 10px hsl(var(--gold)/0.9)",
                opacity: 0.85,
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/** scroll 기반 시차 레이어 — 자식을 y축으로 변위 */
export function ParallaxLayer({
  children,
  strength = 60,
  className = "",
}: { children: React.ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength]);
  return (
    <div ref={ref} className={`absolute inset-0 pointer-events-none ${className}`}>
      <motion.div style={reduce ? undefined : { y }} className="absolute inset-0">
        {children}
      </motion.div>
    </div>
  );
}

/** 씬과 씬 사이의 골드 leak strip — 시네마틱 컷 */
export function CinemaTransition() {
  const reduce = useReducedMotion();
  return (
    <div className="relative h-3 w-full overflow-hidden snap-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--gold)/0.55) 25%, hsl(var(--gold)/0.9) 50%, hsl(var(--gold)/0.55) 75%, transparent 100%)",
          filter: "blur(2px)",
        }}
      />
      {!reduce && (
        <motion.div
          className="absolute inset-y-0 -left-1/3 w-1/3"
          style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold)/0.95), transparent)" }}
          animate={{ x: ["0%", "420%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}

/** 황금 임페리얼 인장 — 회전 conic ring + 왕관 각인 */
export function ImperialSeal({
  size = 168,
  label = "GUARANTEED",
  title = "운영자\n무손실",
  caption = "EMPIRE · EST. 2024",
}: { size?: number; label?: string; title?: string; caption?: string }) {
  const reduce = useReducedMotion();
  const stroke = Math.max(2, size * 0.012);
  const inner = size - 24;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {!reduce && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
          style={{
            background:
              "conic-gradient(from 0deg, hsl(var(--gold)/0) 0deg, hsl(var(--gold)/0.85) 90deg, hsl(var(--gold)/0) 180deg, hsl(var(--gold)/0.85) 270deg, hsl(var(--gold)/0) 360deg)",
          }}
        />
      )}
      <div
        className="absolute rounded-full bg-background flex items-center justify-center"
        style={{
          inset: 12,
          border: `${stroke}px solid hsl(var(--gold)/0.8)`,
          boxShadow: "0 0 48px hsl(var(--gold)/0.55), inset 0 0 24px hsl(var(--gold)/0.25)",
        }}
      >
        {/* 외곽 점 12개 */}
        <svg width={inner} height={inner} viewBox="0 0 100 100" className="absolute inset-0">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x = 50 + Math.cos(a) * 42;
            const y = 50 + Math.sin(a) * 42;
            return <circle key={i} cx={x} cy={y} r="1.4" fill="hsl(var(--gold))" opacity="0.85" />;
          })}
        </svg>
        <div className="relative text-center px-3">
          <svg viewBox="0 0 24 24" width={size * 0.16} height={size * 0.16} className="mx-auto" fill="none">
            <path
              d="M2 7l4 8h12l4-8-5 4-5-7-5 7-5-4z"
              stroke="hsl(var(--gold))"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="hsl(var(--gold)/0.18)"
            />
          </svg>
          <div className="font-imperial tracking-[0.28em] text-gold mt-1" style={{ fontSize: size * 0.07 }}>
            {label}
          </div>
          <div className="font-imperial text-gradient-gold leading-tight mt-0.5 whitespace-pre-line" style={{ fontSize: size * 0.13 }}>
            {title}
          </div>
          <div className="font-imperial tracking-[0.22em] text-gold/70 mt-1" style={{ fontSize: size * 0.05 }}>
            {caption}
          </div>
        </div>
      </div>
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
  jitter?: number;
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
    const t = setVisibleInterval(() => {
      const cur = mv.get();
      const delta = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
      animate(mv, cur + delta, { duration: 0.6 });
    }, 1800 , { meta: { owner: "EmpireFX", category: "cosmetic" } });
    return () => t();
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

/** 순위 메달 SVG — 1=gold, 2=silver, 3=bronze */
export function RankMedal({ rank, size = 40 }: { rank: 1 | 2 | 3; size?: number }) {
  const palette = {
    1: { ring: "hsl(var(--gold))", core: "hsl(var(--gold)/0.9)", text: "hsl(var(--gold-foreground))" },
    2: { ring: "hsl(0 0% 75%)", core: "hsl(0 0% 80%)", text: "hsl(240 28% 12%)" },
    3: { ring: "hsl(28 60% 48%)", core: "hsl(28 70% 52%)", text: "hsl(40 30% 96%)" },
  }[rank];
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <defs>
        <radialGradient id={`med-${rank}`} cx="50%" cy="40%">
          <stop offset="0%" stopColor={palette.core} />
          <stop offset="100%" stopColor={palette.ring} />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="17" fill={`url(#med-${rank})`} stroke={palette.ring} strokeWidth="1.8" />
      <circle cx="20" cy="20" r="13" fill="none" stroke={palette.text} strokeOpacity="0.25" strokeWidth="1" />
      <text x="20" y="25" textAnchor="middle" fontSize="14" fontWeight="900" fill={palette.text}>{rank}</text>
    </svg>
  );
}

/** 가독성 토큰 — starter 씬 전용 (시니어 모드일 때 본문 22px, 버튼 56px+) */
export const senior = {
  body: "data-[large=true]:text-[22px] data-[large=true]:leading-[1.55]",
  bodyXl: "data-[large=true]:text-[24px] data-[large=true]:leading-[1.55]",
  h1: "data-[large=true]:text-5xl",
  h2: "data-[large=true]:text-[40px] data-[large=true]:leading-tight",
  btn: "data-[large=true]:min-h-[64px] data-[large=true]:text-xl",
  btnXl: "data-[large=true]:min-h-[72px] data-[large=true]:text-2xl",
};
