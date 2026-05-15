// Generate slot SFX via ElevenLabs sound-generation / music API and upload to slot-sfx bucket.
// Admin-only. Iterates through PROMPT_MATRIX[theme] and writes URLs to slot_sound_assets.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — used for VO cues

async function isAdmin(jwt: string): Promise<boolean> {
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: user } = await userClient.auth.getUser();
  if (!user.user) return false;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await admin
    .from("user_roles").select("role").eq("user_id", user.user.id).eq("role", "admin").maybeSingle();
  return !!data;
}

async function genSfx(prompt: string, durationSeconds: number): Promise<Uint8Array> {
  const r = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text: prompt, duration_seconds: durationSeconds, prompt_influence: 0.4 }),
  });
  if (!r.ok) throw new Error(`SFX ${r.status} ${await r.text()}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function genMusic(prompt: string, durationSeconds: number): Promise<Uint8Array> {
  const r = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, music_length_ms: durationSeconds * 1000 }),
  });
  if (!r.ok) throw new Error(`MUSIC ${r.status} ${await r.text()}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function genTts(text: string): Promise<Uint8Array> {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text, model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.7, use_speaker_boost: true, speed: 0.9 },
      }),
    },
  );
  if (!r.ok) throw new Error(`TTS ${r.status} ${await r.text()}`);
  return new Uint8Array(await r.arrayBuffer());
}

function durationFor(cue: string): number {
  if (cue === "bgm") return 30;
  if (cue.startsWith("win_epic")) return 4;
  if (cue.startsWith("win_mega")) return 3;
  if (cue.startsWith("win_huge") || cue === "bonus_trigger") return 2;
  if (cue.startsWith("win_big") || cue === "reel_anticipation") return 1.5;
  if (cue.startsWith("win_small") || cue === "scatter_hit" || cue === "reel_spin") return 1;
  if (cue === "reel_spin_fast") return 0.8;
  return 0.6;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    if (!await isAdmin(auth)) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { theme, cues, prompts } = await req.json() as {
      theme: string; cues: string[]; prompts: Record<string, string>;
    };
    if (!theme || !cues?.length || !prompts) {
      return new Response(JSON.stringify({ error: "bad_request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results: { cue: string; ok: boolean; url?: string; error?: string }[] = [];
    for (const cue of cues) {
      const prompt = prompts[cue];
      if (!prompt) { results.push({ cue, ok: false, error: "no_prompt" }); continue; }
      try {
        const dur = durationFor(cue);
        let bytes: Uint8Array;
        if (cue === "bgm") bytes = await genMusic(prompt, dur);
        else if (cue.startsWith("vo_")) bytes = await genTts(prompt);
        else bytes = await genSfx(prompt, dur);
        const path = `${theme}/${cue}.mp3`;
        const up = await admin.storage.from("slot-sfx").upload(path, bytes, {
          contentType: "audio/mpeg", upsert: true,
        });
        if (up.error) throw up.error;
        const { data: pub } = admin.storage.from("slot-sfx").getPublicUrl(path);
        const url = pub.publicUrl;
        await admin.from("slot_sound_assets").upsert({
          theme, cue, url, prompt, bytes: bytes.length,
          duration_ms: Math.round(dur * 1000), updated_at: new Date().toISOString(),
        }, { onConflict: "theme,cue" });
        await admin.from("slot_sound_gen_log").insert({ theme, cue, status: "ok", meta: { bytes: bytes.length } });
        results.push({ cue, ok: true, url });
      } catch (e) {
        const msg = String((e as Error).message ?? e);
        await admin.from("slot_sound_gen_log").insert({ theme, cue, status: "error", error: msg });
        results.push({ cue, ok: false, error: msg });
      }
    }
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
