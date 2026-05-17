import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Flame, ArrowDownToLine, Users, Radio, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useVisibleInterval } from "@/lib/util/visible-interval";
import { useOnline } from "@/components/LiveStats";
import { trackClick, useTrackView } from "@/lib/telemetry";

/**
 * v19 Slice 2 — Imperial Live Pulse Rail
 * 단일 라이브 카드: 로비 인원 + 출금 처리중 + 최근 24h 대형 활동(최대 2).
 * Warm Gold + Hot Pink Accent. money-flow / DB / 엣지 0 변경.
 */

type Strike = {
  kind: "crown" | "baron" | "withdraw";
  created_at: string;
  amount: number;
  label: string;
  nick: string;
};

type PayoutStats = {
  pending_count?: number;
  completed_count?: number;
  median_minutes?: number;
};

const KIND_META: Record<Strike["kind"], { Icon: React.ComponentType<{ className?: string }>; verb: string; tone: string }> = {
  crown:    { Icon: Crown,           verb: "Crown 폭발",  tone: "text-secondary" },
  baron:    { Icon: Flame,           verb: "Baron 등극",  tone: "text-primary" },
  withdraw: { Icon: ArrowDownToLine, verb: "출금 완료",   tone: "text-money-strong" },
};

const fmtKRW = (n: number) =>
  n >= 1_0000_0000 ? `₩${(n / 1_0000_0000).toFixed(2)}억`
  : n >= 1_0000 ? `₩${Math.round(n / 1_0000).toLocaleString("ko-KR")}만`
  : `₩${n.toLocaleString("ko-KR")}`;

export default function ImperialLivePulseRail() {
  const online = useOnline();
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [payouts, setPayouts] = useState<PayoutStats | null>(null);
  const navigate = useNavigate();
  const aliveRef = useRef(true);

  useTrackView("imperial_pulse_rail", "card");

  useEffect(() => () => { aliveRef.current = false; }, []);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        supabase.rpc("get_whale_strikes_24h", { _limit: 2 }),
        supabase.rpc("get_payout_ops_stats_24h"),
      ]);
      if (!aliveRef.current) return;
      if (!s.error && Array.isArray(s.data)) setStrikes(s.data as unknown as Strike[]);
      if (!p.error && p.data) setPayouts(p.data as unknown as PayoutStats);
    } catch { /* keep last */ }
  };

  useEffect(() => { void load(); }, []);
  useVisibleInterval(() => { void load(); }, 60_000, true, { catchUpOnVisible: true });

  const withdrawingNow = payouts?.pending_count ?? 0;

  const top2 = useMemo(() => strikes.slice(0, 2), [strikes]);

  function onCTA() {
    void trackClick("imperial_pulse_rail", "deposit_cta");
    navigate("/wallet?focus=deposit");
  }

  function onStrike(s: Strike) {
    void trackClick("imperial_pulse_rail", s.kind, { amount: s.amount });
    navigate(s.kind === "withdraw" ? "/wallet" : "/packages");
  }

  return (
    <section
      aria-label="Imperial Live Pulse"
      className="relative overflow-hidden rounded-2xl border border-secondary/30 bg-gradient-to-br from-amber-950/40 via-background to-stone-950/40 backdrop-blur-md shadow-[0_0_40px_-12px_hsl(var(--secondary)/0.35)]"
    >
      {/* shimmer accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/80 to-transparent" />

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative inline-flex">
              <span className="absolute inset-0 rounded-full bg-accent/70 animate-ping" />
              <span className="relative inline-block w-2 h-2 rounded-full bg-accent" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] tracking-[0.3em] font-bold text-secondary/80 uppercase">Imperial Live Pulse</div>
              <div className="font-imperial text-sm sm:text-base text-gradient-imperial tracking-[0.06em] truncate">
                폐하, 지금 제국이 이렇게 돌아가고 있습니다
              </div>
            </div>
          </div>
          <Radio className="w-4 h-4 text-secondary/60 shrink-0" />
        </div>

        {/* 3 metrics */}
        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={<Users className="w-3.5 h-3.5" />}
            label="로비 황제"
            value={online != null ? online.toLocaleString("ko-KR") : "—"}
            suffix="명"
          />
          <Metric
            icon={<ArrowDownToLine className="w-3.5 h-3.5" />}
            label="출금 처리 중"
            value={withdrawingNow.toLocaleString("ko-KR")}
            suffix="건"
            accent
          />
          <Metric
            icon={<Crown className="w-3.5 h-3.5" />}
            label="24h 대형 활동"
            value={strikes.length.toLocaleString("ko-KR")}
            suffix="건"
          />
        </div>

        {/* Top 2 strikes */}
        {top2.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {top2.map((s, i) => {
              const m = KIND_META[s.kind];
              return (
                <motion.li
                  key={`${s.created_at}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <button
                    type="button"
                    onClick={() => onStrike(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/15 bg-card/40 hover:bg-card/70 hover:border-primary/40 transition text-left min-h-[40px]"
                  >
                    <m.Icon className={`w-3.5 h-3.5 shrink-0 ${m.tone}`} />
                    <span className="text-[11px] text-muted-foreground shrink-0">{m.verb}</span>
                    <span className="text-[11px] font-medium truncate flex-1">{s.nick}</span>
                    <span className={`text-[11px] font-mono font-bold shrink-0 ${m.tone}`}>{fmtKRW(s.amount)}</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}

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

function Metric({
  icon, label, value, suffix, accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border ${accent ? "border-accent/40 bg-accent/5" : "border-primary/15 bg-card/40"} px-2 py-2.5 flex flex-col items-center text-center`}>
      <div className={`flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] ${accent ? "text-accent" : "text-muted-foreground"}`}>
        {icon}<span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 font-mono font-black text-base sm:text-lg leading-none ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
        {suffix && <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}
