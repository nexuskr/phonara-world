/**
 * Phonara Pay (TRC20) — admin operations console.
 * Reads crypto_deposit_intents directly (admin RLS allows ALL).
 */
import { useEffect, useState, useMemo, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActionTable } from "@/components/admin/ActionTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Send } from "lucide-react";
import { notify } from "@/lib/notify";

type Intent = {
  id: string;
  user_id: string;
  network: string;
  asset: string;
  receive_address: string;
  requested_amount: number;
  unique_amount: number;
  status: "pending" | "filled" | "expired" | "canceled";
  matched_tx_hash: string | null;
  matched_at: string | null;
  expires_at: string;
  created_at: string;
};

type Filter = "pending" | "filled" | "expired" | "all";

const statusTone: Record<Intent["status"], string> = {
  pending:  "bg-gold/15 text-gold border-gold/30",
  filled:   "bg-secondary/15 text-secondary border-secondary/30",
  expired:  "bg-muted text-muted-foreground border-border",
  canceled: "bg-destructive/10 text-destructive border-destructive/30",
};

function PayConsoleBase() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("crypto_deposit_intents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) notify.fail("Pay 데이터 로드 실패", error);
    else setRows((data ?? []) as Intent[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin:pay")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crypto_deposit_intents" },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const stats = useMemo(() => {
    const last24 = Date.now() - 24 * 3600 * 1000;
    const recent = rows.filter((r) => new Date(r.created_at).getTime() > last24);
    const filled24 = recent.filter((r) => r.status === "filled");
    const usdt24 = filled24.reduce((a, r) => a + Number(r.unique_amount ?? 0), 0);
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      filled24: filled24.length,
      usdt24,
      conversion:
        recent.length === 0 ? 0 : Math.round((filled24.length / recent.length) * 100),
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-secondary" />
          <h1 className="font-display font-black text-xl">Phonara Pay (TRC20)</h1>
        </div>
        <div className="ml-auto flex gap-1">
          {(["pending", "filled", "expired", "all"] as Filter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} aria-label="새로고침">
            <RefreshCw className={loading ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="대기 중" value={stats.pending} tone="gold" />
        <Kpi label="24h 매칭" value={stats.filled24} />
        <Kpi label="24h USDT" value={stats.usdt24.toLocaleString()} />
        <Kpi label="24h 매칭율" value={`${stats.conversion}%`} />
      </div>

      <ActionTable<Intent>
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="해당 상태의 intent 없음"
        emptyDescription="다른 필터를 선택해 보세요."
        columns={[
          {
            key: "status",
            header: "상태",
            cell: (r) => (
              <Badge variant="outline" className={statusTone[r.status]}>
                {r.status}
              </Badge>
            ),
          },
          {
            key: "amount",
            header: "USDT",
            align: "right",
            cell: (r) => (
              <div className="text-right tabular-nums">
                <div className="font-bold">{Number(r.unique_amount).toFixed(4)}</div>
                <div className="text-[10px] text-muted-foreground">
                  req {Number(r.requested_amount).toFixed(2)}
                </div>
              </div>
            ),
          },
          {
            key: "addr",
            header: "수신 주소",
            cell: (r) => (
              <span className="font-mono text-[10px] text-muted-foreground truncate block max-w-[120px]">
                {r.receive_address.slice(0, 6)}…{r.receive_address.slice(-6)}
              </span>
            ),
          },
          {
            key: "tx",
            header: "TX",
            cell: (r) =>
              r.matched_tx_hash ? (
                <a
                  href={`https://tronscan.org/#/transaction/${r.matched_tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] text-primary underline"
                >
                  {r.matched_tx_hash.slice(0, 8)}…
                </a>
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              ),
          },
          {
            key: "user",
            header: "유저",
            cell: (r) => (
              <span className="font-mono text-[10px] text-muted-foreground">
                {r.user_id.slice(0, 8)}
              </span>
            ),
          },
          {
            key: "exp",
            header: "만료/매칭",
            align: "right",
            cell: (r) => (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {r.matched_at
                  ? `매칭 ${new Date(r.matched_at).toLocaleString("ko-KR")}`
                  : `만료 ${new Date(r.expires_at).toLocaleString("ko-KR")}`}
              </span>
            ),
          },
        ]}
        disableBulk
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "gold";
}) {
  return (
    <div className="glass-strong rounded-xl border border-border/40 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
        {label}
      </div>
      <div
        className={
          "font-display font-black text-xl mt-1 tabular-nums " +
          (tone === "gold" ? "text-gradient-gold" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}

export default memo(PayConsoleBase);
