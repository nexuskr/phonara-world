import bgOlympus from "@/assets/slots/olympus/bg.jpg";
import logoOlympus from "@/assets/slots/olympus/logo.png";
import bgWizard from "@/assets/slots/wizard/bg.jpg";
import logoWizard from "@/assets/slots/wizard/logo.png";
import bgDragon from "@/assets/slots/dragon/bg.jpg";
import logoDragon from "@/assets/slots/dragon/logo.png";
import bgCosmic from "@/assets/slots/cosmic/bg.jpg";
import logoCosmic from "@/assets/slots/cosmic/logo.png";
import bgNeon from "@/assets/slots/neon/bg.jpg";
import logoNeon from "@/assets/slots/neon/logo.png";
import bgPirate from "@/assets/slots/pirate/bg.jpg";
import logoPirate from "@/assets/slots/pirate/logo.png";
import bgPharaoh from "@/assets/slots/pharaoh/bg.jpg";
import logoPharaoh from "@/assets/slots/pharaoh/logo.png";
import bgViking from "@/assets/slots/viking/bg.jpg";
import logoViking from "@/assets/slots/viking/logo.png";
import bgAztec from "@/assets/slots/aztec/bg.jpg";
import logoAztec from "@/assets/slots/aztec/logo.png";
import bgSakura from "@/assets/slots/sakura/bg.jpg";
import logoSakura from "@/assets/slots/sakura/logo.png";
import type { SlotTheme } from "./OlympusSlot";

const SHEER_OVERLAY =
  "linear-gradient(180deg, hsl(var(--background) / 0.10) 0%, transparent 28%, transparent 62%, hsl(var(--background) / 0.78) 100%)";

const OLYMPUS_PATTERN =
  "repeating-linear-gradient(45deg, hsla(45, 90%, 60%, 0.10) 0 2px, transparent 2px 18px), " +
  "repeating-linear-gradient(-45deg, hsla(45, 90%, 60%, 0.08) 0 2px, transparent 2px 18px), " +
  "radial-gradient(circle at 50% 50%, hsla(45, 80%, 30%, 0.18), transparent 70%)";

const WIZARD_PATTERN =
  "radial-gradient(2px 2px at 20% 30%, hsla(190, 100%, 80%, 0.55), transparent 60%), " +
  "radial-gradient(1.5px 1.5px at 70% 60%, hsla(280, 100%, 85%, 0.55), transparent 60%), " +
  "radial-gradient(1.5px 1.5px at 40% 80%, hsla(200, 100%, 80%, 0.45), transparent 60%), " +
  "radial-gradient(2px 2px at 85% 20%, hsla(260, 100%, 85%, 0.55), transparent 60%), " +
  "radial-gradient(circle at 30% 40%, hsla(265, 80%, 35%, 0.35), transparent 65%), " +
  "radial-gradient(circle at 75% 70%, hsla(190, 80%, 30%, 0.30), transparent 65%)";

const DRAGON_PATTERN =
  "repeating-radial-gradient(circle at 0 0, transparent 0 14px, hsla(45, 95%, 55%, 0.16) 14px 16px, transparent 16px 28px), " +
  "repeating-radial-gradient(circle at 24px 24px, transparent 0 14px, hsla(45, 95%, 55%, 0.12) 14px 16px, transparent 16px 28px), " +
  "radial-gradient(circle at 50% 50%, hsla(0, 80%, 25%, 0.30), transparent 75%)";

// === 7 NEW THEME PATTERNS ====================================================

// Cosmic Forge — pulsing supernova starfield + nebula whirl
const COSMIC_PATTERN =
  "radial-gradient(2px 2px at 12% 18%, hsla(280, 100%, 85%, 0.7), transparent 60%), " +
  "radial-gradient(2.5px 2.5px at 78% 32%, hsla(195, 100%, 80%, 0.7), transparent 60%), " +
  "radial-gradient(1.5px 1.5px at 55% 75%, hsla(310, 100%, 85%, 0.6), transparent 60%), " +
  "radial-gradient(2px 2px at 28% 88%, hsla(220, 100%, 85%, 0.6), transparent 60%), " +
  "conic-gradient(from 45deg at 60% 40%, hsla(265, 80%, 35%, 0.18), transparent 30%, hsla(195, 80%, 35%, 0.18), transparent 60%), " +
  "radial-gradient(circle at 50% 50%, hsla(255, 80%, 20%, 0.40), transparent 75%)";

// Neon Tokyo 88 — scanlines + magenta/cyan grid bloom
const NEON_PATTERN =
  "repeating-linear-gradient(0deg, hsla(320, 100%, 60%, 0.05) 0 1px, transparent 1px 4px), " +
  "repeating-linear-gradient(90deg, hsla(190, 100%, 60%, 0.05) 0 1px, transparent 1px 28px), " +
  "radial-gradient(circle at 22% 30%, hsla(320, 100%, 50%, 0.30), transparent 60%), " +
  "radial-gradient(circle at 78% 70%, hsla(190, 100%, 50%, 0.30), transparent 60%), " +
  "linear-gradient(180deg, hsla(280, 60%, 8%, 0.45), hsla(220, 60%, 6%, 0.55))";

// Pirate's Curse — rough wood plank + cursed teal glow
const PIRATE_PATTERN =
  "repeating-linear-gradient(90deg, hsla(28, 60%, 20%, 0.22) 0 22px, hsla(28, 50%, 12%, 0.22) 22px 24px), " +
  "radial-gradient(circle at 30% 40%, hsla(180, 80%, 35%, 0.20), transparent 65%), " +
  "radial-gradient(circle at 70% 75%, hsla(20, 90%, 35%, 0.18), transparent 65%)";

// Pharaoh's Vault — hieroglyph grid + golden sand wash
const PHARAOH_PATTERN =
  "repeating-linear-gradient(0deg, hsla(45, 90%, 55%, 0.10) 0 1px, transparent 1px 16px), " +
  "repeating-linear-gradient(90deg, hsla(45, 90%, 55%, 0.10) 0 1px, transparent 1px 16px), " +
  "radial-gradient(2px 2px at 20% 50%, hsla(220, 90%, 65%, 0.5), transparent 60%), " +
  "radial-gradient(2px 2px at 75% 30%, hsla(45, 100%, 70%, 0.5), transparent 60%), " +
  "radial-gradient(circle at 50% 50%, hsla(35, 80%, 30%, 0.25), transparent 75%)";

// Viking Thunder — runic etch + lightning blue blooms
const VIKING_PATTERN =
  "repeating-linear-gradient(60deg, hsla(200, 90%, 55%, 0.12) 0 2px, transparent 2px 20px), " +
  "repeating-linear-gradient(-60deg, hsla(200, 90%, 55%, 0.10) 0 2px, transparent 2px 20px), " +
  "radial-gradient(circle at 50% 30%, hsla(200, 100%, 50%, 0.25), transparent 60%), " +
  "radial-gradient(circle at 50% 70%, hsla(220, 80%, 25%, 0.30), transparent 70%)";

// Aztec Sun — sun-disc rays + jungle green wash
const AZTEC_PATTERN =
  "conic-gradient(from 0deg at 50% 50%, hsla(45, 95%, 55%, 0.10) 0 6deg, transparent 6deg 18deg, hsla(45, 95%, 55%, 0.10) 18deg 24deg, transparent 24deg 36deg), " +
  "radial-gradient(circle at 50% 50%, hsla(45, 100%, 60%, 0.25), transparent 50%), " +
  "radial-gradient(circle at 50% 100%, hsla(140, 70%, 25%, 0.40), transparent 65%)";

// Cherry Sakura — falling petals (static) + soft pink wash
const SAKURA_PATTERN =
  "radial-gradient(3px 3px at 18% 12%, hsla(340, 90%, 80%, 0.55), transparent 60%), " +
  "radial-gradient(2.5px 2.5px at 65% 22%, hsla(340, 90%, 75%, 0.50), transparent 60%), " +
  "radial-gradient(2px 2px at 38% 58%, hsla(330, 90%, 80%, 0.50), transparent 60%), " +
  "radial-gradient(3px 3px at 82% 70%, hsla(345, 90%, 78%, 0.55), transparent 60%), " +
  "radial-gradient(2.5px 2.5px at 25% 88%, hsla(335, 90%, 80%, 0.50), transparent 60%), " +
  "radial-gradient(circle at 50% 50%, hsla(180, 50%, 28%, 0.18), transparent 75%)";

// === EXISTING THEMES =========================================================

export const OLYMPUS_THEME: SlotTheme = {
  gameCode: "olympus_1000",
  bg: bgOlympus, logo: logoOlympus, title: "Olympus 1000",
  rtpLabel: "96.0%", volatility: "mid", maxMultiplier: 1000,
  symbolPack: "olympus", soundPack: "olympus", cardFilter: "none",
  reelFrameClass:
    "rounded-2xl border-2 border-primary/50 bg-gradient-to-b from-amber-950/25 to-stone-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,200,80,0.18)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-amber-100/5 to-amber-100/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: OLYMPUS_PATTERN,
};

export const WIZARD_THEME: SlotTheme = {
  gameCode: "wizard_2000",
  bg: bgWizard, logo: logoWizard, title: "Wizard 2000",
  rtpLabel: "96.0%", volatility: "high", maxMultiplier: 2000,
  symbolPack: "wizard", soundPack: "wizard",
  cardFilter: "hue-rotate(255deg) saturate(1.15) brightness(1.05)",
  reelFrameClass:
    "rounded-2xl border-2 border-violet-400/60 bg-gradient-to-b from-violet-950/25 to-indigo-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(140,80,255,0.30)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-100/0 via-violet-200/10 to-cyan-100/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: WIZARD_PATTERN,
};

// Alias — Signature Slot 생산라인 네이밍 컨벤션 (cosmic_forge_5000, neon_tokyo_88 …)
export const WIZARD_2000_THEME = WIZARD_THEME;

export const DRAGON_THEME: SlotTheme = {
  gameCode: "dragon_500",
  bg: bgDragon, logo: logoDragon, title: "Dragon Empire",
  rtpLabel: "96.0%", volatility: "low", maxMultiplier: 500,
  symbolPack: "dragon", soundPack: "dragon",
  cardFilter: "hue-rotate(330deg) saturate(1.4) brightness(0.95)",
  reelFrameClass:
    "rounded-2xl border-2 border-red-500/60 bg-gradient-to-b from-red-950/25 to-stone-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,160,40,0.28)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-200/0 via-red-200/8 to-amber-200/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: DRAGON_PATTERN,
};

// === 7 NEW THEMES ============================================================

export const COSMIC_FORGE_THEME: SlotTheme = {
  gameCode: "cosmic_forge_5000",
  bg: bgCosmic, logo: logoCosmic, title: "Cosmic Forge 5000",
  rtpLabel: "96.0%", volatility: "high", maxMultiplier: 5000,
  symbolPack: "cosmic", soundPack: "cosmic",
  cardFilter: "hue-rotate(265deg) saturate(1.3) brightness(1.1)",
  reelFrameClass:
    "rounded-2xl border-2 border-violet-400/70 bg-gradient-to-b from-indigo-950/30 to-violet-950/55 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_50px_rgba(150,90,255,0.35)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-100/0 via-violet-300/12 to-cyan-100/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: COSMIC_PATTERN,
  bonusKind: "sticky_multi",
};

export const NEON_TOKYO_THEME: SlotTheme = {
  gameCode: "neon_tokyo_88",
  bg: bgNeon, logo: logoNeon, title: "Neon Tokyo 88",
  rtpLabel: "96.0%", volatility: "high", maxMultiplier: 8888,
  symbolPack: "neon", soundPack: "neon",
  cardFilter: "hue-rotate(310deg) saturate(1.5) brightness(1.1)",
  reelFrameClass:
    "rounded-2xl border-2 border-pink-400/70 bg-gradient-to-b from-fuchsia-950/30 to-cyan-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_50px_rgba(255,60,180,0.35)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-200/0 via-pink-200/12 to-cyan-200/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: NEON_PATTERN,
  bonusKind: "hold88",
};

export const PIRATE_CURSE_THEME: SlotTheme = {
  gameCode: "pirates_curse_1500",
  bg: bgPirate, logo: logoPirate, title: "Pirate's Curse 1500",
  rtpLabel: "96.0%", volatility: "mid", maxMultiplier: 1500,
  symbolPack: "pirate", soundPack: "pirate",
  cardFilter: "hue-rotate(170deg) saturate(1.2) brightness(0.95)",
  reelFrameClass:
    "rounded-2xl border-2 border-teal-400/60 bg-gradient-to-b from-stone-900/40 to-teal-950/55 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_45px_rgba(40,200,180,0.25)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-teal-200/10 to-amber-100/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: PIRATE_PATTERN,
  bonusKind: "crash_cannon",
};

export const PHARAOH_VAULT_THEME: SlotTheme = {
  gameCode: "pharaohs_vault_2500",
  bg: bgPharaoh, logo: logoPharaoh, title: "Pharaoh's Vault 2500",
  rtpLabel: "96.0%", volatility: "mid", maxMultiplier: 2500,
  symbolPack: "pharaoh", soundPack: "pharaoh",
  cardFilter: "hue-rotate(20deg) saturate(1.3) brightness(1.05)",
  reelFrameClass:
    "rounded-2xl border-2 border-amber-400/70 bg-gradient-to-b from-amber-950/30 to-blue-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_50px_rgba(255,200,80,0.30)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-200/0 via-amber-200/12 to-blue-200/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: PHARAOH_PATTERN,
  bonusKind: "pick_reveal",
};

export const VIKING_THUNDER_THEME: SlotTheme = {
  gameCode: "viking_thunder_4000",
  bg: bgViking, logo: logoViking, title: "Viking Thunder 4000",
  rtpLabel: "96.0%", volatility: "high", maxMultiplier: 4000,
  symbolPack: "viking", soundPack: "viking",
  cardFilter: "hue-rotate(190deg) saturate(1.3) brightness(1.05)",
  reelFrameClass:
    "rounded-2xl border-2 border-blue-400/70 bg-gradient-to-b from-slate-900/40 to-blue-950/55 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_50px_rgba(80,160,255,0.30)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-100/0 via-blue-200/12 to-cyan-100/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: VIKING_PATTERN,
  bonusKind: "three_path",
};

export const AZTEC_SUN_THEME: SlotTheme = {
  gameCode: "aztec_sun_1200",
  bg: bgAztec, logo: logoAztec, title: "Aztec Sun 1200",
  rtpLabel: "96.0%", volatility: "mid", maxMultiplier: 1200,
  symbolPack: "aztec", soundPack: "aztec",
  cardFilter: "hue-rotate(80deg) saturate(1.4) brightness(1.0)",
  reelFrameClass:
    "rounded-2xl border-2 border-amber-500/70 bg-gradient-to-b from-emerald-950/35 to-amber-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_50px_rgba(255,180,40,0.28)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-emerald-200/10 to-amber-100/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: AZTEC_PATTERN,
  bonusKind: "cluster_tumble",
};

export const CHERRY_SAKURA_THEME: SlotTheme = {
  gameCode: "cherry_sakura_500",
  bg: bgSakura, logo: logoSakura, title: "Cherry Sakura 500",
  rtpLabel: "96.0%", volatility: "low", maxMultiplier: 500,
  symbolPack: "sakura", soundPack: "sakura",
  cardFilter: "hue-rotate(330deg) saturate(1.2) brightness(1.1)",
  reelFrameClass:
    "rounded-2xl border-2 border-pink-300/70 bg-gradient-to-b from-pink-950/25 to-teal-950/40 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_45px_rgba(255,170,200,0.30)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-pink-100/0 via-pink-200/12 to-teal-100/0",
  bgOverlay: SHEER_OVERLAY, reelPattern: SAKURA_PATTERN,
  bonusKind: "mission_trail",
};

// === FLAGSHIP — Olympus Legacy 5000 ==========================================
// "Warm Olympus Luxury" — deep night blue + rich warm amber gold.
// Reuses olympus symbol/sound pack for immediate launch (zero downtime).
// Swap the two import lines below to new amber-gold hero assets when ready:
//   import bgOlympusLegacy from "@/assets/slots/olympus-legacy/bg.jpg";
//   import logoOlympusLegacy from "@/assets/slots/olympus-legacy/logo.png";

// Marble columns + warm amber lattice + gentle gold halo
const OLYMPUS_LEGACY_PATTERN =
  "repeating-linear-gradient(90deg, hsla(45, 92%, 60%, 0.10) 0 1px, transparent 1px 22px), " +
  "repeating-linear-gradient(0deg, hsla(45, 92%, 60%, 0.08) 0 1px, transparent 1px 22px), " +
  "radial-gradient(circle at 50% 20%, hsla(45, 95%, 65%, 0.22), transparent 55%), " +
  "radial-gradient(circle at 50% 100%, hsla(40, 80%, 30%, 0.28), transparent 70%)";

export const OLYMPUS_LEGACY_THEME: SlotTheme = {
  gameCode: "olympus_legacy_5000",
  // ── Background asset strategy ──────────────────────────────────────────────
  // Reusing the existing olympus art for an immediate launch. When the new
  // amber-gold hero assets are ready, just swap these two lines (see comment
  // block above).
  bg: bgOlympus,
  logo: logoOlympus,
  title: "Olympus Legacy 5000",
  rtpLabel: "96.0%",
  volatility: "high",
  maxMultiplier: 5000,
  symbolPack: "olympus",
  soundPack: "olympus",
  // warm amber tint without breaking olympus card art
  cardFilter: "hue-rotate(8deg) saturate(1.25) brightness(1.08)",
  reelFrameClass:
    "rounded-2xl border-2 border-amber-400/70 bg-gradient-to-b from-[#0a1228]/60 to-[#1a1408]/65 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_60px_rgba(255,196,90,0.38)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-amber-200/14 to-amber-100/0",
  bgOverlay: SHEER_OVERLAY,
  reelPattern: OLYMPUS_LEGACY_PATTERN,
  bonusKind: "cluster_tumble",
};

// === SIGNATURE — Sugar Fever 3000 ============================================
// "Warm Sugar Luxury" — pastel pink + warm gold + mint + strawberry red.
// Reuses olympus symbol/sound pack for immediate launch (zero downtime).
// Swap the two import lines below for dedicated candy hero assets when ready:
//   import bgSugarFever from "@/assets/slots/sugar-fever/bg.jpg";
//   import logoSugarFever from "@/assets/slots/sugar-fever/logo.png";

// Candy dot lattice (pink + gold + mint + strawberry) + creamy pink/gold halos.
// Note: this is the in-reel decorative pattern only (the slot frame inner glow).
// The cinematic background is fully painted in SugarFeverCanvas.
const SUGAR_FEVER_PATTERN =
  "radial-gradient(3px 3px at 14% 18%, hsla(350, 100%, 86%, 0.70), transparent 60%), " +   // pink dot
  "radial-gradient(2.6px 2.6px at 70% 26%, hsla(28, 90%, 80%, 0.70), transparent 60%), " +  // warm gold
  "radial-gradient(2.2px 2.2px at 40% 64%, hsla(160, 70%, 80%, 0.65), transparent 60%), " + // mint
  "radial-gradient(3px 3px at 84% 74%, hsla(352, 100%, 72%, 0.70), transparent 60%), " +    // strawberry
  "radial-gradient(2.4px 2.4px at 26% 86%, hsla(40, 100%, 88%, 0.65), transparent 60%), " + // cream
  "radial-gradient(circle at 50% 16%, hsla(28, 95%, 80%, 0.32), transparent 55%), " +       // gold halo top
  "radial-gradient(circle at 50% 100%, hsla(350, 100%, 75%, 0.34), transparent 70%)";       // pink halo bot

export const SUGAR_FEVER_THEME: SlotTheme = {
  gameCode: "sugar_fever_3000",
  // ── Background asset strategy ──────────────────────────────────────────────
  // Reusing the olympus art behind the cinematic Canvas (the Canvas covers it
  // anyway). When dedicated candy hero assets ship, swap these two lines.
  bg: bgOlympus,
  logo: logoOlympus,
  title: "Sugar Fever 3000",
  rtpLabel: "96.0%",
  volatility: "high",
  maxMultiplier: 3000,
  // Placeholder: reuses olympus symbol/sound pack until dedicated candy assets ship.
  symbolPack: "olympus",
  soundPack: "olympus",
  // Strong pastel-pink hue shift over borrowed art (rotates olympus gold → pink)
  cardFilter: "hue-rotate(310deg) saturate(1.35) brightness(1.15)",
  // Pastel pink frame on creamy backdrop with warm gold glow — never dark/cocoa
  reelFrameClass:
    "rounded-2xl border-2 border-pink-300/80 bg-gradient-to-b from-[#ffe4e8]/40 to-[#f8c8a0]/35 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_60px_rgba(255,182,193,0.55)]",
  // Sweep is pink → gold (warm pastel), not amber
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-pink-200/0 via-pink-300/18 to-amber-200/0",
  bgOverlay: SHEER_OVERLAY,
  reelPattern: SUGAR_FEVER_PATTERN,
  bonusKind: "cluster_tumble",
};
