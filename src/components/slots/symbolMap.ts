// Symbol index 0-10 mapping. Indices match server _slot_compute_spin.
import sym10 from "@/assets/slots/olympus/sym_10.png";
import symJ from "@/assets/slots/olympus/sym_j.png";
import symQ from "@/assets/slots/olympus/sym_q.png";
import symK from "@/assets/slots/olympus/sym_k.png";
import symA from "@/assets/slots/olympus/sym_a.png";
import symHelmet from "@/assets/slots/olympus/sym_helmet.png";
import symRing from "@/assets/slots/olympus/sym_ring.png";
import symGoddess from "@/assets/slots/olympus/sym_goddess.png";
import symEmperor from "@/assets/slots/olympus/sym_emperor.png";
import symWild from "@/assets/slots/olympus/sym_wild.png";
import symScatter from "@/assets/slots/olympus/sym_scatter.png";

export const SYMBOL_IMAGES: string[] = [
  sym10, symJ, symQ, symK, symA,
  symHelmet, symRing, symGoddess, symEmperor,
  symWild, symScatter,
];

export const SYMBOL_NAMES = [
  "10", "J", "Q", "K", "A",
  "Helmet", "Ring", "Goddess", "Emperor",
  "WILD", "SCATTER",
];

export const PREMIUM_INDICES = new Set([5, 6, 7, 8, 9, 10]);
