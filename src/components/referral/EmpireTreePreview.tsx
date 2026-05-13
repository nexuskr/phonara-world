import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedCounter, SimBadge } from "@/components/guide/EmpireFX";

/**
 * /referral 상단에 들어가는 추천 트리 미니 시각화.
 * 백엔드 0변경 — 기존 referrals 테이블 + get_referral_stats RPC 활용.
 */
type Stats = { invited?: number; active_7d?: number; total_commission?: number; today_commission?: number };

export default function EmpireTreePreview() {
  const reduce = useReducedMotion();
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.rpc("get_referral_stats");
      if (alive && data) setStats(data as Stats);
    })();
    return () => { alive = false; };
  }, []);

  const invited = stats.invited ?? 0;
  const today = stats.today_commission ?? 0;
  const total = stats.total_commission ?? 0;

  // 노드 수: 실제 추천 수에 맞춰 1~6개 표시
  const visibleNodes = Math.min(6, Math.max(0, invited));
  const positions = [
    { x: 50, y: 95 }, { x: 110, y: 95 }, { x: 170, y: 95 },
    { x: 230, y: 95 }, { x: 80, y: 150 }, { x: 200, y: 150 },
  ];

  return (
    <section className="glass-strong rounded-2xl border border-gold/40 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.3em] text-gold">
          <Network className="w-3 h-3" /> 내 추천 제국
        </div>
        <SimBadge />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass rounded-xl border border-gold/20 p-3 text-center">
          <div className="text-[10px] tracking-widest text-muted-foreground mb-0.5">초대한 사람</div>
          <div className="font-imperial text-2xl text-gradient-gold tabular-nums">{invited.toLocaleString()}명</div>
        </div>
        <div className="glass rounded-xl border border-gold/20 p-3 text-center">
          <div className="text-[10px] tracking-widest text-muted-foreground mb-0.5">오늘 수당</div>
          <div className="font-imperial text-2xl text-gradient-gold">
            +₩<AnimatedCounter to={Math.max(0, Math.round(today))} duration={1.6} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gold/20 bg-background/40 p-2">
        <svg viewBox="0 0 280 180" className="w-full h-44">
          {/* center node = 나 */}
          <g transform="translate(140, 30)">
            {!reduce && (
              <motion.circle r="22" fill="none" stroke="hsl(var(--gold))" strokeWidth="1.5" opacity="0.5"
                animate={{ r: [20, 28, 20], opacity: [0.6, 0.1, 0.6] }}
                transition={{ duration: 2.4, repeat: Infinity }} />
            )}
            <circle r="18" fill="hsl(var(--gold))" />
            <text textAnchor="middle" y="4" fontSize="10" fontWeight="900" fill="hsl(var(--gold-foreground))">나</text>
          </g>

          {/* descendants */}
          {positions.slice(0, Math.max(visibleNodes, 3)).map((p, i) => {
            const active = i < visibleNodes;
            return (
              <g key={i}>
                <line x1={140} y1={30} x2={p.x} y2={p.y} stroke={active ? "hsl(var(--gold)/0.5)" : "hsl(var(--muted-foreground)/0.25)"} strokeWidth="1.5" strokeDasharray={active ? "0" : "3 3"} />
                {!reduce && active && (
                  <motion.circle r={3} cx={140} cy={30} fill="hsl(var(--gold))"
                    style={{ filter: "drop-shadow(0 0 6px hsl(var(--gold)))" }}
                    initial={{ cx: 140, cy: 30, opacity: 0 }}
                    animate={{ cx: [140, p.x], cy: [30, p.y], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }} />
                )}
                <circle cx={p.x} cy={p.y} r="11" fill={active ? "hsl(var(--card))" : "hsl(var(--muted)/0.5)"} stroke={active ? "hsl(var(--gold)/0.7)" : "hsl(var(--muted-foreground)/0.3)"} strokeWidth="1.5" />
                <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="9" fill={active ? "hsl(var(--gold))" : "hsl(var(--muted-foreground))"}>
                  {active ? "👤" : "?"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mt-3 break-keep">
        누적 수당 <span className="text-gold font-bold">₩{Math.round(total).toLocaleString()}</span> · 추천 1명 = 평생 5% 분배
      </p>
    </section>
  );
}
