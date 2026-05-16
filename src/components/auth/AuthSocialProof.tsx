import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, TrendingUp, Trophy, ShieldCheck, Lock, Globe2, Activity, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCountUp } from "@/hooks/use-count-up";
import {
  COUNTRY_LAT_LNG,
  FLAG_BY_CC,
  projectLatLng,
  pseudoCountry,
} from "@/lib/countryLatLng";
import { LiveFeedPulses, type PulseEvent } from "./LiveFeedPulses";
import { setVisibleInterval } from "@/lib/util/visible-interval";

interface WhaleRow {
  kind: "crown" | "baron" | "withdraw";
  created_at: string;
  amount: number;
  label: string;
  nick: string;
}
interface Top5Row {
  inviter_id: string;
  nickname: string | null;
  invited_7d: number;
  commission_7d: number;
  rank: number;
}

function fmtRel(iso: string, now: number) {
  const s = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function fmtMoney(n: number, kind: string) {
  if (kind === "withdraw") return `${n.toLocaleString()} PHON`;
  if (kind === "crown") return `+${n.toLocaleString()} PHON`;
  return "Baron 승급";
}

/**
 * Renders all 4 social-proof surfaces in one tree:
 *   • LiveKpiBar (top, fixed-ish position)
 *   • LiveFeedRail (vertical marquee, right side md+)
 *   • Top5EmperorsCard
 *   • CrownExplosionCounter
 * Plus emits PulseEvent[] back to parent (via prop) for backdrop pulses.
 */
export function AuthSocialProof({
  onPulses,
}: {
  onPulses?: (pulses: PulseEvent[]) => void;
}) {
  const reduce = useReducedMotion();

  // ------- KPI -------
  const [kpi, setKpi] = useState({
    active_users_24h: 0,
    active_emperors: 0,
    gmv_24h: 0,
    payout_total: 0,
  });
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_world_domination_stats");
      if (!mounted || !data) return;
      const d: any = data;
      setKpi({
        active_users_24h: Number(d.active_users_24h ?? 0),
        active_emperors: Number(d.active_emperors ?? 0),
        gmv_24h: Number(d.gmv_24h ?? 0),
        payout_total: Number(d.payout_total ?? 0),
      });
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  // ------- LIVE FEED -------
  const [feed, setFeed] = useState<WhaleRow[]>([]);
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_whale_strikes_24h", { _limit: 40 });
      if (!mounted || !Array.isArray(data)) return;
      const rows = (data as any[]).map((r) => ({
        kind: r.kind,
        created_at: r.created_at,
        amount: Number(r.amount ?? 0),
        label: r.label,
        nick: r.nick,
      })) as WhaleRow[];
      setFeed(rows);
      // seed pulses from initial fetch — first 6 only
      const init: PulseEvent[] = rows.slice(0, 6).map((r) => {
        const cc = pseudoCountry(r.nick + r.created_at);
        const ll = COUNTRY_LAT_LNG[cc];
        const p = projectLatLng(ll.lat, ll.lng);
        return { id: cc + r.created_at, xPct: p.xPct, yPct: p.yPct, tone: r.kind === "withdraw" ? "cyan" : "gold" };
      });
      onPulses?.(init);
      rows.forEach((r) => seen.current.add(r.created_at + r.nick));
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, [onPulses]);

  // realtime crown_events → prepend
  useEffect(() => {
    const ch = supabase
      .channel("auth-crown-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crown_events" },
        (payload: any) => {
          const r = payload.new;
          const row: WhaleRow = {
            kind: "crown",
            created_at: r.created_at ?? new Date().toISOString(),
            amount: Number(r.awarded_amount ?? r.crown_amount ?? 0),
            label: r.event_type ?? "crown",
            nick: "신규 황제",
          };
          setFeed((prev) => [row, ...prev].slice(0, 60));
          // pulse
          const cc = pseudoCountry(row.created_at);
          const ll = COUNTRY_LAT_LNG[cc];
          const p = projectLatLng(ll.lat, ll.lng);
          onPulses?.([{ id: "rt-" + row.created_at, xPct: p.xPct, yPct: p.yPct, tone: "gold" }]);
          setCrownCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [onPulses]);

  // ------- TOP 5 -------
  const [top5, setTop5] = useState<Top5Row[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_weekly_referral_leaderboard", { _limit: 5 });
      if (!mounted || !Array.isArray(data)) return;
      setTop5(data as Top5Row[]);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  // ------- CROWN EXPLOSION 24h -------
  const [crownCount, setCrownCount] = useState(0);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("crown_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      if (mounted && typeof count === "number") setCrownCount(count);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  // tick for "Xs ago"
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    return setVisibleInterval(() => setNow(Date.now()), 1000, { meta: { owner: "AuthSocialProof:now-tick", category: "cosmetic" } });
  }, []);

  // animated kpi values
  const usersA = useCountUp(kpi.active_users_24h, 1200);
  const empA = useCountUp(kpi.active_emperors, 1200);
  const gmvA = useCountUp(kpi.gmv_24h, 1200);
  const paidA = useCountUp(kpi.payout_total, 1200);
  const crownA = useCountUp(crownCount, 800);

  // marquee duplicate
  const marquee = useMemo(() => [...feed, ...feed], [feed]);

  return (
    <>
      {/* KPI BAR — top-center, above hero */}
      <div className="relative z-20 mx-auto mt-2 grid w-full max-w-[640px] grid-cols-4 gap-2 px-2">
        {[
          { icon: Activity, label: "ACTIVE 24H", value: Math.round(usersA).toLocaleString() },
          { icon: Crown, label: "EMPERORS", value: Math.round(empA).toLocaleString() },
          { icon: TrendingUp, label: "GMV 24H", value: Math.round(gmvA).toLocaleString() },
          { icon: Trophy, label: "PAID OUT", value: Math.round(paidA).toLocaleString() },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div
              key={i}
              className="rounded-xl border border-gold/35 bg-background/70 px-2 py-1.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-1 text-[8px] font-black tracking-[0.25em] text-gold/80">
                <Icon className="h-2.5 w-2.5" />
                <span>{k.label}</span>
              </div>
              <div className="mt-0.5 truncate font-imperial text-[14px] tabular-nums text-gradient-gold">
                {k.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT-SIDE FLOATING PANELS — md+ only, absolute */}
      <aside
        className="pointer-events-none absolute right-4 top-32 bottom-32 z-20 hidden w-[300px] flex-col gap-3 lg:flex"
        aria-hidden="false"
      >
        {/* LIVE FEED */}
        <div className="pointer-events-auto relative flex-1 overflow-hidden rounded-2xl border border-gold/35 bg-background/65 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-gold/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-secondary" />
              </span>
              <span className="text-[10px] font-black tracking-[0.3em] text-gold">LIVE FEED · GLOBAL</span>
            </div>
            <Globe2 className="h-3 w-3 text-gold/70" />
          </div>
          <div className="relative h-full overflow-hidden">
            {feed.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">집결 중…</div>
            ) : (
              <motion.div
                animate={reduce ? undefined : { y: ["0%", "-50%"] }}
                transition={{ duration: Math.max(20, feed.length * 2.4), repeat: Infinity, ease: "linear" }}
                className="flex flex-col"
              >
                {marquee.map((row, i) => {
                  const cc = pseudoCountry(row.nick + row.created_at);
                  const flag = FLAG_BY_CC[cc] ?? "🌐";
                  return (
                    <div
                      key={i + row.created_at}
                      className="flex items-center gap-2 border-b border-border/30 px-3 py-2 text-[11px]"
                    >
                      <span className="text-base leading-none">{flag}</span>
                      <span className="min-w-0 flex-1 truncate font-bold text-foreground/90">{row.nick}</span>
                      <span
                        className={
                          "tabular-nums font-black " +
                          (row.kind === "crown"
                            ? "text-gold"
                            : row.kind === "withdraw"
                            ? "text-secondary"
                            : "text-primary")
                        }
                      >
                        {fmtMoney(row.amount, row.kind)}
                      </span>
                      <span className="ml-1 shrink-0 text-[9px] tabular-nums text-muted-foreground">
                        {fmtRel(row.created_at, now)}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>

        {/* TOP 5 EMPERORS */}
        <div className="pointer-events-auto rounded-2xl border border-gold/35 bg-background/65 px-3 py-2 backdrop-blur-xl">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black tracking-[0.3em] text-gold">
            <Trophy className="h-3 w-3" /> TOP 5 EMPERORS · 7D
          </div>
          {top5.length === 0 ? (
            <div className="py-2 text-center text-[10px] text-muted-foreground">집계 중…</div>
          ) : (
            <ul className="space-y-1">
              {top5.map((r) => (
                <li key={r.inviter_id} className="flex items-center gap-2 text-[11px]">
                  <span className="w-4 text-center font-imperial text-gold">{r.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {r.nickname ? `${r.nickname[0]}**` : "익명의 영주"}
                  </span>
                  <span className="tabular-nums text-foreground/80">{r.invited_7d.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* CROWN EXPLOSION COUNTER */}
        <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-gold/45 bg-gradient-to-br from-gold/15 to-background/70 px-3 py-3 text-center backdrop-blur-xl">
          <div className="text-[9px] font-black tracking-[0.32em] text-gold/80">
            CROWN EXPLOSION · 24H
          </div>
          <div className="mt-1 font-imperial text-[28px] tabular-nums text-gradient-gold">
            ×{Math.round(crownA).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[9px] text-muted-foreground">실시간 누적</div>
        </div>
      </aside>

      {/* MOBILE COMPACT TICKER — below the form (rendered by parent at bottom). Provided as named export. */}
    </>
  );
}

export function AuthTrustChips() {
  const chips = [
    { icon: ShieldCheck, label: "100% Anonymous" },
    { icon: Lock, label: "AAL2 Secured" },
    { icon: Activity, label: "24/7 Live Ops" },
    { icon: Cpu, label: "AES-256" },
    { icon: Globe2, label: "KYC-Free" },
    { icon: Trophy, label: "SOC2-aligned" },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
      {chips.map((c) => {
        const Icon = c.icon;
        return (
          <span
            key={c.label}
            className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-background/60 px-2 py-1 text-[10px] font-bold text-foreground/85 backdrop-blur"
          >
            <Icon className="h-3 w-3 text-gold" />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

export default AuthSocialProof;
