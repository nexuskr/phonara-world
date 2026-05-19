/** ImperialPrimaryCta — pulsing primary action button shared across games. */
import { memo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  variant?: "gold" | "pink" | "duo";
  pulse?: boolean;
}

const VARIANT = {
  gold: "from-[hsl(var(--gold))] to-[hsl(var(--gold))]/80 shadow-[0_0_30px_hsla(45,90%,55%,0.45)]",
  pink: "from-[hsl(var(--pink))] to-[hsl(var(--pink))]/70 shadow-[0_0_30px_hsla(340,90%,55%,0.45)]",
  duo:  "from-[hsl(var(--gold))] to-[hsl(var(--pink))] shadow-[0_0_30px_hsla(45,90%,55%,0.5)]",
} as const;

function ImperialPrimaryCtaImpl({
  children, onClick, loading, loadingLabel = "처리 중…", disabled, variant = "gold", pulse,
}: Props) {
  if (loading) {
    return (
      <button disabled className="w-full h-14 rounded-xl bg-[hsl(var(--gold))]/70 text-background font-black text-lg flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> {loadingLabel}
      </button>
    );
  }
  if (pulse) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className={`w-full h-14 rounded-xl bg-gradient-to-r ${VARIANT[variant]} text-background font-black text-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}
      >
        {children}
      </motion.button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-14 rounded-xl bg-gradient-to-r ${VARIANT[variant]} text-background font-black text-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {children}
    </button>
  );
}

export const ImperialPrimaryCta = memo(ImperialPrimaryCtaImpl);
export default ImperialPrimaryCta;
