import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Flame, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SimChip } from "@/components/sim/SimChip";

type Pulse = {
  live_users: number;
  active_now: number;
  today_withdrawals: number;
  region_pulses: Record<string, number>;
  updated_at: string;
};

const TRUMP_LINES = [
  "지금 합류 못 하면 진짜 후회합니다",
  "Founding Seat 999 — 곧 매진됩니다",
  "이미 수십만 명이 제국을 건설 중",
  "황제권은 절대 다시 풀리지 않습니다",
  "오늘 안 들어오면 내일은 더 비쌉니다",
];

function fmtKRW(n: number) {
  if (n >= 1_0000_0000) return `₩${(n / 1_0000_0000).toFixed(1)}억`;
  if (n >= 1_0000) return `₩${Math.round(n / 1_0000).toLocaleString("ko-KR")}만`;
  return `₩${n.toLocaleString("ko-KR")}`;
}

export default function LiveCounterStrip() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const displayedRef = useRef<{ users: number; wd: number }>({ users: 0, wd: 0 });
  const [users, setUsers] = useState(0);
  const [wd, setWd] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval>;
    async function fetchOnce() {
      const { data } = await supabase.rpc("get_ghost_pulse");
      if (!alive || !data) return;
      const p = data as unknown as Pulse;
      setPulse(p);
      // Snap-up first time, then RAF interpolate handles the rest.
      if (displayedRef.current.users === 0) {
        displayedRef.current = { users: p.live_users, wd: p.today_withdrawals };
        setUsers(p.live_users);
        setWd(p.today_withdrawals);
      }
    }
    fetchOnce();
    timer = setInterval(() => {
      if (!document.hidden) fetchOnce();
    }, 2000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  // RAF interp toward target
  useEffect(() => {
    let raf = 0;
    function tick() {
      if (pulse) {
        const cur = displayedRef.current;
        const eu = pulse.live_users - cur.users;
        const ew = pulse.today_withdrawals - cur.wd;
        if (Math.abs(eu) > 0.5 || Math.abs(ew) > 0.5) {
          cur.users += eu * 0.06;
          cur.wd += ew * 0.06;
          setUsers(Math.round(cur.users));
          setWd(Math.round(cur.wd));
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pulse]);

  // Rotate hype line every 4s
  useEffect(() => {
    const t = setInterval(() => setLineIdx((i) => (i + 1) % TRUMP_LINES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-sim-gold/40 bg-gradient-to-r from-amber-950/40 via-background/60 to-amber-950/40 backdrop-blur-md px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <SimChip />
        <div className="flex items-center gap-2 min-w-0">
          <Crown className="w-4 h-4 text-sim-gold animate-pulse" />
          <span className="font-black tabular-nums text-foreground text-base sm:text-lg">
            {users.toLocaleString("ko-KR")}
          </span>
          <span className="text-muted-foreground text-xs">명이 제국 건설 중</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Flame className="w-4 h-4 text-emerald-400" />
          <span className="font-black tabular-nums text-emerald-300">{fmtKRW(wd)}</span>
          <span className="text-muted-foreground text-xs">오늘 출금</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-sky-400" />
          <span className="font-bold tabular-nums text-sky-200">
            {pulse?.active_now.toLocaleString("ko-KR") ?? "—"}
          </span>
          <span className="text-muted-foreground text-xs">지금 활성</span>
        </div>
        <div className="ml-auto h-5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={lineIdx}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="block text-[11px] sm:text-xs font-bold tracking-wider uppercase text-sim-gold"
            >
              ⚡ {TRUMP_LINES[lineIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
