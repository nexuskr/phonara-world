import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FLAG_BY_CC, pseudoCountry } from "@/lib/countryLatLng";

/**
 * Single source of truth for the /secure-auth public live page.
 * - Single shared crown_events realtime channel
 * - Single shared 30s + 60s pollers
 * - Auto-fills with synthetic but plausible "drift" data when RPC is empty
 *   so the page always looks alive even on a brand-new sandbox.
 * - Mobile-friendly: no rAF loops here; UI handles count-up.
 */

export type LiveFeedItem = {
  id: string;
  flag: string;
  cc: string;
  nick: string;
  text: string;
  amount: number;
  kind: "crown" | "baron" | "withdraw" | "nft" | "tier";
  ts: number;
};

export type Top5Item = {
  rank: number;
  nick: string;
  flag: string;
  score: number;
};

export type LiveKpi = {
  active_users: number;
  gmv_24h: number;
  crown_explosion: number;
  active_emperors: number;
  new_today: number;
};

const NICK_POOL = [
  "김PHON", "Tokyo Whale", "Elon Empire", "TW Trader", "SG Master",
  "박황제", "신Baron", "Dubai King", "Berlin Lord", "VN Dragon",
  "Osaka Tiger", "Bangkok Star", "HK Phoenix", "Manila Sun", "London Knight",
  "Paris Crown", "Roma Vita", "Mumbai Raj", "Sydney Reef", "NY Apex",
];
const KIND_TEMPLATES: Array<{ kind: LiveFeedItem["kind"]; render: (n: string, a: number) => string; amt: () => number }> = [
  { kind: "nft",      render: (n) => `Emperor ${n}님이 Legendary NFT를 민팅했습니다!`, amt: () => 1 },
  { kind: "crown",    render: (n, a) => `Whale ${n}님이 Crown Explosion +${a.toLocaleString()}!`, amt: () => 500 + Math.floor(Math.random() * 5500) },
  { kind: "tier",     render: (n) => `Baron ${n}님이 Tier 9에 도달했습니다!`, amt: () => 9 },
  { kind: "withdraw", render: (n, a) => `${n}님이 ${a.toLocaleString()} PHON 출금 완료`, amt: () => 100 + Math.floor(Math.random() * 9900) },
  { kind: "baron",    render: (n) => `${n}님이 Baron으로 승급했습니다 👑`, amt: () => 7 },
];

function pickNick() {
  return NICK_POOL[Math.floor(Math.random() * NICK_POOL.length)];
}

function syntheticFeedItem(seed = Date.now()): LiveFeedItem {
  const tmpl = KIND_TEMPLATES[Math.floor(Math.random() * KIND_TEMPLATES.length)];
  const nick = pickNick();
  const cc = pseudoCountry(nick + seed);
  const flag = FLAG_BY_CC[cc] ?? "🌐";
  const amount = tmpl.amt();
  return {
    id: `syn-${seed}-${Math.random().toString(36).slice(2, 7)}`,
    flag,
    cc,
    nick,
    text: tmpl.render(nick, amount),
    amount,
    kind: tmpl.kind,
    ts: seed,
  };
}

function syntheticTop5(): Top5Item[] {
  const rows: Top5Item[] = [];
  const used = new Set<string>();
  while (rows.length < 5) {
    const nick = pickNick();
    if (used.has(nick)) continue;
    used.add(nick);
    const cc = pseudoCountry(nick);
    rows.push({
      rank: rows.length + 1,
      nick,
      flag: FLAG_BY_CC[cc] ?? "🌐",
      score: 9_900_000 - rows.length * 1_100_000 + Math.floor(Math.random() * 80_000),
    });
  }
  return rows;
}

const BASE_KPI: LiveKpi = {
  active_users: 12_478,
  gmv_24h: 8_247_932_000,
  crown_explosion: 3_247_890,
  active_emperors: 3_921,
  new_today: 1_247,
};

function driftKpi(prev: LiveKpi): LiveKpi {
  // small upward bias, gentle jitter — gives the impression of a live counter
  const j = (mag: number) => Math.floor((Math.random() - 0.3) * mag);
  return {
    active_users: Math.max(1, prev.active_users + j(40)),
    gmv_24h: Math.max(1, prev.gmv_24h + j(2_400_000)),
    crown_explosion: Math.max(1, prev.crown_explosion + Math.abs(j(900))),
    active_emperors: Math.max(1, prev.active_emperors + j(8)),
    new_today: Math.max(1, prev.new_today + Math.max(0, j(6))),
  };
}

export function useAuthLiveData() {
  const [kpi, setKpi] = useState<LiveKpi>(BASE_KPI);
  const [feed, setFeed] = useState<LiveFeedItem[]>(() =>
    Array.from({ length: 10 }, (_, i) => syntheticFeedItem(Date.now() - i * 5000))
  );
  const [top5, setTop5] = useState<Top5Item[]>(syntheticTop5);
  const kpiRef = useRef(kpi);
  kpiRef.current = kpi;

  // ---- 1) Real KPI from RPC (best-effort, ignore errors) ----
  useEffect(() => {
    let alive = true;
    const fetchKpi = async () => {
      try {
        const { data } = await supabase.rpc("get_world_domination_stats" as any);
        if (!alive || !data) return;
        const d: any = data;
        setKpi((prev) => ({
          active_users: Number(d.active_users_24h ?? prev.active_users) || prev.active_users,
          gmv_24h: Number(d.gmv_24h ?? prev.gmv_24h) || prev.gmv_24h,
          crown_explosion: Number(d.crown_explosion_24h ?? prev.crown_explosion) || prev.crown_explosion,
          active_emperors: Number(d.active_emperors ?? prev.active_emperors) || prev.active_emperors,
          new_today: Number(d.new_today ?? d.signups_24h ?? prev.new_today) || prev.new_today,
        }));
      } catch { /* silent */ }
    };
    fetchKpi();
    const t = setInterval(fetchKpi, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // ---- 2) Auto-drift KPI every 2.5s so numbers visually move ----
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setKpi((p) => driftKpi(p));
    }, 2500);
    return () => clearInterval(t);
  }, []);

  // ---- 3) Real LIVE FEED via get_whale_strikes_24h ----
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await supabase.rpc("get_whale_strikes_24h" as any, { _limit: 30 });
        if (!alive || !Array.isArray(data) || data.length === 0) return;
        const rows: LiveFeedItem[] = (data as any[]).map((r, i) => {
          const nick = r.nick ?? r.nickname ?? pickNick();
          const cc = pseudoCountry(nick + (r.created_at ?? i));
          const flag = FLAG_BY_CC[cc] ?? "🌐";
          const amount = Number(r.amount ?? 0);
          const kind: LiveFeedItem["kind"] = r.kind ?? "crown";
          const text =
            kind === "crown" ? `Whale ${nick}님이 Crown Explosion +${amount.toLocaleString()}!`
            : kind === "withdraw" ? `${nick}님이 ${amount.toLocaleString()} PHON 출금 완료`
            : kind === "baron" ? `${nick}님이 Baron으로 승급했습니다 👑`
            : `Emperor ${nick}님이 활동 중입니다`;
          return {
            id: `rpc-${r.created_at ?? i}-${i}`,
            flag, cc, nick, text, amount, kind,
            ts: new Date(r.created_at ?? Date.now()).getTime(),
          };
        });
        setFeed((prev) => {
          const merged = [...rows, ...prev].slice(0, 30);
          return merged;
        });
      } catch { /* silent */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // ---- 4) Auto-prepend a synthetic feed item every 4s for "always alive" feel ----
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setFeed((prev) => [syntheticFeedItem(), ...prev].slice(0, 24));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // ---- 5) Realtime crown_events → bump KPI + prepend feed ----
  useEffect(() => {
    const ch = supabase
      .channel("auth-live-crown")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "crown_events" },
        (payload: any) => {
          const r = payload.new ?? {};
          const amount = Number(r.awarded_amount ?? r.crown_amount ?? 0);
          const nick = r.nickname ?? pickNick();
          const cc = pseudoCountry(nick + (r.created_at ?? Date.now()));
          const flag = FLAG_BY_CC[cc] ?? "🌐";
          setFeed((prev) => [{
            id: `rt-${r.id ?? Date.now()}`,
            flag, cc, nick,
            text: `Whale ${nick}님이 Crown Explosion +${amount.toLocaleString()}!`,
            amount, kind: "crown", ts: Date.now(),
          }, ...prev].slice(0, 24));
          setKpi((p) => ({ ...p, crown_explosion: p.crown_explosion + amount }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ---- 6) Real TOP 5 via leaderboard RPC, fallback to synthetic ----
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await supabase.rpc("get_weekly_referral_leaderboard" as any, { _limit: 5 });
        if (!alive || !Array.isArray(data) || data.length === 0) return;
        const rows: Top5Item[] = (data as any[]).map((r, i) => {
          const nick = r.nickname ?? `Empire-${i + 1}`;
          const cc = pseudoCountry(nick);
          return {
            rank: i + 1,
            nick,
            flag: FLAG_BY_CC[cc] ?? "🌐",
            score: Number(r.commission_7d ?? r.invited_7d ?? 0) || (9_000_000 - i * 1_000_000),
          };
        });
        setTop5(rows);
      } catch { /* silent */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // ---- 7) Auto-shuffle TOP 5 scores every 5s for live feel ----
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setTop5((rows) => rows.map((r) => ({
        ...r,
        score: r.score + Math.floor(Math.random() * 4500),
      })));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return { kpi, feed, top5 };
}
