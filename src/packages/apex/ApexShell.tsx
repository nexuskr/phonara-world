import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { ApexThemeProvider } from "./ApexThemeProvider";
import { ApexBackdrop } from "./components/ApexBackdrop";
import { ApexHealthFab } from "./components/ApexHealthFab";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Home, Gamepad2, Gift, Vault, Trophy, Users, MoreHorizontal,
  Play, Package, User,
} from "lucide-react";

const PRIMARY = [
  { to: "/apex",            label: "Home",   icon: Home,     end: true },
  { to: "/apex/games",      label: "Games",  icon: Gamepad2 },
  { to: "/apex/free",       label: "Free",   icon: Gift },
  { to: "/apex/sportsbook", label: "Sports", icon: Trophy },
];

const MORE = [
  { to: "/apex/vault",      label: "Daily Vault", icon: Vault },
  { to: "/apex/community",  label: "Community",   icon: Users },
  { to: "/apex/reels",      label: "Win Reels",   icon: Play },
  { to: "/apex/lootbox",    label: "NFT Lootbox", icon: Package },
  { to: "/apex/my",         label: "My Apex",     icon: User },
  { to: "/apex/health",     label: "Health Dock", icon: MoreHorizontal },
];

export default function ApexShell() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <ApexThemeProvider>
      <div className="relative min-h-screen text-foreground apex-particle-burst">
        <ApexBackdrop />
        <div className="absolute inset-0 apex-grid-bg pointer-events-none" />

        <header className="sticky top-0 z-40 apex-glass border-b border-primary/20">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <NavLink to="/apex" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg apex-gradient flex items-center justify-center font-black text-background text-sm">
                A
              </div>
              <div className="leading-none">
                <span className="block text-lg font-black tracking-tight apex-gradient-text">APEXFORGE</span>
                <span className="block text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                  destroys stake · rollbit · freecash
                </span>
              </div>
            </NavLink>
            <NavLink to="/dashboard"
              className="text-[11px] px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition">
              ← Phonara
            </NavLink>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-6xl px-4 pb-28 pt-5 animate-fade-in">
          <Outlet />
        </main>

        {/* Bottom tab bar: 4 primary + More */}
        <nav className="fixed bottom-0 inset-x-0 z-40 apex-glass border-t border-primary/20 safe-bottom">
          <ul className="mx-auto max-w-6xl grid grid-cols-5">
            {PRIMARY.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                      isActive ? "text-primary apex-text-neon" : "text-muted-foreground hover:text-foreground"
                    }`
                  }>
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--apex-neon))]" : ""}`} />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
            <li>
              <button onClick={() => setMoreOpen(true)}
                className="w-full flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition">
                <MoreHorizontal className="w-5 h-5" />
                <span>More</span>
              </button>
            </li>
          </ul>
        </nav>

        <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More">
          <ul className="p-4 space-y-2">
            {MORE.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-primary/20 bg-card/50 p-3 hover:bg-primary/10 transition">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </BottomSheet>

        <ApexHealthFab />
      </div>
    </ApexThemeProvider>
  );
}
