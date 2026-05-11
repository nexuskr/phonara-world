import { NavLink, useLocation } from "react-router-dom";
import { Target, Sparkles, Gamepad2, Crown, Layers, Users, Wallet, ArrowDownToLine, ArrowUpFromLine, Receipt, Trophy, Award, Share2, TrendingUp, BarChart3, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ComponentType } from "react";

type HubKey = "command" | "earn" | "empire" | "treasury" | "legacy";

type Tab = { to: string; tKey: string; icon: ComponentType<{ className?: string }> };

const HUBS: Record<HubKey, { tabs: Tab[] }> = {
  command: {
    tabs: [
      { to: "/", tKey: "command.dashboard", icon: LayoutDashboard },
    ],
  },
  earn: {
    tabs: [
      { to: "/arena/army", tKey: "earn.tradingArena", icon: TrendingUp },
      { to: "/missions",   tKey: "earn.missions",    icon: Target },
      { to: "/packages",   tKey: "empire.packages",  icon: Crown },
    ],
  },
  empire: {
    tabs: [
      { to: "/packages",            tKey: "empire.packages", icon: Crown },
      { to: "/empire",              tKey: "empire.tier",     icon: Layers },
      { to: "/empire?view=founding",tKey: "empire.founding", icon: Users },
    ],
  },
  treasury: {
    tabs: [
      { to: "/wallet",               tKey: "treasury.wallet",   icon: Wallet },
      { to: "/wallet?tab=deposit",   tKey: "treasury.deposit",  icon: ArrowDownToLine },
      { to: "/wallet?tab=withdraw",  tKey: "treasury.withdraw", icon: ArrowUpFromLine },
      { to: "/wallet?tab=history",   tKey: "treasury.history",  icon: Receipt },
      { to: "/treasury/settlements", tKey: "treasury.settlements", icon: TrendingUp },
    ],
  },
  legacy: {
    tabs: [
      { to: "/whales",               tKey: "legacy.whales",       icon: Trophy },
      { to: "/referral",             tKey: "legacy.referral",     icon: Share2 },
      { to: "/ugc",                  tKey: "legacy.ugc",          icon: BarChart3 },
      { to: "/legacy",               tKey: "legacy.ranking",      icon: Trophy },
      { to: "/achievements",         tKey: "legacy.achievements", icon: Award },
    ],
  },
};

export default function HubTabs({ hub }: { hub: HubKey }) {
  const cfg = HUBS[hub];
  const loc = useLocation();
  const { t } = useTranslation("hubs");
  if (!cfg) return null;

  return (
    <div className="container pt-4 pb-2">
      <div className="flex items-baseline gap-3 mb-3">
        <h1 className="font-imperial text-2xl md:text-3xl text-gradient-imperial tracking-[0.18em]">
          {t(`${hub}.title`)}
        </h1>
        <span className="text-[11px] text-muted-foreground tracking-wide hidden sm:inline">
          {t(`${hub}.tagline`)}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {cfg.tabs.map(({ to, tKey, icon: Icon }) => {
          const path = to.split("?")[0];
          const active = loc.pathname === path;
          return (
            <NavLink
              key={to}
              to={to}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition press ${
                active
                  ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                  : "glass text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(tKey)}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
