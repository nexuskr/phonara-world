// PR-12: Baron FOMO Dialog v2 — pulsing countdown, 3 message variants, shimmer CTA.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Percent, Users, Bot, Timer, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatHMS } from "@/hooks/use-empire-booster";

type FomoRow = {
  id: number;
  kind: string;
  level: number | null;
  payload: any;
  created_at: string;
};

type Variant = {
  title: string;
  desc: (seats: number) => string;
  ctaPrimary: string;
  ctaSecondary: string;
  accent: "gold" | "rose" | "violet";
  intensity: "high" | "extreme" | "nuclear";
};

const VARIANTS: Record<number, Variant> = {
  1: {
    title: "👑 Baron 등극 — 권좌가 열렸다",
    desc: (s) => `상위 5%만 받는 24시간 한정 부스터. 이번 주 단 ${s}석. 마감 시 다음 시즌까지 봉쇄됩니다.`,
    ctaPrimary: "지금 권좌를 차지하라",
    ctaSecondary: "포기하기",
    accent: "gold",
    intensity: "high",
  },
  2: {
    title: "🔥 BARON UNLOCKED — 24h만 살아있는 권력",
    desc: (s) => `Crown ×1.5 / 수수료 -30% 부스터가 24시간만 가동됩니다. 잔여 ${s}석. 시간이 너의 적이다.`,
    ctaPrimary: "Booster 활성화 →",
    ctaSecondary: "다음 시즌 대기",
    accent: "rose",
    intensity: "extreme",
  },
  3: {
    title: "⚡ EMPIRE PROTOCOL · BARON TIER",
    desc: (s) => `너는 ${s}명 중 한 명이다. 24시간 후 부스터는 영구 소멸. 다른 Baron들은 이미 진입했다.`,
    ctaPrimary: "Empire 입장",
    ctaSecondary: "나중에 (위험)",
    accent: "violet",
    intensity: "nuclear",
  },
};

const ACCENT: Record<Variant["accent"], { ring: string; glow: string; cta: string; titleClass: string }> = {
  gold: {
    ring: "border-sim-gold/50",
    glow: "from-background via-amber-950/20 to-sim-gold/10",
    cta: "from-sim-gold via-amber-300 to-primary",
    titleClass: "text-gradient-imperial",
  },
  rose: {
    ring: "border-rose-500/50",
    glow: "from-background via-rose-950/30 to-rose-500/10",
    cta: "from-rose-500 via-pink-400 to-fuchsia-500",
    titleClass: "text-rose-300",
  },
  violet: {
    ring: "border-violet-500/60",
    glow: "from-background via-violet-950/30 to-fuchsia-500/10",
    cta: "from-violet-500 via-fuchsia-400 to-cyan-400",
    titleClass: "text-fuchsia-300",
  },
};

export default function BaronPromotionDialog() {
  const [row, setRow] = useState<FomoRow | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const nav = useNavigate();

  async function loadLatest() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase
      .from("fomo_notifications") as any)
      .select("id, kind, level, payload, created_at")
      .eq("user_id", user.id)
      .eq("kind", "baron_promotion")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setRow(data as FomoRow);
  }

  useEffect(() => {
    void loadLatest();
    const ch = supabase
      .channel("fomo-baron")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fomo_notifications" }, () => void loadLatest())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // 1s tick for live countdown
  useEffect(() => {
    if (!row) return;
    const t = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(t);
  }, [row]);

  async function dismiss() {
    if (!row) return;
    await (supabase.from("fomo_notifications") as any).update({ read_at: new Date().toISOString() }).eq("id", row.id);
    setRow(null);
  }

  const variant = useMemo<Variant>(() => {
    const v = Number(row?.payload?.variant ?? 1);
    return VARIANTS[v] ?? VARIANTS[1];
  }, [row]);

  if (!row) return null;
  const seats = row.payload?.seats_left ?? 50;
  const lev = row.payload?.leverage ?? 7;
  const fee = Math.round(((row.payload?.fee_discount ?? 0.30) as number) * 100);
  const mult = Number(row.payload?.crown_multiplier ?? 1.5);
  const expiresAt = row.payload?.expires_at ? new Date(row.payload.expires_at).getTime() : null;
  const remainingMs = expiresAt ? Math.max(0, expiresAt - now) : null;
  const accent = ACCENT[variant.accent];
  const critical = remainingMs !== null && remainingMs < 4 * 3600 * 1000;

  return (
    <Dialog open={!!row} onOpenChange={(o) => { if (!o) void dismiss(); }}>
      <DialogContent className={`max-w-md border ${accent.ring} bg-gradient-to-b ${accent.glow} overflow-hidden`}>
        {/* Animated aura */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-10 opacity-50"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, rgba(251,191,36,0.18) 30%, transparent 50%, rgba(244,63,94,0.18) 80%, transparent 100%)",
            filter: "blur(40px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, ease: "linear", repeat: Infinity }}
        />

        <DialogHeader className="relative">
          <DialogTitle className={`flex items-center gap-2 font-imperial text-xl tracking-wider ${accent.titleClass}`}>
            <Crown className="w-5 h-5 text-sim-gold" /> {variant.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {variant.desc(seats)}
          </DialogDescription>
        </DialogHeader>

        {/* Live countdown — pulsing, gets red as expiry nears */}
        {remainingMs !== null && (
          <motion.div
            className={`relative flex items-center justify-between px-3 py-2.5 rounded-lg border ${
              critical ? "border-rose-400/60 bg-rose-950/40" : "border-sim-gold/40 bg-amber-950/30"
            }`}
            animate={critical ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-2">
              {critical ? <Flame className="w-4 h-4 text-rose-300" /> : <Timer className="w-4 h-4 text-sim-gold" />}
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Booster 만료까지
              </span>
            </div>
            <span className={`font-display font-black text-2xl tabular-nums ${critical ? "text-rose-200" : "text-sim-gold"}`}>
              {formatHMS(remainingMs)}
            </span>
          </motion.div>
        )}

        <div className="relative grid grid-cols-2 gap-2 my-3">
          <Perk icon={Zap}     label="레버리지"      value={`${lev}x`} />
          <Perk icon={Percent} label="수수료 할인"   value={`-${fee}%`} highlight />
          <Perk icon={Crown}   label="Crown 배수"   value={`×${mult}`} highlight />
          <Perk icon={Bot}     label="전용 Advisor" value="ON" />
        </div>

        <div className="relative flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" /> 이번 주 잔여 {seats}석 · 다른 Baron 후보 {Math.max(3, seats * 2)}명 대기 중
        </div>

        <div className="relative flex gap-2 mt-4">
          <Button variant="ghost" onClick={dismiss} className="flex-1 text-xs text-muted-foreground hover:text-foreground">
            {variant.ctaSecondary}
          </Button>
          <Button
            onClick={() => { void dismiss(); nav("/wallet"); }}
            className={`flex-[2] relative overflow-hidden font-bold tracking-wide bg-gradient-to-r ${accent.cta} text-primary-foreground shadow-lg`}
          >
            {/* Shimmer */}
            <motion.span
              aria-hidden
              className="absolute inset-y-0 -left-1/3 w-1/3"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
              animate={{ x: ["0%", "350%"] }}
              transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
            />
            <span className="relative z-10">{variant.ctaPrimary}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Perk({ icon: Icon, label, value, highlight = false }: any) {
  return (
    <div className={`glass rounded-lg p-2.5 ${highlight ? "ring-1 ring-sim-gold/40" : ""}`}>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`font-display font-black text-sm mt-0.5 ${highlight ? "text-sim-gold" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
