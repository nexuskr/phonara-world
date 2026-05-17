/**
 * ImperialLiveActivity — v19 Ultimate Stake Crusher
 *
 * 시뮬레이션 전용 라이브 활동 엔진. DB·RPC·머니플로 0줄.
 * - 8~12s 마다 새 행 slide-in (motion/react 동적 import 후 사용)
 * - 닉네임 풀: 한국 + 해외 자연 혼합
 * - 통화 비율: KRW 45 / PHON 35 / USDT 20
 * - 잭팟 행(8%) = gold glow + Crown + scale pulse + "JACKPOT" badge
 * - 탭 hidden / off-screen 이면 자동 일시정지 (성능 보호)
 * - prefers-reduced-motion → 슬라이드 → 즉시 fade
 *
 * variant:
 *   - "full"    : Dashboard용. rows=8, 헤더/타이틀 포함
 *   - "compact" : Landing용. rows=4, 컴팩트 카드
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, TrendingUp, ArrowDownToLine, Sparkles, Coins } from "lucide-react";
// Landing/Dashboard 가 이미 framer-motion 을 사용 → 추가 청크 비용 0.
import { motion, AnimatePresence } from "framer-motion";

// ----- 데이터 풀 -----
const NICKS_KR = [
  "서준이", "민지99", "하린님", "도윤2", "지우K", "수아_91", "예준짱",
  "채원이", "현우00", "수빈e", "유나7", "지호W", "은서88", "태양K",
];
const NICKS_INTL = [
  "Alex92", "LunaK", "Kai007", "Sora_jp", "Mika88", "NovaX", "RyuJP",
  "Eva_77", "Leo24", "ZenithR", "Kiraa", "Onyx_1", "VeraM", "RyokoX",
];
const ALL_NICKS = [...NICKS_KR, ...NICKS_INTL];

type Currency = "KRW" | "PHON" | "USDT";
const CURRENCY_WEIGHTS: { c: Currency; w: number }[] = [
  { c: "KRW", w: 45 },
  { c: "PHON", w: 35 },
  { c: "USDT", w: 20 },
];

type ActionKind = "win" | "withdraw" | "deposit" | "jackpot";
type Row = {
  id: string;
  ts: number;
  nick: string;
  action: ActionKind;
  currency: Currency;
  amount: number;
  game?: string;
};

const GAMES = [
  "Olympus 1000", "Wizard 2000", "Dragon Empire", "Cosmic Forge",
  "Pharaoh's Vault", "Sugar Fever", "Viking Thunder", "Neon Tokyo 88",
];

function weighted<T>(items: { c?: T; w: number; v?: T }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= i.w;
    if (r <= 0) return (i.c ?? i.v) as T;
  }
  return (items[items.length - 1].c ?? items[items.length - 1].v) as T;
}

function pickAmount(currency: Currency, jackpot: boolean): number {
  if (jackpot) {
    if (currency === "KRW")  return Math.round((4 + Math.random() * 8) * 1_000_000); // 4M~12M ₩
    if (currency === "PHON") return Math.round((3 + Math.random() * 9) * 1_000_000); // 3M~12M PHON
    return Math.round((3000 + Math.random() * 9000));                                  // 3k~12k USDT
  }
  if (currency === "KRW")  return Math.round((20 + Math.random() * 380) * 10_000);    // 20만~400만원
  if (currency === "PHON") return Math.round((500 + Math.random() * 18_000));         // 500~18,500 PHON
  return Math.round((20 + Math.random() * 480));                                       // 20~500 USDT
}

function formatAmount(c: Currency, n: number): string {
  const fmt = new Intl.NumberFormat("ko-KR").format(n);
  if (c === "KRW") return `₩${fmt}`;
  if (c === "USDT") return `${fmt} USDT`;
  return `${fmt} PHON`;
}

function makeRow(): Row {
  const jackpot = Math.random() < 0.08;
  const currency = weighted(CURRENCY_WEIGHTS);
  const action: ActionKind = jackpot
    ? "jackpot"
    : weighted([
        { v: "win" as ActionKind, w: 60 },
        { v: "withdraw" as ActionKind, w: 25 },
        { v: "deposit" as ActionKind, w: 15 },
      ]);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    nick: ALL_NICKS[Math.floor(Math.random() * ALL_NICKS.length)],
    action,
    currency,
    amount: pickAmount(currency, jackpot),
    game: action === "win" || action === "jackpot"
      ? GAMES[Math.floor(Math.random() * GAMES.length)]
      : undefined,
  };
}

function actionLabel(a: ActionKind): string {
  if (a === "win") return "승전";
  if (a === "withdraw") return "출금 완료";
  if (a === "deposit") return "입금";
  return "JACKPOT";
}
function ActionIcon({ a }: { a: ActionKind }) {
  if (a === "jackpot") return <Crown className="w-3.5 h-3.5" />;
  if (a === "withdraw") return <ArrowDownToLine className="w-3.5 h-3.5" />;
  if (a === "deposit") return <Coins className="w-3.5 h-3.5" />;
  return <TrendingUp className="w-3.5 h-3.5" />;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !("matchMedia" in window)) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ----- 컴포넌트 -----
export interface ImperialLiveActivityProps {
  variant?: "full" | "compact";
  rows?: number;
}

export default function ImperialLiveActivity({
  variant = "full",
  rows: rowsCap,
}: ImperialLiveActivityProps) {
  const cap = rowsCap ?? (variant === "full" ? 8 : 4);
  const [rows, setRows] = useState<Row[]>(() => {
    // 초기 시드 (즉시 활기 보장)
    return Array.from({ length: Math.min(cap, 4) }, () => makeRow())
      .map((r, i) => ({ ...r, ts: Date.now() - (i + 1) * 4000 }));
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(true);
  const reduced = useMemo(prefersReducedMotion, []);

  // 가시성 추적
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVis = () => { visibleRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    const el = containerRef.current;
    let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver(([e]) => { visibleRef.current = e?.isIntersecting ?? true; }, { threshold: 0.05 });
      io.observe(el);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, []);

  // 8~12s 마다 새 행 push (재귀 setTimeout, 단일 핸들)
  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const tick = () => {
      if (!alive) return;
      if (visibleRef.current) {
        setRows((prev) => [makeRow(), ...prev].slice(0, cap));
      }
      const delay = 8000 + Math.random() * 4000;
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 2200 + Math.random() * 1500);
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, [cap]);

  const wrap =
    variant === "full"
      ? "rounded-2xl border border-[hsl(var(--gold)/0.32)] bg-gradient-to-br from-amber-950/30 via-background/80 to-rose-950/25 backdrop-blur-sm overflow-hidden"
      : "rounded-xl border border-[hsl(var(--gold)/0.28)] bg-gradient-to-br from-amber-950/25 via-background/70 to-rose-950/20 backdrop-blur-sm overflow-hidden";

  return (
    <section ref={containerRef} className="relative" aria-label="실시간 황제들의 활동">
      <div className={wrap}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--gold)/0.18)]">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex items-center justify-center w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400/70 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_hsl(140_80%_60%/0.9)]" />
            </span>
            <span className="text-[10px] tracking-[0.32em] font-black text-[hsl(var(--gold))] uppercase">
              Live · 황제들의 무대
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">실시간</span>
        </div>

        {/* List */}
        <div className="divide-y divide-border/30">
          <AnimatedRows rows={rows} variant={variant} reduced={reduced} />
        </div>
      </div>
    </section>
  );
}

// ----- 행 렌더 -----
function RowContent({ r, variant }: { r: Row; variant: "full" | "compact" }) {
  const jackpot = r.action === "jackpot";
  const positive = r.action === "win" || r.action === "jackpot" || r.action === "deposit";
  return (
    <div
      className={`flex items-center gap-3 px-4 ${variant === "full" ? "py-2.5" : "py-2"} ${
        jackpot
          ? "bg-gradient-to-r from-[hsl(var(--gold)/0.18)] via-[hsl(var(--gold)/0.05)] to-[hsl(var(--pink)/0.15)] shadow-[inset_0_0_30px_hsl(var(--gold)/0.25)]"
          : ""
      }`}
    >
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
          jackpot
            ? "bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_0_14px_hsl(var(--gold)/0.7)] animate-pulse"
            : positive
            ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))] border border-[hsl(var(--gold)/0.3)]"
            : "bg-muted/40 text-muted-foreground"
        }`}
      >
        <ActionIcon a={r.action} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12px] sm:text-[13px]">
          <span className="font-bold text-foreground truncate">{r.nick}</span>
          <span className="text-muted-foreground">님이</span>
          {r.game && <span className="text-foreground/80 truncate">{r.game}에서</span>}
          <span className={positive ? "text-emerald-400" : "text-muted-foreground"}>{actionLabel(r.action)}</span>
        </div>
        {jackpot && (
          <div className="text-[9px] tracking-[0.3em] font-black text-[hsl(var(--gold))] mt-0.5 drop-shadow-[0_0_8px_hsl(var(--gold)/0.7)]">
            ★ JACKPOT ★
          </div>
        )}
      </div>

      <div
        className={`shrink-0 text-right font-mono font-black tabular-nums ${
          jackpot
            ? "text-[hsl(var(--gold))] text-base drop-shadow-[0_0_10px_hsl(var(--gold)/0.7)]"
            : positive
            ? "text-emerald-300 text-[13px]"
            : "text-foreground text-[13px]"
        }`}
      >
        {formatAmount(r.currency, r.amount)}
      </div>

      {jackpot && (
        <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_2px_10px_hsl(var(--pink)/0.55)]">
          <Sparkles className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5" />
          BIG
        </span>
      )}
    </div>
  );
}

function StaticRows({ rows, variant }: { rows: Row[]; variant: "full" | "compact" }) {
  return (
    <>
      {rows.map((r) => (
        <div key={r.id} className="animate-fade-in">
          <RowContent r={r} variant={variant} />
        </div>
      ))}
    </>
  );
}

function AnimatedRows({
  rows,
  variant,
  reduced,
}: {
  rows: Row[];
  variant: "full" | "compact";
  reduced: boolean;
}) {
  if (reduced) return <StaticRows rows={rows} variant={variant} />;
  return (
    <AnimatePresenceLazy initial={false}>
      {rows.map((r) => (
        <MotionDiv
          key={r.id}
          layout
          initial={{ opacity: 0, y: -14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.42, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <RowContent r={r} variant={variant} />
        </MotionDiv>
      ))}
    </AnimatePresenceLazy>
  );
}
