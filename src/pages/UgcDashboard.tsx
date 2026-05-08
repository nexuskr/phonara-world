import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { BarChart3, Plus, Trash2, Loader2, Download } from "lucide-react";
import { toCSV, downloadCSV } from "@/lib/csv";
import CampaignManager from "@/components/ugc/CampaignManager";

type Channel = "tiktok" | "instagram" | "threads" | "naver" | "youtube" | "kakao" | "etc";

type Row = {
  id: string;
  user_id: string;
  channel: Channel;
  event_date: string;
  clicks: number;
  signups: number;
  conversions: number;
  dm_sent: number;
  dm_responded: number;
  note: string | null;
  created_at: string;
};

const CHANNELS: Channel[] = ["tiktok", "instagram", "threads", "naver", "youtube", "kakao", "etc"];
const CHANNEL_COLOR: Record<Channel, string> = {
  tiktok: "hsl(330 80% 60%)",
  instagram: "hsl(280 70% 60%)",
  threads: "hsl(220 8% 70%)",
  naver: "hsl(140 60% 45%)",
  youtube: "hsl(0 75% 55%)",
  kakao: "hsl(50 90% 55%)",
  etc: "hsl(210 15% 50%)",
};

const RANGES = [
  { key: "all", days: 365 },
  { key: "days30", days: 30 },
  { key: "days7", days: 7 },
] as const;

const todayKR = () => new Date(new Date().getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export default function UgcDashboard() {
  const { t } = useTranslation("ugc");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rangeKey, setRangeKey] = useState<typeof RANGES[number]["key"]>("days30");

  // form state
  const [fChannel, setFChannel] = useState<Channel>("instagram");
  const [fDate, setFDate] = useState(todayKR());
  const [fClicks, setFClicks] = useState(0);
  const [fSignups, setFSignups] = useState(0);
  const [fConv, setFConv] = useState(0);
  const [fSent, setFSent] = useState(0);
  const [fResp, setFResp] = useState(0);
  const [fNote, setFNote] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("ugc_traffic_events")
      .select("*")
      .eq("user_id", u.user.id)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: t("toast.error"), variant: "destructive" });
    } else {
      setRows((data || []) as Row[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const r = RANGES.find((x) => x.key === rangeKey)!;
    const cutoff = new Date(Date.now() - r.days * 86400000).toISOString().slice(0, 10);
    return rows.filter((x) => x.event_date >= cutoff);
  }, [rows, rangeKey]);

  const kpi = useMemo(() => {
    const sum = filtered.reduce(
      (a, r) => ({
        clicks: a.clicks + r.clicks,
        signups: a.signups + r.signups,
        conversions: a.conversions + r.conversions,
        dm: a.dm + r.dm_sent,
        responded: a.responded + r.dm_responded,
      }),
      { clicks: 0, signups: 0, conversions: 0, dm: 0, responded: 0 },
    );
    const respRate = sum.dm > 0 ? Math.round((sum.responded / sum.dm) * 1000) / 10 : 0;
    const cvr = sum.clicks > 0 ? Math.round((sum.conversions / sum.clicks) * 1000) / 10 : 0;
    return { ...sum, respRate, cvr };
  }, [filtered]);

  const byChannel = useMemo(() => {
    const map = new Map<Channel, { channel: string; clicks: number; signups: number; conversions: number }>();
    for (const c of CHANNELS) map.set(c, { channel: t(`channels.${c}`), clicks: 0, signups: 0, conversions: 0 });
    for (const r of filtered) {
      const e = map.get(r.channel)!;
      e.clicks += r.clicks;
      e.signups += r.signups;
      e.conversions += r.conversions;
    }
    return Array.from(map.values());
  }, [filtered, t]);

  const byDate = useMemo(() => {
    const map = new Map<string, { date: string; clicks: number; signups: number; conversions: number }>();
    for (const r of filtered) {
      const k = r.event_date;
      const e = map.get(k) ?? { date: k.slice(5), clicks: 0, signups: 0, conversions: 0 };
      e.clicks += r.clicks;
      e.signups += r.signups;
      e.conversions += r.conversions;
      map.set(k, e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [filtered]);

  const submit = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("ugc_traffic_events").insert({
      user_id: u.user.id,
      channel: fChannel,
      event_date: fDate,
      clicks: Math.max(0, Math.floor(fClicks)),
      signups: Math.max(0, Math.floor(fSignups)),
      conversions: Math.max(0, Math.floor(fConv)),
      dm_sent: Math.max(0, Math.floor(fSent)),
      dm_responded: Math.max(0, Math.floor(fResp)),
      note: fNote.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: t("toast.error"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("toast.saved") });
    setFClicks(0); setFSignups(0); setFConv(0); setFSent(0); setFResp(0); setFNote("");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("ugc_traffic_events").delete().eq("id", id);
    if (error) {
      toast({ title: t("toast.error"), variant: "destructive" });
    } else {
      toast({ title: t("toast.deleted") });
      setRows((r) => r.filter((x) => x.id !== id));
    }
  };

  return (
    <Layout>
      <HubTabs hub="legacy" />
      <div className="container space-y-5 pb-24">
        <header>
          <h1 className="font-display font-black text-2xl flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> {t("title")}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 break-keep">{t("subtitle")}</p>
        </header>

        {/* Range filter + CSV export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-bold border ${
                  rangeKey === r.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground/80"
                }`}
              >
                {t(`filter.${r.key}`)}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (!filtered.length) {
                toast({ title: "내보낼 데이터가 없어요" });
                return;
              }
              const csv = toCSV(filtered, [
                { key: "event_date", label: "Date" },
                { key: "channel", label: "Channel" },
                { key: "campaign_slug" as any, label: "Campaign" },
                { key: "clicks", label: "Clicks" },
                { key: "signups", label: "Signups" },
                { key: "conversions", label: "Conversions" },
                { key: "dm_sent", label: "DM Sent" },
                { key: "dm_responded", label: "DM Responded" },
                { key: "note", label: "Note" },
              ]);
              const fname = `ugc-${rangeKey}-${todayKR()}.csv`;
              downloadCSV(fname, csv);
              toast({ title: "✓ CSV 저장됨", description: `${filtered.length}건 · ${fname}` });
            }}
            className="ml-auto min-h-[36px] px-3 rounded-lg text-xs font-bold border border-primary/40 text-primary flex items-center gap-1.5 hover:bg-primary/10"
          >
            <Download className="w-3.5 h-3.5" /> CSV 내보내기 ({filtered.length})
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-2">
          <Kpi label={t("kpi.clicks")} value={kpi.clicks} />
          <Kpi label={t("kpi.signups")} value={kpi.signups} />
          <Kpi label={t("kpi.conversions")} value={kpi.conversions} accent="text-money-strong" />
          <Kpi label={t("kpi.dm")} value={kpi.dm} />
          <Kpi label={t("kpi.responded")} value={kpi.responded} />
          <Kpi label={t("kpi.respRate")} value={`${kpi.respRate}%`} accent="text-accent" />
        </div>
        <div className="text-[11px] text-muted-foreground -mt-2">
          {t("kpi.cvr")}: <span className="font-bold text-foreground">{kpi.cvr}%</span>
        </div>

        {/* Charts */}
        <section className="glass rounded-2xl p-3 border border-border">
          <h2 className="font-bold text-sm mb-2">{t("chart.byChannel")}</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byChannel} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="channel" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="clicks" fill="hsl(var(--primary))" />
                <Bar dataKey="signups" fill="hsl(var(--accent))" />
                <Bar dataKey="conversions" fill="hsl(var(--gold))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="glass rounded-2xl p-3 border border-border">
          <h2 className="font-bold text-sm mb-2">{t("chart.byDate")}</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDate} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signups" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="conversions" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Form */}
        <section className="glass rounded-2xl p-4 border border-border">
          <h2 className="font-bold text-sm mb-3 flex items-center gap-1.5"><Plus className="w-4 h-4" />{t("form.title")}</h2>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("form.channel")}>
              <select
                value={fChannel}
                onChange={(e) => setFChannel(e.target.value as Channel)}
                className="w-full rounded-lg bg-background border border-border px-2 py-2 text-sm"
              >
                {CHANNELS.map((c) => <option key={c} value={c}>{t(`channels.${c}`)}</option>)}
              </select>
            </Field>
            <Field label={t("form.date")}>
              <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
                className="w-full rounded-lg bg-background border border-border px-2 py-2 text-sm" />
            </Field>
            <NumField label={t("form.clicks")} value={fClicks} onChange={setFClicks} />
            <NumField label={t("form.signups")} value={fSignups} onChange={setFSignups} />
            <NumField label={t("form.conversions")} value={fConv} onChange={setFConv} />
            <NumField label={t("form.dmSent")} value={fSent} onChange={setFSent} />
            <NumField label={t("form.dmResponded")} value={fResp} onChange={setFResp} />
            <Field label={t("form.note")} className="col-span-2">
              <input value={fNote} onChange={(e) => setFNote(e.target.value)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm"
                placeholder="https://... or content title" />
            </Field>
          </div>
          <button
            onClick={submit}
            disabled={saving}
            className="mt-3 min-h-[44px] w-full rounded-xl bg-gradient-primary text-primary-foreground font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? t("form.saving") : t("form.submit")}
          </button>
        </section>

        <CampaignManager />

        {/* Recent table */}
        <section>
          <h2 className="font-bold text-sm mb-2">{t("table.title")}</h2>
          {loading ? (
            <div className="text-xs text-muted-foreground">…</div>
          ) : rows.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground border border-border break-keep">
              {t("table.empty")}
            </div>
          ) : (
            <div className="space-y-1.5">
              {rows.slice(0, 50).map((r) => (
                <div key={r.id} className="glass rounded-xl border border-border p-3 flex items-start gap-2 text-xs">
                  <div className="w-1 self-stretch rounded-full" style={{ background: CHANNEL_COLOR[r.channel] }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold">
                        <span className="text-primary">{t(`channels.${r.channel}`)}</span>
                        <span className="text-muted-foreground ml-2">{r.event_date}</span>
                      </div>
                      <button onClick={() => remove(r.id)} className="text-destructive opacity-70 hover:opacity-100 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mt-1 text-foreground/80 tabular-nums">
                      👀 {r.clicks} · ✍ {r.signups} · 💳 {r.conversions} · 📨 {r.dm_sent}/{r.dm_responded}
                    </div>
                    {r.note && <div className="mt-1 text-muted-foreground truncate">{r.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="glass rounded-xl p-3 border border-border">
      <div className="text-[10px] text-muted-foreground break-keep">{label}</div>
      <div className={`font-display font-black text-lg mt-0.5 tabular-nums ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="text-[10px] font-bold text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg bg-background border border-border px-2 py-2 text-sm tabular-nums"
      />
    </Field>
  );
}
