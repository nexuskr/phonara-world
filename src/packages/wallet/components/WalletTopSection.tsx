/**
 * WalletTopSection — Sprint 2 + Deposit v1.0 composition mounted at top of /wallet.
 * Bundles Dashboard + Deposit/Withdraw CTA grid + their modals + history lists.
 *
 * v15.2: StepUpGate(인라인 추가 인증)을 useWithdraw 에 주입 — TOTP 등록자에게도
 * "/security/totp 에서 등록해주세요" 가 잘못 노출되던 문제 해결.
 */
import WalletDashboard from "./WalletDashboard";
import WithdrawCard from "./WithdrawCard";
import WithdrawModal from "./WithdrawModal";
import WithdrawHistory from "./WithdrawHistory";
import DepositCard from "./DepositCard";
import DepositModal from "./DepositModal";
import DepositHistory from "./DepositHistory";
import { useWalletSnapshot } from "../hooks/useWalletSnapshot";
import { useWithdraw } from "../hooks/useWithdraw";
import { useDeposit } from "../hooks/useDeposit";
import { useStepUp } from "@/hooks/use-step-up";
import StepUpGate from "@/components/security/StepUpGate";

export default function WalletTopSection() {
  const snap = useWalletSnapshot();
  const { requireStepUp, dialogProps: stepUpProps } = useStepUp();
  const wd = useWithdraw({
    available: snap.available,
    minWithdraw: snap.minWithdraw,
    onSuccess: () => { void snap.reload(); },
    requireStepUp,
  });
  const dep = useDeposit({
    onSuccess: () => { void snap.reload(); },
  });

  return (
    <div className="space-y-4 mb-6">
      <WalletDashboard />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DepositCard onClick={dep.openModal} />
        <WithdrawCard onClick={wd.openModal} disabled={snap.available < snap.minWithdraw} />
      </div>
      <DepositHistory />
      <WithdrawHistory />
      <DepositModal ctl={dep} />
      <WithdrawModal available={snap.available} minWithdraw={snap.minWithdraw} ctl={wd} />
      <StepUpGate {...stepUpProps} />
    </div>
  );
}
