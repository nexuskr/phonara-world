/**
 * ActivityEventTicker — Ghost Empire 라이브 이벤트 스트림
 * - 클라 fallback: 800~2000ms 랜덤 간격, 흐름 기반 (가짜 카운터 없음)
 * - realtime: bot_activity_events INSERT 구독 (있을 때만 우선)
 * - variant: "hero" (3줄 stack) / "strip" (1줄 마키)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSettings, tickerIntervalFor } from "@/lib/app-settings";
import { useGameChannel } from "@pkg/realtime";

const NAMES = ["K***", "J***", "S***", "P***", "L***", "M***", "H***", "C***", "Y***", "B***", "T***", "R***", "D***", "N***", "W***"];
const TEMPLATES: Array<(n: string) => { icon: string; text: string }> = [
  (n) => ({ icon: "🔥", text: `${n} +${(Math.floor(Math.random() * 30) + 5) * 1000}원 수익 발생` }),
  (n) => ({ icon: "⚡", text: `${n} ${Math.floor(Math.random() * 6) + 3}연승 기록 갱신` }),
  (n) => ({ icon: "💥", text: `${n} 대형 베팅 성공` }),
  (n) => ({ icon: "👑", text: `${n} 신규 황제 입성` }),
  (n) => ({ icon: "🚀", text: `${n} LONG 적중 +${(Math.floor(Math.random() * 50) + 10) * 1000}원` }),
  (n) => ({ icon: "🚀", text: `${n} SHORT 적중 +${(Math.floor(Math.random() * 50) + 10) * 1000}원` }),
  (n) => ({ icon: "💸", text: `${n} ${(Math.floor(Math.random() * 400) + 50) * 10000}원 출금 완료` }),
  (n) => ({ icon: "🌌", text: `${n} Crown 폭발` }),
];

function makeEvent(): { id: number; icon: string; text: string } {
  const n = NAMES[Math.floor(Math.random() * NAMES.length)];
  const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)](n);
  return { id: Date.now() + Math.floor(Math.random() * 1000), ...t };
}

/**
 * intervalMs:
 *  - undefined → use user "tickerSpeed" setting (default normal)
 *  - number    → fixed delay
 *  - [min,max] → random delay in window
 *  - "off"     → no client-side fallback ticks (realtime only)
 */
export type TickerInterval = number | [number, number] | "off" | undefined;

export default function ActivityEventTicker({
  variant = "hero",
  limit = 3,
  intervalMs,
  realtime = true,
}: {
  variant?: "hero" | "strip";
  limit?: number;
  intervalMs?: TickerInterval;
  realtime?: boolean;
}) {
  const [settings] = useAppSettings();
  const [feed, setFeed] = useState<{ id: number; icon: string; text: string }[]>(() =>
    Array.from({ length: limit }, () => makeEvent()),
  );
  const idRef = useRef(1_000_000);

  // Client-side fallback ticker (visibility-aware, unchanged behavior).
  useEffect(() => {
    let cancelled = false;
    let window_: [number, number] | null;
    if (intervalMs === "off") window_ = null;
    else if (typeof intervalMs === "number") window_ = [intervalMs, intervalMs];
    else if (Array.isArray(intervalMs)) window_ = intervalMs;
    else window_ = tickerIntervalFor(settings.tickerSpeed);

    let timer = 0;
    const tick = () => {
      if (cancelled || !window_) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = window.setTimeout(tick, 2000);
        return;
      }
      setFeed((prev) => [makeEvent(), ...prev].slice(0, limit));
      const span = Math.max(0, window_[1] - window_[0]);
      const next = window_[0] + Math.floor(Math.random() * (span + 1));
      timer = window.setTimeout(tick, next);
    };
    if (window_) timer = window.setTimeout(tick, window_[0]);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [limit, intervalMs, settings.tickerSpeed]);

  // Realtime via unified channel — single shared subscription across all mounts
  // (replaces previous per-mount `supabase.channel(`ghost-feed-${random}`)` which
  // leaked a fresh channel every remount and violated the "no direct supabase.channel"
  // project core rule).
  const onInsert = useCallback(
    (payload: any) => {
      const text: string = payload?.new?.event_text ?? "";
      if (!text) return;
      const icon = pickIconForType(payload?.new?.event_type);
      setFeed((prev) => [{ id: ++idRef.current, icon, text: maskText(text) }, ...prev].slice(0, limit));
    },
    [limit],
  );

  useGameChannel({
    key: "bot_activity_events",
    bindings: [{ event: "INSERT", schema: "public", table: "bot_activity_events" }],
    onEvent: onInsert,
    enabled: realtime,
  });

  if (variant === "strip") {
    return (
      <div className="relative w-full overflow-hidden rounded-full border border-gold/25 bg-black/30 backdrop-blur px-3 py-1.5">
        <AnimatePresence mode="wait">
          <motion.div
            key={feed[0]?.id}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2 text-xs font-bold text-white/90 truncate"
          >
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(var(--success)/0.6)]" />
            <span>{feed[0]?.icon}</span>
            <span className="truncate">{feed[0]?.text}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // 고정 높이 슬롯 — 항목 추가/제거에도 컨테이너 크기 불변 (위아래 밀림 방지)
  const ROW_H = 36; // px (py-1.5 + text)
  const GAP = 6;
  const containerH = ROW_H * limit + GAP * Math.max(0, limit - 1);

  return (
    <div
      className="relative w-full max-w-md mx-auto overflow-hidden"
      style={{ height: containerH, minHeight: containerH }}
    >
      <div className="absolute inset-0 flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {feed.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-left text-sm font-bold text-white/90 px-3 rounded-lg border border-white/10 bg-black/30 backdrop-blur"
              style={{ height: ROW_H, flex: "0 0 auto" }}
            >
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(var(--success)/0.6)] flex-shrink-0" />
              <span className="text-base leading-none">{item.icon}</span>
              <span className="truncate">{item.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function pickIconForType(t?: string): string {
  switch (t) {
    case "withdrawal": return "💸";
    case "package_purchase": return "👑";
    case "jackpot_contrib": return "🌌";
    case "paper_win": return "🚀";
    case "mission_clear": return "🔥";
    case "recovery": return "⚡";
    case "new_signup": return "👑";
    default: return "🔥";
  }
}

function maskText(text: string): string {
  return text.replace(/([가-힣A-Za-z]{1,2})[가-힣A-Za-z0-9_-]{2,}님/g, "$1***님");
}
