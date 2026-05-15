// Procedural slot sound engine — Web Audio API only, zero asset bundle cost.
// Theme packs: olympus / wizard / dragon. Each ships 4 cues: spin, stop, win, bigwin.
// Engine is lazy-initialised on first user gesture (autoplay-policy safe) and
// respects a localStorage mute toggle (`phonara:slot_mute:v1`).

export type SoundPack = "olympus" | "wizard" | "dragon";
export type Cue = "spin" | "stop" | "win" | "bigwin";

const MUTE_KEY = "phonara:slot_mute:v1";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function isSlotMuted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

export function setSlotMuted(m: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
}

// Unlock the audio context on first gesture (required by mobile browsers).
export async function unlockSlotAudio() {
  const c = ensureCtx();
  if (c && c.state === "suspended") {
    try { await c.resume(); } catch { /* noop */ }
  }
}

type Note = { freq: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

function playNote(n: Note) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + (n.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = n.type ?? "sine";
  osc.frequency.setValueAtTime(n.freq, t0);
  const peak = (n.gain ?? 0.6);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
  osc.connect(g).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + n.dur + 0.02);
}

function playSweep(from: number, to: number, dur: number, type: OscillatorType = "sawtooth", gain = 0.18, delay = 0) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playNoise(dur: number, gain = 0.12, delay = 0, lowpass = 1200) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(masterGain);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// === Theme cue libraries =====================================================

const PACKS: Record<SoundPack, Record<Cue, () => void>> = {
  olympus: {
    spin: () => {
      // bright bell start + low rumble
      playNote({ freq: 880, dur: 0.18, type: "triangle", gain: 0.25 });
      playNote({ freq: 110, dur: 0.45, type: "sine", gain: 0.18, delay: 0.02 });
    },
    stop: () => {
      playNote({ freq: 220, dur: 0.08, type: "square", gain: 0.18 });
      playNoise(0.06, 0.06, 0.01, 800);
    },
    win: () => {
      // golden fanfare arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        playNote({ freq: f, dur: 0.22, type: "triangle", gain: 0.22, delay: i * 0.07 })
      );
    },
    bigwin: () => {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        playNote({ freq: f, dur: 0.35, type: "triangle", gain: 0.28, delay: i * 0.1 })
      );
      playSweep(120, 60, 0.8, "sawtooth", 0.16, 0.05); // thunder
    },
  },
  wizard: {
    spin: () => {
      // mystic charging whistle
      playSweep(220, 1100, 0.55, "sine", 0.22);
      playNote({ freq: 1500, dur: 0.12, type: "triangle", gain: 0.1, delay: 0.4 });
    },
    stop: () => {
      // rune click — high pitched tap
      playNote({ freq: 1800, dur: 0.05, type: "square", gain: 0.12 });
      playNote({ freq: 1200, dur: 0.06, type: "triangle", gain: 0.1, delay: 0.02 });
    },
    win: () => {
      // arcane arpeggio — minor key
      [587.33, 698.46, 880, 1174.66].forEach((f, i) =>
        playNote({ freq: f, dur: 0.2, type: "sine", gain: 0.2, delay: i * 0.06 })
      );
    },
    bigwin: () => {
      [587.33, 698.46, 880, 1174.66, 1396.91].forEach((f, i) =>
        playNote({ freq: f, dur: 0.35, type: "sine", gain: 0.26, delay: i * 0.09 })
      );
      // shimmer
      playSweep(2000, 4000, 0.6, "triangle", 0.1, 0.1);
      playSweep(2000, 4000, 0.6, "triangle", 0.08, 0.25);
    },
  },
  dragon: {
    spin: () => {
      // deep oriental drum + brass flourish
      playNote({ freq: 80, dur: 0.18, type: "sine", gain: 0.32 });
      playNote({ freq: 60, dur: 0.22, type: "sine", gain: 0.25, delay: 0.18 });
    },
    stop: () => {
      // gong-like clang
      playNote({ freq: 180, dur: 0.12, type: "square", gain: 0.18 });
      playNote({ freq: 240, dur: 0.18, type: "triangle", gain: 0.12, delay: 0.02 });
    },
    win: () => {
      // ornate brass triad
      [392, 493.88, 587.33].forEach((f, i) =>
        playNote({ freq: f, dur: 0.28, type: "sawtooth", gain: 0.18, delay: i * 0.08 })
      );
    },
    bigwin: () => {
      // imperial fanfare
      [392, 493.88, 587.33, 783.99].forEach((f, i) =>
        playNote({ freq: f, dur: 0.4, type: "sawtooth", gain: 0.22, delay: i * 0.1 })
      );
      playNote({ freq: 80, dur: 0.6, type: "sine", gain: 0.28, delay: 0.05 }); // taiko
      playNote({ freq: 60, dur: 0.6, type: "sine", gain: 0.28, delay: 0.4 });
    },
  },
};

export function playSlotCue(pack: SoundPack, cue: Cue) {
  if (isSlotMuted()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") {
    // try to resume but don't await — best effort
    c.resume().catch(() => {});
  }
  try {
    PACKS[pack]?.[cue]?.();
  } catch {
    /* swallow — never let audio crash gameplay */
  }
}
