/**
 * /empire/collection — 내가 보유한 NFT + 다음 티어까지 필요 입금액.
 */
import { useMyPower, type NFTRow } from "@/hooks/use-my-power";
import CrownAura from "@/components/empire/CrownAura";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Zap, Rocket, ArrowRight } from "lucide-react";

const LEVEL_RANK: Record<NFTRow["level"], number> = { bronze: 5, gold: 7, diamond: 10 };
const LEVEL_LABEL: Record<NFTRow["level"], string> = {
  bronze: "BRONZE", gold: "GOLD", diamond: "DIAMOND",
};

export default function EmpireCollection() {
  const { phon, nfts, boostPct, maxLeverage, nextThreshold, loading } = useMyPower();

  return (
    <div className="container mx-auto max-w-3xl py-6 px-4 space-y-6">
      <header className="space-y-1.5 text-center">
        <h1 className="font-imperial text-3xl text-gradient-imperial tracking-wider">👑 내 NFT 컬렉션</h1>
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

      {/* Collection grid */}
      <section>
        <h2 className="text-xs font-imperial tracking-widest text-muted-foreground mb-3">보유 NFT ({nfts.length})</h2>
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
            {nfts.map((n) => (
              <Card key={n.id} className="p-4 border-border/40 hover:border-primary/50 transition">
                <div className="flex justify-center"><CrownAura level={LEVEL_RANK[n.level]} size={64} /></div>
                <div className="mt-3 text-center">
                  <div className="font-imperial tracking-widest text-sm text-primary">{LEVEL_LABEL[n.level]}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{n.type} · {n.source}</div>
                  <div className="mt-2 text-xs font-black text-amber-300 tabular-nums inline-flex items-center gap-1">
                    <Zap className="w-3 h-3" />+{n.boost_pct}%
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
