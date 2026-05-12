import { useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Plus, RefreshCw, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";

type Invite = {
  id: string;
  code: string;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
};

export default function BetaInvitesAdmin() {
  const [rows, setRows] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState("BETA");
  const [maxUses, setMaxUses] = useState(1);
  const [expDays, setExpDays] = useState(30);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_beta_invites");
    if (!error && data) setRows(data as unknown as Invite[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    setCreating(true);
    const { data, error } = await supabase.rpc("generate_beta_invite", {
      _prefix: prefix.trim() || "BETA",
      _max_uses: Math.max(1, Math.min(10000, Number(maxUses) || 1)),
      _expires_in_days: Number(expDays) || 0,
      _note: note.trim() || null,
    });
    setCreating(false);
    if (error) { notify.error("발급 실패: " + error.message); return; }
    const code = (data as { code?: string })?.code;
    if (code) {
      navigator.clipboard?.writeText(code).catch(() => {});
      notify.success(`발급 완료 (${code}) — 클립보드에 복사됨`);
    }
    setNote("");
    void load();
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {});
    notify.success(`${code} 복사됨`);
  }

  const totalIssued = rows.length;
  const totalUses = rows.reduce((s, r) => s + r.uses, 0);
  const totalCap = rows.reduce((s, r) => s + r.max_uses, 0);

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <KPI label="발급 코드" value={totalIssued.toLocaleString("ko-KR")} />
        <KPI label="사용 횟수" value={totalUses.toLocaleString("ko-KR")} />
        <KPI label="총 좌석" value={totalCap.toLocaleString("ko-KR")} highlight />
      </div>

      <div className="glass-strong rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-secondary" />
          <h3 className="font-imperial font-bold text-sm tracking-[0.04em]">새 베타 코드 발급</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Input placeholder="접두사" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={12} />
          <Input type="number" placeholder="최대 사용" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} min={1} max={10000} />
          <Input type="number" placeholder="만료(일)" value={expDays} onChange={(e) => setExpDays(Number(e.target.value))} min={0} />
          <Input placeholder="메모(선택)" value={note} onChange={(e) => setNote(e.target.value)} className="sm:col-span-1" />
          <Button onClick={create} disabled={creating} className="font-imperial">
            {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1" />}
            발급
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">만료(일) = 0 입력 시 무기한.</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          <h3 className="font-imperial font-bold text-sm tracking-[0.04em]">발급 내역</h3>
        </div>
        <Button onClick={load} variant="ghost" size="sm">
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
        </Button>
      </div>

      {loading ? (
        <LoadingList rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState title="발급된 코드가 없습니다" description="위에서 첫 베타 코드를 생성하세요." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="text-left p-3">코드</th>
                <th className="text-right p-3">사용 / 한도</th>
                <th className="text-left p-3">만료</th>
                <th className="text-left p-3">메모</th>
                <th className="text-right p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const exhausted = r.uses >= r.max_uses;
                const expired = r.expires_at && new Date(r.expires_at) < new Date();
                return (
                  <tr key={r.id} className="border-t border-border/40">
                    <td className="p-3 font-mono tabular-nums tracking-wider">{r.code}</td>
                    <td className="p-3 text-right tabular-nums">
                      <span className={exhausted ? "text-destructive" : "text-foreground"}>{r.uses}</span>
                      <span className="text-muted-foreground"> / {r.max_uses}</span>
                    </td>
                    <td className="p-3 tabular-nums">
                      {r.expires_at ? (
                        <span className={expired ? "text-destructive" : "text-foreground/80"}>
                          {new Date(r.expires_at).toLocaleDateString("ko-KR")}
                        </span>
                      ) : <span className="text-muted-foreground">무기한</span>}
                    </td>
                    <td className="p-3 text-muted-foreground truncate max-w-[200px]">{r.note ?? "—"}</td>
                    <td className="p-3 text-right">
                      <Button onClick={() => copy(r.code)} size="sm" variant="ghost">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function KPI({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-imperial font-bold text-base mt-1 tabular-nums ${highlight ? "text-money-strong" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
