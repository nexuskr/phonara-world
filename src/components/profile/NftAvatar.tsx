/**
 * NftAvatar — circular avatar that displays a user's main NFT image with rarity glow.
 * - If the user has no NFT, falls back to an Empire Crown emblem with subtle breathing glow.
 * - Sizes: xs (24), sm (32), md (48), lg (64), xl (96), 2xl (128).
 * - For other users (chat): pass `userId` and the component fetches via batched RPC.
 * - For self: pass `mainNft` directly.
 */
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { motion } from "framer-motion";
import { getMainNft, type MainNftRow, invalidateMainNftCache } from "@/lib/mainNft";
import { getNftImage, getRarityRingClass } from "@/lib/nftImage";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SizeKey = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
const SIZE_PX: Record<SizeKey, number> = { xs: 24, sm: 32, md: 48, lg: 64, xl: 96, "2xl": 128 };

interface Props {
  userId?: string;
  mainNft?: MainNftRow | null;
  size?: SizeKey;
  className?: string;
  showBadge?: boolean;
  onClick?: () => void;
}

export default function NftAvatar({ userId, mainNft, size = "md", className, showBadge, onClick }: Props) {
  const px = SIZE_PX[size];
  const [selfId, setSelfId] = useState<string | undefined>(userId);
  const [resolved, setResolved] = useState<MainNftRow | null | undefined>(
    mainNft !== undefined ? mainNft : undefined,
  );

  // Resolve self id when no userId or mainNft is provided
  useEffect(() => {
    if (userId || mainNft !== undefined) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSelfId(data?.session?.user?.id);
    });
    return () => { alive = false; };
  }, [userId, mainNft]);

  const effectiveId = userId ?? selfId;

  useEffect(() => {
    if (mainNft !== undefined) { setResolved(mainNft); return; }
    if (!effectiveId) { setResolved(null); return; }
    let alive = true;
    getMainNft(effectiveId).then((r) => { if (alive) setResolved(r); });
    return () => { alive = false; };
  }, [effectiveId, mainNft]);

  // Realtime invalidate on profile.main_nft_id update
  useRealtimeChannel({
    key: effectiveId ? `main-nft-watch:${effectiveId}` : "",
    bindings: effectiveId ? [{ event: "UPDATE", table: "profiles", filter: `id=eq.${effectiveId}` }] : [],
    onEvent: (payload: any) => {
      const newM = payload?.new?.main_nft_id;
      const oldM = payload?.old?.main_nft_id;
      if (newM !== oldM) {
        invalidateMainNftCache(effectiveId);
        getMainNft(effectiveId!).then((r) => setResolved(r));
      }
    },
    enabled: !!effectiveId && mainNft === undefined,
  });

  const img = getNftImage(resolved?.type, resolved?.level, resolved?.external_image_url);
  const ringCls = getRarityRingClass(resolved?.level);
  const hasNft = !!img;

  return (
    <div
      onClick={onClick}
      style={{ width: px, height: px }}
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center shrink-0",
        ringCls,
        onClick && "cursor-pointer hover:scale-105 transition-transform",
        className,
      )}
      aria-label={hasNft ? `${resolved?.type} ${resolved?.level}` : "No NFT"}
    >
      {hasNft ? (
        <img
          src={img!}
          alt={`${resolved?.type} ${resolved?.level}`}
          width={px}
          height={px}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <motion.div
          className="w-full h-full bg-gradient-to-br from-card via-card/80 to-primary/10 flex items-center justify-center"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Crown className="text-primary/60" style={{ width: px * 0.5, height: px * 0.5 }} />
        </motion.div>
      )}
      {showBadge && hasNft && resolved?.level && (
        <span className="absolute bottom-0 right-0 text-[8px] font-imperial tracking-widest px-1 py-px rounded-tl bg-background/90 border border-border/50 uppercase">
          {resolved.level[0]}
        </span>
      )}
    </div>
  );
}
