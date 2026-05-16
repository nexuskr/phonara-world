/**
 * EquippedAvatarChip — 28px circular avatar with rarity-colored ring.
 * Reads get_my_equipped_avatar() via react-query (60s stale).
 * Returns null when no avatar equipped. Links to /avatar.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface EquippedAvatar {
  ok?: boolean;
  avatar?: {
    id: string;
    slug: string;
    name: string;
    emoji?: string | null;
    image_url?: string | null;
    rarity: string;
  } | null;
}

const RARITY_RING: Record<string, string> = {
  common: "ring-muted",
  rare: "ring-sky-400/70",
  epic: "ring-pink-400/80",
  legendary: "ring-amber-400/90",
};

export default function EquippedAvatarChip() {
  const { data } = useQuery({
    queryKey: ["avatar", "equipped"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_equipped_avatar");
      if (error) throw error;
      return (data ?? null) as EquippedAvatar | null;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const avatar = data?.avatar ?? null;
  if (!avatar) return null;

  const ring = RARITY_RING[avatar.rarity] ?? RARITY_RING.common;
  const initials = (avatar.name || avatar.slug || "?").slice(0, 1).toUpperCase();

  return (
    <Link
      to="/avatar"
      aria-label={`장착 아바타: ${avatar.name}`}
      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px]"
    >
      <motion.span
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "relative w-7 h-7 rounded-full overflow-hidden bg-card flex items-center justify-center ring-2 ring-offset-1 ring-offset-background",
          ring,
        )}
      >
        {avatar.image_url ? (
          <img
            src={avatar.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : avatar.emoji ? (
          <span className="text-base leading-none" aria-hidden>{avatar.emoji}</span>
        ) : (
          <span className="text-[11px] font-black text-foreground" aria-hidden>{initials}</span>
        )}
      </motion.span>
    </Link>
  );
}
