import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sword, Shield, MapPin, Flame, Trophy, Coins, TrendingUp, TrendingDown } from "lucide-react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { notify } from "@/lib/notify";
import { formatKRW } from "@/lib/store";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import ArenaTutorialOverlay from "@/components/empire/ArenaTutorialOverlay";
import { useBybitTicker } from "@/hooks/use-bybit-ticker";

const TERRITORIES = [
  { key: "seoul", name: "서울", x: 30, y: 22 },
  { key: "incheon", name: "인천", x: 18, y: 26 },
  { key: "daejeon", name: "대전", x: 35, y: 50 },
  { key: "daegu", name: "대구", x: 55, y: 58 },
  { key: "gwangju", name: "광주", x: 22, y: 72 },
  { key: "busan", name: "부산", x: 65, y: 78 },
  { key: "jeju", name: "제주", x: 25, y: 92 },
] as const;

type MapState = {
  territories: Record<string, number>;
  conquest_count: number;
  raid_count: number;
  last_battle_at: string | null;
};

type Battle = {
  id: string;
  side: "long" | "short";
  result: "win" | "loss" | "liquidation" | "near_miss";
  pnl: number;
  territory: string | null;
  created_at: string;
};

export default function EmpireArena() {
  const user = useRequireAuth();
  const [map, setMap] = useState<MapState | null>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      const [{ data: mapData }, { data: battleRows }] = await Promise.all([
        supabase.rpc("get_my_empire_map" as any),
        supabase.from("empire_battles").select("id,side,result,pnl,territory,created_at").order("created_at", { ascending: false }).limit(15),
      ]);
      const m = mapData as any;
      if (m && !m.error) {
        setMap({
          territories: m.territories ?? {},
          conquest_count: Number(m.conquest_count ?? 0),
          raid_count: Number(m.raid_count ?? 0),
          last_battle_at: m.last_battle_at ?? null,
        });
      }
      setBattles((battleRows ?? []) as Battle[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) void load(); }, [user, load]);

  // Realtime: 본인 새 전투
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("empire-battles-self")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "empire_battles", filter: `user_id=eq.${user.id}` },
        () => { void load(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, load]);

  const fight = useCallback(async (side: "long" | "short") => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      // 데모용 결과 시뮬레이션 (Paper 모드, 실제 트레이딩은 별도 화면)
      const r = Math.random();
      const result: Battle["result"] =
        r < 0.55 ? "win" : r < 0.78 ? "near_miss" : r < 0.95 ? "loss" : "liquidation";
      const pnl = result === "win" ? Math.floor(Math.random() * 4500 + 500)
              : result === "near_miss" ? 0
              : result === "loss" ? -Math.floor(Math.random() * 1500)
              : -Math.floor(Math.random() * 4000 + 1000);

      const { data, error } = await supabase.rpc("record_empire_battle" as any, {
        _side: side, _result: result, _pnl: pnl, _mode: "paper",
      });
      if (error) throw error;
      const res = data as any;
      setPulse(res.territory);
      setTimeout(() => setPulse(null), 1500);

      const sideLabel = side === "long" ? "정복" : "약탈";
      if (result === "win") {
        notify.success(`⚔️ ${sideLabel} 승리`, { description: `+${formatKRW(pnl)} · ${res.territory} 영토 +${res.delta}%` });
        // 첫 승리 보상 시도 (멱등)
        const { data: claim } = await supabase.rpc("claim_coin_first_win" as any);
        if ((claim as any)?.granted) {
          notify.success("🎉 첫 승리 보상", {
            description: `+5,000원 + 실전 50% 쿠폰 (${(claim as any).coupon_code})`,
            duration: 8000,
          });
        }
      } else if (result === "near_miss") {
        notify.warning("⚠️ 제국 위기!", { description: "30초 안에 Recovery Bonus가 발동됩니다" });
      } else if (result === "liquidation") {
        notify.error("💀 제국 함락", { description: "Recovery 윈도우 30분 가동" });
      } else {
        notify.info(`${sideLabel} 실패`, { description: formatKRW(pnl) });
      }
    } catch (e: any) {
      notify.fail("전투 실패", e);
    } finally {
      inFlight.current = false;
    }
  }, []);

  if (!user) return null;
  const { prices } = useBybitTicker();
  const btcPrice = prices["BTCUSDT"] ?? 0;

  return (
    <Layout>
      <HubTabs hub="empire" />
      <ArenaTutorialOverlay />
      <div className="container pt-6 pb-10 animate-fade-in">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-imperial text-2xl sm:text-3xl tracking-[0.18em] text-gradient-imperial flex items-center gap-2 break-keep">
              <Crown className="w-5 h-5 text-gold" /> 제국 전투 아레나
            </h1>
            <p className="text-xs text-muted-foreground mt-1 break-keep">
              비트코인이 오르면 정복, 내리면 약탈 — 매 전투가 한반도 영토를 바꿉니다.
            </p>
          </div>
          {btcPrice > 0 && (
            <div className="shrink-0 glass rounded-xl px-3 py-2 text-right">
              <div className="text-[9px] text-muted-foreground font-bold tracking-widest">BTC LIVE</div>
              <div className="font-mono tabular-nums font-black text-sm">${btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          )}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-1 text-[10px] text-secondary font-black tracking-widest">
              <Sword className="w-3 h-3" /> CONQUEST
            </div>
            <div className="font-display font-black text-lg tabular-nums">{map?.conquest_count ?? 0}</div>
          </div>
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-1 text-[10px] text-primary font-black tracking-widest">
              <Shield className="w-3 h-3" /> RAID
            </div>
            <div className="font-display font-black text-lg tabular-nums">{map?.raid_count ?? 0}</div>
          </div>
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center gap-1 text-[10px] text-gold font-black tracking-widest">
              <Trophy className="w-3 h-3" /> 점유 합계
            </div>
            <div className="font-display font-black text-lg tabular-nums text-money-strong">
              {map ? Math.floor(Object.values(map.territories).reduce((a, b) => a + (Number(b) || 0), 0)) : 0}%
            </div>
          </div>
        </div>

        {/* 한반도 영토 지도 */}
        <div className="glass-strong rounded-2xl p-5 neon-border relative overflow-hidden mb-4">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gold/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gold" />
              <h2 className="font-display font-black text-sm tracking-wider">한반도 제국 지도</h2>
            </div>
            <div className="relative w-full aspect-[3/4] max-w-xs mx-auto rounded-xl bg-background/40 border border-border/40">
              {TERRITORIES.map((t) => {
                const share = Number(map?.territories?.[t.key] ?? 0);
                const intensity = Math.min(1, share / 50);
                const isPulse = pulse === t.key;
                return (
                  <motion.div
                    key={t.key}
                    style={{ left: `${t.x}%`, top: `${t.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    animate={isPulse ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    transition={{ duration: 1.2 }}
                  >
                    <div
                      className="rounded-full border-2"
                      style={{
                        width: 14 + intensity * 18,
                        height: 14 + intensity * 18,
                        backgroundColor: `hsl(var(--gold) / ${0.15 + intensity * 0.6})`,
                        borderColor: `hsl(var(--gold) / ${0.4 + intensity * 0.6})`,
                        boxShadow: intensity > 0.3 ? `0 0 ${10 + intensity * 16}px hsl(var(--gold) / ${intensity * 0.7})` : undefined,
                      }}
                    />
                    <div className="text-[9px] font-black mt-0.5 text-foreground/90">{t.name}</div>
                    <div className="text-[8px] tabular-nums text-gold font-black">{share.toFixed(1)}%</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Long/Short 버튼 (Paper 데모) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => fight("long")}
            className="press sheen min-h-[64px] rounded-2xl bg-gradient-to-br from-secondary to-secondary/70 text-secondary-foreground font-display font-black flex items-center justify-center gap-2 glow-primary"
          >
            <Sword className="w-5 h-5" />
            <div className="text-left">
              <div className="text-[10px] tracking-widest opacity-80">LONG</div>
              <div className="text-base">영토 정복</div>
            </div>
          </button>
          <button
            onClick={() => fight("short")}
            className="press sheen min-h-[64px] rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-display font-black flex items-center justify-center gap-2 glow-primary"
          >
            <Shield className="w-5 h-5" />
            <div className="text-left">
              <div className="text-[10px] tracking-widest opacity-80">SHORT</div>
              <div className="text-base">적국 약탈</div>
            </div>
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground text-center mb-4 flex items-center justify-center gap-1">
          <Coins className="w-3 h-3" /> Paper 모드 데모 · 실전 트레이딩은 Bybit 패널에서 진행 (수수료 50% 쿠폰 지급 후 자동 적용)
        </div>

        {/* 전투 히스토리 */}
        <div className="glass-strong rounded-2xl p-4 neon-border">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="font-display font-black text-sm tracking-wider">최근 전투</h2>
          </div>
          {loading ? (
            <LoadingList rows={3} />
          ) : battles.length === 0 ? (
            <EmptyState
              icon={<Sword className="w-5 h-5" />}
              title="아직 전투 기록이 없습니다"
              description="Long/Short 버튼을 눌러 첫 정복을 시작하세요"
            />
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {battles.map((b) => (
                  <motion.li
                    key={b.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between glass rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {b.side === "long" ? (
                        <Sword className="w-3.5 h-3.5 text-secondary shrink-0" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">
                          {b.side === "long" ? "정복" : "약탈"} · {b.territory ?? "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {b.result === "win" ? "승리" : b.result === "near_miss" ? "위기" : b.result === "liquidation" ? "함락" : "패배"}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-black tabular-nums ${b.pnl > 0 ? "text-money-strong" : b.pnl < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {b.pnl > 0 ? "+" : ""}{formatKRW(b.pnl)}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
