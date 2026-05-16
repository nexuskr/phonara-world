/**
 * DepositHistory — 최근 5건. pending top + updated_at DESC + Warm Gold active badge + timeline.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { g } from "@pkg/core/i18n/glossary";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";
import { useWalletChannel } from "@pkg/realtime";
import DepositTimeline, { statusToStage } from "./DepositTimeline";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  method: string | null;
  amount: number;
  status: string;
  created_at: string;
  updated_at?: string | null;
}

const ACTIVE = new Set(["pending", "awaiting_payment", "matching", "manual_review", "intent_created"]);

async function fetchRows(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("deposit_requests")
    .select("id, method, amount, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data as Row[]) ?? [];
}

function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const aA = ACTIVE.has(a.status) ? 0 : 1;
    const bA = ACTIVE.has(b.status) ? 0 : 1;
    if (aA !== bA) return aA - bA;
    const aT = new Date(a.updated_at ?? a.created_at).getTime();
    const bT = new Date(b.updated_at ?? b.created_at).getTime();
    return bT - aT;
  }).slice(0, 5);
}

function statusLabel(s: string): string {
  if (s === "filled" || s === "completed" || s === "approved") return g("depositStatusFilled");
  if (s === "expired" || s === "rejected" || s === "failed") return g("depositStatusExpired");
  if (s === "manual_review") return g("depositStatusReview");
  return g("depositStatusPending");
}

function statusTone(s: string): string {
  if (s === "filled" || s === "completed" || s === "approved") return "text-emerald-300 border-emerald-400/40 bg-emerald-400/10";
  if (s === "expired" || s === "rejected" || s === "failed") return "text-rose-300 border-rose-400/40 bg-rose-400/10";
  if (s === "manual_review") return "text-amber-300 border-amber-400/40 bg-amber-400/10";
  return "text-amber-300 border-amber-400/40 bg-amber-400/10";
}

export default function DepositHistory() {
  const [rows, setRows] = useState<Row[] | null>(null);

  const reload = () => { void fetchRows().then(r => setRows(sortRows(r))); };

  useEffect(() => { reload(); }, []);
  useEffect(() => {
    const onRefresh = () => reload();
    window.addEventListener("wallet:refresh", onRefresh);
    return () => window.removeEventListener("wallet:refresh", onRefresh);
  }, []);

  useWalletChannel({
    key: "wallet:deposit_history",
    bindings: [
      { event: "*", schema: "public", table: "deposit_requests" },
      { event: "UPDATE", schema: "public", table: "crypto_deposit_intents" },
    ],
    onEvent: reload,
    pollMs: 60_000,
    onPoll: reload,
    resumeOnFocus: true,
  });

  if (rows === null) {
    return (
      <section className="rounded-2xl border border-border/40 glass p-4">
        <h3 className="text-sm font-black mb-2">{g("depositHistoryTitle")}</h3>
        <LoadingList rows={3} />
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-border/40 glass p-4">
        <h3 className="text-sm font-black mb-2">{g("depositHistoryTitle")}</h3>
        <EmptyState icon={<Inbox className="w-6 h-6" />} title={g("depositHistoryEmpty")} />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border/40 glass p-4 space-y-3">
      <h3 className="text-sm font-black">{g("depositHistoryTitle")}</h3>
      <ul className="space-y-2">
        {rows.map(r => {
          const active = ACTIVE.has(r.status);
          const stage = statusToStage(r.status);
          return (
            <li
              key={r.id}
              className={cn(
                "rounded-xl border p-3 space-y-2",
                active ? "border-amber-400/60 bg-amber-400/5" : "border-border/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-black tabular-nums">{Number(r.amount).toLocaleString()} PHON</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(r.updated_at ?? r.created_at).toLocaleString()} · {r.method ?? "-"}
                  </div>
                </div>
                <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-full border", statusTone(r.status))}>
                  {active && <span className="mr-1">●</span>}
                  {statusLabel(r.status)}
                </span>
              </div>
              <DepositTimeline stage={stage} compact />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
