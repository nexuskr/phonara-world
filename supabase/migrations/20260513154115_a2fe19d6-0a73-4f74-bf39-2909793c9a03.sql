-- =====================================================================
-- GHOST EMPIRE SIMULATION ENGINE — Phase 1 schema
-- 100% simulated data. Real money / real wallet tables untouched.
-- All rows carry is_simulated=true and a SIM badge in UI.
-- =====================================================================

-- 1) Pulse state (single-row, public-readable)
CREATE TABLE IF NOT EXISTS public.ghost_pulse_state (
  id              SMALLINT PRIMARY KEY DEFAULT 1,
  live_users      INTEGER  NOT NULL DEFAULT 12842,
  active_now      INTEGER  NOT NULL DEFAULT 3120,
  today_withdrawals BIGINT NOT NULL DEFAULT 0,
  region_pulses   JSONB    NOT NULL DEFAULT '{"KR":4210,"US":3180,"JP":1820,"VN":980,"BR":620,"IN":540,"ID":480,"TH":410}'::jsonb,
  last_whale_at   TIMESTAMPTZ,
  last_moment_at  TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ghost_pulse_singleton CHECK (id = 1)
);

INSERT INTO public.ghost_pulse_state (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.ghost_pulse_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ghost_pulse public read"
  ON public.ghost_pulse_state FOR SELECT
  USING (true);

-- (no write policy → only service_role / SECURITY DEFINER may write)

-- 2) Ghost strike feed (joins into existing whale rail via union)
CREATE TABLE IF NOT EXISTS public.ghost_strikes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL CHECK (kind IN ('crown','baron','withdraw')),
  amount       BIGINT NOT NULL DEFAULT 0,
  label        TEXT NOT NULL DEFAULT '',
  nick         TEXT NOT NULL DEFAULT '익명의 영주',
  region       TEXT,
  is_simulated BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '36 hours'
);

CREATE INDEX IF NOT EXISTS idx_ghost_strikes_recent
  ON public.ghost_strikes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghost_strikes_expire
  ON public.ghost_strikes (expires_at);

ALTER TABLE public.ghost_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ghost_strikes public read"
  ON public.ghost_strikes FOR SELECT
  USING (is_simulated = true);

-- 3) Empire moments (global broadcast toasts, public realtime)
CREATE TABLE IF NOT EXISTS public.ghost_moments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message      TEXT NOT NULL,
  amount       BIGINT,
  kind         TEXT NOT NULL DEFAULT 'withdraw',
  is_simulated BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '6 hours'
);

CREATE INDEX IF NOT EXISTS idx_ghost_moments_recent
  ON public.ghost_moments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghost_moments_expire
  ON public.ghost_moments (expires_at);

ALTER TABLE public.ghost_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ghost_moments public read"
  ON public.ghost_moments FOR SELECT
  USING (is_simulated = true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ghost_moments;
ALTER TABLE public.ghost_moments REPLICA IDENTITY FULL;

-- 4) Public RPC — pulse snapshot
CREATE OR REPLACE FUNCTION public.get_ghost_pulse()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'live_users',        live_users,
    'active_now',        active_now,
    'today_withdrawals', today_withdrawals,
    'region_pulses',     region_pulses,
    'updated_at',        updated_at
  )
  FROM public.ghost_pulse_state WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_ghost_pulse() TO anon, authenticated;

-- 5) Public RPC — ghost strikes feed (3 buckets, used by WhaleStrikeRailV3)
CREATE OR REPLACE FUNCTION public.get_ghost_strikes(_limit integer DEFAULT 60)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'kind',       kind,
    'created_at', created_at,
    'amount',     amount,
    'label',      label,
    'nick',       nick,
    'region',     region,
    'is_simulated', is_simulated
  ) ORDER BY created_at DESC), '[]'::jsonb)
  FROM (
    SELECT * FROM public.ghost_strikes
    WHERE created_at >= now() - interval '24 hours'
    ORDER BY created_at DESC
    LIMIT greatest(_limit, 1)
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_ghost_strikes(integer) TO anon, authenticated;

-- 6) Service-only RPC used by ghost-pulse-tick edge function
CREATE OR REPLACE FUNCTION public.ghost_tick(
  _live_delta INTEGER,
  _active_now INTEGER,
  _wd_delta   BIGINT,
  _region_inc JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur JSONB;
  k   TEXT;
  v   INTEGER;
BEGIN
  SELECT region_pulses INTO cur FROM public.ghost_pulse_state WHERE id = 1;
  IF cur IS NULL THEN cur := '{}'::jsonb; END IF;
  IF _region_inc IS NOT NULL THEN
    FOR k, v IN SELECT key, (value)::int FROM jsonb_each_text(_region_inc) LOOP
      cur := jsonb_set(cur, ARRAY[k], to_jsonb(coalesce((cur->>k)::int,0) + v));
    END LOOP;
  END IF;

  UPDATE public.ghost_pulse_state
  SET live_users = least(live_users + _live_delta, 1234567),
      active_now = greatest(_active_now, 0),
      today_withdrawals = today_withdrawals + greatest(_wd_delta, 0),
      region_pulses = cur,
      updated_at = now()
  WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.ghost_tick(integer,integer,bigint,jsonb) FROM PUBLIC, anon, authenticated;

-- 7) Cleanup function (called by tick)
CREATE OR REPLACE FUNCTION public.ghost_cleanup_expired()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.ghost_strikes WHERE expires_at < now();
  DELETE FROM public.ghost_moments WHERE expires_at < now();
$$;

REVOKE ALL ON FUNCTION public.ghost_cleanup_expired() FROM PUBLIC, anon, authenticated;

-- 8) Daily reset of today_withdrawals at KST midnight (handled by pg_cron in step 2)
CREATE OR REPLACE FUNCTION public.ghost_reset_daily()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ghost_pulse_state SET today_withdrawals = 0 WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.ghost_reset_daily() FROM PUBLIC, anon, authenticated;