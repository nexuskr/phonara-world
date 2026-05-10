
-- 1) live_positions: new columns
ALTER TABLE public.live_positions
  ADD COLUMN IF NOT EXISTS margin_mode text NOT NULL DEFAULT 'isolated',
  ADD COLUMN IF NOT EXISTS allocated_margin bigint,
  ADD COLUMN IF NOT EXISTS sl_price numeric,
  ADD COLUMN IF NOT EXISTS tp_price numeric,
  ADD COLUMN IF NOT EXISTS trailing_offset numeric,
  ADD COLUMN IF NOT EXISTS trailing_peak numeric;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'live_positions_margin_mode_chk') THEN
    ALTER TABLE public.live_positions
      ADD CONSTRAINT live_positions_margin_mode_chk
      CHECK (margin_mode IN ('isolated','cross'));
  END IF;
END $$;

-- 2) position_trigger_audit: new columns
ALTER TABLE public.position_trigger_audit
  ADD COLUMN IF NOT EXISTS margin_mode text,
  ADD COLUMN IF NOT EXISTS allocated_margin bigint,
  ADD COLUMN IF NOT EXISTS trigger_kind text,
  ADD COLUMN IF NOT EXISTS cross_equity_at_close numeric;

-- 3) live_account_equity RPC
CREATE OR REPLACE FUNCTION public.live_account_equity(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_avail bigint := 0;
  v_locked bigint := 0;
  v_unrealized numeric := 0;
  v_initial_margin numeric := 0;
  v_equity numeric := 0;
  v_ratio numeric := NULL;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (v_uid = p_user_id OR has_role(v_uid, 'admin'::app_role) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(available_balance,0), COALESCE(locked_balance,0)
    INTO v_avail, v_locked
    FROM wallet_balances WHERE user_id = p_user_id;

  -- Sum margins of open positions for ratio denominator (Cross + Isolated combined for the account view)
  SELECT COALESCE(SUM(margin),0) INTO v_initial_margin
    FROM live_positions WHERE user_id = p_user_id AND status='open';

  -- Unrealized PnL is left to client/edge for now (mark price required); return 0 here.
  -- Equity = available + locked (no live mark in DB context).
  v_equity := v_avail + v_locked;
  IF v_initial_margin > 0 THEN
    v_ratio := v_equity / v_initial_margin;
  END IF;

  RETURN jsonb_build_object(
    'available', v_avail,
    'locked', v_locked,
    'unrealized_pnl', v_unrealized,
    'initial_margin_open', v_initial_margin,
    'equity', v_equity,
    'maint_margin_ratio', v_ratio
  );
END $$;

REVOKE ALL ON FUNCTION public.live_account_equity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_account_equity(uuid) TO authenticated, service_role;

-- 4) Trailing peak (price) helper
CREATE OR REPLACE FUNCTION public.admin_update_trailing_price_peak(p_position_id uuid, p_peak_price numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (auth.role() = 'service_role' OR has_role(auth.uid(),'admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE live_positions
    SET trailing_peak = p_peak_price
    WHERE id = p_position_id AND status = 'open';
END $$;

REVOKE ALL ON FUNCTION public.admin_update_trailing_price_peak(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_trailing_price_peak(uuid, numeric) TO service_role;

-- 5) live_open_position (extended) - drop old, create new with extra args
DROP FUNCTION IF EXISTS public.live_open_position(text, text, integer, bigint, numeric, numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.live_open_position(
  p_symbol text,
  p_side text,
  p_leverage integer,
  p_margin bigint,
  p_mark_price numeric,
  p_tp_pct numeric DEFAULT NULL,
  p_sl_pct numeric DEFAULT NULL,
  p_trailing_pct numeric DEFAULT NULL,
  p_margin_mode text DEFAULT 'isolated',
  p_allocated_margin bigint DEFAULT NULL,
  p_tp_price numeric DEFAULT NULL,
  p_sl_price numeric DEFAULT NULL,
  p_trailing_offset numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT v_uid,'trade_open','out',p_margin,total_balance,available_balance,v_pos_id::text,
         jsonb_build_object('symbol',p_symbol,'side',p_side,'leverage',p_leverage,'entry',v_entry,'liq',v_liq,
                            'tp_pct',p_tp_pct,'sl_pct',p_sl_pct,'trailing_pct',p_trailing_pct,
                            'margin_mode',v_mode,'allocated_margin',p_allocated_margin,
                            'tp_price',p_tp_price,'sl_price',p_sl_price,'trailing_offset',p_trailing_offset)
  FROM wallet_balances WHERE user_id=v_uid;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT v_uid,'trade_fee','out',v_fee,total_balance,available_balance,v_pos_id::text,
         jsonb_build_object('phase','open')
  FROM wallet_balances WHERE user_id=v_uid;

  RETURN v_pos_id;
END $$;

REVOKE ALL ON FUNCTION public.live_open_position(text,text,integer,bigint,numeric,numeric,numeric,numeric,text,bigint,numeric,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_open_position(text,text,integer,bigint,numeric,numeric,numeric,numeric,text,bigint,numeric,numeric,numeric) TO authenticated;

-- 6) live_set_position_triggers (extended)
DROP FUNCTION IF EXISTS public.live_set_position_triggers(uuid, numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.live_set_position_triggers(
  p_position_id uuid,
  p_tp_pct numeric,
  p_sl_pct numeric,
  p_trailing_pct numeric,
  p_tp_price numeric DEFAULT NULL,
  p_sl_price numeric DEFAULT NULL,
  p_trailing_offset numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
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
END $$;

REVOKE ALL ON FUNCTION public.live_set_position_triggers(uuid,numeric,numeric,numeric,numeric,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_set_position_triggers(uuid,numeric,numeric,numeric,numeric,numeric,numeric) TO authenticated;

-- 7) admin_force_close_position (extended audit)
CREATE OR REPLACE FUNCTION public.admin_force_close_position(
  p_position_id uuid,
  p_mark_price numeric,
  p_reason text DEFAULT 'tp',
  p_cross_equity numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    CASE WHEN v_pnl>=0 THEN 'in' ELSE 'out' END,
    ABS(v_pnl), total_balance, available_balance, p.id::text,
    jsonb_build_object('symbol',p.symbol,'side',p.side,'leverage',p.leverage,'pnl',v_pnl,'roi',v_roi,'exit',v_exit,'reason',p_reason,'margin_mode',p.margin_mode)
  FROM wallet_balances WHERE user_id=p.user_id;

  INSERT INTO transactions(user_id,kind,direction,amount,balance_after,available_after,ref_id,metadata)
  SELECT p.user_id,'trade_fee','out',v_fee_close,total_balance,available_balance,p.id::text,
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
$$;

-- 8) function_permissions_baseline rows
INSERT INTO public.function_permissions_baseline (function_name, function_args, allowed_roles, category, note)
VALUES
  ('live_account_equity', 'p_user_id uuid', ARRAY['authenticated','service_role'], 'trading', 'self or admin equity snapshot'),
  ('admin_update_trailing_price_peak', 'p_position_id uuid, p_peak_price numeric', ARRAY['service_role'], 'trading', 'cron-only trailing price peak update'),
  ('live_open_position', 'p_symbol text, p_side text, p_leverage integer, p_margin bigint, p_mark_price numeric, p_tp_pct numeric, p_sl_pct numeric, p_trailing_pct numeric, p_margin_mode text, p_allocated_margin bigint, p_tp_price numeric, p_sl_price numeric, p_trailing_offset numeric', ARRAY['authenticated'], 'trading', 'open position with margin mode + abs price triggers'),
  ('live_set_position_triggers', 'p_position_id uuid, p_tp_pct numeric, p_sl_pct numeric, p_trailing_pct numeric, p_tp_price numeric, p_sl_price numeric, p_trailing_offset numeric', ARRAY['authenticated'], 'trading', 'set ROI% + abs price triggers'),
  ('admin_force_close_position', 'p_position_id uuid, p_mark_price numeric, p_reason text, p_cross_equity numeric', ARRAY['service_role','admin'], 'trading', 'force close + cross_equity audit')
ON CONFLICT DO NOTHING;

-- Remove obsolete baseline rows that referenced the prior signatures
DELETE FROM public.function_permissions_baseline
  WHERE function_name = 'live_open_position'
    AND function_args = 'p_symbol text, p_side text, p_leverage integer, p_margin bigint, p_mark_price numeric, p_tp_pct numeric, p_sl_pct numeric, p_trailing_pct numeric';
DELETE FROM public.function_permissions_baseline
  WHERE function_name = 'live_set_position_triggers'
    AND function_args = 'p_position_id uuid, p_tp_pct numeric, p_sl_pct numeric, p_trailing_pct numeric';
DELETE FROM public.function_permissions_baseline
  WHERE function_name = 'admin_force_close_position'
    AND function_args = 'p_position_id uuid, p_mark_price numeric, p_reason text';
