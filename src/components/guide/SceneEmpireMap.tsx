import { motion, useReducedMotion } from "framer-motion";
import { Flag, MapPin } from "lucide-react";
import { GoldNebulaBg, SimBadge, senior } from "./EmpireFX";

/**
 * Phase 5 / 씬 — EMPIRE MAP (한반도 길드 영토 점령)
 * 순수 SVG. 백엔드 0변경. 시각 데모.
 */
export function SceneEmpireMap({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();

  // 한반도 8개 지역 (rough polygon clusters)
  const regions = [
    { id: "seoul", label: "서울", cx: 120, cy: 95, r: 14, color: "hsl(var(--gold))", guild: "황금제국" },
    { id: "gyeonggi", label: "경기", cx: 130, cy: 120, r: 22, color: "hsl(var(--gold)/0.6)", guild: "황금제국" },
    { id: "gangwon", label: "강원", cx: 175, cy: 100, r: 24, color: "hsl(var(--accent))", guild: "흑룡기사단" },
    { id: "chungbuk", label: "충청", cx: 130, cy: 165, r: 26, color: "hsl(var(--secondary))", guild: "백호연합" },
    { id: "jeolla", label: "전라", cx: 115, cy: 220, r: 28, color: "hsl(var(--accent)/0.6)", guild: "흑룡기사단" },
    { id: "gyeongbuk", label: "경북", cx: 185, cy: 175, r: 28, color: "hsl(var(--gold)/0.8)", guild: "황금제국" },
    { id: "gyeongnam", label: "경남", cx: 175, cy: 230, r: 24, color: "hsl(var(--destructive)/0.5)", guild: "비어있음" },
    { id: "jeju", label: "제주", cx: 130, cy: 280, r: 12, color: "hsl(var(--muted))", guild: "비어있음" },
  ];

  return (
    <section data-large={large} className="snap-start snap-always min-h-[calc(100dvh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-12">
      <GoldNebulaBg tone="gold" />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-gold/50 text-[10px] font-black tracking-[0.3em] text-gold mb-3">
            <Flag className="w-3 h-3" /> 제국 영토 지도 <SimBadge />
          </div>
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            당신의 깃발을<br />
            <span className="text-gradient-gold drop-shadow-[0_0_18px_hsl(var(--gold)/0.5)]">대한민국 위에 꽂으세요</span>
          </h2>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-strong rounded-2xl border border-gold/30 p-3 mb-4"
        >
          <svg viewBox="0 0 260 320" className="w-full h-72">
            {/* nebula grid */}
            <defs>
              <radialGradient id="gloGold" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.55" />
                <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0" />
              </radialGradient>
            </defs>
            {regions.map((r, i) => (
              <g key={r.id}>
                <motion.circle
                  cx={r.cx} cy={r.cy} r={r.r}
                  fill={r.color}
                  opacity={0.55}
                  initial={reduce ? false : { scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 180 }}
                />
                {!reduce && (
                  <motion.circle
                    cx={r.cx} cy={r.cy} r={r.r}
                    fill="none"
                    stroke={r.color}
                    strokeWidth="1.5"
                    animate={{ r: [r.r, r.r + 6, r.r], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.18 }}
                  />
                )}
                <text x={r.cx} y={r.cy + 3} textAnchor="middle" fontSize="8" fontWeight="900" fill="hsl(var(--foreground))">
                  {r.label}
                </text>
              </g>
            ))}
          </svg>
        </motion.div>

        {/* 점령 현황 요약 */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          {[
            { name: "황금제국", count: 3, color: "text-gold border-gold/40" },
            { name: "흑룡기사단", count: 2, color: "text-accent border-accent/40" },
            { name: "비어있음", count: 2, color: "text-destructive border-destructive/40" },
          ].map((g) => (
            <div key={g.name} className={`glass rounded-xl border p-2 ${g.color}`}>
              <div className="text-[10px] font-black tracking-widest break-keep">{g.name}</div>
              <div className="font-imperial text-xl">{g.count}<span className="text-[9px] ml-0.5">영토</span></div>
            </div>
          ))}
        </div>

        <div className={`flex items-center gap-2 glass rounded-xl border border-gold/20 p-3 text-xs text-muted-foreground ${senior.body}`}>
          <MapPin className="w-4 h-4 text-gold shrink-0" />
          <span className="break-keep">길드 가입 → 영토 점령 → 시즌 종료 시 영토 비례 분배금</span>
        </div>
      </div>
    </section>
  );
}
