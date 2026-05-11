import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, Eye, Loader2, RefreshCw } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  level: number;
  status: string;
  selfie_path: string | null;
  doc_signed_at: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_reason: string | null;
  metadata: any;
  nickname?: string | null;
  total_withdrawn?: number;
}

export default function AMLAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from("aml_verifications").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) {
      toast({ title: "조회 실패", description: error.message, variant: "destructive" });
      setLoading(false); return;
    }
    const verifs = (data ?? []) as Row[];
    const ids = Array.from(new Set(verifs.map((v) => v.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id,nickname,total_withdrawn").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      verifs.forEach((v) => {
        const p = map.get(v.user_id);
        if (p) { v.nickname = p.nickname; v.total_withdrawn = p.total_withdrawn; }
      });
    }
    setRows(verifs);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [filter]);

  useEffect(() => {
    const ch = supabase
      .channel("admin:aml")
      .on("postgres_changes", { event: "*", schema: "public", table: "aml_verifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function preview(path: string | null) {
    if (!path) return;
    const { data, error } = await supabase.storage.from("aml").createSignedUrl(path, 300);
    if (error) { toast({ title: "미리보기 실패", description: error.message, variant: "destructive" }); return; }
    setPreviewUrl(data.signedUrl);
  }

  async function resolve(id: string, action: "approve" | "reject") {
    const reason = action === "reject" ? prompt("거절 사유?") : null;
    if (action === "reject" && !reason) return;
    setBusy(id);
    const { error } = await supabase.rpc("admin_resolve_aml", { _id: id, _action: action, _reason: reason });
    setBusy(null);
    if (error) { toast({ title: "처리 실패", description: error.message, variant: "destructive" }); return; }
    toast({ title: action === "approve" ? "✓ 승인" : "✕ 거절" });
    load();
  }

  const counts = {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-imperial text-xl font-black flex items-center gap-2">
          <ShieldCheck className="text-primary w-5 h-5" />
          AML 인증 결재
          {filter === "pending" && counts.pending > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-500 font-bold">
              {counts.pending} 대기중
            </span>
          )}
        </h2>
        <button onClick={load} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3.5 h-3.5" /> 새로고침
        </button>
      </div>

      <div className="flex gap-2 text-xs">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg font-bold ${
              filter === f ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
            }`}
          >
            {f === "pending" ? "대기" : f === "approved" ? "승인" : f === "rejected" ? "거절" : "전체"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">기록 없음</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl glass border border-border/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{r.nickname ?? r.user_id.slice(0, 8)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase ${
                      r.level === 3 ? "bg-rose-500/20 text-rose-400" :
                      r.level === 2 ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>L{r.level}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      r.status === "approved" ? "bg-emerald-500/20 text-emerald-400" :
                      r.status === "rejected" ? "bg-rose-500/20 text-rose-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>{r.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>제출: {new Date(r.created_at).toLocaleString()}</span>
                    {r.total_withdrawn != null && <span>누적 출금: ₩{r.total_withdrawn.toLocaleString()}</span>}
                    {r.doc_signed_at && <span>📝 서류 서명</span>}
                  </div>
                  {r.rejected_reason && <div className="text-xs text-rose-400 mt-1">사유: {r.rejected_reason}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.selfie_path && (
                    <button
                      onClick={() => preview(r.selfie_path)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-primary flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> 셀카
                    </button>
                  )}
                  {r.status === "pending" && (
                    <>
                      <button
                        disabled={busy === r.id}
                        onClick={() => resolve(r.id, "approve")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        disabled={busy === r.id}
                        onClick={() => resolve(r.id, "reject")}
                        className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                      >
                        거절
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <img src={previewUrl} alt="AML 셀피" className="max-w-full max-h-full rounded-xl" loading="lazy" decoding="async" />
          <div className="absolute top-4 right-4 text-white text-xs bg-black/50 px-3 py-1 rounded">클릭하여 닫기</div>
        </div>
      )}
    </div>
  );
}
