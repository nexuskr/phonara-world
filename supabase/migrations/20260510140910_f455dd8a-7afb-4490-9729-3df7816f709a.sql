CREATE OR REPLACE FUNCTION public.admin_force_close_position(p_position_id uuid, p_mark_price numeric, p_reason text DEFAULT 'tp'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  v_exit numeric;
  v_pnl bigint;
  v_fee_close bigint;
  v_roi numeric;
  v_credit bigint;
  v_source text;
BEGIN
  IF NOT (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_mark_price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;
  IF p_reason NOT IN ('tp','sl','trailing','manual','liquidation','admin') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;

  v_source := CASE WHEN auth.role() = 'service_role' THEN 'cron' ELSE 'admin' END;

  SELECT * INTO p FROM live_positions WHERE id=p_position_id AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'position not found'; END IF;

  v_exit := CASE WHEN p.side='long' THEN p_mark_price * 0.9994 ELSE p_mark_price * 1.0006 END;
  v_pnl := FLOOR(((v_exit - p.entry) * p.size) * (CASE WHEN p.side='long' THEN 1 ELSE -1 END))::bigint;
  v_fee_close := FLOOR(v_exit * p.size * 0.001)::bigint;
  v_roi := v_pnl::numeric / NULLIF(p.margin,0);
  v_credit := GREATEST(0, p.margin + v_pnl - v_fee_close);

  UPDATE wallet_balances
    SET locked_balance    = GREATEST(0, locked_balance - p.margin),
        available_balance = available_balance + v_credit,
        total_balance     = total_balance + v_credit - p.margin - v_fee_close,
        updated_at = now()
    WHERE user_id=p.user_id;

  UPDATE insurance_fund SET accumulated = accumulated + FLOOR(v_fee_close*0.25)::bigint, updated_at=now() WHERE id=1;
  UPDATE live_positions SET status='closed' WHERE id=p.id;

  INSERT INTO live_trade_history(user_id,symbol,side,leverage,margin,size,entry,close_price,pnl,roi,fee_open,fee_close,reason,opened_at)
    VALUES(p.user_id,p.symbol,p.side,p.leverage,p.margin,p.size,p.entry,v_exit,v_pnl,v_roi,p.fee_open,v_fee_close,p_reason,p.opened_at);

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT p.user_id,
    CASE WHEN v_pnl>=0 THEN 'trade_close_win'::tx_kind ELSE 'trade_close_loss'::tx_kind END,
    CASE WHEN v_pnl>=0 THEN 'credit' ELSE 'debit' END,
    ABS(v_pnl), total_balance, available_balance, p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason',p_reason)
  FROM wallet_balances WHERE user_id=p.user_id;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT p.user_id,'trade_fee','debit',v_fee_close,total_balance,available_balance,p.id::text,
         jsonb_build_object('phase','close','reason',p_reason)
  FROM wallet_balances WHERE user_id=p.user_id;

  INSERT INTO position_trigger_audit(
    position_id, user_id, symbol, side, leverage, margin, entry, exit_price, mark_price,
    pnl, roi, reason, tp_pct, sl_pct, trailing_pct, trailing_peak_roi_pct, trailing_active,
    source, metadata
  ) VALUES (
    p.id, p.user_id, p.symbol, p.side, p.leverage, p.margin, p.entry, v_exit, p_mark_price,
    v_pnl, v_roi, p_reason, p.tp_pct, p.sl_pct, p.trailing_pct, p.trailing_peak_roi_pct, p.trailing_active,
    v_source,
    jsonb_build_object('fee_close', v_fee_close, 'opened_at', p.opened_at, 'size', p.size)
  );

  RETURN jsonb_build_object('pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason',p_reason);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_force_close_position(p_position_id uuid, p_mark_price numeric, p_reason text DEFAULT 'tp'::text, p_cross_equity numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  v_exit numeric;
  v_pnl bigint;
  v_fee_close bigint;
  v_roi numeric;
  v_credit bigint;
  v_source text;
BEGIN
  IF NOT (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_mark_price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;
  IF p_reason NOT IN ('tp','sl','trailing','manual','liquidation','admin','cross_maintenance') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;

  v_source := CASE WHEN auth.role() = 'service_role' THEN 'cron' ELSE 'admin' END;

  SELECT * INTO p FROM live_positions WHERE id=p_position_id AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'position not found'; END IF;

  v_exit := CASE WHEN p.side='long' THEN p_mark_price * 0.9994 ELSE p_mark_price * 1.0006 END;
  v_pnl := FLOOR(((v_exit - p.entry) * p.size) * (CASE WHEN p.side='long' THEN 1 ELSE -1 END))::bigint;
  v_fee_close := FLOOR(v_exit * p.size * 0.001)::bigint;
  v_roi := v_pnl::numeric / NULLIF(p.margin,0);
  v_credit := GREATEST(0, p.margin + v_pnl - v_fee_close);

  UPDATE wallet_balances
    SET locked_balance    = GREATEST(0, locked_balance - p.margin),
        available_balance = available_balance + v_credit,
        total_balance     = total_balance + v_credit - p.margin - v_fee_close,
        updated_at = now()
    WHERE user_id=p.user_id;

  UPDATE insurance_fund SET accumulated = accumulated + FLOOR(v_fee_close*0.25)::bigint, updated_at=now() WHERE id=1;
  UPDATE live_positions SET status='closed' WHERE id=p.id;

  INSERT INTO live_trade_history(user_id,symbol,side,leverage,margin,size,entry,close_price,pnl,roi,fee_open,fee_close,reason,opened_at)
    VALUES(p.user_id,p.symbol,p.side,p.leverage,p.margin,p.size,p.entry,v_exit,v_pnl,v_roi,p.fee_open,v_fee_close,p_reason,p.opened_at);

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT p.user_id,
    CASE WHEN v_pnl>=0 THEN 'trade_close_win'::tx_kind ELSE 'trade_close_loss'::tx_kind END,
    CASE WHEN v_pnl>=0 THEN 'credit' ELSE 'debit' END,
    ABS(v_pnl), total_balance, available_balance, p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason',p_reason,'margin_mode',p.margin_mode)
  FROM wallet_balances WHERE user_id=p.user_id;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT p.user_id,'trade_fee','debit',v_fee_close,total_balance,available_balance,p.id::text,
         jsonb_build_object('phase','close','reason',p_reason)
  FROM wallet_balances WHERE user_id=p.user_id;

  INSERT INTO position_trigger_audit(
    position_id, user_id, symbol, side, leverage, margin, entry, exit_price, mark_price,
    pnl, roi, reason, tp_pct, sl_pct, trailing_pct, trailing_peak_roi_pct, trailing_active,
    source, metadata,
    margin_mode, allocated_margin, trigger_kind, cross_equity_at_close
  ) VALUES (
    p.id, p.user_id, p.symbol, p.side, p.leverage, p.margin, p.entry, v_exit, p_mark_price,
    v_pnl, v_roi, p_reason, p.tp_pct, p.sl_pct, p.trailing_pct, p.trailing_peak_roi_pct, p.trailing_active,
    v_source,
    jsonb_build_object(
      'fee_close', v_fee_close, 'opened_at', p.opened_at, 'size', p.size,
      'tp_price', p.tp_price, 'sl_price', p.sl_price,
      'trailing_offset', p.trailing_offset, 'trailing_peak', p.trailing_peak
    ),
    p.margin_mode, p.allocated_margin, p_reason, p_cross_equity
  );

  RETURN jsonb_build_object('pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason',p_reason);
END;
$function$;

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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF p_mark_price <= 0 THEN RAISE EXCEPTION 'invalid price'; END IF;

  SELECT * INTO p FROM live_positions WHERE id=p_position_id AND user_id=v_uid AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'position not found'; END IF;

  v_exit := CASE WHEN p.side='long' THEN p_mark_price * 0.9994 ELSE p_mark_price * 1.0006 END;
  v_pnl := FLOOR(((v_exit - p.entry) * p.size) * (CASE WHEN p.side='long' THEN 1 ELSE -1 END))::bigint;
  v_fee_close := FLOOR(v_exit * p.size * 0.001)::bigint;
  v_roi := v_pnl::numeric / NULLIF(p.margin,0);

  v_credit := GREATEST(0, p.margin + v_pnl - v_fee_close);

  UPDATE wallet_balances
    SET locked_balance    = GREATEST(0, locked_balance - p.margin),
        available_balance = available_balance + v_credit,
        total_balance     = total_balance + v_credit - p.margin - v_fee_close,
        updated_at = now()
    WHERE user_id=v_uid;

  UPDATE insurance_fund SET accumulated = accumulated + FLOOR(v_fee_close*0.25)::bigint, updated_at=now() WHERE id=1;

  UPDATE live_positions SET status='closed' WHERE id=p.id;

  INSERT INTO live_trade_history(user_id,symbol,side,leverage,margin,size,entry,close_price,pnl,roi,fee_open,fee_close,reason,opened_at)
    VALUES(v_uid,p.symbol,p.side,p.leverage,p.margin,p.size,p.entry,v_exit,v_pnl,v_roi,p.fee_open,v_fee_close,'manual',p.opened_at);

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,
    CASE WHEN v_pnl>=0 THEN 'trade_close_win'::tx_kind ELSE 'trade_close_loss'::tx_kind END,
    CASE WHEN v_pnl>=0 THEN 'credit' ELSE 'debit' END,
    ABS(v_pnl), total_balance, available_balance, p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason','manual')
  FROM wallet_balances WHERE user_id=v_uid;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,'trade_fee','debit',v_fee_close,total_balance,available_balance,p.id::text,jsonb_build_object('phase','close')
  FROM wallet_balances WHERE user_id=v_uid;

  RETURN jsonb_build_object('pnl',v_pnl,'roi',v_roi,'exit',v_exit,'fee',v_fee_close,'credit',v_credit);
END $function$;

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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT * INTO p FROM live_positions WHERE id=p_position_id AND user_id=v_uid AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'position not found'; END IF;

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
  SELECT v_uid,'trade_liquidation','debit',p.margin,total_balance,available_balance,p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'mark',p_mark_price)
  FROM wallet_balances WHERE user_id=v_uid;

  RETURN jsonb_build_object('liquidated',true,'margin_lost',p.margin);
END $function$;

CREATE OR REPLACE FUNCTION public.live_open_position(p_symbol text, p_side text, p_leverage integer, p_margin bigint, p_mark_price numeric, p_tp_pct numeric DEFAULT NULL::numeric, p_sl_pct numeric DEFAULT NULL::numeric, p_trailing_pct numeric DEFAULT NULL::numeric, p_margin_mode text DEFAULT 'isolated'::text, p_allocated_margin bigint DEFAULT NULL::bigint, p_tp_price numeric DEFAULT NULL::numeric, p_sl_price numeric DEFAULT NULL::numeric, p_trailing_offset numeric DEFAULT NULL::numeric)
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

  SELECT EXISTS(SELECT 1 FROM account_freezes WHERE user_id=v_uid AND released_at IS NULL AND expires_at>now())
    INTO v_frozen;
  IF v_frozen THEN RAISE EXCEPTION 'account frozen'; END IF;

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