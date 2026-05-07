-- =====================================================
-- PHASE 21 — REFERRAL / INVITE SYSTEM
-- =====================================================

-- 1) Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

-- 2) Code generator (8 chars, A-Z 0-9 minus confusing chars)
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out text;
  ok boolean := false;
BEGIN
  WHILE NOT ok LOOP
    out := '';
    FOR i IN 1..8 LOOP
      out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    PERFORM 1 FROM public.profiles WHERE referral_code = out;
    IF NOT FOUND THEN ok := true; END IF;
  END LOOP;
  RETURN out;
END $$;

-- 3) Backfill existing users
UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;

-- 4) Trigger to auto-assign code on new profile
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.gen_referral_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_set_referral_code ON public.profiles;
CREATE TRIGGER profiles_set_referral_code BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- 5) Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL UNIQUE,
  code_used text NOT NULL,
  signup_bonus_paid boolean NOT NULL DEFAULT false,
  total_commission bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_inviter_idx ON public.referrals(inviter_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ref_self_select ON public.referrals;
CREATE POLICY ref_self_select ON public.referrals FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id OR public.has_role(auth.uid(),'admin'));

-- 6) Commission earnings ledger
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  source text NOT NULL,
  base_amount bigint NOT NULL,
  commission bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rearn_inviter_idx ON public.referral_earnings(inviter_id, created_at DESC);

ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rearn_self_select ON public.referral_earnings;
CREATE POLICY rearn_self_select ON public.referral_earnings FOR SELECT
  USING (auth.uid() = inviter_id OR public.has_role(auth.uid(),'admin'));

-- 7) Apply referral code (invitee binds inviter — one-time)
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _inviter uuid;
  _existing uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _code IS NULL OR length(_code) <> 8 THEN RAISE EXCEPTION 'invalid_code'; END IF;

  SELECT referred_by INTO _existing FROM public.profiles WHERE id=_uid;
  IF _existing IS NOT NULL THEN RAISE EXCEPTION 'already_applied'; END IF;

  SELECT id INTO _inviter FROM public.profiles WHERE referral_code = upper(_code);
  IF _inviter IS NULL THEN RAISE EXCEPTION 'code_not_found'; END IF;
  IF _inviter = _uid THEN RAISE EXCEPTION 'self_referral'; END IF;

  UPDATE public.profiles SET referred_by=_inviter, updated_at=now() WHERE id=_uid;
  INSERT INTO public.referrals(inviter_id, invitee_id, code_used)
    VALUES (_inviter, _uid, upper(_code))
    ON CONFLICT (invitee_id) DO NOTHING;

  RETURN jsonb_build_object('ok',true,'inviter',_inviter);
END $$;

-- 8) Stats RPC
CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
  _invited_count int;
  _active_7d int;
  _total_comm bigint;
  _today_comm bigint;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT referral_code INTO _code FROM public.profiles WHERE id=_uid;
  SELECT COUNT(*) INTO _invited_count FROM public.referrals WHERE inviter_id=_uid;
  SELECT COUNT(*) INTO _active_7d FROM public.referrals
    WHERE inviter_id=_uid AND created_at > now() - interval '7 days';
  SELECT COALESCE(SUM(commission),0) INTO _total_comm FROM public.referral_earnings WHERE inviter_id=_uid;
  SELECT COALESCE(SUM(commission),0) INTO _today_comm FROM public.referral_earnings
    WHERE inviter_id=_uid AND created_at::date = CURRENT_DATE;
  RETURN jsonb_build_object(
    'code',_code,'invited',_invited_count,'active_7d',_active_7d,
    'total_commission',_total_comm,'today_commission',_today_comm
  );
END $$;

-- 9) Internal commission credit (called by settle_mission etc.)
CREATE OR REPLACE FUNCTION public._credit_referral_commission(_invitee uuid, _base bigint, _source text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ref public.referrals%ROWTYPE;
  _comm bigint;
  _wallet public.wallet_balances%ROWTYPE;
  _signup_at timestamptz;
BEGIN
  SELECT * INTO _ref FROM public.referrals WHERE invitee_id=_invitee;
  IF NOT FOUND THEN RETURN; END IF;
  IF _ref.created_at < now() - interval '7 days' THEN RETURN; END IF;
  IF _base <= 0 THEN RETURN; END IF;

  _comm := FLOOR(_base * 0.10)::bigint;
  IF _comm <= 0 THEN RETURN; END IF;

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_ref.inviter_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.wallet_balances SET
    available_balance = available_balance + _comm,
    total_balance = total_balance + _comm,
    updated_at = now()
  WHERE user_id=_ref.inviter_id;

  UPDATE public.referrals SET total_commission = total_commission + _comm WHERE id=_ref.id;

  INSERT INTO public.referral_earnings(inviter_id, invitee_id, source, base_amount, commission)
    VALUES (_ref.inviter_id, _invitee, _source, _base, _comm);

  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
    VALUES (_ref.inviter_id, 'profit_share','credit',_comm,
            _wallet.total_balance + _comm, _wallet.available_balance + _comm,
            jsonb_build_object('source','referral_commission','invitee',_invitee,'base',_base,'pct',0.10));
END $$;

-- 10) Patch settle_mission to call commission on win
CREATE OR REPLACE FUNCTION public.settle_mission(_mission_id text, _is_win boolean, _base_reward bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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

  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_uid) RETURNING * INTO _wallet;
  END IF;

  IF _wallet.last_reset_date <> _today THEN
    _wallet.today_earned := 0; _wallet.last_reset_date := _today;
  END IF;
  IF _wallet.last_reset_month <> _month THEN
    _wallet.monthly_earned := 0; _wallet.last_reset_month := _month;
  END IF;

  INSERT INTO public.daily_stats(user_id, stat_date) VALUES (_uid, _today)
    ON CONFLICT (user_id, stat_date) DO NOTHING;
  SELECT * INTO _stats FROM public.daily_stats WHERE user_id = _uid AND stat_date = _today FOR UPDATE;
  _streak := _stats.current_streak;

  IF _is_win THEN
    _streak := _streak + 1;
    _mult := LEAST(2.5, 1.0 + _streak * 0.05);
    _dyn := 0.95 + random() * 0.10;
    _final := FLOOR(_base_reward * _mult * _boost * _dyn)::BIGINT;

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

    -- Phase 21: pay 10% commission to inviter (7-day window enforced inside)
    PERFORM public._credit_referral_commission(_uid, _final, 'mission_win');
  END IF;

  RETURN jsonb_build_object(
    'is_win',_is_win,'final_reward',_final,'streak',_streak,'multiplier',_mult,
    'tier',_tier,'available_balance',_wallet.available_balance,
    'today_earned',_wallet.today_earned,'cap_remaining',GREATEST(0,_cap - _wallet.today_earned)
  );
END $function$;