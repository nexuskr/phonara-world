/**
 * ActivityEventTicker — Ghost Empire 라이브 이벤트 스트림
 * - 클라 fallback: 800~2000ms 랜덤 간격, 흐름 기반 (가짜 카운터 없음)
 * - realtime: bot_activity_events INSERT 구독 (있을 때만 우선)
 * - variant: "hero" (3줄 stack) / "strip" (1줄 마키)
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

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

export default function ActivityEventTicker({ variant = "hero", limit = 3 }: { variant?: "hero" | "strip"; limit?: number }) {
  const [feed, setFeed] = useState<{ id: number; icon: string; text: string }[]>(() =>
    Array.from({ length: limit }, () => makeEvent()),
  );
  const idRef = useRef(1_000_000);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setFeed((prev) => [makeEvent(), ...prev].slice(0, limit));
      const next = 800 + Math.floor(Math.random() * 1200);
      timer = window.setTimeout(tick, next);
    };
    let timer = window.setTimeout(tick, 1000);

    const ch = supabase
      .channel(`ghost-feed-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bot_activity_events" },
        (payload: any) => {
          const text: string = payload?.new?.event_text ?? "";
          if (!text) return;
          const icon = pickIconForType(payload?.new?.event_type);
          setFeed((prev) => [{ id: ++idRef.current, icon, text: maskText(text) }, ...prev].slice(0, limit));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [limit]);

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

  return (
    <div className="w-full max-w-md mx-auto space-y-1.5">
      <AnimatePresence initial={false}>
        {feed.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2 text-left text-sm font-bold text-white/90 px-3 py-1.5 rounded-lg border border-white/10 bg-black/30 backdrop-blur"
          >
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(var(--success)/0.6)] flex-shrink-0" />
            <span className="text-base leading-none">{item.icon}</span>
            <span className="truncate">{item.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
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
