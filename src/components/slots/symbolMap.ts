// Symbol index 0-10 mapping. Indices match server _slot_compute_spin.
// Card symbols (0-4) are shared across themes; premium symbols (5-10) are per-theme.

// --- shared card symbols (Olympus art reused, recolored at runtime via CSS filter) ---
import sym10 from "@/assets/slots/olympus/sym_10.png";
import symJ from "@/assets/slots/olympus/sym_j.png";
import symQ from "@/assets/slots/olympus/sym_q.png";
import symK from "@/assets/slots/olympus/sym_k.png";
import symA from "@/assets/slots/olympus/sym_a.png";

// --- Olympus premium ---
import oHelmet from "@/assets/slots/olympus/sym_helmet.png";
import oRing from "@/assets/slots/olympus/sym_ring.png";
import oGoddess from "@/assets/slots/olympus/sym_goddess.png";
import oEmperor from "@/assets/slots/olympus/sym_emperor.png";
import oWild from "@/assets/slots/olympus/sym_wild.png";
import oScatter from "@/assets/slots/olympus/sym_scatter.png";

// --- Wizard premium ---
import wOrb from "@/assets/slots/wizard/sym_orb.png";
import wAmulet from "@/assets/slots/wizard/sym_amulet.png";
import wSorceress from "@/assets/slots/wizard/sym_sorceress.png";
import wArchmage from "@/assets/slots/wizard/sym_archmage.png";
import wWild from "@/assets/slots/wizard/sym_wild.png";
import wScatter from "@/assets/slots/wizard/sym_scatter.png";

// --- Dragon premium ---
import dPearl from "@/assets/slots/dragon/sym_pearl.png";
import dJade from "@/assets/slots/dragon/sym_jade.png";
import dPhoenix from "@/assets/slots/dragon/sym_phoenix.png";
import dDragonKing from "@/assets/slots/dragon/sym_dragon_king.png";
import dWild from "@/assets/slots/dragon/sym_wild.png";
import dScatter from "@/assets/slots/dragon/sym_scatter.png";

const CARD_PACK = [sym10, symJ, symQ, symK, symA] as const;

export type SymbolPack = "olympus" | "wizard" | "dragon";

export const SYMBOL_PACKS: Record<SymbolPack, string[]> = {
  olympus: [...CARD_PACK, oHelmet, oRing, oGoddess, oEmperor, oWild, oScatter],
  wizard:  [...CARD_PACK, wOrb,    wAmulet, wSorceress, wArchmage, wWild, wScatter],
  dragon:  [...CARD_PACK, dPearl,  dJade,   dPhoenix,   dDragonKing, dWild, dScatter],
};

export function getSymbolImages(pack: SymbolPack = "olympus"): string[] {
  return SYMBOL_PACKS[pack] ?? SYMBOL_PACKS.olympus;
}

// Backwards-compatible default export (Olympus). Existing imports keep working.
export const SYMBOL_IMAGES: string[] = SYMBOL_PACKS.olympus;

export const SYMBOL_NAMES = [
  "10", "J", "Q", "K", "A",
  "Helmet", "Ring", "Goddess", "Emperor",
  "WILD", "SCATTER",
];

export const PREMIUM_INDICES = new Set([5, 6, 7, 8, 9, 10]);
export const CARD_INDICES = new Set([0, 1, 2, 3, 4]);
