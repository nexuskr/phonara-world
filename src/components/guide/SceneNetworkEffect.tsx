import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Network, Coins } from "lucide-react";
import { GoldNebulaBg, AnimatedCounter, SimBadge, senior } from "./EmpireFX";

/**
 * Phase 5 / 씬 — NETWORK EFFECT (추천 트리)
 * 백엔드 0변경. 시각 데모용 SIM 데이터.
 */
export function SceneNetworkEffect({ large = false, isLoggedIn = false }: { large?: boolean; isLoggedIn?: boolean }) {
  const reduce = useReducedMotion();

  // 트리 노드 좌표 (SVG 320x220)
  const nodes = [
    { id: "me", x: 160, y: 28, label: "나", big: true },
    { id: "a", x: 60, y: 110, label: "박○자 (60대)" },
    { id: "b", x: 160, y: 110, label: "정○호 (40대)" },
    { id: "c", x: 260, y: 110, label: "강○나 (20대)" },
    { id: "a1", x: 30, y: 190, label: "이○호" },
    { id: "a2", x: 95, y: 190, label: "최○수" },
    { id: "c1", x: 260, y: 190, label: "윤○아" },
  ];
  const edges = [["me","a"],["me","b"],["me","c"],["a","a1"],["a","a2"],["c","c1"]];
  const map = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <section data-large={large} className="snap-start snap-always min-h-[calc(100dvh-56px)] flex flex-col justify-center relative overflow-hidden px-5 py-12">
      <GoldNebulaBg tone="cyber" />
      <div className="relative max-w-md mx-auto w-full">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-secondary/50 text-[10px] font-black tracking-[0.3em] text-secondary mb-3">
            <Network className="w-3 h-3" /> 추천 제국 <SimBadge />
          </div>
          <h2 className={`font-imperial text-3xl sm:text-4xl break-keep leading-[1.15] ${senior.h2}`}>
            데려온 만큼<br />
            <span className="text-gradient-gold drop-shadow-[0_0_18px_hsl(var(--gold)/0.5)]">평생 수당이 흐릅니다</span>
          </h2>
        </div>

        {/* SVG Tree */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="glass-strong rounded-2xl border border-gold/30 p-3 mb-4"
        >
          <svg viewBox="0 0 320 220" className="w-full h-56">
            {/* edges */}
            {edges.map(([a, b], i) => {
              const A = map[a] ?? { x: 0, y: 0 };
              const B = map[b] ?? { x: 0, y: 0 };
              const ax = Number.isFinite(A.x) ? A.x : 0;
              const ay = Number.isFinite(A.y) ? A.y : 0;
              const bx = Number.isFinite(B.x) ? B.x : 0;
              const by = Number.isFinite(B.y) ? B.y : 0;
              return (
                <g key={`${a}-${b}`}>
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke="hsl(var(--gold)/0.4)" strokeWidth="1.5" />
                  {!reduce && (
                    <motion.circle
                      r={3}
                      cx={ax}
                      cy={ay}
                      fill="hsl(var(--gold))"
                      style={{ filter: "drop-shadow(0 0 6px hsl(var(--gold)))" }}
                      initial={{ cx: ax, cy: ay, opacity: 0 }}
                      animate={{
                        cx: [ax, bx],
                        cy: [ay, by],
                        opacity: [0, 1, 1, 0],
                      }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
                    />
                  )}
                </g>
              );
            })}
            {/* nodes */}
            {nodes.map((n) => (
              <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
                {n.big ? (
                  <>
                    {!reduce && (
                      <motion.circle r="22" fill="none" stroke="hsl(var(--gold))" strokeWidth="1.5" opacity="0.5"
                        animate={{ r: [20, 28, 20], opacity: [0.6, 0.1, 0.6] }}
                        transition={{ duration: 2.4, repeat: Infinity }} />
                    )}
                    <circle r="18" fill="hsl(var(--gold))" />
                    <text textAnchor="middle" y="4" fontSize="10" fontWeight="900" fill="hsl(var(--gold-foreground))">나</text>
                  </>
                ) : (
                  <>
                    <circle r="11" fill="hsl(var(--card))" stroke="hsl(var(--gold)/0.7)" strokeWidth="1.5" />
                    <text textAnchor="middle" y="3" fontSize="9" fill="hsl(var(--gold))">👤</text>
                  </>
                )}
                <text textAnchor="middle" y={n.big ? 38 : 26} fontSize="8" fill="hsl(var(--muted-foreground))">
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        </motion.div>

        {/* 라이브 수당 카운터 */}
        <div className="glass-strong rounded-2xl border border-gold/40 px-4 py-4 text-center mb-4">
          <div className="text-[10px] tracking-[0.3em] font-black text-gold/80 mb-1 flex items-center justify-center gap-1.5">
            <Coins className="w-3 h-3" /> 오늘 추천 수당 누적
          </div>
          <div className={`font-imperial text-3xl text-gradient-gold ${senior.h2}`}>
            +₩<AnimatedCounter to={84_320} duration={2} jitter={500} />
          </div>
          <div className={`text-[11px] text-muted-foreground mt-1 break-keep ${senior.body}`}>
            추천 1명당 평생 5% · 멤버 입금·승리마다 자동 분배
          </div>
        </div>

        <Link
          data-large={large}
          to={isLoggedIn ? "/referral" : "/secure-auth?next=/referral"}
          className={`press mt-2 w-full inline-flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-gradient-imperial text-gold-foreground font-display font-black glow-gold ${senior.btn}`}
        >
          <Network className="w-5 h-5" /> 내 추천 링크 받기 →
        </Link>
      </div>
    </section>
  );
}
