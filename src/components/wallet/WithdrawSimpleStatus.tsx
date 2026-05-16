/**
 * WithdrawSimpleStatus — 사용자 출금 큐 미니 요약
 * 기존 WithdrawQueueStatus의 풀 버전과 별도로, 한 줄 미니 카드만 보여준다.
 * 데이터 로딩/Realtime은 자체 supabase 호출 + useRealtimeChannel.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWalletChannel } from "@pkg/realtime";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

type Status = "pending" | "processing" | "approved" | "completed" | "rejected" | "cancelled";

interface MiniRow {
  id: string;
  amount: number;
  status: Status;
  created_at: string;
}

export default function WithdrawSimpleStatus() {
  const [uid, setUid] = useState<string | null>(null);
  const [row, setRow] = useState<MiniRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    setUid(u.user.id);

    const { data } = await supabase
      .from("withdrawal_requests")
      .select("id,amount,status,created_at")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setRow((data as MiniRow | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useWalletChannel({
    key: uid ? `wr-mini-${uid}` : "",
    bindings: uid ? [{ event: "*", table: "withdrawal_requests", filter: `user_id=eq.${uid}` }] : [],
    enabled: !!uid,
    onEvent: () => { void refresh(); },
    pollMs: 30_000,
    onPoll: () => { void refresh(); },
    resumeOnFocus: true,
  });

  if (loading) return <div className="glass rounded-xl h-10 animate-pulse mb-3" />;
  if (!row) return null;

  const Icon =
    row.status === "completed" ? CheckCircle2 :
    row.status === "rejected" || row.status === "cancelled" ? XCircle :
    Clock;

  const tone =
    row.status === "completed" ? "text-secondary" :
    row.status === "rejected" || row.status === "cancelled" ? "text-destructive" :
    "text-primary";

  return (
    <div className="glass rounded-xl border border-border/40 px-3 py-2 mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${tone}`} />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">최근 출금</span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${tone}`}>{row.status}</span>
      </div>
      <span className="font-display font-black text-sm text-money-strong tabular-nums">
        ₩{row.amount.toLocaleString()}
      </span>
    </div>
  );
}
