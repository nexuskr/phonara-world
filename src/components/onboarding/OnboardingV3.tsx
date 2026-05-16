import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Coins, Gamepad2, Gift, Sparkles, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { setVisibleInterval } from "@/lib/util/visible-interval";

const KEY = "phonara:onboarding_v3_done";

/**
 * OnboardingV3 — 60초 온보딩 (5스텝 · 평균 12초/스텝).
 * 1) 환영 + 500 PHON 보너스 표시
 * 2) 무료 룰렛 데모(클라 애니메이션, RPC X)
 * 3) 출석 체크(claim_attendance, 실패시 진행)
 * 4) 슬롯 미리보기(데모 스핀 애니메이션)
 * 5) 충전 CTA + 나중에
 *
 * localStorage `phonara:onboarding_v3_done` 1회 표시.
 */
export default function OnboardingV3() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (localStorage.getItem(KEY) === "1") return;
        const { data } = await supabase.auth.getSession();
        if (cancel || !data.session) return;
        // 약간의 지연으로 첫 페인트 후에 등장
        setTimeout(() => !cancel && setOpen(true), 1200);
      } catch { /* */ }
    })();
    return () => { cancel = true; };
  }, []);

  const close = (skipped = false) => {
    try { localStorage.setItem(KEY, "1"); } catch { /* */ }
    setOpen(false);
    if (!skipped) notify.success("환영합니다! 매일 들어와서 무료 PHON 받아가세요 ✨");
  };

  if (!open) return null;
  const total = 5;
  const next = () => (step < total - 1 ? setStep(step + 1) : close(false));

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-background/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md rounded-3xl border border-[hsl(var(--gold)/.35)] bg-card/95 shadow-[0_40px_120px_-20px_hsl(var(--gold)/.35)] overflow-hidden"
      >
        <button
          onClick={() => close(true)}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/60 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 진행 바 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-border/50">
          <motion.div
            className="h-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))]"
            animate={{ width: `${((step + 1) / total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6 pt-8 sm:p-8 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 0 && <StepWelcome key="0" />}
            {step === 1 && <StepRoulette key="1" />}
            {step === 2 && <StepAttendance key="2" />}
            {step === 3 && <StepSlot key="3" />}
            {step === 4 && <StepCharge key="4" onLater={() => close(false)} onCharge={() => { close(false); nav("/wallet"); }} />}
          </AnimatePresence>

          <div className="mt-auto pt-6 flex items-center justify-between gap-2">
            <button
              onClick={() => close(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              나중에 할게요
            </button>
            <button
              onClick={next}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-sm press shadow-[0_10px_30px_-12px_hsl(var(--gold)/.7)]"
            >
              {step === total - 1 ? "시작하기" : "다음"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25 }} className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

function StepWelcome() {
  return (
    <Frame>
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] flex items-center justify-center text-background mb-4">
        <Gift className="w-6 h-6" />
      </div>
      <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] mb-1">STEP 1 / 5</div>
      <h3 className="font-imperial text-2xl text-foreground leading-tight">환영합니다 👑</h3>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        가입 보너스로 <span className="text-foreground font-black">500 PHON</span>이 지급됐어요.<br />
        60초 안에 어떻게 돈 버는지 보여드릴게요.
      </p>
      <div className="mt-5 rounded-2xl border border-[hsl(var(--gold)/.35)] bg-background/40 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] flex items-center justify-center text-background">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">즉시 지급</div>
          <div className="font-hud text-lg text-foreground tabular-nums">+500 PHON</div>
        </div>
      </div>
    </Frame>
  );
}

function StepRoulette() {
  const [spun, setSpun] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const spin = () => {
    setSpun(true);
    setTimeout(() => setReward(100), 1300);
  };
  return (
    <Frame>
      <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] mb-1">STEP 2 / 5</div>
      <h3 className="font-imperial text-2xl text-foreground leading-tight">무료 룰렛 한 번</h3>
      <p className="mt-2 text-sm text-muted-foreground">매일 무료로 1회 돌릴 수 있어요.</p>
      <div className="relative mt-5 mx-auto w-44 h-44">
        <motion.div
          animate={{ rotate: spun ? 1440 : 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full rounded-full border-4 border-[hsl(var(--gold)/.6)] bg-gradient-conic from-[hsl(var(--gold))] via-[hsl(var(--pink))] to-[hsl(var(--gold))] shadow-[0_0_60px_-10px_hsl(var(--gold)/.7)]"
          style={{ backgroundImage: "conic-gradient(from 0deg, hsl(var(--gold)), hsl(var(--pink)), hsl(var(--gold)), hsl(var(--pink)), hsl(var(--gold)))" }}
        />
        <div className="absolute inset-3 rounded-full bg-background flex items-center justify-center text-center">
          {reward == null ? (
            <button onClick={spin} disabled={spun} className="font-black text-sm text-foreground press">
              {spun ? "돌리는 중…" : "SPIN"}
            </button>
          ) : (
            <div>
              <div className="text-[10px] text-muted-foreground">획득</div>
              <div className="font-hud text-xl text-[hsl(var(--gold))]">+{reward}</div>
              <div className="text-[10px] text-muted-foreground">PHON</div>
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
}

function StepAttendance() {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const claim = async () => {
    setLoading(true);
    try {
      try { await (supabase.rpc as any)("claim_attendance"); } catch { /* */ }
      setClaimed(true);
    } finally { setLoading(false); }
  };
  return (
    <Frame>
      <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] mb-1">STEP 3 / 5</div>
      <h3 className="font-imperial text-2xl text-foreground leading-tight">오늘의 출석</h3>
      <p className="mt-2 text-sm text-muted-foreground">매일 출석만으로 PHON이 쌓여요. 7일 연속이면 보너스 2배.</p>
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-xl border flex items-center justify-center text-xs font-black ${
            i === 0 && claimed ? "bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background border-transparent" : "bg-card/60 border-border/40 text-muted-foreground"
          }`}>
            {i === 0 && claimed ? <Check className="w-4 h-4" /> : `D${i + 1}`}
          </div>
        ))}
      </div>
      <button
        onClick={claim}
        disabled={claimed || loading}
        className="mt-5 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[hsl(var(--gold)/.5)] bg-background/40 text-foreground font-bold text-sm press"
      >
        <Trophy className="w-4 h-4 text-[hsl(var(--gold))]" />
        {claimed ? "출석 완료 +100 PHON" : loading ? "처리 중…" : "출석하고 +100 PHON 받기"}
      </button>
    </Frame>
  );
}

function StepSlot() {
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState(["7", "7", "7"]);
  const symbols = ["🍒", "💎", "7", "🔔", "⭐"];
  const spin = () => {
    setSpinning(true);
    let n = 0;
    const id = setVisibleInterval(() => {
      setReels([symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)], symbols[Math.floor(Math.random() * symbols.length)]]);
      if (++n > 12) { id(); setReels(["7", "7", "7"]); setSpinning(false); }
    }, 70 , { meta: { owner: "OnboardingV3", category: "cosmetic" } });
  };
  return (
    <Frame>
      <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] mb-1">STEP 4 / 5</div>
      <h3 className="font-imperial text-2xl text-foreground leading-tight">슬롯 미리보기</h3>
      <p className="mt-2 text-sm text-muted-foreground">12종 슬롯 · 매일 무료 스핀이 있어요.</p>
      <div className="mt-5 rounded-2xl border border-border/50 bg-background/60 p-4">
        <div className="grid grid-cols-3 gap-2">
          {reels.map((s, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gradient-to-b from-card to-background border border-border/60 flex items-center justify-center font-imperial text-3xl text-[hsl(var(--gold))]">
              {s}
            </div>
          ))}
        </div>
        <button
          onClick={spin}
          disabled={spinning}
          className="mt-3 w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-sm press"
        >
          {spinning ? "스핀 중…" : "데모 스핀"}
        </button>
      </div>
    </Frame>
  );
}

function StepCharge({ onLater, onCharge }: { onLater: () => void; onCharge: () => void }) {
  return (
    <Frame>
      <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--pink))] mb-1">STEP 5 / 5</div>
      <h3 className="font-imperial text-2xl text-foreground leading-tight">충전하면 <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent">2배</span></h3>
      <p className="mt-2 text-sm text-muted-foreground">첫 충전 보너스 + NFT 부스트로 보상이 즉시 2배가 돼요.</p>
      <ul className="mt-5 space-y-2.5 text-sm">
        {[
          "첫 충전 +10% PHON 보너스",
          "NFT 자동 지급으로 평생 부스트",
          "VIP Pass 시 Crown ×3 가산",
        ].map((t) => (
          <li key={t} className="flex items-center gap-2 text-foreground/90">
            <span className="w-5 h-5 rounded-full bg-[hsl(var(--gold)/.18)] border border-[hsl(var(--gold)/.5)] flex items-center justify-center">
              <Check className="w-3 h-3 text-[hsl(var(--gold))]" />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-2">
        <button onClick={onCharge} className="h-12 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-sm press inline-flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" /> 충전하러 가기
        </button>
        <button onClick={onLater} className="h-11 rounded-xl border border-border/60 bg-card/50 text-foreground/80 text-sm press">
          나중에 — 일단 게임 둘러볼게요 <Gamepad2 className="inline w-3.5 h-3.5 ml-1" />
        </button>
      </div>
    </Frame>
  );
}
