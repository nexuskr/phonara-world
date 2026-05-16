/**
 * /admin/economy — PHON·NFT 경제 대시보드
 * 매일 30초 점검용. 발행/소각 추세 + NFT 분포 + 상위 보유자 + 활성 양도 + 수동 조정.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingList } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import { Coins, TrendingUp, Crown, Camera } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Stats = {
  phon_supply: number; phon_holders: number; nft_total: number;
  mint_24h: number; burn_24h: number; net_24h: number;
  mint_7d: number; burn_7d: number; net_7d: number;
  mint_30d: number; burn_30d: number; net_30d: number;
  nft_distribution: Record<string, number>;
  top_holders: { user_id: string; balance: number }[];
  active_bequests: number; dynasty_links_active: number;
};

export default function EconomyDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjUid, setAdjUid] = useState("");
  const [adjDelta, setAdjDelta] = useState("");
  const [adjReason, setAdjReason] = useState("");

  async function refresh() {
    try {
      const { data, error } = await supabase.rpc("admin_get_economy_stats");
      if (error) throw error;
      setStats(data as Stats);
    } catch (e: any) { notify.error(e.message ?? "불러오기 실패"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
    const t = setVisibleInterval(refresh, 30_000 , { meta: { owner: "EconomyDashboard", category: "admin" } });
    return () => t();
  }, []);

  async function onAdjust() {
    if (!adjUid || !adjDelta || !adjReason || adjReason.length < 5) {
      notify.error("UID·금액·사유(5자 이상) 모두 필수"); return;
    }
    try {
      const { error } = await supabase.rpc("admin_phon_adjust",
        { _uid: adjUid, _delta: parseFloat(adjDelta), _reason: adjReason });
      if (error) throw error;
      notify.success("조정 완료");
      setAdjUid(""); setAdjDelta(""); setAdjReason("");
      refresh();
    } catch (e: any) { notify.error(e.message ?? "조정 실패"); }
  }

  async function onSnapshot() {
    if (!confirm("모든 PHON 잔고를 정식 토큰 에어드랍 기준으로 스냅샷하시겠습니까?")) return;
    try {
      const { data, error } = await supabase.rpc("take_phon_snapshot");
      if (error) throw error;
      notify.success(`${(data as any)?.snapshotted ?? 0}개 계정 스냅샷 완료`);
    } catch (e: any) { notify.error(e.message ?? "스냅샷 실패"); }
  }

  if (loading || !stats) return <LoadingList rows={6} />;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="font-display font-black text-lg flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-300" /> PHON·NFT 경제 대시보드
        </h2>
        <Button size="sm" variant="outline" onClick={onSnapshot}>
          <Camera className="w-3.5 h-3.5 mr-1.5" /> 토큰 스냅샷
        </Button>
      </header>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="PHON 총 공급" value={stats.phon_supply.toLocaleString()} sub={`${stats.phon_holders}명 보유`} />
        <Stat label="NFT 발행 총" value={stats.nft_total.toLocaleString()} />
        <Stat label="활성 양도" value={stats.active_bequests.toLocaleString()} sub={`Dynasty 링크 ${stats.dynasty_links_active}개`} />
        <Stat label="순발행 24h" value={stats.net_24h.toLocaleString()} sub={`+${stats.mint_24h.toLocaleString()} / -${stats.burn_24h.toLocaleString()}`} positive={stats.net_24h >= 0} />
      </div>

      {/* 윈도우별 발행/소각 */}
      <Card className="p-4">
        <div className="text-xs font-bold mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> 발행/소각 추세
        </div>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { l: "24h", m: stats.mint_24h, b: stats.burn_24h, n: stats.net_24h },
            { l: "7d", m: stats.mint_7d, b: stats.burn_7d, n: stats.net_7d },
            { l: "30d", m: stats.mint_30d, b: stats.burn_30d, n: stats.net_30d },
          ].map((w) => (
            <div key={w.l} className="rounded-lg border border-border/40 p-2.5">
              <div className="text-[10px] text-muted-foreground tracking-wider">{w.l}</div>
              <div className="mt-1 space-y-0.5 tabular-nums">
                <div className="text-emerald-400">+{w.m.toLocaleString()}</div>
                <div className="text-rose-400">-{w.b.toLocaleString()}</div>
                <div className={"font-bold " + (w.n >= 0 ? "text-emerald-300" : "text-rose-300")}>
                  순 {w.n.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* NFT 분포 */}
      <Card className="p-4">
        <div className="text-xs font-bold mb-3 flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-amber-300" /> NFT 발행 분포
        </div>
        {Object.keys(stats.nft_distribution).length === 0 ? (
          <div className="text-xs text-muted-foreground">아직 발행된 NFT가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-xs">
            {Object.entries(stats.nft_distribution).map(([k, n]) => (
              <div key={k} className="rounded border border-border/40 p-2 flex justify-between">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-bold tabular-nums">{n}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 상위 보유자 */}
      <Card className="p-4">
        <div className="text-xs font-bold mb-3">상위 PHON 보유자 Top 20</div>
        {stats.top_holders.length === 0 ? (
          <div className="text-xs text-muted-foreground">데이터 없음</div>
        ) : (
          <div className="space-y-1 text-xs font-mono">
            {stats.top_holders.map((h, i) => (
              <div key={h.user_id} className="flex justify-between border-b border-border/30 py-1">
                <span className="text-muted-foreground">{i + 1}. {h.user_id.slice(0, 8)}...</span>
                <span className="tabular-nums">{Number(h.balance).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 수동 조정 */}
      <Card className="p-4 border-amber-500/30">
        <div className="text-xs font-bold mb-3 text-amber-300">⚠️ 수동 PHON 조정 (감사 로그 자동 기록)</div>
        <div className="space-y-2">
          <Input placeholder="대상 user_id (UUID)" value={adjUid} onChange={(e) => setAdjUid(e.target.value)} />
          <div className="flex gap-2">
            <Input type="number" placeholder="델타 (+/-)" value={adjDelta} onChange={(e) => setAdjDelta(e.target.value)} />
            <Input placeholder="사유 (5자 이상)" value={adjReason} onChange={(e) => setAdjReason(e.target.value)} />
          </div>
          <Button size="sm" variant="destructive" onClick={onAdjust}>실행</Button>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-[10px] tracking-widest text-muted-foreground">{label}</div>
      <div className={"font-black tabular-nums text-lg mt-1 " + (positive === false ? "text-rose-300" : "")}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}
