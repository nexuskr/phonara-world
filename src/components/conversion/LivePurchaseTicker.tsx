import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isFlagOn } from "@/lib/conversion-flags";
import { trackClick } from "@/lib/telemetry";
import { useBotFeed } from "@/hooks/use-bot-feed";
import i18n from "@/lib/i18n";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Item = {
  id: string;
  nickname: string;
  pkg: string;
  tier: string;
  ago: string;
};

const FALLBACK_NICKS = ["Cyber***K", "Neon***J", "Aurora***", "Phantom***", "Quantum***", "Nova***L", "Zero***X", "Echo***", "Pulse***M"];
const FALLBACK_PKGS = ["STARTER", "Easy 50", "Easy 150", "EMPIRE"];

function fmtAgo(ms: number) {
  const sec = Math.floor((Date.now() - ms) / 1000);
  const tt = i18n.getFixedT(null, "convert");
  if (sec < 60) return tt("secAgo", { n: sec });
  if (sec < 3600) return tt("minAgo", { n: Math.floor(sec / 60) });
  return tt("hourAgo", { n: Math.floor(sec / 3600) });
}

/** Floating bottom-right ticker showing recent purchases. Realtime + fallback. */
export default function LivePurchaseTicker() {
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);
  const botFeed = useBotFeed(30);

  useEffect(() => {
    if (!isFlagOn("livePurchaseTicker")) return;
    let mounted = true;

    async function load() {
      try {
        const { data } = await supabase
          .from("package_purchases")
          .select("id, package_name, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(20);
        if (!mounted) return;
        if (data && data.length > 0) {
          const real = data.map((r: any) => ({
            id: r.id,
            nickname: FALLBACK_NICKS[Math.floor(Math.random() * FALLBACK_NICKS.length)],
            pkg: r.package_name ?? "PRO",
            tier: r.package_name?.includes("EMPIRE") ? "EMPIRE" : "VIP",
            ago: fmtAgo(new Date(r.created_at).getTime()),
          }));
          setItems(real);
          return;
        }
      } catch { /* fallback */ }
    }

    void load();
    const stopRefresh = setVisibleInterval(load, 30_000);

    const ch = supabase
      .channel("live-purchases")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "package_purchases" },
        () => void load(),
      )
      .subscribe();

    return () => {
      mounted = false;
      stopRefresh();
      supabase.removeChannel(ch);
    };
  }, []);

  // P0.5 — 봇 시드 피드를 메인 소스로 사용 (실제 결제 발생 시 prepend)
  const merged: Item[] = [
    ...items,
    ...botFeed
      .filter(f => f.event_type === "package_purchase" || f.event_type === "withdrawal" || f.event_type === "new_signup")
      .map(f => {
        const m = f.event_text.match(/(STARTER|Starter|Easy \d+|EMPIRE|ELITE|PHANTOM|VIP)/);
        const pkg = m ? m[0] : (f.event_type === "withdrawal" ? "출금완료" : "제국합류");
        return {
          id: `bot-${f.id}`,
          nickname: `${f.avatar_emoji} ${f.nickname}`,
          pkg,
          tier: pkg.toUpperCase().includes("EMPIRE") || pkg.toUpperCase().includes("PHANTOM") ? "EMPIRE" : "VIP",
          ago: fmtAgo(new Date(f.occurred_at).getTime()),
        };
      }),
  ];

  useEffect(() => {
    if (merged.length === 0) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % merged.length), 8000);
    return () => clearInterval(t);
  }, [merged.length]);

  if (!isFlagOn("livePurchaseTicker") || merged.length === 0) return null;
  const it = merged[idx % merged.length];
  if (!it) return null;


  return (
    <div className="fixed bottom-24 md:bottom-6 left-3 z-30">
      <div
        key={it.id + idx}
        onClick={() => void trackClick("live_purchase_ticker", "default", { pkg: it.pkg })}
        className="glass-strong rounded-full px-3 py-2 flex items-center gap-2 shadow-2xl border border-gold/30 animate-fade-up max-w-[260px] cursor-pointer"
      >
        <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
        <div className="text-[11px] truncate">
          <span className="font-bold text-gradient-gold">{it.nickname}</span>
          <span className="text-muted-foreground"> · </span>
          <span className="font-bold">{it.pkg}</span>
          <span className="text-muted-foreground"> · {it.ago}</span>
        </div>
      </div>
    </div>
  );
}
