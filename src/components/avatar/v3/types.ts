/**
 * Avatar v3 — types + slot order constants.
 */
export type AvatarSlot =
  | "hair" | "face" | "eyes" | "mouth"
  | "top" | "bottom" | "shoes" | "gloves"
  | "cape" | "effect" | "background" | "title";

export type AvatarRarity = "common" | "rare" | "epic" | "legendary";

export const SLOT_ORDER: AvatarSlot[] = [
  "hair", "face", "eyes", "mouth",
  "top", "bottom", "shoes", "gloves",
  "cape", "effect", "background", "title",
];

export const SLOT_LABEL: Record<AvatarSlot, string> = {
  hair: "머리", face: "얼굴", eyes: "눈", mouth: "입",
  top: "상의", bottom: "하의", shoes: "신발", gloves: "장갑",
  cape: "망토", effect: "이펙트", background: "배경", title: "칭호",
};

export const RARITY_LABEL: Record<AvatarRarity, string> = {
  common: "기본", rare: "레어", epic: "에픽", legendary: "레전더리",
};

export const RARITY_COLOR: Record<AvatarRarity, string> = {
  common: "#94a3b8",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#facc15",
};

export interface AvatarPart {
  id: string;
  slot: AvatarSlot;
  slug: string;
  name: string;
  rarity: AvatarRarity;
  price_phon: number;
  emoji: string | null;
  color_hex: string | null;
  shader_id: string | null;
  asset_url: string | null;
  vip_only: boolean;
}

export interface AvatarLoadout {
  slots: Partial<Record<AvatarSlot, string | null>>;
  color_hex: string | null;
  pos_x: number;
  pos_y: number;
  anim_phase: number;
}
