
ALTER TYPE public.tx_kind ADD VALUE IF NOT EXISTS 'deposit_credit';
ALTER TYPE public.tx_kind ADD VALUE IF NOT EXISTS 'package_settle';

ALTER TABLE public.package_purchases REPLICA IDENTITY FULL;
ALTER TABLE public.deposit_requests   REPLICA IDENTITY FULL;
ALTER TABLE public.daily_stats        REPLICA IDENTITY FULL;
ALTER TABLE public.jackpot_pool       REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.package_purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jackpot_pool;
