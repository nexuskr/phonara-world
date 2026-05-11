import { memo } from "react";
import { motion } from "framer-motion";
import type { ArmyState, Side } from "@/lib/trading/armyMapping";

/**
 * SVG + framer-motion 기반 2D 군대 렌더러.
 * - 두 진영: 아군(금색) / 적군(어둠)
 * - frontline 진행도에 따라 부대 위치 이동
 * - particle / shake / morale 시각화
 * - 모바일에서도 60fps 목표 (transform/opacity만 사용)
 */
type Props = { side: Side; state: ArmyState; height?: number };

const ALLY_COLOR = "hsl(var(--gold))";
const ENEMY_COLOR = "hsl(var(--destructive))";

function Soldier({ x, y, color, size = 4 }: { x: number; y: number; color: string; size?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={size} fill={color} />
      <rect x={-size * 0.4} y={size * 0.6} width={size * 0.8} height={size * 1.4} fill={color} opacity={0.85} />
    </g>
  );
}

function Formation({ x, y, color, count = 20, spread = 14 }: { x: number; y: number; color: string; count?: number; spread?: number }) {
  const rows = Math.ceil(Math.sqrt(count));
  const cols = Math.ceil(count / rows);
  const soldiers = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const sx = x + (c - cols / 2) * spread + (r % 2) * (spread / 2);
    const sy = y + (r - rows / 2) * spread * 0.9;
    soldiers.push(<Soldier key={i} x={sx} y={sy} color={color} />);
  }
  return <>{soldiers}</>;
}

function EmpireArmy2DInner({ side, state, height = 260 }: Props) {
  const isLong = side === "long";
  const frontX = 50 + state.frontline * 200; // 50~250
  const enemyX = 350 - state.frontline * 200; // 350~150
  const shakeAmp = state.shake * 3;
  const moraleOpacity = 0.4 + state.morale * 0.6;

  return (
    <svg viewBox="0 0 400 260" className="w-full" style={{ height }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="terrain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--background))" />
          <stop offset="60%" stopColor="hsl(var(--muted) / 0.3)" />
          <stop offset="100%" stopColor="hsl(var(--background))" />
        </linearGradient>
        <radialGradient id="warglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isLong ? ALLY_COLOR : ENEMY_COLOR} stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* battlefield */}
      <rect width="400" height="260" fill="url(#terrain)" />

      {/* horizon */}
      <line x1="0" y1="130" x2="400" y2="130" stroke="hsl(var(--border) / 0.4)" strokeDasharray="2 4" />

      {/* center war glow at frontline */}
      <motion.circle
        cx={(frontX + enemyX) / 2} cy={130} r={40 + state.particle * 30}
        fill="url(#warglow)"
        animate={{ opacity: 0.5 + state.particle * 0.5 }}
        transition={{ duration: 0.3 }}
      />

      {/* ally banner */}
      <motion.g
        animate={{ x: 0, y: 0 }}
        style={{ originX: 0.5, originY: 0.5 }}
        transition={{ type: "spring", stiffness: 80, damping: 14 }}
      >
        <motion.g
          animate={{ x: [0, shakeAmp, -shakeAmp, 0] }}
          transition={{ duration: 0.4, repeat: state.shake > 0.3 ? Infinity : 0 }}
          opacity={moraleOpacity}
        >
          {/* ally formation - moves toward front */}
          <motion.g
            initial={false}
            animate={{ x: frontX - 100 }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          >
            <Formation x={100} y={120} color={ALLY_COLOR} count={28} spread={11} />
            {/* commander */}
            <g transform="translate(100 90)">
              <polygon points="0,-12 4,-2 12,0 4,2 0,12 -4,2 -12,0 -4,-2"
                       fill={ALLY_COLOR} opacity={0.9} />
            </g>
          </motion.g>

          {/* enemy formation - retreats as ally advances */}
          <motion.g
            initial={false}
            animate={{ x: enemyX - 300 }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          >
            <Formation x={300} y={140} color={ENEMY_COLOR} count={22} spread={11} />
            <g transform="translate(300 110)">
              <polygon points="0,-10 3,-2 10,0 3,2 0,10 -3,2 -10,0 -3,-2"
                       fill={ENEMY_COLOR} opacity={0.85} />
            </g>
          </motion.g>
        </motion.g>
      </motion.g>

      {/* particles (impacts) */}
      {state.particle > 0.1 && Array.from({ length: Math.min(8, Math.ceil(state.particle * 10)) }).map((_, i) => (
        <motion.circle
          key={i}
          cx={(frontX + enemyX) / 2 + (Math.random() - 0.5) * 50}
          cy={130 + (Math.random() - 0.5) * 30}
          r={1 + Math.random() * 2}
          fill={i % 2 === 0 ? ALLY_COLOR : ENEMY_COLOR}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.07 }}
        />
      ))}

      {/* status banner */}
      {state.status === "victory" && (
        <motion.text
          x={200} y={45} textAnchor="middle"
          fill={ALLY_COLOR} fontSize="20" fontWeight="900" letterSpacing="2"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 45 }}
        >
          ⚔️ {isLong ? "CONQUEST" : "RAID"} 승리
        </motion.text>
      )}
      {state.status === "defeat" && (
        <motion.text
          x={200} y={45} textAnchor="middle"
          fill={ENEMY_COLOR} fontSize="18" fontWeight="900"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          💀 제국 함락
        </motion.text>
      )}
      {state.status === "near_miss" && (
        <motion.text
          x={200} y={45} textAnchor="middle"
          fill="hsl(var(--gold))" fontSize="14" fontWeight="900"
          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}
        >
          ⚠️ 적장 도주 중
        </motion.text>
      )}
    </svg>
  );
}

export default memo(EmpireArmy2DInner);
