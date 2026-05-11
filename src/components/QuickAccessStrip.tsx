import { NavLink, useLocation } from "react-router-dom";

/**
 * Phase 2 — 초직관 6대 메뉴 띠.
 *
 * 20~70대 한국인이 첫 화면에서 즉시 행동을 인지할 수 있도록
 * 이모지 + 짧은 한국어 라벨로 6개 핵심 진입점을 노출.
 *
 * 디자인 시스템(다크/골드 Empire) 1픽셀도 건드리지 않고,
 * 기존 5축 IA Layout 헤더 바로 아래 sticky strip으로만 추가.
 */

type QuickItem = {
  to: string;
  emoji: string;
  label: string;
  matches?: string[];
};

const ITEMS: QuickItem[] = [
  { to: "/start",    emoji: "💰", label: "지금 제국 시작하기", matches: ["/start", "/dashboard"] },
  { to: "/earnings", emoji: "📈", label: "내 수익 확인",         matches: ["/earnings", "/missions"] },
  { to: "/arena",     emoji: "🔥", label: "실전 트레이딩",         matches: ["/arena"] },
  { to: "/arena/army",emoji: "⚔️", label: "군대 배틀",              matches: ["/arena/army"] },
  { to: "/lounge",   emoji: "💎", label: "제국 라운지",          matches: ["/lounge", "/empire"] },
  { to: "/jackpot",  emoji: "🎖️", label: "제국 대박 보상",       matches: ["/jackpot", "/roulette"] },
  { to: "/wallet",   emoji: "🛡️", label: "내 지갑",              matches: ["/wallet", "/treasury", "/secure-wallet"] },
];

function isActive(item: QuickItem, pathname: string) {
  const all = item.matches ?? [item.to];
  return all.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export default function QuickAccessStrip() {
  const loc = useLocation();
  return (
    <div
      role="navigation"
      aria-label="초직관 6대 메뉴"
      className="glass border-b border-primary/15"
    >
      <div className="container py-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {ITEMS.map((item) => {
            const active = isActive(item, loc.pathname);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-tight transition press ${
                  active
                    ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                    : "border border-primary/30 text-primary hover:bg-primary/10"
                }`}
              >
                <span aria-hidden className="text-sm leading-none">{item.emoji}</span>
                <span className="break-keep">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
