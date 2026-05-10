import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from "npm:@simplewebauthn/server@10";

/**
 * /functions/v1/passkey-options
 *
 * Body: { action: "register" | "auth" }
 *
 * register: requires authenticated user. Returns PublicKeyCredentialCreationOptionsJSON.
 * auth: requires authenticated user (step-up). Returns PublicKeyCredentialRequestOptionsJSON
 *       restricted to that user's registered credentials.
 *
 * The challenge is persisted in `webauthn_challenges` and looked up during /passkey-verify.
 */
const RP_NAME = "Phonara";

function rpId(origin: string) {
  try {
    return new URL(origin).hostname;
  } catch {
    return "phonara.world";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthenticated" }, 401);

    const supaUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u } = await supaUser.auth.getUser(token);
    if (!u?.user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "register" | "auth";
    if (action !== "register" && action !== "auth") return json({ error: "invalid_action" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const origin = req.headers.get("origin") || "https://phonara.world";
    const rpID = rpId(origin);

    if (action === "register") {
      const { data: existing } = await admin
        .from("user_passkeys")
        .select("credential_id, transports")
        .eq("user_id", u.user.id);

      const opts = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userID: new TextEncoder().encode(u.user.id),
        userName: u.user.email || u.user.id,
        userDisplayName: u.user.email || "Phonara user",
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
          authenticatorAttachment: "platform",
        },
        excludeCredentials: (existing ?? []).map((c) => ({
          id: c.credential_id,
          transports: (c.transports as any) ?? undefined,
        })),
      });

      await admin.from("webauthn_challenges").insert({
        user_id: u.user.id,
        challenge: opts.challenge,
        purpose: "register",
      });
      return json(opts);
    }

    // auth (step-up)
    const { data: keys } = await admin
      .from("user_passkeys")
      .select("credential_id, transports")
      .eq("user_id", u.user.id);

    if (!keys || keys.length === 0) return json({ error: "no_passkey" }, 400);

    const opts = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: keys.map((k) => ({
        id: k.credential_id,
        transports: (k.transports as any) ?? undefined,
      })),
    });

    await admin.from("webauthn_challenges").insert({
      user_id: u.user.id,
      challenge: opts.challenge,
      purpose: "auth",
    });
    return json(opts);
  } catch (e) {
    console.error("passkey-options error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
