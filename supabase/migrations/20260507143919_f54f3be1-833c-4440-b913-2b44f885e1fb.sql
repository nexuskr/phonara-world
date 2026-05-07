
-- Phase 19-C-1: 출금 PIN 재설정 RPC + 감사 로그

CREATE TABLE IF NOT EXISTS public.pin_reset_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pin_reset_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pra_self_select" ON public.pin_reset_audit
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_pin_reset_audit_user ON public.pin_reset_audit(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.reset_withdraw_pin(_new_pin TEXT, _method TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _last_signin TIMESTAMPTZ;
  _recent_count INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _new_pin IS NULL OR length(_new_pin) <> 6 OR _new_pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'invalid_pin';
  END IF;
  IF _method NOT IN ('password','otp','password_otp') THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;

  -- Server-side recency check: session must be < 10 min old
  SELECT last_sign_in_at INTO _last_signin FROM auth.users WHERE id = _uid;
  IF _last_signin IS NULL OR _last_signin < (now() - interval '10 minutes') THEN
    RAISE EXCEPTION 'session_too_old';
  END IF;

  -- Anti-abuse: max 3 resets per 24h
  SELECT COUNT(*) INTO _recent_count FROM public.pin_reset_audit
    WHERE user_id = _uid AND created_at > (now() - interval '24 hours');
  IF _recent_count >= 3 THEN RAISE EXCEPTION 'rate_limit'; END IF;

  UPDATE public.profiles
    SET withdraw_pin_hash = encode(digest(_new_pin || _uid::text,'sha256'),'hex'),
        updated_at = now()
    WHERE id = _uid;

  INSERT INTO public.pin_reset_audit(user_id, method) VALUES (_uid, _method);

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.reset_withdraw_pin(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_withdraw_pin(TEXT, TEXT) TO authenticated;
