/**
 * Builds the public earn-share-card edge function URL used as og:image
 * and as the downloadable asset for Instagram.
 */
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

export type ShareKind = "bigwin" | "roulette" | "streak" | "mission";

export interface ShareCardInput {
  kind: ShareKind;
  amount: number;
  nick?: string;
  symbol?: string;
}

export function buildShareCardUrl({ kind, amount, nick, symbol }: ShareCardInput): string {
  const base = `https://${PROJECT_ID}.supabase.co/functions/v1/earn-share-card`;
  const params = new URLSearchParams({
    kind,
    amount: String(Math.max(0, Math.floor(amount))),
    nick: (nick ?? "익명").slice(0, 16),
    symbol: symbol ?? "PHON",
    v: String(Math.floor(Date.now() / (1000 * 60 * 30))), // 30분 캐시 버스터
  });
  return `${base}?${params.toString()}`;
}

export function buildShareLandingUrl(referralCode?: string): string {
  if (typeof window === "undefined") return "https://phonara.world";
  const origin = window.location.origin;
  return referralCode ? `${origin}/?ref=${encodeURIComponent(referralCode)}` : `${origin}/`;
}
