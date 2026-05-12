// Crown Replay share helpers + URL builders.
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;

export function replayLanding(token: string, channel?: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "https://phonara.world";
  const utm = channel ? `?utm_source=${encodeURIComponent(channel)}&utm_medium=share&utm_campaign=crown_replay` : "";
  return `${base}/r/${encodeURIComponent(token)}${utm}`;
}

export function replayCardImage(token: string) {
  return `${SUPABASE_URL}/functions/v1/crown-replay-card?token=${encodeURIComponent(token)}`;
}

export type ShareChannel = "x" | "tiktok" | "reels" | "kakao" | "copy" | "native";

export async function shareReplay(token: string, channel: ShareChannel) {
  const text = `👑 Empire에서 +${"" /* placeholder */} Crown 폭발! 내 자리는 어디?`;
  const url = replayLanding(token, channel);

  // Track on server (best-effort)
  try { await supabase.rpc("record_crown_replay_share", { _token: token, _channel: channel }); } catch {}

  if (channel === "copy") {
    await navigator.clipboard.writeText(url);
    return { ok: true, opened: false };
  }

  if (channel === "native" && typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title: "Phonara Empire Crown", text, url });
      return { ok: true, opened: true };
    } catch { /* fallthrough */ }
  }

  let target = "";
  switch (channel) {
    case "x":
      target = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      break;
    case "kakao":
      // KakaoTalk web share — opens story composer; users with Kakao SDK get richer sheet on app side later
      target = `https://story.kakao.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      break;
    case "tiktok":
      // TikTok has no public web composer; route to upload page after copying URL
      await navigator.clipboard.writeText(url).catch(() => {});
      target = `https://www.tiktok.com/upload`;
      break;
    case "reels":
      await navigator.clipboard.writeText(url).catch(() => {});
      target = `https://www.instagram.com/`;
      break;
  }
  if (target) window.open(target, "_blank", "noopener,noreferrer");
  return { ok: true, opened: !!target };
}

export async function createReplay(eventId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("create_crown_replay", { _event_id: eventId });
  if (error) return null;
  return ((data as any)?.token as string) ?? null;
}
