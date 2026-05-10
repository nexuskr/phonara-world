
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='liquidation-watcher-30s';

SELECT cron.schedule(
  'liquidation-watcher-30s',
  '*/1 * * * *', -- pg_cron min granularity is 1 min
  $$
  SELECT net.http_post(
    url:='https://ketlqzfaplppmupaiwft.supabase.co/functions/v1/liquidation-watcher',
    headers:='{"Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb,
    timeout_milliseconds:=15000
  );
  $$
);
