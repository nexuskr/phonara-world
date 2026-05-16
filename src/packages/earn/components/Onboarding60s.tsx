/**
 * @pkg/earn/Onboarding60s — v14.0 Sprint 0 60초 온보딩.
 *
 * 4스텝: 가입 환영 → 무료 룰렛 1회 → 오늘의 미션 → 슬롯 데모.
 * 1회성: localStorage `phonara:onboarding60s:v1` 으로 디듀프.
 * 신규 RPC/마이그레이션 없음 — 기존 진입점만 묶어줌.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, Gamepad2, Target, X } from "lucide-react";

const STORAGE_KEY = "phonara:onboarding60s:v1";

type Step = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta: string;
  href?: string;
};

const STEPS: Step[] = [
  {
    key: "welcome",
    icon: Sparkles,
    title: "60초 만에 오늘의 무료 PHON 받기",
    body: "회원가입 환영 보너스 + 룰렛 + 미션 + 슬롯 데모 — 60초면 끝납니다.",
    cta: "시작하기",
  },
  {
    key: "roulette",
    icon: Coins,
    title: "1단계 · 무료 룰렛 1회",
    body: "매일 무료로 돌리는 데일리 룰렛부터 받아가세요.",
    cta: "룰렛 받기",
    href: "/missions?tab=battle",
  },
  {
    key: "mission",
    icon: Target,
    title: "2단계 · 오늘의 미션 1개",
    body: "출석 · 친구초대 · 게임 한 판 — 미션 하나만 클레임해도 PHON.",
    cta: "미션 보기",
    href: "/earn",
  },
  {
    key: "slot",
    icon: Gamepad2,
    title: "3단계 · 슬롯 데모 1스핀",
    body: "베팅 없이 슬롯이 어떻게 도는지 먼저 구경해보세요.",
    cta: "슬롯 데모",
    href: "/casino/cherry-sakura-500",
  },
];

export default function Onboarding60s() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (localStorage.getItem(STORAGE_KEY)) return;
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    } catch { /* */ }
  }, []);

  const close = (completed: boolean) => {
    try { localStorage.setItem(STORAGE_KEY, completed ? "done" : "skip"); } catch { /* */ }
    setOpen(false);
  };

  const step = STEPS[idx];
  const Icon = step.icon;
  const isLast = idx === STEPS.length - 1;
  const progress = ((idx + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(false); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-[hsl(var(--gold)/.4)] bg-card/95 backdrop-blur-xl">
        {/* 상단 — 진행률 바 + 건너뛰기 */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] uppercase">
            60초 시작
          </div>
          <button
            aria-label="닫기"
            onClick={() => close(false)}
            className="text-muted-foreground hover:text-foreground transition press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pt-2">
          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
            {idx + 1} / {STEPS.length}
          </div>
        </div>

        {/* 본문 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="px-5 pt-5 pb-2 text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--gold)/.2)] to-[hsl(var(--pink)/.15)] border border-[hsl(var(--gold)/.4)] flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-[hsl(var(--gold))]" />
            </div>
            <h3 className="font-imperial text-lg md:text-xl text-foreground leading-tight">
              {step.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {step.body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* 액션 */}
        <div className="px-5 pb-5 pt-3 flex flex-col gap-2">
          {step.href ? (
            <Button
              size="lg"
              className="w-full h-12 text-base font-black bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background hover:opacity-95"
              onClick={() => {
                if (isLast) close(true);
                nav(step.href!);
                setOpen(false);
              }}
              asChild={false}
            >
              <Link to={step.href}>{step.cta}</Link>
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full h-12 text-base font-black bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background hover:opacity-95"
              onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
            >
              {step.cta}
            </Button>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <button
              onClick={() => close(false)}
              className="hover:text-foreground transition"
            >
              건너뛰기
            </button>
            {idx > 0 && (
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                className="hover:text-foreground transition"
              >
                ← 이전
              </button>
            )}
            {!step.href && idx < STEPS.length - 1 && (
              <button
                onClick={() => setIdx((i) => i + 1)}
                className="hover:text-foreground transition"
              >
                다음 →
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
