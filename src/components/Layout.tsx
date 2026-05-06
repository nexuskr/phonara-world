import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Target, Wallet, Crown, User as UserIcon, Sparkles, LogOut, ShieldCheck, MessageSquare } from "lucide-react";
import { useDB } from "@/lib/store";

const items = [
  { to: "/dashboard", icon: Home, label: "홈" },
  { to: "/missions", icon: Target, label: "미션" },
  { to: "/packages", icon: Crown, label: "패키지" },
  { to: "/wallet", icon: Wallet, label: "지갑" },
  { to: "/support", icon: MessageSquare, label: "고객센터" },
  { to: "/profile", icon: UserIcon, label: "MY" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const loc = useLocation();
  const user = db.user;

  return (
    <div className="min-h-screen pb-24">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary glow-primary flex items-center justify-center font-display font-black text-primary-foreground">
              폰
            </div>
            <span className="font-display font-bold text-lg tracking-wider">
              <span className="text-gradient-primary">PHONE</span>
              <span className="text-foreground">MISSION</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user?.isAdmin && (
              <button onClick={() => nav("/admin")} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-gold text-gold-foreground glow-gold">
                <ShieldCheck className="w-3.5 h-3.5" /> 관리자
              </button>
            )}
            {user ? (
              <button
                onClick={() => { setDb(d => ({ ...d, user: null })); nav("/"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs glass hover:bg-muted/40 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> 로그아웃
              </button>
            ) : (
              <Link to="/auth" className="px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-primary text-primary-foreground glow-primary">로그인</Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative">{children}</main>

      {/* Bottom nav (mobile-first) */}
      {user && (
        <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md">
          <div className="glass-strong rounded-2xl px-2 py-2 flex items-center justify-between shadow-2xl neon-border">
            {items.map(({ to, icon: Icon, label }) => {
              const active = loc.pathname === to;
              return (
                <NavLink key={to} to={to} className="flex-1">
                  <div className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition ${active ? "bg-gradient-primary/15" : ""}`}>
                    <div className={`relative ${active ? "text-primary" : "text-muted-foreground"}`}>
                      <Icon className="w-5 h-5" />
                      {active && <div className="absolute -inset-2 rounded-full bg-primary/20 blur-md -z-10" />}
                    </div>
                    <span className={`text-[10px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
