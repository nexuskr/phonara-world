// AI Bot Run — calls Lovable AI Gateway (text + image), uploads to Storage, finalizes RPC.
// Auth: requires Bearer JWT (verify_jwt enforced via SDK).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPTS: Record<string, string> = {
  content:
    "당신은 한국 사이드허슬 인플루언서입니다. 20~40대 직장인이 공감할 만한 '오늘의 Empire 한 줄'을 한국어로 작성하세요. 제목 1줄 + 본문 2~3문장 + 해시태그 3개. 과장 금지, 진정성 있게.",
  trading:
    "당신은 모의 트레이딩 봇 리포트 작성자입니다. 한국어로 8시간 자동 매매 시뮬레이션 결과를 4~6줄로 흥미롭게 작성하세요 (가상 종목, 진입/청산, 시장 상황). 실제 투자 권유 금지.",
  image:
    "한국어 자연어를 받아 영어 이미지 생성 프롬프트로 최적화하세요. cinematic, neon, cyber luxury, 4k 키워드를 적절히 추가하세요.",
};

async function callText(model: string, system: string, user: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`ai_text_${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

async function callImage(prompt: string): Promise<Uint8Array | null> {
  // Try primary then fallback model. Returns null instead of throwing when the
  // gateway responds with text-only (transient model behavior) — caller decides.
  const models = ["google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image-preview"];
  for (const model of models) {
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (r.status === 429 || r.status === 402) throw new Error(`ai_image_${r.status}`);
      if (!r.ok) { console.error(`image ${model} ${r.status}`, await r.text().catch(() => "")); continue; }
      const j = await r.json();
      const url: string | undefined = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url) { console.warn(`image ${model} returned no image`); continue; }
      const b64 = url.split(",")[1];
      return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429") || msg.includes("402")) throw e;
      console.error(`image ${model} threw`, msg);
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: udata } = await userClient.auth.getUser();
    const uid = udata.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);

    const { run_id, kind, prompt } = await req.json();
    if (!run_id || !kind) return json({ error: "bad_request" }, 400);
    if (typeof prompt === "string" && prompt.length > 1000) return json({ error: "prompt_too_long" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify the run belongs to the user and is running
    const { data: row, error: rowErr } = await admin
      .from("ai_bot_runs").select("*").eq("id", run_id).eq("user_id", uid).maybeSingle();
    if (rowErr || !row) return json({ error: "not_found" }, 404);
    if (row.status !== "running") return json({ error: "invalid_state" }, 400);

    let outputText = "";
    let outputPath: string | null = null;

    try {
      if (kind === "content") {
        const seed = `오늘 날짜: ${new Date().toISOString().slice(0, 10)}. 주제 힌트: ${prompt || "사이드허슬 동기부여"}`;
        outputText = await callText("google/gemini-3-flash-preview", SYSTEM_PROMPTS.content, seed);
        const imgPrompt = `cyber luxury success scene, neon orange #FF3B00 and cyan #00F0FF, korean entrepreneur silhouette, cinematic 4k, ${prompt || "empire ceo"}`;
        const bytes = await callImage(imgPrompt);
        if (bytes) {
          outputPath = `${uid}/${run_id}.png`;
          const up = await admin.storage.from("ai-outputs").upload(outputPath, bytes, {
            contentType: "image/png", upsert: true,
          });
          if (up.error) { console.error("upload failed", up.error.message); outputPath = null; }
        }
      } else if (kind === "image") {
        const optimized = await callText(
          "google/gemini-2.5-flash-lite",
          SYSTEM_PROMPTS.image,
          prompt || "Cyber Empire CEO at penthouse"
        );
        outputText = optimized;
        const bytes = await callImage(`${optimized}, cinematic, neon, cyber luxury, 4k`);
        if (bytes) {
          outputPath = `${uid}/${run_id}.png`;
          const up = await admin.storage.from("ai-outputs").upload(outputPath, bytes, {
            contentType: "image/png", upsert: true,
          });
          if (up.error) { console.error("upload failed", up.error.message); outputPath = null; }
        } else if (!outputText) {
          outputText = "이미지 생성이 일시적으로 지연되어 텍스트 결과만 표시됩니다.";
        }
      } else if (kind === "trading") {
        // Generate the report text now; PnL is computed at claim time on-chain (server seed)
        outputText = await callText(
          "google/gemini-3-flash-preview",
          SYSTEM_PROMPTS.trading,
          `봇 시작. 사용자 힌트: ${prompt || "균형 전략"}`
        );
      } else {
        return json({ error: "invalid_kind" }, 400);
      }

      const { error: finErr } = await admin.rpc("finalize_ai_bot_run", {
        _run_id: run_id, _output_text: outputText, _output_path: outputPath, _error: null,
      });
      if (finErr) throw new Error(finErr.message);

      return json({ ok: true, output_text: outputText, output_path: outputPath });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.rpc("finalize_ai_bot_run", {
        _run_id: run_id, _output_text: null, _output_path: null, _error: msg,
      });
      // Surface AI rate limit cleanly
      if (msg.includes("429")) return json({ error: "rate_limit" }, 429);
      if (msg.includes("402")) return json({ error: "credits_exhausted" }, 402);
      return json({ error: msg }, 500);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
