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
  volatility: "mid",
  maxMultiplier: 1000,
};

export const WIZARD_THEME: SlotTheme = {
  gameCode: "wizard_2000",
  bg: bgWizard,
  logo: logoWizard,
  title: "Wizard 2000",
  volatility: "high",
  maxMultiplier: 2000,
};

export const DRAGON_THEME: SlotTheme = {
  gameCode: "dragon_500",
  bg: bgDragon,
  logo: logoDragon,
  title: "Dragon Empire",
  volatility: "low",
  maxMultiplier: 500,
};
