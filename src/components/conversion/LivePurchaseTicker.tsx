import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isFlagOn } from "@/lib/conversion-flags";

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
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  return `${Math.floor(sec / 3600)}시간 전`;
}

/** "방금 누가 결제했다" 우측 하단 floating ticker. realtime + fallback. */
export default function LivePurchaseTicker() {
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);

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
      // Fallback ticker (가입 직후 빈 DB 대응)
      setItems(
        Array.from({ length: 8 }).map((_, i) => ({
          id: String(i),
          nickname: FALLBACK_NICKS[i % FALLBACK_NICKS.length],
          pkg: FALLBACK_PKGS[i % FALLBACK_PKGS.length],
          tier: i % 4 === 3 ? "EMPIRE" : "VIP",
          ago: `${(i + 1) * 2}분 전`,
        })),
      );
    }

    void load();
    const refresh = setInterval(load, 30_000);

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
      clearInterval(refresh);
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!isFlagOn("livePurchaseTicker") || items.length === 0) return null;
  const it = items[idx];
  if (!it) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 left-3 z-30 pointer-events-none">
      <div
        key={it.id + idx}
        className="glass-strong rounded-full px-3 py-2 flex items-center gap-2 shadow-2xl border border-gold/30 animate-fade-up max-w-[260px]"
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
