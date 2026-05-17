import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Flame, ChevronRight } from "lucide-react";
import { useVisibleInterval } from "@/lib/util/visible-interval";
import { trackClick, useTrackView } from "@/lib/telemetry";

/**
 * v19 Slice 2 — Imperial Live Wins Rail
 *
 * Stake.com 의 Recent Big Wins 테이블을 Imperial Empire 스타일로 압도.
 * 클라이언트 랜덤 생성기 (useFakePlayerCount / LivePurchaseTicker 와 동일한 패턴) —
 * 백엔드 / money-flow / DB / 엣지 0 변경.
 *
 * 마운트: 랜딩 (/) Hero 직후 + Dashboard 상단 (Pulse Rail 직후).
 */

type Currency = "KRW" | "PHON" | "USDT";

type WinRow = {
  id: string;
  game: string;
  gameEmoji: string;
  nick: string;
  currency: Currency;
  bet: number;
  mult: number;
  payout: number;
  ts: number; // epoch ms
  jackpot: boolean;
};

// ─────────────────────────────────────────────────────────────
// Pools
// ─────────────────────────────────────────────────────────────

const NICKS: string[] = [
  // 한국
  "서준이", "민지99", "철수킹", "하린님", "지훈왕", "도윤맘", "지우엄빠",
  "하늘공주", "별이아빠", "태양킹", "윤서123", "지아88", "시우랜드",
  "예준파파", "주원킹", "서연777", "민준대왕", "수아맘", "현우god",
  "유나퀸", "지호빠", "은우킹", "다온맘", "건우왕", "서아짱",
  // 외국
  "Alex92", "LunaK", "Kai007", "NovaX", "Sora_22", "Jax11",
  "RyuMax", "ZenoP", "Mira88", "Kairos", "BladeX", "NoctisR",
  "OniK", "SolarV", "ArcKing", "VegaQ", "OrionZ", "AtlasR",
  "ZynPro", "EchoFox", "MaverickJ", "PhoenixD", "ValkyrieK",
];

type Game = { name: string; emoji: string; weight: number; minBet: number; maxBet: number; minMult: number; maxMult: number };

const GAMES: Game[] = [
  { name: "BTC LONG",        emoji: "📈", weight: 14, minBet: 50,    maxBet: 2_000_000, minMult: 1.5,  maxMult: 12 },
  { name: "ETH SHORT",       emoji: "📉", weight: 12, minBet: 50,    maxBet: 1_500_000, minMult: 1.4,  maxMult: 11 },
  { name: "SOL LONG",        emoji: "🚀", weight: 8,  minBet: 30,    maxBet: 800_000,   minMult: 1.5,  maxMult: 14 },
  { name: "Olympus 1000",    emoji: "⚡", weight: 14, minBet: 100,   maxBet: 200_000,   minMult: 1.5,  maxMult: 120 },
  { name: "Dragon Empire",   emoji: "🐉", weight: 11, minBet: 100,   maxBet: 300_000,   minMult: 1.4,  maxMult: 88 },
  { name: "Crash",           emoji: "💥", weight: 12, minBet: 50,    maxBet: 500_000,   minMult: 1.2,  maxMult: 50 },
  { name: "SixSixSix",       emoji: "🎲", weight: 9,  minBet: 50,    maxBet: 200_000,   minMult: 1.3,  maxMult: 66 },
  { name: "Olympus Legacy",  emoji: "🏛️", weight: 6,  minBet: 100,   maxBet: 250_000,   minMult: 1.5,  maxMult: 200 },
  { name: "Cosmic Forge",    emoji: "🌌", weight: 5,  minBet: 100,   maxBet: 200_000,   minMult: 1.5,  maxMult: 150 },
  { name: "Sugar Fever",     emoji: "🍭", weight: 5,  minBet: 100,   maxBet: 150_000,   minMult: 1.4,  maxMult: 90 },
  { name: "Viking Thunder",  emoji: "⚔️", weight: 5,  minBet: 100,   maxBet: 200_000,   minMult: 1.4,  maxMult: 80 },
  { name: "Pharaoh's Vault", emoji: "🔱", weight: 4,  minBet: 100,   maxBet: 180_000,   minMult: 1.5,  maxMult: 100 },
];

const TOTAL_W = GAMES.reduce((a, b) => a + b.weight, 0);

function pickGame(): Game {
  let r = Math.random() * TOTAL_W;
  for (const g of GAMES) {
    r -= g.weight;
    if (r <= 0) return g;
  }
  return GAMES[0];
}

function pickCurrency(): Currency {
  const r = Math.random();
  if (r < 0.5) return "KRW";
  if (r < 0.8) return "PHON";
  return "USDT";
}

function randInRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function roundBet(v: number, c: Currency) {
  if (c === "USDT") return Math.max(1, Math.round(v / 10) * 10);
  if (c === "PHON") return Math.max(50, Math.round(v / 50) * 50);
  return Math.max(1000, Math.round(v / 1000) * 1000);
}

function genRow(usedNicks: Set<string>): WinRow {
  const g = pickGame();
  const c = pickCurrency();
  const betRaw = randInRange(g.minBet, g.maxBet);

  // 5% 잭팟 확률 (×80+), 나머지는 분포 곡선
  const jackpot = Math.random() < 0.05;
  let mult: number;
  if (jackpot) {
    mult = Math.max(80, randInRange(80, g.maxMult));
  } else {
    // 대부분 1.2~6 사이, 일부 6~30
    mult = Math.random() < 0.75
      ? randInRange(g.minMult, Math.min(6, g.maxMult))
      : randInRange(6, Math.min(40, g.maxMult));
  }

  const bet = roundBet(betRaw, c);
  const payout = Math.round(bet * mult * 100) / 100;

  // 닉네임 중복 방지 (최근 12행)
  let nick = NICKS[Math.floor(Math.random() * NICKS.length)];
  let tries = 0;
  while (usedNicks.has(nick) && tries < 10) {
    nick = NICKS[Math.floor(Math.random() * NICKS.length)];
    tries++;
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    game: g.name,
    gameEmoji: g.emoji,
    nick,
    currency: c,
    bet,
    mult: Math.round(mult * 100) / 100,
    payout,
    ts: Date.now(),
    jackpot,
  };
}

// ─────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────

function fmtAmount(v: number, c: Currency) {
  if (c === "KRW") return `₩${Math.round(v).toLocaleString("ko-KR")}`;
  if (c === "USDT") return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `${Math.round(v).toLocaleString("ko-KR")} PHON`;
}

function fmtTime(ts: number) {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return "방금";
  if (diff < 60) return `${diff}s 전`;
  return `${Math.floor(diff / 60)}m 전`;
}

const CCY_CHIP: Record<Currency, string> = {
  KRW:  "bg-cyan-500/10 text-cyan-300 border-cyan-400/30",
  USDT: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  PHON: "bg-amber-500/10 text-amber-300 border-amber-400/30",
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

type Variant = "compact" | "full";

export default function ImperialLiveWinsRail({ variant = "compact" }: { variant?: Variant } = {}) {
  const isFull = variant === "full";
  const INITIAL_ROWS = isFull ? 10 : 8;
  const MAX_ROWS = isFull ? 10 : 8;
  const [rows, setRows] = useState<WinRow[]>([]);
  const [, force] = useState(0);
  const navigate = useNavigate();
  const aliveRef = useRef(true);

  useTrackView("imperial_wins_rail", "card");

  // 초기 시드
  useEffect(() => {
    const used = new Set<string>();
    const seed: WinRow[] = [];
    for (let i = 0; i < INITIAL_ROWS; i++) {
      const r = genRow(used);
      used.add(r.nick);
      // 과거 시각으로 흐트림 (방금~3m)
      r.ts = Date.now() - i * (5000 + Math.random() * 25_000);
      seed.push(r);
    }
    setRows(seed);
    return () => { aliveRef.current = false; };
  }, []);

  // 8~12s 마다 새 행 prepend
  useVisibleInterval(() => {
    if (!aliveRef.current) return;
    setRows((prev) => {
      const used = new Set(prev.slice(0, 6).map((r) => r.nick));
      const next = genRow(used);
      return [next, ...prev].slice(0, MAX_ROWS);
    });
  }, 10_000, true, { catchUpOnVisible: false });

  // 상대시간 1s 갱신
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  function onCTA() {
    void trackClick("imperial_wins_rail", "deposit_cta");
    navigate("/wallet?focus=deposit");
  }

  return (
    <section
      aria-label="Imperial Live Wins"
      className={
        isFull
          ? "relative overflow-hidden rounded-2xl border border-[hsl(var(--gold)/0.45)] bg-gradient-to-br from-[#1a1320] via-[#110d1a] to-[#1a0f18] backdrop-blur-md shadow-[0_24px_80px_-20px_hsl(var(--gold)/0.45)] glow-imperial"
          : "relative overflow-hidden rounded-2xl border border-secondary/30 bg-gradient-to-br from-amber-950/40 via-background to-stone-950/50 backdrop-blur-md shadow-[0_0_40px_-12px_hsl(var(--secondary)/0.35)]"
      }
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/80 to-transparent" />

      <div className="p-4 sm:p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">🔥</span>
            <span className="relative inline-flex">
              <span className="absolute inset-0 rounded-full bg-rose-500/70 animate-ping" />
              <span className="relative inline-block w-2 h-2 rounded-full bg-rose-500" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.3em] font-bold text-secondary/80 uppercase">Global Live Wins</div>
              <div className="font-imperial text-sm sm:text-base text-gradient-imperial tracking-[0.04em] truncate">
                전 세계 황제들의 실시간 승전보 — 지금 제국이 불타고 있습니다
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black tracking-wider bg-rose-500/15 text-rose-300 border border-rose-400/40">
            LIVE · 24/7
          </span>
        </div>

        {/* Table head */}
        <div className="hidden sm:grid grid-cols-[1.4fr_1fr_56px_56px_1fr_56px_1.2fr] gap-2 px-2 py-1.5 text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground border-b border-border/40">
          <div>게임</div>
          <div>황제</div>
          <div className="text-right">시간</div>
          <div className="text-center">통화</div>
          <div className="text-right">베팅</div>
          <div className="text-right">배율</div>
          <div className="text-right">당첨금액</div>
        </div>
        {/* Mobile head — 시간 컬럼 숨김 */}
        <div className="sm:hidden grid grid-cols-[1.3fr_1fr_46px_1fr_46px_1.2fr] gap-1.5 px-1.5 py-1 text-[8px] font-bold tracking-[0.18em] uppercase text-muted-foreground border-b border-border/40">
          <div>게임</div>
          <div>황제</div>
          <div className="text-center">통화</div>
          <div className="text-right">베팅</div>
          <div className="text-right">×</div>
          <div className="text-right">당첨</div>
        </div>

        {/* Rows */}
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {rows.map((r) => (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className={
                  r.jackpot
                    ? (isFull
                      ? "relative my-1 rounded-xl overflow-hidden bg-gradient-to-r from-[hsl(var(--gold)/0.18)] via-[hsl(var(--pink)/0.16)] to-[hsl(var(--gold)/0.18)] border border-[hsl(var(--gold)/0.55)] shadow-[0_0_28px_-4px_hsl(var(--gold)/0.55)] pulse-halo"
                      : "relative my-0.5 rounded-lg overflow-hidden bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-amber-500/10 border border-amber-400/30 animate-pulse")
                    : (isFull ? "my-0 border-b border-[hsl(var(--gold)/0.12)]" : "my-0 border-b border-border/20")
                }
              >
                {r.jackpot && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-amber-300 via-yellow-200 to-pink-300" />
                )}

                {/* Desktop row */}
                <div className={`hidden sm:grid grid-cols-[1.4fr_1fr_56px_56px_1fr_56px_1.2fr] gap-2 items-center px-2 ${isFull ? "py-2.5 min-h-[60px]" : "py-2 min-h-[52px]"}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {r.jackpot && <Crown className={`${isFull ? "w-4 h-4" : "w-3.5 h-3.5"} text-amber-300 shrink-0 drop-shadow-[0_0_6px_hsl(var(--gold)/0.7)]`} />}
                    <span className={`${isFull ? "text-lg" : "text-base"} shrink-0`}>{r.gameEmoji}</span>
                    <span className={`${isFull ? "text-[13px]" : "text-[12px]"} font-bold truncate`}>{r.game}</span>
                  </div>
                  <span className={`${isFull ? "text-[13px]" : "text-[12px]"} text-foreground/90 truncate`}>{r.nick}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums text-right">{fmtTime(r.ts)}</span>
                  <span className={`mx-auto px-1.5 py-0.5 rounded text-[9px] font-black border ${CCY_CHIP[r.currency]}`}>
                    {r.currency}
                  </span>
                  <span className={`${isFull ? "text-[12px]" : "text-[11px]"} font-mono tabular-nums text-muted-foreground text-right`}>{fmtAmount(r.bet, r.currency)}</span>
                  <span className={`${isFull ? "text-[12px]" : "text-[11px]"} font-mono font-black tabular-nums text-right ${r.jackpot ? "text-amber-300" : r.mult >= 10 ? "text-secondary" : "text-foreground/80"}`}>
                    ×{r.mult.toFixed(2)}
                  </span>
                  <span
                    className={
                      r.jackpot
                        ? `${isFull ? "text-[17px]" : "text-[14px]"} font-mono font-black tabular-nums text-right bg-gradient-to-r from-amber-200 via-yellow-100 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_hsl(var(--gold)/0.85)]`
                        : `${isFull ? "text-[15px]" : "text-[13px]"} font-mono font-black tabular-nums text-right bg-gradient-to-r from-amber-300 via-yellow-200 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_hsl(var(--gold)/0.55)]`
                    }
                  >
                    {fmtAmount(r.payout, r.currency)}
                  </span>
                </div>

                {/* Mobile row */}
                <div className="sm:hidden grid grid-cols-[1.3fr_1fr_46px_1fr_46px_1.2fr] gap-1.5 items-center px-1.5 py-2 min-h-[48px]">
                  <div className="flex items-center gap-1 min-w-0">
                    {r.jackpot && <Flame className="w-3 h-3 text-amber-300 shrink-0" />}
                    <span className="text-sm shrink-0">{r.gameEmoji}</span>
                    <span className="text-[11px] font-bold truncate">{r.game}</span>
                  </div>
                  <span className="text-[11px] text-foreground/90 truncate">{r.nick}</span>
                  <span className={`mx-auto px-1 py-0.5 rounded text-[8px] font-black border ${CCY_CHIP[r.currency]}`}>
                    {r.currency}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground text-right truncate">{fmtAmount(r.bet, r.currency)}</span>
                  <span className={`text-[10px] font-mono font-black tabular-nums text-right ${r.jackpot ? "text-amber-300" : r.mult >= 10 ? "text-secondary" : "text-foreground/80"}`}>
                    ×{r.mult.toFixed(1)}
                  </span>
                  <span
                    className={
                      r.jackpot
                        ? "text-[12px] font-mono font-black tabular-nums text-right bg-gradient-to-r from-amber-300 via-yellow-200 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_hsl(var(--secondary)/0.7)] truncate"
                        : "text-[11px] font-mono font-black tabular-nums text-right bg-gradient-to-r from-amber-300 via-yellow-200 to-pink-300 bg-clip-text text-transparent drop-shadow-[0_0_5px_hsl(var(--secondary)/0.45)] truncate"
                    }
                  >
                    {fmtAmount(r.payout, r.currency)}
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* CTA */}
        <button
          type="button"
          onClick={onCTA}
          className="group relative w-full overflow-hidden rounded-xl px-4 py-3 min-h-[48px] bg-gradient-to-r from-primary via-accent to-secondary text-primary-foreground font-bold tracking-wide text-sm shadow-[0_8px_24px_-8px_hsl(var(--accent)/0.6)] transition press"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            지금 참여하시면 첫 입금 보너스를 받으실 수 있습니다, 폐하.
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
          </span>
          <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </button>
      </div>
    </section>
  );
}
