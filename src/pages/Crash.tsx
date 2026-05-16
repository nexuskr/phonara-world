import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Rocket, Flame, Crown, History, Loader2, CheckCircle2, RotateCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CrashCanvas from "@/components/crash/CrashCanvas";
import CrashSettingsSheet from "@/components/crash/CrashSettingsSheet";
import FairnessPanel from "@/components/crash/FairnessPanel";
import { useCrashRound } from "@/components/crash/hooks/useCrashRound";
import {
  placeBet, cashoutNow, getRecentWins, getMyStats, claimCrashMission, friendlyError,
} from "@/lib/crash";
import { notify } from "@/lib/notify";
import { haptics } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { useGameChannel } from "@pkg/realtime";
import { fireBigWinShare } from "@/lib/bigwinShare";

const QUICK = [10000, 50000, 100000, 500000];

type BetState = "idle" | "submitting" | "placed" | "cashing" | "paid" | "lost";

interface LastResult {
  kind: "paid" | "lost";
  mult?: number;
  payout?: number;
  bet?: number;
  roundShort?: string;
}

export default function Crash() {
  const { round, mult } = useCrashRound();
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);
  const [bet, setBet] = useState<number>(10000);
  const [auto, setAuto] = useState<string>("2.00");
  const [betState, setBetState] = useState<BetState>("idle");
  const [last, setLast] = useState<LastResult | null>(null);
  const lastRoundIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["crash-stats", uid],
    queryFn: getMyStats,
    enabled: !!uid,
    staleTime: 5000,
  });
  const { data: wins = [] } = useQuery({
    queryKey: ["crash-wins"],
    queryFn: () => getRecentWins(15),
    refetchInterval: 8000,
  });

  // Reset placed state on a fresh pending round
  useEffect(() => {
    if (round.status === "pending" && (betState === "paid" || betState === "lost")) {
      setBetState("idle");
    }
  }, [round.id, round.status, betState]);

  // Detect crash without cashout → mark as lost (only if we had bet on this round)
  useEffect(() => {
    if (round.status === "crashed" && (betState === "placed")) {
      setBetState("lost");
      setLast({
        kind: "lost",
        mult: Number(round.last_crash ?? 0),
        bet,
        roundShort: lastRoundIdRef.current?.slice(0, 6),
      });
      haptics.error();
    }
  }, [round.status, betState, round.last_crash, bet]);

  // Realtime: refresh stats on my bet changes
  useGameChannel({
    key: uid ? `crash-bets:${uid}` : "",
    bindings: uid ? [{ event: "*", table: "crash_bets", filter: `user_id=eq.${uid}` }] : [],
    onEvent: () => qc.invalidateQueries({ queryKey: ["crash-stats"] }),
    enabled: !!uid,
  });

  const onBet = async () => {
    if (betState !== "idle") return;
    setBetState("submitting");
    try {
      const autoNum = auto && parseFloat(auto) >= 1.01 ? parseFloat(auto) : null;
      const r = await placeBet(bet, autoNum);
      lastRoundIdRef.current = r.round_id;
      setBetState("placed");
      haptics.select();
      notify.success(`✅ 베팅 완료 · 보너스 ×${r.bonus_mult}`);
    } catch (e) {
      setBetState("idle");
      notify.error(friendlyError(e));
    }
  };

  const onCashout = async () => {
    if (!round.id || betState !== "placed") return;
    setBetState("cashing");
    try {
      const r = await cashoutNow(round.id);
      setBetState("paid");
      haptics.win();
      const shortRound = round.id.slice(0, 6);
      setLast({ kind: "paid", mult: r.mult, payout: r.payout, bet, roundShort: shortRound });
      notify.success(`✅ 정산 완료 · +${r.payout.toLocaleString()} PHON (#${shortRound})`);
      if (r.payout >= 1_000_000 || r.mult >= 10) {
        fireBigWinShare({ amount: r.payout, symbol: `CRASH ${r.mult.toFixed(2)}x` });
      }
      qc.invalidateQueries({ queryKey: ["crash-stats"] });
    } catch (e) {
      setBetState("placed");
      notify.error(friendlyError(e));
    }
  };

  const onClaimMission = async () => {
    try {
      const r = await claimCrashMission();
      notify.success(`🎁 +${r.reward} PHON 받았어요!`);
      qc.invalidateQueries({ queryKey: ["crash-stats"] });
    } catch (e) {
      notify.error(friendlyError(e));
    }
  };

  const rebet = () => { setLast(null); setBetState("idle"); };

  const multColor =
    mult < 3 ? "text-[hsl(var(--gold))]" : mult < 10 ? "text-orange-400" : "text-[hsl(var(--pink))]";
  const statusLabel =
    round.status === "running" ? `${mult.toFixed(2)}x` :
    round.status === "pending" ? "베팅 모집 중…" :
    round.status === "crashed" ? "💥 폭발!" : "대기";

  const inputsLocked = betState !== "idle";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] flex items-center justify-center shrink-0">
              <Rocket className="w-5 h-5 text-background" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-foreground">Crash</h1>
              <p className="text-[11px] text-muted-foreground">실시간 멀티플라이어 베팅</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && stats.streak >= 3 && (
              <span className="hidden sm:flex px-2 py-1 rounded-lg bg-[hsl(var(--gold))]/15 border border-[hsl(var(--gold))]/40 text-[hsl(var(--gold))] font-bold items-center gap-1 text-xs">
                <Flame className="w-3 h-3" /> ×{stats.streak} +5%
              </span>
            )}
            <Link
              to="/crash/history"
              className="h-11 px-3 rounded-xl bg-card border border-border/50 flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-[hsl(var(--gold))]"
            >
              <History className="w-4 h-4" /> 내 기록
            </Link>
            <CrashSettingsSheet />
          </div>
        </div>

        {/* Canvas + Multiplier overlay */}
        <div className="relative">
          <CrashCanvas multiplier={mult} status={round.status === "none" ? "pending" : round.status} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              key={statusLabel}
              initial={{ scale: 0.94, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className={`text-5xl md:text-7xl font-black tabular-nums drop-shadow-[0_0_24px_currentColor] ${multColor}`}
            >
              {statusLabel}
            </motion.div>
          </div>
          {round.last_crash && round.status === "pending" && (
            <div className="absolute top-3 right-3 text-xs text-muted-foreground bg-card/80 px-2 py-1 rounded-md">
              직전 폭발:{" "}
              <span className={Number(round.last_crash) >= 2 ? "text-[hsl(var(--gold))] font-bold" : "text-destructive font-bold"}>
                {Number(round.last_crash).toFixed(2)}x
              </span>
            </div>
          )}
        </div>

        {/* Outcome confirmation card */}
        <AnimatePresence>
          {last && (betState === "paid" || betState === "lost") && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${
                last.kind === "paid"
                  ? "border-[hsl(var(--gold))]/50 bg-[hsl(var(--gold))]/10"
                  : "border-destructive/50 bg-destructive/10"
              }`}
            >
              <div className="min-w-0">
                {last.kind === "paid" ? (
                  <>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--gold))]" />
                      정산 완료 · #{last.roundShort}
                    </div>
                    <div className="text-lg font-black text-[hsl(var(--gold))] tabular-nums">
                      +{(last.payout ?? 0).toLocaleString()} PHON
                      <span className="ml-2 text-sm text-foreground/80">{last.mult?.toFixed(2)}x</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">💥 이번 라운드 폭발</div>
                    <div className="text-base font-black text-destructive tabular-nums">
                      -{(last.bet ?? 0).toLocaleString()} PHON
                      {last.mult ? <span className="ml-2 text-sm text-foreground/80">{last.mult.toFixed(2)}x</span> : null}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={rebet}
                className="h-11 px-4 rounded-xl bg-card border border-border/50 text-foreground font-bold text-sm flex items-center gap-1.5 active:scale-[0.97]"
              >
                <RotateCw className="w-4 h-4" /> 다시 베팅
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bet Panel */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => setBet(q)}
                disabled={inputsLocked}
                className={`h-11 rounded-xl font-bold text-sm border transition active:scale-[0.97] disabled:opacity-50 ${
                  bet === q
                    ? "bg-[hsl(var(--gold))]/20 border-[hsl(var(--gold))]/60 text-[hsl(var(--gold))]"
                    : "bg-background/40 border-border/40 text-foreground"
                }`}
              >
                {q / 1000}k
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">베팅 (PHON)</span>
              <input
                type="number"
                inputMode="numeric"
                value={bet}
                disabled={inputsLocked}
                onChange={(e) => setBet(Math.max(100, Number(e.target.value || 0)))}
                className="w-full h-12 rounded-xl border border-border/50 bg-background/60 px-3 text-base font-bold text-foreground tabular-nums disabled:opacity-60"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] text-muted-foreground">자동 캐시아웃 (x)</span>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={auto}
                disabled={inputsLocked}
                onChange={(e) => setAuto(e.target.value)}
                placeholder="2.00"
                className="w-full h-12 rounded-xl border border-border/50 bg-background/60 px-3 text-base font-bold text-foreground tabular-nums disabled:opacity-60"
              />
            </label>
          </div>

          {/* Primary action */}
          <PrimaryAction
            betState={betState}
            roundStatus={round.status}
            mult={mult}
            bet={bet}
            onBet={onBet}
            onCashout={onCashout}
          />

          {stats?.mission_ready && !stats?.mission_claimed && (
            <button
              onClick={onClaimMission}
              className="w-full h-11 rounded-xl border border-[hsl(var(--gold))]/50 bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] font-bold text-sm active:scale-[0.98]"
            >
              🎁 오늘 미션 보상 받기 (+150 PHON)
            </button>
          )}
        </div>

        {/* Fairness verification of latest round */}
        <FairnessPanel roundId={round.id} />

        {/* Recent Wins Feed */}
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4 text-[hsl(var(--gold))]" /> 최근 대박
          </h3>
          {wins.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">아직 대박이 없어요. 첫 주인공이 되어보세요!</p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {wins.map((w, i) => (
                <li key={i} className="flex items-center justify-between text-sm rounded-lg bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground truncate">{w.nick}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className={Number(w.multiplier) >= 10 ? "text-[hsl(var(--pink))] font-bold" : "text-[hsl(var(--gold))] font-bold"}>
                      {Number(w.multiplier).toFixed(2)}x
                    </span>
                    <span className="text-foreground font-black">+{Number(w.payout).toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function PrimaryAction({
  betState, roundStatus, mult, bet, onBet, onCashout,
}: {
  betState: BetState;
  roundStatus: string;
  mult: number;
  bet: number;
  onBet: () => void;
  onCashout: () => void;
}) {
  // Cashout phases
  if (betState === "placed" && roundStatus === "running") {
    return (
      <motion.button
        onClick={onCashout}
        animate={{ scale: [1, 1.015, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className="w-full h-14 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background font-black text-lg shadow-[0_0_24px_hsl(var(--gold)/0.5)] active:scale-[0.98] transition"
      >
        💰 캐시아웃 {mult.toFixed(2)}x
      </motion.button>
    );
  }
  if (betState === "cashing") {
    return (
      <button disabled className="w-full h-14 rounded-xl bg-[hsl(var(--gold))]/70 text-background font-black text-lg flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> 정산 중…
      </button>
    );
  }
  if (betState === "submitting") {
    return (
      <button disabled className="w-full h-14 rounded-xl bg-[hsl(var(--gold))]/70 text-background font-black text-lg flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> 베팅 중…
      </button>
    );
  }
  if (betState === "placed" && roundStatus !== "running") {
    return (
      <button disabled className="w-full h-14 rounded-xl bg-card border border-[hsl(var(--gold))]/50 text-[hsl(var(--gold))] font-black text-base flex items-center justify-center gap-2">
        <CheckCircle2 className="w-5 h-5" /> 베팅 완료 · 라운드 시작 대기
      </button>
    );
  }
  // idle / paid / lost
  return (
    <button
      onClick={onBet}
      disabled={roundStatus !== "pending"}
      className="w-full h-14 rounded-xl bg-[hsl(var(--gold))] text-background font-black text-lg active:scale-[0.98] transition disabled:opacity-50"
    >
      {roundStatus === "pending" ? `🚀 ${bet.toLocaleString()} PHON 베팅` : "라운드 대기 중…"}
    </button>
  );
}
