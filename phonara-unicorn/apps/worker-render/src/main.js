// Render worker stub: pull script.ready → ffmpeg synth → upload mp4 to S3 → push video.rendered.
// Real synthesis (TTS, avatar, b-roll, captions) is TODO; this scaffold validates the queue path only.

import Redis from "ioredis";
import { spawn } from "node:child_process";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

async function renderOne(job) {
  const dir = mkdtempSync(join(tmpdir(), "phonara-"));
  const out = join(dir, `${job.video_id}.mp4`);
  // Smoke render: 3-second black + caption text
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-f", "lavfi", "-t", "3",
      "-i", "color=c=black:s=720x1280",
      "-vf", `drawtext=text='${(job.caption || "Phonara").replace(/'/g, "")}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
      out,
    ]);
    ff.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`ffmpeg ${c}`))));
  });
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: `videos/${job.video_id}.mp4`,
    Body: createReadStream(out),
    ContentType: "video/mp4",
  }));
  await redis.lpush("queue:video.rendered", JSON.stringify({ ...job, key: `videos/${job.video_id}.mp4` }));
}

async function loop() {
  for (;;) {
    const item = await redis.brpop("queue:script.ready", 5);
    if (!item) continue;
    try { await renderOne(JSON.parse(item[1])); }
    catch (e) { console.error("render.fail", e); }
  }
}
loop();
