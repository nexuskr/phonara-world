-- Fix wallet_balances chk_consistency violation in close functions.
-- Bug: total_balance was being reduced by v_fee_close twice (once via v_credit math and again explicitly).
-- Fix: total_balance = total_balance + v_credit - p.margin
--      Δtotal = v_credit - margin = (margin + pnl - fee_close) - margin = pnl - fee_close ✅
--      Δavail + Δlocked = v_credit + (-margin) = same ✅

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
    CASE WHEN v_pnl>=0 THEN 'credit' ELSE 'debit' END,
    ABS(v_pnl), total_balance, available_balance, p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason','manual')
  FROM wallet_balances WHERE user_id=v_uid;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,'trade_fee','debit',v_fee_close,total_balance,available_balance,p.id::text,jsonb_build_object('phase','close')
  FROM wallet_balances WHERE user_id=v_uid;

  RETURN jsonb_build_object('pnl',v_pnl,'roi',v_roi,'exit',v_exit,'fee',v_fee_close,'credit',v_credit);
END $function$;


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
        total_balance     = total_balance + v_credit - p.margin,
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
        total_balance     = total_balance + v_credit - p.margin,
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