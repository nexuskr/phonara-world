import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, Users, ChevronDown, Shield, Clock, Coins, Crown } from "lucide-react";
import { useOnline } from "@/components/LiveStats";
import {
  GoldNebulaBg,
  GoldOrbitField,
  ParticleField,
  ParallaxLayer,
  AnimatedCounter,
  SimBadge,
  senior,
} from "./EmpireFX";

/**
 * Phase 4 V2 — 씬1 HERO
 * 메가 타이틀 · 3카드 라이브 대시보드 · Magic Link 최우선 CTA · 행성 시차 배경.
 */
export default function FomoScrollHero({
  isLoggedIn = false,
  large = false,
}: { isLoggedIn?: boolean; large?: boolean }) {
  const reduce = useReducedMotion();
  const online = useOnline();
  const seed = online > 0 ? online : 18432;

  return (
    <section
      data-large={large}
      className="snap-start snap-always min-h-[calc(100dvh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-10"
    >
      <GoldNebulaBg tone="gold" />
      <GoldOrbitField count={8} />
      <ParticleField density={16} />

      {/* Parallax planet */}
      <ParallaxLayer strength={70}>
        <div
          aria-hidden
          className="absolute right-[-90px] top-[18%] w-[280px] h-[280px] rounded-full opacity-30 blur-[1px]"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, hsl(var(--gold)/0.9), hsl(var(--gold)/0.15) 55%, transparent 70%)",
            boxShadow: "0 0 80px hsl(var(--gold)/0.45)",
          }}
        />
      </ParallaxLayer>

      {/* === Imperial overlay: 3겹 vignette + 2종 gold grid + grain === */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.065]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--gold)/0.7) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.7) 1px, transparent 1px)",
            backgroundSize: "112px 112px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.034]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--gold)/0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)/0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--gold)/0.55) 0.5px, transparent 0.5px), radial-gradient(hsl(var(--gold)/0.35) 0.5px, transparent 0.5px)",
            backgroundSize: "3px 3px, 7px 7px",
            backgroundPosition: "0 0, 1px 2px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 55% at 50% 30%, transparent 0%, hsl(var(--background)/0.55) 70%, hsl(var(--background)/0.85) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(45% 30% at 50% 45%, transparent 0%, hsl(var(--background)/0.7) 100%)",
            mixBlendMode: "multiply",
          }}
        />
      </div>

      <div className="relative max-w-md mx-auto w-full text-center">
        {/* === PHONARA · EST. 2026 seal === */}
        <div className="flex flex-col items-center select-none mb-3">
          <div className="h-px w-44 bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
          <div
            className="mt-1.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold/55 bg-background/70"
            style={{
              boxShadow:
                "0 0 28px -6px hsl(var(--gold)/0.55), inset 0 1px 0 hsl(var(--gold)/0.45), inset 0 -1px 0 hsl(var(--gold)/0.18)",
            }}
          >
            <Crown className="w-4 h-4 text-gold drop-shadow-[0_0_7px_hsl(var(--gold)/0.7)]" />
            <span
              className="text-[10px] tracking-[0.42em] text-gold font-black"
              style={{ textShadow: "0 0 10px hsl(var(--gold)/0.45)" }}
            >
              PHONARA · EST. 2026
            </span>
          </div>
          <div className="mt-1.5 h-px w-44 bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
        </div>

        {/* LIVE 칩 */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/60 text-[10px] font-black tracking-[0.3em] text-gold mb-5 shadow-[0_0_18px_hsl(var(--gold)/0.45)]"
        >
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-gold animate-ping opacity-60" />
            <span className="relative w-2 h-2 rounded-full bg-gold" />
          </span>
          LIVE · 지금 이 순간
        </motion.div>

        {/* === MEGA 골드 타이틀 — luxury watch frame === */}
        <div
          className="relative mx-auto rounded-3xl border-2 border-gold/50 bg-background/55 px-5 py-6 outline outline-1 outline-offset-[3px] outline-gold/20 overflow-hidden"
          style={{
            boxShadow:
              "0 0 44px hsl(var(--gold)/0.28), 0 0 84px hsl(var(--gold)/0.14), inset 0 1px 0 hsl(var(--gold)/0.28), inset 0 -1px 0 hsl(var(--gold)/0.14)",
          }}
        >
          <span aria-hidden className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-gold/65 to-transparent" />
          <span aria-hidden className="absolute bottom-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-gold/80 rounded-tl-md" />
          <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-gold/80 rounded-tr-md" />
          <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-gold/80 rounded-bl-md" />
          <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-gold/80 rounded-br-md" />
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-[0.09]"
            style={{
              background:
                "conic-gradient(from 210deg at 50% 0%, transparent 0deg, hsl(var(--gold)) 60deg, transparent 140deg, transparent 360deg)",
            }}
          />

          <motion.h1
            initial={reduce ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.08 }}
            className={`relative font-imperial leading-[1.05] break-keep ${senior.h1}`}
            style={{
              fontSize: "clamp(38px, 12vw, 64px)",
              textShadow:
                "0 0 32px hsl(var(--gold)/0.6), 0 0 72px hsl(var(--gold)/0.28), 0 1px 0 hsl(var(--gold-stroke)/0.6)",
            }}
          >
            <span className="text-foreground/85 block mb-2" style={{ fontSize: "clamp(22px, 6.5vw, 32px)" }}>
              지금
            </span>
            <span className="text-gradient-gold drop-shadow-[0_0_30px_hsl(var(--gold)/0.7)]">
              <AnimatedCounter to={seed} duration={2.2} jitter={3} />
              <span style={{ fontSize: "clamp(28px, 8vw, 42px)" }}>명</span>
            </span>
            <br />
            <span className="text-gradient-imperial">제국에 입성 중</span>
          </motion.h1>
        </div>

        {/* SIM 라벨 */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-secondary/30 text-xs text-muted-foreground"
        >
          <Users className="w-3.5 h-3.5 text-secondary" />
          Simulation Active <SimBadge />
        </motion.div>

        {/* 3카드 라이브 대시보드 */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-6 grid grid-cols-3 gap-2"
        >
          <DashCard
            icon={<Users className="w-3.5 h-3.5" />}
            label="동시접속"
            value={<AnimatedCounter to={seed} duration={1.8} jitter={2} />}
            suffix="명"
            large={large}
          />
          <DashCard
            icon={<Coins className="w-3.5 h-3.5" />}
            label="오늘 출금"
            value={
              <>
                ₩<AnimatedCounter to={8_241_500_000} duration={2.6} jitter={120_000} format={(v) => v.toLocaleString()} />
              </>
            }
            large={large}
            highlight
          />
          <DashCard
            icon={<Clock className="w-3.5 h-3.5" />}
            label="평균 출금"
            value="23"
            suffix="분"
            large={large}
          />
        </motion.div>

        <p className={`text-sm text-muted-foreground mt-6 break-keep ${senior.bodyXl}`}>
          이메일 한 줄이면 시작합니다. 신용카드 없음, 주민번호 없음.
        </p>

        {/* Magic Link 최우선 CTA */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="relative mt-6"
        >
          {!reduce && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{ boxShadow: ["var(--glow-gold)", "var(--glow-gold-xl)", "var(--glow-gold)"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <Link
            data-large={large}
            to={isLoggedIn ? "/wallet?intent=first-deposit&tab=deposit&amount=50000" : "/secure-auth?next=/wallet?intent=first-deposit"}
            className={`press sheen relative w-full inline-flex items-center justify-center gap-2 min-h-[68px] rounded-2xl bg-gradient-imperial text-gold-foreground font-display font-black text-lg ${senior.btnXl}`}
          >
            <Flame className="w-5 h-5" /> 1분 안에 제국 입성하기 →
          </Link>
        </motion.div>

        {!isLoggedIn && (
          <Link to="/secure-auth" className="block mt-3 text-xs text-muted-foreground hover:text-gold transition">
            이미 회원이신가요? 로그인 →
          </Link>
        )}

        {/* trust 미니라인 */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-400" /> 19+ 본인인증</span>
          <span>·</span>
          <span>평균 출금 23분</span>
          <span>·</span>
          <span>OTP 필수</span>
        </div>
      </div>

      {/* SCROLL ↓ */}
      <motion.div
        animate={reduce ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[10px] font-bold tracking-[0.3em] text-gold/80"
      >
        <span>SCROLL</span>
        <ChevronDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}

function DashCard({
  icon,
  label,
  value,
  suffix,
  highlight = false,
  large = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  suffix?: string;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <div
      data-large={large}
      className={`relative glass-strong rounded-xl px-2.5 py-3 border overflow-hidden ${
        highlight ? "border-gold/60 shadow-[0_0_22px_hsl(var(--gold)/0.38)]" : "border-gold/30"
      }`}
    >
      <span aria-hidden className="absolute inset-x-2 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div className="flex items-center justify-center gap-1 text-[9px] tracking-[0.2em] font-black text-gold/85 mb-1">
        {icon}
        <span className="break-keep">{label}</span>
      </div>
      <div className={`font-imperial text-base sm:text-lg text-gradient-gold tabular-nums leading-tight break-keep ${senior.body}`}>
        {value}
        {suffix && <span className="text-[10px] text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}
