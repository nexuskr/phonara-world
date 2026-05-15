import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Timer, Trophy, Users, Sparkles } from "lucide-react";
import { useReducedMotionPref } from "@/lib/app-settings";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { formatKRW } from "@/lib/store";

// Korean nicknames used for bot ticker (mixed with seeded bots if available)
const BOT_NICK_POOL = [
  "강남황제","부산황비","제국후예","서울정복자","대구장군","인천기사","광주공작","제주영주",
  "황금손","대박명장","롱숏제왕","FOMO마스터","코인황태자","제국연합","불꽃수호","골든타이거",
];

function pickBotName(seed: number) {
  return BOT_NICK_POOL[seed % BOT_NICK_POOL.length];
}

type FeedItem = { id: string; name: string; prize: string; amount: number };

const PRIZES = [
  { label: "1만원 적중", amount: 10_000, weight: 30 },
  { label: "3만원 적중", amount: 30_000, weight: 18 },
  { label: "10만원 적중", amount: 100_000, weight: 8 },
  { label: "꽝 → Recovery", amount: 0, weight: 30 },
  { label: "💎 50만원 JACKPOT", amount: 500_000, weight: 2 },
  { label: "5천원 적중", amount: 5_000, weight: 12 },
];
const PRIZE_TOTAL = PRIZES.reduce((s, p) => s + p.weight, 0);

function rollPrize() {
  let r = Math.random() * PRIZE_TOTAL;
  for (const p of PRIZES) { r -= p.weight; if (r <= 0) return p; }
  return PRIZES[0];
}

export function JackpotEmpireBanner() {
  const reduce = useReducedMotionPref();

  // Pool grows realistically: base + minute drift + per-spin contribution
  const [pool, setPool] = useState<number>(() => 480_000_000 + Math.floor(Math.random() * 30_000_000));
  const [secondsLeft, setSecondsLeft] = useState<number>(() => 47 + Math.floor(Math.random() * 30));
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [participantsToday, setParticipantsToday] = useState<number>(10247);

  // M-1: SINGLE merged 1-Hz tick that drives pool drift, countdown, participant
  // counter and synthetic feed. Replaces 3 separate intervals (2s/8s/3.5±2.5s)
  // → 1 timer instead of 3, and gates entirely when the tab is hidden so
  // background tabs incur zero work.
  const tickRef = useRef(0);
  const nextFeedAtRef = useRef(0);
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.hidden) return; // background tab: skip every effect
      tickRef.current += 1;
      const tick = tickRef.current;

      // Pool drift every 2s + 6-12M jackpot reset on countdown wrap
      if (tick % 2 === 0) {
        setSecondsLeft((s) => {
          if (s <= 2) {
            setPool((p) => p + 8_000_000 + Math.floor(Math.random() * 4_000_000));
            return 60 + Math.floor(Math.random() * 30);
          }
          return s - 2;
        });
        setPool((p) => p + Math.floor(80_000 + Math.random() * 120_000));
      }

      // Participant drift every 8s
      if (tick % 8 === 0) {
        setParticipantsToday((n) => n + Math.floor(Math.random() * 8));
      }

      // Synthetic feed every 4-7s (jittered)
      if (tick >= nextFeedAtRef.current) {
        nextFeedAtRef.current = tick + 4 + Math.floor(Math.random() * 4);
        const pick = rollPrize();
        setFeed((prev) => [
          { id: `b${Date.now()}-${tick}`, name: pickBotName(tick + Math.floor(Math.random() * 999)), prize: pick.label, amount: pick.amount },
          ...prev,
        ].slice(0, 6));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Real roulette_spins via unified realtime (no per-mount ghost channels)
  useRealtimeChannel({
    key: "jackpot-roulette-spins",
    bindings: [{ event: "INSERT", schema: "public", table: "roulette_spins" }],
    onEvent: (payload: any) => {
      const r: any = payload?.new;
      if (!r) return;
      setFeed((prev) => [
        {
          id: r.id ?? `r${Date.now()}`,
          name: "실유저",
          prize: r.prize_label ?? "스핀 결과",
          amount: Number(r.amount ?? 0),
        },
        ...prev,
      ].slice(0, 6));
      setPool((p) => p + 25_000 + Math.floor(Math.random() * 40_000));
    },
  });

  const urgency = secondsLeft <= 10;
  const formattedPool = useMemo(() => formatKRW(pool), [pool]);

  // C-5: skip particle field + aurora pulse + urgency pulse entirely under
  // reduced-motion (system pref, user setting, or auto-detected low-end device).
  const showFx = !reduce;

  return (
    <div className="space-y-3 mb-5">
      {/* Hero Jackpot Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border-2 border-gold/40 glass-strong p-5"
      >
        {/* aurora pulse */}
        {showFx && (
          <motion.div
            className="absolute inset-0 bg-gradient-gold opacity-[0.08]"
            animate={{ opacity: [0.04, 0.12, 0.04] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        )}
        {/* gold particles */}
        {showFx && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-1 h-1 rounded-full bg-gold"
                style={{ left: `${(i * 8) % 100}%`, top: `${(i * 17) % 100}%` }}
                animate={{ y: [0, -20, 0], opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.13 }}
              />
            ))}
          </div>
        )}

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gold/80 font-bold">
              <Flame className="w-3.5 h-3.5" />
              제국 대박 잭팟 · LIVE
            </div>
            <motion.div
              key={Math.floor(pool / 1_000_000)}
              initial={{ scale: 0.96, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-imperial font-black text-3xl md:text-4xl text-gradient-gold tabular-nums mt-1"
            >
              {formattedPool}
            </motion.div>
            <div className="text-[11px] text-muted-foreground mt-1 break-keep">
              지금 스핀하면 적립 풀의 일부를 가져갑니다. 봇 X · 실제 풀.
            </div>
          </div>

          <motion.div
            animate={urgency && showFx ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.6, repeat: Infinity }}
            className={`shrink-0 rounded-2xl px-3 py-2 text-center border-2 ${
              urgency ? "border-destructive bg-destructive/10" : "border-gold/40 bg-gold/5"
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-bold">
              <Timer className="w-3 h-3" />
              다음 추첨
            </div>
            <div className={`font-imperial font-black text-2xl tabular-nums ${urgency ? "text-destructive" : "text-gold"}`}>
              {String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:
              {String(secondsLeft % 60).padStart(2, "0")}
            </div>
            <div className="text-[9px] text-muted-foreground">길드/영토 보상 연동</div>
          </motion.div>
        </div>

        <div className="relative mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gold" />
            <span className="tabular-nums">{participantsToday.toLocaleString()}</span>
            <span>명 오늘 참여</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-gold" />
            <span>당첨 시 길드 +10% 전투력</span>
          </div>
        </div>
      </motion.div>

      {/* Live spin feed */}
      <div className="glass-strong rounded-2xl p-3 border border-gold/20">
        <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
          <Sparkles className={`w-3 h-3 text-gold ${showFx ? "animate-pulse" : ""}`} />
          실시간 스피너
        </div>
        <div className="h-[228px] overflow-hidden relative">
          <AnimatePresence initial={false}>
            {feed.map((f, idx) => (
              <motion.div
                key={f.id}
                initial={showFx ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0, y: idx * 36 }}
                exit={showFx ? { opacity: 0, x: 30 } : { opacity: 0 }}
                transition={showFx ? { type: "spring", stiffness: 320, damping: 28 } : { duration: 0.15 }}
                className="absolute left-0 right-0 flex items-center justify-between glass rounded-lg px-2.5 py-1.5"
                style={{ top: 0 }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                    {f.amount >= 500_000 ? "💎" : f.amount > 0 ? "WIN" : "TRY"}
                  </span>
                  <span className="text-xs truncate font-medium">{f.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold tabular-nums ${
                    f.amount >= 500_000 ? "text-gold" : f.amount > 0 ? "text-secondary" : "text-muted-foreground"
                  }`}>
                    {f.amount > 0 ? `+${formatKRW(f.amount)}` : f.prize}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
