CREATE OR REPLACE FUNCTION public._cron_settle_package_daily()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r RECORD;
  _count INT := 0;
  _wallet public.wallet_balances%ROWTYPE;
  _is_service_role boolean := coalesce(
    current_setting('request.jwt.claims', true)::jsonb->>'role','') = 'service_role';
BEGIN
  IF auth.uid() IS NOT NULL AND NOT _is_service_role THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
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
      VALUES (_r.user_id,'package_settle','credit',_r.daily_return,
              _wallet.total_balance + _r.daily_return,
              _wallet.available_balance + _r.daily_return,
              _r.id::text,
              jsonb_build_object('package_id',_r.package_id));

    IF _r.settled_count + 1 >= _r.duration_days THEN
      UPDATE public.package_purchases SET settled_count=settled_count+1, total_settled=total_settled+_r.daily_return,
        status='completed', completed_at=now(), next_settle_at=NULL WHERE id=_r.id;
    ELSE
      UPDATE public.package_purchases SET settled_count=settled_count+1, total_settled=total_settled+_r.daily_return,
        next_settle_at = now() + interval '1 day' WHERE id=_r.id;
    END IF;
    _count := _count + 1;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'settled',_count);
END $$;

REVOKE EXECUTE ON FUNCTION public._cron_settle_package_daily() FROM PUBLIC, anon, authenticated;
