-- 1) admin_adjust_balance: cast direction to tx_direction enum
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_target uuid, _delta bigint, _reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _wallet public.wallet_balances%ROWTYPE;
BEGIN
  IF NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _wallet FROM public.wallet_balances WHERE user_id=_target FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances(user_id) VALUES (_target) RETURNING * INTO _wallet;
  END IF;
  IF _wallet.available_balance + _delta < 0 THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

  UPDATE public.wallet_balances SET
    available_balance = available_balance + _delta,
    total_balance = total_balance + _delta,
    updated_at=now()
  WHERE user_id=_target;

  INSERT INTO public.transactions(user_id, kind, direction, amount, balance_after, available_after, metadata)
    VALUES (_target,'admin_adjust'::tx_kind,
            (CASE WHEN _delta>=0 THEN 'credit' ELSE 'debit' END)::tx_direction,
            ABS(_delta), _wallet.total_balance + _delta, _wallet.available_balance + _delta,
            jsonb_build_object('admin',_uid,'reason',_reason));

  INSERT INTO public.admin_audit_log(admin_id, action, target_type, target_id, metadata)
  VALUES (_uid, 'admin_adjust_balance', 'profiles', _target,
          jsonb_build_object('delta', _delta, 'reason', _reason));

  RETURN jsonb_build_object('ok',true,'new_available',_wallet.available_balance + _delta);
END $function$;

-- 2) admin_audit_log: allow admins to INSERT directly from client
CREATE POLICY aal_admin_insert ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- 3) Coin deposit addresses (admin-managed)
CREATE TABLE IF NOT EXISTS public.coin_deposit_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL,
  address text NOT NULL,
  label text,
  memo text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network, address)
);

ALTER TABLE public.coin_deposit_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY cda_admin_all ON public.coin_deposit_addresses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY cda_authed_read_active ON public.coin_deposit_addresses
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE OR REPLACE FUNCTION public._cda_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_cda_touch ON public.coin_deposit_addresses;
CREATE TRIGGER trg_cda_touch BEFORE UPDATE ON public.coin_deposit_addresses
  FOR EACH ROW EXECUTE FUNCTION public._cda_touch_updated_at();

-- Seed with previously hardcoded TRC20 placeholder so existing UI keeps working
INSERT INTO public.coin_deposit_addresses (network, address, label, memo, is_active, sort_order)
VALUES ('TRC20', 'TXyz1234567890ABCDEF1234567890ABCDEF12', 'USDT TRC20', '메모 입력 불필요', true, 0)
ON CONFLICT (network, address) DO NOTHING;