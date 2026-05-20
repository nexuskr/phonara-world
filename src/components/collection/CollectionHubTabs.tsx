/**
 * Slice 2 — PHON Collection 단일 노출층.
 * 업적 / NFT / VIP 등급을 한 줄 탭으로 통합 (3개 페이지가 같은 헤더 공유).
 */
import { NavLink } from "react-router-dom";
import { Trophy, Gem, Sparkles } from "lucide-react";

const TABS = [
  { to: "/achievements", icon: Trophy, label: "업적" },
  { to: "/empire/collection", icon: Gem, label: "NFT" },
  { to: "/vip", icon: Sparkles, label: "VIP 등급" },
] as const;

export default function CollectionHubTabs() {
  return (
    <div className="mb-4 rounded-2xl border border-border/40 bg-card/30 p-1.5">
      <div className="flex items-center gap-1">
        <div className="hidden sm:flex items-center gap-2 px-3 text-[10px] tracking-[0.25em] font-black text-muted-foreground uppercase">
          PHON Collection
        </div>
        <nav className="flex flex-1 gap-1" role="tablist" aria-label="PHON Collection 탭">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                `flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                  isActive
                    ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`
              }
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
