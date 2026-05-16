import { ArrowUpToLine, Clock3 } from "lucide-react";
import { g } from "@pkg/core/i18n/glossary";

export default function DepositCard({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full min-h-[88px] rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-500 text-white font-black px-5 py-5 flex items-center gap-4 shadow-[0_8px_32px_hsl(320_100%_55%/0.35)] hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none"
      aria-label={g("depositNow")}
    >
      <span className="shrink-0 rounded-full bg-white/15 p-3">
        <ArrowUpToLine className="w-6 h-6" />
      </span>
      <span className="flex-1 text-left">
        <span className="block text-xl sm:text-2xl font-black tracking-tight">{g("depositNow")}</span>
        <span className="block text-xs font-bold opacity-90 mt-0.5">{g("depositCtaSub")}</span>
      </span>
      <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
        <Clock3 className="w-3.5 h-3.5" /> {g("depositAvgTime")}
      </span>
    </button>
  );
}
