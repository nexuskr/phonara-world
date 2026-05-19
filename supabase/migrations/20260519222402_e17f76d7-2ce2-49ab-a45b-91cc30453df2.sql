DROP FUNCTION IF EXISTS public.apex_play_mock_game(text,numeric,numeric,jsonb);

CREATE OR REPLACE FUNCTION public.apex_play_mock_game(
  _game_code text,
  _bet_phon  numeric DEFAULT 0,
  _bet_usdt  numeric DEFAULT 0,
  _params    jsonb   DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_phon_bal numeric;
  v_usdt_bal numeric;
  v_seed text;
  v_seed_hash text;
  v_nonce bigint;
  v_roll numeric;
  v_mult numeric := 0;
  v_payout_phon numeric := 0;
  v_payout_usdt numeric := 0;
  v_result jsonb := '{}'::jsonb;
  v_target_rtp numeric;
  v_roll_id uuid;
  v_today_count int;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','not_authenticated');
  END IF;
  IF _bet_phon < 0 OR _bet_usdt < 0 OR (_bet_phon = 0 AND _bet_usdt = 0) THEN
    RETURN jsonb_build_object('ok',false,'error','invalid_bet');
  END IF;

  SELECT count(*) INTO v_today_count
  FROM public.apex_game_rolls
  WHERE user_id=v_user AND created_at > now() - interval '24 hours';
  IF v_today_count >= 50 THEN
    RETURN jsonb_build_object('ok',false,'error','daily_cap_reached');
  END IF;

  IF _bet_phon > 0 THEN
    SELECT balance INTO v_phon_bal FROM public.phon_balances WHERE user_id=v_user FOR UPDATE;
    IF COALESCE(v_phon_bal,0) < _bet_phon THEN
      RETURN jsonb_build_object('ok',false,'error','insufficient_phon');
    END IF;
    UPDATE public.phon_balances SET balance=balance-_bet_phon, updated_at=now() WHERE user_id=v_user;
  END IF;

  IF _bet_usdt > 0 THEN
    INSERT INTO public.apex_usdt_mock_balances(user_id,balance) VALUES(v_user,100)
      ON CONFLICT (user_id) DO NOTHING;
    SELECT balance INTO v_usdt_bal FROM public.apex_usdt_mock_balances WHERE user_id=v_user FOR UPDATE;
    IF COALESCE(v_usdt_bal,0) < _bet_usdt THEN
      RETURN jsonb_build_object('ok',false,'error','insufficient_usdt');
    END IF;
    UPDATE public.apex_usdt_mock_balances SET balance=balance-_bet_usdt, updated_at=now() WHERE user_id=v_user;
  END IF;

  v_target_rtp := CASE _game_code
    WHEN 'dice' THEN 0.99 WHEN 'crash' THEN 0.99 WHEN 'plinko' THEN 0.99
    WHEN 'mines' THEN 0.99 WHEN 'slots_lite' THEN 0.97 WHEN 'sportsbook' THEN 0.955
  END;

  v_seed := encode(gen_random_bytes(16),'hex');
  v_seed_hash := encode(digest(v_seed,'sha256'),'hex');
  v_nonce := (extract(epoch from now())*1000)::bigint;
  v_roll := random();

  IF _game_code = 'dice' THEN
    DECLARE v_target numeric := COALESCE((_params->>'target')::numeric, 50);
            v_p numeric; v_d numeric;
    BEGIN
      v_p := LEAST(GREATEST(v_target/100.0, 0.0001), 0.9999);
      v_d := v_roll * 100;
      v_mult := CASE WHEN v_d < v_target THEN (v_target_rtp / v_p) ELSE 0 END;
      v_result := jsonb_build_object('roll',v_d,'target',v_target,'win',v_d<v_target);
    END;
  ELSIF _game_code = 'crash' THEN
    DECLARE v_co numeric := GREATEST(COALESCE((_params->>'cashout')::numeric,2.0),1.01);
            v_c numeric;
    BEGIN
      v_c := LEAST(0.99 / GREATEST(1.0 - v_roll, 0.00001), 9900);
      v_mult := CASE WHEN v_c >= v_co THEN v_co ELSE 0 END;
      v_result := jsonb_build_object('crash',round(v_c::numeric,2),'cashout',v_co);
    END;
  ELSIF _game_code = 'plinko' THEN
    DECLARE v_risk text := COALESCE(_params->>'risk','medium');
            v_bin int := floor(v_roll*17)::int;
            v_pay numeric[];
    BEGIN
      v_pay := CASE v_risk
        WHEN 'low'  THEN ARRAY[16,9,2,1.4,1.4,1.2,1.1,1,0.5,1,1.1,1.2,1.4,1.4,2,9,16]
        WHEN 'high' THEN ARRAY[1000,130,26,9,4,2,0.2,0.2,0.2,0.2,0.2,2,4,9,26,130,1000]
        ELSE             ARRAY[110,41,10,5,3,1.5,1,0.5,0.3,0.5,1,1.5,3,5,10,41,110]
      END;
      v_mult := v_pay[v_bin+1];
      v_result := jsonb_build_object('bin',v_bin,'risk',v_risk);
    END;
  ELSIF _game_code = 'mines' THEN
    DECLARE v_m int := LEAST(GREATEST(COALESCE((_params->>'mines')::int,3),1),24);
            v_pk int; v_safe numeric := 1.0; i int;
    BEGIN
      v_pk := LEAST(GREATEST(COALESCE((_params->>'picks')::int,1),1),25-v_m);
      FOR i IN 0..(v_pk-1) LOOP
        v_safe := v_safe * ((25.0 - v_m - i)/(25.0 - i));
      END LOOP;
      IF v_roll < v_safe THEN v_mult := 0.99/v_safe; ELSE v_mult := 0; END IF;
      v_result := jsonb_build_object('mines',v_m,'picks',v_pk,'survived',v_roll<v_safe);
    END;
  ELSIF _game_code = 'slots_lite' THEN
    -- RTP 0.97 = 500*0.0001 + 100*0.001 + 20*0.005 + 5*0.03 + 2*0.1 + 1*0.37
    --         = 0.05 + 0.10 + 0.10 + 0.15 + 0.20 + 0.37
    BEGIN
      v_mult := CASE
        WHEN v_roll < 0.0001 THEN 500
        WHEN v_roll < 0.0011 THEN 100
        WHEN v_roll < 0.0061 THEN 20
        WHEN v_roll < 0.0361 THEN 5
        WHEN v_roll < 0.1361 THEN 2
        WHEN v_roll < 0.5061 THEN 1
        ELSE 0
      END;
      v_result := jsonb_build_object('reel_roll',round(v_roll::numeric,4));
    END;
  ELSIF _game_code = 'sportsbook' THEN
    DECLARE v_o numeric := GREATEST(COALESCE((_params->>'odds')::numeric,2.0),1.01);
            v_p numeric;
    BEGIN
      v_p := LEAST(0.955/v_o, 0.99);
      v_mult := CASE WHEN v_roll < v_p THEN v_o ELSE 0 END;
      v_result := jsonb_build_object('odds',v_o,'win',v_roll<v_p);
    END;
  END IF;

  v_payout_phon := _bet_phon * v_mult;
  v_payout_usdt := _bet_usdt * v_mult;

  IF v_payout_phon > 0 THEN
    UPDATE public.phon_balances SET balance=balance+v_payout_phon, updated_at=now() WHERE user_id=v_user;
  END IF;
  IF v_payout_usdt > 0 THEN
    UPDATE public.apex_usdt_mock_balances SET balance=balance+v_payout_usdt, updated_at=now() WHERE user_id=v_user;
  END IF;

  INSERT INTO public.apex_game_rolls(
    user_id,game_code,bet_phon,bet_usdt,payout_phon,payout_usdt,
    multiplier,server_seed_hash,client_seed,nonce,result_json
  ) VALUES (
    v_user,_game_code,_bet_phon,_bet_usdt,v_payout_phon,v_payout_usdt,
    v_mult,v_seed_hash,v_seed,v_nonce,v_result
  ) RETURNING id INTO v_roll_id;

  RETURN jsonb_build_object(
    'ok',true,'multiplier',v_mult,
    'payout_phon',v_payout_phon,'payout_usdt',v_payout_usdt,
    'result',v_result,
    'server_seed_hash',v_seed_hash,'client_seed',v_seed,'nonce',v_nonce,
    'roll_id',v_roll_id
  );
END $$;

REVOKE ALL ON FUNCTION public.apex_play_mock_game(text,numeric,numeric,jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apex_play_mock_game(text,numeric,numeric,jsonb) TO authenticated;