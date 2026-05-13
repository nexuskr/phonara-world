/**
 * ThreeMinuteCashLoop — 첫 방문 3분 캐시 루프.
 * Phase 1 (0~60s): Welcome ₡3,000 SIM + 100% 승리 데모
 * Phase 2 (60~180s): 3x 시뮬 트레이드 → PHON/Avatar 미리보기
 * Phase 3 (180s+): FirstDepositGodModeModal 발동
 *
 * - 모든 잔고/수익은 SIM(₡). 실제 자금 0 영향.
 * - 우상단 SimGlobalBadge로 항상 SIM 표기.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, TrendingUp, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCashLoop, advanceCashLoop, type CashLoopSession } from "@/lib/cashLoop";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

interface Props {
  onConvert: () => void;
  onDismiss?: () => void;
}

const PHASE_DURATION = { welcome: 60, sim_win: 120, deposit_prompt: 9999 };

export default function ThreeMinuteCashLoop({ onConvert, onDismiss }: Props) {
  const [session, setSession] = useState<CashLoopSession | null>(null);
  const [phase, setPhase] = useState<"welcome" | "sim_win" | "deposit_prompt">("welcome");
  const [elapsed, setElapsed] = useState(0);
  const [simBalance, setSimBalance] = useState(3000);
  const [simPnl, setSimPnl] = useState(0);
  const [winFlash, setWinFlash] = useState(false);
  const startedRef = useRef(false);

  // 세션 시작
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startCashLoop().then((s) => {
      if (!s) return;
      setSession(s);
      setSimBalance(Number(s.sim_balance) || 3000);
      // 이미 진행된 phase 복원
      if (s.phase === "sim_win") setPhase("sim_win");
      else if (s.phase === "deposit_prompt") setPhase("deposit_prompt");
      else if (s.phase === "converted") onDismiss?.();
    });
  }, [onDismiss]);

  // 타이머
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Phase 전이
  useEffect(() => {
    if (phase === "welcome" && elapsed >= PHASE_DURATION.welcome) {
      setPhase("sim_win");
      void advanceCashLoop("sim_win");
    } else if (phase === "sim_win" && elapsed >= PHASE_DURATION.welcome + PHASE_DURATION.sim_win) {
      setPhase("deposit_prompt");
      void advanceCashLoop("deposit_prompt", simPnl);
    }
  }, [elapsed, phase, simPnl]);

  // SIM 100% 승리 데모 (welcome phase)
  function simulateWin() {
    const gain = 200 + Math.floor(Math.random() * 300);
    setSimBalance((b) => b + gain);
    setSimPnl((p) => p + gain);
    setWinFlash(true);
    setTimeout(() => setWinFlash(false), 600);
    notify.success(`+₡${gain.toLocaleString()} 시뮬 수익!`, { description: "SIM · 실제 자금 영향 없음" });
  }

  function handleConvert() {
    void advanceCashLoop("converted", simPnl);
    onConvert();
  }

  function handleSkip() {
    void advanceCashLoop("expired");
    onDismiss?.();
  }

  if (!session) return null;

  const totalSec = PHASE_DURATION.welcome + PHASE_DURATION.sim_win;
  const progress = Math.min(100, (elapsed / totalSec) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="relative w-full max-w-md mx-auto"
    >
      <div className={cn(
        "relative rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-background via-background to-primary/5 p-5 sm:p-6 shadow-2xl overflow-hidden",
        winFlash && "ring-4 ring-amber-400/60",
      )}>
        {/* 닫기 */}
        {onDismiss && (
          <button
            onClick={handleSkip}
            aria-label="닫기"
            className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-background/60 border border-border/40 hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* SIM 배지 */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] font-black text-amber-300 tracking-[0.2em] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          SIM · 3분 체험
        </div>

        {/* 잔고 */}
        <div className="text-center">
          <div className="text-[11px] text-muted-foreground tracking-widest font-bold">SIM 잔고</div>
          <motion.div
            key={simBalance}
            initial={{ scale: 1.15, color: "hsl(45 95% 60%)" }}
            animate={{ scale: 1, color: "hsl(var(--foreground))" }}
            className="font-display font-black text-4xl sm:text-5xl tabular-nums mt-1"
          >
            ₡{simBalance.toLocaleString()}
          </motion.div>
          {simPnl > 0 && (
            <div className="text-xs font-bold text-emerald-400 mt-1 tabular-nums">
              +₡{simPnl.toLocaleString()} 누적 수익
            </div>
          )}
        </div>

        {/* 진행 바 */}
        <div className="mt-5 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-amber-400 to-primary"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>

        {/* Phase별 컨텐츠 */}
        <AnimatePresence mode="wait">
          {phase === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="w-3.5 h-3.5" /> Phase 1 · 무료 SIM 체험
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                지금 한 번 눌러보세요. <span className="text-primary font-bold">100% 시뮬 승리</span>가 보장됩니다.
              </p>
              <Button
                onClick={simulateWin}
                size="lg"
                className="mt-4 w-full bg-gradient-imperial text-primary-foreground font-black text-base hover:scale-[1.02] transition"
              >
                <Zap className="w-4 h-4 mr-2" /> 무료 SIM 트레이드 실행
              </Button>
            </motion.div>
          )}

          {phase === "sim_win" && (
            <motion.div key="sim_win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" /> Phase 2 · 미리보기
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                실제 입금 시 <span className="text-amber-300 font-bold">+200% 보너스</span> + Founding Avatar + PHON 사전 크레딧이 주어집니다.
              </p>
              <Button
                onClick={simulateWin}
                variant="outline"
                size="lg"
                className="mt-4 w-full border-primary/40 hover:bg-primary/10"
              >
                <Zap className="w-4 h-4 mr-2" /> 한 번 더 체험
              </Button>
            </motion.div>
          )}

          {phase === "deposit_prompt" && (
            <motion.div key="prompt" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-5 text-center">
              <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300">
                <Crown className="w-3.5 h-3.5" /> God Mode 발동 준비 완료
              </div>
              <p className="text-sm mt-2 leading-relaxed">
                <span className="font-bold text-foreground">시뮬에서 ₡{simPnl.toLocaleString()}을 벌었습니다.</span><br />
                실제 입금 ₩50,000+ 시 <span className="text-amber-300 font-black">+200% 보너스 즉시 지급</span>.
              </p>
              <Button
                onClick={handleConvert}
                size="lg"
                className="mt-4 w-full bg-gradient-imperial text-primary-foreground font-black text-base glow-imperial hover:scale-[1.02] transition animate-pulse-glow"
              >
                <Crown className="w-4 h-4 mr-2" /> 갓모드 청구 · 첫 입금
              </Button>
              <button onClick={handleSkip} className="mt-2 text-[10px] text-muted-foreground hover:text-foreground underline">
                나중에 (보너스 만료될 수 있음)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
