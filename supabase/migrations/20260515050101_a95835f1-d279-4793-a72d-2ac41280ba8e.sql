
-- 1) admin_audit_log: payload column (legacy functions still write into it)
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2) bot_feed_events: minimal stub table referenced by get_bot_mix_metrics
CREATE TABLE IF NOT EXISTS public.bot_feed_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid,
  kind text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bot_feed_events_occurred ON public.bot_feed_events (occurred_at DESC);
ALTER TABLE public.bot_feed_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bfe admin select" ON public.bot_feed_events;
CREATE POLICY "bfe admin select" ON public.bot_feed_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 3) Replace stale 'confirmed' status comparisons with 'active' (the actual written value)
CREATE OR REPLACE FUNCTION public.check_escalation(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _today date := ((now() AT TIME ZONE 'Asia/Seoul')::date);
  _lifetime bigint; _today_amt bigint; _m record; _granted integer := 0; _window_date date;
BEGIN
  IF _user_id IS NULL THEN RETURN 0; END IF;
  SELECT COALESCE(SUM(amount),0) INTO _lifetime
    FROM public.package_purchases
   WHERE user_id = _user_id AND status::text IN ('active','completed');
  SELECT COALESCE(SUM(amount),0) INTO _today_amt
    FROM public.package_purchases
   WHERE user_id = _user_id AND status::text IN ('active','completed')
     AND ((approved_at AT TIME ZONE 'Asia/Seoul')::date) = _today;
  FOR _m IN SELECT * FROM public.escalation_milestones_catalog ORDER BY sort_order LOOP
    _window_date := CASE WHEN _m.threshold_window = 'daily' THEN _today ELSE NULL END;
    IF (_m.threshold_window = 'lifetime' AND _lifetime >= _m.threshold_krw)
       OR (_m.threshold_window = 'daily'  AND _today_amt >= _m.threshold_krw) THEN
      INSERT INTO public.user_escalation_progress (user_id, milestone_key, window_date)
      VALUES (_user_id, _m.key, _window_date) ON CONFLICT DO NOTHING;
      IF _m.badge_key IS NOT NULL THEN
        INSERT INTO public.user_badges (user_id, badge_key)
        VALUES (_user_id, _m.badge_key) ON CONFLICT DO NOTHING;
      END IF;
      _granted := _granted + 1;
    END IF;
  END LOOP;
  RETURN _granted;
END; $function$;

CREATE OR REPLACE FUNCTION public.recompute_daily_whale_leaderboard()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _today date := (now() AT TIME ZONE 'Asia/Seoul')::date;
  _start timestamptz := (_today::timestamp AT TIME ZONE 'Asia/Seoul');
  _end   timestamptz := ((_today + 1)::timestamp AT TIME ZONE 'Asia/Seoul');
BEGIN
  WITH agg AS (
    SELECT pp.user_id, SUM(pp.amount_krw)::bigint AS deposit_total_krw
      FROM public.package_purchases pp
     WHERE pp.status::text IN ('active','completed')
       AND pp.created_at >= _start AND pp.created_at <  _end
     GROUP BY pp.user_id
  ), ranked AS (
    SELECT user_id, deposit_total_krw,
           RANK() OVER (ORDER BY deposit_total_krw DESC)::int AS rnk
      FROM agg
  )
  INSERT INTO public.daily_whale_leaderboard (date, user_id, deposit_total_krw, rank)
  SELECT _today, user_id, deposit_total_krw, rnk FROM ranked
  ON CONFLICT (date, user_id) DO UPDATE
    SET deposit_total_krw = EXCLUDED.deposit_total_krw, rank = EXCLUDED.rank;
END; $function$;

-- get_my_dashboard_state — same swap
CREATE OR REPLACE FUNCTION public.get_my_dashboard_state()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _today date := ((now() AT TIME ZONE 'Asia/Seoul')::date);
  _score record; _booster record; _next record;
  _today_deposit bigint; _lifetime_deposit bigint; _rank integer; _trading_cap bigint;
BEGIN
  IF _uid IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT * INTO _score FROM public.imperial_scores WHERE user_id = _uid;
  SELECT * INTO _booster FROM public.deposit_booster_windows
   WHERE user_id = _uid AND expires_at > now() ORDER BY expires_at DESC LIMIT 1;
  SELECT COALESCE(SUM(amount),0) INTO _today_deposit
    FROM public.package_purchases
   WHERE user_id = _uid AND status::text IN ('active','completed')
     AND ((approved_at AT TIME ZONE 'Asia/Seoul')::date) = _today;
  SELECT COALESCE(SUM(amount),0) INTO _lifetime_deposit
    FROM public.package_purchases
   WHERE user_id = _uid AND status::text IN ('active','completed');
  _trading_cap := _today_deposit * 10;
  SELECT m.* INTO _next FROM public.escalation_milestones_catalog m
   WHERE NOT EXISTS (
     SELECT 1 FROM public.user_escalation_progress p
      WHERE p.user_id = _uid AND p.milestone_key = m.key
        AND (m.threshold_window = 'lifetime' OR p.window_date = _today)
   ) ORDER BY m.sort_order LIMIT 1;
  SELECT rank INTO _rank FROM public.daily_whale_leaderboard
   WHERE date = _today AND user_id = _uid;
  RETURN jsonb_build_object(
    'imperial_score', COALESCE(_score.score,0),
    'level', COALESCE(_score.level,0),
    'today_deposit', _today_deposit,
    'lifetime_deposit', _lifetime_deposit,
    'trading_cap_today', _trading_cap,
    'whale_rank_today', _rank,
    'booster', CASE WHEN _booster.id IS NULL THEN NULL ELSE
      jsonb_build_object('multiplier', _booster.multiplier, 'expires_at', _booster.expires_at) END,
    'next_milestone', CASE WHEN _next.key IS NULL THEN NULL ELSE
      jsonb_build_object('key', _next.key, 'label', _next.label,
        'threshold_krw', _next.threshold_krw, 'window', _next.threshold_window) END
  );
END; $function$;

-- trg_package_confirmed_engine — fire on 'active' (the actual approved state) instead of 'confirmed'
CREATE OR REPLACE FUNCTION public.trg_package_confirmed_engine()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _base_is bigint;
BEGIN
  IF NEW.status::text NOT IN ('active','confirmed') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text IN ('active','confirmed') THEN RETURN NEW; END IF;
  _base_is := GREATEST(0, (NEW.amount / 10000) * 30);
  PERFORM public.award_imperial_score(
    NEW.user_id, 'deposit', _base_is,
    jsonb_build_object('purchase_id', NEW.id, 'package_id', NEW.package_id, 'amount', NEW.amount)
  );
  PERFORM public.start_or_extend_booster(NEW.user_id, NEW.id, 24);
  PERFORM public.check_escalation(NEW.user_id);
  RETURN NEW;
END; $function$;
