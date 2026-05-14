import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { Search, Loader2, ChevronDown, ChevronRight, Download } from "lucide-react";
import RlsSmokePanel from "@/components/admin/security/RlsSmokePanel";
import KeyRotationPanel from "@/components/admin/security/KeyRotationPanel";

type Row = {
  id: string;
  admin_id: string | null;
  action: string | null;
  target_type: string | null;
  target_id: string | null;
  payload: any;
  created_at: string;
};

export default function AdminAudit() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [hours, setHours] = useState(24);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("admin_audit_log" as any)
      .select("*")
      .gte("created_at", new Date(Date.now() - hours * 3600_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(500);
    if (actionFilter) query = query.ilike("action", `%${actionFilter}%`);
    const { data } = await query;
    setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, actionFilter]);

  useRealtimeChannel({
    key: "admin-audit-live",
    bindings: [{ event: "INSERT", table: "admin_audit_log" }],
    onEvent: (p) => {
      setRows((r) => [p.new as unknown as Row, ...r].slice(0, 500));
    },
  });

  const filtered = useMemo(() => {
    if (!q) return rows;
    const k = q.toLowerCase();
    return rows.filter(
      (r) =>
        (r.action ?? "").toLowerCase().includes(k) ||
        (r.target_type ?? "").toLowerCase().includes(k) ||
        (r.target_id ?? "").toLowerCase().includes(k) ||
        JSON.stringify(r.payload ?? {}).toLowerCase().includes(k),
    );
  }, [rows, q]);

  function downloadCsv() {
    const header = ["created_at", "admin_id", "action", "target_type", "target_id", "payload"].join(",");
    const body = filtered.map((r) =>
      [r.created_at, r.admin_id ?? "", r.action ?? "", r.target_type ?? "", r.target_id ?? "",
       `"${JSON.stringify(r.payload ?? {}).replace(/"/g, '""')}"`].join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `admin_audit_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-4 max-w-screen-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">관리자 감사 로그</h1>
        <p className="text-xs text-muted-foreground">모든 관리자 행위는 기록되며 실시간 갱신됩니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RlsSmokePanel />
        <KeyRotationPanel />
      </div>

      <div className="glass-strong neon-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="검색 (action, target, payload)"
              className="w-full bg-input/60 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs"
            />
          </div>
          <input
            value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            placeholder="action 필터 (e.g. admin_freeze)"
            className="bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs"
          />
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs">
            <option value={1}>1시간</option>
            <option value={24}>24시간</option>
            <option value={168}>7일</option>
            <option value={720}>30일</option>
          </select>
          <button onClick={load} className="px-3 py-1.5 rounded-xl glass text-xs font-bold">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "새로고침"}
          </button>
          <button onClick={downloadCsv} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>

        <div className="text-[11px] text-muted-foreground">총 {filtered.length}건</div>

        <div className="space-y-1.5 max-h-[60vh] overflow-auto">
          {filtered.map((r) => {
            const expanded = open === r.id;
            return (
              <div key={r.id} className="bg-input/30 rounded-lg">
                <button
                  onClick={() => setOpen(expanded ? null : r.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                    <span className="font-mono font-bold text-primary truncate">{r.action ?? "—"}</span>
                    {r.target_type && <span className="text-muted-foreground truncate">→ {r.target_type}</span>}
                    {r.target_id && <span className="font-mono text-[10px] text-muted-foreground truncate">{r.target_id.slice(0, 8)}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{new Date(r.created_at).toLocaleString("ko-KR")}</span>
                </button>
                {expanded && (
                  <pre className="text-[10px] bg-background/40 p-2 mx-2 mb-2 rounded overflow-auto max-h-60">
{JSON.stringify({ admin_id: r.admin_id, payload: r.payload }, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div className="text-xs text-muted-foreground py-8 text-center">조회 결과 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}
