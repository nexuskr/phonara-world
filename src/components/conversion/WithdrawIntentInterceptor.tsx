import { useState, type ReactNode, type MouseEvent } from "react";
import { useDB } from "@/lib/store";
import { isFlagOn } from "@/lib/conversion-flags";
import { track } from "@/lib/analytics";
import UnlockWall from "./UnlockWall";

/**
 * FREE/NORMAL 등급 + 잔액 임계 미만일 때 출금 클릭을 가로채서 UnlockWall을 띄움.
 * 그 외에는 자식 onClick 그대로 통과.
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
  // FREE/NORMAL 유저가 출금 시도 시 → wall 표시 (간단한 휴리스틱)
  const shouldIntercept =
    isFlagOn("withdrawIntercept") &&
    tier === "NORMAL" &&
    !u?.withdrawPw && // 첫 출금 시도
    amount >= 10_000;

  function handle(e: MouseEvent) {
    if (!shouldIntercept) {
      onProceed?.();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    track("funnel_unlock_wall_shown", { tier, amount });
    setOpen(true);
  }

  return (
    <>
      {children(handle)}
      {open && <UnlockWall amount={amount} onClose={() => setOpen(false)} />}
    </>
  );
}
