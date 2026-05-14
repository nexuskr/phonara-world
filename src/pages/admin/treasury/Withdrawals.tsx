/**
 * /admin/treasury/withdrawals — 통합 페이지
 * 상단: WithdrawStatsWidget · WithdrawQueueTable (큐 가시성)
 * 하단: WithdrawRequestsAdmin (기존 처리 콘솔)
 */
import { lazy, Suspense } from "react";
import WithdrawStatsWidget from "@/components/admin/treasury/WithdrawStatsWidget";
import WithdrawQueueTable from "@/components/admin/treasury/WithdrawQueueTable";
import { LoadingList } from "@/components/ui/loading-state";

const WithdrawRequestsAdmin = lazy(() => import("@/components/admin/WithdrawRequestsAdmin"));

export default function AdminTreasuryWithdrawals() {
  return (
    <div className="space-y-4">
      <WithdrawStatsWidget />
      <WithdrawQueueTable />
      <Suspense fallback={<LoadingList rows={4} />}>
        <WithdrawRequestsAdmin />
      </Suspense>
    </div>
  );
}
