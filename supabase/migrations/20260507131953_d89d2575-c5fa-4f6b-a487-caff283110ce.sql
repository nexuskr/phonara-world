
CREATE TYPE public.package_status AS ENUM ('pending','approved','rejected','active','completed','cancelled');

CREATE TABLE public.package_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  package_id TEXT NOT NULL,
  package_name TEXT NOT NULL,
  amount BIGINT NOT NULL,
  daily_return BIGINT NOT NULL,
  duration_days INT NOT NULL,
  total_return BIGINT NOT NULL,
  receipt_url TEXT,
  status public.package_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  admin_id UUID,
  settled_count INT NOT NULL DEFAULT 0,
  total_settled BIGINT NOT NULL DEFAULT 0,
  next_settle_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.package_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY pp_self_select ON public.package_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY pp_self_insert ON public.package_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY pp_admin_update ON public.package_purchases FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_pp_user ON public.package_purchases(user_id, created_at DESC);
CREATE INDEX idx_pp_status ON public.package_purchases(status);

-- submit purchase
CREATE OR REPLACE FUNCTION public.submit_package_purchase(
  _package_id TEXT, _package_name TEXT, _amount BIGINT,
  _daily_return BIGINT, _duration_days INT, _total_return BIGINT,
  _receipt_url TEXT
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount <= 0 OR _amount > 100000000 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  INSERT INTO public.package_purchases(user_id, package_id, package_name, amount, daily_return, duration_days, total_return, receipt_url)
    VALUES (_uid, _package_id, _package_name, _amount, _daily_return, _duration_days, _total_return, _receipt_url)
    RETURNING id INTO _id;
  RETURN jsonb_build_object('ok',true,'id',_id);
END $$;

-- admin resolve
CREATE OR REPLACE FUNCTION public.admin_resolve_package(_purchase_id UUID, _action TEXT, _reason TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.package_purchases%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _row FROM public.package_purchases WHERE id=_purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  IF _action = 'approve' THEN
    IF _row.status NOT IN ('pending') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.package_purchases
      SET status='active', approved_at=now(), admin_id=_uid,
          next_settle_at = now() + interval '1 day'
      WHERE id=_purchase_id;
  ELSIF _action = 'reject' THEN
    IF _row.status NOT IN ('pending') THEN RAISE EXCEPTION 'invalid_state'; END IF;
    UPDATE public.package_purchases SET status='rejected', rejected_reason=_reason, admin_id=_uid WHERE id=_purchase_id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  RETURN jsonb_build_object('ok',true,'action',_action);
END $$;

-- daily settlement (admin-triggered)
CREATE OR REPLACE FUNCTION public.settle_package_daily()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid UUID := auth.uid();
  _r RECORD;
  _count INT := 0;
  _wallet public.wallet_balances%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  FOR _r IN
    SELECT * FROM public.package_purchases
    WHERE status='active' AND next_settle_at <= now()
    FOR UPDATE
  LOOP
    SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_r.user_id FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    UPDATE public.wallet_balances SET
      available_balance = available_balance + _r.daily_return,
      total_balance = total_balance + _r.daily_return,
      updated_at = now()
    WHERE user_id=_r.user_id;

    INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, ref_id, metadata)
      VALUES (_r.user_id, 'mission_win','credit', _r.daily_return,
              _wallet.total_balance + _r.daily_return,
              _wallet.available_balance + _r.daily_return,
              _r.id::text,
              jsonb_build_object('source','package_settle','package_id',_r.package_id));

    IF _r.settled_count + 1 >= _r.duration_days THEN
      UPDATE public.package_purchases
        SET settled_count = settled_count+1,
            total_settled = total_settled + _r.daily_return,
            status='completed', completed_at=now(),
            next_settle_at=NULL
        WHERE id=_r.id;
    ELSE
      UPDATE public.package_purchases
        SET settled_count = settled_count+1,
            total_settled = total_settled + _r.daily_return,
            next_settle_at = now() + interval '1 day'
        WHERE id=_r.id;
    END IF;
    _count := _count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'settled',_count);
END $$;

-- transactions kind enum may need 'package_settle'? we used 'mission_win' to avoid enum modification.
