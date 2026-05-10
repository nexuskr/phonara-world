import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useDB, formatKRW } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Crown, History as HistoryIcon, Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LuxButton, Money } from "@/components/ui/lux";
import { JackpotEmpireBanner } from "@/components/empire/JackpotEmpireBanner";
import { NearMissOverlay } from "@/components/empire/NearMissOverlay";

const SEG_DEG = 360 / 8;

type Spin = { id: string; kind: string; prize_label: string; amount: number; cost: number; created_at: string };

export default function Roulette() {
  const [db] = useDB();
  const { t } = useTranslation("roulette");
  const user = db.user;
  const [stats, setStats] = useState<{ tier: string; used: number; limit: number; remaining: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<Spin[]>([]);
  const [lastResult, setLastResult] = useState<{ label: string; amount: number; segment: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<{ grade: string; label: string; amount: number; profit: number } | null>(null);
  const [nearMiss, setNearMiss] = useState(false);

  const SEGMENTS = [
    { label: t("seg0"), color: "hsl(var(--muted))" },
    { label: t("seg1"), color: "hsl(var(--primary))" },
    { label: t("seg2"), color: "hsl(var(--secondary))" },
    { label: t("seg3"), color: "hsl(var(--primary))" },
    { label: t("seg4"), color: "hsl(var(--secondary))" },
    { label: t("seg5"), color: "hsl(var(--gold))" },
    { label: t("seg6"), color: "hsl(var(--gold))" },
    { label: t("seg7"), color: "hsl(var(--destructive))" },
  ];

  const wheelRef = useRef<HTMLDivElement>(null);
  const isEmpire = stats?.tier === "empire";

  async function loadAll() {
    if (!user) return;
    const [s, h] = await Promise.all([
      supabase.rpc("get_roulette_stats" as any),
      supabase.from("roulette_spins" as any).select("*").order("created_at", { ascending: false }).limit(15),
    ]);
    if (s.data) setStats(s.data as any);
    if (h.data) setHistory(h.data as any);
  }
  useEffect(() => { loadAll(); }, [user?.id]);

  async function spin(kind: "standard" | "golden") {
    if (spinning || !user) return;
    if ((stats?.remaining ?? 0) <= 0) {
      toast({ title: t("todayDone"), description: t("tomorrow") });
      return;
    }
    setSpinning(true); setLastResult(null);
    const { data, error } = await supabase.rpc("spin_roulette" as any, { _kind: kind });
    if (error) {
      setSpinning(false);
      const m = error.message || "";
      if (m.includes("daily_limit")) toast({ title: t("todayDone"), description: t("tomorrow") });
      else if (m.includes("empire_only")) toast({ title: t("empireOnly"), description: t("empireOnlySpin") });
      else toast({ title: t("common:error"), description: m, variant: "destructive" });
      return;
    }
    const res = data as any;
    const target = 360 * 6 + (360 - res.segment * SEG_DEG - SEG_DEG / 2);
    setRotation((r) => r - (r % 360) + target);
    setTimeout(() => {
      setSpinning(false);
      setLastResult({ label: res.label, amount: res.amount, segment: res.segment });
      if (res.amount > 0) toast({ title: `🎉 ${res.label}`, description: `+${formatKRW(res.amount)}` });
      else toast({ title: t("tryAgain"), description: res.label });
      loadAll();
    }, 4200);
  }

  async function pullGacha() {
    if (pulling || !user) return;
    setPulling(true); setGachaResult(null);
    const { data, error } = await supabase.rpc("gacha_pull" as any);
    if (error) {
      setPulling(false);
      const m = error.message || "";
      if (m.includes("empire_only")) toast({ title: t("empireOnly"), description: t("empireOnlyGacha") });
      else if (m.includes("insufficient_funds")) toast({ title: t("insufficient"), description: t("insufficientDesc"), variant: "destructive" });
      else toast({ title: t("common:error"), description: m, variant: "destructive" });
      return;
    }
    setTimeout(() => {
      const res = data as any;
      setGachaResult(res);
      setPulling(false);
      toast({ title: `${res.grade}`, description: res.label });
      loadAll();
    }, 1800);
  }

  if (!user) {
    return <Layout><div className="container py-10 text-center text-sm text-muted-foreground">{t("loginRequired")}</div></Layout>;
  }

  return (
    <Layout>
      <div className="container pt-6 pb-10 space-y-5 animate-liquid-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-imperial font-black text-2xl text-gradient-gold flex items-center gap-2 break-keep">
              <Sparkles className="w-6 h-6 text-gold animate-pulse" /> {t("title")}
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1 break-keep">{t("subtitle")}</p>
          </div>
          {stats && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">{t("remaining")}</div>
              <div className="font-imperial font-black text-lg text-gold tabular-nums">{stats.remaining}/{stats.limit}</div>
            </div>
          )}
        </div>

        {/* Wheel */}
        <div className="glass-strong rounded-3xl p-6 neon-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-aurora opacity-[0.05] animate-gradient" style={{ backgroundSize: "300% 300%" }} />
          <div className="relative flex flex-col items-center">
            <div className="relative w-[300px] h-[300px]">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0"
                style={{ borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "20px solid hsl(var(--gold))", filter: "drop-shadow(0 0 8px hsl(var(--gold)))" }} />
              <div ref={wheelRef}
                className="absolute inset-0 rounded-full border-4 border-gold/40 shadow-2xl"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)" : "none",
                  background: `conic-gradient(${SEGMENTS.map((s, i) =>
                    `${s.color} ${i * SEG_DEG}deg ${(i + 1) * SEG_DEG}deg`).join(",")})`,
                }}>
                {SEGMENTS.map((s, i) => {
                  const angle = i * SEG_DEG + SEG_DEG / 2 - 90;
                  const isWinner = !spinning && lastResult?.segment === i;
                  return (
                    <div key={i} data-seg={i} data-label={s.label}
                      className="absolute top-1/2 left-1/2 origin-left"
                      style={{ transform: `rotate(${angle}deg) translateX(60px)` }}>
                      <div className={`text-[10px] font-black whitespace-nowrap tabular-nums ${isWinner ? "text-gold animate-pulse scale-110" : "text-foreground"}`}
                        style={{ transform: "rotate(90deg)", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-gradient-gold glow-gold grid place-items-center z-10 border-4 border-background">
                <Gift className="w-6 h-6 text-gold-foreground" />
              </div>
            </div>

            {lastResult && !spinning && (
              <div className="mt-4 text-center animate-liquid-in">
                <div className="text-xs text-muted-foreground">{t("result")}</div>
                <div className="font-imperial font-black text-xl text-gradient-gold">{lastResult.label}</div>
                {lastResult.amount > 0 && <Money strong className="text-sm font-bold block">+{formatKRW(lastResult.amount)}</Money>}
                <div className="text-[10px] text-muted-foreground mt-1 break-keep">{t("verified")}</div>
              </div>
            )}

            <div className="flex gap-2 mt-5 w-full">
              <LuxButton variant="primary" size="md" className="flex-1 min-w-0 px-3 text-sm" disabled={spinning} onClick={() => spin("standard")}>
                <span className="truncate">{spinning ? t("spinning") : t("spinStandard")}</span>
              </LuxButton>
              {isEmpire && (
                <LuxButton variant="gold" size="md" className="flex-1 min-w-0 px-3 text-sm" disabled={spinning} onClick={() => spin("golden")}>
                  <span className="truncate">{t("spinGolden")}</span>
                </LuxButton>
              )}
            </div>
          </div>
        </div>

        {/* EMPIRE Gacha */}
        {isEmpire && (
          <div className="glass-strong rounded-3xl p-5 border-2 border-gold/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-gold opacity-5" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-imperial font-black text-lg flex items-center gap-2 break-keep">
                  <Crown className="w-5 h-5 text-gold" /> {t("gachaTitle")}
                </h3>
                <div className="text-[10px] text-muted-foreground tabular-nums">{t("gachaCost")}</div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mb-3 text-center">
                {[
                  { g: "N",   v: "1,000",   c: "text-muted-foreground" },
                  { g: "R",   v: "3,000",   c: "text-primary" },
                  { g: "SR",  v: "10,000",  c: "text-secondary" },
                  { g: "SSR", v: "50,000",  c: "text-gold" },
                  { g: "UR",  v: "500,000", c: "text-destructive" },
                ].map((x) => (
                  <div key={x.g} className="glass rounded-lg py-2">
                    <div className={`font-black text-xs ${x.c}`}>{x.g}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{x.v}</div>
                  </div>
                ))}
              </div>

              {gachaResult && (
                <div className={`mb-3 text-center p-3 rounded-xl glass-strong ${gachaResult.grade === "UR" ? "border-2 border-destructive animate-pulse" : gachaResult.grade === "SSR" ? "border-2 border-gold" : ""}`}>
                  <div className="font-imperial font-black text-lg">{gachaResult.label}</div>
                  <div className={`text-xs font-bold tabular-nums ${gachaResult.profit >= 0 ? "text-secondary" : "text-destructive"}`}>
                    {t("profit")} {gachaResult.profit >= 0 ? "+" : ""}{formatKRW(gachaResult.profit)}
                  </div>
                </div>
              )}

              <LuxButton variant="gold" size="lg" block disabled={pulling} onClick={pullGacha}>
                {pulling ? t("pulling") : t("pull")}
              </LuxButton>
            </div>
          </div>
        )}

        {/* History */}
        <div className="glass-strong rounded-2xl p-4 neon-border">
          <div className="flex items-center gap-2 mb-3">
            <HistoryIcon className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-imperial font-bold text-sm">{t("historyTitle")}</h3>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {history.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-4">{t("noHistory")}</div>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    h.kind === "gacha" ? "bg-gold/20 text-gold" : h.kind === "golden" ? "bg-gold/20 text-gold" : "bg-primary/20 text-primary"
                  }`}>{h.kind === "gacha" ? "GACHA" : h.kind === "golden" ? "GOLDEN" : "STD"}</span>
                  <span className="text-xs truncate">{h.prize_label}</span>
                </div>
                <div className="text-right shrink-0">
                  <Money strong={h.amount > 0} className={`text-xs font-bold ${h.amount > 0 ? "" : "!text-muted-foreground"}`}>
                    {h.amount > 0 ? "+" : ""}{formatKRW(h.amount)}
                  </Money>
                  {h.cost > 0 && <div className="text-[9px] text-destructive tabular-nums">-{formatKRW(h.cost)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
