import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, LogOut, Settings, Sparkles, User as UserIcon, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyPower } from "@/hooks/use-my-power";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * PhonaraTopBar — v14.0 Great Simplification.
 * Sticky 56–64px top bar: 로고 / PHON 잔액 + 충전 / 알림 + 아바타.
 * 비인증 시 로그인·무료시작 CTA만 표시.
 */
export default function PhonaraTopBar() {
  const nav = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancel) return;
      setAuthed(!!data.session);
      setEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      setEmail(s?.user?.email ?? null);
    });
    return () => { cancel = true; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <header
      className="sticky top-0 z-40 h-14 md:h-16 border-b border-border/40 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65 safe-top"
      style={{
        borderImage: "linear-gradient(90deg, hsl(var(--gold)/.35), hsl(var(--pink)/.35)) 1",
      }}
      role="banner"
    >
      <div className="container h-full flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group" aria-label="PHONARA.WORLD 홈">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_0_24px_-6px_hsl(var(--gold)/.6)]">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="hidden sm:inline font-imperial text-base tracking-[0.22em] text-foreground">
            PHONARA<span className="text-[hsl(var(--pink))]">.</span>WORLD
          </span>
        </Link>

        {authed === false && (
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-foreground/80 hover:text-foreground transition"
            >
              로그인
            </Link>
            <Link
              to="/auth?mode=signup"
              className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background press shadow-[0_8px_24px_-12px_hsl(var(--gold)/.6)]"
            >
              무료로 시작
            </Link>
          </div>
        )}

        {authed && <AuthedRight email={email} onSignOut={async () => { await supabase.auth.signOut(); nav("/"); }} />}
      </div>
    </header>
  );
}

function AuthedRight({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  const { phon } = useMyPower();
  return (
    <div className="flex items-center gap-2">
      {/* PHON balance chip + 충전 */}
      <Link
        to="/wallet"
        className="hidden sm:inline-flex items-center gap-2 h-9 pl-3 pr-1 rounded-full border border-border/60 bg-card/60 hover:border-[hsl(var(--gold)/.6)] transition press"
        aria-label="PHON 잔액 및 충전"
      >
        <span className="text-[10px] tracking-[0.2em] font-black text-muted-foreground">PHON</span>
        <span className="font-hud text-sm text-foreground tabular-nums">
          {Math.floor(phon).toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background text-[11px] font-black">
          <Wallet className="w-3 h-3" /> 충전
        </span>
      </Link>

      {/* mobile: 충전 only */}
      <Link
        to="/wallet"
        className="sm:hidden inline-flex items-center gap-1 h-9 px-3 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background text-xs font-black press"
        aria-label="충전"
      >
        <Wallet className="w-3.5 h-3.5" /> 충전
      </Link>

      {/* 알림 */}
      <Link
        to="/profile?tab=notifications"
        className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-border/60 bg-card/60 text-foreground/80 hover:text-foreground hover:border-border transition press"
        aria-label="알림"
      >
        <Bell className="w-4 h-4" />
      </Link>

      {/* 아바타 드롭다운 */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center gap-1 h-9 pl-1 pr-2 rounded-full border border-border/60 bg-card/60 hover:border-[hsl(var(--gold)/.6)] transition press"
          aria-label="내 메뉴 열기"
        >
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(var(--pink))] to-[hsl(var(--gold))] text-background">
            <UserIcon className="w-3.5 h-3.5" />
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
            {email ?? "내 계정"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/profile">내 프로필</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/wallet">지갑</Link></DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/vip" className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--pink))]" /> VIP Pass
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/security/overview" className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> 보안 · 설정
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} className="text-destructive">
            <LogOut className="w-3.5 h-3.5 mr-2" /> 로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
