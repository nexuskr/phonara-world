import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, X, RotateCcw } from "lucide-react";
import { useOnboardingFlow } from "@/hooks/use-onboarding-flow";

const FLOW = "arena-v2";

const STEPS = [
  {
    emoji: "📊",
    title: "1단계: 실시간 가격을 읽으세요",
    body: "우상단에 1초마다 변하는 BTC 가격이 보입니다. 군대는 이 가격에 맞춰 움직입니다.",
    anchor: '[data-tutorial="price"]',
    color: "text-primary",
  },
  {
    emoji: "⚔️",
    title: "2단계: 오른다 = Conquest, 내린다 = Raid",
    body: "📈 오른다(LONG)에 베팅하면 군대가 적국을 정복합니다. 📉 내린다(SHORT)면 약탈합니다.",
    anchor: '[data-tutorial="army"]',
    color: "text-gold",
  },
  {
    emoji: "🎮",
    title: "3단계: 베팅하고 결과 보기",
    body: "Paper 모드입니다. 실제 돈 들지 않습니다. TP +1% 도달 시 자동 승리, SL -0.6% 도달 시 종료.",
    anchor: '[data-tutorial="bet"]',
    color: "text-emerald-400",
  },
] as const;

export default function ArenaTutorialOverlay() {
  const flow = useOnboardingFlow(FLOW);
  const [showResume, setShowResume] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!flow.hydrated) return;
    if (flow.completedAt) return;
    if (flow.step > 0) {
      setShowResume(true);
    } else {
      setOpen(true);
    }
  }, [flow.hydrated, flow.completedAt, flow.step]);

  useEffect(() => {
    if (!open) return;
    const s = STEPS[flow.step] ?? STEPS[0];
    const el = document.querySelector(s.anchor);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [open, flow.step]);

  const close = () => {
    flow.complete();
    setOpen(false);
    setShowResume(false);
  };

  const next = () => {
    if (flow.step >= STEPS.length - 1) close();
    else flow.setStep(flow.step + 1);
  };

  const restart = () => {
    flow.reset();
    flow.setStep(0);
    setShowResume(false);
    setOpen(true);
  };

  const resume = () => {
    setShowResume(false);
    setOpen(true);
  };

  // resume modal
  if (showResume) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur flex items-center justify-center p-5"
        >
          <motion.div
            initial={{ scale: 0.92 }} animate={{ scale: 1 }}
            className="glass-strong neon-border rounded-3xl p-6 max-w-xs w-full text-center"
          >
            <div className="text-5xl mb-2">📍</div>
            <h3 className="font-imperial text-xl mb-2">이어서 진행하시겠습니까?</h3>
            <p className="text-xs text-muted-foreground mb-5">
              {flow.step + 1} / {STEPS.length} 단계에서 멈췄습니다
            </p>
            <div className="space-y-2">
              <button
                onClick={resume}
                className="press w-full min-h-[48px] rounded-xl bg-gradient-primary text-primary-foreground font-display font-black"
              >
                이어서 진행
              </button>
              <button
                onClick={restart}
                className="press w-full min-h-[44px] rounded-xl glass text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 처음부터
              </button>
              <button
                onClick={close}
                className="press w-full min-h-[40px] text-xs text-muted-foreground"
              >
                건너뛰기
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!open) {
    // re-open trigger
    return (
      <button
        onClick={() => setOpen(true)}
        className="press text-[10px] font-bold text-muted-foreground hover:text-primary underline-offset-4 hover:underline absolute right-4 top-20 z-10"
      >
        ❓ 튜토리얼 다시보기
      </button>
    );
  }

  const s = STEPS[flow.step] ?? STEPS[0];
  const isLast = flow.step >= STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          className="relative w-full max-w-sm glass-strong neon-border rounded-3xl p-6"
        >
          <button onClick={close} className="absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>

          <div className="text-[10px] font-black tracking-[0.3em] text-muted-foreground mb-2">
            {flow.step + 1} / {STEPS.length}
          </div>
          <div className="text-5xl mb-3 text-center">{s.emoji}</div>
          <h3 className={`font-imperial text-xl mb-2 text-center ${s.color} break-keep`}>{s.title}</h3>
          <p className="text-sm text-foreground/85 leading-relaxed text-center break-keep">{s.body}</p>

          {flow.step === 1 && (
            <div className="mt-4 rounded-2xl glass border border-border/40 p-3 flex items-center justify-around">
              <div className="flex flex-col items-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
                <div className="text-[10px] mt-1 font-bold">오른다</div>
                <div className="text-[9px] text-emerald-400 font-black">CONQUEST</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="flex flex-col items-center">
                <TrendingDown className="w-6 h-6 text-rose-400" />
                <div className="text-[10px] mt-1 font-bold">내린다</div>
                <div className="text-[9px] text-rose-400 font-black">RAID</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-5">
            {flow.step > 0 && (
              <button onClick={() => flow.setStep(flow.step - 1)} className="press flex-1 min-h-[48px] rounded-xl glass text-sm font-bold">
                이전
              </button>
            )}
            <button onClick={next} className="press flex-[2] min-h-[48px] rounded-xl bg-gradient-primary text-primary-foreground font-display font-black">
              {isLast ? "시작하기" : "다음 →"}
            </button>
          </div>

          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1 rounded-full transition-all ${i === flow.step ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
