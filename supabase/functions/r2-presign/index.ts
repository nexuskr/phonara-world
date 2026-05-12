// PR-2: R2 presigned PUT URL generator (Cloudflare R2 = S3-compatible).
// Auth: requires a valid Supabase JWT (verify_jwt default) + admin OR own-folder upload.
// Returns: { url, public_url, key, expires_in }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const Body = z.object({
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(100),
  folder: z.enum(["videos", "covers", "ugc"]).default("ugc"),
});

const ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!;
const ACCESS_KEY = Deno.env.get("R2_ACCESS_KEY_ID")!;
const SECRET_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const BUCKET = Deno.env.get("R2_BUCKET")!;
const PUBLIC_BASE = Deno.env.get("R2_PUBLIC_BASE")!; // e.g. https://cdn.phonara.world
const REGION = "auto";

const enc = new TextEncoder();
async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key as any, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return await crypto.subtle.sign("HMAC", k, enc.encode(data));
}
function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function sha256Hex(s: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}

async function presignPut(key: string, contentType: string, expires = 900): Promise<string> {
  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const credential = `${ACCESS_KEY}/${credentialScope}`;

  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": "host",
  });

  const canonicalUri = `/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const canonicalQuery = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    "PUT", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(enc.encode("AWS4" + SECRET_KEY), dateStamp);
  const kRegion = await hmac(kDate, REGION);
  const kService = await hmac(kRegion, "s3");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !BUCKET || !PUBLIC_BASE) {
      return new Response(JSON.stringify({ error: "R2 not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { filename, content_type, folder } = parsed.data;

    // Sanitize filename, prefix by user id
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ts = Date.now();
    const key = `${folder}/${user.id}/${ts}_${safe}`;

    const url = await presignPut(key, content_type, 900);
    const public_url = `${PUBLIC_BASE.replace(/\/$/, "")}/${key}`;

    return new Response(JSON.stringify({ url, public_url, key, expires_in: 900 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("r2-presign error", e);
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
