/**
 * WarTradingArena — 5분 슬롯 e-sports 시뮬 트레이딩 페이지.
 * - SIM ₡ 잔고로 long/short 시뮬 → PnL% 라이브 기록
 * - Near-Miss(0.4~0.5% 차이로 청산 직전) 시각 폭발
 * - Combo 3/5/10 연승 시 ComboStreakBurst
 * - Realtime 리더보드 (war_entries 채널)
 * - 모든 자금/상금은 SIM/PHON, 실제 KRW와 100% 분리
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useVisibleInterval } from "@/lib/util/visible-interval";
import { useNowTick } from "@/hooks/use-now-tick";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Flame, TrendingUp, TrendingDown, Trophy, Clock, Users, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  warGetCurrentSession, warJoin, warRecord, warLeaderboard,
  type WarSession, type WarLeaderRow,
} from "@/lib/warTrading";
import NearMissFlash from "@/components/empire/NearMissFlash";
import ComboStreakBurst from "@/components/empire/ComboStreakBurst";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

function fmtSec(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

export default function WarTradingArena() {
  const nav = useNavigate();
  const [session, setSession] = useState<WarSession | null>(null);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pnlPct, setPnlPct] = useState(0);
  const [combo, setCombo] = useState(0);
  const [nearMiss, setNearMiss] = useState(false);
  const [nearMissCount, setNearMissCount] = useState(0);
  const [board, setBoard] = useState<WarLeaderRow[]>([]);
  const now = useNowTick(1000);
  const recordTimer = useRef<number | null>(null);

  // 세션 로드 + 60s마다 재폴 (탭 숨김 시 정지)
  const loadSession = async () => {
    const s = await warGetCurrentSession();
    setSession(s);
  };
  useEffect(() => { void loadSession(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useVisibleInterval(() => { void loadSession(); }, 60_000);

  // 리더보드 로드 + Realtime
  useEffect(() => {
    if (!session) return;
    let alive = true;
    async function load() {
      const rows = await warLeaderboard(session!.id, 10);
      if (alive) setBoard(rows);
    }
    load();
    const ch = supabase
      .channel(`war:lb:${session.id}:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "war_entries",
        filter: `session_id=eq.${session.id}`,
      }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [session]);

  // PnL/combo 변경 시 디바운스로 서버 기록
  useEffect(() => {
    if (!joined) return;
    if (recordTimer.current) window.clearTimeout(recordTimer.current);
    recordTimer.current = window.setTimeout(() => {
      void warRecord(pnlPct, nearMissCount, combo);
    }, 800);
  }, [pnlPct, combo, nearMissCount, joined]);

  const remaining = session ? new Date(session.slot_ends_at).getTime() - now : 0;
  const closed = session?.status === "closed" || remaining <= 0;

  async function handleJoin() {
    setBusy(true);
    try {
      const ok = await warJoin();
      if (ok) {
        setJoined(true);
        notify.success("워 트레이딩 입장!", { description: "5분간 SIM으로 1위를 노리세요." });
      } else {
        notify.error("입장 실패", { description: "로그인 후 다시 시도해주세요." });
      }
    } finally { setBusy(false); }
  }

  function trade(direction: "long" | "short") {
    if (!joined || closed) return;
    // SIM 결과: 65% 승리 / 30% 패배 / 5% 거의 청산(near miss)
    const r = Math.random();
    if (r < 0.05) {
      setNearMiss(true);
      setNearMissCount((n) => n + 1);
      setCombo(0);
      return;
    }
    const win = r < 0.65 + 0.05; // 65%
    const change = direction === "long"
      ? (win ? +0.4 + Math.random() * 1.2 : -(0.3 + Math.random() * 0.9))
      : (win ? +0.4 + Math.random() * 1.2 : -(0.3 + Math.random() * 0.9));
    setPnlPct((p) => +(p + change).toFixed(2));
    setCombo((c) => (win ? c + 1 : 0));
  }

  return (
    <div className="min-h-screen bg-background relative">
      <NearMissFlash active={nearMiss} message={`${(0.3 + Math.random() * 0.2).toFixed(2)}% 차이로 놓침!`} onEnd={() => setNearMiss(false)} />
      <ComboStreakBurst combo={combo} />

      <div className="container py-6 max-w-3xl">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> 돌아가기
        </button>

        {/* 헤더 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] font-black text-amber-300 tracking-[0.2em]">
              <Flame className="w-3 h-3" /> SIM · WAR TRADING
            </div>
            <h1 className="font-display font-black text-3xl mt-1 text-gradient-imperial">
              5분 슬롯 e-sports
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              상금: <span className="font-bold text-amber-300">{(session?.prize_phon ?? 5000).toLocaleString()} PHON</span> · 1위 독식
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" /> 슬롯 남은 시간
            </div>
            <div className={cn(
              "font-mono font-black text-3xl tabular-nums",
              remaining < 30_000 ? "text-destructive animate-pulse" : "text-foreground",
            )}>
              {fmtSec(remaining)}
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              <Users className="w-3 h-3" /> {session?.participants ?? 0}명 참전
            </div>
          </div>
        </div>

        {/* 메인 트레이딩 */}
        <Card className="p-5 sm:p-6 border-2 border-primary/30 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="text-center">
            <div className="text-[11px] text-muted-foreground tracking-widest font-bold">SIM PnL</div>
            <motion.div
              key={pnlPct}
              initial={{ scale: 1.15 }}
              animate={{ scale: 1 }}
              className={cn(
                "font-display font-black text-5xl sm:text-6xl tabular-nums mt-1",
                pnlPct > 0 ? "text-emerald-400" : pnlPct < 0 ? "text-destructive" : "text-foreground",
              )}
            >
              {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
            </motion.div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-300">
              <Flame className="w-3.5 h-3.5" /> ×{combo} 콤보
            </div>
          </div>

          {!joined ? (
            <Button
              onClick={handleJoin}
              disabled={busy || closed}
              size="lg"
              className="w-full mt-5 bg-gradient-imperial text-primary-foreground font-black glow-imperial hover:scale-[1.02] transition"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
              {closed ? "다음 슬롯 대기" : "지금 입장 · 무료"}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Button
                onClick={() => trade("long")}
                disabled={closed}
                className="h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg"
              >
                <TrendingUp className="w-5 h-5 mr-1" /> LONG
              </Button>
              <Button
                onClick={() => trade("short")}
                disabled={closed}
                className="h-16 bg-rose-600 hover:bg-rose-500 text-white font-black text-lg"
              >
                <TrendingDown className="w-5 h-5 mr-1" /> SHORT
              </Button>
            </div>
          )}
        </Card>

        {/* 리더보드 */}
        <Card className="mt-5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-1.5 font-bold text-sm">
              <Trophy className="w-4 h-4 text-amber-400" /> 라이브 리더보드
            </div>
            <span className="text-[10px] text-muted-foreground">실시간 갱신</span>
          </div>
          <div className="space-y-1.5">
            {board.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                아직 참전자가 없습니다. 1위가 되어 보세요.
              </div>
            ) : (
              board.map((r) => (
                <div
                  key={r.rank}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                    r.is_self ? "bg-primary/10 border-primary/40" : "bg-muted/30 border-border/40",
                    r.rank === 1 && "ring-1 ring-amber-400/50",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      "font-display font-black text-sm w-6 tabular-nums",
                      r.rank === 1 ? "text-amber-400" : "text-muted-foreground",
                    )}>#{r.rank}</span>
                    <span className="truncate font-bold">{r.display_name}</span>
                    {r.combo_max >= 3 && (
                      <span className="text-[10px] text-amber-300 font-bold">×{r.combo_max}🔥</span>
                    )}
                  </div>
                  <span className={cn(
                    "font-mono font-black tabular-nums",
                    r.sim_pnl_pct > 0 ? "text-emerald-400" : r.sim_pnl_pct < 0 ? "text-destructive" : "text-muted-foreground",
                  )}>
                    {r.sim_pnl_pct >= 0 ? "+" : ""}{Number(r.sim_pnl_pct).toFixed(2)}%
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <p className="mt-4 text-[10px] text-muted-foreground text-center leading-relaxed">
          모든 거래는 시뮬(₡)이며 실제 자금에 영향을 주지 않습니다. 상금은 PHON 사전 크레딧으로 지급됩니다.
        </p>
      </div>
    </div>
  );
}
