
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.user_tier AS ENUM ('normal', 'vip', 'god', 'empire');
CREATE TYPE public.tx_kind AS ENUM (
  'mission_win', 'mission_loss_recovery', 'profit_share',
  'withdrawal_lock', 'withdrawal_release', 'withdrawal_complete',
  'deposit', 'admin_adjust', 'jackpot_win'
);
CREATE TYPE public.tx_direction AS ENUM ('credit', 'debit');
CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','processing','completed','rejected','cancelled');
CREATE TYPE public.withdrawal_method AS ENUM ('bank','coin');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  tier public.user_tier NOT NULL DEFAULT 'normal',
  withdraw_pin_hash TEXT,
  bank_name TEXT,
  bank_account TEXT,
  coin_address TEXT,
  coin_network TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================
-- ROLES
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- =========================================
-- WALLET
-- =========================================
CREATE TABLE public.wallet_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_balance        BIGINT NOT NULL DEFAULT 0,
  available_balance    BIGINT NOT NULL DEFAULT 0,
  pending_balance      BIGINT NOT NULL DEFAULT 0,
  locked_balance       BIGINT NOT NULL DEFAULT 0,
  profit_share_balance BIGINT NOT NULL DEFAULT 0,
  today_earned         BIGINT NOT NULL DEFAULT 0,
  monthly_earned       BIGINT NOT NULL DEFAULT 0,
  last_reset_date      DATE   NOT NULL DEFAULT CURRENT_DATE,
  last_reset_month     TEXT   NOT NULL DEFAULT to_char(CURRENT_DATE,'YYYY-MM'),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_non_negative CHECK (
    total_balance >= 0 AND available_balance >= 0 AND pending_balance >= 0
    AND locked_balance >= 0 AND profit_share_balance >= 0
  ),
  CONSTRAINT chk_consistency CHECK (
    total_balance = available_balance + pending_balance + locked_balance
  )
);

-- =========================================
-- TRANSACTIONS LEDGER (double-entry, append-only)
-- =========================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.tx_kind NOT NULL,
  direction public.tx_direction NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  balance_after BIGINT NOT NULL,
  available_after BIGINT NOT NULL,
  ref_id TEXT,
  mission_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX idx_tx_kind ON public.transactions(kind);

-- =========================================
-- MISSION HISTORY
-- =========================================
CREATE TABLE public.mission_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id TEXT NOT NULL,
  is_win BOOLEAN NOT NULL,
  base_reward BIGINT NOT NULL,
  final_reward BIGINT NOT NULL,
  streak INT NOT NULL DEFAULT 0,
  multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.0,
  tier public.user_tier NOT NULL,
  cap_remaining BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mh_user ON public.mission_history(user_id, created_at DESC);

-- =========================================
-- WITHDRAWAL REQUESTS
-- =========================================
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  method public.withdrawal_method NOT NULL,
  bank_name TEXT,
  bank_account TEXT,
  coin_address TEXT,
  coin_network TEXT,
  tx_code TEXT NOT NULL UNIQUE,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  tier_at_request public.user_tier NOT NULL,
  process_by TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wr_user ON public.withdrawal_requests(user_id, created_at DESC);
CREATE INDEX idx_wr_status ON public.withdrawal_requests(status);

-- =========================================
-- DAILY STATS
-- =========================================
CREATE TABLE public.daily_stats (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  earned BIGINT NOT NULL DEFAULT 0,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  withdrawals_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, stat_date)
);

-- =========================================
-- PROFIT SHARE
-- =========================================
CREATE TABLE public.profit_share_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  pool_total BIGINT NOT NULL,
  share_pct NUMERIC(6,4) NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_psd_user ON public.profit_share_distributions(user_id, created_at DESC);

-- =========================================
-- ENABLE RLS
-- =========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_share_distributions ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES
-- =========================================

-- profiles: owner read/update; admin all
CREATE POLICY "profile_self_select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profile_self_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profile_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- roles: read self; only admin can write
CREATE POLICY "roles_self_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- wallet: READ-ONLY to user. NO direct write from client. Admin read.
CREATE POLICY "wallet_self_select" ON public.wallet_balances FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
-- NO insert/update/delete policies for users → all writes must go through SECURITY DEFINER funcs.

-- transactions: READ-ONLY to user.
CREATE POLICY "tx_self_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- mission history: READ-ONLY to user.
CREATE POLICY "mh_self_select" ON public.mission_history FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- withdrawals: read self; insert blocked (use RPC); admin update
CREATE POLICY "wr_self_select" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "wr_admin_update" ON public.withdrawal_requests FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- daily stats: read self
CREATE POLICY "ds_self_select" ON public.daily_stats FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- profit share: read self
CREATE POLICY "psd_self_select" ON public.profit_share_distributions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- =========================================
-- HELPERS
-- =========================================
CREATE OR REPLACE FUNCTION public.tier_daily_cap(t public.user_tier) RETURNS BIGINT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE t
    WHEN 'normal' THEN 25000
    WHEN 'vip'    THEN 120000
    WHEN 'god'    THEN 350000
    WHEN 'empire' THEN 1200000
  END
$$;

CREATE OR REPLACE FUNCTION public.tier_boost(t public.user_tier) RETURNS NUMERIC
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE t
    WHEN 'normal' THEN 1.00
    WHEN 'vip'    THEN 1.35
    WHEN 'god'    THEN 1.80
    WHEN 'empire' THEN 2.50
  END
$$;

CREATE OR REPLACE FUNCTION public.tier_withdraw_min(t public.user_tier) RETURNS BIGINT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE t
    WHEN 'normal' THEN 5000
    WHEN 'vip'    THEN 1000
    WHEN 'god'    THEN 1000
    WHEN 'empire' THEN 500
  END
$$;

CREATE OR REPLACE FUNCTION public.tier_process_minutes(t public.user_tier) RETURNS INT
LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE t
    WHEN 'normal' THEN 1440
    WHEN 'vip'    THEN 240
    WHEN 'god'    THEN 120
    WHEN 'empire' THEN 30
  END
$$;

-- =========================================
-- AUTO-PROVISION on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, nickname)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email,'@',1)))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallet_balances(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- CORE: settle_mission (atomic)
-- =========================================
CREATE OR REPLACE FUNCTION public.settle_mission(
  _mission_id TEXT,
  _is_win BOOLEAN,
  _base_reward BIGINT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _tier public.user_tier;
  _cap BIGINT;
  _boost NUMERIC;
  _wallet public.wallet_balances%ROWTYPE;
  _stats public.daily_stats%ROWTYPE;
  _streak INT := 0;
  _mult NUMERIC := 1.0;
  _dyn NUMERIC := 1.0;
  _final BIGINT := 0;
  _today DATE := CURRENT_DATE;
  _month TEXT := to_char(CURRENT_DATE,'YYYY-MM');
  _cap_remaining BIGINT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _base_reward < 0 OR _base_reward > 1000000 THEN RAISE EXCEPTION 'invalid reward'; END IF;

  SELECT tier INTO _tier FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _tier IS NULL THEN RAISE EXCEPTION 'profile missing'; END IF;
  _cap := public.tier_daily_cap(_tier);
  _boost := public.tier_boost(_tier);

  -- Lock wallet row
  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_uid) RETURNING * INTO _wallet;
  END IF;

  -- Daily / monthly rollover
  IF _wallet.last_reset_date <> _today THEN
    _wallet.today_earned := 0;
    _wallet.last_reset_date := _today;
  END IF;
  IF _wallet.last_reset_month <> _month THEN
    _wallet.monthly_earned := 0;
    _wallet.last_reset_month := _month;
  END IF;

  -- Upsert daily stats
  INSERT INTO public.daily_stats(user_id, stat_date) VALUES (_uid, _today)
    ON CONFLICT (user_id, stat_date) DO NOTHING;
  SELECT * INTO _stats FROM public.daily_stats WHERE user_id = _uid AND stat_date = _today FOR UPDATE;
  _streak := _stats.current_streak;

  IF _is_win THEN
    _streak := _streak + 1;
    _mult := LEAST(2.5, 1.0 + _streak * 0.05);
    _dyn := 0.95 + random() * 0.10;
    _final := FLOOR(_base_reward * _mult * _boost * _dyn)::BIGINT;

    -- Daily cap
    _cap_remaining := GREATEST(0, _cap - _wallet.today_earned);
    IF _final > _cap_remaining THEN _final := _cap_remaining; END IF;

    IF _final > 0 THEN
      _wallet.available_balance := _wallet.available_balance + _final;
      _wallet.total_balance     := _wallet.total_balance + _final;
      _wallet.today_earned      := _wallet.today_earned + _final;
      _wallet.monthly_earned    := _wallet.monthly_earned + _final;
    END IF;

    _stats.wins := _stats.wins + 1;
    _stats.earned := _stats.earned + _final;
    _stats.current_streak := _streak;
    _stats.best_streak := GREATEST(_stats.best_streak, _streak);
  ELSE
    _streak := 0;
    _stats.losses := _stats.losses + 1;
    _stats.current_streak := 0;
    _final := 0;
  END IF;

  UPDATE public.daily_stats
    SET wins=_stats.wins, losses=_stats.losses, earned=_stats.earned,
        current_streak=_stats.current_streak, best_streak=_stats.best_streak
    WHERE user_id=_uid AND stat_date=_today;

  UPDATE public.wallet_balances SET
    total_balance=_wallet.total_balance,
    available_balance=_wallet.available_balance,
    pending_balance=_wallet.pending_balance,
    locked_balance=_wallet.locked_balance,
    today_earned=_wallet.today_earned,
    monthly_earned=_wallet.monthly_earned,
    last_reset_date=_wallet.last_reset_date,
    last_reset_month=_wallet.last_reset_month,
    updated_at=now()
  WHERE user_id=_uid;

  INSERT INTO public.mission_history(user_id, mission_id, is_win, base_reward, final_reward, streak, multiplier, tier, cap_remaining)
    VALUES (_uid, _mission_id, _is_win, _base_reward, _final, _streak, _mult, _tier, GREATEST(0,_cap - _wallet.today_earned));

  IF _final > 0 THEN
    INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, mission_id, metadata)
      VALUES (_uid, 'mission_win', 'credit', _final, _wallet.total_balance, _wallet.available_balance, _mission_id,
              jsonb_build_object('streak',_streak,'multiplier',_mult,'tier',_tier));
  END IF;

  RETURN jsonb_build_object(
    'is_win',_is_win,'final_reward',_final,'streak',_streak,'multiplier',_mult,
    'tier',_tier,'available_balance',_wallet.available_balance,
    'today_earned',_wallet.today_earned,'cap_remaining',GREATEST(0,_cap - _wallet.today_earned)
  );
END $$;

-- =========================================
-- request_withdrawal (atomic, locks funds)
-- =========================================
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount BIGINT,
  _method public.withdrawal_method,
  _bank_name TEXT,
  _bank_account TEXT,
  _coin_address TEXT,
  _coin_network TEXT,
  _pin TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _tier public.user_tier;
  _pin_hash TEXT;
  _wallet public.wallet_balances%ROWTYPE;
  _today DATE := CURRENT_DATE;
  _wd_count INT;
  _min BIGINT;
  _process_by TIMESTAMPTZ;
  _tx_code TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  IF _pin IS NULL OR length(_pin) <> 6 THEN RAISE EXCEPTION 'invalid pin'; END IF;

  SELECT tier, withdraw_pin_hash INTO _tier, _pin_hash FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _pin_hash IS NULL THEN
    UPDATE public.profiles SET withdraw_pin_hash = encode(digest(_pin || _uid::text,'sha256'),'hex') WHERE id=_uid;
  ELSIF _pin_hash <> encode(digest(_pin || _uid::text,'sha256'),'hex') THEN
    RAISE EXCEPTION 'pin mismatch';
  END IF;

  _min := public.tier_withdraw_min(_tier);
  IF _amount < _min THEN RAISE EXCEPTION 'below_min:%', _min; END IF;

  -- normal tier: max 3 withdrawals/day
  IF _tier = 'normal' THEN
    SELECT COUNT(*) INTO _wd_count FROM public.withdrawal_requests
      WHERE user_id=_uid AND created_at::date = _today AND status <> 'rejected' AND status <> 'cancelled';
    IF _wd_count >= 3 THEN RAISE EXCEPTION 'daily_withdraw_limit'; END IF;
  END IF;

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_uid FOR UPDATE;
  IF _wallet.available_balance < _amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

  -- Lock funds
  UPDATE public.wallet_balances SET
    available_balance = available_balance - _amount,
    locked_balance = locked_balance + _amount,
    updated_at = now()
  WHERE user_id=_uid;

  _process_by := now() + (public.tier_process_minutes(_tier) || ' minutes')::interval;
  _tx_code := 'PM-' || upper(substr(md5(random()::text||_uid::text||now()::text),1,10));

  INSERT INTO public.withdrawal_requests(
    user_id, amount, method, bank_name, bank_account, coin_address, coin_network,
    tx_code, tier_at_request, process_by
  ) VALUES (_uid, _amount, _method, _bank_name, _bank_account, _coin_address, _coin_network,
            _tx_code, _tier, _process_by);

  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
    VALUES (_uid, 'withdrawal_lock', 'debit', _amount,
            _wallet.total_balance, _wallet.available_balance - _amount, _tx_code,
            jsonb_build_object('method',_method,'tier',_tier));

  UPDATE public.daily_stats SET withdrawals_count = withdrawals_count + 1
    WHERE user_id=_uid AND stat_date=_today;

  RETURN jsonb_build_object('tx_code',_tx_code,'process_by',_process_by,'amount',_amount);
END $$;

-- Admin: approve/complete/reject withdrawal
CREATE OR REPLACE FUNCTION public.admin_resolve_withdrawal(
  _request_id UUID, _action TEXT, _reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _wr public.withdrawal_requests%ROWTYPE;
  _wallet public.wallet_balances%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _wr FROM public.withdrawal_requests WHERE id=_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_wr.user_id FOR UPDATE;

  IF _action = 'complete' THEN
    IF _wr.status NOT IN ('pending','approved','processing') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.wallet_balances SET
      locked_balance = locked_balance - _wr.amount,
      total_balance = total_balance - _wr.amount,
      updated_at=now() WHERE user_id=_wr.user_id;
    UPDATE public.withdrawal_requests SET status='completed', completed_at=now(), admin_id=_uid WHERE id=_request_id;
    INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id)
      VALUES (_wr.user_id,'withdrawal_complete','debit',_wr.amount,
              _wallet.total_balance - _wr.amount, _wallet.available_balance, _wr.tx_code);
  ELSIF _action = 'reject' THEN
    IF _wr.status NOT IN ('pending','approved','processing') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.wallet_balances SET
      locked_balance = locked_balance - _wr.amount,
      available_balance = available_balance + _wr.amount,
      updated_at=now() WHERE user_id=_wr.user_id;
    UPDATE public.withdrawal_requests SET status='rejected', rejected_reason=_reason, admin_id=_uid WHERE id=_request_id;
    INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id)
      VALUES (_wr.user_id,'withdrawal_release','credit',_wr.amount,
              _wallet.total_balance, _wallet.available_balance + _wr.amount, _wr.tx_code);
  ELSIF _action = 'approve' THEN
    UPDATE public.withdrawal_requests SET status='approved', approved_at=now(), admin_id=_uid WHERE id=_request_id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  RETURN jsonb_build_object('ok',true,'action',_action);
END $$;

-- Profit share distribution (Empire only)
CREATE OR REPLACE FUNCTION public.distribute_profit_share(
  _pool_total BIGINT, _period_start TIMESTAMPTZ, _period_end TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _empire_count INT;
  _share BIGINT;
  _r RECORD;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COUNT(*) INTO _empire_count FROM public.profiles WHERE tier='empire';
  IF _empire_count = 0 THEN RETURN jsonb_build_object('ok',true,'distributed',0); END IF;
  _share := FLOOR(_pool_total * 0.125 / _empire_count)::BIGINT;
  FOR _r IN SELECT id FROM public.profiles WHERE tier='empire' LOOP
    UPDATE public.wallet_balances SET
      profit_share_balance = profit_share_balance + _share,
      available_balance = available_balance + _share,
      total_balance = total_balance + _share,
      updated_at=now()
    WHERE user_id = _r.id;
    INSERT INTO public.profit_share_distributions(user_id, period_start, period_end, pool_total, share_pct, amount)
      VALUES (_r.id, _period_start, _period_end, _pool_total, 0.125/_empire_count, _share);
    INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
      SELECT _r.id,'profit_share','credit',_share, total_balance, available_balance,
             jsonb_build_object('pool',_pool_total,'period_start',_period_start)
      FROM public.wallet_balances WHERE user_id=_r.id;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'distributed',_empire_count,'share',_share);
END $$;

-- Enable realtime on wallet
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
