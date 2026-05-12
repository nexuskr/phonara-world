// Phonara — SIM (₡) auxiliary currency hint.
// SIM (₡) is the only operational unit. USD/JPY/VND are *display-only* educational
// approximations (fixed indicative rates), never used for settlement.
// Compliance: rates are NOT guarantees, NOT exchange rates, NOT FX prices.

export type AuxCurrency = "USD" | "JPY" | "VND";

// Indicative SIM→AUX display rates (1₡ ≈ X aux unit). Tuned to read naturally.
const RATE: Record<AuxCurrency, number> = {
  USD: 0.001,
  JPY: 0.15,
  VND: 25,
};

const SYMBOL: Record<AuxCurrency, string> = {
  USD: "$",
  JPY: "¥",
  VND: "₫",
};

const LOCALE_TO_AUX: Record<string, AuxCurrency | null> = {
  ko: null,
  en: "USD",
  ja: "JPY",
  vi: "VND",
};

export function auxFor(lang?: string | null): AuxCurrency | null {
  const base = (lang || "ko").split("-")[0];
  return LOCALE_TO_AUX[base] ?? null;
}

export function formatAux(simAmount: number, lang?: string | null): string | null {
  const aux = auxFor(lang);
  if (!aux) return null;
  const v = Math.round(simAmount * RATE[aux]);
  try {
    return `${SYMBOL[aux]}${new Intl.NumberFormat(lang || "en").format(v)}`;
  } catch {
    return `${SYMBOL[aux]}${v.toLocaleString()}`;
  }
}

// Disclaimer text key — render i18n key elsewhere; here we just expose canonical EN.
export const AUX_DISCLAIMER_EN =
  "Indicative display only. Not an exchange rate. SIM (₡) is the only unit used in product.";
