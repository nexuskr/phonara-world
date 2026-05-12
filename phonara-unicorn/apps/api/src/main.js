// Phonara Unicorn API — minimal Fastify stub.
// Endpoints:
//   GET  /health
//   POST /trends           — enqueue a trend for script generation
//   POST /uploads/done     — worker callback after a successful upload (writes posting_schedule_queue.posted + revenue placeholder)
//
// TODO: replace stubs with NestJS modules per app once we lock contracts.

import Fastify from "fastify";
import Redis from "ioredis";
import { createClient } from "@supabase/supabase-js";

const app = Fastify({ logger: true });
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

app.post("/trends", async (req) => {
  const { topic, region } = req.body ?? {};
  if (!topic) return { error: "topic_required" };
  await redis.lpush("queue:trend.discovered", JSON.stringify({ topic, region, ts: Date.now() }));
  return { ok: true };
});

app.post("/uploads/done", async (req) => {
  const { queue_id, video_id, platform, external_url } = req.body ?? {};
  if (!queue_id || !video_id) return { error: "missing" };
  await sb.from("posting_schedule_queue").update({ status: "posted" }).eq("id", queue_id);
  app.log.info({ video_id, platform, external_url }, "upload.done");
  return { ok: true };
});

const port = Number(process.env.PORT || 3000);
app.listen({ port, host: "0.0.0.0" }).catch((e) => { app.log.error(e); process.exit(1); });
