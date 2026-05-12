
-- 1) Weekly ranking snapshot
CREATE TABLE IF NOT EXISTS public.guild_weekly_rankings (
  id BIGSERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  total_contribution BIGINT NOT NULL,
  member_count INT NOT NULL,
  reward_pool INT NOT NULL,
  badge TEXT NULL,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_gwr_week ON public.guild_weekly_rankings (week_start, rank);

ALTER TABLE public.guild_weekly_rankings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gwr public read" ON public.guild_weekly_rankings;
CREATE POLICY "gwr public read" ON public.guild_weekly_rankings FOR SELECT USING (true);

-- 2) Per-member payout
CREATE TABLE IF NOT EXISTS public.guild_weekly_payouts (
  id BIGSERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  guild_id UUID NOT NULL,
  user_id UUID NOT NULL,
  contribution BIGINT NOT NULL,
  payout_crown INT NOT NULL,
  rank INT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gwp_user ON public.guild_weekly_payouts (user_id, week_start DESC);

ALTER TABLE public.guild_weekly_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gwp own read" ON public.guild_weekly_payouts;
CREATE POLICY "gwp own read" ON public.guild_weekly_payouts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 3) Hook award_crown to accumulate guild contribution
CREATE OR REPLACE FUNCTION public.accrue_guild_contribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.guild_members
    SET contribution = contribution + NEW.awarded_amount
    WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crown_accrue_guild ON public.crown_events;
CREATE TRIGGER trg_crown_accrue_guild
AFTER INSERT ON public.crown_events
FOR EACH ROW EXECUTE FUNCTION public.accrue_guild_contribution();

-- 4) Public ranking RPC
CREATE OR REPLACE FUNCTION public.get_guild_rankings(_week_start DATE DEFAULT NULL)
RETURNS TABLE (
  rank INT, guild_id UUID, name TEXT, emblem TEXT,
  total_contribution BIGINT, member_count INT, reward_pool INT, badge TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_week DATE := COALESCE(_week_start,
    (date_trunc('week', (now() AT TIME ZONE 'UTC') - interval '7 days'))::date);
BEGIN
  RETURN QUERY
  SELECT r.rank, r.guild_id, g.name, g.emblem, r.total_contribution,
         r.member_count, r.reward_pool, r.badge
    FROM public.guild_weekly_rankings r
    JOIN public.guilds g ON g.id = r.guild_id
    WHERE r.week_start = v_week
    ORDER BY r.rank ASC
    LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.get_guild_rankings(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_guild_rankings(DATE) TO authenticated;

-- 5) Internal: distribute crown to guild member without invoking award_crown's auth.uid() check
CREATE OR REPLACE FUNCTION public._grant_guild_crown(_user_id UUID, _amount INT, _dedupe_key TEXT, _meta JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _amount <= 0 THEN RETURN; END IF;
  -- Insert directly (idempotent on dedupe)
  BEGIN
    INSERT INTO public.crown_events (user_id, event_type, base_amount, awarded_amount,
      variance, level_mult, streak_mult, type_mult, expected_amount, rpe, meta, dedupe_key)
    VALUES (_user_id, 'guild_weekly', _amount, _amount,
      1.0, 1.0, 1.0, 1.0, _amount, 0, _meta, _dedupe_key);
  EXCEPTION WHEN unique_violation THEN
    RETURN;
  END;
  UPDATE public.profiles SET crown_score = crown_score + _amount, updated_at = now()
    WHERE id = _user_id;
  PERFORM public.recompute_empire_level(_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public._grant_guild_crown(UUID, INT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- 6) settle_guild_weekly: snapshot + payout for the previous ISO week (Mon~Sun)
CREATE OR REPLACE FUNCTION public.settle_guild_weekly(_target_week DATE DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_week DATE;
  v_week_end DATE;
  v_count INT := 0;
  v_paid INT := 0;
  r RECORD;
  m RECORD;
  v_pool INT;
  v_badge TEXT;
  v_dedupe TEXT;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin or service_role only';
  END IF;

  v_week := COALESCE(_target_week,
    (date_trunc('week', (now() AT TIME ZONE 'UTC') - interval '7 days'))::date);
  v_week_end := v_week + 7;

  -- Idempotency: if this week already snapshotted, exit
  IF EXISTS (SELECT 1 FROM public.guild_weekly_rankings WHERE week_start = v_week) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'already settled', 'week', v_week);
  END IF;

  -- Aggregate contribution earned during the week from crown_events
  CREATE TEMP TABLE tmp_guild_week ON COMMIT DROP AS
  SELECT gm.guild_id,
         SUM(ce.awarded_amount) AS total_contribution,
         COUNT(DISTINCT ce.user_id) AS member_count
    FROM public.crown_events ce
    JOIN public.guild_members gm ON gm.user_id = ce.user_id
    WHERE ce.created_at >= v_week
      AND ce.created_at <  v_week_end
      AND ce.event_type <> 'guild_weekly'
    GROUP BY gm.guild_id
    HAVING SUM(ce.awarded_amount) > 0;

  -- Rank
  FOR r IN
    SELECT guild_id, total_contribution, member_count,
           ROW_NUMBER() OVER (ORDER BY total_contribution DESC) AS rk
    FROM tmp_guild_week
    LIMIT 50
  LOOP
    -- Reward pool by tier
    IF r.rk <= 3 THEN
      v_pool := 300 * r.member_count + 150 * LEAST(r.member_count, 3);
      v_badge := CASE r.rk WHEN 1 THEN 'legendary_gold' WHEN 2 THEN 'legendary_silver' ELSE 'legendary_bronze' END;
    ELSIF r.rk <= 10 THEN
      v_pool := 150 * r.member_count + 80 * LEAST(r.member_count, 3);
      v_badge := 'top10';
    ELSE
      v_pool := 80 * r.member_count + 40 * LEAST(r.member_count, 3);
      v_badge := NULL;
    END IF;

    INSERT INTO public.guild_weekly_rankings (week_start, guild_id, rank, total_contribution, member_count, reward_pool, badge)
    VALUES (v_week, r.guild_id, r.rk, r.total_contribution, r.member_count, v_pool, v_badge);
    v_count := v_count + 1;

    -- Distribute by per-member contribution this week
    FOR m IN
      SELECT ce.user_id, SUM(ce.awarded_amount) AS member_contrib
        FROM public.crown_events ce
        JOIN public.guild_members gm ON gm.user_id = ce.user_id
       WHERE gm.guild_id = r.guild_id
         AND ce.created_at >= v_week AND ce.created_at < v_week_end
         AND ce.event_type <> 'guild_weekly'
       GROUP BY ce.user_id
    LOOP
      DECLARE v_share INT;
      BEGIN
        v_share := GREATEST(1, ROUND(v_pool::numeric * m.member_contrib / GREATEST(r.total_contribution,1)));
        v_dedupe := 'guild_weekly:' || v_week || ':' || r.guild_id;
        PERFORM public._grant_guild_crown(m.user_id, v_share, v_dedupe,
          jsonb_build_object('week', v_week, 'guild_id', r.guild_id, 'rank', r.rk, 'pool', v_pool));
        INSERT INTO public.guild_weekly_payouts (week_start, guild_id, user_id, contribution, payout_crown, rank)
        VALUES (v_week, r.guild_id, m.user_id, m.member_contrib, v_share, r.rk)
        ON CONFLICT (week_start, user_id) DO NOTHING;
        v_paid := v_paid + 1;
      END;
    END LOOP;
  END LOOP;

  -- Recompute total_power per guild (current contribution sum)
  UPDATE public.guilds g
    SET total_power = COALESCE(t.tot, 0), updated_at = now()
    FROM (SELECT guild_id, SUM(contribution) AS tot FROM public.guild_members GROUP BY guild_id) t
    WHERE g.id = t.guild_id;

  RETURN jsonb_build_object('week', v_week, 'guilds_settled', v_count, 'members_paid', v_paid);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_guild_weekly(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_guild_weekly(DATE) TO authenticated, service_role;

-- 7) Permission baseline
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note) VALUES
  ('get_guild_rankings', 'date', ARRAY['authenticated'], 'gamification', 'public read of weekly guild rankings'),
  ('settle_guild_weekly', 'date', ARRAY['authenticated','service_role'], 'gamification', 'admin or cron; idempotent per week'),
  ('accrue_guild_contribution', '', ARRAY[]::text[], 'gamification', 'AFTER INSERT trigger on crown_events'),
  ('_grant_guild_crown', 'uuid, integer, text, jsonb', ARRAY[]::text[], 'gamification', 'internal only; called by settle_guild_weekly')
ON CONFLICT (function_name, function_args) DO UPDATE
  SET allowed_roles = EXCLUDED.allowed_roles, note = EXCLUDED.note, updated_at = now();
