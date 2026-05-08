import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, RefreshCw, Target, Gamepad2, Crown, Coins, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Kind = "mission" | "roulette" | "package" | "settlement" | "anomaly";
type RangeKey = "24h" | "7d" | "30d";

type ActivityItem = {
  id: string;
  kind: Kind;
  ts: string; // ISO
  actor: string | null;
  summary: string;
  raw: any;
};

const KIND_META: Record<Kind, { label: string; icon: any; tone: string }> = {
  mission:    { label: "미션",   icon: Target,         tone: "text-primary" },
  roulette:   { label: "룰렛",   icon: Gamepad2,       tone: "text-gold" },
  package:    { label: "패키지", icon: Crown,          tone: "text-gold" },
  settlement: { label: "정산",   icon: Coins,          tone: "text-secondary" },
  anomaly:    { label: "이상치", icon: AlertTriangle,  tone: "text-destructive" },
};

const RANGE_HOURS: Record<RangeKey, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

function fmtKRW(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("ko-KR").format(n) + "₩";
}

export default function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<Record<Kind, boolean>>({
    mission: true, roulette: true, package: true, settlement: true, anomaly: true,
  });
  const [range, setRange] = useState<RangeKey>("24h");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sinceIso = new Date(Date.now() - RANGE_HOURS[range] * 3600 * 1000).toISOString();
      const limit = 50;
      const [mh, pp, rs, tx, ae] = await Promise.all([
        supabase.from("mission_history").select("id,user_id,mission_id,tier,final_reward,is_win,created_at")
          .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(limit),
        supabase.from("package_purchases").select("id,user_id,package_name,amount,status,created_at")
          .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(limit),
        supabase.from("roulette_spins").select("id,user_id,prize_label,amount,kind,created_at")
          .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(limit),
        supabase.from("transactions").select("id,user_id,amount,direction,kind,created_at")
          .eq("kind", "settlement" as any)
          .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(limit),
        supabase.from("anomaly_events").select("id,user_id,rule,severity,acknowledged,created_at")
          .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(limit),
      ]);

      const errs = [mh.error, pp.error, rs.error, tx.error, ae.error].filter(Boolean);
      if (errs.length) throw errs[0];

      const merged: ActivityItem[] = [];

      (mh.data ?? []).forEach((r: any) => merged.push({
        id: `mh:${r.id}`, kind: "mission", ts: r.created_at, actor: r.user_id,
        summary: `${r.mission_id} · ${r.tier} · ${r.is_win ? "WIN" : "LOSE"} · ${fmtKRW(r.final_reward)}`,
        raw: r,
      }));
      (pp.data ?? []).forEach((r: any) => merged.push({
        id: `pp:${r.id}`, kind: "package", ts: r.created_at, actor: r.user_id,
        summary: `${r.package_name} · ${r.status} · ${fmtKRW(r.amount)}`,
        raw: r,
      }));
      (rs.data ?? []).forEach((r: any) => merged.push({
        id: `rs:${r.id}`, kind: "roulette", ts: r.created_at, actor: r.user_id,
        summary: `${r.kind ?? "spin"} · ${r.prize_label} · ${fmtKRW(r.amount)}`,
        raw: r,
      }));
      (tx.data ?? []).forEach((r: any) => merged.push({
        id: `tx:${r.id}`, kind: "settlement", ts: r.created_at, actor: r.user_id,
        summary: `${r.direction} · ${fmtKRW(r.amount)}`,
        raw: r,
      }));
      (ae.data ?? []).forEach((r: any) => merged.push({
        id: `ae:${r.id}`, kind: "anomaly", ts: r.created_at, actor: r.user_id,
        summary: `${r.rule} · ${r.severity}${r.acknowledged ? " · ack" : ""}`,
        raw: r,
      }));

      merged.sort((a, b) => (a.ts < b.ts ? 1 : -1));
      setItems(merged);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      toast({ title: "조회 실패", description: e?.message ?? "" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range]);

  const filtered = useMemo(() => items.filter((i) => enabled[i.kind]), [items, enabled]);

  const counts = useMemo(() => {
    const c: Record<Kind, number> = { mission: 0, roulette: 0, package: 0, settlement: 0, anomaly: 0 };
    items.forEach((i) => { c[i.kind]++; });
    return c;
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 neon-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display font-bold text-sm flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-primary" /> 활동 로그 (통합)
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(["24h", "7d", "30d"] as RangeKey[]).map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${range === r ? "bg-gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={load} className="glass px-2 py-1 rounded-lg text-[10px] flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> 새로고침
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(KIND_META) as Kind[]).map((k) => {
            const M = KIND_META[k];
            const on = enabled[k];
            return (
              <button key={k} onClick={() => setEnabled((p) => ({ ...p, [k]: !p[k] }))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${on ? "bg-gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                <M.icon className="w-3 h-3" /> {M.label}
                <span className={`text-[9px] tabular-nums opacity-80`}>{counts[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-2">
        {loading && items.length === 0 && (
          <div className="space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
        {error && !loading && (
          <div className="text-xs text-destructive p-3">에러: {error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-xs text-muted-foreground p-3 text-center">선택한 범위/필터에서 활동 없음</div>
        )}
        <div className="space-y-1">
          {filtered.map((it) => {
            const M = KIND_META[it.kind];
            const open = openId === it.id;
            return (
              <div key={it.id} className="glass rounded-lg">
                <button onClick={() => setOpenId(open ? null : it.id)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2">
                  <M.icon className={`w-3.5 h-3.5 shrink-0 ${M.tone}`} />
                  <span className={`text-[10px] font-bold w-12 shrink-0 ${M.tone}`}>{M.label}</span>
                  <span className="text-[11px] truncate flex-1">{it.summary}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                    {it.actor ? `${it.actor.slice(0, 8)}…` : "—"}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(it.ts).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
                {open && (
                  <pre className="text-[9px] px-3 pb-2 overflow-x-auto max-h-48 text-muted-foreground">
{JSON.stringify(it.raw, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
