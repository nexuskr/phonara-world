/**
 * ImperialLiveActivity — v19 Round 3 Fixed Luxury Engine
 *
 * 슬롯머신 방식. 외곽은 고정 높이 + overflow-hidden + contain:layout paint
 * 각 row 는 position:absolute + transform:translateY() 로 위로 밀어올림 →
 * reflow 0, layout shift 0. Jackpot(8%) 행은 트리플 글로우 링 + Crown +
 * Imperial Seal SVG + "BIG WIN" 칩 + pulse.
 *
 * 머니플로 0, RPC 0, 외부 이미지 0.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, TrendingUp, ArrowDownToLine, Coins, Sparkles } from "lucide-react";

/* ───────── 데이터 풀 ───────── */
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
    if (currency === "KRW")  return Math.round((4 + Math.random() * 8) * 1_000_000);
    if (currency === "PHON") return Math.round((3 + Math.random() * 9) * 1_000_000);
    return Math.round((3000 + Math.random() * 9000));
  }
  if (currency === "KRW")  return Math.round((20 + Math.random() * 380) * 10_000);
  if (currency === "PHON") return Math.round((500 + Math.random() * 18_000));
  return Math.round((20 + Math.random() * 480));
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

/* ───────── Imperial Seal ───────── */
function ImperialSeal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="seal-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--gold))" />
          <stop offset="100%" stopColor="hsl(var(--pink))" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="none" stroke="url(#seal-g)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" fill="url(#seal-g)" opacity="0.85" />
      <path d="M12 4l1.2 3.2L16 4.5l-1 3.5 3.5-1L15 10.2 18.5 12 15 13.8 18.5 14l-3.5-1 1 3.5L13.2 16.8 12 20l-1.2-3.2L8 19.5l1-3.5-3.5 1L9 13.8 5.5 12 9 10.2 5.5 10l3.5 1-1-3.5 2.8 1.7L12 4z" fill="hsl(var(--gold))" opacity="0.9" />
    </svg>
  );
}

/* ───────── 컴포넌트 ───────── */
export interface ImperialLiveActivityProps {
  variant?: "full" | "compact";
  rows?: number;
}

const ROW_PX_FULL = 56;
const ROW_PX_COMPACT = 48;
const HEADER_PX = 38;

export default function ImperialLiveActivity({
  variant = "full",
  rows: rowsCap,
}: ImperialLiveActivityProps) {
  const cap = rowsCap ?? (variant === "full" ? 7 : 5);
  const rowPx = variant === "full" ? ROW_PX_FULL : ROW_PX_COMPACT;
  const listH = rowPx * cap;
  const totalH = HEADER_PX + listH;

  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: cap }, () => makeRow())
  );

  const containerRef = useRef<HTMLElement | null>(null);
  const visibleRef = useRef(true);
  const reduced = useMemo(prefersReducedMotion, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onVis = () => { visibleRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    const el = containerRef.current;
    let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        ([e]) => { visibleRef.current = e?.isIntersecting ?? true; },
        { threshold: 0.05 }
      );
      io.observe(el);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, []);

  // 8~12s slot-machine push (recursive setTimeout)
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
      ? "rounded-2xl border border-[hsl(var(--gold)/0.32)] bg-gradient-to-br from-amber-950/30 via-background/85 to-rose-950/25 backdrop-blur-sm overflow-hidden"
      : "rounded-xl border border-[hsl(var(--gold)/0.28)] bg-gradient-to-br from-amber-950/25 via-background/75 to-rose-950/20 backdrop-blur-sm overflow-hidden";

  return (
    <section
      ref={containerRef}
      className="relative"
      aria-label="실시간 황제들의 활동"
      style={{ contain: "layout paint" }}
    >
      <div className={wrap} style={{ height: totalH }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 border-b border-[hsl(var(--gold)/0.18)]"
          style={{ height: HEADER_PX }}
        >
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

        {/* Slot-machine list — fixed height, absolute rows */}
        <div
          className="relative"
          style={{
            height: listH,
            willChange: "transform",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        >
          {rows.map((r, idx) => (
            <SlotRow
              key={r.id}
              row={r}
              index={idx}
              rowPx={rowPx}
              variant={variant}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── Slot Row (absolute, transform-driven) ───────── */
function SlotRow({
  row,
  index,
  rowPx,
  variant,
  reduced,
}: {
  row: Row;
  index: number;
  rowPx: number;
  variant: "full" | "compact";
  reduced: boolean;
}) {
  const jackpot = row.action === "jackpot";
  const positive = row.action === "win" || row.action === "jackpot" || row.action === "deposit";

  // Newest row enters from -rowPx and slides into slot 0. Others step down.
  const target = index * rowPx;
  const initial = index === 0 ? -rowPx : (index - 1) * rowPx;

  return (
    <div
      className={`absolute inset-x-0 flex items-center gap-3 px-4 border-b border-border/25 ${
        jackpot
          ? "bg-gradient-to-r from-[hsl(var(--gold)/0.22)] via-[hsl(var(--gold)/0.08)] to-[hsl(var(--pink)/0.20)]"
          : ""
      }`}
      style={{
        height: rowPx,
        transform: `translate3d(0, ${reduced ? target : initial}px, 0)`,
        animation: reduced
          ? "none"
          : `slot-step-${index === 0 ? "in" : "shift"} 460ms cubic-bezier(0.2,0.7,0.2,1) forwards`,
        opacity: 0,
        willChange: "transform, opacity",
        // CSS vars so the keyframes can read the final Y per-row.
        // @ts-ignore
        "--slot-y": `${target}px`,
        boxShadow: jackpot
          ? "inset 0 0 32px hsl(var(--gold) / 0.32), inset 0 0 80px hsl(var(--pink) / 0.18)"
          : undefined,
      }}
    >
      {/* Jackpot triple-glow ring */}
      {jackpot && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-none"
            style={{
              background:
                "radial-gradient(120% 80% at 0% 50%, hsl(var(--gold)/0.18), transparent 60%), radial-gradient(120% 80% at 100% 50%, hsl(var(--pink)/0.20), transparent 60%)",
              animation: reduced ? "none" : "imperial-pulse 2.2s ease-in-out infinite",
            }}
          />
          <ImperialSeal className="absolute -right-2 -top-2 w-12 h-12 opacity-70 pointer-events-none" />
        </>
      )}

      <span
        className={`relative inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
          jackpot
            ? "bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_0_18px_hsl(var(--gold)/0.85),0_0_36px_hsl(var(--pink)/0.55)]"
            : positive
            ? "bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))] border border-[hsl(var(--gold)/0.32)]"
            : "bg-muted/40 text-muted-foreground"
        }`}
      >
        <ActionIcon a={row.action} />
      </span>

      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-1.5 ${variant === "full" ? "text-[13px]" : "text-[12px]"} leading-tight`}>
          <span className="font-bold text-foreground truncate">{row.nick}</span>
          <span className="text-muted-foreground">님이</span>
          {row.game && <span className="text-foreground/80 truncate">{row.game}에서</span>}
          <span className={positive ? "text-emerald-400" : "text-muted-foreground"}>
            {actionLabel(row.action)}
          </span>
        </div>
        {jackpot && (
          <div className="text-[9px] tracking-[0.3em] font-black text-[hsl(var(--gold))] mt-0.5 drop-shadow-[0_0_10px_hsl(var(--gold)/0.7)]">
            ★ BIG WIN · IMPERIAL JACKPOT ★
          </div>
        )}
      </div>

      <div
        className={`relative shrink-0 text-right font-mono font-black tabular-nums ${
          jackpot
            ? "text-[hsl(var(--gold))] text-base drop-shadow-[0_0_12px_hsl(var(--gold)/0.75)]"
            : positive
            ? "text-emerald-300 text-[13px]"
            : "text-foreground text-[13px]"
        }`}
      >
        {formatAmount(row.currency, row.amount)}
      </div>

      {jackpot && (
        <span className="relative ml-1 px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_2px_14px_hsl(var(--pink)/0.65)]">
          <Sparkles className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5" />
          BIG WIN
        </span>
      )}

      <style>{`
        @keyframes slot-step-in {
          0%   { transform: translate3d(0, calc(var(--slot-y) - ${rowPx}px), 0); opacity: 0; }
          60%  { opacity: 1; }
          100% { transform: translate3d(0, var(--slot-y), 0); opacity: 1; }
        }
        @keyframes slot-step-shift {
          0%   { transform: translate3d(0, calc(var(--slot-y) - ${rowPx}px), 0); opacity: 1; }
          100% { transform: translate3d(0, var(--slot-y), 0); opacity: 1; }
        }
        @keyframes imperial-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
