import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { supabase } from "@/integrations/supabase/client";
import { useDB, formatKRW } from "@/lib/store";
import { Trophy, Lock, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PaymentStickyCTA from "@/components/missions/PaymentStickyCTA";

type Ach = {
  key: string; name: string; description: string; category: string;
  ap: number; reward_credit: number; badge_tier: string | null; sort_order: number;
};
type UA = { achievement_key: string; unlocked_at: string };

const TIER_COLORS: Record<string, string> = {
  bronze: "from-amber-700 to-amber-900",
  silver: "from-slate-300 to-slate-500",
  gold: "from-yellow-400 to-amber-600",
  platinum: "from-cyan-300 to-blue-500",
  diamond: "from-fuchsia-400 to-purple-600",
  mythic: "from-rose-400 via-fuchsia-500 to-violet-600",
};

// Map an achievement to the page where the user can make progress on it.
const CATEGORY_ROUTE: Record<string, string> = {
  onboard: "/guide",
  mission: "/missions",
  wealth: "/wallet",
  bot: "/missions?tab=bots",
  luck: "/missions?tab=battle",
  social: "/referral",
  deposit: "/packages",
  guild: "/lounge",
  hold: "/wallet",
  referral: "/referral",
  arena: "/arena",
  tier: "/empire",
  attendance: "/missions?tab=daily",
  season: "/missions?tab=daily",
  trust: "/trust",
  safety: "/security",
  hidden: "/achievements",
};

const KEY_ROUTE: Record<string, string> = {
  guide_master: "/guide",
  handbook_master: "/guide",
  speed_runner: "/guide",
  empire_founder: "/empire",
  guild_found: "/lounge",
  guild_join: "/lounge",
  coin_master: "/missions?tab=daily",
  golden_jackpot: "/missions?tab=battle",
  roulette_jackpot: "/missions?tab=battle",
  jackpot_hunter: "/missions?tab=battle",
  trust_kyc: "/security",
  trust_2fa: "/security/totp",
  trust_pin: "/security",
  trust_tos_v2: "/legal/tos",
  safety_email_verify: "/security",
  safety_device_trust: "/security",
  safety_recover: "/security",
  season_pass_premium: "/missions?tab=daily",
  arena_long_5: "/arena",
  arena_short_5: "/arena",
  arena_streak_5: "/arena",
  arena_streak_10: "/arena",
  arena_first_win: "/arena",
  arena_daily_top: "/arena",
  weekly_top1: "/referral",
  legend_referrer: "/referral",
};

function routeFor(a: { key: string; category: string }): string {
  return KEY_ROUTE[a.key] ?? CATEGORY_ROUTE[a.category] ?? "/dashboard";
}

export default function Achievements() {
  const [db] = useDB();
  const { t } = useTranslation("achievements");
  const [catalog, setCatalog] = useState<Ach[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [c, m] = await Promise.all([
        supabase.from("achievements_catalog" as any).select("*").order("sort_order"),
        db.user ? supabase.from("user_achievements" as any).select("achievement_key").eq("user_id", db.user.id) : Promise.resolve({ data: [] as any }),
      ]);
      setCatalog((c.data as any) ?? []);
      setMine(new Set(((m as any).data ?? []).map((x: UA) => x.achievement_key)));
    })();
  }, [db.user]);

  const cats = ["all", ...Array.from(new Set(catalog.map((c) => c.category)))];
  const filtered = tab === "all" ? catalog : catalog.filter((c) => c.category === tab);
  const unlockedCount = mine.size;
  const totalAp = catalog.filter((c) => mine.has(c.key)).reduce((s, c) => s + c.ap, 0);

  return (
    <Layout>
      <HubTabs hub="legacy" />
      <div className="space-y-6 pb-24">
        <header className="rounded-3xl bg-gradient-to-br from-primary/15 via-background to-background border border-primary/20 p-6">
          <div className="flex items-center gap-3">
            <Trophy className="text-primary" />
            <h1 className="font-imperial text-2xl font-black tracking-tight break-keep">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 break-keep">{t("subtitle")}</p>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Stat label={t("unlocked")} value={`${unlockedCount} / ${catalog.length}`} />
            <Stat label={t("ap")} value={`${totalAp}`} />
            <Stat label={t("rate")} value={catalog.length ? `${Math.round((unlockedCount / catalog.length) * 100)}%` : "0%"} />
          </div>
        </header>

        <Link
          to="/hall-of-fame"
          className="press flex items-center justify-between rounded-2xl p-4 min-h-[56px] bg-gradient-to-r from-gold/20 via-primary/10 to-accent/15 border border-gold/30 hover:border-gold/60 transition"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-gold" />
            <div>
              <div className="font-imperial font-black text-sm text-gradient-gold break-keep">{t("hofTitle")}</div>
              <div className="text-[11px] text-muted-foreground break-keep">{t("hofSub")}</div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-gold tracking-widest">{t("view")}</span>
        </Link>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setTab(c)}
              className={`px-4 min-h-[44px] rounded-full text-xs font-bold whitespace-nowrap break-keep transition ${
                tab === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {c === "all" ? t("all") : c.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const unlocked = mine.has(a.key);
            const grad = TIER_COLORS[a.badge_tier ?? "bronze"] ?? TIER_COLORS.bronze;
            return (
              <div
                key={a.key}
                className={`relative rounded-2xl border p-4 overflow-hidden ${
                  unlocked ? "border-primary/30 bg-card" : "border-border bg-muted/30"
                }`}
              >
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${grad} ${unlocked ? "opacity-30" : "opacity-5"} blur-2xl`} />
                <div className="relative flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-2xl ${unlocked ? "" : "grayscale opacity-50"}`}>
                    {unlocked ? "🏆" : <Lock size={20} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold truncate">{a.name}</h3>
                      <span className="text-[10px] uppercase font-bold opacity-70">{a.badge_tier}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold tabular-nums">+{a.ap} AP</span>
                      {a.reward_credit > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold tabular-nums">{formatKRW(a.reward_credit)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <PaymentStickyCTA />
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/50 border border-border p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground break-keep">{label}</div>
      <div className="text-lg font-black mt-1 tabular-nums">{value}</div>
    </div>
  );
}
