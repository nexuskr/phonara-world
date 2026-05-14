/**
 * /empire/atelier — NFT Atelier (Phase B).
 * Crown/Emperor/Founder × bronze/gold/diamond 컬렉션 + 합성(Fusion).
 * 같은 type+level 3장 → 다음 티어 1장 (bronze→gold→diamond).
 */
import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, Gem, ArrowLeft, Flame, Sword, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { useMyPower, type NFTRow } from "@/hooks/use-my-power";
import CrownAura from "@/components/empire/CrownAura";

type NFTType = NFTRow["type"];
type NFTLevel = NFTRow["level"];

const TYPE_LABEL: Record<NFTType, string> = {
  crown: "Crown",
  emperor: "Emperor",
  founder: "Founder",
};
const LEVEL_LABEL: Record<NFTLevel, string> = {
  bronze: "BRONZE",
  gold: "GOLD",
  diamond: "DIAMOND",
};
const LEVEL_NEXT: Record<NFTLevel, NFTLevel | null> = {
  bronze: "gold",
  gold: "diamond",
  diamond: null,
};
const LEVEL_GLOW: Record<NFTLevel, string> = {
  bronze: "from-orange-400/30 to-amber-600/30 ring-amber-500/40",
  gold: "from-yellow-300/40 to-amber-500/40 ring-yellow-400/60",
  diamond: "from-cyan-200/50 via-fuchsia-200/40 to-violet-300/50 ring-cyan-300/70",
};
const TYPE_ICON: Record<NFTType, React.ElementType> = {
  crown: Crown,
  emperor: Sword,
  founder: Star,
};

type GroupKey = `${NFTType}|${NFTLevel}`;

export default function NftAtelier() {
  const navigate = useNavigate();
  const { nfts, loading, refresh } = useMyPower();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState<NFTRow | null>(null);

  // Group by type+level
  const groups = useMemo(() => {
    const m = new Map<GroupKey, NFTRow[]>();
    for (const n of nfts) {
      const k: GroupKey = `${n.type}|${n.level}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(n);
    }
    return Array.from(m.entries())
      .map(([k, arr]) => {
        const [type, level] = k.split("|") as [NFTType, NFTLevel];
        return { key: k, type, level, items: arr, fusable: level !== "diamond" && arr.length >= 3 };
      })
      .sort((a, b) => (b.fusable ? 1 : 0) - (a.fusable ? 1 : 0) || b.items.length - a.items.length);
  }, [nfts]);

  const toggle = useCallback((nft: NFTRow) => {
    const groupKey: GroupKey = `${nft.type}|${nft.level}`;
    setSelected((prev) => {
      const next = new Set(prev);
      // 다른 group 선택 시 초기화
      if (selectedGroup && selectedGroup !== groupKey) {
        next.clear();
        setSelectedGroup(groupKey);
      } else if (!selectedGroup) {
        setSelectedGroup(groupKey);
      }
      if (next.has(nft.id)) next.delete(nft.id);
      else if (next.size < 3) next.add(nft.id);
      if (next.size === 0) setSelectedGroup(null);
      return next;
    });
  }, [selectedGroup]);

  const fuse = useCallback(async () => {
    if (selected.size !== 3) return;
    setBusy(true);
    try {
      const ids = Array.from(selected);
      const { data, error } = await (supabase.rpc as any)("fuse_nft", { _nft_ids: ids });
      if (error) throw error;
      const r = data as {
        ok: boolean;
        outcome: "success" | "fail" | "jackpot";
        cost_phon: number;
        refund_phon: number;
        new_nft_id: string | null;
        refund_nft_id: string | null;
        type: NFTType;
        level: NFTLevel;
        boost_pct: number;
      };
      if (!r?.ok) throw new Error("fusion_failed");
      setBurst({
        id: (r.new_nft_id ?? r.refund_nft_id ?? "x"),
        type: r.type,
        level: r.level,
        boost_pct: r.boost_pct,
        source: r.outcome === "jackpot" ? "fusion_jackpot" : r.outcome === "fail" ? "fusion_fail_refund" : "fusion",
        created_at: new Date().toISOString(),
      });
      (setBurst as any).outcome = r.outcome;
      setSelected(new Set());
      setSelectedGroup(null);
      if (r.outcome === "jackpot") {
        notify.success("💎 잭팟!", { description: `1-in-20 — ${TYPE_LABEL[r.type]} ${LEVEL_LABEL[r.level]} +${r.boost_pct}% (보너스 부스트)` });
      } else if (r.outcome === "success") {
        notify.success("합성 성공", { description: `${TYPE_LABEL[r.type]} ${LEVEL_LABEL[r.level]} +${r.boost_pct}% Boost` });
      } else {
        notify.warning("합성 실패", { description: `재료 1장 + ${r.refund_phon} PHON 환불되었습니다` });
      }
      refresh();
      window.setTimeout(() => setBurst(null), 3500);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const friendly =
        msg.includes("insufficient_phon") ? "PHON이 부족합니다 (Bronze→Gold 250 / Gold→Diamond 750)" :
        msg.includes("atelier_daily_limit_exceeded") ? "오늘의 합성 한도(25회)를 모두 사용했습니다." :
        msg.includes("atelier_disabled") ? "Atelier가 일시 점검 중입니다." :
        msg.includes("cannot_fuse_diamond") ? "다이아몬드는 더 이상 합성할 수 없습니다." :
        msg.includes("fuse_requires_same_type") ? "같은 type 3장만 합성할 수 있습니다." :
        msg.includes("fuse_requires_same_level") ? "같은 등급 3장만 합성할 수 있습니다." :
        msg.includes("fuse_requires_exactly_3_nfts") ? "정확히 3장을 선택해야 합니다." :
        "합성에 실패했습니다.";
      notify.error("합성 실패", { description: friendly });
    } finally {
      setBusy(false);
    }
  }, [selected, refresh]);

  // Cost for currently selected group
  const fusionCost = useMemo(() => {
    if (!selectedGroup) return 0;
    const lvl = selectedGroup.split("|")[1] as NFTLevel;
    return lvl === "bronze" ? 250 : lvl === "gold" ? 750 : 0;
  }, [selectedGroup]);

  const totalBoost = useMemo(() => nfts.reduce((s, n) => s + (n.boost_pct ?? 0), 0), [nfts]);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> 뒤로
          </Button>
          <div className="flex-1">
            <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Phonara · NFT Atelier</div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              제국의 NFT 공방
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 font-mono tabular-nums">
              총 {nfts.length}장
            </div>
            <div className="px-2 py-1 rounded-md bg-primary/10 text-primary font-mono tabular-nums">
              +{totalBoost}% Boost
            </div>
          </div>
        </div>
      </div>

      {/* Hero copy */}
      <div className="max-w-5xl mx-auto px-4 pt-5">
        <Card className="relative overflow-hidden p-5 border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-background to-yellow-500/10">
          <motion.div
            className="absolute inset-0 -z-0 bg-[radial-gradient(circle_at_30%_20%,hsl(45_100%_60%/0.18),transparent_55%)]"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-black flex items-center justify-center shadow-[0_0_28px_hsl(45_100%_55%/0.6)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-foreground">합성 = 제국의 결혼식</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                같은 type · 같은 등급 NFT 3장을 골라 다음 티어를 주조하세요. <br className="sm:hidden" />
                Bronze → Gold → Diamond. 한번 주조된 NFT는 영원합니다.
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 mt-5 space-y-5">
        {loading ? (
          <LoadingList rows={4} />
        ) : nfts.length === 0 ? (
          <EmptyState
            icon={<Crown className="h-8 w-8 text-amber-400" />}
            title="아직 수집된 NFT가 없습니다"
            description="첫 입금 시 Crown Bronze가 자동으로 발행됩니다."
            action={<Button onClick={() => navigate("/wallet")}>지갑으로 이동</Button>}
          />
        ) : (
          groups.map((g) => {
            const Icon = TYPE_ICON[g.type];
            return (
              <section key={g.key}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-amber-300" />
                  <h2 className="text-sm font-bold tracking-wide">
                    {TYPE_LABEL[g.type]} <span className="text-muted-foreground font-mono">·</span> {LEVEL_LABEL[g.level]}
                  </h2>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{g.items.length}장</span>
                  {g.fusable && (
                    <span className="ml-auto text-[10px] tracking-wider px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30 animate-pulse">
                      → {LEVEL_LABEL[LEVEL_NEXT[g.level]!]} · {g.level === "bronze" ? "250" : "750"} PHON
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {g.items.map((n) => {
                    const isSel = selected.has(n.id);
                    const groupActive = selectedGroup === g.key;
                    const dim = selectedGroup && selectedGroup !== g.key;
                    return (
                      <button
                        key={n.id}
                        onClick={() => toggle(n)}
                        disabled={!!dim || (!isSel && selected.size >= 3 && groupActive)}
                        className={`relative group text-left p-3 rounded-2xl ring-1 transition-all
                          bg-gradient-to-br ${LEVEL_GLOW[n.level]}
                          ${isSel ? "ring-2 ring-amber-300 scale-[1.02] shadow-[0_0_28px_hsl(45_100%_55%/0.5)]" : "hover:scale-[1.01]"}
                          ${dim ? "opacity-30 grayscale cursor-not-allowed" : ""}
                          disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center justify-center h-20">
                          <CrownAura level={n.level === "diamond" ? 10 : n.level === "gold" ? 7 : 5} size={56} />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase text-foreground/80">{LEVEL_LABEL[n.level]}</span>
                          <span className="text-[11px] font-mono text-amber-200 tabular-nums">+{n.boost_pct}%</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/80 mt-0.5 capitalize">{TYPE_LABEL[n.type]}</div>
                        {isSel && (
                          <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center"
                          >
                            ✓
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Sticky fusion bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-400/40 bg-background/95 backdrop-blur-xl"
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
              <Flame className="h-5 w-5 text-amber-300" />
              <div className="flex-1">
                <div className="text-sm font-bold flex items-center gap-2">
                  선택 {selected.size}/3
                  {fusionCost > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-200">
                      비용 {fusionCost} PHON
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {selected.size === 3
                    ? "🔥 80% 성공 · 15% 실패(재료1+50%환불) · 5% 잭팟(+10%p)"
                    : "같은 type · 같은 등급 3장을 선택하세요"}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setSelected(new Set()); setSelectedGroup(null); }} disabled={busy}>
                해제
              </Button>
              <Button
                onClick={fuse}
                disabled={selected.size !== 3 || busy}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black hover:opacity-90"
              >
                {busy ? "주조 중…" : `🔥 ${fusionCost} PHON 합성`}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fusion result burst — outcome-aware */}
      <AnimatePresence>
        {burst && (() => {
          const isJackpot = burst.source === "fusion_jackpot";
          const isFail = burst.source === "fusion_fail_refund";
          const titleText = isJackpot ? "💎 JACKPOT" : isFail ? "재료 환불" : "FUSION COMPLETE";
          const gradient = isJackpot
            ? "from-cyan-200 via-fuchsia-200 to-violet-300"
            : isFail
            ? "from-zinc-300 via-zinc-200 to-zinc-400"
            : "from-amber-300 via-yellow-300 to-amber-500";
          const particleColor = isJackpot ? "bg-cyan-200" : isFail ? "bg-zinc-300" : "bg-amber-300";
          const particleCount = isJackpot ? 22 : isFail ? 8 : 14;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 14 }}
                className="relative"
              >
                <div className="absolute inset-0 -z-0 bg-[radial-gradient(circle,hsl(45_100%_60%/0.7),transparent_70%)] blur-2xl" />
                <div className={`relative px-10 py-8 rounded-3xl bg-gradient-to-br ${gradient} text-black text-center shadow-[0_0_80px_hsl(45_100%_55%/0.8)]`}>
                  <div className="text-[10px] tracking-[0.4em] font-black opacity-70">{titleText}</div>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <CrownAura level={burst.level === "diamond" ? 10 : burst.level === "gold" ? 7 : 5} size={72} />
                  </div>
                  <div className="mt-3 text-2xl font-black tracking-tight">
                    {TYPE_LABEL[burst.type]} {LEVEL_LABEL[burst.level]}
                  </div>
                  <div className="mt-1 text-sm font-mono">+{burst.boost_pct}% Boost{isFail ? " · 재료 환불" : isJackpot ? " · 보너스 +10%p" : " · 영원히 귀하의 제국"}</div>
                </div>
              </motion.div>
              {Array.from({ length: particleCount }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i / particleCount) * Math.PI * 2) * 260,
                    y: Math.sin((i / particleCount) * Math.PI * 2) * 260,
                    opacity: 0,
                  }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                  className={`absolute h-2 w-2 rounded-full ${particleColor} shadow-[0_0_12px_hsl(45_100%_60%)]`}
                />
              ))}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
