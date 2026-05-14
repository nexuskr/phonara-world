import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { Shield, ShieldCheck, ShieldX, Loader2 } from "lucide-react";

interface Result { test: string; pass: boolean; count?: number; anon_grants?: number; }

export default function RlsSmokePanel() {
  const [results, setResults] = useState<Result[] | null>(null);
  const [running, setRunning] = useState(false);
  const [runAt, setRunAt] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    const { data, error } = await supabase.rpc("admin_run_rls_smoke" as any);
    setRunning(false);
    if (error) { notify.fail("실행 실패", error); return; }
    const d = data as any;
    setResults(d?.results ?? []);
    setRunAt(d?.run_at ?? null);
    const failed = (d?.results ?? []).filter((r: Result) => !r.pass).length;
    if (failed === 0) notify.success("RLS 스모크 테스트 통과");
    else notify.fail(`${failed}건 실패 — 확인 필요`);
  }

  return (
    <div className="glass-strong neon-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> RLS 스모크 테스트
        </h3>
        <button
          onClick={run} disabled={running}
          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 disabled:opacity-50"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} 실행
        </button>
      </div>
      {runAt && (
        <div className="text-[11px] text-muted-foreground">최근 실행: {new Date(runAt).toLocaleString("ko-KR")}</div>
      )}
      <div className="space-y-1.5">
        {(results ?? []).map((r) => (
          <div key={r.test} className="flex items-center justify-between text-xs bg-input/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              {r.pass
                ? <ShieldCheck className="w-3.5 h-3.5 text-success" />
                : <ShieldX className="w-3.5 h-3.5 text-destructive" />}
              <span className="font-mono">{r.test}</span>
            </div>
            <span className={`font-bold ${r.pass ? "text-success" : "text-destructive"}`}>
              {r.pass ? "PASS" : "FAIL"}
              {r.count !== undefined ? ` · ${r.count}` : ""}
              {r.anon_grants !== undefined ? ` · anon=${r.anon_grants}` : ""}
            </span>
          </div>
        ))}
        {!results && (
          <div className="text-xs text-muted-foreground">아직 실행하지 않았습니다.</div>
        )}
      </div>
    </div>
  );
}
