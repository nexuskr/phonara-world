import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BADGE_TIER_COLORS, BADGE_TIER_ORDER } from "@/lib/gamification";
import { useAchievement } from "@/hooks/use-achievement";
import { Award } from "lucide-react";

type BadgeRow = { key: string; name: string; tier: string; icon: string | null };

/** Profile badge collection grid — Bronze/Silver/Gold/Legendary tiers. */
export default function BadgeCollection({ className }: { className?: string }) {
  const { badges, loading: ulLoading } = useAchievement();
  const [catalog, setCatalog] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("badges_catalog").select("key, name, tier, icon");
      if (!alive) return;
      setCatalog(((data ?? []) as BadgeRow[]));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const ownedKeys = new Set(badges.map(b => b.badge_key));
  const sorted = [...catalog].sort(
    (a, b) => (BADGE_TIER_ORDER[a.tier] ?? 99) - (BADGE_TIER_ORDER[b.tier] ?? 99) || a.key.localeCompare(b.key),
  );
  const owned = sorted.filter(b => ownedKeys.has(b.key));
  const locked = sorted.filter(b => !ownedKeys.has(b.key));

  if (loading || ulLoading) {
    return <div className={`rounded-xl border border-border/60 bg-card/60 p-4 h-40 animate-pulse ${className ?? ""}`} />;
  }

  return (
    <section className={`rounded-xl border border-border/60 bg-card/60 backdrop-blur-md p-4 ${className ?? ""}`} aria-label="배지 컬렉션">
      <header className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Award className="w-4 h-4 text-amber-300" aria-hidden />
          배지 컬렉션
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {owned.length} / {sorted.length}
        </span>
      </header>

      {owned.length === 0 && (
        <p className="text-xs text-muted-foreground mb-3">아직 배지가 없습니다. 업적을 달성해 첫 배지를 획득해 보세요.</p>
      )}

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {owned.map(b => (
          <BadgeTile key={b.key} badge={b} owned />
        ))}
        {locked.slice(0, 24).map(b => (
          <BadgeTile key={b.key} badge={b} owned={false} />
        ))}
      </div>
      {locked.length > 24 && (
        <div className="mt-2 text-[11px] text-muted-foreground text-center">
          +{locked.length - 24}종 더 획득 가능
        </div>
      )}
    </section>
  );
}

function BadgeTile({ badge, owned }: { badge: BadgeRow; owned: boolean }) {
  const tone = BADGE_TIER_COLORS[badge.tier] ?? BADGE_TIER_COLORS.bronze;
  return (
    <div
      title={`${badge.name} · ${badge.tier}`}
      className={`relative aspect-square rounded-lg border flex items-center justify-center text-xl transition-all ${
        owned
          ? `bg-gradient-to-br ${tone} border-white/30 shadow-md`
          : "bg-muted/20 border-border/40 opacity-40 grayscale"
      }`}
    >
      <span className="drop-shadow">{badge.icon ?? "🎖️"}</span>
    </div>
  );
}
