import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Zap, Coins, Timer, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { formatKRW } from "@/lib/store";

const COMBO_STEPS = [
  { key: "attendance", label: "출석 체크", icon: CheckCircle2 },
  { key: "paper_win", label: "Paper 1승", icon: Flame },
  { key: "ai_mission", label: "AI 미션", icon: Sparkles },
  { key: "sns_share", label: "SNS 공유", icon: Zap },
] as const;

function randomNonce() {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * P2 — Empire P2E Dashboard
 * - Daily Combo (Hamster Kombat style)
 * - Idle Growth 0.8%/h (Pixels)
 * - Tap-to-Reinforce (tap-to-earn)
 *
 * Gold & Dark Empire 디자인 토큰만 사용. 1픽셀도 깨지 않음.
 */
export default function EmpireP2EDashboard() {
  const [combo, setCombo] = useState<{ steps: Record<string, string>; reward: number; completed: number }>({
    steps: {},
    reward: 0,
    completed: 0,
  });
  const [idle, setIdle] = useState<{ accrued: number; lastTick: string | null; claimedToday: number }>({
    accrued: 0,
    lastTick: null,
    claimedToday: 0,
  });
  const [tap, setTap] = useState<{ count: number; lastReward: number }>({ count: 0, lastReward: 0 });
  const [tapBurst, setTapBurst] = useState<{ id: number; x: number; y: number }[]>([]);
  const [claiming, setClaiming] = useState(false);

  // Initial load
  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: comboRow }, { data: idleRow }, { data: tapRow }] = await Promise.all([
        supabase.from("daily_combo_progress").select("steps,rewarded_at").eq("date", today).maybeSingle(),
        supabase.from("idle_growth_state").select("accrued_amount,last_tick_at,daily_claimed").maybeSingle(),
        supabase.from("tap_counters").select("tap_count").eq("date", today).maybeSingle(),
      ]);
      const steps = ((comboRow as any)?.steps ?? {}) as Record<string, string>;
      setCombo({ steps, reward: 0, completed: Object.keys(steps).length });
      setIdle({
        accrued: Number((idleRow as any)?.accrued_amount ?? 0),
        lastTick: (idleRow as any)?.last_tick_at ?? null,
        claimedToday: Number((idleRow as any)?.daily_claimed ?? 0),
      });
      setTap({ count: Number((tapRow as any)?.tap_count ?? 0), lastReward: 0 });
    } catch {
      /* silent */
    }
  }

  // Estimated pending idle growth (client-side preview)
  const [pendingIdle, setPendingIdle] = useState(0);
  useEffect(() => {
    function tick() {
      if (!idle.lastTick) return setPendingIdle(0);
      const hours = (Date.now() - new Date(idle.lastTick).getTime()) / 3_600_000;
      const cappedHours = Math.min(hours, 24);
      // 미리보기용: 잔고 20만원 한도 0.8%/h · 일 상한 5,000원
      const preview = Math.min(200_000 * 0.008 * cappedHours, Math.max(5_000 - idle.claimedToday, 0));
      setPendingIdle(Math.floor(preview));
    }
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [idle]);

  const progressStep = useCallback(async (step: string) => {
    try {
      const { data, error } = await supabase.rpc("progress_daily_combo" as any, { _step: step });
      if (error) throw error;
      const res = data as any;
      setCombo({ steps: res.steps ?? {}, reward: res.reward ?? 0, completed: res.completed ?? 0 });
      if (res.reward > 0) {
        notify.success("🎉 Legendary Combo!", { description: `+${formatKRW(res.reward)} 적립 + Recovery 부스트 1회권`);
      } else {
        notify.info("콤보 진행", { description: `${res.completed}/4 단계 완수`);
      }
    } catch (e: any) {
      notify.error("진행 실패", { description: e?.message ?? "잠시 후 다시 시도해주세요" });
    }
  }, []);

  const claimIdle = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_idle_growth" as any);
      if (error) throw error;
      const res = data as any;
      if (res.claimed > 0) {
        notify.success("⏳ Idle 수령", { description: `+${formatKRW(res.claimed)} (${res.hours}시간 경과)`);
      } else {
        notify.info("쌓이는 중", { description: `다시 시도하려면 시간이 더 필요합니다 (일 상한 ${formatKRW(res.daily_cap)})`);
      }
      await load();
    } catch (e: any) {
      notify.error("수령 실패", { description: e?.message ?? "잠시 후 다시 시도해주세요" });
    } finally {
      setClaiming(false);
    }
  }, [claiming]);

  const handleTap = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    setTapBurst((b) => [...b, { id, x, y }]);
    setTimeout(() => setTapBurst((b) => b.filter((p) => p.id !== id)), 600);

    try {
      const { data, error } = await supabase.rpc("tap_reinforce" as any, { _nonce: randomNonce() });
      if (error) throw error;
      const res = data as any;
      setTap({ count: res.tap_count ?? 0, lastReward: res.reward ?? 0 });
      if (res.reward > 0) {
        notify.success("⚡ 보강 보상", { description: `+${formatKRW(res.reward)} · 누적 ${res.tap_count}탭`);
      }
    } catch {
      /* silent — 어뷰즈 방지 */
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* 🔥 Daily Combo */}
      <div className="glass-strong rounded-2xl p-4 neon-border relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              <h3 className="font-display font-black text-sm tracking-wider">오늘의 제국 콤보</h3>
            </div>
            <div className="text-[10px] tabular-nums">
              <span className="text-gold font-black">{combo.completed}</span>
              <span className="text-muted-foreground"> / 4</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {COMBO_STEPS.map((s) => {
              const done = !!combo.steps[s.key];
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => !done && progressStep(s.key)}
                  disabled={done}
                  className={`relative min-h-[64px] rounded-xl p-2 flex flex-col items-center justify-center gap-1 transition press ${
                    done ? "bg-gradient-gold text-gold-foreground glow-gold" : "glass hover:bg-primary/10"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${done ? "" : "text-primary"}`} />
                  <div className="text-[9px] font-bold leading-tight text-center break-keep">{s.label}</div>
                  {done && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
          {combo.completed >= 4 && (
            <div className="mt-3 text-[11px] text-gold font-black text-center animate-pulse">
              ✨ Legendary Combo 완성! 내일 다시 도전
            </div>
          )}
        </div>
      </div>

      {/* ⏳ Idle Growth + ⚡ Tap-to-Reinforce */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-strong rounded-2xl p-4 neon-border relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-gold/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-2">
              <Timer className="w-3.5 h-3.5 text-gold" />
              <div className="text-[10px] tracking-widest text-gold font-black">IDLE 성장 0.8%/h</div>
            </div>
            <div className="font-display font-black text-lg tabular-nums text-money-strong leading-tight">
              +{formatKRW(pendingIdle)}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">오늘 수령 {formatKRW(idle.claimedToday)} / 5,000원</div>
            <button
              onClick={claimIdle}
              disabled={claiming || pendingIdle <= 0}
              className="press mt-2 w-full min-h-[36px] rounded-lg bg-gradient-gold text-gold-foreground text-[11px] font-black disabled:opacity-50"
            >
              {pendingIdle > 0 ? "지금 수령" : "쌓이는 중"}
            </button>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-4 neon-border relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-primary/30 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-2">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <div className="text-[10px] tracking-widest text-primary font-black">탭 보강 (100탭 = +500원)</div>
            </div>
            <button
              onClick={handleTap}
              className="press relative w-full min-h-[60px] rounded-xl bg-gradient-primary text-primary-foreground font-black flex items-center justify-center gap-2 overflow-hidden glow-primary"
            >
              <Zap className="w-5 h-5" />
              <span className="tabular-nums">{tap.count.toLocaleString()}</span>
              <AnimatePresence>
                {tapBurst.map((b) => (
                  <motion.span
                    key={b.id}
                    initial={{ opacity: 1, scale: 0.8, x: b.x - 8, y: b.y - 8 }}
                    animate={{ opacity: 0, scale: 1.5, y: b.y - 40 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute pointer-events-none text-gold text-xs font-black"
                  >
                    +1
                  </motion.span>
                ))}
              </AnimatePresence>
            </button>
            <div className="text-[9px] text-muted-foreground mt-1.5 text-center">
              1초당 최대 5탭 · 일 1,000탭 보상 상한
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
