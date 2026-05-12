// Upload worker stub: poll posting_schedule_queue (status=queued) → fake post → mark posted.
// Real TikTok/IG/YT API calls are TODO and will require platform OAuth secrets per region.

import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function tick() {
  const { data, error } = await sb
    .from("posting_schedule_queue")
    .select("id, video_id, region")
    .eq("status", "queued")
    .order("scheduled_at", { ascending: true })
    .limit(20);
  if (error) { console.error(error); return; }
  for (const row of data ?? []) {
    // TODO: real platform upload by region (KR/US/JP/VN/AR)
    console.log("upload.stub", row);
    await sb.from("posting_schedule_queue").update({ status: "posted" }).eq("id", row.id);
  }
}

setInterval(tick, 10_000);
tick();
