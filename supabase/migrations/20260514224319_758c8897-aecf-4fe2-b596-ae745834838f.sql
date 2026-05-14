
CREATE TABLE IF NOT EXISTS public.daily_headlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'trump' CHECK (tone IN ('trump','musk','neutral')),
  locale TEXT NOT NULL DEFAULT 'ko',
  source_stats JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_daily_headlines_created ON public.daily_headlines(created_at DESC);
ALTER TABLE public.daily_headlines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "headlines public read" ON public.daily_headlines;
CREATE POLICY "headlines public read" ON public.daily_headlines FOR SELECT USING (expires_at > now());

CREATE TABLE IF NOT EXISTS public.competitor_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  unit TEXT,
  source_url TEXT NOT NULL,
  source_label TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (competitor, metric_key)
);
ALTER TABLE public.competitor_benchmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "benchmarks public read" ON public.competitor_benchmarks;
CREATE POLICY "benchmarks public read" ON public.competitor_benchmarks FOR SELECT USING (active = true);

INSERT INTO public.competitor_benchmarks (competitor, metric_key, metric_value, unit, source_url, source_label) VALUES
  ('Coinbase Retail', 'avg_withdrawal_minutes', 60, 'min', 'https://help.coinbase.com/en/coinbase/trading-and-funding/sending-or-receiving-cryptocurrency/withdrawal-times', 'Coinbase Help'),
  ('Binance Spot',    'avg_withdrawal_minutes', 30, 'min', 'https://www.binance.com/en/support/faq/withdrawal-arrival-time', 'Binance FAQ'),
  ('Coinbase Retail', 'taker_fee_pct',          0.6, '%', 'https://www.coinbase.com/advanced-fees', 'Coinbase Fees'),
  ('Binance Spot',    'taker_fee_pct',          0.1, '%', 'https://www.binance.com/en/fee/schedule', 'Binance Fees')
ON CONFLICT (competitor, metric_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_daily_headlines(_locale TEXT DEFAULT 'ko', _limit INT DEFAULT 5)
RETURNS TABLE(text TEXT, tone TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT h.text, h.tone, h.created_at
  FROM public.daily_headlines h
  WHERE h.expires_at > now() AND (h.locale = _locale OR _locale = 'any')
  ORDER BY h.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 20));
$$;

CREATE OR REPLACE FUNCTION public.get_top_emperor_24h()
RETURNS TABLE(user_mask TEXT, total_crown NUMERIC, empire_level INT, flag TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID;
  _total NUMERIC;
BEGIN
  SELECT ce.user_id, SUM(ce.awarded_amount)::NUMERIC
  INTO _uid, _total
  FROM public.crown_events ce
  WHERE ce.created_at > now() - INTERVAL '24 hours' AND ce.awarded_amount > 0
  GROUP BY ce.user_id ORDER BY 2 DESC LIMIT 1;
  IF _uid IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT
    ('Emperor ' || substring(_uid::text, 1, 4))::TEXT,
    _total,
    COALESCE((SELECT el.level FROM public.empire_levels el WHERE el.user_id = _uid), 1)::INT,
    (ARRAY['🇰🇷','🇯🇵','🇺🇸','🇸🇬','🇹🇼','🇻🇳','🇮🇩','🇭🇰','🇲🇾','🇹🇭'])[1 + (abs(hashtext(_uid::text)) % 10)]::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_competitor_compare()
RETURNS TABLE(competitor TEXT, metric_key TEXT, metric_value NUMERIC, unit TEXT, source_url TEXT, source_label TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cb.competitor, cb.metric_key, cb.metric_value, cb.unit, cb.source_url, cb.source_label
  FROM public.competitor_benchmarks cb WHERE cb.active = true
  ORDER BY cb.competitor, cb.metric_key;
$$;

CREATE OR REPLACE FUNCTION public.get_public_stats_json()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'as_of', now(),
    'stats', public.get_world_domination_stats(),
    'top_emperor', (SELECT to_jsonb(t) FROM public.get_top_emperor_24h() t LIMIT 1),
    'competitors', (SELECT jsonb_agg(to_jsonb(c)) FROM public.get_competitor_compare() c),
    'headlines', (SELECT jsonb_agg(to_jsonb(h)) FROM public.get_daily_headlines('any', 10) h)
  );
$$;

INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('get_daily_headlines',   'text, integer', ARRAY['anon','authenticated']::text[], 'public_stats', 'Trump-tone headlines'),
  ('get_top_emperor_24h',   '',              ARRAY['anon','authenticated']::text[], 'public_stats', 'Top crown emperor (masked)'),
  ('get_competitor_compare','',              ARRAY['anon','authenticated']::text[], 'public_stats', 'Competitor benchmarks'),
  ('get_public_stats_json', '',              ARRAY['anon','authenticated']::text[], 'public_stats', 'JSON snapshot for press/bots')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, category = EXCLUDED.category, note = EXCLUDED.note;

GRANT EXECUTE ON FUNCTION public.get_daily_headlines(TEXT,INT)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_emperor_24h()            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_competitor_compare()         TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_stats_json()          TO anon, authenticated;

INSERT INTO public.daily_headlines (text, tone, locale) VALUES
  ('We''re #1. Period.', 'trump', 'en'),
  ('PHONARA: 가장 빠른 출금. 진짜로.', 'trump', 'ko'),
  ('Physics says: leverage × oracle = empire.', 'musk', 'en'),
  ('황제는 잠들지 않는다. 24시간 가동중.', 'trump', 'ko'),
  ('Built different. Built faster.', 'musk', 'en');
