import { useState, type ReactNode, type MouseEvent } from "react";
import { useDB } from "@/lib/store";
import { isFlagOn } from "@/lib/conversion-flags";
import { track } from "@/lib/analytics";
import { track as trackTelemetry } from "@/lib/telemetry";
import UnlockWall from "./UnlockWall";

/**
 * Intercepts withdraw clicks for FREE/NORMAL tier users below the threshold and shows UnlockWall.
 * Otherwise the child onClick handler passes through untouched.
 */
export default function WithdrawIntentInterceptor({
  amount,
  children,
  onProceed,
}: {
  amount: number;
  children: (handle: (e: MouseEvent) => void) => ReactNode;
  onProceed?: () => void;
}) {
  const [db] = useDB();
  const [open, setOpen] = useState(false);

  const u = db.user;
  const tier = u?.tier ?? "NORMAL";
  // FREE/NORMAL users attempting withdraw → show wall (simple heuristic)
  const shouldIntercept =
    isFlagOn("withdrawIntercept") &&
    tier === "NORMAL" &&
    !u?.withdrawPw && // first withdraw attempt
    amount >= 10_000;

  function handle(e: MouseEvent) {
    if (!shouldIntercept) {
      onProceed?.();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    track("funnel_unlock_wall_shown", { tier, amount });
    void trackTelemetry("view", { surface: "withdraw_intent", meta: { tier, amount } });
    setOpen(true);
  }

  return (
    <>
      {children(handle)}
      {open && <UnlockWall amount={amount} onClose={() => setOpen(false)} />}
    </>
  );
}
