import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Filter, Users, Megaphone } from "lucide-react";
import { toCSV, downloadCSV } from "@/lib/csv";

type Channel = "tiktok" | "instagram" | "threads" | "naver" | "youtube" | "kakao" | "etc";

type EventRow = {
  id: string;
  user_id: string;
  channel: Channel;
  event_date: string;
  clicks: number;
  signups: number;
  conversions: number;
  dm_sent: number;
  dm_responded: number;
  campaign_slug: string | null;
  note: string | null;
};

const CHANNELS: Channel[] = ["tiktok", "instagram", "threads", "naver", "youtube", "kakao", "etc"];

const RANGES = [
  { key: "7", days: 7, label: "7일" },
  { key: "30", days: 30, label: "30일" },
  { key: "90", days: 90, label: "90일" },
  { key: "all", days: 3650, label: "전체" },
] as const;

export default function AdminUgc() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<string>("30");
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [userIdFilter, setUserIdFilter] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const r = RANGES.find(x => x.key === rangeKey) ?? RANGES[1];
    const cutoff = new Date(Date.now() - r.days * 86400000).toISOString().slice(0, 10);
    let q = supabase
      .from("ugc_traffic_events")
      .select("*")
      .gte("event_date", cutoff)
      .order("event_date", { ascending: false })
      .limit(1000);
    if (channelFilter !== "all") q = q.eq("channel", channelFilter);
    if (userIdFilter.trim()) q = q.eq("user_id", userIdFilter.trim());
    const { data, error } = await q;
    if (error) {
      toast({ title: "조회 실패", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as EventRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [rangeKey, channelFilter, userIdFilter]);

  const kpi = useMemo(() => {
    const sum = rows.reduce(
      (a, r) => ({
        clicks: a.clicks + r.clicks,
        signups: a.signups + r.signups,
        conversions: a.conversions + r.conversions,
        dm: a.dm + r.dm_sent,
        resp: a.resp + r.dm_responded,
        users: a.users.add(r.user_id),
      }),
      { clicks: 0, signups: 0, conversions: 0, dm: 0, resp: 0, users: new Set<string>() },
    );
    return {
      ...sum,
      uniqueUsers: sum.users.size,
      respRate: sum.dm ? Math.round((sum.resp / sum.dm) * 1000) / 10 : 0,
      cvr: sum.clicks ? Math.round((sum.conversions / sum.clicks) * 1000) / 10 : 0,
    };
  }, [rows]);

  const byUser = useMemo(() => {
    const map = new Map<string, { user_id: string; clicks: number; signups: number; conversions: number; dm_sent: number }>();
    for (const r of rows) {
      const e = map.get(r.user_id) ?? { user_id: r.user_id, clicks: 0, signups: 0, conversions: 0, dm_sent: 0 };
      e.clicks += r.clicks; e.signups += r.signups; e.conversions += r.conversions; e.dm_sent += r.dm_sent;
      map.set(r.user_id, e);
    }
    return Array.from(map.values()).sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks).slice(0, 30);
  }, [rows]);

  const byChannel = useMemo(() => {
    const map = new Map<string, { channel: string; clicks: number; conversions: number; dm_sent: number }>();
    for (const r of rows) {
      const e = map.get(r.channel) ?? { channel: r.channel, clicks: 0, conversions: 0, dm_sent: 0 };
      e.clicks += r.clicks; e.conversions += r.conversions; e.dm_sent += r.dm_sent;
      map.set(r.channel, e);
    }
    return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
  }, [rows]);

  const exportCSV = () => {
    if (!rows.length) { toast({ title: "내보낼 데이터 없음" }); return; }
    const csv = toCSV(rows, [
      { key: "event_date", label: "Date" },
      { key: "user_id", label: "User" },
      { key: "channel", label: "Channel" },
      { key: "campaign_slug", label: "Campaign" },
      { key: "clicks", label: "Clicks" },
      { key: "signups", label: "Signups" },
      { key: "conversions", label: "Conversions" },
      { key: "dm_sent", label: "DM Sent" },
      { key: "dm_responded", label: "DM Responded" },
      { key: "note", label: "Note" },
    ]);
    downloadCSV(`admin-ugc-${rangeKey}-${new Date().toISOString().slice(0,10)}.csv`, csv);
    toast({ title: "✓ CSV 저장됨", description: `${rows.length}건` });
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-primary" />
        <h2 className="font-display font-black text-lg">UGC 전체 성과</h2>
        <span className="text-[10px] text-muted-foreground ml-auto">최대 1,000건</span>
      </header>

      {/* Filters */}
      <div className="glass rounded-2xl p-3 border border-border space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              className={`min-h-[32px] px-3 rounded-lg text-xs font-bold border ${
                rangeKey === r.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground/80"
              }`}
            >
              {r.label}
            </button>
          ))}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as any)}
            className="min-h-[32px] rounded-lg bg-background border border-border px-2 text-xs"
          >
            <option value="all">모든 채널</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <input
            value={userIdFilter}
            onChange={(e) => setUserIdFilter(e.target.value)}
            placeholder="user_id로 필터 (UUID)"
            className="flex-1 min-w-[180px] min-h-[32px] rounded-lg bg-background border border-border px-2 text-xs font-mono"
          />
          <button
            onClick={exportCSV}
            className="min-h-[32px] px-3 rounded-lg text-xs font-bold border border-primary/40 text-primary flex items-center gap-1 hover:bg-primary/10"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <KPI label="유저" value={kpi.uniqueUsers} icon={Users} />
        <KPI label="클릭" value={kpi.clicks} />
        <KPI label="가입" value={kpi.signups} />
        <KPI label="전환" value={kpi.conversions} accent="text-money-strong" />
        <KPI label="DM" value={kpi.dm} />
        <KPI label="응답률" value={`${kpi.respRate}%`} accent="text-accent" />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> 조회 중…
        </div>
      )}

      {/* Channel breakdown */}
      <section className="glass rounded-2xl p-3 border border-border">
        <h3 className="font-bold text-sm mb-2">채널별 성과</h3>
        <div className="space-y-1">
          {byChannel.map(c => (
            <div key={c.channel} className="flex items-center gap-2 text-xs">
              <span className="w-16 font-bold uppercase text-primary">{c.channel}</span>
              <span className="flex-1 tabular-nums text-muted-foreground">
                👀 {c.clicks} · 💳 {c.conversions} · 📨 {c.dm_sent}
              </span>
              <span className="tabular-nums font-bold">
                CVR {c.clicks ? ((c.conversions / c.clicks) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          ))}
          {!byChannel.length && !loading && <div className="text-xs text-muted-foreground">데이터 없음</div>}
        </div>
      </section>

      {/* Top users */}
      <section className="glass rounded-2xl p-3 border border-border">
        <h3 className="font-bold text-sm mb-2">Top 유저 (전환 기준)</h3>
        <div className="space-y-1">
          {byUser.map((u, i) => (
            <div key={u.user_id} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-center font-black text-primary">{i + 1}</span>
              <button
                onClick={() => setUserIdFilter(u.user_id)}
                className="font-mono text-[10px] text-muted-foreground hover:text-primary truncate flex-1 text-left"
                title="이 유저로 필터"
              >
                {u.user_id}
              </button>
              <span className="tabular-nums">👀 {u.clicks}</span>
              <span className="tabular-nums">✍ {u.signups}</span>
              <span className="tabular-nums text-money-strong font-bold">💳 {u.conversions}</span>
            </div>
          ))}
          {!byUser.length && !loading && <div className="text-xs text-muted-foreground">데이터 없음</div>}
        </div>
      </section>
    </section>
  );
}

function KPI({ label, value, accent, icon: Icon }: { label: string; value: number | string; accent?: string; icon?: any }) {
  return (
    <div className="glass rounded-xl p-2.5 border border-border">
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className={`font-display font-black text-base mt-0.5 tabular-nums ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}
