// KB 문서 인제스트: 관리자가 support-kb 버킷에 업로드한 파일에서 텍스트를 추출해
// support_kb_articles에 기사로 저장합니다. PDF는 텍스트 추출이 제한적이므로
// 가장 안전한 형식은 .md / .txt 입니다 (그 외 형식은 raw bytes를 UTF-8로 디코딩 시도).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: ud } = await userClient.auth.getUser();
    const user = ud?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    // 관리자 확인
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: hasAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const path: string = String(body?.path ?? "");
    const title: string = String(body?.title ?? "").trim();
    const category: string = String(body?.category ?? "general").trim() || "general";
    const tags: string[] = Array.isArray(body?.tags) ? body.tags.slice(0, 10).map(String) : [];

    if (!path || !title) return json({ error: "path and title required" }, 400);

    // 스토리지에서 파일 다운로드
    const { data: blob, error: dlErr } = await admin.storage.from("support-kb").download(path);
    if (dlErr || !blob) return json({ error: "download_failed", detail: dlErr?.message }, 400);

    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    let content = "";
    if (["txt", "md", "markdown", "html", "htm", "json", "csv"].includes(ext)) {
      content = await blob.text();
    } else {
      // 알 수 없는 형식: UTF-8 best-effort
      try { content = await blob.text(); } catch { content = ""; }
    }

    // HTML 태그 제거 (간이)
    if (ext === "html" || ext === "htm") {
      content = content.replace(/<script[\s\S]*?<\/script>/gi, "")
                       .replace(/<style[\s\S]*?<\/style>/gi, "")
                       .replace(/<[^>]+>/g, " ")
                       .replace(/\s+/g, " ").trim();
    }
    content = content.slice(0, 50_000); // 안전 한계
    if (!content || content.length < 10) {
      return json({ error: "extracted_content_empty", hint: "텍스트(.txt/.md) 또는 HTML 업로드를 권장합니다." }, 400);
    }

    const { data: inserted, error: insErr } = await admin
      .from("support_kb_articles")
      .insert({
        title, category, tags, content,
        source_file_path: path, created_by: user.id, active: true,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return json({ ok: true, article: inserted });
  } catch (e: any) {
    console.error("[ingest-support-kb]", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
