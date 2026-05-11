// LINE Messaging API webhook — receives events from LINE platform
// Public endpoint (verify_jwt=false). Validates LINE signature with channel secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LINE_SECRET = Deno.env.get("LINE_CHANNEL_SECRET") ?? "";
const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  if (!LINE_SECRET || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LINE_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return b64 === signature;
}

async function replyMessage(replyToken: string, text: string) {
  if (!LINE_TOKEN || !replyToken) return;
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: { Authorization: `Bearer ${LINE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  const sig = req.headers.get("x-line-signature") ?? "";
  if (!(await verifySignature(raw, sig))) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: any = {};
  try { payload = JSON.parse(raw); } catch { return new Response("ok"); }
  const events = Array.isArray(payload.events) ? payload.events : [];
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  for (const ev of events) {
    const lineUserId = ev?.source?.userId as string | undefined;
    if (!lineUserId) continue;

    if (ev.type === "message" && ev.message?.type === "text") {
      const text = String(ev.message.text ?? "").trim();
      // 매핑 토큰 추출: "link XXXXXXXX" 또는 단독 8자리 영숫자
      const m = text.match(/^(?:link\s+)?([A-Z0-9]{8})$/i);
      if (m) {
        const tok = m[1].toUpperCase();
        const { data: row } = await admin
          .from("line_link_tokens")
          .select("user_id, expires_at, consumed_at")
          .eq("token", tok)
          .maybeSingle();
        if (!row) {
          await replyMessage(ev.replyToken, "❌ 토큰이 올바르지 않습니다. 앱에서 다시 발급해주세요.");
          continue;
        }
        if (row.consumed_at) {
          await replyMessage(ev.replyToken, "⚠️ 이미 사용된 토큰입니다.");
          continue;
        }
        if (new Date(row.expires_at) < new Date()) {
          await replyMessage(ev.replyToken, "⌛ 만료된 토큰입니다. 다시 발급해주세요.");
          continue;
        }
        await admin.from("line_subscriptions").upsert(
          {
            user_id: row.user_id,
            line_user_id: lineUserId,
            display_name: ev?.source?.userId ?? null,
            link_token: tok,
            unlinked_at: null,
          },
          { onConflict: "user_id" },
        );
        await admin
          .from("line_link_tokens")
          .update({ consumed_at: new Date().toISOString() })
          .eq("token", tok);
        await replyMessage(
          ev.replyToken,
          "✅ Phonara 알림이 연결되었습니다.\n미션 보상·출금 승인·랭킹 알림을 LINE으로 받게 됩니다.",
        );
      } else if (/help|도움|연결|link/i.test(text)) {
        await replyMessage(
          ev.replyToken,
          "안녕하세요! Phonara 앱 → 프로필 → 'LINE 알림 연결'에서 발급한 8자리 토큰을 보내주세요.",
        );
      }
    } else if (ev.type === "unfollow") {
      await admin
        .from("line_subscriptions")
        .update({ unlinked_at: new Date().toISOString() })
        .eq("line_user_id", lineUserId);
    } else if (ev.type === "follow") {
      await replyMessage(
        ev.replyToken,
        "Phonara에 오신 것을 환영합니다 👑\n앱에서 발급받은 8자리 토큰을 보내 알림을 연결해주세요.",
      );
    }
  }

  return new Response("ok");
});
