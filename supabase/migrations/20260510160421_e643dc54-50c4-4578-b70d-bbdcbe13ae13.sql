-- ============================================================
-- TRADING SAFEGUARDS — Big-exchange grade (REAL mode only)
-- ============================================================

-- 1) Oracle prices table (server-trusted truth)
CREATE TABLE IF NOT EXISTS public.oracle_prices (
  symbol text PRIMARY KEY,
  last_price numeric NOT NULL CHECK (last_price > 0),
  source text NOT NULL DEFAULT 'bybit',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oracle_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS op_public_read ON public.oracle_prices;
CREATE POLICY op_public_read ON public.oracle_prices
  FOR SELECT TO authenticated USING (true);

-- (writes only via SECURITY DEFINER edge function with service role; no user policy)

-- 2) Safeguards config table
CREATE TABLE IF NOT EXISTS public.trading_safeguards_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_margin_per_position bigint NOT NULL DEFAULT 50000000,    -- 5천만 KRW per pos
  max_daily_loss bigint NOT NULL DEFAULT 100000000,            -- 1억 KRW/day
  price_deviation_pct numeric NOT NULL DEFAULT 0.5,            -- 0.5%
  oracle_max_age_seconds int NOT NULL DEFAULT 30,
  rl_open_per_min int NOT NULL DEFAULT 10,
  rl_close_per_min int NOT NULL DEFAULT 30,
  rl_liquidate_per_min int NOT NULL DEFAULT 10,
  rl_triggers_per_min int NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.trading_safeguards_config(id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.trading_safeguards_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tsc_admin_all ON public.trading_safeguards_config;
CREATE POLICY tsc_admin_all ON public.trading_safeguards_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3) Helpers ---------------------------------------------------

-- Price integrity: oracle must be fresh and client price within deviation.
CREATE OR REPLACE FUNCTION public.assert_trading_price(p_symbol text, p_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_oracle numeric;
  v_age int;
  v_dev_limit numeric;
  v_max_age int;
  v_enabled boolean;
  v_dev numeric;
BEGIN
  SELECT enabled, price_deviation_pct, oracle_max_age_seconds
    INTO v_enabled, v_dev_limit, v_max_age
  FROM trading_safeguards_config WHERE id=1;
  IF v_enabled IS DISTINCT FROM true THEN RETURN; END IF;
  IF p_price <= 0 THEN RAISE EXCEPTION 'invalid price' USING ERRCODE='22023'; END IF;

  SELECT last_price, EXTRACT(EPOCH FROM (now()-updated_at))::int
    INTO v_oracle, v_age
  FROM oracle_prices WHERE symbol = p_symbol;

  IF v_oracle IS NULL THEN
    -- no oracle yet — log info anomaly but allow (cold start)
    INSERT INTO anomaly_events(rule, severity, user_id, evidence, dedupe_key)
    VALUES ('oracle_missing','low', v_uid,
      jsonb_build_object('symbol',p_symbol,'price',p_price),
      'oracle_missing:'||p_symbol||':'||to_char(now(),'YYYYMMDDHH24MI'))
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  IF v_age > v_max_age THEN
    INSERT INTO anomaly_events(rule, severity, user_id, evidence, dedupe_key)
    VALUES ('oracle_stale','medium', v_uid,
      jsonb_build_object('symbol',p_symbol,'age_s',v_age,'max',v_max_age),
      'oracle_stale:'||p_symbol||':'||to_char(now(),'YYYYMMDDHH24MI'))
    ON CONFLICT DO NOTHING;
    RAISE EXCEPTION '시장가 동기화 지연으로 거래가 일시 차단되었습니다.' USING ERRCODE='54000';
  END IF;

  v_dev := abs(p_price - v_oracle) / v_oracle * 100.0;
  IF v_dev > v_dev_limit THEN
    INSERT INTO anomaly_events(rule, severity, user_id, evidence, dedupe_key)
    VALUES ('price_deviation','high', v_uid,
      jsonb_build_object('symbol',p_symbol,'submitted',p_price,'oracle',v_oracle,'dev_pct',v_dev,'limit_pct',v_dev_limit),
      'pricedev:'||v_uid::text||':'||p_symbol||':'||to_char(now(),'YYYYMMDDHH24MISS'));
    RAISE EXCEPTION '시장가와 차이가 너무 큽니다. 다시 시도해 주세요.' USING ERRCODE='22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_trading_price(text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_trading_price(text,numeric) TO authenticated;

-- Position+daily-loss limits
CREATE OR REPLACE FUNCTION public.assert_trading_limits(p_margin bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_max_margin bigint;
  v_max_daily_loss bigint;
  v_enabled boolean;
  v_loss_today bigint;
BEGIN
  SELECT enabled, max_margin_per_position, max_daily_loss
    INTO v_enabled, v_max_margin, v_max_daily_loss
  FROM trading_safeguards_config WHERE id=1;
  IF v_enabled IS DISTINCT FROM true THEN RETURN; END IF;

  IF p_margin > v_max_margin THEN
    INSERT INTO anomaly_events(rule, severity, user_id, evidence, dedupe_key)
    VALUES ('margin_cap_exceeded','medium', v_uid,
      jsonb_build_object('margin',p_margin,'cap',v_max_margin),
      'mcap:'||v_uid::text||':'||to_char(now(),'YYYYMMDDHH24MI'))
    ON CONFLICT DO NOTHING;
    RAISE EXCEPTION '포지션당 최대 증거금 한도를 초과했습니다.' USING ERRCODE='22023';
  END IF;

  SELECT COALESCE(SUM(LEAST(pnl,0)),0)::bigint INTO v_loss_today
  FROM live_trade_history
  WHERE user_id=v_uid AND closed_at >= date_trunc('day', now());

  IF (-v_loss_today) >= v_max_daily_loss THEN
    INSERT INTO anomaly_events(rule, severity, user_id, evidence, dedupe_key)
    VALUES ('daily_loss_limit','high', v_uid,
      jsonb_build_object('loss_today',v_loss_today,'cap',v_max_daily_loss),
      'dll:'||v_uid::text||':'||to_char(now(),'YYYYMMDD'))
    ON CONFLICT DO NOTHING;
    RAISE EXCEPTION '일일 최대 손실 한도에 도달했습니다. 24시간 후 다시 시도해 주세요.' USING ERRCODE='54000';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_trading_limits(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_trading_limits(bigint) TO authenticated;

-- 4) Patch the four trading RPCs ------------------------------

CREATE OR REPLACE FUNCTION public.live_open_position(
  p_symbol text, p_side text, p_leverage integer, p_margin bigint, p_mark_price numeric,
  p_tp_pct numeric DEFAULT NULL, p_sl_pct numeric DEFAULT NULL, p_trailing_pct numeric DEFAULT NULL,
  p_margin_mode text DEFAULT 'isolated', p_allocated_margin bigint DEFAULT NULL,
  p_tp_price numeric DEFAULT NULL, p_sl_price numeric DEFAULT NULL, p_trailing_offset numeric DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_open_count int;
  v_avail bigint;
  v_fee bigint;
  v_entry numeric;
  v_size numeric;
  v_liq numeric;
  v_pos_id uuid;
  v_frozen boolean;
  v_rl int;
  v_trailing_active boolean := (
    (p_trailing_pct IS NOT NULL AND p_trailing_pct > 0) OR
    (p_trailing_offset IS NOT NULL AND p_trailing_offset > 0)
  );
  v_mode text := COALESCE(p_margin_mode,'isolated');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_side NOT IN ('long','short') THEN RAISE EXCEPTION 'invalid side'; END IF;
  IF p_leverage < 1 OR p_leverage > 100 THEN RAISE EXCEPTION 'leverage out of range'; END IF;
  IF p_margin <= 0 THEN RAISE EXCEPTION 'margin must be positive'; END IF;
  IF p_mark_price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;
  IF v_mode NOT IN ('isolated','cross') THEN RAISE EXCEPTION 'invalid margin_mode'; END IF;
  IF p_tp_pct IS NOT NULL AND (p_tp_pct <= 0 OR p_tp_pct > 100000) THEN RAISE EXCEPTION 'invalid tp_pct'; END IF;
  IF p_sl_pct IS NOT NULL AND (p_sl_pct <= 0 OR p_sl_pct > 100) THEN RAISE EXCEPTION 'invalid sl_pct'; END IF;
  IF p_trailing_pct IS NOT NULL AND (p_trailing_pct <= 0 OR p_trailing_pct > 100) THEN RAISE EXCEPTION 'invalid trailing_pct'; END IF;
  IF p_tp_price IS NOT NULL AND p_tp_price <= 0 THEN RAISE EXCEPTION 'invalid tp_price'; END IF;
  IF p_sl_price IS NOT NULL AND p_sl_price <= 0 THEN RAISE EXCEPTION 'invalid sl_price'; END IF;
  IF p_trailing_offset IS NOT NULL AND p_trailing_offset <= 0 THEN RAISE EXCEPTION 'invalid trailing_offset'; END IF;
  IF p_allocated_margin IS NOT NULL AND p_allocated_margin < 0 THEN RAISE EXCEPTION 'invalid allocated_margin'; END IF;

  -- SAFEGUARDS
  SELECT rl_open_per_min INTO v_rl FROM trading_safeguards_config WHERE id=1;
  PERFORM enforce_rate_limit('trade_open', COALESCE(v_rl,10));
  PERFORM assert_trading_price(p_symbol, p_mark_price);
  PERFORM assert_trading_limits(p_margin);

  SELECT EXISTS(SELECT 1 FROM account_freezes WHERE user_id=v_uid AND released_at IS NULL AND expires_at>now())
    INTO v_frozen;
  IF v_frozen THEN RAISE EXCEPTION '계정이 일시 동결되었습니다. 잠시 후 다시 시도해 주세요.' USING ERRCODE='54000'; END IF;

  SELECT count(*) INTO v_open_count FROM live_positions WHERE user_id=v_uid AND status='open';
  IF v_open_count >= 5 THEN RAISE EXCEPTION 'max 5 open positions'; END IF;

  v_entry := CASE WHEN p_side='long' THEN p_mark_price * 1.0006 ELSE p_mark_price * 0.9994 END;
  v_size := (p_margin::numeric * p_leverage) / v_entry;
  v_liq := CASE WHEN p_side='long'
    THEN GREATEST(0, v_entry - v_entry / p_leverage)
    ELSE v_entry + v_entry / p_leverage END;
  v_fee := FLOOR(p_margin::numeric * p_leverage * 0.001)::bigint;

  SELECT available_balance INTO v_avail FROM wallet_balances WHERE user_id=v_uid FOR UPDATE;
  IF v_avail IS NULL OR v_avail < (p_margin + v_fee) THEN RAISE EXCEPTION 'insufficient balance'; END IF;

  UPDATE wallet_balances
    SET available_balance = available_balance - (p_margin + v_fee),
        locked_balance    = locked_balance + p_margin,
        total_balance     = total_balance - v_fee,
        updated_at = now()
    WHERE user_id=v_uid;

  UPDATE insurance_fund SET accumulated = accumulated + FLOOR(v_fee*0.25)::bigint, updated_at=now() WHERE id=1;

  INSERT INTO live_positions(
    user_id, symbol, side, leverage, margin, size, entry, liq_price, fee_open, status,
    tp_pct, sl_pct, trailing_pct, trailing_active, trailing_peak_roi_pct,
    margin_mode, allocated_margin, tp_price, sl_price, trailing_offset, trailing_peak
  ) VALUES(
    v_uid, p_symbol, p_side, p_leverage, p_margin, v_size, v_entry, v_liq, v_fee, 'open',
    p_tp_pct, p_sl_pct, p_trailing_pct, v_trailing_active, NULL,
    v_mode,
    CASE WHEN v_mode='isolated' THEN COALESCE(p_allocated_margin, p_margin) ELSE NULL END,
    p_tp_price, p_sl_price, p_trailing_offset, NULL
  )
  RETURNING id INTO v_pos_id;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,'trade_open','debit',p_margin,total_balance,available_balance,v_pos_id::text,
         jsonb_build_object('symbol',p_symbol,'side',p_side,'leverage',p_leverage,'entry',v_entry,'liq',v_liq,
                            'tp_pct',p_tp_pct,'sl_pct',p_sl_pct,'trailing_pct',p_trailing_pct,
                            'margin_mode',v_mode,'allocated_margin',p_allocated_margin,
                            'tp_price',p_tp_price,'sl_price',p_sl_price,'trailing_offset',p_trailing_offset)
  FROM wallet_balances WHERE user_id=v_uid;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,'trade_fee','debit',v_fee,total_balance,available_balance,v_pos_id::text,
         jsonb_build_object('phase','open')
  FROM wallet_balances WHERE user_id=v_uid;

  RETURN v_pos_id;
END $function$;

-- live_close_position
CREATE OR REPLACE FUNCTION public.live_close_position(p_position_id uuid, p_mark_price numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  p record;
  v_exit numeric;
  v_pnl bigint;
  v_fee_close bigint;
  v_roi numeric;
  v_credit bigint;
  v_rl int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_mark_price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;

  SELECT rl_close_per_min INTO v_rl FROM trading_safeguards_config WHERE id=1;
  PERFORM enforce_rate_limit('trade_close', COALESCE(v_rl,30));

  SELECT * INTO p FROM live_positions WHERE id=p_position_id AND user_id=v_uid AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'position not found'; END IF;

  PERFORM assert_trading_price(p.symbol, p_mark_price);

  v_exit := CASE WHEN p.side='long' THEN p_mark_price * 0.9994 ELSE p_mark_price * 1.0006 END;
  v_pnl := FLOOR(((v_exit - p.entry) * p.size) * (CASE WHEN p.side='long' THEN 1 ELSE -1 END))::bigint;
  v_fee_close := FLOOR(v_exit * p.size * 0.001)::bigint;
  v_roi := v_pnl::numeric / NULLIF(p.margin,0);

  v_credit := GREATEST(0, p.margin + v_pnl - v_fee_close);

  UPDATE wallet_balances
    SET locked_balance    = GREATEST(0, locked_balance - p.margin),
        available_balance = available_balance + v_credit,
        total_balance     = total_balance + v_credit - p.margin,
        updated_at = now()
    WHERE user_id=v_uid;

  UPDATE insurance_fund SET accumulated = accumulated + FLOOR(v_fee_close*0.25)::bigint, updated_at=now() WHERE id=1;

  UPDATE live_positions SET status='closed' WHERE id=p.id;

  INSERT INTO live_trade_history(user_id,symbol,side,leverage,margin,size,entry,close_price,pnl,roi,fee_open,fee_close,reason,opened_at)
    VALUES(v_uid,p.symbol,p.side,p.leverage,p.margin,p.size,p.entry,v_exit,v_pnl,v_roi,p.fee_open,v_fee_close,'manual',p.opened_at);

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,
    CASE WHEN v_pnl>=0 THEN 'trade_close_win'::tx_kind ELSE 'trade_close_loss'::tx_kind END,
    (CASE WHEN v_pnl>=0 THEN 'credit' ELSE 'debit' END)::tx_direction,
    ABS(v_pnl), total_balance, available_balance, p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason','manual')
  FROM wallet_balances WHERE user_id=v_uid;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,'trade_fee','debit'::tx_direction,v_fee_close,total_balance,available_balance,p.id::text,jsonb_build_object('phase','close')
  FROM wallet_balances WHERE user_id=v_uid;

  RETURN jsonb_build_object('pnl',v_pnl,'roi',v_roi,'exit',v_exit,'fee',v_fee_close,'credit',v_credit);
END $function$;

-- live_liquidate_position
CREATE OR REPLACE FUNCTION public.live_liquidate_position(p_position_id uuid, p_mark_price numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  p record;
  v_pnl numeric;
  v_roi numeric;
  v_rl int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT rl_liquidate_per_min INTO v_rl FROM trading_safeguards_config WHERE id=1;
  PERFORM enforce_rate_limit('trade_liquidate', COALESCE(v_rl,10));

  SELECT * INTO p FROM live_positions WHERE id=p_position_id AND user_id=v_uid AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'position not found'; END IF;

  PERFORM assert_trading_price(p.symbol, p_mark_price);

  v_pnl := (p_mark_price - p.entry) * p.size * (CASE WHEN p.side='long' THEN 1 ELSE -1 END);
  v_roi := v_pnl / NULLIF(p.margin,0);
  IF v_roi > -0.99 THEN RAISE EXCEPTION 'not liquidatable'; END IF;

  UPDATE wallet_balances
    SET locked_balance = GREATEST(0, locked_balance - p.margin),
        total_balance  = GREATEST(0, total_balance - p.margin),
        updated_at = now()
    WHERE user_id=v_uid;

  UPDATE insurance_fund SET accumulated = accumulated + p.margin, updated_at=now() WHERE id=1;
  UPDATE live_positions SET status='liquidated' WHERE id=p.id;

  INSERT INTO live_trade_history(user_id,symbol,side,leverage,margin,size,entry,close_price,pnl,roi,fee_open,fee_close,reason,opened_at)
    VALUES(v_uid,p.symbol,p.side,p.leverage,p.margin,p.size,p.entry,p_mark_price,-p.margin,-1,p.fee_open,0,'liquidation',p.opened_at);

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,'trade_liquidation','debit'::tx_direction,p.margin,total_balance,available_balance,p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'mark',p_mark_price)
  FROM wallet_balances WHERE user_id=v_uid;

  RETURN jsonb_build_object('liquidated',true,'margin_lost',p.margin);
END $function$;

-- live_set_position_triggers
CREATE OR REPLACE FUNCTION public.live_set_position_triggers(
  p_position_id uuid, p_tp_pct numeric, p_sl_pct numeric, p_trailing_pct numeric,
  p_tp_price numeric DEFAULT NULL, p_sl_price numeric DEFAULT NULL, p_trailing_offset numeric DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_rl int;
  v_trailing_active boolean := (
    (p_trailing_pct IS NOT NULL AND p_trailing_pct > 0) OR
    (p_trailing_offset IS NOT NULL AND p_trailing_offset > 0)
  );
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_tp_pct IS NOT NULL AND (p_tp_pct <= 0 OR p_tp_pct > 100000) THEN RAISE EXCEPTION 'invalid tp_pct'; END IF;
  IF p_sl_pct IS NOT NULL AND (p_sl_pct <= 0 OR p_sl_pct > 100) THEN RAISE EXCEPTION 'invalid sl_pct'; END IF;
  IF p_trailing_pct IS NOT NULL AND (p_trailing_pct <= 0 OR p_trailing_pct > 100) THEN RAISE EXCEPTION 'invalid trailing_pct'; END IF;
  IF p_tp_price IS NOT NULL AND p_tp_price <= 0 THEN RAISE EXCEPTION 'invalid tp_price'; END IF;
  IF p_sl_price IS NOT NULL AND p_sl_price <= 0 THEN RAISE EXCEPTION 'invalid sl_price'; END IF;
  IF p_trailing_offset IS NOT NULL AND p_trailing_offset <= 0 THEN RAISE EXCEPTION 'invalid trailing_offset'; END IF;

  SELECT rl_triggers_per_min INTO v_rl FROM trading_safeguards_config WHERE id=1;
  PERFORM enforce_rate_limit('trade_triggers', COALESCE(v_rl,30));

  UPDATE live_positions
    SET tp_pct = p_tp_pct,
        sl_pct = p_sl_pct,
        trailing_pct = p_trailing_pct,
        tp_price = p_tp_price,
        sl_price = p_sl_price,
        trailing_offset = p_trailing_offset,
        trailing_active = v_trailing_active,
        trailing_peak_roi_pct = CASE WHEN v_trailing_active THEN trailing_peak_roi_pct ELSE NULL END,
        trailing_peak = CASE WHEN v_trailing_active THEN trailing_peak ELSE NULL END
    WHERE id = p_position_id AND user_id = v_uid AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'position not found'; END IF;
END $function$;

-- 5) Index for live_trade_history loss aggregation
CREATE INDEX IF NOT EXISTS lth_user_closed_idx
  ON public.live_trade_history(user_id, closed_at DESC);

-- 6) Permissions baseline (best-effort upsert)
INSERT INTO public.function_permissions_baseline(function_name, function_args, category, allowed_roles, note)
VALUES
  ('assert_trading_price','text, numeric','trading-safeguards','{authenticated}','Internal: oracle price integrity check'),
  ('assert_trading_limits','bigint','trading-safeguards','{authenticated}','Internal: position+daily-loss caps')
ON CONFLICT DO NOTHING;
