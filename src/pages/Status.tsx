import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, ShieldCheck, AlertTriangle, Activity } from "lucide-react";

type StatusResp = {
  status: "operational" | "degraded" | "outage";
  uptime_24h: number;
  uptime_7d: number;
  p95_ms: number;
  last_check?: string;
  last_ok?: boolean;
  generated_at: string;
};

export default function Status() {
  const [s, setS] = useState<StatusResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/public-status`;
      const r = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setS(data);
    } catch (e: any) {
      setError(e?.message ?? "load failed");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    document.title = "Phonara Status — 실시간 운영 상태";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Phonara의 실시간 가동률·운영 상태(운영/저하/장애)를 한눈에 확인합니다.";
    if (meta) meta.setAttribute("content", desc); else {
      const el = document.createElement("meta"); el.name = "description"; el.content = desc;
      document.head.appendChild(el);
    }
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const tone = !s ? "muted" : s.status === "operational" ? "secondary" : s.status === "degraded" ? "gold" : "destructive";
  const label = !s ? "—" : s.status === "operational" ? "운영 정상" : s.status === "degraded" ? "성능 저하" : "장애 감지";
  const Icon = !s ? Activity : s.status === "operational" ? ShieldCheck : AlertTriangle;

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> 홈으로</Link>
        <button onClick={load} disabled={loading} className="text-xs text-primary inline-flex items-center gap-1">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> 새로고침
        </button>
      </header>
      <main className="container max-w-2xl pb-20">
        <h1 className="font-display font-black text-3xl sm:text-5xl text-center">Phonara Status</h1>
        <p className="text-center text-xs text-muted-foreground mt-2">실시간 가동률 · 1분마다 자동 갱신</p>

        <div className={`mt-10 glass-strong rounded-3xl p-8 border border-${tone}/40 text-center`}>
          <Icon className={`w-16 h-16 mx-auto text-${tone}`} />
          <div className={`mt-4 text-2xl font-display font-black text-${tone}`}>{label}</div>
          {s && <div className="mt-2 text-xs text-muted-foreground">최종 확인: {new Date(s.generated_at).toLocaleString("ko-KR")}</div>}
        </div>

        {error && (
          <div className="mt-4 glass rounded-2xl p-4 border border-destructive/40 text-destructive text-xs">⚠ {error}</div>
        )}

        {s && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Cell label="가동률 24h" value={`${s.uptime_24h.toFixed(2)}%`} />
            <Cell label="가동률 7d" value={`${s.uptime_7d.toFixed(2)}%`} />
            <Cell label="p95 지연" value={`${s.p95_ms}ms`} />
          </div>
        )}

        <div className="mt-10 text-center text-xs text-muted-foreground">
          상세 신뢰 지표는 <Link to="/trust" className="text-primary underline">/trust</Link> 에서 확인할 수 있습니다.
        </div>
      </main>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold text-lg mt-1 tabular-nums">{value}</div>
    </div>
  );
}
