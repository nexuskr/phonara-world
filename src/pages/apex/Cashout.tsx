/**
 * /apex/cashout — P3-C Cross-Chain USDT cashout.
 */
import { Suspense, lazy } from "react";

const CashoutPanel = lazy(() => import("@/packages/apex/withdraw/CashoutPanel"));
const CashoutHistory = lazy(() => import("@/packages/apex/withdraw/CashoutHistory"));

export default function ApexCashoutPage() {
  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-black apex-gradient-text">CASHOUT</h1>
        <p className="text-sm text-muted-foreground">USDT TRC20 / ERC20 / BSC — Bybit/Binance 압도 속도 (p95 &lt; 5분).</p>
      </header>
      <Suspense fallback={<div className="text-sm text-muted-foreground">로딩…</div>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <CashoutPanel />
          <CashoutHistory />
        </div>
      </Suspense>
    </div>
  );
}
