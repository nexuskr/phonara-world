-- All-in-Postgres ghost simulation runner. Replaces edge-function approach.
CREATE OR REPLACE FUNCTION public.ghost_pulse_run()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kst_hour    INT;
  mult        NUMERIC;
  live_delta  INT;
  active_now  INT;
  wd_delta    BIGINT;
  region_arr  TEXT[] := ARRAY['KR','US','JP','VN','BR','IN','ID','TH'];
  prefix_arr  TEXT[] := ARRAY['황제','영주','백작','대공','Baron','마스터'];
  suffix_arr  TEXT[] := ARRAY['K***n','J***i','S***h','M***o','Y***','L***'];
  n_strikes   INT;
  n_moments   INT;
  i           INT;
  ts          TIMESTAMPTZ;
  k           TEXT;
  amt         BIGINT;
  lbl         TEXT;
  nick_v      TEXT;
  region_v    TEXT;
  region_inc  JSONB := '{}'::jsonb;
  verb        TEXT;
BEGIN
  kst_hour := MOD(EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Seoul'))::INT, 24);
  mult := CASE
    WHEN kst_hour BETWEEN 19 AND 23 THEN 2.5
    WHEN kst_hour BETWEEN 0 AND 6  THEN 0.4
    ELSE 1.0
  END;

  -- 1) Pulse update (~1 minute worth in one tick)
  live_delta := GREATEST(1, ROUND((47 + random() * 265) * mult)::INT);
  active_now := ROUND((2800 + random() * 15700) * mult)::INT;
  wd_delta   := CASE WHEN random() < 0.55
                     THEN ROUND((600000 + random() * 9200000) * mult)::BIGINT
                     ELSE 0 END;

  -- random region increments (3 regions)
  FOR i IN 1..3 LOOP
    region_v := region_arr[1 + floor(random() * array_length(region_arr,1))::int];
    region_inc := jsonb_set(
      region_inc,
      ARRAY[region_v],
      to_jsonb(coalesce((region_inc->>region_v)::int, 0)
               + GREATEST(1, ROUND((1 + random() * 7) * mult)::INT))
    );
  END LOOP;

  PERFORM public.ghost_tick(live_delta, active_now, wd_delta, region_inc);

  -- 2) Strikes — 1~2 per 5s tick on average
  n_strikes := GREATEST(1, ROUND((1 + random() * 1.5) * mult)::INT);
  FOR i IN 1..n_strikes LOOP
    -- jitter created_at across the past 5 seconds
    ts := now() - (random() * interval '5 seconds');
    k  := (ARRAY['crown','crown','withdraw','baron'])[1 + floor(random()*4)::int];
    nick_v := prefix_arr[1 + floor(random()*array_length(prefix_arr,1))::int]
              || ' ' || suffix_arr[1 + floor(random()*array_length(suffix_arr,1))::int];
    region_v := region_arr[1 + floor(random()*array_length(region_arr,1))::int];

    IF k = 'crown' THEN
      amt := (8000 + floor(random() * 472000))::BIGINT;
      lbl := (ARRAY['crown_explosion','mega_crown','jackpot_strike'])[1 + floor(random()*3)::int];
    ELSIF k = 'withdraw' THEN
      amt := (180000 + floor(random() * 11820000))::BIGINT;
      lbl := 'withdrawal';
    ELSE
      amt := 0;
      lbl := 'baron_promotion';
    END IF;

    INSERT INTO public.ghost_strikes(kind, amount, label, nick, region, is_simulated, created_at)
    VALUES (k, amt, lbl, nick_v, region_v, true, ts);
  END LOOP;

  -- 3) Moments — ~1 per 5s tick
  n_moments := CASE WHEN random() < 0.7 * mult THEN 1 ELSE 0 END;
  FOR i IN 1..n_moments LOOP
    ts := now() - (random() * interval '5 seconds');
    nick_v := prefix_arr[1 + floor(random()*array_length(prefix_arr,1))::int]
              || ' ' || suffix_arr[1 + floor(random()*array_length(suffix_arr,1))::int];
    verb := (ARRAY['출금 완료','Crown 폭발','Founding Seat 합류','잭팟 적중'])[1 + floor(random()*4)::int];
    amt  := (1200000 + floor(random() * 86220000))::BIGINT;
    INSERT INTO public.ghost_moments(message, amount, kind, is_simulated, created_at)
    VALUES (
      nick_v || ' 황제 — ' || verb || ' ₩' || to_char(amt, 'FM999,999,999,999'),
      amt,
      CASE WHEN verb LIKE '출금%' THEN 'withdraw' ELSE 'crown' END,
      true,
      ts
    );
  END LOOP;

  -- 4) Cleanup (cheap; indexed)
  PERFORM public.ghost_cleanup_expired();
END;
$$;

REVOKE ALL ON FUNCTION public.ghost_pulse_run() FROM PUBLIC, anon, authenticated;