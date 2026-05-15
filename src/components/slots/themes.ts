import bgOlympus from "@/assets/slots/olympus/bg.jpg";
import logoOlympus from "@/assets/slots/olympus/logo.png";
import bgWizard from "@/assets/slots/wizard/bg.jpg";
import logoWizard from "@/assets/slots/wizard/logo.png";
import bgDragon from "@/assets/slots/dragon/bg.jpg";
import logoDragon from "@/assets/slots/dragon/logo.png";
import type { SlotTheme } from "./OlympusSlot";

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
    "rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-amber-950/40 to-stone-950/60 p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,200,80,0.15)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-100/0 via-amber-100/5 to-amber-100/0",
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
  // boost violet/cyan tint on shared card art
  cardFilter: "hue-rotate(255deg) saturate(1.15) brightness(1.05)",
  reelFrameClass:
    "rounded-2xl border-2 border-violet-400/50 bg-gradient-to-b from-violet-950/50 to-indigo-950/70 p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(140,80,255,0.25)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-100/0 via-violet-200/10 to-cyan-100/0",
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
  // crimson + gold pop on shared card art
  cardFilter: "hue-rotate(330deg) saturate(1.4) brightness(0.95)",
  reelFrameClass:
    "rounded-2xl border-2 border-red-500/50 bg-gradient-to-b from-red-950/60 to-stone-950/70 p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,160,40,0.22)]",
  spinStreakClass:
    "pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-200/0 via-red-200/8 to-amber-200/0",
};
