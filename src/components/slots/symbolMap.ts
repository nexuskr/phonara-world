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

// --- Cosmic premium ---
import cPlasma from "@/assets/slots/cosmic/sym_plasma.png";
import cPlanet from "@/assets/slots/cosmic/sym_planet.png";
import cGoddess from "@/assets/slots/cosmic/sym_goddess.png";
import cEmperor from "@/assets/slots/cosmic/sym_emperor.png";
import cWild from "@/assets/slots/cosmic/sym_wild.png";
import cScatter from "@/assets/slots/cosmic/sym_scatter.png";

// --- Neon premium ---
import nBento from "@/assets/slots/neon/sym_bento.png";
import nTorii from "@/assets/slots/neon/sym_torii.png";
import nGeisha from "@/assets/slots/neon/sym_geisha.png";
import nShogun from "@/assets/slots/neon/sym_shogun.png";
import nWild from "@/assets/slots/neon/sym_wild.png";
import nScatter from "@/assets/slots/neon/sym_scatter.png";

// --- Pirate premium ---
import pRum from "@/assets/slots/pirate/sym_rum.png";
import pMap from "@/assets/slots/pirate/sym_map.png";
import pMermaid from "@/assets/slots/pirate/sym_mermaid.png";
import pCaptain from "@/assets/slots/pirate/sym_captain.png";
import pWild from "@/assets/slots/pirate/sym_wild.png";
import pScatter from "@/assets/slots/pirate/sym_scatter.png";

// --- Pharaoh premium ---
import phAnkh from "@/assets/slots/pharaoh/sym_ankh.png";
import phScarab from "@/assets/slots/pharaoh/sym_scarab.png";
import phIsis from "@/assets/slots/pharaoh/sym_isis.png";
import phPharaoh from "@/assets/slots/pharaoh/sym_pharaoh.png";
import phWild from "@/assets/slots/pharaoh/sym_wild.png";
import phScatter from "@/assets/slots/pharaoh/sym_scatter.png";

// --- Viking premium ---
import vRune from "@/assets/slots/viking/sym_rune.png";
import vHammer from "@/assets/slots/viking/sym_hammer.png";
import vValkyrie from "@/assets/slots/viking/sym_valkyrie.png";
import vThor from "@/assets/slots/viking/sym_thor.png";
import vWild from "@/assets/slots/viking/sym_wild.png";
import vScatter from "@/assets/slots/viking/sym_scatter.png";

// --- Aztec premium ---
import aCorn from "@/assets/slots/aztec/sym_corn.png";
import aJaguar from "@/assets/slots/aztec/sym_jaguar.png";
import aPriest from "@/assets/slots/aztec/sym_priest.png";
import aEmperor from "@/assets/slots/aztec/sym_emperor.png";
import aWild from "@/assets/slots/aztec/sym_wild.png";
import aScatter from "@/assets/slots/aztec/sym_scatter.png";

// --- Sakura premium ---
import sLantern from "@/assets/slots/sakura/sym_lantern.png";
import sFan from "@/assets/slots/sakura/sym_fan.png";
import sGeisha from "@/assets/slots/sakura/sym_geisha.png";
import sLord from "@/assets/slots/sakura/sym_lord.png";
import sWild from "@/assets/slots/sakura/sym_wild.png";
import sScatter from "@/assets/slots/sakura/sym_scatter.png";

const CARD_PACK = [sym10, symJ, symQ, symK, symA] as const;

export type SymbolPack =
  | "olympus"
  | "wizard"
  | "dragon"
  | "cosmic"
  | "neon"
  | "pirate"
  | "pharaoh"
  | "viking"
  | "aztec"
  | "sakura";

export const SYMBOL_PACKS: Record<SymbolPack, string[]> = {
  olympus: [...CARD_PACK, oHelmet, oRing, oGoddess, oEmperor, oWild, oScatter],
  wizard: [...CARD_PACK, wOrb, wAmulet, wSorceress, wArchmage, wWild, wScatter],
  dragon: [...CARD_PACK, dPearl, dJade, dPhoenix, dDragonKing, dWild, dScatter],
  cosmic: [...CARD_PACK, cPlasma, cPlanet, cGoddess, cEmperor, cWild, cScatter],
  neon: [...CARD_PACK, nBento, nTorii, nGeisha, nShogun, nWild, nScatter],
  pirate: [...CARD_PACK, pRum, pMap, pMermaid, pCaptain, pWild, pScatter],
  pharaoh: [...CARD_PACK, phAnkh, phScarab, phIsis, phPharaoh, phWild, phScatter],
  viking: [...CARD_PACK, vRune, vHammer, vValkyrie, vThor, vWild, vScatter],
  aztec: [...CARD_PACK, aCorn, aJaguar, aPriest, aEmperor, aWild, aScatter],
  sakura: [...CARD_PACK, sLantern, sFan, sGeisha, sLord, sWild, sScatter],
};

export function getSymbolImages(pack: SymbolPack = "olympus"): string[] {
  return SYMBOL_PACKS[pack] ?? SYMBOL_PACKS.olympus;
}

export const SYMBOL_IMAGES: string[] = SYMBOL_PACKS.olympus;

export const SYMBOL_NAMES = [
  "10", "J", "Q", "K", "A",
  "Premium 1", "Premium 2", "Premium 3", "Premium 4",
  "WILD", "SCATTER",
];

export const PREMIUM_INDICES = new Set([5, 6, 7, 8, 9, 10]);
export const CARD_INDICES = new Set([0, 1, 2, 3, 4]);
