import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, TrendingUp, Gamepad2, User, Crown, Swords, type LucideIcon } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useLongPress } from "@/hooks/use-long-press";
import { notify } from "@/lib/notify";

/**
 * v19 Slice 3 — Imperial 5-tab nav + center Half-Off FAB.
 *
 * 50~70대도 한눈에 이해할 수 있게 라벨은 한글 단독.
 * 중앙(3번 슬롯)은 빈 자리, 그 위에 absolute -top-5 로 PHON FAB 떠 있음.
 *
 * 모바일: 화면 하단 고정 + safe-area inset.
 * 데스크탑(md+): TopBar 아래 sticky 유지.
 */

type Tab = {
  to: string;
  icon: LucideIcon;
  label: string;
};

const TABS: Tab[] = [
  { to: "/",        icon: Home,       label: "홈" },
  { to: "/trade",   icon: TrendingUp, label: "거래" },
  { to: "/phon",    icon: Crown,      label: "PHON" }, // 중앙 FAB
  { to: "/games",   icon: Gamepad2,   label: "게임" },
  { to: "/profile", icon: User,       label: "내정보" },
];

function isActive(pathname: string, to: string) {
  if (to === "/")        return pathname === "/" || pathname === "/dashboard";
  if (to === "/trade")   return pathname === to || pathname.startsWith("/trade/") || pathname.startsWith("/arena");
  if (to === "/phon")    return pathname === to || pathname.startsWith("/phon/");
  if (to === "/games")   return pathname === to || pathname.startsWith("/games/") || pathname.startsWith("/casino");
  if (to === "/profile") return pathname === to || pathname.startsWith("/profile/") || pathname.startsWith("/security");
  return pathname === to;
}

export default function PhonaraNav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const centerLP = useLongPress<HTMLButtonElement>({
    onShort: () => {
      haptics.select();
      navigate("/phon");
    },
    onLong: () => {
      haptics.win();
      notify.success("⚔️ 황제의 대관전", { duration: 800 });
      navigate("/duel");
    },
    ms: 600,
  });
  return (
    <nav
      className="
        fixed bottom-0 inset-x-0 z-40 md:sticky md:top-14 md:bottom-auto
        bg-background/95 md:bg-background/90 backdrop-blur
        border-t md:border-t-0 md:border-b border-border/40
        pb-[env(safe-area-inset-bottom)]
      "
      aria-label="Phonara navigation"
    >
      <div className="container py-2">
        <div className="relative grid grid-cols-5 gap-1.5 items-end">
          {TABS.map((t, idx) => {
            const isCenter = idx === 2;
            const active = isActive(loc.pathname, t.to);
            const Icon = t.icon;

            if (isCenter) {
              // 중앙 슬롯 — 빈 자리 + 떠있는 FAB
              return (
                <div key={t.to} className="relative h-[58px] flex items-end justify-center">
                  <button
                    type="button"
                    {...centerLP.bind}
                    aria-label="PHON 허브 — 길게 누르면 황제의 대관전으로 입장"
                    className="
                      group relative absolute -top-5
                      flex flex-col items-center justify-center gap-0.5
                      w-16 h-16 rounded-full
                      imperial-halfoff text-black
                      ring-2 ring-amber-300/70
                      shadow-[0_8px_32px_-4px_hsl(var(--accent)/0.6)]
                      glow-imperial-xl pulse-halo
                      active:scale-95 transition-transform duration-150
                      touch-none select-none will-change-transform
                    "
                  >
                    <Crown className="w-6 h-6" strokeWidth={2.5} />
                    <span className="text-[9px] font-black tracking-tight leading-none">PHON</span>
                    {/* Long-press sword overlay — transform/opacity only */}
                    <Swords
                      aria-hidden
                      className={`
                        pointer-events-none absolute -left-2 top-1/2 w-3.5 h-3.5 text-rose-200
                        drop-shadow-[0_0_6px_hsl(330_90%_60%/0.8)]
                        transition-all duration-300 motion-reduce:hidden
                        ${centerLP.pressing
                          ? "opacity-100 -translate-x-1 -translate-y-1/2 scale-100 rotate-[-12deg]"
                          : "opacity-0 translate-x-1 -translate-y-1/2 scale-50 rotate-0"}
                      `}
                    />
                    <Swords
                      aria-hidden
                      className={`
                        pointer-events-none absolute -right-2 top-1/2 w-3.5 h-3.5 text-amber-200
                        drop-shadow-[0_0_6px_hsl(38_92%_60%/0.8)]
                        transition-all duration-300 motion-reduce:hidden
                        ${centerLP.pressing
                          ? "opacity-100 translate-x-1 -translate-y-1/2 scale-100 rotate-[12deg] scale-x-[-1]"
                          : "opacity-0 -translate-x-1 -translate-y-1/2 scale-50 rotate-0 scale-x-[-1]"}
                      `}
                    />
                  </button>
                  <span className="sr-only">짧게 누르면 PHON 허브, 길게 누르면 황제의 대관전(/duel)로 이동합니다.</span>
                  {/* 라벨 — 첫 입금 보너스 칩 */}
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-wide bg-rose-500/20 text-rose-200 border border-rose-400/40 whitespace-nowrap">
                    첫입금 +50%
                  </span>
                </div>
              );
            }

            return (
              <NavLink
                key={t.to}
                to={t.to}
                onClick={() => haptics.tick()}
                aria-current={active ? "page" : undefined}
                className={`
                  relative flex flex-col items-center justify-center gap-0.5
                  h-[58px] rounded-xl border transition-all duration-200 press
                  ${active
                    ? "bg-card/60 border-amber-400/50 text-[hsl(var(--gold))] -translate-y-0.5"
                    : "bg-card/30 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"}
                `}
              >
                <Icon
                  className={`w-5 h-5 ${active ? "drop-shadow-[0_0_6px_hsl(var(--gold)/0.6)]" : ""}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`text-[12px] font-black tracking-wide ${active ? "text-[hsl(var(--gold))]" : ""}`}>
                  {t.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
