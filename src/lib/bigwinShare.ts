export interface BigWinDetail {
  amount: number;
  symbol?: string;
  nickname?: string;
}

export function fireBigWinShare(detail: BigWinDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("phonara:bigwin", { detail }));
}

export const CHANNEL_INTENT: Record<string, (url: string, text: string) => string | null> = {
  x: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  line: (u, t) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  naver: (u, t) => `https://share.naver.com/web/shareView?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
  kakao: () => null, // SDK 없으면 fallback (native share or copy)
  instagram: () => null, // 클립보드 + 저장 안내
  tiktok: () => null,
  youtube: () => null,
  copy: () => null,
};
