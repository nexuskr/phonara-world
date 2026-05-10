import confetti from "canvas-confetti";

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (AC) audioCtx = new AC();
    } catch { audioCtx = null; }
  }
  return audioCtx;
}

function tone(freq: number, duration = 0.18, type: OscillatorType = "sine", gain = 0.08) {
  const ac = ctx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ac.currentTime);
    g.gain.linearRampToValueAtTime(gain, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {}
}

export function playWinChime(big = false) {
  tone(880, 0.12, "triangle", 0.08);
  setTimeout(() => tone(1318.5, 0.14, "triangle", 0.08), 90);
  if (big) setTimeout(() => tone(1760, 0.22, "triangle", 0.1), 200);
}

export function playLossThud() {
  tone(180, 0.22, "sawtooth", 0.05);
  setTimeout(() => tone(120, 0.3, "sawtooth", 0.04), 110);
}

const GOLD = ["#FFD96B", "#F5C547", "#E0A82E", "#FFE9A8", "#FFFFFF"];

export function celebrateWin(level: "small" | "big" | "huge" = "small") {
  const burst = (opts: confetti.Options) => {
    try { confetti({ colors: GOLD, ...opts }); } catch {}
  };
  if (level === "small") {
    burst({ particleCount: 60, spread: 65, startVelocity: 35, origin: { y: 0.7 } });
  } else if (level === "big") {
    burst({ particleCount: 140, spread: 90, startVelocity: 45, origin: { y: 0.65 } });
    setTimeout(() => burst({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 150);
    setTimeout(() => burst({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 250);
  } else {
    // huge
    const end = Date.now() + 1400;
    (function frame() {
      burst({ particleCount: 8, angle: 60, spread: 75, startVelocity: 55, origin: { x: 0, y: 0.7 } });
      burst({ particleCount: 8, angle: 120, spread: 75, startVelocity: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    setTimeout(() => burst({ particleCount: 220, spread: 160, startVelocity: 60, origin: { y: 0.5 } }), 300);
  }
  playWinChime(level !== "small");
}

export function levelFromPnl(pnl: number, unit: "USDT" | "KRW" = "USDT"): "small" | "big" | "huge" {
  // KRW thresholds use ~1400 KRW/USDT reference so visual tiers match across modes.
  const huge = unit === "KRW" ? 700_000 : 500;
  const big = unit === "KRW" ? 140_000 : 100;
  if (pnl >= huge) return "huge";
  if (pnl >= big) return "big";
  return "small";
}
