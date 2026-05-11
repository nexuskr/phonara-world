import { Link } from "react-router-dom";
import { Flame, ArrowRight, Crown, ShieldCheck, Eye } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import DepositCTA from "@/components/onboarding/DepositCTA";
import { useOnline } from "@/components/LiveStats";
import {
  GoldNebulaBg,
  GoldOrbitField,
  ParticleField,
  ImperialSeal,
  AnimatedCounter,
  SimBadge,
  senior,
} from "./EmpireFX";

/**
 * Phase 4 V2 — 씬10 FINAL CTA.
 * 임페리얼 인장 + 메가 1탭 입금 + 라이브 시청자 카운터.
 */
export default function FomoFinalCTA({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  const online = useOnline();
  const viewers = online > 0 ? online : 18432;

  return (
    <section
      data-large={large}
      className="snap-start snap-always min-h-[calc(100dvh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-12"
    >
      <GoldNebulaBg tone="gold" />
      <GoldOrbitField count={10} />
      <ParticleField density={24} />

      <div className="relative max-w-md mx-auto w-full text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/60 text-[10px] font-black tracking-[0.3em] text-gold mb-5 shadow-[0_0_18px_hsl(var(--gold)/0.4)]"
        >
          <Crown className="w-3 h-3" /> 마지막 한 걸음
        </motion.div>

        <motion.h2
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className={`font-imperial leading-[1.05] break-keep mb-4 ${senior.h1}`}
          style={{
            fontSize: "clamp(38px, 12vw, 60px)",
            textShadow: "0 0 28px hsl(var(--gold)/0.55), 0 0 64px hsl(var(--gold)/0.25)",
          }}
        >
          지금,<br />
          <span className="text-gradient-gold drop-shadow-[0_0_28px_hsl(var(--gold)/0.65)]">제국에 입성하십시오</span>
        </motion.h2>

        {/* Imperial seal */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-5"
        >
          <ImperialSeal size={140} label="GUARANTEED" title={"운영자\n무손실"} caption="EMPIRE · EST. 2024" />
        </motion.div>

        {/* 3 trust pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
          {[
            { icon: <ShieldCheck className="w-3 h-3" />, label: "환불보장" },
            { icon: <Crown className="w-3 h-3" />, label: "19+ 본인인증" },
            { icon: <Flame className="w-3 h-3" />, label: "OTP 필수" },
          ].map((p) => (
            <span key={p.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full glass border border-gold/35 text-[10px] font-black tracking-widest text-gold">
              {p.icon}{p.label}
            </span>
          ))}
        </div>

        <p className={`text-sm text-muted-foreground mb-7 break-keep ${senior.bodyXl}`}>
          50,000원 한 번이면 모든 미션이 자동 완료됩니다.<br />
          평균 출금 23분 · 19+ 본인인증 · 운영자 무손실 인장.
        </p>

        {/* MEGA 1탭 입금 버튼 */}
        <div className="relative">
          {!reduce && (
            <>
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-gold pointer-events-none"
                animate={{ opacity: [0.25, 0.95, 0.25], scale: [1, 1.06, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={{ boxShadow: ["var(--glow-gold)", "var(--glow-gold-xl)", "var(--glow-gold)"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}
          <div data-large={large} className={`relative ${senior.btnXl}`}>
            <DepositCTA size="lg" />
          </div>
        </div>

        {/* viewers counter */}
        <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Eye className="w-3 h-3 text-gold" />
          지금 <span className="font-imperial text-gold tabular-nums mx-1">
            <AnimatedCounter to={viewers} duration={1.8} jitter={4} />
          </span> 명이 함께 보고 있습니다 <SimBadge />
        </div>

        <Link
          to="/packages?focus=easy_starter"
          className={`press mt-5 w-full inline-flex items-center justify-center gap-2 min-h-[52px] rounded-2xl glass-strong border border-gold/30 text-sm font-bold hover:border-gold/60 transition ${senior.btn}`}
        >
          <Flame className="w-4 h-4 text-gold" /> 패키지 전체 보기 <ArrowRight className="w-4 h-4" />
        </Link>

        <div className="mt-7 text-[10px] text-muted-foreground tracking-widest break-keep">
          본 서비스는 미션 보상형 리워드 플랫폼이며, 투자/도박이 아닙니다.
        </div>
      </div>
    </section>
  );
}
