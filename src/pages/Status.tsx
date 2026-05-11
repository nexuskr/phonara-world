import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation("status");
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
    document.title = t("docTitle");
    const meta = document.querySelector('meta[name="description"]');
    const desc = t("docDesc");
    if (meta) meta.setAttribute("content", desc); else {
      const el = document.createElement("meta"); el.name = "description"; el.content = desc;
      document.head.appendChild(el);
    }
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const tone = !s ? "muted" : s.status === "operational" ? "secondary" : s.status === "degraded" ? "gold" : "destructive";
  const label = !s ? "—" : s.status === "operational" ? t("operational") : s.status === "degraded" ? t("degraded") : t("outage");
  const Icon = !s ? Activity : s.status === "operational" ? ShieldCheck : AlertTriangle;
  const locale = i18n.language === "en" ? "en-US" : "ko-KR";

  return (
    <div className="min-h-screen bg-background">
      <header className="container py-6 flex items-center justify-between">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 min-h-[36px]"><ArrowLeft className="w-3.5 h-3.5" /> {t("home")}</Link>
        <button onClick={load} disabled={loading} className="text-xs text-primary inline-flex items-center gap-1 min-h-[36px] px-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {t("refresh")}
        </button>
      </header>
      <main className="container max-w-2xl pb-20">
        <h1 className="font-imperial font-black text-3xl sm:text-5xl text-center tracking-[0.04em]">Phonara Status</h1>
        <p className="text-center text-xs text-muted-foreground mt-2 break-keep">{t("sub")}</p>

        <div className={`mt-10 glass-strong rounded-3xl p-6 sm:p-8 border border-${tone}/40 text-center`}>
          <Icon className={`w-16 h-16 mx-auto text-${tone}`} />
          <div className={`mt-4 text-2xl sm:text-3xl font-imperial font-black text-${tone} tracking-[0.04em]`}>{label}</div>
          {s && <div className="mt-2 text-xs text-muted-foreground tabular-nums">{t("lastChecked")}: {new Date(s.generated_at).toLocaleString(locale)}</div>}
        </div>

        {error && (
          <div className="mt-4 glass rounded-2xl p-4 border border-destructive/40 text-destructive text-xs">⚠ {error}</div>
        )}

        {s && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Cell label={t("uptime24")} value={`${(s.uptime_24h ?? 0).toFixed(2)}%`} />
            <Cell label={t("uptime7d")} value={`${(s.uptime_7d ?? 0).toFixed(2)}%`} />
            <Cell label={t("p95")} value={`${s.p95_ms ?? 0}ms`} />
          </div>
        )}

        <div className="mt-10 text-center text-xs text-muted-foreground break-keep">
          {t("detailHint1")}{t("detailHint2")}
        </div>
      </main>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4 text-center">
      <div className="text-[10px] text-muted-foreground break-keep">{label}</div>
      <div className="font-imperial font-bold text-lg mt-1 tabular-nums text-money-strong">{value}</div>
    </div>
  );
}
