import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, ShieldAlert, Check, CheckCheck } from "lucide-react";
import { notify } from "@/lib/notify";

type ErrRow = {
  id: string; user_id: string | null; level: string; message: string;
  stack: string | null; url: string | null; user_agent: string | null;
  context: any; created_at: string;
  resolved_at?: string | null; resolved_by?: string | null;
};
type Stat = { bucket: string; level: string; cnt: number };

export default function ErrorMonitorAdmin() {
  const [hours, setHours] = useState(24);
  const [stats, setStats] = useState<Stat[]>([]);
  const [rows, setRows] = useState<ErrRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase.rpc("get_error_stats", { _hours: hours }),
      supabase.rpc("admin_get_recent_errors" as any, { _limit: 100, _only_unresolved: onlyUnresolved }),
    ]);
    setStats(((s.data as any[]) ?? []).map((x) => ({ bucket: x.bucket, level: x.level, cnt: Number(x.cnt) })));
    setRows((r.data as ErrRow[]) ?? []);
    setSelected(new Set());
    setLoading(false);
  }, [hours, onlyUnresolved]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resolve = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_resolve_errors" as any, { _ids: ids, _note: null });
    setBusy(false);
    if (error) { notify.fail("처리 실패", error); return; }
    notify.success(`${data ?? ids.length}건 처리 완료`);
    await load();
  }, [load]);

  const totals = stats.reduce<Record<string, number>>((acc, s) => {
    acc[s.level] = (acc[s.level] || 0) + s.cnt;
    return acc;
  }, {});

  const allUnresolvedIds = rows.filter((r) => !r.resolved_at).map((r) => r.id);

  return (
    <div className="space-y-4">
      <div className="glass-strong neon-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" /> 운영 모니터링
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={onlyUnresolved}
                onChange={(e) => setOnlyUnresolved(e.target.checked)}
                className="accent-primary"
              />
              미처리만
            </label>
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
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-muted-foreground">
            최근 {onlyUnresolved ? "미처리" : "전체"} 에러 {rows.length}건
            {selected.size > 0 && <span className="ml-2 text-primary">· {selected.size}건 선택</span>}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => resolve([...selected])}
              disabled={busy || selected.size === 0}
              className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
            >
              <Check className="w-3 h-3" /> 선택 처리
            </button>
            <button
              onClick={() => {
                if (allUnresolvedIds.length === 0) return;
                if (!confirm(`현재 보이는 미처리 ${allUnresolvedIds.length}건 모두 처리할까요?`)) return;
                resolve(allUnresolvedIds);
              }}
              disabled={busy || allUnresolvedIds.length === 0}
              className="px-2.5 py-1 rounded-lg glass text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
            >
              <CheckCheck className="w-3 h-3" /> 모두 처리
            </button>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">에러 없음 ✨</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {rows.map((r) => {
              const resolved = !!r.resolved_at;
              return (
                <div
                  key={r.id}
                  className={`border rounded-xl p-2.5 text-xs ${
                    resolved ? "border-border/20 opacity-60" : "border-border/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!resolved && (
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="mt-1 accent-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <button
                      onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      className="flex-1 text-left min-w-0"
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
                      {resolved && (
                        <div className="text-[10px] text-primary mt-1">
                          ✓ 처리 완료 · {new Date(r.resolved_at!).toLocaleString("ko-KR")}
                        </div>
                      )}
                    </button>
                    {!resolved && (
                      <button
                        onClick={() => resolve([r.id])}
                        disabled={busy}
                        className="px-2 py-1 rounded-lg bg-primary/15 text-primary text-[10px] font-bold shrink-0 hover:bg-primary/25 disabled:opacity-40"
                      >
                        처리
                      </button>
                    )}
                  </div>
                  {openId === r.id && (
                    <pre className="mt-2 text-[10px] bg-background/60 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
{JSON.stringify({ user_id: r.user_id, ua: r.user_agent, context: r.context, stack: r.stack }, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
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
