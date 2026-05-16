/**
 * /avatar — Avatar shop + my collection.
 * Uses get_avatar_catalog / purchase_avatar / equip_avatar / get_my_equipped_avatar.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Lock, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/seo/SEOHead";
import VipTierBadge, { type VipTier } from "@/components/vip/VipTierBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyPower } from "@/hooks/use-my-power";
import { useVipPass } from "@/hooks/use-vip-pass";
import { notify } from "@/lib/notify";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface Avatar {
  id: string;
  slug: string;
  name: string;
  emoji?: string | null;
  image_url?: string | null;
  rarity: string;
  price_phon: number;
  vip_min_tier?: string | null;
  limited_edition_cap?: number | null;
  sold_count: number;
  nft_source?: string | null;
}

interface OwnedRow {
  id: string;
  avatar_id: string;
  equipped: boolean;
  acquired_at: string;
  avatar: Avatar;
}

const RARITY_RING: Record<string, string> = {
  common: "ring-muted",
  rare: "ring-sky-400/70",
  epic: "ring-pink-400/80",
  legendary: "ring-amber-400/90",
};

const TIER_ORDER: VipTier[] = ["silver", "gold", "platinum", "diamond"];
const tIdx = (t?: string | null) =>
  t ? TIER_ORDER.indexOf(t.toLowerCase() as VipTier) : -1;

function fmt(n: number) { return Number(n || 0).toLocaleString(); }

export default function Avatar() {
  const qc = useQueryClient();
  const power = useMyPower();
  const vip = useVipPass();
  const [busy, setBusy] = useState<string | null>(null);

  const myVipTier = ((vip as any).tier ?? null) as string | null;
  const myVipIdx = tIdx(myVipTier);

  const catalogQ = useQuery({
    queryKey: ["avatar", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_avatar_catalog");
      if (error) throw error;
      const items = (data as any)?.items ?? data ?? [];
      return items as Avatar[];
    },
    staleTime: 60_000,
  });

  const mineQ = useQuery({
    queryKey: ["avatar", "mine"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_avatars")
        .select("id, avatar_id, equipped, acquired_at, avatar:avatar_catalog(*)")
        .order("acquired_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OwnedRow[];
    },
    staleTime: 30_000,
  });

  const ownedIds = useMemo(
    () => new Set((mineQ.data ?? []).map((r) => r.avatar_id)),
    [mineQ.data],
  );
  const equippedId = useMemo(
    () => (mineQ.data ?? []).find((r) => r.equipped)?.avatar_id ?? null,
    [mineQ.data],
  );

  async function purchase(a: Avatar) {
    if (busy) return;
    setBusy(a.id);
    try {
      const { data, error } = await supabase.rpc("purchase_avatar", { _avatar_id: a.id } as any);
      if (error) throw error;
      const d = data as any;
      if (d?.ok === false) throw new Error(d?.error ?? "purchase_failed");
      notify.success(`구매 완료 · ${a.name}`);
      qc.invalidateQueries({ queryKey: ["avatar"] });
    } catch (e: any) {
      const msg = e?.message?.includes("insufficient_phon") ? "PHON 부족"
        : e?.message?.includes("vip_required") ? "VIP 등급이 필요해요"
        : e?.message?.includes("out_of_stock") ? "품절"
        : e?.message ?? "구매 실패";
      notify.error(msg);
    } finally { setBusy(null); }
  }

  async function equip(a: Avatar) {
    if (busy) return;
    setBusy(a.id);
    try {
      const { data, error } = await supabase.rpc("equip_avatar", { _avatar_id: a.id } as any);
      if (error) throw error;
      const d = data as any;
      if (d?.ok === false) throw new Error(d?.error ?? "equip_failed");
      notify.success(`장착 완료 · ${a.name}`);
      qc.invalidateQueries({ queryKey: ["avatar"] });
    } catch (e: any) {
      notify.error(e?.message ?? "장착 실패");
    } finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead path="/avatar" title="아바타 상점 · Phonara" description="희귀 아바타로 닉네임을 빛내고, NFT 부스트를 받으세요." />

      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-background to-amber-500/10" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-4 py-10 md:py-12">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] tracking-[0.3em] font-black text-primary uppercase">AVATAR</div>
              <h1 className="text-2xl md:text-3xl font-imperial tracking-tight">
                <span className="bg-gradient-to-r from-pink-300 via-amber-200 to-pink-300 bg-clip-text text-transparent">
                  나의 얼굴, 나의 등급
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">희귀할수록 빛나고, NFT는 부스트까지.</p>
            </div>
            <Link to="/vip" className="text-[11px] text-amber-200/90 hover:underline inline-flex items-center gap-1">
              <Coins className="w-3 h-3" /> 보유 {fmt(Math.floor(power.phon))} PHON
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <Tabs defaultValue="shop" className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-sm h-11">
            <TabsTrigger value="shop" className="h-9">상점</TabsTrigger>
            <TabsTrigger value="mine" className="h-9">내 컬렉션</TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-5">
            {catalogQ.isLoading ? (
              <LoadingList rows={3} />
            ) : (catalogQ.data ?? []).length === 0 ? (
              <EmptyState title="아직 등록된 아바타가 없어요" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(catalogQ.data ?? []).map((a) => {
                  const owned = ownedIds.has(a.id);
                  const equipped = equippedId === a.id;
                  const vipLocked = a.vip_min_tier && tIdx(a.vip_min_tier) > myVipIdx;
                  const limited = a.limited_edition_cap != null;
                  const remaining = limited ? Math.max(0, (a.limited_edition_cap ?? 0) - (a.sold_count ?? 0)) : null;
                  const sold = limited && remaining === 0;

                  return (
                    <AvatarCard
                      key={a.id}
                      avatar={a}
                      owned={owned}
                      equipped={equipped}
                      vipLocked={!!vipLocked}
                      sold={!!sold}
                      remaining={remaining}
                      canAfford={power.phon >= a.price_phon}
                      busy={busy === a.id}
                      onPurchase={() => purchase(a)}
                      onEquip={() => equip(a)}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-5">
            {mineQ.isLoading ? (
              <LoadingList rows={3} />
            ) : (mineQ.data ?? []).length === 0 ? (
              <EmptyState
                title="아직 보유한 아바타가 없어요"
                description="상점에서 마음에 드는 얼굴을 골라보세요."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(mineQ.data ?? []).map((row) => (
                  <AvatarCard
                    key={row.id}
                    avatar={row.avatar}
                    owned
                    equipped={row.equipped}
                    vipLocked={false}
                    sold={false}
                    remaining={null}
                    canAfford
                    busy={busy === row.avatar.id}
                    onPurchase={() => {}}
                    onEquip={() => equip(row.avatar)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

interface CardProps {
  avatar: Avatar;
  owned: boolean;
  equipped: boolean;
  vipLocked: boolean;
  sold: boolean;
  remaining: number | null;
  canAfford: boolean;
  busy: boolean;
  onPurchase: () => void;
  onEquip: () => void;
}

function AvatarCard({
  avatar, owned, equipped, vipLocked, sold, remaining, canAfford, busy, onPurchase, onEquip,
}: CardProps) {
  const ring = RARITY_RING[avatar.rarity] ?? RARITY_RING.common;
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "rounded-2xl border bg-card p-4 flex flex-col gap-3",
        equipped ? "border-amber-400/70 shadow-[0_0_24px_-8px_hsl(45_100%_55%/0.6)]" : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl overflow-hidden bg-background/40 flex items-center justify-center ring-2 ring-offset-2 ring-offset-card shrink-0",
              ring,
            )}
          >
            {avatar.image_url ? (
              <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-3xl" aria-hidden>{avatar.emoji ?? "👤"}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-foreground truncate">{avatar.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              {avatar.rarity}{avatar.nft_source ? " · NFT" : ""}
            </div>
            {equipped && (
              <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-amber-500/15 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                <Check className="w-3 h-3" /> 장착됨
              </span>
            )}
          </div>
        </div>
        {avatar.vip_min_tier && (
          <VipTierBadge tier={avatar.vip_min_tier as VipTier} size="sm" />
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-bold text-primary tabular-nums">
          <Coins className="w-3 h-3" />
          {fmt(avatar.price_phon)} PHON
        </span>
        {remaining != null && (
          <span className={cn("text-[11px] tabular-nums", remaining < 10 ? "text-pink-300" : "text-muted-foreground")}>
            남은 수량 {fmt(remaining)} / {fmt(avatar.limited_edition_cap ?? 0)}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {owned ? (
          <button
            onClick={onEquip}
            disabled={equipped || busy}
            className="flex-1 h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground disabled:bg-muted/40 disabled:text-muted-foreground active:scale-[0.98] transition"
          >
            {equipped ? "장착 중" : busy ? "..." : "장착하기"}
          </button>
        ) : (
          <button
            onClick={onPurchase}
            disabled={vipLocked || sold || !canAfford || busy}
            className="flex-1 h-11 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-500 text-black disabled:from-muted disabled:to-muted disabled:text-muted-foreground active:scale-[0.98] transition inline-flex items-center justify-center gap-1"
          >
            {vipLocked ? (<><Lock className="w-3.5 h-3.5" /> VIP 필요</>)
              : sold ? "품절"
              : !canAfford ? "PHON 부족"
              : busy ? "..." : "구매하기"}
          </button>
        )}
      </div>
    </motion.article>
  );
}
