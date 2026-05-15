import bgOlympus from "@/assets/slots/olympus/bg.jpg";
import logoOlympus from "@/assets/slots/olympus/logo.png";
import bgWizard from "@/assets/slots/wizard/bg.jpg";
import logoWizard from "@/assets/slots/wizard/logo.png";
import bgDragon from "@/assets/slots/dragon/bg.jpg";
import logoDragon from "@/assets/slots/dragon/logo.png";
import type { SlotTheme } from "./OlympusSlot";

// Soft vignette: keep top/middle of bg image visible, only darken bottom
// (where bet chips / SPIN sit) for legibility.
const SHEER_OVERLAY =
  "linear-gradient(180deg, hsl(var(--background) / 0.10) 0%, transparent 28%, transparent 62%, hsl(var(--background) / 0.78) 100%)";

// Reel-internal procedural patterns — pure CSS, no extra assets.
const OLYMPUS_PATTERN =
  // Greek meander key — diagonal gold lines + faint stars
  "repeating-linear-gradient(45deg, hsla(45, 90%, 60%, 0.10) 0 2px, transparent 2px 18px), " +
  "repeating-linear-gradient(-45deg, hsla(45, 90%, 60%, 0.08) 0 2px, transparent 2px 18px), " +
  "radial-gradient(circle at 50% 50%, hsla(45, 80%, 30%, 0.18), transparent 70%)";

const WIZARD_PATTERN =
  // Starfield + violet nebula bloom
  "radial-gradient(2px 2px at 20% 30%, hsla(190, 100%, 80%, 0.55), transparent 60%), " +
  "radial-gradient(1.5px 1.5px at 70% 60%, hsla(280, 100%, 85%, 0.55), transparent 60%), " +
  "radial-gradient(1.5px 1.5px at 40% 80%, hsla(200, 100%, 80%, 0.45), transparent 60%), " +
  "radial-gradient(2px 2px at 85% 20%, hsla(260, 100%, 85%, 0.55), transparent 60%), " +
  "radial-gradient(circle at 30% 40%, hsla(265, 80%, 35%, 0.35), transparent 65%), " +
  "radial-gradient(circle at 75% 70%, hsla(190, 80%, 30%, 0.30), transparent 65%)";

const DRAGON_PATTERN =
  // Dragon-scale arcs in gold over crimson wash
  "repeating-radial-gradient(circle at 0 0, transparent 0 14px, hsla(45, 95%, 55%, 0.16) 14px 16px, transparent 16px 28px), " +
  "repeating-radial-gradient(circle at 24px 24px, transparent 0 14px, hsla(45, 95%, 55%, 0.12) 14px 16px, transparent 16px 28px), " +
  "radial-gradient(circle at 50% 50%, hsla(0, 80%, 25%, 0.30), transparent 75%)";

export const OLYMPUS_THEME: SlotTheme = {
  gameCode: "olympus_1000",
  bg: bgOlympus,
  logo: logoOlympus,
  title: "Olympus 1000",
  rtpLabel: "96.0%",
  volatility: "mid",
  maxMultiplier: 1000,
  symbolPack: "olympus",
  soundPack: "olympus",
  cardFilter: "none",
  reelFrameClass:
    "rounded-2xl border-2 border-primary/50 bg-gradient-to-b from-amber-950/25 to-stone-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,200,80,0.18)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-amber-100/5 to-amber-100/0",
  bgOverlay: SHEER_OVERLAY,
  reelPattern: OLYMPUS_PATTERN,
};

export const WIZARD_THEME: SlotTheme = {
  gameCode: "wizard_2000",
  bg: bgWizard,
  logo: logoWizard,
  title: "Wizard 2000",
  rtpLabel: "96.0%",
  volatility: "high",
  maxMultiplier: 2000,
  symbolPack: "wizard",
  soundPack: "wizard",
  cardFilter: "hue-rotate(255deg) saturate(1.15) brightness(1.05)",
  reelFrameClass:
    "rounded-2xl border-2 border-violet-400/60 bg-gradient-to-b from-violet-950/25 to-indigo-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(140,80,255,0.30)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-100/0 via-violet-200/10 to-cyan-100/0",
  bgOverlay: SHEER_OVERLAY,
  reelPattern: WIZARD_PATTERN,
};

export const DRAGON_THEME: SlotTheme = {
  gameCode: "dragon_500",
  bg: bgDragon,
  logo: logoDragon,
  title: "Dragon Empire",
  rtpLabel: "96.0%",
  volatility: "low",
  maxMultiplier: 500,
  symbolPack: "dragon",
  soundPack: "dragon",
  cardFilter: "hue-rotate(330deg) saturate(1.4) brightness(0.95)",
  reelFrameClass:
    "rounded-2xl border-2 border-red-500/60 bg-gradient-to-b from-red-950/25 to-stone-950/45 backdrop-blur-[2px] p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,160,40,0.28)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-200/0 via-red-200/8 to-amber-200/0",
  bgOverlay: SHEER_OVERLAY,
  reelPattern: DRAGON_PATTERN,
};
