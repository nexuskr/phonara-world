import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { KeyRound, Loader2 } from "lucide-react";

type Row = { id: string; rotated_at: string; key_kind: string; reason: string | null; notes: string | null; rotated_by: string | null; };
const KINDS = [
  { v: "service_role", l: "Service Role" },
  { v: "anon", l: "Anon" },
  { v: "jwt_secret", l: "JWT Secret" },
  { v: "other", l: "기타" },
];

export default function KeyRotationPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("service_role");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    const { data } = await supabase.from("service_key_rotations" as any).select("*").order("rotated_at", { ascending: false }).limit(50);
    setRows((data as any) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function logIt() {
    if (!reason || reason.length < 4) { notify.fail("사유 4자 이상"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_log_key_rotation" as any, { _kind: kind, _reason: reason, _notes: notes || null });
    setBusy(false);
    if (error) { notify.fail("기록 실패", error); return; }
    setReason(""); setNotes("");
    notify.success("키 회전 이력이 기록되었습니다");
    load();
  }

  return (
    <div className="glass-strong neon-border rounded-2xl p-4 space-y-3">
      <h3 className="font-display font-bold text-sm flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" /> 서비스 키 회전 로그
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs">
          {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
        </select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="사유 (4자 이상)" className="bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs" />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="비고" className="bg-input/60 border border-border rounded-xl px-3 py-1.5 text-xs" />
        <button onClick={logIt} disabled={busy} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} 기록
        </button>
      </div>

      <div className="space-y-1.5 max-h-80 overflow-auto">
        {rows.length === 0 ? <div className="text-xs text-muted-foreground py-4 text-center">기록 없음</div> :
          rows.map((r) => (
            <div key={r.id} className="text-xs bg-input/30 rounded-lg px-3 py-2 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold">{r.key_kind}</span>
                <span className="text-muted-foreground">{r.reason}</span>
                {r.notes && <span className="text-muted-foreground/70 text-[10px]">{r.notes}</span>}
              </div>
              <span className="text-[10px] text-muted-foreground">{new Date(r.rotated_at).toLocaleString("ko-KR")}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
