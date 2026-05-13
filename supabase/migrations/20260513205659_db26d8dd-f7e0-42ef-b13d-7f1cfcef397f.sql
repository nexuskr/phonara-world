DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='bot_activity_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_activity_events';
  END IF;
END$$;
ALTER TABLE public.bot_activity_events REPLICA IDENTITY FULL;