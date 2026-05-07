import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useDB, formatKRW } from "@/lib/store";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Crown, History as HistoryIcon, Gift } from "lucide-react";

// 8-segment wheel, must match server probabilities ordering
const SEGMENTS = [
  { label: "꽝",        color: "hsl(var(--muted))" },
  { label: "1,000원",    color: "hsl(var(--primary))" },
  { label: "3,000원",    color: "hsl(var(--secondary))" },
  { label: "5,000원",    color: "hsl(var(--primary))" },
  { label: "10,000원",   color: "hsl(var(--secondary))" },
  { label: "20,000원",   color: "hsl(var(--gold))" },
  { label: "50,000원",   color: "hsl(var(--gold))" },
  { label: "🎰 잭팟",    color: "hsl(var(--destructive))" },
];
const SEG_DEG = 360 / SEGMENTS.length;

type Spin = { id: string; kind: string; prize_label: string; amount: number; cost: number; created_at: string };

export default function Roulette() {
  const [db] = useDB();
  const user = db.user;
  const [stats, setStats] = useState<{ tier: string; used: number; limit: number; remaining: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<Spin[]>([]);
  const [lastResult, setLastResult] = useState<{ label: string; amount: number; segment: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<{ grade: string; label: string; amount: number; profit: number } | null>(null);

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
    setSpinning(true); setLastResult(null);
    const { data, error } = await supabase.rpc("spin_roulette" as any, { _kind: kind });
    if (error) {
      setSpinning(false);
      const m = error.message || "";
      if (m.includes("daily_limit")) toast({ title: "오늘 룰렛 횟수 소진", description: "내일 다시 도전해주세요." });
      else if (m.includes("empire_only")) toast({ title: "EMPIRE 전용", description: "골든 룰렛은 EMPIRE 등급 전용입니다." });
      else toast({ title: "오류", description: m, variant: "destructive" });
      return;
    }
    const res = data as any;
    // Animate: 6 full turns + segment center
    const target = 360 * 6 + (360 - res.segment * SEG_DEG - SEG_DEG / 2);
    setRotation((r) => r - (r % 360) + target);
    setTimeout(() => {
      setSpinning(false);
      setLastResult({ label: res.label, amount: res.amount, segment: res.segment });
      if (res.amount > 0) toast({ title: `🎉 ${res.label}`, description: `+${formatKRW(res.amount)}` });
      else toast({ title: "다음 기회에!", description: res.label });
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
      if (m.includes("empire_only")) toast({ title: "EMPIRE 전용", description: "가챠는 EMPIRE 등급 전용입니다." });
      else if (m.includes("insufficient_funds")) toast({ title: "잔액 부족", description: "가챠 비용 50,000원이 필요합니다.", variant: "destructive" });
      else toast({ title: "오류", description: m, variant: "destructive" });
      return;
    }
    setTimeout(() => {
      const res = data as any;
      setGachaResult(res);
      setPulling(false);
      toast({ title: `${res.grade} 등급!`, description: res.label });
      loadAll();
    }, 1800);
  }

  if (!user) {
    return <Layout><div className="container py-10 text-center text-sm text-muted-foreground">로그인이 필요합니다.</div></Layout>;
  }

  return (
    <Layout>
      <div className="container pt-6 pb-10 space-y-5 animate-liquid-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-2xl text-gradient-gold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-gold animate-pulse" /> 럭키 룰렛
            </h1>
            <p className="text-[11px] text-muted-foreground mt-1">매일 무료 스핀으로 보너스를 받아가세요</p>
          </div>
          {stats && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">남은 횟수</div>
              <div className="font-display font-black text-lg text-gold">{stats.remaining}/{stats.limit}</div>
            </div>
          )}
        </div>

        {/* Wheel */}
        <div className="glass-strong rounded-3xl p-6 neon-border relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-aurora opacity-[0.05] animate-gradient" style={{ backgroundSize: "300% 300%" }} />
          <div className="relative flex flex-col items-center">
            {/* Pointer */}
            <div className="relative w-[300px] h-[300px]">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 w-0 h-0"
                style={{ borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "20px solid hsl(var(--gold))", filter: "drop-shadow(0 0 8px hsl(var(--gold)))" }} />
              {/* Wheel */}
              <div ref={wheelRef}
                className="absolute inset-0 rounded-full border-4 border-gold/40 shadow-2xl"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)" : "none",
                  background: `conic-gradient(${SEGMENTS.map((s, i) =>
                    `${s.color} ${i * SEG_DEG}deg ${(i + 1) * SEG_DEG}deg`).join(",")})`,
                }}>
                {SEGMENTS.map((s, i) => {
                  // conic-gradient starts at 12 o'clock (top); CSS rotate starts at 3 o'clock (right).
                  // Subtract 90deg to align the label coordinate system with the colored wedges.
                  const angle = i * SEG_DEG + SEG_DEG / 2 - 90;
                  const isWinner = !spinning && lastResult?.segment === i;
                  return (
                    <div key={i} data-seg={i} data-label={s.label}
                      className="absolute top-1/2 left-1/2 origin-left"
                      style={{ transform: `rotate(${angle}deg) translateX(60px)` }}>
                      <div className={`text-[10px] font-black whitespace-nowrap ${isWinner ? "text-gold animate-pulse scale-110" : "text-foreground"}`}
                        style={{ transform: "rotate(90deg)", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Center hub */}
              <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-gradient-gold glow-gold grid place-items-center z-10 border-4 border-background">
                <Gift className="w-6 h-6 text-gold-foreground" />
              </div>
            </div>

            {lastResult && !spinning && (
              <div className="mt-4 text-center animate-liquid-in">
                <div className="text-xs text-muted-foreground">결과</div>
                <div className="font-display font-black text-xl text-gradient-gold">{lastResult.label}</div>
                {lastResult.amount > 0 && <div className="text-sm text-secondary font-bold">+{formatKRW(lastResult.amount)}</div>}
              </div>
            )}

            <div className="flex gap-2 mt-5 w-full">
              <button onClick={() => spin("standard")} disabled={spinning || (stats?.remaining ?? 0) <= 0}
                className="flex-1 py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-display font-black text-sm glow-primary press disabled:opacity-40 disabled:cursor-not-allowed">
                {spinning ? "스핀 중..." : "🎯 스탠다드 스핀"}
              </button>
              {isEmpire && (
                <button onClick={() => spin("golden")} disabled={spinning || (stats?.remaining ?? 0) <= 0}
                  className="flex-1 py-3 rounded-2xl bg-gradient-gold text-gold-foreground font-display font-black text-sm glow-gold press disabled:opacity-40 disabled:cursor-not-allowed">
                  👑 골든 스핀 (×5)
                </button>
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
                <h3 className="font-display font-black text-lg flex items-center gap-2">
                  <Crown className="w-5 h-5 text-gold" /> EMPIRE 황금 가챠
                </h3>
                <div className="text-[10px] text-muted-foreground">1회 50,000원</div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mb-3 text-center">
                {[
                  { g: "N",   v: "1만",   c: "text-muted-foreground" },
                  { g: "R",   v: "3만",   c: "text-primary" },
                  { g: "SR",  v: "10만",  c: "text-secondary" },
                  { g: "SSR", v: "50만",  c: "text-gold" },
                  { g: "UR",  v: "500만", c: "text-destructive" },
                ].map((x) => (
                  <div key={x.g} className="glass rounded-lg py-2">
                    <div className={`font-black text-xs ${x.c}`}>{x.g}</div>
                    <div className="text-[10px] text-muted-foreground">{x.v}</div>
                  </div>
                ))}
              </div>

              {gachaResult && (
                <div className={`mb-3 text-center p-3 rounded-xl glass-strong ${gachaResult.grade === "UR" ? "border-2 border-destructive animate-pulse" : gachaResult.grade === "SSR" ? "border-2 border-gold" : ""}`}>
                  <div className="font-display font-black text-lg">{gachaResult.label}</div>
                  <div className={`text-xs font-bold ${gachaResult.profit >= 0 ? "text-secondary" : "text-destructive"}`}>
                    순이익 {gachaResult.profit >= 0 ? "+" : ""}{formatKRW(gachaResult.profit)}
                  </div>
                </div>
              )}

              <button onClick={pullGacha} disabled={pulling}
                className="w-full py-3 rounded-2xl bg-gradient-gold text-gold-foreground font-display font-black text-sm glow-gold press disabled:opacity-40">
                {pulling ? "🌀 가챠 진행 중..." : "🎁 1회 뽑기 (50,000원)"}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div className="glass-strong rounded-2xl p-4 neon-border">
          <div className="flex items-center gap-2 mb-3">
            <HistoryIcon className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-display font-bold text-sm">최근 기록</h3>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {history.length === 0 && <div className="text-[11px] text-muted-foreground text-center py-4">기록 없음</div>}
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between glass rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    h.kind === "gacha" ? "bg-gold/20 text-gold" : h.kind === "golden" ? "bg-gold/20 text-gold" : "bg-primary/20 text-primary"
                  }`}>{h.kind === "gacha" ? "GACHA" : h.kind === "golden" ? "GOLDEN" : "STD"}</span>
                  <span className="text-xs truncate">{h.prize_label}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-bold ${h.amount > 0 ? "text-secondary" : "text-muted-foreground"}`}>
                    {h.amount > 0 ? "+" : ""}{formatKRW(h.amount)}
                  </div>
                  {h.cost > 0 && <div className="text-[9px] text-destructive">-{formatKRW(h.cost)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
