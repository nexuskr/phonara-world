import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, MousePointerClick, Eye, X, CheckCircle2, Filter } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

type EventRow = {
  id: string;
  event_type: "view" | "cta_click" | "dismiss" | "convert";
  surface: string;
  variant: string;
  created_at: string;
};

const RANGES = [
  { id: "1d", label: "24h", hours: 24 },
  { id: "7d", label: "7d", hours: 24 * 7 },
  { id: "30d", label: "30d", hours: 24 * 30 },
] as const;

type RangeId = typeof RANGES[number]["id"];

const ICONS = {
  view: Eye,
  cta_click: MousePointerClick,
  dismiss: X,
  convert: CheckCircle2,
};

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

export default function FunnelAnalytics() {
  const [range, setRange] = useState<RangeId>("1d");
  const [surfaceFilter, setSurfaceFilter] = useState<string>("__all__");
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const hours = RANGES.find(r => r.id === range)!.hours;
      const since = new Date(Date.now() - hours * 3_600_000).toISOString();
      const { data } = await supabase
        .from("conversion_events")
        .select("id,event_type,surface,variant,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!alive) return;
      setRows((data ?? []) as EventRow[]);
      setLoading(false);
    }
    void load();
    const ch = supabase
      .channel("admin:conversion_events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversion_events" },
        (p) => setRows((prev) => [p.new as EventRow, ...prev].slice(0, 5000)),
      )
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [range]);

  const surfaces = useMemo(() => {
    const set = new Set(rows.map(r => r.surface));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return surfaceFilter === "__all__" ? rows : rows.filter(r => r.surface === surfaceFilter);
  }, [rows, surfaceFilter]);

  const counts = useMemo(() => {
    const c = { view: 0, cta_click: 0, dismiss: 0, convert: 0 };
    for (const r of filtered) c[r.event_type]++;
    return c;
  }, [filtered]);

  const bySurface = useMemo(() => {
    const m: Record<string, { surface: string; view: number; cta_click: number; dismiss: number; convert: number }> = {};
    for (const r of rows) {
      if (!m[r.surface]) m[r.surface] = { surface: r.surface, view: 0, cta_click: 0, dismiss: 0, convert: 0 };
      m[r.surface][r.event_type]++;
    }
    return Object.values(m).sort((a, b) => b.view - a.view);
  }, [rows]);

  const variantBreakdown = useMemo(() => {
    if (surfaceFilter === "__all__") return [];
    const m: Record<string, { variant: string; view: number; cta_click: number; convert: number }> = {};
    for (const r of filtered) {
      if (!m[r.variant]) m[r.variant] = { variant: r.variant, view: 0, cta_click: 0, convert: 0 };
      if (r.event_type === "view") m[r.variant].view++;
      if (r.event_type === "cta_click") m[r.variant].cta_click++;
      if (r.event_type === "convert") m[r.variant].convert++;
    }
    return Object.values(m).sort((a, b) => b.view - a.view);
  }, [filtered, surfaceFilter]);

  const ctr = pct(counts.cta_click, counts.view);
  const cvr = pct(counts.convert, counts.view);
  const ctc = pct(counts.convert, counts.cta_click);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="glass-strong rounded-2xl p-4 neon-border flex flex-wrap items-center gap-2">
        <Activity className="w-4 h-4 text-gold" />
        <span className="text-xs font-bold mr-2">전환 깔때기</span>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.id} onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${range === r.id ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select value={surfaceFilter} onChange={(e) => setSurfaceFilter(e.target.value)}
            className="bg-input/60 border border-border rounded-lg px-2 py-1.5 text-xs">
            <option value="__all__">모든 surface</option>
            {surfaces.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Funnel KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["view", "cta_click", "dismiss", "convert"] as const).map(k => {
          const Icon = ICONS[k];
          return (
            <div key={k} className="glass-strong rounded-2xl p-4">
              <Icon className="w-4 h-4 text-gold" />
              <div className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">{k}</div>
              <div className="font-display font-black text-2xl mt-0.5 tabular-nums">{counts[k].toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* Conversion rates */}
      <div className="grid grid-cols-3 gap-3">
        <Rate label="CTR" sub="view → click" value={ctr} />
        <Rate label="CVR" sub="view → convert" value={cvr} accent />
        <Rate label="C2C" sub="click → convert" value={ctc} />
      </div>

      {/* By-surface chart */}
      <div className="glass-strong rounded-2xl p-4 neon-border">
        <h3 className="font-display font-bold text-sm mb-3">Surface 별 분포</h3>
        {bySurface.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-10">{loading ? "로딩 중..." : "아직 이벤트가 없습니다"}</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={bySurface}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="surface" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="view" stackId="a" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="cta_click" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="convert" stackId="a" fill="hsl(var(--gold))" />
                <Bar dataKey="dismiss" stackId="a" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Variant breakdown when single surface selected */}
      {surfaceFilter !== "__all__" && variantBreakdown.length > 0 && (
        <div className="glass-strong rounded-2xl p-4 neon-border">
          <h3 className="font-display font-bold text-sm mb-3">Variant A/B (surface: {surfaceFilter})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 font-bold">Variant</th>
                  <th className="text-right py-2 font-bold">Views</th>
                  <th className="text-right py-2 font-bold">Clicks</th>
                  <th className="text-right py-2 font-bold">Convert</th>
                  <th className="text-right py-2 font-bold">CVR</th>
                </tr>
              </thead>
              <tbody>
                {variantBreakdown.map(v => (
                  <tr key={v.variant} className="border-b border-border/20">
                    <td className="py-2 font-bold">{v.variant}</td>
                    <td className="py-2 text-right tabular-nums">{v.view}</td>
                    <td className="py-2 text-right tabular-nums">{v.cta_click}</td>
                    <td className="py-2 text-right tabular-nums text-gold font-bold">{v.convert}</td>
                    <td className="py-2 text-right tabular-nums">{pct(v.convert, v.view)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent stream */}
      <div className="glass rounded-2xl p-3">
        <h3 className="font-display font-bold text-xs mb-2 text-muted-foreground">최근 이벤트 (실시간)</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {filtered.slice(0, 50).map(r => {
            const Icon = ICONS[r.event_type];
            return (
              <div key={r.id} className="flex items-center gap-2 text-[11px] py-1">
                <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="font-bold">{r.surface}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{r.variant}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground uppercase">{r.event_type}</span>
                <span className="ml-auto text-muted-foreground tabular-nums">
                  {new Date(r.created_at).toLocaleTimeString("ko-KR")}
                </span>
              </div>
            );
          })}
          {filtered.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">없음</div>}
        </div>
      </div>
    </div>
  );
}

function Rate({ label, sub, value, accent }: { label: string; sub: string; value: number; accent?: boolean }) {
  return (
    <div className={`glass-strong rounded-2xl p-4 ${accent ? "neon-border" : ""}`}>
      <div className="text-[10px] text-muted-foreground tracking-wider uppercase">{label}</div>
      <div className={`font-display font-black text-2xl mt-1 tabular-nums ${accent ? "text-money-strong" : ""}`}>
        {value}%
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
