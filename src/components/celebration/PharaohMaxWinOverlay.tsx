// PharaohMaxWinOverlay — Golden ankh spin + hieroglyph storm + sarcophagus open + emerald particle rain on BaseMaxWinOverlay.
import { motion } from "framer-motion";
import BaseMaxWinOverlay from "@/components/celebration/BaseMaxWinOverlay";

/** Inline Ankh SVG — lucide-react에 없는 고대 이집트 심볼 */
function AnkhIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <path d="M12 2v20" />
      <path d="M12 6c2.5 0 4.5-1.5 4.5-3.5S14.5 0 12 0 7.5 1.5 7.5 3.5 9.5 6 12 6z" />
      <path d="M8 10c-3 2-5 5-5 9h18c0-4-2-7-5-9" />
    </svg>
  );
}


const STORM_GLYPHS = ["𓂀", "𓃭", "𓆣", "𓇳", "𓈖", "𓋹", "𓌂", "𓊝"];

function PharaohCinematic() {
  return (
    <>
      {/* Golden ankh spin — 중앙 대형 회전 */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ willChange: "transform, opacity" }}
        initial={{ opacity: 0, scale: 0.2, rotate: -90 }}
        animate={{ opacity: [0, 0.35, 0.25, 0.35], scale: [0.2, 1.6, 1.5, 1.55], rotate: 360 }}
        transition={{ duration: 2.8, ease: "easeOut" }}
        aria-hidden
      >
        <AnkhIcon
          className="text-amber-200"
          style={{
            width: "clamp(180px, 40vw, 360px)",
            height: "clamp(180px, 40vw, 360px)",
            filter: "drop-shadow(0 0 40px rgba(234,179,8,0.9)) drop-shadow(0 0 80px rgba(16,185,129,0.5))",
            opacity: 0.45,
          }}
        />
      </motion.div>

      {/* Sarcophagus open glow — 하단에서 위로 쓸어오는 샌드 그라디언트 */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 h-2/3"
        style={{
          background:
            "linear-gradient(0deg, rgba(234,179,8,0.55) 0%, rgba(16,185,129,0.25) 35%, rgba(0,0,0,0) 100%)",
          willChange: "transform, opacity",
        }}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: [0, 1, 0.75, 1] }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        aria-hidden
      />

      {/* Hieroglyph storm — 32개 부유 (아래→위) */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 32 }).map((_, i) => {
          const left = (i * 13 + 3) % 100;
          const delay = 0.35 + (i % 8) * 0.07;
          const dur = 2.2 + (i % 6) * 0.2;
          const glyph = STORM_GLYPHS[i % STORM_GLYPHS.length];
          const isGold = i % 3 === 0;
          const tint = isGold
            ? "rgba(234,179,8,0.92)"
            : "rgba(16,185,129,0.92)";
          return (
            <motion.span
              key={i}
              className="absolute text-xl sm:text-2xl select-none"
              style={{
                left: `${left}%`,
                bottom: "-8%",
                color: tint,
                textShadow: `0 0 14px ${tint}`,
                willChange: "transform, opacity",
              }}
              initial={{ y: 0, opacity: 0, rotate: 0 }}
              animate={{ y: "-110vh", opacity: [0, 1, 1, 0], rotate: isGold ? 720 : -360 }}
              transition={{ duration: dur, delay, ease: "easeOut" }}
            >
              {glyph}
            </motion.span>
          );
        })}
      </div>

      {/* Emerald particle rain — 세로 줄기 */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => {
          const left = (i * 17 + 5) % 100;
          const delay = 0.2 + (i % 6) * 0.12;
          const dur = 1.6 + (i % 4) * 0.15;
          return (
            <motion.div
              key={`rain-${i}`}
              className="absolute w-px"
              style={{
                left: `${left}%`,
                top: "-10%",
                height: "30%",
                background:
                  "linear-gradient(180deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.7) 50%, rgba(16,185,129,0) 100%)",
                willChange: "transform, opacity",
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: "130vh", opacity: [0, 0.8, 0.8, 0] }}
              transition={{ duration: dur, delay, ease: "easeIn" }}
            />
          );
        })}
      </div>
    </>
  );
}

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

export default function PharaohMaxWinOverlay({ triggerAt = 2500, durationMs = 3400 }: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      ariaLabel="Pharaoh's Vault Max Win"
      soundKeys={{ primary: "legendary_win", voice: "voice_pharaoh_vault" }}
      titleText="PHARAOH'S VAULT"
      titleDelayMs={550}
      icon={
        <AnkhIcon
          className="h-20 w-20 sm:h-28 sm:w-28 text-amber-200 mb-3"
          style={{
            filter:
              "drop-shadow(0 0 30px rgba(234,179,8,0.95)) drop-shadow(0 0 60px rgba(16,185,129,0.7))",
          }}
        />
      }
      cinematic={() => <PharaohCinematic />}
      palette={{
        backdrop:
          "radial-gradient(circle at 50% 65%, rgba(234,179,8,0.38) 0%, rgba(16,185,129,0.15) 35%, rgba(0,0,0,0.90) 100%)",
        flareLeft: "linear-gradient(90deg, rgba(234,179,8,0.7) 0%, rgba(234,179,8,0) 100%)",
        flareRight: "linear-gradient(270deg, rgba(16,185,129,0.7) 0%, rgba(16,185,129,0) 100%)",
        shockwave:
          "linear-gradient(0deg, rgba(234,179,8,0.85) 0%, rgba(16,185,129,0.45) 40%, rgba(0,0,0,0) 100%)",
        confettiColors: ["#eab308", "#10b981", "#f59e0b", "#6366f1", "#fef3c7", "#065f46"],
        titleGradientClass: "bg-gradient-to-b from-amber-200 via-amber-300 to-emerald-400",
        titleGlow: "drop-shadow(0 0 24px rgba(234,179,8,0.9))",
        multiplierTextClass: "text-amber-100",
        multiplierTextShadow: "0 0 14px rgba(234,179,8,0.85)",
        subTextClass: "text-emerald-200",
      }}
      confettiBursts={[
        { delay: 0, originY: 0.5, scalar: 1.5, spread: 140, startVelocity: 75, gravity: 0.9 },
        { delay: 400, originY: 0.88, scalar: 1.4, spread: 140, startVelocity: 75, gravity: 0.9 },
        { delay: 900, originY: 0.35, scalar: 1.3, spread: 130, startVelocity: 65 },
      ]}
    />
  );
}
