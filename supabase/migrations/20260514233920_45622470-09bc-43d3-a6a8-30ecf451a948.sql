
DO $$
DECLARE
  v_url text := 'https://ketlqzfaplppmupaiwft.supabase.co/functions/v1/reactivation-cron';
  v_key text;
BEGIN
  -- Remove any prior schedule with same name
  PERFORM cron.unschedule('reactivation-cron-daily') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname='reactivation-cron-daily'
  );

  PERFORM cron.schedule(
    'reactivation-cron-daily',
    '0 1 * * *',  -- 01:00 UTC = 10:00 KST
    $cron$
    SELECT net.http_post(
      url := 'https://ketlqzfaplppmupaiwft.supabase.co/functions/v1/reactivation-cron',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := '{}'::jsonb
    );
    $cron$
  );
END $$;
