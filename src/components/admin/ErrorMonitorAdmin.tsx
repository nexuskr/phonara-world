import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";

type ErrRow = {
  id: string; user_id: string | null; level: string; message: string;
  stack: string | null; url: string | null; user_agent: string | null;
  context: any; created_at: string;
};
type Stat = { bucket: string; level: string; cnt: number };

export default function ErrorMonitorAdmin() {
  const [hours, setHours] = useState(24);
  const [stats, setStats] = useState<Stat[]>([]);
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase.rpc("get_error_stats", { _hours: hours }),
      supabase.rpc("get_recent_errors", { _limit: 100 }),
    ]);
    setStats(((s.data as any[]) ?? []).map((x) => ({ bucket: x.bucket, level: x.level, cnt: Number(x.cnt) })));
    setRows((r.data as ErrRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [hours]);

  const totals = stats.reduce<Record<string, number>>((acc, s) => {
    acc[s.level] = (acc[s.level] || 0) + s.cnt;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="glass-strong neon-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" /> 운영 모니터링
          </h3>
          <div className="flex gap-2 items-center">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs"
            >
              <option value={1}>1시간</option>
              <option value={24}>24시간</option>
              <option value={168}>7일</option>
              <option value={720}>30일</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl glass text-xs font-bold flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> 새로고침
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="에러" v={totals.error ?? 0} tone="destructive" />
          <Stat label="경고" v={totals.warn ?? 0} tone="gold" />
          <Stat label="정보" v={totals.info ?? 0} tone="primary" />
        </div>
      </div>

      <div className="glass rounded-2xl p-3">
        <div className="text-xs font-bold mb-2 text-muted-foreground">최근 에러 100건</div>
        {rows.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">에러 없음 ✨</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="border border-border/40 rounded-xl p-2.5 text-xs">
                <button
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${r.level === "error" ? "text-destructive" : "text-gold"}`} />
                      <span className="font-mono truncate">{r.message}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(r.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  {r.url && <div className="text-[10px] text-muted-foreground mt-1 truncate">{r.url}</div>}
                </button>
                {openId === r.id && (
                  <pre className="mt-2 text-[10px] bg-background/60 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify({ user_id: r.user_id, ua: r.user_agent, context: r.context, stack: r.stack }, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, v, tone }: { label: string; v: number; tone: "destructive" | "gold" | "primary" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "gold" ? "text-gold" : "text-primary";
  return (
    <div className="glass rounded-xl p-3 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-display font-black text-xl ${cls}`}>{v}</div>
    </div>
  );
}
