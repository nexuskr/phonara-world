/**
 * Centralized helper to force a wallet/balance re-fetch immediately after any
 * RPC that changes the user's balance (mission/quest/attendance/trade/etc.).
 *
 * The `useWallet` hook listens to `wallet:refresh` and calls `reload()`.
 * This closes the gap between a successful RPC and the postgres_changes
 * realtime event (which can lag 0.5–2s).
 */
export function refreshWallet() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("wallet:refresh"));
}
