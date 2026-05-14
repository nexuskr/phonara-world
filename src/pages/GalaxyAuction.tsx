import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Rocket, Crown, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

type Seat = {
  seat_no: number;
  holder_user_id: string | null;
  holder_nickname: string | null;
  current_bid: number;
  bid_count: number;
  booster_expires_at: string | null;
};

export default function GalaxyAuction() {
  const user = useRequireAuth();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Seat | null>(null);
  const [bid, setBid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("galaxy_seats").select("*").order("seat_no");
    if (data) setSeats(data as Seat[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("galaxy_seats")
      .on("postgres_changes", { event: "*", schema: "public", table: "galaxy_seats" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const onBid = async () => {
    if (!picked) return;
    const amt = Number(bid);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.warning("입찰가를 입력하세요");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("bid_galaxy_seat", { _seat_no: picked.seat_no, _bid_phon: amt });
    setSubmitting(false);
    if (error) {
      notify.error("입찰 실패", { description: error.message });
      return;
    }
    notify.success(`🌌 좌석 #${picked.seat_no} 점령 성공!`, { description: "30일 Galaxy Booster가 활성화되었습니다." });
    setPicked(null);
    setBid("");
    void load();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/empire" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Empire
          </Link>
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="font-imperial font-black text-sm tracking-wide">GALAXY 100-SEAT AUCTION</span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 pt-6">
        <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-background/40 p-5 mb-6">
          <h1 className="font-imperial font-black text-2xl sm:text-3xl">🌌 Galaxy Emperor 100석</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            좌석을 입찰로 획득하면 <strong className="text-primary">30일 Galaxy Booster</strong>가 자동 적용됩니다 ·
            수수료 -50%, Crown ×2.0, 레버리지 +2x. 더 높은 입찰자가 등장하면 이전 보유자에게 90%가 환불됩니다.
          </p>
          <p className="mt-1 text-xs text-amber-400">최소 입찰가는 현재가의 110% 이상이어야 합니다.</p>
        </section>

        {loading ? (
          <LoadingList rows={6} />
        ) : seats.length === 0 ? (
          <EmptyState title="좌석 정보를 불러오지 못했습니다" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
            {seats.map((s) => {
              const occupied = !!s.holder_user_id;
              const isMine = s.holder_user_id === user.id;
              const tier = s.seat_no <= 10 ? "elite" : s.seat_no <= 30 ? "noble" : "open";
              return (
                <button
                  key={s.seat_no}
                  onClick={() => { setPicked(s); setBid(Math.ceil(s.current_bid * 1.1).toString()); }}
                  className={`relative rounded-xl border p-2 text-left transition press ${
                    isMine
                      ? "border-emerald-500/60 bg-emerald-500/15"
                      : occupied
                        ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/70"
                        : tier === "elite"
                          ? "border-primary/40 bg-primary/5 hover:border-primary/70"
                          : tier === "noble"
                            ? "border-violet-500/30 bg-violet-500/5 hover:border-violet-500/60"
                            : "border-border/40 bg-background/30 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-wider text-muted-foreground">#{s.seat_no.toString().padStart(2,"0")}</span>
                    {isMine && <Crown className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <div className="mt-1 text-xs font-black tabular-nums">{Number(s.current_bid).toLocaleString()} <span className="text-[9px] font-bold text-muted-foreground">PHON</span></div>
                  <div className="text-[9px] truncate text-muted-foreground">
                    {occupied ? (s.holder_nickname ?? "익명") : "비어있음"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🌌 Galaxy Seat #{picked?.seat_no} 입찰</DialogTitle>
          </DialogHeader>
          {picked && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">현재 보유자</span><span className="font-bold">{picked.holder_nickname ?? "비어있음"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">현재가</span><span className="font-black tabular-nums">{Number(picked.current_bid).toLocaleString()} PHON</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">최소 입찰가 (110%)</span><span className="font-black tabular-nums text-primary">{Math.ceil(Number(picked.current_bid) * 1.1).toLocaleString()} PHON</span></div>
              <Input type="number" inputMode="decimal" value={bid} onChange={(e) => setBid(e.target.value)} placeholder="입찰가" />
              <p className="text-[11px] text-muted-foreground">
                낙찰 시 <strong className="text-primary">30일 Booster</strong>(수수료 -50% / Crown ×2 / 레버리지 +2)가 즉시 활성화됩니다.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)}>취소</Button>
            <Button onClick={onBid} disabled={submitting} className="bg-gradient-imperial">
              {submitting ? "처리 중..." : "👑 입찰"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
