// PR-11: Empire Crown Aura — Empire Level별 시각적 아우라(아바타 둘레 광채).
// 1~6: 정적 그라디언트 링. 7(Baron)+: 회전 광채 + 펄스. 10(Emperor): 마그마 + 별빛.
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useDocumentVisible } from "@/lib/util/visible-interval";

type Props = {
  level: number;
  size?: number;          // 내부 콘텐츠(예: 아바타) 한 변
  className?: string;
  children?: ReactNode;
};

const TIER_GRADIENT: Record<number, string> = {
  1:  "from-zinc-500 via-zinc-400 to-zinc-600",
  2:  "from-emerald-500 via-emerald-400 to-teal-600",
  3:  "from-sky-500 via-cyan-400 to-blue-600",
  4:  "from-indigo-500 via-blue-400 to-violet-600",
  5:  "from-violet-500 via-fuchsia-400 to-purple-600",
  6:  "from-amber-500 via-yellow-400 to-orange-500",
  7:  "from-rose-500 via-pink-500 to-fuchsia-500",
  8:  "from-fuchsia-500 via-purple-500 to-rose-500",
  9:  "from-cyan-300 via-sky-500 to-indigo-500",
  10: "from-amber-300 via-rose-500 to-violet-600",
};

const GLOW_RGBA: Record<number, string> = {
  1: "0,0,0,0.10",
  2: "16,185,129,0.30",
  3: "14,165,233,0.30",
  4: "99,102,241,0.35",
  5: "168,85,247,0.40",
  6: "245,158,11,0.45",
  7: "236,72,153,0.55",
  8: "217,70,239,0.60",
  9: "56,189,248,0.60",
  10:"251,191,36,0.75",
};

/**
 * 아바타/엠블럼 둘레에 Empire Level 기반 아우라를 입힌다.
 * 자식이 없으면 단독 원형 엠블럼으로 렌더된다.
 */
export default function CrownAura({ level, size = 48, className = "", children }: Props) {
  const lv = Math.max(1, Math.min(10, Math.round(level || 1)));
  const grad = TIER_GRADIENT[lv];
  const glow = GLOW_RGBA[lv];
  const isBaronPlus = lv >= 7;
  const isEmperor = lv >= 10;
  const ringPad = lv >= 8 ? 4 : lv >= 5 ? 3 : 2;
  const outer = size + ringPad * 2;
  // Pause expensive corona/pulse animations while tab is hidden — saves GPU.
  const tabVisible = useDocumentVisible();

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: outer, height: outer }}
      aria-label={`Empire Level ${lv} aura`}
    >
      {/* 베이스 링 (그라디언트) */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-tr ${grad}`}
        style={{ boxShadow: `0 0 ${10 + lv * 2}px rgba(${glow})` }}
      />
      {/* Baron+ : 회전 코로나 */}
      {isBaronPlus && (
        <motion.div
          className="absolute inset-[-2px] rounded-full pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, rgba(${glow}) 25%, transparent 50%, rgba(${glow}) 75%, transparent 100%)`,
            filter: "blur(4px)",
          }}
          animate={tabVisible ? { rotate: 360 } : false}
          transition={{ duration: 8, ease: "linear", repeat: Infinity }}
        />
      )}
      {/* Emperor: 외곽 펄스 별빛 */}
      {isEmperor && (
        <motion.div
          className="absolute inset-[-6px] rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 28px 6px rgba(${glow})` }}
          animate={tabVisible ? { opacity: [0.4, 1, 0.4], scale: [1, 1.06, 1] } : false}
          transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        />
      )}
      {/* 콘텐츠 슬롯 — 아바타가 들어가는 동심원 마스크 */}
      <div
        className="absolute rounded-full overflow-hidden bg-background flex items-center justify-center"
        style={{ inset: ringPad, width: size, height: size }}
      >
        {children ?? <span className="text-2xl select-none">👑</span>}
      </div>
    </div>
  );
}
