/**
 * P3-C — Cashout history (realtime via useWalletChannel).
 */
import { useMyCashouts } from "./useApexCashout";
import { GlowCard } from "@/packages/apex/components/GlowCard";

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300",
  processing: "text-cyan-300",
  completed: "text-emerald-300",
  failed: "text-rose-400",
  cancelled: "text-muted-foreground",
};

export function CashoutHistory() {
  const { data } = useMyCashouts(20);
  return (
    <GlowCard>
      <div className="p-5">
        <div className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">최근 출금</div>
        <div className="max-h-[420px] overflow-auto rounded border border-white/5">
          <table className="w-full text-xs">
            <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-muted-foreground sticky top-0">
              <tr><th className="px-2 py-2 text-left">net</th><th className="px-2 py-2 text-right">amt</th><th className="px-2 py-2 text-left">status</th><th className="px-2 py-2 text-left">tx</th></tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-2 py-2">{r.network}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.amount_usdt.toFixed(2)}</td>
                  <td className={`px-2 py-2 ${STATUS_TONE[r.status] ?? ""}`}>{r.status}</td>
                  <td className="px-2 py-2 truncate max-w-[120px] text-muted-foreground">{r.tx_hash ?? "—"}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="px-2 py-6 text-center text-muted-foreground">출금 내역이 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </GlowCard>
  );
}

export default CashoutHistory;
