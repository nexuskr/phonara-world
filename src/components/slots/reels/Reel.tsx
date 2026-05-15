import { memo, useEffect, useMemo, useRef, useState } from "react";
import { PREMIUM_INDICES, CARD_INDICES, SYMBOL_IMAGES } from "../symbolMap";
import { prefersReducedMotion } from "@/lib/haptics";

const CELL = 72; // px — actual rendered cell height (responsive via container)
// Mobile perf: smaller buffer = fewer DOM nodes + shorter strip = less paint.
// We further trim on low-power devices via deviceMemory/hardwareConcurrency hints.
function pickBuffer(): number {
  if (typeof navigator === "undefined") return 8;
  const dm = (navigator as any).deviceMemory ?? 4;
  const hc = navigator.hardwareConcurrency ?? 4;
  if (dm <= 2 || hc <= 2) return 5;
  if (dm <= 4) return 7;
  return 8;
}
const BUFFER = pickBuffer();

/**
 * Single reel column. Sequentially decelerates to target 3 symbols.
 *  - `target` array: [topRow, midRow, bottomRow] symbol indices
 *  - `spinning` true → reel keeps animating
 *  - `delayMs` start delay so reels stagger (left to right)
 *  - `durationMs` how long this reel spins until it locks onto `target`
 *  - `images` per-theme symbol pack (length 11). Falls back to default Olympus pack.
 *  - `cardFilter` CSS filter applied ONLY to card symbols (indices 0-4); premium art stays original.
 */
function ReelInner({
  target,
  spinning,
  delayMs = 0,
  durationMs = 900,
  highlightWin = false,
  images,
  cardFilter = "none",
  spinStreakClass,
}: {
  target: [number, number, number];
  spinning: boolean;
  delayMs?: number;
  durationMs?: number;
  highlightWin?: boolean;
  images?: string[];
  cardFilter?: string;
  spinStreakClass?: string;
}) {
  const pack = images && images.length === 11 ? images : SYMBOL_IMAGES;

  // Random buffer regenerated per spin
  const seedRef = useRef(0);
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    if (spinning) {
      seedRef.current += 1;
      setSeed(seedRef.current);
    }
  }, [spinning]);

  const buffer = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < BUFFER; i++) arr.push(Math.floor(Math.random() * 9));
    return arr;
  }, [seed]);

  // Strip is buffer (top) + target (bottom 3) so when fully scrolled the target is visible
  const strip = useMemo(() => [...buffer, ...target], [buffer, target]);

  const stripHeight = strip.length * CELL;
  const visibleHeight = 3 * CELL;
  const finalY = -(stripHeight - visibleHeight);

  const reduced = prefersReducedMotion();

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-black/50 border border-amber-900/40"
      style={{
        height: `${visibleHeight}px`,
        contain: "layout paint style",
        // Promote container to its own compositor layer to avoid repaints during spin.
        transform: "translateZ(0)",
      }}
    >
      <div
        key={seed}
        className={`will-change-transform ${spinning && !reduced ? "reel-spinning" : ""}`}
        style={{
          // translate3d forces GPU compositing on iOS Safari + Android Chrome.
          transform: spinning && !reduced ? undefined : `translate3d(0, ${finalY}px, 0)`,
          transition: spinning
            ? `none`
            : reduced
              ? `none`
              : `transform ${durationMs}ms cubic-bezier(.18,.85,.30,1) ${delayMs}ms`,
          ["--reel-final-y" as any]: `${finalY}px`,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden" as any,
        }}
      >
        {strip.map((sym, i) => {
          const isFinal = i >= strip.length - 3;
          const premium = PREMIUM_INDICES.has(sym);
          const isCard = CARD_INDICES.has(sym);
          return (
            <div
              key={i}
              className={`flex items-center justify-center ${
                !spinning && isFinal && highlightWin && premium
                  ? "drop-shadow-[0_0_14px_rgba(255,200,80,0.7)]"
                  : ""
              }`}
              style={{ height: `${CELL}px` }}
            >
              <img
                src={pack[sym]}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-[88%] h-[88%] object-contain"
                style={isCard && cardFilter !== "none" ? { filter: cardFilter } : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* spin streak overlay while reel is animating */}
      {spinning && (
        <div className={`${spinStreakClass ?? "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-amber-100/5 to-amber-100/0"} animate-pulse`} />
      )}
    </div>
  );
}

export default memo(ReelInner);
