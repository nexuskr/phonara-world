import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, X } from "lucide-react";

/**
 * 처음 방문 시 1회 표시되는 3단계 튜토리얼.
 * "롱/숏"을 한국어 직관 비유로 설명.
 */
const KEY = "arena_tutorial_seen_v1";

const STEPS = [
  {
    emoji: "📈",
    title: "비트코인 가격이 오르면?",
    body: "오른다(LONG)에 베팅한 사람이 승리 — 영토를 정복합니다.",
    color: "text-emerald-400",
  },
  {
    emoji: "📉",
    title: "비트코인 가격이 내리면?",
    body: "내린다(SHORT)에 베팅한 사람이 승리 — 적국을 약탈합니다.",
    color: "text-rose-400",
  },
  {
    emoji: "🎮",
    title: "실제 돈은 들지 않습니다",
    body: "Paper 모드 — 데모 학습용입니다. 실전 트레이딩은 별도 페이지에서 50% 수수료 쿠폰과 함께 시작.",
    color: "text-primary",
  },
] as const;

export default function ArenaTutorialOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {/* ignore */}
  }, []);

  const close = () => {
    try { localStorage.setItem(KEY, "1"); } catch {/* ignore */}
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press text-[10px] font-bold text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
      >
        ❓ 롱/숏이 뭐예요?
      </button>
    );
  }

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/85 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={close}
      >
        <motion.div
          initial={{ scale: 0.92, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm glass-strong neon-border rounded-3xl p-6 text-center"
        >
          <button
            onClick={close}
            className="absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-[10px] font-black tracking-[0.3em] text-muted-foreground mb-2">
            {step + 1} / {STEPS.length}
          </div>
          <div className="text-6xl mb-4">{s.emoji}</div>
          <h3 className={`font-imperial text-2xl mb-3 ${s.color} break-keep`}>{s.title}</h3>
          <p className="text-sm text-foreground/85 leading-relaxed break-keep">{s.body}</p>

          {/* mini illustration on step 1/2 */}
          {step <= 1 && (
            <div className="mt-5 rounded-2xl glass border border-border/40 p-4 flex items-center justify-around">
              <div className={`flex flex-col items-center ${step === 0 ? "opacity-100" : "opacity-30"}`}>
                <TrendingUp className="w-7 h-7 text-emerald-400" />
                <div className="text-[10px] mt-1 font-bold">오른다 (LONG)</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className={`flex flex-col items-center ${step === 1 ? "opacity-100" : "opacity-30"}`}>
                <TrendingDown className="w-7 h-7 text-rose-400" />
                <div className="text-[10px] mt-1 font-bold">내린다 (SHORT)</div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep((p) => p - 1)}
                className="press flex-1 min-h-[48px] rounded-xl glass text-sm font-bold"
              >
                이전
              </button>
            )}
            <button
              onClick={() => (isLast ? close() : setStep((p) => p + 1))}
              className="press flex-[2] min-h-[48px] rounded-xl bg-gradient-primary text-primary-foreground font-display font-black"
            >
              {isLast ? "시작하기" : "다음 →"}
            </button>
          </div>

          <div className="flex justify-center gap-1.5 mt-4">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
