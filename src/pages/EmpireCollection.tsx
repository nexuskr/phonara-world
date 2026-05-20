/**
 * /empire/collection — 내가 보유한 NFT + 다음 티어까지 필요 입금액.
 * + NFT 상세 모달 + 정렬(최신/등급/부스트).
 */
import { useMemo, useState } from "react";
import { useMyPower, type NFTRow } from "@/hooks/use-my-power";
import CrownAura from "@/components/empire/CrownAura";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Zap, Rocket, ArrowRight, X, Calendar } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

const LEVEL_RANK: Record<NFTRow["level"], number> = { bronze: 5, gold: 7, diamond: 10 };
const LEVEL_TIER_NUM: Record<NFTRow["level"], number> = { bronze: 1, gold: 2, diamond: 3 };
const LEVEL_LABEL: Record<NFTRow["level"], string> = {
  bronze: "BRONZE", gold: "GOLD", diamond: "DIAMOND",
};

type SortKey = "recent" | "tier" | "boost";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "최신순" },
  { key: "tier", label: "등급순" },
  { key: "boost", label: "부스트순" },
];

export default function EmpireCollection() {
  const { phon, nfts, boostPct, maxLeverage, nextThreshold, loading } = useMyPower();
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [selected, setSelected] = useState<NFTRow | null>(null);

  const sortedNfts = useMemo(() => {
    const arr = [...nfts];
    if (sortKey === "recent") {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortKey === "tier") {
      arr.sort((a, b) => LEVEL_TIER_NUM[b.level] - LEVEL_TIER_NUM[a.level]);
    } else if (sortKey === "boost") {
      arr.sort((a, b) => b.boost_pct - a.boost_pct);
    }
    return arr;
  }, [nfts, sortKey]);

  return (
    <div className="container mx-auto max-w-3xl py-6 px-4 space-y-6">
      <header className="space-y-1.5 text-center">
        <h1 className="font-imperial text-3xl text-gradient-imperial tracking-wider">💎 내 NFT 컬렉션</h1>
        <p className="text-xs text-muted-foreground">NFT는 단순 이미지가 아니라 <b className="text-amber-300">레버리지의 힘</b>입니다.</p>
      </header>

      {/* Power summary */}
      <Card className="p-4 border-primary/30 bg-card/70">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] tracking-widest text-muted-foreground">PHON</div>
            <div className="font-black tabular-nums text-lg mt-1">{phon.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-amber-300">부스트</div>
            <div className="font-black tabular-nums text-lg mt-1 text-amber-300 inline-flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />+{boostPct}%
              <span className="text-[10px] text-muted-foreground ml-0.5">/100</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-primary">최대 레버리지</div>
            <div className="font-black tabular-nums text-lg mt-1 text-primary inline-flex items-center gap-1">
              <Rocket className="w-3.5 h-3.5" />{maxLeverage}x
            </div>
          </div>
        </div>

        {nextThreshold?.next_level && nextThreshold.usdt_needed > 0 && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="flex-1 text-xs">
              <div className="font-bold">다음 티어: <span className="text-amber-300">{nextThreshold.next_level.toUpperCase()} CROWN</span></div>
              <div className="text-muted-foreground">
                약 <span className="font-black text-foreground tabular-nums">{nextThreshold.usdt_needed} USDT</span> 추가 입금 시 자동 발급
              </div>
            </div>
            <Link to="/wallet">
              <Button size="sm" className="bg-gradient-imperial text-primary-foreground font-bold">
                입금하기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Atelier CTA */}
      <Link to="/empire/atelier" className="block mb-4">
        <Card className="p-4 border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-background to-yellow-500/10 hover:border-amber-300/70 transition group">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-black flex items-center justify-center shadow-[0_0_20px_hsl(45_100%_55%/0.5)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">제국의 NFT 공방 → Atelier</div>
              <div className="text-[11px] text-muted-foreground">같은 등급 3장으로 다음 티어 주조 (Bronze → Gold → Diamond)</div>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-300 group-hover:translate-x-1 transition" />
          </div>
        </Card>
      </Link>

      {/* Collection grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-imperial tracking-widest text-muted-foreground">보유 NFT ({nfts.length})</h2>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setSortKey(o.key)}
                className={
                  "text-[10px] px-2 py-1 rounded-md font-bold border transition " +
                  (sortKey === o.key
                    ? "bg-primary/15 border-primary/50 text-primary"
                    : "border-border/40 text-muted-foreground hover:text-foreground")
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <LoadingList rows={3} />
        ) : nfts.length === 0 ? (
          <EmptyState
            icon={<Crown className="w-10 h-10 text-primary/60" />}
            title="아직 NFT가 없습니다"
            description="첫 입금 시 BRONZE CROWN + 첫입금 보너스 +10% 부스트가 자동 지급됩니다."
            action={
              <Link to="/wallet">
                <Button className="bg-gradient-imperial text-primary-foreground font-bold">첫 입금하러 가기</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sortedNfts.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelected(n)}
                className="text-left"
              >
                <Card className="p-4 border-border/40 hover:border-primary/50 hover:scale-[1.02] transition cursor-pointer">
                  <div className="flex justify-center"><CrownAura level={LEVEL_RANK[n.level]} size={64} /></div>
                  <div className="mt-3 text-center">
                    <div className="font-imperial tracking-widest text-sm text-primary">{LEVEL_LABEL[n.level]}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{n.type} · {n.source}</div>
                    <div className="mt-2 text-xs font-black text-amber-300 tabular-nums inline-flex items-center gap-1">
                      <Zap className="w-3 h-3" />+{n.boost_pct}%
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* NFT 상세 모달 */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-sm border-2 border-primary/50 bg-gradient-to-b from-card via-card/95 to-background p-6">
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex justify-center">
                  <CrownAura level={LEVEL_RANK[selected.level]} size={120} />
                </div>
                <div className="text-center">
                  <h3 className="font-imperial text-2xl text-gradient-imperial tracking-wider">
                    {LEVEL_LABEL[selected.level]} {selected.type.toUpperCase()}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">#{selected.id.slice(0, 8)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center">
                    <div className="text-[9px] tracking-widest text-amber-300">부스트</div>
                    <div className="font-black tabular-nums text-xl mt-1 text-amber-300 inline-flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />+{selected.boost_pct}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-center">
                    <div className="text-[9px] tracking-widest text-primary">티어 RANK</div>
                    <div className="font-black tabular-nums text-xl mt-1 text-primary">
                      Lv.{LEVEL_RANK[selected.level]}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/30 border border-border/40 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">획득 경로</span>
                    <span className="font-bold uppercase">{selected.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground inline-flex items-center gap-1"><Calendar className="w-3 h-3" />획득일</span>
                    <span className="font-mono">{new Date(selected.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  이 NFT는 모든 베팅에 영구적으로 <span className="text-amber-300 font-bold">+{selected.boost_pct}%</span> 부스트를 적용합니다.
                  부스트는 합산되며 최대 100%까지 누적됩니다.
                </div>

                <Button onClick={() => setSelected(null)} variant="outline" className="w-full">
                  닫기
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  );
}
