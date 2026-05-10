import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@10";

/**
 * /functions/v1/passkey-verify
 *
 * Body:
 *   { action: "register", response, deviceName? }
 *   { action: "auth", response }
 *
 * register: persists the new credential under user_passkeys.
 * auth: marks an entry in passkey_verifications (30 min validity) for AAL2-equivalent
 *       step-up verification.
 */
function rpId(origin: string) {
  try { return new URL(origin).hostname; } catch { return "phonara.world"; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthenticated" }, 401);

    const supaUser = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u } = await supaUser.auth.getUser(token);
    if (!u?.user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "register" | "auth";
    const response = body?.response;
    if (!response || (action !== "register" && action !== "auth")) {
      return json({ error: "invalid_request" }, 400);
    }

    const origin = req.headers.get("origin") || "https://phonara.world";
    const rpID = rpId(origin);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Pull most recent active challenge for this user+purpose
    const { data: ch } = await admin
      .from("webauthn_challenges")
      .select("id, challenge, expires_at")
      .eq("user_id", u.user.id)
      .eq("purpose", action)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ch) return json({ error: "challenge_not_found" }, 400);

    if (action === "register") {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: ch.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: "verification_failed" }, 400);
      }
      const { credential } = verification.registrationInfo as any;
      const credId: string = credential.id;
      const pubKeyB64 = btoa(String.fromCharCode(...new Uint8Array(credential.publicKey)));
      await admin.from("user_passkeys").insert({
        user_id: u.user.id,
        credential_id: credId,
        public_key: pubKeyB64,
        counter: credential.counter ?? 0,
        transports: response?.response?.transports ?? null,
        device_name: body?.deviceName || null,
      });
      await admin.from("webauthn_challenges").delete().eq("id", ch.id);
      return json({ ok: true });
    }

    // auth — step-up
    const credentialId = response.id;
    const { data: stored } = await admin
      .from("user_passkeys")
      .select("id, public_key, counter, transports, credential_id")
      .eq("user_id", u.user.id)
      .eq("credential_id", credentialId)
      .maybeSingle();
    if (!stored) return json({ error: "credential_unknown" }, 400);

    const pubKey = Uint8Array.from(atob(stored.public_key), (c) => c.charCodeAt(0));
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: pubKey,
        counter: Number(stored.counter ?? 0),
        transports: (stored.transports as any) ?? undefined,
      },
      requireUserVerification: false,
    });
    if (!verification.verified) return json({ error: "verification_failed" }, 400);

    await admin
      .from("user_passkeys")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", stored.id);

    await admin.from("passkey_verifications").insert({
      user_id: u.user.id,
      credential_id: stored.credential_id,
    });

    await admin.from("webauthn_challenges").delete().eq("id", ch.id);
    return json({ ok: true, verified: true });
  } catch (e) {
    console.error("passkey-verify error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
