/**
 * /marketplace — NFT P2P Marketplace 1.0 (fixed-price)
 * Phase C-1. Buyers pay PHON, 6% platform fee (3% burn / 3% pool).
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Tag, Crown, Sword, Star, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingList } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { useMyPower, type NFTRow } from "@/hooks/use-my-power";
import CrownAura from "@/components/empire/CrownAura";

type Listing = {
  id: string;
  nft_id: string;
  seller_id: string;
  price_phon: number;
  status: string;
  listed_at: string;
  nft_collection: {
    type: "crown" | "emperor" | "founder";
    level: "bronze" | "gold" | "diamond";
    boost_pct: number;
  } | null;
};

const TYPE_LABEL = { crown: "Crown", emperor: "Emperor", founder: "Founder" } as const;
const LEVEL_LABEL = { bronze: "BRONZE", gold: "GOLD", diamond: "DIAMOND" } as const;
const LEVEL_GLOW = {
  bronze: "from-orange-400/30 to-amber-600/30 ring-amber-500/40",
  gold: "from-yellow-300/40 to-amber-500/40 ring-yellow-400/60",
  diamond: "from-cyan-200/50 via-fuchsia-200/40 to-violet-300/50 ring-cyan-300/70",
} as const;
const TYPE_ICON = { crown: Crown, emperor: Sword, founder: Star } as const;

export default function Marketplace() {
  const navigate = useNavigate();
  const { nfts, refresh: refreshPower } = useMyPower();
  const [uid, setUid] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "crown" | "emperor" | "founder">("all");
  const [sortBy, setSortBy] = useState<"new" | "price_low" | "price_high">("new");
  const [openListDialog, setOpenListDialog] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFTRow | null>(null);
  const [listPrice, setListPrice] = useState<string>("100");
  const [busy, setBusy] = useState(false);
  const [confirmBuy, setConfirmBuy] = useState<Listing | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("nft_listings")
        .select("id, nft_id, seller_id, price_phon, status, listed_at, nft_collection!inner(type, level, boost_pct)")
        .eq("status", "active")
        .order("listed_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      setListings((data ?? []) as any);
    } catch (e) {
      notify.error("마켓 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    let arr = listings.filter((l) => l.nft_collection != null);
    if (filter !== "all") arr = arr.filter((l) => l.nft_collection!.type === filter);
    if (sortBy === "price_low") arr = [...arr].sort((a, b) => a.price_phon - b.price_phon);
    if (sortBy === "price_high") arr = [...arr].sort((a, b) => b.price_phon - a.price_phon);
    return arr;
  }, [listings, filter, sortBy]);

  // 본인이 마켓에 안 올린 NFT만 노출
  const sellableNfts = useMemo(() => {
    const myListedNftIds = new Set(listings.filter((l) => l.seller_id === uid).map((l) => l.nft_id));
    return nfts.filter((n) => !myListedNftIds.has(n.id));
  }, [nfts, listings, uid]);

  const submitList = useCallback(async () => {
    if (!selectedNft) return;
    const price = Number(listPrice);
    if (!Number.isFinite(price) || price <= 0) { notify.error("가격을 확인해주세요"); return; }
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("list_nft", { _nft_id: selectedNft.id, _price_phon: price });
      if (error) throw error;
      if (!data?.ok) throw new Error("list_failed");
      notify.success("판매 등록 완료", { description: `${price} PHON` });
      setOpenListDialog(false);
      setSelectedNft(null);
      load();
    } catch (e: any) {
      const msg = e?.message ?? "";
      const friendly =
        msg.includes("already_listed") ? "이미 판매 중인 NFT입니다." :
        msg.includes("not_owner") ? "본인 NFT만 등록 가능합니다." :
        msg.includes("nft_locked") ? "이전 마이그레이션 잠금 NFT는 판매할 수 없습니다." :
        msg.includes("price_too_high") ? "가격이 너무 높습니다 (최대 10,000,000 PHON)." :
        "판매 등록에 실패했습니다.";
      notify.error("등록 실패", { description: friendly });
    } finally {
      setBusy(false);
    }
  }, [selectedNft, listPrice, load]);

  const submitBuy = useCallback(async () => {
    if (!confirmBuy) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("buy_nft", { _listing_id: confirmBuy.id });
      if (error) throw error;
      if (!data?.ok) throw new Error("buy_failed");
      notify.success("구매 성공", { description: `${data.price_phon} PHON` });
      setConfirmBuy(null);
      load();
      refreshPower();
    } catch (e: any) {
      const msg = e?.message ?? "";
      const friendly =
        msg.includes("insufficient_phon") ? "PHON이 부족합니다." :
        msg.includes("listing_not_active") ? "이미 판매 종료된 NFT입니다." :
        msg.includes("cannot_buy_own_listing") ? "자기 자신의 판매는 구매할 수 없습니다." :
        "구매에 실패했습니다.";
      notify.error("구매 실패", { description: friendly });
    } finally {
      setBusy(false);
    }
  }, [confirmBuy, load, refreshPower]);

  const cancelListing = useCallback(async (listingId: string) => {
    setBusy(true);
    try {
      const { error } = await (supabase.rpc as any)("cancel_listing", { _listing_id: listingId });
      if (error) throw error;
      notify.success("판매 취소 완료");
      load();
    } catch {
      notify.error("취소 실패");
    } finally {
      setBusy(false);
    }
  }, [load]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> 뒤로
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Phonara · NFT Marketplace</div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              제국의 거래소
            </h1>
          </div>
          <Button
            size="sm"
            onClick={() => { setSelectedNft(null); setOpenListDialog(true); }}
            className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black"
          >
            <Tag className="h-4 w-4 mr-1" /> 판매 등록
          </Button>
        </div>
        {/* Filters */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex items-center gap-2 overflow-x-auto">
          {(["all", "crown", "emperor", "founder"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
                filter === f ? "bg-amber-400 text-black font-bold" : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "전체" : TYPE_LABEL[f]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            {(["new", "price_low", "price_high"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-[11px] px-2 py-1 rounded ${
                  sortBy === s ? "bg-primary/15 text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {s === "new" ? "최신" : s === "price_low" ? "낮은가격" : "높은가격"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hero strip */}
      <div className="max-w-5xl mx-auto px-4 pt-5">
        <Card className="relative overflow-hidden p-4 border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-background to-yellow-500/10">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-amber-300" />
            <div className="flex-1 text-xs text-muted-foreground">
              플랫폼 수수료 <span className="text-amber-300 font-mono font-bold">6%</span>
              <span className="opacity-70"> (3% burn · 3% Crown Pool 적립)</span> · 거래 즉시 보유 PHON 차감
            </div>
          </div>
        </Card>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        {loading ? (
          <LoadingList rows={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8 text-amber-400" />}
            title="아직 등록된 매물이 없습니다"
            description="첫 번째 판매자가 되어 제국의 시장을 열어보세요."
            action={<Button onClick={() => setOpenListDialog(true)}>판매 등록하기</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visible.map((l) => {
              const nc = l.nft_collection!;
              const Icon = TYPE_ICON[nc.type];
              const auraLevel = nc.level === "diamond" ? 10 : nc.level === "gold" ? 7 : 5;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative p-3 rounded-2xl ring-1 bg-gradient-to-br ${LEVEL_GLOW[nc.level]}`}
                >
                  <div className="flex items-center justify-center h-20">
                    <CrownAura level={auraLevel} size={56} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase">{LEVEL_LABEL[nc.level]}</span>
                    <span className="text-[11px] font-mono text-amber-200">+{nc.boost_pct}%</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground/80 flex items-center gap-1">
                    <Icon className="h-3 w-3" /> {TYPE_LABEL[nc.type]}
                  </div>
                  <div className="mt-2 text-base font-black tabular-nums text-amber-200">
                    {Number(l.price_phon).toLocaleString()} <span className="text-[10px] opacity-70">PHON</span>
                  </div>
                  {l.seller_id === uid ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => cancelListing(l.id)}
                    >
                      <X className="h-3 w-3 mr-1" /> 판매 취소
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full mt-2 bg-amber-400 text-black font-bold hover:bg-amber-300"
                      onClick={() => setConfirmBuy(l)}
                    >
                      구매
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* List dialog */}
      <Dialog open={openListDialog} onOpenChange={setOpenListDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>NFT 판매 등록</DialogTitle>
            <DialogDescription>가격은 PHON으로 책정됩니다. 거래 성사 시 6% 수수료가 차감되고 즉시 정산됩니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">판매할 NFT</div>
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-auto">
              {sellableNfts.length === 0 && (
                <div className="col-span-3 text-xs text-muted-foreground text-center py-6">판매 가능한 NFT가 없습니다.</div>
              )}
              {sellableNfts.map((n) => {
                const sel = selectedNft?.id === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNft(n)}
                    className={`p-2 rounded-xl ring-1 transition ${
                      sel ? "ring-2 ring-amber-300 scale-[1.02]" : "ring-border hover:ring-amber-400/40"
                    } bg-card`}
                  >
                    <div className="flex items-center justify-center h-12">
                      <CrownAura level={n.level === "diamond" ? 10 : n.level === "gold" ? 7 : 5} size={36} />
                    </div>
                    <div className="text-[10px] font-mono uppercase mt-1 text-center">{LEVEL_LABEL[n.level]}</div>
                    <div className="text-[10px] text-muted-foreground text-center capitalize">{TYPE_LABEL[n.type]}</div>
                  </button>
                );
              })}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">가격 (PHON)</div>
              <Input
                type="number"
                min={1}
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="100"
              />
              <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Flame className="h-3 w-3 text-amber-300" />
                정산 시 수령액: {Math.max(0, Number(listPrice) * 0.94).toLocaleString()} PHON
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenListDialog(false)}>취소</Button>
            <Button
              onClick={submitList}
              disabled={!selectedNft || busy}
              className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black"
            >
              {busy ? "등록 중…" : "판매 등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy confirmation */}
      <Dialog open={!!confirmBuy} onOpenChange={(o) => !o && setConfirmBuy(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>구매 확인</DialogTitle>
            <DialogDescription>
              {confirmBuy && (
                <>
                  <span className="text-amber-300 font-mono font-bold">
                    {Number(confirmBuy.price_phon).toLocaleString()} PHON
                  </span>
                  으로 {TYPE_LABEL[confirmBuy.nft_collection!.type]} {LEVEL_LABEL[confirmBuy.nft_collection!.level]}{" "}
                  (+{confirmBuy.nft_collection!.boost_pct}% Boost) 를 구매합니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmBuy(null)}>취소</Button>
            <Button onClick={submitBuy} disabled={busy} className="bg-amber-400 text-black font-black hover:bg-amber-300">
              {busy ? "처리 중…" : "구매 확정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
