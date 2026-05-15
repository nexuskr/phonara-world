// Procedural slot sound engine — Web Audio API only, zero asset bundle cost.
// Pragmatic / Stake 레벨 풀-사양 cue 세트 + per-theme palette + BGM 루프.
// 자산이 0개여도 7종 슬롯이 즉시 풍부하게 들리도록 설계.

export type SoundPack =
  | "olympus" | "wizard" | "dragon" | "cosmic"
  | "neon" | "pirate" | "pharaoh" | "viking" | "aztec" | "sakura";

export type Cue =
  | "spin" | "spin_fast" | "stop"
  | "anticipation" | "scatter" | "bonus_trigger"
  | "win_small" | "win_big" | "win_huge" | "win_mega" | "win_epic"
  | "vo_bigwin" | "vo_megawin" | "vo_epic"
  // 레거시 별칭 (기존 호출부 호환)
  | "win" | "bigwin";

const MUTE_KEY = "phonara:slot_mute:v1";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmGain: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.45;
    masterGain.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.0;
    bgmGain.connect(masterGain);
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
  if (m) stopProcBGM(0.2);
}
export async function unlockSlotAudio() {
  const c = ensureCtx();
  if (c && c.state === "suspended") {
    try { await c.resume(); } catch { /* noop */ }
  }
}

// ============================================================================
// Low-level synth primitives
// ============================================================================

type Note = { freq: number; dur: number; type?: OscillatorType; gain?: number; delay?: number; attack?: number };

function playNote(n: Note, dest?: AudioNode) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const out = dest ?? masterGain;
  const t0 = c.currentTime + (n.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = n.type ?? "sine";
  osc.frequency.setValueAtTime(n.freq, t0);
  const peak = n.gain ?? 0.6;
  const atk = n.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + n.dur + 0.02);
}

function playSweep(from: number, to: number, dur: number, type: OscillatorType = "sawtooth", gain = 0.18, delay = 0, dest?: AudioNode) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const out = dest ?? masterGain;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function playNoise(dur: number, gain = 0.12, delay = 0, lowpass = 1200, dest?: AudioNode) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const out = dest ?? masterGain;
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
  src.connect(filter).connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ============================================================================
// Per-theme palette — tonic + scale + waveforms + character
// ============================================================================

type Palette = {
  tonic: number;              // base frequency
  scale: number[];            // semitone offsets defining the mode
  lead: OscillatorType;
  pad: OscillatorType;
  bass: OscillatorType;
  bassMul: number;            // tonic ratio for sub-bass (e.g., 0.5 = octave below)
  noiseLP: number;            // lowpass for noise impacts
  bpm: number;                // BGM tempo
  shimmer?: boolean;          // add high triangle shimmer
  drum?: "taiko" | "kick" | "tom" | null;
};

const semitone = (root: number, n: number) => root * Math.pow(2, n / 12);

const PALETTES: Record<SoundPack, Palette> = {
  // C-based major triad — heroic Greek
  olympus: { tonic: 261.63, scale: [0, 4, 7, 12, 16, 19], lead: "triangle", pad: "sine", bass: "sine", bassMul: 0.25, noiseLP: 800, bpm: 96, drum: "kick" },
  // D Lydian — mystical
  wizard:  { tonic: 293.66, scale: [0, 2, 6, 7, 11, 14], lead: "sine", pad: "triangle", bass: "sine", bassMul: 0.5, noiseLP: 2000, bpm: 88, shimmer: true },
  // E pentatonic minor — oriental dragon
  dragon:  { tonic: 164.81, scale: [0, 3, 5, 7, 10, 12], lead: "sawtooth", pad: "sine", bass: "sine", bassMul: 0.25, noiseLP: 600, bpm: 110, drum: "taiko" },
  // C whole-tone — cosmic
  cosmic:  { tonic: 196.00, scale: [0, 2, 4, 6, 8, 10, 12], lead: "sine", pad: "sawtooth", bass: "sine", bassMul: 0.25, noiseLP: 400, bpm: 80, shimmer: true },
  // A minor pentatonic — synthwave neon
  neon:    { tonic: 220.00, scale: [0, 3, 5, 7, 10, 12], lead: "square", pad: "sawtooth", bass: "square", bassMul: 0.5, noiseLP: 3000, bpm: 124, drum: "kick" },
  // D minor — sea shanty pirate
  pirate:  { tonic: 146.83, scale: [0, 2, 3, 5, 7, 8, 10], lead: "sawtooth", pad: "triangle", bass: "sawtooth", bassMul: 0.5, noiseLP: 600, bpm: 100, drum: "tom" },
  // E Phrygian-dominant — Egyptian
  pharaoh: { tonic: 164.81, scale: [0, 1, 4, 5, 7, 8, 11], lead: "triangle", pad: "sine", bass: "sine", bassMul: 0.5, noiseLP: 700, bpm: 92, drum: "tom" },
  // C minor — viking
  viking:  { tonic: 130.81, scale: [0, 2, 3, 5, 7, 8, 10], lead: "sawtooth", pad: "sine", bass: "sine", bassMul: 0.5, noiseLP: 500, bpm: 116, drum: "kick" },
  // A major pentatonic — aztec
  aztec:   { tonic: 220.00, scale: [0, 2, 4, 7, 9, 12], lead: "triangle", pad: "sine", bass: "sine", bassMul: 0.5, noiseLP: 800, bpm: 104, drum: "tom" },
  // F# major pentatonic — sakura
  sakura:  { tonic: 369.99, scale: [0, 2, 4, 7, 9, 12], lead: "sine", pad: "triangle", bass: "sine", bassMul: 0.5, noiseLP: 4000, bpm: 78, shimmer: true },
};

function note(p: Palette, step: number) {
  return semitone(p.tonic, p.scale[((step % p.scale.length) + p.scale.length) % p.scale.length] + Math.floor(step / p.scale.length) * 12);
}

// ============================================================================
// Cue generators (palette-driven)
// ============================================================================

function cueSpin(p: Palette, fast = false) {
  const dur = fast ? 0.32 : 0.55;
  playSweep(p.tonic * 2, p.tonic * (fast ? 4 : 3), dur, "triangle", 0.16);
  playNote({ freq: p.tonic * p.bassMul, dur: dur + 0.1, type: p.bass, gain: 0.18, delay: 0.02 });
  // ratchet ticks
  for (let i = 0; i < (fast ? 6 : 4); i++) {
    playNote({ freq: 1800 + Math.random() * 600, dur: 0.02, type: "square", gain: 0.05, delay: i * (dur / (fast ? 6 : 4)) });
  }
}

function cueStop(p: Palette) {
  playNote({ freq: note(p, 0) * 2, dur: 0.07, type: "square", gain: 0.16 });
  playNoise(0.06, 0.07, 0.005, p.noiseLP);
}

function cueAnticipation(p: Palette) {
  playSweep(p.tonic * 0.5, p.tonic * 4, 1.4, "sawtooth", 0.12);
  playSweep(120, 60, 1.4, "sine", 0.18, 0);
  for (let i = 0; i < 8; i++) {
    playNote({ freq: note(p, i % p.scale.length + 7), dur: 0.08, type: p.lead, gain: 0.08, delay: i * 0.16 });
  }
}

function cueScatter(p: Palette) {
  // bell cascade
  for (let i = 0; i < 6; i++) {
    playNote({ freq: note(p, i + 7), dur: 0.45, type: "sine", gain: 0.18 - i * 0.015, delay: i * 0.06 });
    if (p.shimmer) playNote({ freq: note(p, i + 14), dur: 0.35, type: "triangle", gain: 0.08, delay: i * 0.06 + 0.02 });
  }
  playNoise(0.5, 0.05, 0, 5000);
}

function cueBonusTrigger(p: Palette) {
  // big impact + rising chord
  playNote({ freq: p.tonic * p.bassMul, dur: 1.0, type: "sine", gain: 0.32 });
  playNoise(0.3, 0.18, 0, p.noiseLP * 2);
  [0, 4, 7, 12].forEach((s, i) =>
    playNote({ freq: semitone(p.tonic, s), dur: 1.2, type: p.lead, gain: 0.18, delay: 0.15 + i * 0.04, attack: 0.08 })
  );
  playSweep(p.tonic, p.tonic * 4, 1.0, "sawtooth", 0.12, 0.2);
}

function cueWin(p: Palette, tier: 1 | 2 | 3 | 4 | 5) {
  // tier 1 = small … 5 = epic. Each step adds notes, length, harmonics, bass drop.
  const noteCount = [3, 4, 5, 7, 9][tier - 1];
  const noteLen = [0.18, 0.22, 0.3, 0.38, 0.5][tier - 1];
  const stepGap = [0.06, 0.07, 0.08, 0.09, 0.11][tier - 1];
  const peak = [0.18, 0.22, 0.26, 0.3, 0.34][tier - 1];

  for (let i = 0; i < noteCount; i++) {
    playNote({ freq: note(p, i + (tier >= 3 ? 2 : 0)), dur: noteLen, type: p.lead, gain: peak, delay: i * stepGap });
    if (tier >= 3) playNote({ freq: note(p, i + 7), dur: noteLen * 0.8, type: p.pad, gain: peak * 0.4, delay: i * stepGap + 0.01 });
  }

  if (tier >= 2) {
    // sparkle
    if (p.shimmer || tier >= 3) {
      for (let i = 0; i < tier * 2; i++) {
        playNote({ freq: note(p, 14 + (i % 4)), dur: 0.18, type: "triangle", gain: 0.06, delay: 0.05 + i * 0.04 });
      }
    }
  }
  if (tier >= 3) {
    // sub-bass impact
    playNote({ freq: p.tonic * p.bassMul, dur: 0.8, type: "sine", gain: 0.28, delay: 0.05 });
  }
  if (tier >= 4) {
    // drum slam
    if (p.drum === "taiko") { playNote({ freq: 70, dur: 0.7, type: "sine", gain: 0.32, delay: 0.05 }); playNoise(0.15, 0.2, 0.05, 600); }
    else if (p.drum === "kick") { playSweep(140, 50, 0.18, "sine", 0.32, 0.05); playNoise(0.1, 0.15, 0.05, 800); }
    else if (p.drum === "tom") { playSweep(180, 90, 0.25, "sine", 0.28, 0.05); }
    playNoise(0.4, 0.12, 0.1, p.noiseLP * 1.5);
    // brass swell
    playSweep(p.tonic, p.tonic * 2, 0.6, "sawtooth", 0.18, 0.1);
  }
  if (tier >= 5) {
    // epic — choir-like pad cluster + extended fanfare
    [0, 4, 7, 12].forEach((s, i) =>
      playNote({ freq: semitone(p.tonic, s), dur: 1.6, type: p.pad, gain: 0.18, delay: 0.2 + i * 0.03, attack: 0.15 })
    );
    playSweep(60, 30, 1.5, "sine", 0.25, 0.3);
    // cymbal crash
    playNoise(1.2, 0.18, 0.2, 6000);
  }
}

function cueVO(p: Palette, tier: "big" | "mega" | "epic") {
  // Stylised "horn" fanfare in lieu of TTS
  const root = tier === "epic" ? p.tonic * 2 : tier === "mega" ? p.tonic * 1.5 : p.tonic;
  const seq = tier === "epic" ? [0, 4, 7, 12, 7, 12] : tier === "mega" ? [0, 7, 12, 7] : [0, 7];
  seq.forEach((s, i) =>
    playNote({ freq: semitone(root, s), dur: 0.28, type: "sawtooth", gain: 0.22, delay: i * 0.18, attack: 0.04 })
  );
}

// ============================================================================
// Public cue dispatcher
// ============================================================================

function dispatch(pack: SoundPack, cue: Cue) {
  const p = PALETTES[pack];
  switch (cue) {
    case "spin":          return cueSpin(p, false);
    case "spin_fast":     return cueSpin(p, true);
    case "stop":          return cueStop(p);
    case "anticipation":  return cueAnticipation(p);
    case "scatter":       return cueScatter(p);
    case "bonus_trigger": return cueBonusTrigger(p);
    case "win_small":
    case "win":           return cueWin(p, 1);
    case "win_big":       return cueWin(p, 2);
    case "win_huge":      return cueWin(p, 3);
    case "win_mega":
    case "bigwin":        return cueWin(p, 4);
    case "win_epic":      return cueWin(p, 5);
    case "vo_bigwin":     return cueVO(p, "big");
    case "vo_megawin":    return cueVO(p, "mega");
    case "vo_epic":       return cueVO(p, "epic");
  }
}

export function playSlotCue(pack: SoundPack, cue: Cue) {
  if (isSlotMuted()) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  try { dispatch(pack, cue); } catch { /* never crash gameplay */ }
}

// ============================================================================
// Procedural BGM — palette-driven looping pad + arpeggio
// ============================================================================

let bgmTimer: number | null = null;
let bgmPack: SoundPack | null = null;

function scheduleBgmBar(p: Palette) {
  const c = ensureCtx();
  if (!c || !bgmGain) return;
  const beat = 60 / p.bpm;
  const bar = beat * 4;
  // pad — sustained chord (i, iii, v)
  [0, 4, 7].forEach((s, i) => {
    const f = semitone(p.tonic, s);
    const t0 = c.currentTime + i * 0.01;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = p.pad;
    osc.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + bar);
    osc.connect(g).connect(bgmGain!);
    osc.start(t0);
    osc.stop(t0 + bar + 0.05);
  });
  // sub-bass on beats 1 & 3
  [0, 2].forEach((b) => {
    playNote({ freq: p.tonic * p.bassMul, dur: beat * 0.9, type: p.bass, gain: 0.18, delay: b * beat, attack: 0.05 }, bgmGain!);
  });
  // arpeggio — 8th notes through scale
  for (let i = 0; i < 8; i++) {
    const step = (i * 2) % p.scale.length;
    playNote({ freq: note(p, step + 7), dur: beat * 0.45, type: p.lead, gain: 0.07, delay: i * (beat / 2) }, bgmGain!);
  }
  // drum on beats
  if (p.drum && bgmGain) {
    for (let b = 0; b < 4; b++) {
      const t = b * beat;
      if (p.drum === "taiko" && (b === 0 || b === 2)) {
        playNote({ freq: 70, dur: 0.18, type: "sine", gain: 0.22, delay: t }, bgmGain);
      } else if (p.drum === "kick" && (b === 0 || b === 2)) {
        playSweep(120, 50, 0.12, "sine", 0.22, t, bgmGain);
      } else if (p.drum === "tom" && (b === 0 || b === 2)) {
        playSweep(160, 80, 0.18, "sine", 0.18, t, bgmGain);
      }
      // hi-hat-ish noise
      if (p.shimmer || b % 2 === 1) {
        playNoise(0.05, 0.04, t + beat / 2, 6000, bgmGain);
      }
    }
  }
  return bar;
}

export function startProcBGM(pack: SoundPack) {
  if (isSlotMuted()) return;
  const c = ensureCtx();
  if (!c || !bgmGain) return;
  if (bgmPack === pack && bgmTimer !== null) return;
  stopProcBGM(0.3);
  bgmPack = pack;
  // fade in
  const now = c.currentTime;
  bgmGain.gain.cancelScheduledValues(now);
  bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
  bgmGain.gain.linearRampToValueAtTime(0.45, now + 1.2);

  const p = PALETTES[pack];
  const tick = () => {
    if (bgmPack !== pack) return;
    const bar = scheduleBgmBar(p) ?? (60 / p.bpm) * 4;
    bgmTimer = window.setTimeout(tick, bar * 1000 - 30);
  };
  tick();
}

export function stopProcBGM(fadeSec = 0.6) {
  bgmPack = null;
  if (bgmTimer !== null) { clearTimeout(bgmTimer); bgmTimer = null; }
  const c = ensureCtx();
  if (!c || !bgmGain) return;
  const now = c.currentTime;
  bgmGain.gain.cancelScheduledValues(now);
  bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
  bgmGain.gain.linearRampToValueAtTime(0, now + fadeSec);
}

export function isProcBGMPlaying() { return bgmPack !== null; }
