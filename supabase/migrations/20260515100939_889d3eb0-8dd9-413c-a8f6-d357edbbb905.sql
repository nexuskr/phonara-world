-- ===== Tournament tables =====
CREATE TABLE IF NOT EXISTS public.slot_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_kst date NOT NULL UNIQUE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  prize_pool_phon numeric NOT NULL DEFAULT 500000,
  -- distribution percent for ranks 1..10 (must sum to 100)
  prize_split jsonb NOT NULL DEFAULT '[40,20,12,8,6,5,4,3,1.5,0.5]'::jsonb,
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live','settled')),
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slot_tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slot_tournaments_public_read" ON public.slot_tournaments;
CREATE POLICY "slot_tournaments_public_read"
  ON public.slot_tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "slot_tournaments_admin_write" ON public.slot_tournaments;
CREATE POLICY "slot_tournaments_admin_write"
  ON public.slot_tournaments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.slot_tournament_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.slot_tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rank integer NOT NULL,
  total_payout numeric NOT NULL,
  prize_phon numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_slot_tournament_payouts_user
  ON public.slot_tournament_payouts (user_id, paid_at DESC);

ALTER TABLE public.slot_tournament_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slot_tournament_payouts_public_read" ON public.slot_tournament_payouts;
CREATE POLICY "slot_tournament_payouts_public_read"
  ON public.slot_tournament_payouts FOR SELECT USING (true);

DROP POLICY IF EXISTS "slot_tournament_payouts_admin_write" ON public.slot_tournament_payouts;
CREATE POLICY "slot_tournament_payouts_admin_write"
  ON public.slot_tournament_payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ===== Helper: current/upcoming tournament with auto-bootstrap =====
CREATE OR REPLACE FUNCTION public.ensure_current_slot_tournament()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _kst_now timestamptz := _now AT TIME ZONE 'Asia/Seoul';
  -- Monday of this KST week (00:00 KST)
  _week_start_kst date := (date_trunc('week', _kst_now))::date;
  _starts_at timestamptz := (_week_start_kst::timestamp AT TIME ZONE 'Asia/Seoul');
  _ends_at timestamptz := _starts_at + interval '7 days';
  _id uuid;
BEGIN
  SELECT id INTO _id FROM public.slot_tournaments
   WHERE week_start_kst = _week_start_kst;
  IF _id IS NULL THEN
    INSERT INTO public.slot_tournaments (week_start_kst, starts_at, ends_at)
    VALUES (_week_start_kst, _starts_at, _ends_at)
    RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_slot_tournament() FROM PUBLIC;

-- ===== Public RPC: snapshot current tournament =====
CREATE OR REPLACE FUNCTION public.get_current_slot_tournament()
RETURNS TABLE (
  id uuid,
  week_start_kst date,
  starts_at timestamptz,
  ends_at timestamptz,
  prize_pool_phon numeric,
  prize_split jsonb,
  status text,
  seconds_remaining integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.week_start_kst, t.starts_at, t.ends_at,
         t.prize_pool_phon, t.prize_split, t.status,
         GREATEST(0, EXTRACT(EPOCH FROM (t.ends_at - now()))::integer) AS seconds_remaining
    FROM public.slot_tournaments t
   WHERE t.status = 'live'
   ORDER BY t.ends_at DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_current_slot_tournament() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_slot_tournament() TO anon, authenticated;

-- ===== Public RPC: leaderboard for a tournament =====
CREATE OR REPLACE FUNCTION public.get_slot_tournament_leaderboard(
  _tournament_id uuid DEFAULT NULL,
  _limit integer DEFAULT 20
)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  nickname_masked text,
  total_payout numeric,
  spins bigint,
  prize_estimate numeric,
  is_me boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tid uuid := _tournament_id;
  _starts timestamptz;
  _ends timestamptz;
  _pool numeric;
  _split jsonb;
  _uid uuid := auth.uid();
BEGIN
  IF _tid IS NULL THEN
    SELECT id INTO _tid FROM public.slot_tournaments
     WHERE status = 'live' ORDER BY ends_at DESC LIMIT 1;
  END IF;
  IF _tid IS NULL THEN RETURN; END IF;

  SELECT t.starts_at, t.ends_at, t.prize_pool_phon, t.prize_split
    INTO _starts, _ends, _pool, _split
    FROM public.slot_tournaments t WHERE t.id = _tid;

  RETURN QUERY
  WITH agg AS (
    SELECT s.user_id,
           SUM(GREATEST(s.payout_phon, 0))::numeric AS total_payout,
           COUNT(*)::bigint AS spins
      FROM public.slot_spins s
     WHERE s.created_at >= _starts AND s.created_at < _ends
       AND s.payout_phon IS NOT NULL
     GROUP BY s.user_id
  ),
  ranked AS (
    SELECT a.user_id, a.total_payout, a.spins,
           ROW_NUMBER() OVER (ORDER BY a.total_payout DESC, a.spins DESC) AS rk
      FROM agg a
  )
  SELECT r.rk AS rank,
         r.user_id,
         public.mask_nickname(COALESCE(p.nickname, 'Player')) AS nickname_masked,
         r.total_payout,
         r.spins,
         CASE
           WHEN r.rk <= jsonb_array_length(_split)
           THEN ROUND(_pool * COALESCE((_split ->> ((r.rk - 1)::int))::numeric, 0) / 100.0, 2)
           ELSE 0
         END AS prize_estimate,
         (r.user_id = _uid) AS is_me
    FROM ranked r
    LEFT JOIN public.profiles p ON p.id = r.user_id
   ORDER BY r.rk
   LIMIT GREATEST(_limit, 3);
END;
$$;

REVOKE ALL ON FUNCTION public.get_slot_tournament_leaderboard(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_slot_tournament_leaderboard(uuid, integer) TO anon, authenticated;

-- ===== Settlement: pays top N from prize pool, marks settled, creates next week =====
CREATE OR REPLACE FUNCTION public.settle_due_slot_tournaments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t RECORD;
  _settled int := 0;
  _split jsonb;
  _pool numeric;
  _rec RECORD;
  _prize numeric;
  _next_start timestamptz;
  _next_end timestamptz;
  _next_week date;
BEGIN
  FOR _t IN
    SELECT * FROM public.slot_tournaments
     WHERE status = 'live' AND ends_at <= now()
     ORDER BY ends_at
     FOR UPDATE SKIP LOCKED
  LOOP
    _split := _t.prize_split;
    _pool := _t.prize_pool_phon;

    FOR _rec IN
      WITH agg AS (
        SELECT s.user_id,
               SUM(GREATEST(s.payout_phon, 0))::numeric AS total_payout
          FROM public.slot_spins s
         WHERE s.created_at >= _t.starts_at AND s.created_at < _t.ends_at
           AND s.payout_phon IS NOT NULL
         GROUP BY s.user_id
      )
      SELECT user_id, total_payout,
             ROW_NUMBER() OVER (ORDER BY total_payout DESC) AS rk
        FROM agg
       ORDER BY total_payout DESC
       LIMIT jsonb_array_length(_split)
    LOOP
      _prize := ROUND(_pool * COALESCE((_split ->> ((_rec.rk - 1)::int))::numeric, 0) / 100.0, 2);
      IF _prize > 0 THEN
        INSERT INTO public.slot_tournament_payouts
          (tournament_id, user_id, rank, total_payout, prize_phon)
        VALUES (_t.id, _rec.user_id, _rec.rk, _rec.total_payout, _prize)
        ON CONFLICT (tournament_id, user_id) DO NOTHING;

        INSERT INTO public.phon_balances (user_id, balance)
        VALUES (_rec.user_id, _prize)
        ON CONFLICT (user_id) DO UPDATE
          SET balance = public.phon_balances.balance + _prize,
              updated_at = now();
      END IF;
    END LOOP;

    UPDATE public.slot_tournaments
       SET status = 'settled', settled_at = now()
     WHERE id = _t.id;

    -- Bootstrap next week (idempotent on week_start_kst)
    _next_start := _t.ends_at;
    _next_end := _next_start + interval '7 days';
    _next_week := (_next_start AT TIME ZONE 'Asia/Seoul')::date;
    INSERT INTO public.slot_tournaments (week_start_kst, starts_at, ends_at)
    VALUES (_next_week, _next_start, _next_end)
    ON CONFLICT (week_start_kst) DO NOTHING;

    _settled := _settled + 1;
  END LOOP;

  RETURN _settled;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_due_slot_tournaments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_due_slot_tournaments() TO authenticated;

-- ===== Cron: hourly settlement check =====
DO $$ BEGIN
  PERFORM cron.unschedule('settle-slot-tournaments-hourly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'settle-slot-tournaments-hourly',
  '5 * * * *',
  $$ SELECT public.settle_due_slot_tournaments(); $$
);

-- Bootstrap initial tournament for current week
SELECT public.ensure_current_slot_tournament();

-- ===== Function permissions baseline =====
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('get_current_slot_tournament', '', ARRAY['anon','authenticated'], 'slot', 'Public weekly slot tournament snapshot'),
  ('get_slot_tournament_leaderboard', 'uuid, integer', ARRAY['anon','authenticated'], 'slot', 'Public weekly slot tournament leaderboard'),
  ('settle_due_slot_tournaments', '', ARRAY['authenticated'], 'slot', 'Hourly cron — settle ended weekly tournaments + bootstrap next week'),
  ('ensure_current_slot_tournament', '', ARRAY['service_role'], 'slot', 'Internal bootstrap helper for current week tournament')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      updated_at = now();