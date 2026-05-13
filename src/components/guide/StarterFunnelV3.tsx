import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import CosmicBackdrop from "@/components/cosmic/CosmicBackdrop";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";
import { useOnline } from "@/components/LiveStats";
import ActivityEventTicker from "@/components/dashboard/v3/ActivityEventTicker";

/**
 * StarterFunnelV3 — 3단 심리 압축 엔진
 *  SCENE 1 HOOK     : Cosmic + 강제 CTA (스크롤 금지)
 *  SCENE 2 SIMPLIFY : LONG/SHORT 단 한 문장 + 체험 CTA
 *  SCENE 3 FOMO     : 실시간 가짜 피드 + 최종 CTA
 *
 *  KPI = 버튼 클릭률. 다른 모든 UI는 제거.
 */

type Scene = 0 | 1 | 2;

const FOMO_NAMES = ["K***", "J***", "S***", "P***", "L***", "M***", "H***", "C***", "Y***", "B***", "T***", "R***"];
const FOMO_TEMPLATES: ((n: string) => string)[] = [
  (n) => `${n} +${(Math.floor(Math.random() * 30) + 5) * 1000}원 수익`,
  (n) => `${n} ${Math.floor(Math.random() * 6) + 3}연승 달성`,
  (n) => `${n} 입금 완료`,
  (n) => `${n} 첫 베팅 적중`,
  (n) => `${n} +${(Math.floor(Math.random() * 80) + 20) * 1000}원 폭발`,
  (n) => `${n} Crown 획득`,
];

function makeFomoLine(): string {
  const n = FOMO_NAMES[Math.floor(Math.random() * FOMO_NAMES.length)];
  const t = FOMO_TEMPLATES[Math.floor(Math.random() * FOMO_TEMPLATES.length)];
  return t(n);
}

export default function StarterFunnelV3() {
  const navigate = useNavigate();
  const [db] = useDB();
  const [scene, setScene] = useState<Scene>(0);
  const [checked, setChecked] = useState(false);

  // 1) Gate — 이미 본 사람은 즉시 /command (force=1 우회)
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).get("force") === "1";
    if (force) { setChecked(true); return; }
    let alive = true;
    (async () => {
      try {
        const seen = localStorage.getItem("phonara_guide_seen_v1") === "1";
        if (seen) { navigate("/command", { replace: true }); return; }
        if (db.user?.id) {
          const { data } = await supabase
            .from("profiles")
            .select("has_seen_guide")
            .eq("id", db.user.id)
            .maybeSingle();
          if (alive && (data as any)?.has_seen_guide) {
            try { localStorage.setItem("phonara_guide_seen_v1", "1"); } catch {}
            navigate("/command", { replace: true });
            return;
          }
        }
      } catch { /* noop */ }
      if (alive) setChecked(true);
    })();
    return () => { alive = false; };
  }, [db.user?.id, navigate]);

  // 2) 완주 시 마킹 + 이동
  async function markSeenAndGo(target: string) {
    try { localStorage.setItem("phonara_guide_seen_v1", "1"); } catch {}
    if (db.user?.id) {
      void supabase.from("profiles").update({ has_seen_guide: true } as any).eq("id", db.user.id);
    }
    navigate(target);
  }

  // 3) 스크롤 차단 (마운트 동안)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!checked) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold/50 border-t-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-background">
      <CosmicBackdrop className="absolute inset-0 w-full h-full" />
      {/* nebula accent */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, hsla(258,80%,40%,0.28), transparent 60%), radial-gradient(40% 30% at 50% 80%, hsla(44,90%,55%,0.10), transparent 70%)",
        }}
      />

      <AnimatePresence mode="wait">
        {scene === 0 && <HookScene key="hook" onNext={() => setScene(1)} />}
        {scene === 1 && <SimplifyScene key="simplify" onNext={() => setScene(2)} />}
        {scene === 2 && <FomoScene key="fomo" onFinish={(t) => markSeenAndGo(t)} />}
      </AnimatePresence>

      {/* 상단 진행 도트 (작게, 방해되지 않게) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all ${i === scene ? "w-8 bg-gold" : "w-3 bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── SCENE 1 ─ HOOK ─────────────── */

function HookScene({ onNext }: { onNext: () => void }) {
  return (
    <motion.section
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, letterSpacing: "0.02em" }}
        animate={{ opacity: 1, y: 0, letterSpacing: "0.06em" }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur border border-gold/30 text-[10px] font-black tracking-[0.4em] text-gold mb-6"
      >
        🌌 COSMIC EMPEROR
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15 }}
        className="font-imperial font-black text-4xl sm:text-6xl md:text-7xl leading-tight break-keep"
        style={{
          textShadow: "0 0 40px hsla(258,80%,60%,0.45), 0 0 80px hsla(258,80%,40%,0.25)",
        }}
      >
        당신은 이미<br />
        <span
          className="text-gradient-gold"
          style={{ textShadow: "0 0 60px hsla(44,100%,60%,0.55)" }}
        >입장했습니다.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-5 text-sm sm:text-base text-white/70 max-w-md break-keep"
      >
        지금 이 순간, 우주는 당신의 첫 클릭을 기다리고 있습니다.
      </motion.p>

      <motion.button
        onClick={onNext}
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          boxShadow: [
            "0 0 0 0 hsla(44,100%,60%,0.55)",
            "0 0 0 22px hsla(44,100%,60%,0)",
            "0 0 0 0 hsla(44,100%,60%,0)",
          ],
        }}
        transition={{
          opacity: { duration: 0.5, delay: 0.9 },
          y: { duration: 0.5, delay: 0.9 },
          boxShadow: { duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 1.2 },
        }}
        whileTap={{ scale: 0.97 }}
        className="mt-10 w-full max-w-sm h-16 rounded-2xl bg-gradient-to-r from-gold via-amber-400 to-gold text-black font-imperial font-black text-xl tracking-wider relative overflow-hidden"
      >
        <span className="relative z-10">🚀 바로 시작하기</span>
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 2 }}
        className="mt-6 text-[10px] tracking-[0.3em] text-white/50"
      >
        TAP TO ENTER
      </motion.div>
    </motion.section>
  );
}

/* ─────────────── SCENE 2 ─ SIMPLIFY ─────────────── */

function SimplifyScene({ onNext }: { onNext: () => void }) {
  return (
    <motion.section
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-4 max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 backdrop-blur-md px-6 py-5 text-left"
        >
          <div className="text-[10px] font-black tracking-[0.4em] text-emerald-400">LONG</div>
          <div className="font-imperial font-black text-2xl sm:text-3xl text-white mt-1">오르면 돈</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-2xl border border-rose-400/40 bg-rose-500/10 backdrop-blur-md px-6 py-5 text-left"
        >
          <div className="text-[10px] font-black tracking-[0.4em] text-rose-400">SHORT</div>
          <div className="font-imperial font-black text-2xl sm:text-3xl text-white mt-1">내리면 돈</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="font-imperial text-xl sm:text-2xl text-gradient-gold pt-2"
        >
          3초 안에 끝납니다.
        </motion.div>
      </div>

      <motion.button
        onClick={onNext}
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
          boxShadow: [
            "0 0 0 0 hsla(258,90%,65%,0.55)",
            "0 0 0 18px hsla(258,90%,65%,0)",
            "0 0 0 0 hsla(258,90%,65%,0)",
          ],
        }}
        transition={{
          opacity: { duration: 0.5, delay: 0.9 },
          y: { duration: 0.5, delay: 0.9 },
          boxShadow: { duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 1.2 },
        }}
        whileTap={{ scale: 0.97 }}
        className="mt-10 w-full max-w-sm h-16 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 text-white font-imperial font-black text-xl tracking-wider"
      >
        🎮 체험하기
      </motion.button>
    </motion.section>
  );
}

/* ─────────────── SCENE 3 ─ FOMO LOOP ─────────────── */

function FomoScene({ onFinish }: { onFinish: (target: string) => void }) {
  const online = useOnline();

  return (
    <motion.section
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="font-imperial font-black text-2xl sm:text-4xl leading-tight break-keep max-w-md"
      >
        지금 시작하지 않으면<br />
        <span className="text-rose-400" style={{ textShadow: "0 0 30px hsla(0,90%,60%,0.6)" }}>
          이미 시작한 사람들 뒤로
        </span><br />
        밀립니다.
      </motion.div>

      <div className="mt-5 inline-flex items-center gap-1.5 text-[10px] tracking-[0.32em] text-gold/85 font-black">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        SIMULATION ACTIVE · {online.toLocaleString()}명 제국에 입성 중
      </div>

      <div className="mt-4 w-full max-w-sm">
        <ActivityEventTicker variant="hero" limit={5} />
      </div>

      <motion.button
        onClick={() => onFinish("/command")}
        animate={{
          boxShadow: [
            "0 0 0 0 hsla(0,90%,60%,0.55)",
            "0 0 0 24px hsla(0,90%,60%,0)",
            "0 0 0 0 hsla(0,90%,60%,0)",
          ],
        }}
        transition={{ boxShadow: { duration: 1.4, repeat: Infinity, ease: "easeOut" } }}
        whileTap={{ scale: 0.97 }}
        className="mt-8 w-full max-w-sm h-16 rounded-2xl bg-gradient-to-r from-rose-500 via-orange-500 to-rose-500 text-white font-imperial font-black text-xl tracking-wider relative overflow-hidden"
      >
        <span className="relative z-10">🔥 지금 합류하기</span>
        <motion.span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />
      </motion.button>

      <button
        onClick={() => onFinish("/command")}
        className="mt-3 text-[11px] text-white/50 hover:text-white/80 transition tracking-wider"
      >
        건너뛰기
      </button>
    </motion.section>
  );
}
