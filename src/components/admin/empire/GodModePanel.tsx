/**
 * God Mode Panel — Empire Overview 우측
 * 가벼운 버튼 그리드. 각 액션은 기존 admin 라우트로 점프.
 * (실제 위험한 RPC는 해당 페이지에서 AAL2 게이트로 보호되므로 여기서는 네비게이션만)
 */
import { Link } from "react-router-dom";
import {
  Wand2, Crown, Rocket, Image as ImageIcon, Megaphone, ShieldCheck,
} from "lucide-react";

type Action = {
  to: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  glow: string;
};

const ACTIONS: Action[] = [
  {
    to: "/admin/compliance/risk",
    label: "Empire Auto Heal",
    hint: "이상감지 큐 즉시 해결",
    icon: Wand2,
    glow: "from-emerald-500/30 to-cyan-500/20",
  },
  {
    to: "/admin/game/crown-trigger",
    label: "Manual Crown",
    hint: "황제에게 Crown Explosion",
    icon: Crown,
    glow: "from-yellow-400/40 to-orange-500/20",
  },
  {
    to: "/admin/growth/marketing",
    label: "Flash Event",
    hint: "원클릭 캠페인 런처",
    icon: Rocket,
    glow: "from-fuchsia-500/30 to-pink-500/20",
  },
  {
    to: "/admin/product/users",
    label: "GIF Generator",
    hint: "황제 아바타 GIF",
    icon: ImageIcon,
    glow: "from-violet-500/30 to-indigo-500/20",
  },
  {
    to: "/admin/ops/notify",
    label: "Global Blast",
    hint: "푸시 · 텔레그램 · 인앱",
    icon: Megaphone,
    glow: "from-sky-500/30 to-blue-500/20",
  },
  {
    to: "/admin/compliance/perms",
    label: "Permission Lock",
    hint: "권한 drift 점검",
    icon: ShieldCheck,
    glow: "from-rose-500/30 to-red-500/20",
  },
];

export function GodModePanel() {
  return (
    <div className="glass-strong rounded-3xl p-4 sm:p-5 border border-primary/30 relative overflow-hidden h-full">
      {/* 정적 글로우 — JS 없음 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)]" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono text-primary/80 px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10">
            GOD MODE
          </span>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
            One-Click Empire Control
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group relative rounded-xl border border-border/40 bg-background/40 p-3 overflow-hidden
                         transition-[transform,border-color] duration-200 hover:border-primary/50 hover:-translate-y-0.5
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* hover에만 글로우 작동 (idle 시 GPU 0%) */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                            bg-gradient-to-br ${a.glow} pointer-events-none`}
              />
              <div className="relative flex items-start gap-2">
                <a.icon className="h-4 w-4 mt-0.5 text-primary" />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{a.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{a.hint}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground/70 leading-relaxed">
          민감한 작업은 해당 페이지의 AAL2 게이트와 <code>require_admin()</code> 가드로
          이중 보호됩니다.
        </p>
      </div>
    </div>
  );
}
