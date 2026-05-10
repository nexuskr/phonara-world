DO $$
BEGIN
  PERFORM cron.unschedule('liquidation-watcher-30s');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;