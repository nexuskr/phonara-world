ALTER TABLE public.anomaly_events
DROP CONSTRAINT IF EXISTS anomaly_events_severity_check;

ALTER TABLE public.anomaly_events
ADD CONSTRAINT anomaly_events_severity_check
CHECK (
  severity = ANY (ARRAY['info'::text, 'low'::text, 'medium'::text, 'high'::text, 'critical'::text])
);

CREATE OR REPLACE FUNCTION public.register_device(_fp text, _ua text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_new boolean := false;
  device_count integer := 0;
  row_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = 'P0001';
  END IF;

  IF _fp IS NULL OR length(_fp) < 16 OR length(_fp) > 128 THEN
    RAISE EXCEPTION 'invalid_fingerprint' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO device_count
  FROM public.user_devices
  WHERE user_id = uid;

  INSERT INTO public.user_devices (user_id, fp_hash, ua, last_seen)
  VALUES (uid, _fp, NULLIF(left(coalesce(_ua, ''), 256), ''), now())
  ON CONFLICT (user_id, fp_hash)
  DO UPDATE SET
    last_seen = now(),
    ua = COALESCE(EXCLUDED.ua, public.user_devices.ua)
  RETURNING id, (xmax = 0) INTO row_id, is_new;

  IF is_new AND device_count > 0 THEN
    INSERT INTO public.anomaly_events (user_id, rule, severity, evidence, dedupe_key)
    VALUES (
      uid,
      'new_device',
      'info',
      jsonb_build_object(
        'fp_hash_prefix', left(_fp, 12),
        'ua', NULLIF(left(coalesce(_ua, ''), 256), ''),
        'prior_device_count', device_count
      ),
      'new_device:' || uid::text || ':' || left(_fp, 16) || ':' || to_char(now(), 'YYYY-MM-DD')
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'device_id', row_id,
    'is_new', is_new,
    'prior_count', device_count
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.register_device(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_device(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_live_activity_60s(_limit integer DEFAULT 30)
RETURNS TABLE(kind text, flag text, title text, amount numeric, user_mask text, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  WITH nft_mint AS (
    SELECT 'nft_mint'::text AS kind,
           '🪐'::text AS flag,
           (upper(nc.level) || ' ' || nc.type)::text AS title,
           coalesce(nc.boost_pct, 0)::numeric AS amount,
           ('Empire ' || substr(md5(nc.user_id::text), 1, 4))::text AS user_mask,
           nc.created_at
      FROM public.nft_collection nc
     WHERE nc.created_at >= now() - interval '60 seconds'
  ),
  crowns AS (
    SELECT 'crown_explosion'::text AS kind,
           '👑'::text AS flag,
           'Crown Explosion'::text AS title,
           coalesce(ce.awarded_amount, 0)::numeric AS amount,
           ('Whale ' || substr(md5(ce.user_id::text), 1, 4))::text AS user_mask,
           ce.created_at
      FROM public.crown_events ce
     WHERE ce.created_at >= now() - interval '60 seconds'
       AND ce.awarded_amount >= 10
  ),
  promotions AS (
    SELECT 'baron_promotion'::text AS kind,
           '⚜️'::text AS flag,
           ('Tier ' || p.empire_level::text)::text AS title,
           p.empire_level::numeric AS amount,
           ('Baron ' || substr(md5(p.id::text), 1, 4))::text AS user_mask,
           p.updated_at AS created_at
      FROM public.profiles p
     WHERE p.empire_level >= 7
       AND p.updated_at >= now() - interval '60 seconds'
  )
  SELECT u.kind, u.flag, u.title, u.amount, u.user_mask, u.created_at
    FROM (
      SELECT * FROM nft_mint
      UNION ALL
      SELECT * FROM crowns
      UNION ALL
      SELECT * FROM promotions
    ) u
   ORDER BY u.created_at DESC
   LIMIT greatest(1, least(_limit, 50));
END;
$function$;

REVOKE ALL ON FUNCTION public.get_live_activity_60s(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_activity_60s(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_top_emperor_24h()
RETURNS TABLE(user_mask text, total_crown numeric, empire_level integer, flag text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid;
  _total numeric;
BEGIN
  SELECT ce.user_id, SUM(ce.awarded_amount)::numeric
    INTO _uid, _total
    FROM public.crown_events ce
   WHERE ce.created_at > now() - interval '24 hours'
     AND ce.awarded_amount > 0
   GROUP BY ce.user_id
   ORDER BY 2 DESC
   LIMIT 1;

  IF _uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ('Emperor ' || substring(_uid::text, 1, 4))::text,
    _total,
    COALESCE((SELECT p.empire_level FROM public.profiles p WHERE p.id = _uid), 1)::int,
    (ARRAY['🇰🇷','🇯🇵','🇺🇸','🇸🇬','🇹🇼','🇻🇳','🇮🇩','🇭🇰','🇲🇾','🇹🇭'])[1 + (abs(hashtext(_uid::text)) % 10)]::text;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_top_emperor_24h() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_emperor_24h() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.spin_slot_demo(_game_code text, _bet_chips numeric, _client_seed text, _is_buy_bonus boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_game record;
  v_balance numeric;
  v_bet_total numeric;
  v_server_seed text;
  v_nonce bigint;
  v_result jsonb;
  v_payout numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT * INTO v_game
  FROM public.slot_games
  WHERE game_code = _game_code
    AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game_not_found';
  END IF;

  IF _bet_chips <= 0 THEN
    RAISE EXCEPTION 'bet_invalid';
  END IF;

  v_bet_total := CASE
    WHEN _is_buy_bonus THEN _bet_chips * v_game.buy_bonus_multiplier
    ELSE _bet_chips
  END;

  INSERT INTO public.slot_demo_balances(user_id, balance_chips, last_refill_at)
  VALUES (v_user, 10000, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT balance_chips INTO v_balance
  FROM public.slot_demo_balances
  WHERE user_id = v_user
  FOR UPDATE;

  IF v_balance < v_bet_total THEN
    RAISE EXCEPTION 'insufficient_demo_chips';
  END IF;

  UPDATE public.slot_demo_balances
     SET balance_chips = balance_chips - v_bet_total,
         updated_at = now()
   WHERE user_id = v_user;

  v_server_seed := encode(extensions.gen_random_bytes(32), 'hex');
  v_nonce := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_result := public._slot_compute_spin(v_server_seed, _client_seed, v_nonce, _is_buy_bonus, 0);
  v_payout := _bet_chips * (v_result->>'payout_mult')::numeric;

  IF v_payout > 0 THEN
    UPDATE public.slot_demo_balances
       SET balance_chips = balance_chips + v_payout,
           updated_at = now()
     WHERE user_id = v_user;
  END IF;

  SELECT balance_chips INTO v_balance
  FROM public.slot_demo_balances
  WHERE user_id = v_user;

  RETURN jsonb_build_object(
    'symbols', v_result->'symbols',
    'win_lines', v_result->'win_lines',
    'payout_chips', v_payout,
    'bet_chips', v_bet_total,
    'balance_chips', v_balance,
    'bonus_triggered', v_result->'bonus_triggered',
    'bonus_multiplier', v_result->'bonus_multiplier'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.spin_slot_demo(text, numeric, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spin_slot_demo(text, numeric, text, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';