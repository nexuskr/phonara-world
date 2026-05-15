import { memo, useEffect, useMemo, useRef, useState } from "react";
import { SYMBOL_IMAGES, PREMIUM_INDICES } from "../symbolMap";

const CELL = 72; // px — actual rendered cell height (responsive via container)
const BUFFER = 8; // extra random symbols above the final 3 (mobile perf: was 18)

/**
 * Single reel column. Sequentially decelerates to target 3 symbols.
 *  - `target` array: [topRow, midRow, bottomRow] symbol indices
 *  - `spinning` true → reel keeps animating
 *  - `delayMs` start delay so reels stagger (left to right)
 *  - `durationMs` how long this reel spins until it locks onto `target`
 */
function ReelInner({
  target,
  spinning,
  delayMs = 0,
  durationMs = 900,
  highlightWin = false,
}: {
  target: [number, number, number];
  spinning: boolean;
  delayMs?: number;
  durationMs?: number;
  highlightWin?: boolean;
}) {
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

  // Spinning translation
  const transform = spinning
    ? `translateY(${finalY}px)`
    : `translateY(${finalY}px)`;

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-black/50 border border-amber-900/40"
      style={{ height: `${visibleHeight}px`, contain: "strict", contentVisibility: "auto" }}
    >
      <div
        key={seed}
        className="will-change-transform"
        style={{
          transform: spinning ? `translateY(0px)` : `translateY(${finalY}px)`,
          transition: spinning
            ? `none`
            : `transform ${durationMs}ms cubic-bezier(.18,.85,.30,1) ${delayMs}ms`,
        }}
      >
        {strip.map((sym, i) => {
          const isFinal = i >= strip.length - 3;
          const finalRow = i - (strip.length - 3); // 0..2 for the lock-in row
          const premium = PREMIUM_INDICES.has(sym);
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
                src={SYMBOL_IMAGES[sym]}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-[88%] h-[88%] object-contain"
              />
            </div>
          );
        })}
      </div>

      {/* spin streak overlay while reel is animating */}
      {spinning && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-amber-100/5 to-amber-100/0 animate-pulse" />
      )}
    </div>
  );
}

export default memo(ReelInner);
