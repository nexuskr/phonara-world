import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export function CoachV2Panel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("apex-coach-v2", { body: {} });
      if (error) throw error;
      setResult(data);
      if (data?.loss_protect_armed) notify.warning("Loss Protection 가동", { description: "위험도 임계치 초과" });
    } catch (e: any) { notify.error("Coach 응답 실패", e?.message ?? String(e)); }
    finally { setBusy(false); }
  };

  const risk = Number(result?.risk_score ?? 0);
  const riskColor = risk > 0.85 ? "text-destructive" : risk > 0.5 ? "text-yellow-500" : "text-primary";

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-primary/80">AI Coach v2</div>
          <div className="text-base font-bold">위험 진단 + 자동 보호</div>
        </div>
        <button onClick={run} disabled={busy} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "분석중…" : "진단"}
        </button>
      </div>
      {result && (
        <div className="mt-3 space-y-1 text-sm">
          <div className={`font-semibold ${riskColor}`}>Risk: {(risk * 100).toFixed(0)}%</div>
          <div className="text-muted-foreground">{result.recommendation}</div>
          <div className="text-xs text-muted-foreground">샘플 {result.sample_size} · 순익 {result.net_phon} PHON · {result.latency_ms}ms</div>
        </div>
      )}
    </div>
  );
}
