import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useWalletChannel } from "@pkg/realtime";
import { g } from "@pkg/core/i18n/glossary";
import { formatFromPhon } from "@/lib/displayCurrency";

type Row = {
  id: string; amount: number; method: string; status: string;
  created_at: string; tx_code: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "historyStatusPending",
  processing: "historyStatusProcessing",
  approved: "historyStatusProcessing",
  completed: "historyStatusCompleted",
  rejected: "historyStatusFailed",
  cancelled: "historyStatusFailed",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-200 border-amber-400/40",
  processing: "bg-sky-500/15 text-sky-200 border-sky-400/40",
  approved: "bg-sky-500/15 text-sky-200 border-sky-400/40",
  completed: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40",
  rejected: "bg-pink-500/15 text-pink-200 border-pink-400/40",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export default function WithdrawHistory() {
  const user = useRequireAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("id,amount,method,status,created_at,tx_code")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (!alive) return;
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  useWalletChannel({
    key: user?.id ? `wallet-history:${user.id}` : "",
    bindings: user?.id ? [{ event: "*", table: "withdrawal_requests", filter: `user_id=eq.${user.id}` }] : [],
    onEvent: async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("withdrawal_requests")
        .select("id,amount,method,status,created_at,tx_code")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRows((data ?? []) as Row[]);
    },
    enabled: !!user?.id,
  });

  return (
    <section className="rounded-2xl glass-strong border border-border/40 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black tracking-wider uppercase text-muted-foreground">
          {g("historyTitle")}
        </h2>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">{g("historyEmpty")}</div>
      ) : (
        <ul className="divide-y divide-border/40">
          {rows.map(r => {
            const tone = STATUS_TONE[r.status] ?? STATUS_TONE.pending;
            const labelKey = STATUS_LABEL[r.status] ?? "historyStatusPending";
            return (
              <li key={r.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="font-black text-base tabular-nums text-foreground">
                    {Math.floor(Number(r.amount)).toLocaleString()} <span className="text-xs text-muted-foreground font-bold">PHON</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {g("walletKrwApprox")} {formatFromPhon(Number(r.amount), "KRW")} · {new Date(r.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${tone}`}>
                  {g(labelKey as any)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
