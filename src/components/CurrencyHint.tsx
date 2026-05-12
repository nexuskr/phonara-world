import { useTranslation } from "react-i18next";
import { formatAux, AUX_DISCLAIMER_EN } from "@/lib/currency";

/**
 * CurrencyHint — displays an auxiliary currency approximation next to a SIM (₡) value.
 * Renders nothing for ko (no aux currency).
 *
 * Usage:
 *   <span>1,000₡</span> <CurrencyHint sim={1000} />
 */
export default function CurrencyHint({
  sim,
  className = "",
}: {
  sim: number;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const aux = formatAux(sim, i18n.language);
  if (!aux) return null;
  return (
    <span
      className={`text-[10px] text-muted-foreground/70 ml-1 align-middle ${className}`}
      title={AUX_DISCLAIMER_EN}
    >
      ≈ {aux}
    </span>
  );
}
