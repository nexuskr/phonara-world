import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDB } from "@/lib/store";
import FreezeBanner from "@/components/FreezeBanner";
import SoundController from "@/components/sound/SoundController";
import WinCelebrationOverlay from "@/components/celebration/WinCelebrationOverlay";

/**
 * Lightweight shell for /casino routes.
 * Avoids global HUD/overlays/realtime widgets so the slot canvas runs at 60fps
 * and the page paints fast (mobile-first).
 */
export default function CasinoLayout({
  children,
  backTo,
  backLabel,
}: {
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  const [, setDb] = useDB();
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <FreezeBanner />
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="container flex items-center justify-between h-12">
          <div className="flex items-center gap-2 min-w-0">
            {backTo ? (
              <Link
                to={backTo}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {backLabel ?? "뒤로"}
              </Link>
            ) : (
              <Link to="/command" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-3.5 h-3.5" /> 대시보드
              </Link>
            )}
          </div>
          <Link to="/command" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-imperial flex items-center justify-center font-imperial font-black text-primary-foreground text-sm">
              P
            </div>
            <span className="font-imperial text-xs text-gradient-imperial tracking-[0.22em]">PHONARA</span>
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setDb((d) => ({ ...d, user: null }));
              nav("/");
            }}
            aria-label="로그아웃"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full glass border border-border/40 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>
      <SoundController />
      <main className="relative">{children}</main>
      <WinCelebrationOverlay />
    </div>
  );
}
