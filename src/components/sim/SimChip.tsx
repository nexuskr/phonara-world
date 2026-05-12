import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * SimChip — universal "Simulation" badge for ALL non-Real surfaces.
 * Hard constraint C1: SIM = sim-gold + permanent "시뮬레이션" + tooltip.
 *
 * Usage:
 *   <SimChip />                       // default 시뮬레이션 chip
 *   <SimChip variant="dot" />         // tiny 8px dot for inline placements
 *   <SimChip label="Empire Coin" />   // override label
 */
export function SimChip({
  variant = "chip",
  label = "시뮬레이션",
  className,
}: {
  variant?: "chip" | "dot";
  label?: string;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            data-sim-badge="true"
            className={cn(
              "inline-flex items-center gap-1 select-none align-middle",
              variant === "chip"
                ? "px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border bg-sim-gold/10 text-sim-gold border-sim-gold/40"
                : "h-2 w-2 rounded-full bg-sim-gold ring-2 ring-sim-gold/30",
              className,
            )}
            aria-label="Simulation only — not real currency"
          >
            {variant === "chip" ? label : null}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
          <strong className="block mb-0.5 text-sim-gold">Phonara Empire Simulator</strong>
          모든 ₡(Empire Coin) 활동은 시뮬레이션이며 실제 화폐가 아닙니다.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SimChip;
